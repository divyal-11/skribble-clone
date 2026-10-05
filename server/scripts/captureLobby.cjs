const puppeteer = require('puppeteer-core');
const { io } = require('socket.io-client');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = 'C:\\Users\\divya\\Projects\\skribble-clone\\docs\\screenshots';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();
  page.on('dialog', async d => await d.accept());

  console.log('Navigating to landing page...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await page.type('input[placeholder="Enter your name"]', 'CaptainDoodl');
  await page.click('button.skribbl-btn-green');

  await page.waitForFunction(() => document.body.innerText.includes('Room:'), { timeout: 10000 });
  const roomId = await page.evaluate(() => {
    const match = document.body.innerText.match(/Room:\s*([A-Z0-9]+)/i);
    return match ? match[1].trim() : null;
  });
  console.log('Room ID:', roomId);

  // Connect 2 simulated players
  const s2 = io('http://localhost:4000', { auth: { playerId: 'p2-guest' }, transports: ['websocket'] });
  s2.emit('joinRoom', { roomId, playerName: 'BrushMaster', teamId: 'red' });

  const s3 = io('http://localhost:4000', { auth: { playerId: 'p3-guest' }, transports: ['websocket'] });
  s3.emit('joinRoom', { roomId, playerName: 'PixelArt', teamId: 'blue' });
  await new Promise(r => setTimeout(r, 1200));

  // Change Game Mode to Team in form
  console.log('Selecting Team Mode...');
  await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    for (const sel of selects) {
      if (Array.from(sel.options).some(o => o.value === 'Team')) {
        sel.value = 'Team';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });
  await new Promise(r => setTimeout(r, 1200));

  // Also click team badge for CaptainDoodl to blue if needed
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const blueTeamBtn = btns.find(b => b.textContent && b.textContent.includes('Blue Team'));
  });
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({ path: path.join(OUT_DIR, '02_room_lobby.png') });
  console.log('✅ 02_room_lobby.png updated!');

  s2.disconnect();
  s3.disconnect();
  await browser.close();
}

main().catch(console.error);
