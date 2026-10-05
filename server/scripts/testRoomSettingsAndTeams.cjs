const { io } = require("socket.io-client");

const SERVER = "http://localhost:4000";
const ROOM = "TEST" + Math.floor(1000 + Math.random() * 9000);

async function runTest() {
  console.log("🚀 Starting end-to-end verification for Room Settings, Teams, and Vocab...");

  const hostSocket = io(SERVER, { auth: { playerId: "host-1" }, transports: ["websocket"] });
  const greenSocket = io(SERVER, { auth: { playerId: "green-1" }, transports: ["websocket"] });

  await new Promise((r) => setTimeout(r, 600));

  console.log("1. Host joining room...");
  let hostData = null;
  hostSocket.on("joinedRoom", (d) => { hostData = d; });
  hostSocket.emit("joinRoom", { roomId: ROOM, playerName: "HostPlayer", language: "English" });

  await new Promise((r) => setTimeout(r, 600));

  const hostPlayer = hostData?.players.find((p) => p.name === "HostPlayer");
  console.log("Host player team:", hostPlayer?.teamId);
  if (hostPlayer?.teamId !== "blue") {
    console.error("❌ Host should be on blue team! Found:", hostPlayer?.teamId);
    process.exit(1);
  }
  console.log("✅ Host assigned to blue team!");

  console.log("2. GreenPlayer joining with team=green link...");
  let greenData = null;
  greenSocket.on("joinedRoom", (d) => { greenData = d; });
  greenSocket.emit("joinRoom", { roomId: ROOM, playerName: "GreenPlayer", teamId: "green" });

  await new Promise((r) => setTimeout(r, 600));

  const greenPlayer = greenData?.players.find((p) => p.name === "GreenPlayer");
  console.log("GreenPlayer team:", greenPlayer?.teamId);
  if (greenPlayer?.teamId !== "green") {
    console.error("❌ GreenPlayer should be on green team! Found:", greenPlayer?.teamId);
    process.exit(1);
  }
  console.log("✅ GreenPlayer joined with green team preserved!");

  console.log("3. Host updating lobby settings to drawTime: 80, language: German, gameMode: Team...");
  let updatedSettings = null;
  greenSocket.on("roomSettingsUpdated", (d) => { updatedSettings = d.settings; });

  hostSocket.emit("updateRoomSettings", {
    roomId: ROOM,
    settings: {
      drawTime: 80,
      rounds: 3,
      gameMode: "Team",
      teamCount: 3,
      language: "German",
    },
  });

  await new Promise((r) => setTimeout(r, 600));

  console.log("Updated settings received by client:", updatedSettings);
  if (updatedSettings?.drawTime !== 80 || updatedSettings?.language !== "German") {
    console.error("❌ Settings sync failed:", updatedSettings);
    process.exit(1);
  }
  console.log("✅ Lobby settings successfully synced to all players in real-time!");

  console.log("4. Starting game in Team mode...");
  let wordOptionsReceived = null;
  let drawerSocket = null;

  hostSocket.on("chooseWord", (d) => {
    wordOptionsReceived = d.options;
    drawerSocket = hostSocket;
  });
  greenSocket.on("chooseWord", (d) => {
    wordOptionsReceived = d.options;
    drawerSocket = greenSocket;
  });

  hostSocket.emit("startGame", {
    roomId: ROOM,
    settings: updatedSettings,
  });

  await new Promise((r) => setTimeout(r, 1000));

  console.log("Word options offered (in German):", wordOptionsReceived);
  if (!wordOptionsReceived || wordOptionsReceived.length === 0) {
    console.error("❌ Failed to receive word options");
    process.exit(1);
  }

  console.log("5. Drawer picking word...");
  let wordChosenData = null;
  greenSocket.on("wordChosen", (d) => { wordChosenData = d; });
  hostSocket.on("wordChosen", (d) => { wordChosenData = d; });

  drawerSocket.emit("wordSelect", {
    roomId: ROOM,
    word: wordOptionsReceived[0],
  });

  await new Promise((r) => setTimeout(r, 800));

  console.log("Word chosen duration:", wordChosenData?.duration);
  if (wordChosenData?.duration !== 80) {
    console.error("❌ Expected duration to be 80, got:", wordChosenData?.duration);
    process.exit(1);
  }
  console.log("✅ Turn timer successfully running with 80s as configured by host!");

  hostSocket.disconnect();
  greenSocket.disconnect();
  console.log("🎉 ALL TESTS PASSED!");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
