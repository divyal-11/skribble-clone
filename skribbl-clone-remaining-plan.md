# doodl.io — Detailed Remaining Build Plan

This document covers every remaining phase in build order, with the underlying concept explained in full before any implementation detail — so each phase can be understood, not just typed in.

---

## Where the Project Stands

**Completed:**
- Session isolation via `sessionStorage` UUID per tab
- Redis-backed Room/Player DAL with 2-hour TTL, automatic host migration
- Lobby UI, animated branding
- Anti-cheat word selection — options sent privately to the drawer only
- Canvas with server-owned stroke log in Redis (`room:{roomId}:strokes`)
- Server-side guess verification (exact match + Levenshtein close-guess hints), dynamic scoring
- Full turn/round state machine (`waiting → choosing → drawing → roundEnd → gameEnd`), podium screen
- Server-authoritative round timer, early turn-end when everyone guesses

**What's left, in build order:**
1. Progressive letter hints (finish Phase 6)
2. Reconnection / mid-game join sync (Phase 5)
3. Host custom settings integration
4. Rate limiting on socket events
5. Redis pub/sub adapter (horizontal scaling)
6. Load testing with real numbers
7. Team mode

Items 1–3 complete the core game. Items 4–7 are the resume-differentiating system design work. Doing them in this order matters: rate limiting and the pub/sub adapter touch the same event-handling code paths, so it's more efficient to do them before team mode adds a second dimension (per-team state) to that code.

---

## 1. Progressive Letter Hints

**Concept:** Right now your masked word stays static (`_ _ _ _ _`) for the whole turn. Real skribbl reveals letters as time runs out, so guessers who are close but stuck get help, and rounds don't end in total silence.

**Data needed:** You already track elapsed/remaining time per turn (`timeServices.ts`). You need to know, at any tick, what fraction of the turn has elapsed.

**Logic:**
- At 50% elapsed: pick one random *unrevealed* index in the word (not already a space or already revealed) and reveal it
- At 75% elapsed: reveal a second index, distinct from the first
- Track which indices have been revealed server-side (don't recompute randomly each tick — you'd reveal a different letter every time you check). Store `revealedIndices: number[]` as part of the in-memory/Redis turn state, reset each turn.

