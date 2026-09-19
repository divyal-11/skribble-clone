# Skribbl Clone — Remaining Build Plan

## Why This Matters for the Resume
A basic skribbl clone (rooms + canvas + chat + scoreboard, naive socket relay) is a fun build but a weak resume line — it doesn't teach a recruiter anything the other four projects (LoanFlex, LedgerCore, LeetTrack, PulseBoard) don't already show. The features below are what turn it into a project with a genuine "hardest problem solved" bullet:

- **Server-authoritative game state, not client-trusted state** — same security mindset as the bcrypt timing fix on LoanFlex
- **Information asymmetry / per-role payload filtering** — drawer gets the word, guessers get blanks, enforced server-side (**already implemented** via the private `chooseWord` emission)
- **Canonical stroke log as source of truth** — the system remembers what's drawn, not just relays it live
- **Reconnection handling** — most tutorial clones break completely on refresh; handling it properly is a production-grade signal

If the resume bullet ends up being "built a drawing game with WebSockets," it's not worth swapping in over the current four. If it ends up being *"designed a server-authoritative game state machine with per-role payload filtering and stroke-log-based reconnection recovery"* — that's a genuine 5th line.

---

## Gameplay Differentiators (beyond the standard skribbl formula)
These are separate from the architecture story above — they're the "why is this different from a clone" answer for a demo or interview. Each includes a short implementation sketch.

1. **Guess-similarity meter (building first)**
   - Load a small pretrained word-embedding table (GloVe 50d/100d) once at server start — no per-guess API calls, no latency
   - On non-exact `guess`, compute cosine similarity between guess and word vectors (average vectors for multi-word)
   - Emit privately to that guesser only: `similarityUpdate({ score })` — never broadcast, or it leaks info about the word
   - Fallback to the existing Levenshtein tip when a word isn't in the embedding vocabulary

2. **AI-assisted hint system**
   - Server tracks time-since-last-correct-guess per round; after N seconds with zero/low guess activity, trigger a hint
   - Simplest version: reveal one more letter position (deterministic, no API call)
   - Richer version: one cheap LLM call per round (not per guess) to generate a vague category-level clue from the word, cached so it's only generated once and reused if triggered again
   - Broadcast the hint to guessers only, same private/public split as the word itself

3. **Custom word packs**
   - Extend room creation: host can paste a comma/newline-separated word list instead of using the built-in bank
   - Store it as `room:{ROOM_ID}:wordpack` in Redis (same TTL as room), fall back to `words.ts` bank if empty
   - Minimal validation: strip empty entries, cap list length, reject if fewer than ~10 words (need enough for `getRandomWords`)

4. **Drawer handicaps/power-ups**
   - Before each `chooseWord`, server rolls a random constraint from a small fixed list (e.g. non-dominant-style prompt, 2-color limit, canvas size reduction)
   - Send the constraint alongside `chooseWord` to the drawer only; client enforces it in the Canvas component (e.g. disables color picker beyond 2 swatches)
   - Purely additive — no changes to the state machine or stroke log needed

5. **Spectator side-bets**
   - Applies to players who aren't the current drawer: before drawing starts, they can privately submit a "who guesses it first" pick
   - On first correct guess, check each spectator's pick against the actual first-correct player, award a small bonus to correct predictors
   - Reuses existing roster/score infra — just a new Redis hash (`room:{ROOM_ID}:predictions`) cleared each round

6. **Team mode**
   - Split roster into teams at lobby stage; one shared canvas per team, each team's drawer draws concurrently against the same clock
   - This is the one that actually stresses your existing design: the state machine needs per-team `currentDrawerId`/`currentWord`, and the stroke log needs to be keyed per team (`room:{ROOM_ID}:team:{TEAM_ID}:strokes`) rather than per room
   - Best built after Phases 2 and 4 are solid, since it's a genuine extension of the state machine (per-team drawer/word/stroke-log state) rather than an add-on — but it's now a priority feature, not a stretch goal

---

## Status: Completed So Far
- Session isolation via `sessionStorage` UUID per tab (fixes multi-tab collision bug)
- Room DAL (`roomManager.ts`) — create/join, host auto-reassignment on leave, 2hr Redis TTL
- Real-time lobby (`JoinRoomCard`, `RoomLobby`, `Toast`) with live roster and host badge
- Turn engine — shuffled `turnOrder`, host-only Start Game control
- 48-word bank across 5 categories
- **Anti-cheat word selection**: `chooseWord` options sent privately to the drawer's socket only; guessers never see them
- Word masking logic (`maskWord`, multi-word support)
- Word-select modal — 3 options, 30s countdown, AFK auto-pick
- Immediate next step in progress: wiring `wordSelect` listener server-side to call `selectWordInRoom` and emit full word to drawer / masked word to guessers

---

## Phase 2 — Canvas + Draw Sync
The standout phase. Don't just relay raw `(x, y)` points — make the server own the drawing state:

- **Server-owned stroke log**: push every stroke into a Redis list (`room:{ROOM_ID}:strokes`), cleared on `clearCanvas` or turn end. Server becomes source of truth for "what's currently drawn," not just a pipe between clients.
- **Real `canvasSync`**: when a player joins mid-round or reconnects, replay the stroke log to just them instead of leaving their canvas blank.
- **Throttle `draw` emits** client-side (rAF or ~16–20ms interval) to avoid flooding the socket on every `mousemove`.
- Drawing tools UI: brush size, color picker, eraser, clear button (active only for the current drawer).

## Phase 3 — ChatBox + Guessing
- `guess` event → server checks against `room.currentWord` server-side only (never trust client-reported correctness)
- Exact match → `hasGuessed: true`, score by time remaining, broadcast "X guessed it!"
- Close guess (Levenshtein distance ≤ 1) → private tip to that guesser only
- Otherwise → normal chat broadcast
- **Similarity meter add-on**: replace/augment the Levenshtein tip with an embedding-based cosine similarity score between the guess and the word, sent privately to the guesser as a live warmer/colder signal (see Gameplay Differentiators above)

## Phase 4 — Turn/Round State Machine
Formalize the existing `room.status` field (`waiting → choosing → drawing → roundEnd → gameEnd`) into an explicit, validated machine:

- A `canTransition(current, next)` map in `roomManager.ts`
- Server rejects any socket event that doesn't match the current state (e.g. a `guess` during `choosing` is ignored)
- Turn end triggers: timer expiry or all guessers done → reveal word, update scores, advance `turnOrder` index
- Round increments once `turnOrder` cycles back to the start; game ends after `totalRounds`

## Phase 5 — Reconnection
Falls out mostly for free once Phases 2 and 4 exist:

- On reconnect: resend room status, player roster, role-appropriate word (masked/full), and replay the stroke log
- The existing `sessionStorage` UUID already gives stable identity across refreshes

## Phase 6 — Round Timer
- Server-authoritative countdown (not client-side) driving `turnEnded`
- Either a `setInterval` tick broadcast or a single deadline timestamp the client counts down from locally

---

## Project Rules (carry through all phases)
- No conventional commit prefixes (`feat:`, etc.) — plain descriptive commit messages
- No emojis in UI — `lucide-react` SVG icons only
- Backend ESM imports require explicit `.js` extensions
- Step-by-step pair-programming style — walk through reasoning, let the user modify their own files