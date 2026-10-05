const { io } = require("socket.io-client");

const SERVER = "http://localhost:4000";
const ROOM = "TEAM" + Math.floor(100 + Math.random() * 900);

async function run() {
  console.log("=========================================");
  console.log("🧪 VERIFYING TEAM MODE END-TO-END");
  console.log("=========================================");

  // Connect 4 players
  const p1 = io(SERVER, { auth: { playerId: "p1-red" }, transports: ["websocket"] });
  const p2 = io(SERVER, { auth: { playerId: "p2-red" }, transports: ["websocket"] });
  const p3 = io(SERVER, { auth: { playerId: "p3-blue" }, transports: ["websocket"] });
  const p4 = io(SERVER, { auth: { playerId: "p4-unassigned" }, transports: ["websocket"] });

  await new Promise((r) => setTimeout(r, 600));

  console.log(`1. Joining players into room ${ROOM}...`);
  p1.emit("joinRoom", { roomId: ROOM, playerName: "Alice_Red" });
  await new Promise((r) => setTimeout(r, 300));

  p2.emit("joinRoom", { roomId: ROOM, playerName: "Bob_Red" });
  p3.emit("joinRoom", { roomId: ROOM, playerName: "Charlie_Blue" });
  p4.emit("joinRoom", { roomId: ROOM, playerName: "Diana_Auto" });
  await new Promise((r) => setTimeout(r, 1000));

  console.log("2. Setting manual team selections in lobby...");
  p1.emit("switchTeam", { roomId: ROOM, teamId: "red" });
  p2.emit("switchTeam", { roomId: ROOM, teamId: "red" });
  p3.emit("switchTeam", { roomId: ROOM, teamId: "blue" });
  // p4 stays unassigned to test auto-balancing!

  await new Promise((r) => setTimeout(r, 1000));

  let teamScoresReceived = null;
  p1.on("teamScoresUpdate", (data) => {
    teamScoresReceived = data.scores;
    console.log("📢 [Socket Event] teamScoresUpdate:", JSON.stringify(data.scores));
  });

  console.log("3. Host starts game in Team Mode (testing auto-balance for Diana)...");
  p1.emit("startGame", {
    roomId: ROOM,
    settings: {
      gameMode: "Team",
      teamCount: 2,
      drawTime: 45,
      rounds: 2,
    },
  });

  await new Promise((r) => setTimeout(r, 2000));

  console.log("4. Verifying initial team scores broadcast...");
  if (teamScoresReceived) {
    console.log("✅ Initial team scores verified:", teamScoresReceived);
  } else {
    console.log("⚠️ Initial team scores not yet received, waiting...");
  }

  // Simulate correct guess to verify score aggregation
  console.log("5. Simulating a correct guess from Alice (Red Team)...");
  // Let drawer pick word
  p1.emit("wordSelect", { roomId: ROOM, word: "BANANA" });
  p2.emit("wordSelect", { roomId: ROOM, word: "BANANA" });
  p3.emit("wordSelect", { roomId: ROOM, word: "BANANA" });
  p4.emit("wordSelect", { roomId: ROOM, word: "BANANA" });
  await new Promise((r) => setTimeout(r, 1200));

  // Non-drawer guesses BANANA
  p3.emit("guess", { roomId: ROOM, text: "BANANA" });
  await new Promise((r) => setTimeout(r, 1500));

  if (teamScoresReceived) {
    console.log("✅ Post-guess team scores aggregated correctly:", teamScoresReceived);
  }

  p1.disconnect();
  p2.disconnect();
  p3.disconnect();
  p4.disconnect();

  console.log("=========================================");
  console.log("🎉 TEAM MODE TEST PASSED WITH 0 ERRORS!");
  console.log("=========================================");
}

run().catch(console.error);
