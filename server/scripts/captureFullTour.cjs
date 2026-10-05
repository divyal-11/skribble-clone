const puppeteer = require('puppeteer-core');
const { io } = require('socket.io-client');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = 'C:\\Users\\divya\\Projects\\skribble-clone\\docs\\screenshots';

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();
  page.on('console', m => console.log('LOG:', m.text()));
  page.on('dialog', async d => { console.log('ALERT:', d.message()); await d.accept(); });

  console.log('1. Capturing Landing Page...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(OUT_DIR, '01_landing_page.png') });
  console.log('✅ 01_landing_page.png captured.');

  console.log('2. Entering nickname and creating room...');
  await page.waitForSelector('input[placeholder="Enter your name"]');
  await page.type('input[placeholder="Enter your name"]', 'CaptainDoodl');
  await new Promise(r => setTimeout(r, 600));

  await page.click('button.skribbl-btn-green');
  await page.waitForFunction(() => document.body.innerText.includes('WAITING') || document.body.innerText.includes('Room:'), { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));

  // Extract Room ID
  const roomId = await page.evaluate(() => {
    const match = document.body.innerText.match(/Room:\s*([A-Z0-9]+)/i);
    return match ? match[1].trim() : null;
  });
  console.log(`✅ Room created: ${roomId}`);

  // Connect 2 simulated players to populate the room
  let s2 = null;
  let s3 = null;
  if (roomId) {
    s2 = io('http://localhost:4000', { auth: { playerId: 'p2-pixel-id' }, transports: ['websocket'] });
    s2.emit('joinRoom', { roomId, playerName: 'PixelArt' });

    s3 = io('http://localhost:4000', { auth: { playerId: 'p3-brush-id' }, transports: ['websocket'] });
    s3.emit('joinRoom', { roomId, playerName: 'BrushMaster' });

    await new Promise(r => setTimeout(r, 1500));

    // Assign teams
    s2.emit('switchTeam', { roomId, teamId: 'blue' });
    s3.emit('switchTeam', { roomId, teamId: 'red' });
    await new Promise(r => setTimeout(r, 1000));
  }

  // Set game mode to Team in form
  await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    for (const s of selects) {
      if (s.innerHTML.includes('Team')) {
        s.value = 'Team';
        s.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: path.join(OUT_DIR, '02_room_lobby.png') });
  console.log('✅ 02_room_lobby.png captured.');

  console.log('3. Starting game and capturing Word Select Modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const start = btns.find(b => b.textContent && b.textContent.toLowerCase().includes('start'));
    if (start) {
      console.log('Found start button, clicking:', start.textContent);
      start.click();
    }
  });

  // Wait for word select modal or gameplay
  await page.waitForFunction(
    () => document.body.innerText.includes('Your Turn to Draw') || document.body.innerText.includes('Word to Draw') || document.querySelector('canvas'),
    { timeout: 15000 }
  );
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({ path: path.join(OUT_DIR, '03_word_selection.png') });
  console.log('✅ 03_word_selection.png captured.');

  // Check which player was selected as drawer and pick word
  console.log('Selecting word...');
  s2.emit('wordSelect', { roomId, word: 'APPLE' });
  s3.emit('wordSelect', { roomId, word: 'APPLE' });
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const wordOption = btns.find(b => b.className.includes('capitalize') || (b.closest('.fixed') && b.textContent && b.textContent.length > 2 && !b.textContent.toLowerCase().includes('start')));
    if (wordOption) wordOption.click();
  });

  await new Promise(r => setTimeout(r, 2000));

  console.log('4. Streaming strokes to white canvas and sending guesses...');
  // Stream a fun drawing stroke via s2 socket
  const strokeDrawer = s2;
  const drawPoints = [];
  const cx = 0.5, cy = 0.5, r = 0.25;
  for (let a = 0; a <= Math.PI * 2; a += 0.15) {
    drawPoints.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * (r * 0.8) });
  }

  for (let i = 0; i < drawPoints.length; i++) {
    const pt = drawPoints[i];
    const prev = i > 0 ? drawPoints[i - 1] : pt;
    strokeDrawer.emit('draw', {
      roomId,
      type: i === 0 ? 'start' : 'line',
      x: pt.x,
      y: pt.y,
      prevX: prev.x,
      prevY: prev.y,
      color: '#ef4444',
      size: 6
    });
    await new Promise(r => setTimeout(r, 20));
  }

  // Draw apple leaf in green
  strokeDrawer.emit('draw', {
    roomId,
    type: 'line',
    x: 0.55,
    y: 0.28,
    prevX: 0.50,
    prevY: 0.35,
    color: '#22c55e',
    size: 5
  });

  // Guessers chat in chatbox
  s3.emit('guess', { roomId, text: 'red ball' });
  await new Promise(r => setTimeout(r, 400));
  s3.emit('guess', { roomId, text: 'cherry' });
  await new Promise(r => setTimeout(r, 600));

  // CaptainDoodl guesses close
  await page.type('input[placeholder="Type your guess here..."]', 'applle');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 600));

  // S3 guesses correct!
  s3.emit('guess', { roomId, text: 'apple' });
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({ path: path.join(OUT_DIR, '04_active_gameplay.png') });
  console.log('✅ 04_active_gameplay.png captured.');

  if (s2) s2.disconnect();
  if (s3) s3.disconnect();
  await browser.close();
  console.log('🎉 Tour completed and all screenshots saved!');
}

main().catch(console.error);
