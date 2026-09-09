# Skribbl.io Clone — Full Project Blueprint

Reference architecture: [Building a Skribbl.io Clone](https://medium.com/@divyanshulohani/building-a-skribbl-io-clone-from-concept-to-completion-2b60ca98f466) (adapted to fit your stack and learning goals)

---

## 1. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Backend runtime | Node.js + Express (or Fastify) | Familiar to you, minimal ceremony |
| Real-time layer | Socket.IO | Handles reconnection, rooms, fallback transport out of the box — better than raw `ws` for a first real-time project |
| Ephemeral state | Redis | Room state, player list, current word, timers, scores — all short-lived, needs to survive a server restart mid-game |
| Frontend | Next.js + TypeScript | You already know this well; skip Vite/React-only since Next.js works fine for a client-heavy real-time app (just don't over-rely on SSR for the game screen) |
| Canvas | Native HTML5 Canvas API | No library needed — raw `<canvas>` + 2D context is enough and forces you to actually understand coordinates/events |
| Persistent storage (optional, Phase 2) | PostgreSQL | Only if you add accounts/leaderboards later — MVP doesn't need it |
| Containerization | Docker + docker-compose | Node app + Redis as two services, one `docker-compose up` |
| Deployment | Render/Railway (backend + Redis), Vercel (frontend) | Socket.IO needs a persistent server, so backend can't go on Vercel serverless |

---

## 2. System Architecture (High Level)

```
                    ┌─────────────────────┐
                    │   Next.js Frontend    │
                    │  (React + Socket.IO   │
                    │   client + Canvas)     │
                    └──────────┬────────────┘
                               │ WebSocket (Socket.IO)
                               │ + REST (optional: room existence check)
                               ▼
                    ┌─────────────────────┐
                    │  Node.js + Express    │
                    │  Socket.IO Server      │
                    │  (Game Logic Layer)    │
                    └──────────┬────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │        Redis           │
                    │  Room state, players,  │
                    │  current word, timers, │
                    │  scores                │
                    └─────────────────────┘
```

**Key architectural principle:** the server is the single source of truth. The client never decides who guessed correctly, when a turn ends, or what the word is — it only renders what the server tells it and sends raw input events (draw strokes, guesses) upward. This is the single most important idea in the whole project — get this wrong and the whole game becomes cheatable and desynced.

---

## 3. Data Model (Redis)

Design your Redis keys before writing any code. Suggested shape:

```
room:{roomId}                    → Hash
  - hostId
  - status            ("waiting" | "choosing" | "drawing" | "roundEnd" | "gameEnd")
  - currentRound
  - totalRounds
  - currentDrawerId
  - currentWord        (only ever read server-side, never sent to non-drawers until reveal)
  - roundStartedAt
  - roundDuration

room:{roomId}:players             → Hash (playerId -> JSON: {name, score, hasGuessed, connected})

room:{roomId}:guessedThisRound     → Set of playerIds who already guessed correctly

room:{roomId}:turnOrder             → List of playerIds (rotation order)

room:{roomId}:wordOptions            → List (3 words offered to current drawer, cleared after pick)

room:{roomId}:canvasHistory           → List (append-only stroke log for the CURRENT round only)
  - each entry: { type: 'start'|'line'|'clear', x, y, prevX, prevY, color, size }
  - pushed via RPUSH on every draw event
  - read in full (LRANGE 0 -1) and replayed when a player joins/reconnects mid-round
  - DEL'd on turnEnded — never grows past a single round's worth of strokes
```

Use Redis TTL on room keys (e.g., expire 2 hours after last activity) so abandoned rooms don't pile up.

**Player identity:** never key anything off `socket.id` — it regenerates on every reconnect/refresh. Client generates (or is issued) a persistent `playerId`, stored in `localStorage`, sent in the Socket.IO `auth` handshake (`io({ auth: { playerId, roomId } })`). Server maps `socket.id ↔ playerId` on connect and stores all room/player state keyed by `playerId`. On reconnect, the new socket just gets repointed to the existing `playerId`'s state. (Note: a client-supplied `playerId` can be spoofed by editing `localStorage` — acceptable risk for a casual game, but worth calling out explicitly in your README as a known tradeoff rather than leaving it implicit.)

**Timers:** don't rely on per-room `setTimeout` handles — they die with the process on crash/restart, leaving Redis state intact but the room frozen forever. Instead, store `roundEndsAt: Date.now() + roundDuration` in the room hash, and run a **single server-side interval** (e.g., every 1s) that scans active rooms in Redis and fires `turnEnded` for any room where `Date.now() >= roundEndsAt`. This makes the server itself stateless with respect to timers — a restart just needs to resume the scan, with no per-room timer state to reconstruct. Send `roundEndsAt` (not a remaining-seconds count) to clients so their countdown UI stays accurate even through background-tab throttling.

---

## 4. Event Catalog (design this fully before coding)

**Client → Server events:**
| Event | Payload | Purpose |
|---|---|---|
| `joinRoom` | `{ roomId, playerName }` | Join or create a room |
| `leaveRoom` | `{ roomId }` | Explicit leave |
| `startGame` | `{ roomId }` | Host starts the game |
| `wordSelect` | `{ roomId, word }` | Drawer picks their word |
| `draw` | `{ roomId, x, y, prevX, prevY, color, size, type: 'start'|'line'|'clear' }` | Stroke data — `prevX/prevY` included so line segments render as continuous strokes, not disconnected dots, on rapid mouse sweeps |
| `clearCanvas` | `{ roomId }` | Drawer clears the board |
| `guess` | `{ roomId, text }` | Chat/guess message |
| `changeSettings` | `{ roomId, settings }` | Host changes round time, rounds, etc. (pre-game only) |

**Server → Client events:**
| Event | Payload | Purpose |
|---|---|---|
| `joinedRoom` | `{ roomId, players, status }` | Confirms join, sends current state |
| `playerJoined` / `playerLeft` | `{ player }` | Roster updates |
| `gameStarted` | `{ turnOrder, totalRounds }` | Kickoff |
| `chooseWord` | `{ options: [w1, w2, w3] }` | Sent only to current drawer, via `socket.emit` |
| `wordChosen` | Non-drawers: `{ maskedWord, drawerId }` (broadcast via `socket.to(room).emit`). Drawer: `{ word, drawerId }` (private, via `socket.emit` on the drawer's own socket) | Two different payloads for the same logical event — never send the real word on the room-wide broadcast, even redundantly alongside the masked one |
| `drawData` | `{ x, y, prevX, prevY, color, size, type }` | Broadcast stroke to all non-drawers — matches `draw` and `canvasHistory` shape exactly |
| `guessResult` | `{ playerId, correct, text? }` | Correct guesses hide the text from others (prevent copy-paste cheating); wrong guesses show as normal chat |
| `scoreUpdate` | `{ scores }` | After each correct guess |
| `turnEnded` | `{ word, scores }` | Round/turn over — reveals the word |
| `gameEnded` | `{ finalScores }` | Game over |
| `canvasSync` | `{ strokes: DrawEvent[] }` | Sent to a player on join/reconnect mid-round — full replay of `canvasHistory` so their canvas matches everyone else's exactly, not an approximation |
| `settingsChanged` | `{ settings }` | Broadcast host's settings change |

Write this table into actual TypeScript types/interfaces on day 1 — shared between client and server if you're using a monorepo, or duplicated if not. This alone will save you hours of debugging mismatched payloads later.

---

## 5. Full Game Flow (Pipeline)

This is the actual sequence of events for one complete round — trace this mentally before writing the state machine code.

1. **Room creation**: Player A opens app → clicks "Create Room" → server generates `roomId`, creates Redis hash, Player A becomes host → client redirected to `/room/{roomId}`.
2. **Joining**: Players B, C, D visit the room link → emit `joinRoom` → server validates room exists and isn't full/mid-game → adds to `room:{roomId}:players` → broadcasts `playerJoined` to room.
3. **Start**: Host emits `startGame` → server checks min player count (e.g., 2+) → picks first drawer from `turnOrder` → sets `status = "choosing"` → sends `chooseWord` **privately** (to that socket only, via `socket.emit`, not `io.to(room).emit`) with 3 random words.
4. **Word selection**: Drawer picks a word → emits `wordSelect` → server validates it's one of the offered 3 → stores `currentWord` in Redis → computes masked version (`_ _ _ _ _`) → broadcasts `wordChosen` to room (masked word only, sent privately with the real word to the drawer — see note below) → sets `status = "drawing"`, calculates and saves `roundEndsAt = Date.now() + roundDuration` in the room hash for the scanning interval to pick up.
   - **Timeout case**: if no `wordSelect` within N seconds, server auto-picks one of the 3 and proceeds the same way.
5. **Drawing phase**: Drawer's canvas mouse/touch events → throttled (e.g., every 16-30ms, not every pixel) → emitted as `draw` → server pushes each stroke to `room:{roomId}:canvasHistory` (Redis `RPUSH`, append-only for the current round) → broadcasts `drawData` to everyone except the drawer. When a player joins or reconnects mid-round, the server reads the full history (`LRANGE 0 -1`) and sends it as a single `canvasSync` event so their canvas replays the exact state instantly, not an approximation.
6. **Guessing**: Non-drawers type in chat → emit `guess` → server:
   - Checks if sender already guessed correctly this round (ignore if so, or route as normal chat)
   - Normalizes text (lowercase, trim) and compares to `currentWord`
   - **If correct**: use `SADD room:{roomId}:guessedThisRound playerId` — this is atomic, so it returns `1` only if the player was newly added and `0` if they'd already guessed. Only compute and award score if it returned `1`. This avoids a read-check-write race where two simultaneous correct guesses could both slip through a non-atomic `SMEMBERS`-then-check pattern. Emit `guessResult{correct:true}` to that player only + a generic "Player X guessed the word!" to everyone else (never reveal the word itself), emit `scoreUpdate`.
   - **If wrong**: broadcast as a normal chat message to the room.
   - **If everyone has now guessed**: trigger early `turnEnded`.
7. **Turn end** (either timeout or everyone guessed): server sets `status = "roundEnd"` → reveals `currentWord` → broadcasts `turnEnded{word, scores}` → clears `guessedThisRound` → after a short delay (e.g., 5s for UI to show results) → advances `turnOrder` to next drawer → loop back to step 3 for the next turn.
8. **Round/game end**: after all players have drawn once (or however many rounds configured), server sets `status = "gameEnded"` → broadcasts final scoreboard.
9. **Disconnect handling** (can happen at any point): `disconnecting` event fires → server marks player `connected: false` in Redis rather than deleting immediately (grace period for reconnect, e.g., 30s) → if it was their turn to draw, either skip to next drawer or pause timer → broadcast `playerLeft` (or a "reconnecting..." state) → if they don't return in time, remove fully and adjust turn order.

---

## 6. Day-Wise Plan

Assume ~2–3 focused hours/day. Adjust pace to your own speed — the point is the sequence, not the exact day count.

### **Day 1 — Architecture & Setup (no game logic yet)**
- Set up monorepo or two folders: `/server` and `/client`.
- Init Node + TypeScript + Express + Socket.IO on server. Init Next.js + TypeScript on client.
- Install and run Redis locally (Docker: `docker run -p 6379:6379 redis`).
- Write the full event catalog (section 4 above) as actual TypeScript interfaces/types — this is your contract.
- Get a bare Socket.IO connection working: client connects, server logs `connect`/`disconnect`. Nothing else.
- **Checkpoint**: client and server exchange a hardcoded "ping"/"pong" event successfully.

### **Day 2 — Room System (create/join, no game logic)**
- Implement `joinRoom`: generate/validate `roomId`, create Redis room hash if new, add player to `room:{roomId}:players`.
- Implement `playerJoined`/`playerLeft` broadcasts.
- Build minimal frontend: "Create Room" and "Join Room" screens, room lobby showing connected players (no styling needed yet).
- Handle basic `disconnect` → remove player, broadcast update.
- **Checkpoint**: two browser tabs can join the same room and see each other's names appear/disappear live.

### **Day 3 — Redis State Design + Persistent Identity + Reconnection Handling**
- Formalize the Redis schema from section 3 — implement helper functions (`getRoom`, `setRoomStatus`, `addPlayer`, `removePlayer`, etc.) as a small data-access layer rather than scattering raw Redis calls through your socket handlers.
- Implement persistent `playerId` identity: client generates a UUID on first join, stores it in `localStorage`, sends it via the Socket.IO `auth` handshake. Server maps `socket.id ↔ playerId` and stores all state keyed by `playerId`, never `socket.id`.
- Implement the grace-period disconnect logic: mark player as `connected: false` instead of deleting immediately; on reconnect, the new socket is repointed to the existing `playerId`'s state within the grace window.
- **Checkpoint**: closing and reopening a tab within ~30s rejoins you to the same room without losing your score/name — and refreshing mid-game doesn't assign you a "new" player.

### **Day 4 — Game State Machine (status transitions only, no drawing yet)**
- Implement `startGame`: host-only check, minimum player count check, set `status = "choosing"`, pick first drawer.
- Implement `chooseWord` (private emit) with 3 hardcoded words for now.
- Implement `wordSelect` handling and the transition to `status = "drawing"`.
- Implement the word-selection timeout (auto-pick if drawer doesn't choose in time).
- **Checkpoint**: you can start a game, get prompted with word choices as the drawer (verify via console logs — no UI yet), and the server transitions state correctly, including on timeout.

### **Day 5 — Turn Timer + Turn Rotation**
- Implement the drawing-phase timer as a `roundEndsAt` timestamp stored in Redis (`Date.now() + roundDuration`), not a per-room `setTimeout`. Client displays a countdown computed from this timestamp — it never calculates or owns its own deadline.
- Implement a single server-side interval (e.g., every 1s) that scans active rooms and fires `turnEnded` for any room past its `roundEndsAt`. Deliberately kill your server process mid-round and restart it — confirm the room resumes correctly instead of freezing, since this is the whole point of the timestamp approach.
- Implement `turnEnded` on timeout, and the rotation to the next drawer in `turnOrder`.
- Implement round counting (when does the game actually end — after everyone has drawn once? Twice?).
- **Checkpoint**: a full game can run through all turns/rounds via console logs alone, ending correctly with no drawing or guessing implemented yet — and survives a server restart mid-round without freezing.

### **Day 6 — Drawing Data Pipeline**
- Frontend: build the canvas component — mousedown/mousemove/mouseup (and touch equivalents) captured, converted to normalized coordinates (0–1 range, not raw pixels, so it scales across screen sizes).
- Emit `draw` events, throttled (don't emit on every single mousemove — batch or throttle to ~30-60 events/sec max).
- Server: validate sender is the current drawer, broadcast `drawData` to everyone else in the room (`socket.to(roomId).emit`, not the sender).
- Frontend: non-drawers render incoming `drawData` onto their own canvas context.
- Implement `clearCanvas`.
- **Checkpoint**: one browser draws, a second browser tab sees the strokes appear live with no visible lag.

### **Day 7 — Guessing + Scoring**
- Implement `guess` handling: normalize and compare against `currentWord`, check `guessedThisRound` set.
- Implement scoring logic (e.g., points based on time remaining when guessed, plus a smaller reward for the drawer per correct guesser).
- Implement `guessResult` and `scoreUpdate` broadcasts, and the "everyone guessed → early turn end" trigger.
- Frontend: build the chat/guess panel, showing wrong guesses as chat and correct guesses as a distinct system message (never showing the actual word to those who haven't guessed).
- **Checkpoint**: guessing correctly ends your ability to guess again that round, updates the scoreboard live, and ends the round early if everyone's guessed.

### **Day 8 — Word List + Masked Word Display**
- Replace hardcoded words with a real word bank (a JSON array of a few hundred words, categorized if you want difficulty levels later).
- Implement masked word display (`_ _ _ _ _`) sent to non-drawers, with optional progressive letter reveals as time passes (nice-to-have, not required for MVP).
- **Checkpoint**: word selection now pulls from a real bank, and non-drawers see blanks that match word length.

### **Day 9 — Frontend Polish: Lobby, Game UI, Scoreboard**
- Build the pre-game lobby UI properly (player list, host-only "Start Game" button, settings like round count/time if you want them configurable).
- Build the in-game UI: canvas + toolbar (color picker, brush size, clear/undo), chat/guess panel, live scoreboard, turn/timer display.
- Build the round-end and game-end screens.
- **Checkpoint**: the whole game is playable end-to-end through the actual UI, not just console logs — this is your first fully playable version.

### **Day 10 — Edge Cases & Anti-Cheat Review**
- Deliberately try to break your own game: open dev tools, inspect network tab — can you see the current word before you should? Can you emit `guess` events as someone who isn't in the room? Can you spam `draw` events as a non-drawer?
- Fix any state leaks (most common bug: sending the full room object including `currentWord` to everyone instead of a sanitized version).
- Handle malformed/missing payloads gracefully (don't let a bad event crash the server).
- Test what happens when the host disconnects mid-game (does someone else become host? does the game just die?).
- **Checkpoint**: you have a written list of "things I tried to cheat/break and how the server prevented it" — this is genuinely great material for an interview answer.

### **Day 11 — Styling Pass**
- Now, and only now, invest time in visual polish — colors, layout, responsiveness, animations for guesses/score changes.
- Keep this timeboxed; the learning value here is much lower than the backend work you've already done.
- **Checkpoint**: the app looks like something you'd screen-record for a portfolio, not a bug-testing tool.

### **Day 12 — Dockerize + Local Full-Stack Run**
- Write Dockerfiles for both server and client.
- Write `docker-compose.yml` wiring server + Redis (+ client if you containerize it too).
- Verify `docker-compose up` gives you a fully working local game with zero manual setup steps.
- **Checkpoint**: a friend could clone your repo, run one command, and play with you.

### **Day 13 — Deployment**
- Deploy backend + Redis to Render or Railway (needs persistent connections, so avoid serverless platforms for this part).
- Deploy frontend to Vercel, pointed at the deployed backend's WebSocket URL.
- Test cross-device: your phone and laptop in the same room, playing over the live deployed URL.
- **Checkpoint**: you can send a real link to a friend and they can join and play with you right now.

### **Day 14 — Documentation + Resume/Portfolio Writeup**
- Write a solid README: architecture diagram, tech choices and why, event catalog, how to run locally.
- Write up the "what I learned" section — specifically the anti-cheat/server-authority decisions from Day 10, since that's the most interview-worthy material.
- Record a short demo GIF/video for the README and your portfolio.
- **Checkpoint**: this project is genuinely resume-ready, not just "it works on my machine."

---

## 7. Stretch Goals (only after MVP is solid — don't start these early)

- Progressive letter hints as the timer counts down.
- Private rooms with custom word lists (host uploads their own words).
- Spectator mode for a full room.
- Persistent accounts + global leaderboard (this is where Postgres would actually earn its place).
- Drawing replay (store strokes in Redis/Postgres, let people watch a round afterward).
- Mobile touch support refinement (pressure sensitivity, palm rejection).

---

## 8. What You'll Be Able to Say in an Interview

- "I built the server as the single source of truth — the client only sends raw input and renders server-dictated state, which prevents word-leakage and score-tampering exploits."
- "I used Redis for ephemeral game state specifically because it needs to survive a server restart mid-game, and because room/player data has a natural TTL."
- "I designed and typed the full WebSocket event contract before writing any handlers, which caught several payload-shape bugs before they happened."
- "I handled the disconnect/reconnect edge case with a grace period rather than immediate removal, since real users have flaky connections mid-game."
- "I keyed all player state off a persistent `playerId` rather than `socket.id`, since `socket.id` regenerates on every reconnect — a subtle bug that only shows up under real network conditions, not local testing."
- "I stored round deadlines as absolute timestamps in Redis and used a single scanning interval instead of per-room `setTimeout` handles, so a server restart mid-game doesn't leave rooms frozen forever."
- "I used Redis's atomic `SADD` to gate scoring on simultaneous correct guesses, avoiding a read-check-write race condition that wouldn't show up in solo testing but would under real concurrent players."