**Event flow:**
- Server's timer tick (wherever `timeServices.ts` already ticks down) checks: `if (elapsedFraction >= 0.5 && revealedIndices.length === 0)` → pick and reveal
- Build the new masked word from `currentWord` + `revealedIndices`, emit `hintRevealed: { maskedWord }` to the room (guessers only — the drawer already has the full word, so this doesn't need the private/public split that `chooseWord` needed)

**Edge case:** words with spaces (multi-word answers) — don't reveal space positions as "hints," only letter positions, and don't double-count them in your 50%/75% letter-count math.

---

## 2. Reconnection & Mid-Game Join Sync

**Concept:** This is the single most important missing piece for a convincing demo. Without it, a refresh or flaky connection mid-game just breaks the player's state — blank canvas, no idea what's happening. The fix makes your server the single source of truth that a client can always re-sync against, which is the same principle you already used for the stroke log and word masking — you're just applying it to *the whole game state*, not just drawing.

**Why this works cleanly for you:** because you went server-authoritative from the start (Redis-backed room/player data, server-owned stroke log, server-driven timer), reconnection isn't a new system — it's "replay what's already in Redis to a socket that just connected." A client-authoritative clone would need a much bigger rework here; yours doesn't.

**Flow, step by step:**
1. Client reconnects (new socket, but same `sessionStorage` player UUID sent via `socket.handshake.auth`)
2. Server looks up that player ID in `room:{roomId}:players` — if found, this is a *rejoin*, not a new join
3. Server re-associates the new socket with the existing player record (update the socket-to-player mapping; don't create a duplicate player)
4. Server sends a single `syncState` payload (new event) containing:
   - `roomStatus` (current phase of the state machine)
   - `players` (full roster + scores)
   - `currentDrawerId`, `turnOrder`, `currentRound`/`totalRounds`
   - `remainingTime` (compute from the server's authoritative deadline, not a guess)
   - **Role-appropriate word**: if this player is `currentDrawerId`, send the full word; otherwise send the masked word *with whatever hints have already been revealed* (reuse the `revealedIndices` state from section 1)
5. Server calls `getRoomStrokes(roomId)` from Redis and emits `canvasSync: { strokes }` so the canvas redraws immediately, not blank
6. Client, on receiving `syncState` + `canvasSync`, rebuilds its entire local state from these two payloads rather than assuming any prior state is valid

**Important subtlety:** this needs to work for *two different scenarios* that look similar but aren't:
- **True reconnect** (same player, same room, game already running) — handled above
- **Fresh join mid-game** (a new player joining an in-progress room, if that's allowed) — same sync payload applies, but this is a *new* player record, not a rejoin, so host migration/roster-add logic still runs too

---

## 3. Host Custom Settings Integration

**Concept:** Your lobby UI already collects `drawTime`, `rounds`, and `customWords`, but (per your doc) they're not wired to actually govern anything — the game still runs on hardcoded defaults. This phase connects the two.

**Flow:**
- On `startGame`, instead of only shuffling `turnOrder`, also persist the host's chosen settings into the room hash: `HSET room:{roomId} drawTime <seconds> totalRounds <n>`
- Everywhere your timer logic currently uses a hardcoded constant (e.g. `60` seconds), read `room.drawTime` from Redis instead
- Everywhere `totalRounds` is hardcoded, same fix
- **Custom words:** if the host supplied a word list, store it as `room:{roomId}:wordpack` (a Redis list/set) at game start; your word-selection logic (`getRandomWords`) should check for this and sample from it instead of the built-in 48-word bank if present, falling back to the bank if the custom list is empty or too short (validate: reject if fewer than ~10 words, since you need at least 3 distinct options per turn without excessive repeats)

This phase is mechanically simple but matters because an unconfigurable game is a weaker demo — a reviewer testing your project will immediately try changing the round count or draw time, and it should actually work.

---

## 4. Rate Limiting on Socket Events

**Concept:** Every socket event you accept (`draw`, `guess`, `clearCanvas`) is currently trusted to arrive at whatever rate the client sends it. A malicious or just buggy client can flood any of these — spamming `guess` to brute-force timing attacks on your Levenshtein hint logic, or flooding `draw` to overwhelm your Redis stroke log and every other client's bandwidth. This is the same class of problem your token-bucket rate limiter project solves, just applied to WebSocket events instead of HTTP requests.

**Why token bucket specifically:** it allows short bursts (a flurry of rapid mouse movement while drawing is legitimate) while still capping sustained abuse — a strict fixed-window limiter would make normal drawing feel janky.

**Implementation shape:**
- Per-socket, per-event-type bucket: `Map<socketId, { tokens: number, lastRefill: number }>` — can live in-memory per server instance for now (this is a lightweight check, not critical shared state — though note this assumption breaks once you add multiple instances in section 5, see note below)
- On each incoming event, refill tokens based on elapsed time since `lastRefill` (standard token-bucket refill math), then check if at least 1 token is available
  - If yes: consume a token, process the event normally
  - If no: drop the event silently (or emit a lightweight `rateLimited` warning to that socket only — don't broadcast it)
- Suggested limits to start with: `draw` ~30-50/sec (drawing needs high throughput), `guess` ~2-3/sec (guessing is naturally slower; this also makes brute-forcing word guesses impractical), `clearCanvas` ~1/sec

**Note for later:** once you add the Redis adapter (section 5) and run multiple server instances, a per-instance in-memory bucket is *fine* for this use case — rate limiting doesn't need to be perfectly globally accurate, since the goal is abuse prevention, not precise accounting. Flag this as a known trade-off if asked about it rather than over-engineering a distributed rate limiter.

---

## 5. Redis Pub/Sub Adapter (Horizontal Scaling)

**Concept, in full:** Socket.IO's default behavior keeps all connected sockets' routing info in the memory of a single Node process. When your server calls `io.to(roomId).emit(event, payload)`, it works by looking up which sockets (in its own memory) are in that room and sending directly to them. This is fine for one server instance — but it means two different Node processes running your server have *no way to talk to each other's sockets*. If Player A's socket is on instance 1 and Player B's is on instance 2, instance 1's `io.to(roomId).emit()` call never reaches Player B, because instance 1 doesn't even know Player B's socket exists.

This matters because a single Node process can only hold so many concurrent WebSocket connections before CPU/memory limits bite — real scaling requires multiple instances, and multiple instances is exactly where naive Socket.IO breaks.

**How the adapter solves it:** `@socket.io/redis-adapter` replaces Socket.IO's internal in-memory room-tracking with a Redis-backed one. Concretely:
- Every instance connects two Redis clients: a publisher and a subscriber (the adapter requires both — pub/sub connections can't also issue regular commands)
- When `io.to(roomId).emit()` is called on any instance, the adapter publishes that event to a Redis pub/sub channel, in addition to emitting to any local sockets in that room
- Every other instance, subscribed to the same channel, receives the published event and re-emits it to whichever of *its own* local sockets are in that room
- From the perspective of your existing code, **nothing changes** — you still write `io.to(roomId).emit(...)` exactly as you do now. The adapter is a drop-in replacement for the underlying transport, not a new API you call directly.

**Setup, conceptually:**
```typescript
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis"; // or ioredis-compatible pair

const pubClient = redisClient.duplicate();
const subClient = redisClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));
```
This is added once, at server startup, before you start accepting connections.

**What you need to double check still works correctly:**
- All *game state* (not just socket routing) must already live in Redis, not a local `Map`/object — otherwise instance 2 has no idea what instance 1's rooms are doing even with the adapter in place. You're in a good position here since your room data, player data, and stroke log are already Redis-backed. Audit for anything you might have left in local memory (e.g. the timer's countdown interval reference — that's fine to be per-instance as long as only one instance is "driving" a given room's timer, which naturally falls out of whichever instance's socket handler first processed `startGame` for that room... worth explicitly deciding and documenting this ownership rule).

**How to actually demonstrate this works (for your README/demo):**
- Run two instances locally on different ports (e.g. `PORT=4000` and `PORT=4001`), both pointed at the same Redis
- Put a simple load balancer in front (even an Nginx config or a one-line `http-proxy` round-robin script is enough for a demo) so successive socket connections land on different instances
- Open two browser tabs, verify a draw stroke from one reaches the other — then stop and restart one instance mid-game to show the other keeps running

---

## 6. Load Testing With Real Numbers

**Concept:** Claims like "scaled to handle concurrent rooms" are weak without a measurement. A number makes the claim falsifiable and credible — same pattern as your LedgerCore "800ms → 12ms" bullet.

**What to measure:** broadcast latency — time from when a `draw` event is emitted by one simulated client to when it's received by another, under load (many concurrent rooms/sockets).

**Rough approach:**
- Write a small script (Node, using `socket.io-client`) that spins up N simulated clients across M simulated rooms, each emitting `draw` events at a realistic rate
- Measure round-trip or one-way latency (timestamp in the payload, compare against receipt time) at increasing N
- Run it once against a single instance, once against two instances behind the Redis adapter, same total client count
- Report: latency at a given concurrency level, and/or the concurrency level at which latency starts degrading, single- vs multi-instance

This doesn't need to be a polished load-testing suite — a script you ran once and captured numbers from is enough to back a resume line truthfully.

---

## 7. Team Mode

**Concept:** This is the one that's architecturally different from everything above, because it breaks an assumption baked into your entire state machine so far: **one drawer, one word, one stroke log, per room.** Team mode means multiple concurrent "sub-games" happening inside a single room at once.

**Data model changes:**
- Rooms gain a `teams` structure: `room:{roomId}:teams` — a mapping of `teamId → playerIds[]`, assigned at the lobby stage (host splits the roster, or auto-balances)
- **Per-team game state**, not per-room: `currentDrawerId`, `currentWord`, `revealedIndices`, and `status` all need a team dimension — e.g. `room:{roomId}:team:{teamId}:state` instead of being flat fields on `room:{roomId}`
- **Per-team stroke log**: `room:{roomId}:team:{teamId}:strokes` instead of one log per room — otherwise Team A's drawing would leak into Team B's canvas
- **Scoring**: both individual score (as you have now) and team-aggregate score (sum of team members', or points-per-correct-guess credited to the team) — decide which one actually drives the podium screen, or show both

**State machine implications:** your existing `turnService.ts` logic (advance turn, pick next drawer, handle timer expiry) needs to run *per team*, independently. The cleanest way to think about this: each team effectively runs its own instance of the existing single-room state machine, just scoped by `teamId` instead of `roomId`. If you designed section 1-6's code to take a scope key as a parameter rather than hardcoding `roomId` everywhere, this becomes a matter of threading `teamId` through — which is exactly why it's valuable to get the earlier sections clean and parameterized before starting this.

**Socket event changes:** events like `draw`, `guess`, `wordSelect` need a `teamId` in their payload now (since a drawer could belong to either team), and server-side validation must check "is this socket's player actually on this team" before processing — same anti-cheat principle as your existing drawer-authorization check, just with an extra dimension.

**Suggested approach:** build this *after* sections 1-6 are solid, specifically because it's the one phase where getting the state machine's "scope" parameterization right from the start saves you from a painful retrofit later.

---

## Project Rules (unchanged, carry through every phase)
- No conventional commit prefixes (`feat:`, etc.) — plain descriptive commit messages
- No emojis in UI — custom animated SVGs / `lucide-react` icons only
- Zero-scroll rule — components kept under ~45–55 lines
- Backend ESM imports require explicit `.js` extensions
- Server is the authority on all game-affecting state — client never self-reports correctness, ownership, or timing