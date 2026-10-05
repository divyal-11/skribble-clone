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
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();
  page.on('console', m => console.log('BROWSER_LOG:', m.text()));
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

  // Connect 2 simulated players
  let s2 = null;
  let s3 = null;
  if (roomId) {
    s2 = io('http://localhost:4000', { auth: { playerId: 'p2-pixel-id' }, transports: ['websocket'] });
    s2.emit('joinRoom', { roomId, playerName: 'PixelArt' });

    s3 = io('http://localhost:4000', { auth: { playerId: 'p3-brush-id' }, transports: ['websocket'] });
    s3.emit('joinRoom', { roomId, playerName: 'BrushMaster' });

    await new Promise(r => setTimeout(r, 1200));

    s2.emit('switchTeam', { roomId, teamId: 'blue' });
    s3.emit('switchTeam', { roomId, teamId: 'red' });
    await new Promise(r => setTimeout(r, 1000));
  }

  // Set Rounds to 1 and Game Mode to Team using Puppeteer page.select
  console.log('Configuring lobby settings (Rounds: 1, Team Mode, 2 Teams)...');
  await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    for (const sel of selects) {
      if (Array.from(sel.options).some(o => o.value === 'Team')) {
        sel.value = 'Team';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (Array.from(sel.options).some(o => o.value === '1' || o.text === '1')) {
        sel.value = '1';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({ path: path.join(OUT_DIR, '02_room_lobby.png') });
  console.log('✅ 02_room_lobby.png captured.');

  console.log('3. Starting game and capturing Word Select Modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const start = btns.find(b => b.textContent && b.textContent.toLowerCase().includes('start'));
    if (start) start.click();
  });

  await page.waitForFunction(
    () => document.body.innerText.includes('Your Turn to Draw') || document.body.innerText.includes('is choosing a word') || document.body.innerText.includes('Word to Draw') || document.querySelector('canvas'),
    { timeout: 15000 }
  );
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({ path: path.join(OUT_DIR, '03_word_selection.png') });
  console.log('✅ 03_word_selection.png captured.');

  // Select word
  console.log('Selecting word...');
  s2.emit('wordSelect', { roomId, word: 'APPLE' });
  s3.emit('wordSelect', { roomId, word: 'APPLE' });
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const wordOption = btns.find(b => b.className.includes('capitalize') || (b.closest('.fixed') && b.textContent && b.textContent.length > 2 && !b.textContent.toLowerCase().includes('start')));
    if (wordOption) wordOption.click();
  });

  await new Promise(r => setTimeout(r, 2000));

  console.log('4. Streaming strokes and sending guesses...');
  // Stream apple drawing via s2
  const strokeDrawer = s2;
  const drawPoints = [];
  const cx = 0.5, cy = 0.5, r = 0.22;
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
    await new Promise(r => setTimeout(r, 15));
  }

  // Draw apple leaf in green
  strokeDrawer.emit('draw', {
    roomId,
    type: 'line',
    x: 0.54,
    y: 0.30,
    prevX: 0.50,
    prevY: 0.36,
    color: '#22c55e',
    size: 5
  });

  // Near-miss guess
  s3.emit('guess', { roomId, text: 'red circle' });
  await new Promise(r => setTimeout(r, 400));

  await page.type('input[placeholder="Type your guess here..."]', 'applle');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: path.join(OUT_DIR, '04_active_gameplay.png') });
  console.log('✅ 04_active_gameplay.png captured.');

  console.log('5. Triggering turn end to capture Turn End Scorecard...');
  // Correct guesses
  await page.type('input[placeholder="Type your guess here..."]', 'apple');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 600));

  s3.emit('guess', { roomId, text: 'apple' });

  await page.waitForFunction(
    () => document.body.innerText.includes('The word was') || document.body.innerText.includes('Everyone guessed'),
    { timeout: 10000 }
  ).catch(() => console.log('Timeout waiting for turn end banner'));
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({ path: path.join(OUT_DIR, '05_turn_end_scorecard.png') });
  console.log('✅ 05_turn_end_scorecard.png captured.');

  console.log('6. Fast-forwarding remaining turns to capture final Game Podium...');
  // Loop through remaining turns until gameEnded
  for (let turn = 0; turn < 4; turn++) {
    // Wait for word selection or game end
    await new Promise(r => setTimeout(r, 6000));
    const isPodium = await page.evaluate(() => document.body.innerText.includes('GAME OVER') || document.body.innerText.includes('WINNER') || document.body.innerText.includes('points'));
    if (isPodium) {
      console.log('Podium reached!');
      break;
    }

    // Auto-select words and auto-guess
    s2.emit('wordSelect', { roomId, word: 'DOG' });
    s3.emit('wordSelect', { roomId, word: 'DOG' });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const wordOption = btns.find(b => b.className.includes('capitalize') || (b.closest('.fixed') && b.textContent && b.textContent.length > 2 && !b.textContent.toLowerCase().includes('start')));
      if (wordOption) wordOption.click();
    });

    await new Promise(r => setTimeout(r, 1500));
    s2.emit('guess', { roomId, text: 'dog' });
    s3.emit('guess', { roomId, text: 'dog' });
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="guess"]');
      if (input) {
        input.value = 'dog';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        const form = input.closest('form');
        if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
      }
    });
  }

  // Wait for podium screen
  await page.waitForFunction(
    () => document.body.innerText.includes('WINNER') || document.body.innerText.includes('GAME OVER') || document.body.innerText.includes('points') || document.querySelector('[class*="Podium"]'),
    { timeout: 15000 }
  ).catch(() => console.log('Timeout waiting for podium'));
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({ path: path.join(OUT_DIR, '06_game_podium.png') });
  console.log('✅ 06_game_podium.png captured.');

  if (s2) s2.disconnect();
  if (s3) s3.disconnect();
  await browser.close();
  console.log('🎉 Tour completed and all screenshots saved!');
}

main().catch(console.error);
