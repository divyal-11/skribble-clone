import { io as ClientSocket, Socket } from "socket.io-client";
import process from "node:process";

// Configurable test parameters
const SERVER_URL = process.env.SERVER_URL || "http://localhost:4000";
const NUM_ROOMS = parseInt(process.env.ROOMS || "5", 10);
const CLIENTS_PER_ROOM = parseInt(process.env.CLIENTS || "4", 10); // 1 drawer + 3 guessers
const TEST_DURATION_MS = parseInt(process.env.DURATION || "10", 10) * 1000;
const DRAW_INTERVAL_MS = 30; // ~33 strokes/sec (safely within our 40/sec rate limit)

interface LatencyRecord {
  latency: number;
}

const latencies: number[] = [];
let strokesSent = 0;
let strokesReceived = 0;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runRoom(roomIndex: number): Promise<Socket[]> {
  const roomId = `TEST_${roomIndex}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const sockets: Socket[] = [];

  // 1. Connect Drawer
  const drawer = ClientSocket(SERVER_URL, {
    transports: ["websocket"],
    auth: { playerId: `drawer_${roomIndex}` },
  });
  sockets.push(drawer);

  await new Promise<void>((resolve) => {
    drawer.on("connect", () => {
      drawer.emit("joinRoom", { roomId, playerName: `Drawer_${roomIndex}` });
    });
    drawer.on("joinedRoom", () => {
      resolve();
    });
  });

  // 2. Connect Guessers sequentially
  for (let i = 1; i < CLIENTS_PER_ROOM; i++) {
    const guesser = ClientSocket(SERVER_URL, {
      transports: ["websocket"],
      auth: { playerId: `guesser_${roomIndex}_${i}` },
    });
    sockets.push(guesser);

    await new Promise<void>((resolve) => {
      guesser.on("connect", () => {
        guesser.emit("joinRoom", { roomId, playerName: `Guesser_${roomIndex}_${i}` });
      });
      guesser.on("joinedRoom", () => {
        resolve();
      });
    });
  }

  // 3. Listen for chooseWord on ANY socket in the room (since drawer is shuffled)
  let activeDrawerSocket: Socket = drawer;

  await new Promise<void>((resolve) => {
    sockets.forEach((s) => {
      s.on("chooseWord", ({ options }: { options: string[] }) => {
        activeDrawerSocket = s;
        s.emit("wordSelect", { roomId, word: options[0] });
        resolve();
      });
      s.on("drawData", (stroke: any) => {
        if (stroke.sentAt && s !== activeDrawerSocket) {
          const latency = Date.now() - stroke.sentAt;
          latencies.push(latency);
          strokesReceived++;
        }
      });
    });

    drawer.emit("startGame", { roomId });
  });

  await delay(150);

  // 4. Begin Drawing Loop (~33 strokes/sec) from the active drawer
  const drawInterval = setInterval(() => {
    strokesSent++;
    activeDrawerSocket.emit("draw", {
      roomId,
      type: "line",
      x: Math.floor(Math.random() * 800),
      y: Math.floor(Math.random() * 600),
      color: "#000000",
      size: 4,
      sentAt: Date.now(),
    });
  }, DRAW_INTERVAL_MS);

  // Stop drawing after test duration
  setTimeout(() => clearInterval(drawInterval), TEST_DURATION_MS);

  return sockets;
}

async function startLoadTest() {
  console.log("=================================================");
  console.log("🚀 DOODL.IO REAL-TIME WEBSOCKET BENCHMARK");
  console.log("=================================================");
  console.log(`Target Server:      ${SERVER_URL}`);
  console.log(`Concurrent Rooms:   ${NUM_ROOMS}`);
  console.log(`Total Clients:      ${NUM_ROOMS * CLIENTS_PER_ROOM} (${NUM_ROOMS} Drawers + ${NUM_ROOMS * (CLIENTS_PER_ROOM - 1)} Guessers)`);
  console.log(`Test Duration:      ${TEST_DURATION_MS / 1000}s`);
  console.log(`Stroke Rate/Room:   ~${Math.round(1000 / DRAW_INTERVAL_MS)} strokes/sec`);
  console.log("-------------------------------------------------");

  // Pre-flight check: ensure server is running
  try {
    const res = await fetch(`${SERVER_URL}/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  } catch (err) {
    console.error(`\n❌ Could not connect to server at ${SERVER_URL}`);
    console.error("👉 Please start your server first in another terminal:");
    console.error("   npm run dev --prefix server\n");
    process.exit(1);
  }

  console.log("Spinning up rooms and establishing connections...");

  const allSockets: Socket[] = [];

  for (let r = 0; r < NUM_ROOMS; r++) {
    const sockets = await runRoom(r);
    allSockets.push(...sockets);
    await delay(100);
  }

  console.log(`✅ All ${allSockets.length} sockets connected. Streaming drawing strokes...`);

  // Wait for test to complete
  await delay(TEST_DURATION_MS + 2000);

  // Cleanup
  console.log("Disconnecting simulated sockets...");
  allSockets.forEach((s) => s.disconnect());

  // Calculate Metrics
  const sorted = [...latencies].sort((a, b) => a - b);
  const min = sorted.length > 0 ? sorted[0] : 0;
  const max = sorted.length > 0 ? sorted[sorted.length - 1] : 0;
  const avg = sorted.length > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0;
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const p99 = percentile(sorted, 99);

  console.log("\n=================================================");
  console.log("📊 BENCHMARK RESULTS SUMMARY");
  console.log("=================================================");
  console.log(`Strokes Emitted:    ${strokesSent}`);
  console.log(`Strokes Received:   ${strokesReceived}`);
  console.log(`Delivery Ratio:     ${strokesSent > 0 ? ((strokesReceived / (strokesSent * (CLIENTS_PER_ROOM - 1))) * 100).toFixed(1) : 0}%`);
  console.log("-------------------------------------------------");
  console.log(`Min Latency:        ${min} ms`);
  console.log(`Avg Latency:        ${avg} ms`);
  console.log(`p50 (Median):       ${p50} ms`);
  console.log(`p95 Latency:        ${p95} ms`);
  console.log(`p99 Latency:        ${p99} ms`);
  console.log(`Max Latency:        ${max} ms`);
  console.log("=================================================\n");

  process.exit(0);
}

startLoadTest().catch((err) => {
  console.error("Benchmark failed with error:", err);
  process.exit(1);
});
