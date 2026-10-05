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

  console.log('1. Creating room for Solo Podium...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await page.type('input[placeholder="Enter your name"]', 'CaptainDoodl');
  await page.click('button.skribbl-btn-green');

  await page.waitForFunction(() => document.body.innerText.includes('Room:'), { timeout: 10000 });
  const roomId = await page.evaluate(() => {
    const match = document.body.innerText.match(/Room:\s*([A-Z0-9]+)/i);
    return match ? match[1].trim() : null;
  });
  console.log('Room ID:', roomId);

  // Set rounds to 1 in lobby settings
  await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    for (const sel of selects) {
      if (Array.from(sel.options).some(o => o.value === '1')) {
        sel.value = '1';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });
  await new Promise(r => setTimeout(r, 800));

  // Connect 3 simulated players
  const s2 = io('http://localhost:4000', { auth: { playerId: 'p2-guest' }, transports: ['websocket'] });
  s2.emit('joinRoom', { roomId, playerName: 'PixelNinja' });

  const s3 = io('http://localhost:4000', { auth: { playerId: 'p3-guest' }, transports: ['websocket'] });
  s3.emit('joinRoom', { roomId, playerName: 'SpeedyArtist' });

  const s4 = io('http://localhost:4000', { auth: { playerId: 'p4-guest' }, transports: ['websocket'] });
  s4.emit('joinRoom', { roomId, playerName: 'Challenger' });
  await new Promise(r => setTimeout(r, 1200));

  let currentSecretWord = 'apple';

  const sockets = [s2, s3, s4];
  sockets.forEach((s) => {
    s.on('chooseWord', ({ options }) => {
      currentSecretWord = options[0] || 'apple';
      console.log('Socket selecting word:', currentSecretWord);
      s.emit('wordSelect', { roomId, word: currentSecretWord });
    });

    s.on('wordChosen', ({ word }) => {
      if (word) currentSecretWord = word;
      console.log('Word is active:', currentSecretWord);
      setTimeout(() => {
        s2.emit('guess', { roomId, text: currentSecretWord });
        s3.emit('guess', { roomId, text: currentSecretWord });
        s4.emit('guess', { roomId, text: currentSecretWord });
      }, 300);
    });
  });

  // Browser UI automation: auto-pick word if modal is shown, auto-guess in input
  const interval = setInterval(async () => {
    try {
      await page.evaluate((w) => {
        // Word modal
        const btns = Array.from(document.querySelectorAll('button'));
        const wordBtn = btns.find(b => b.className.includes('capitalize') || (b.closest('.fixed') && b.textContent && b.textContent.length > 2 && !b.textContent.toLowerCase().includes('start') && !b.textContent.toLowerCase().includes('play again')));
        if (wordBtn) {
          wordBtn.click();
          return;
        }

        // Guess input
        const input = document.querySelector('input[placeholder="Type your guess here..."]');
        if (input && !input.disabled && w) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, w);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          const form = input.closest('form');
          if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
        }
      }, currentSecretWord);
    } catch (e) {}
  }, 400);

  // Start game
  console.log('Starting game...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const start = btns.find(b => b.textContent && b.textContent.toLowerCase().includes('start'));
    if (start) start.click();
  });

  console.log('Awaiting Solo Podium screen with Top 3 and remaining player...');
  await page.waitForFunction(
    () => (document.body.innerText.includes('is the winner!') || document.body.innerText.includes('PLAY AGAIN')) && document.body.innerText.includes('#1'),
    { timeout: 90000 }
  );

  clearInterval(interval);
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: path.join(OUT_DIR, '06_solo_podium.png') });
  console.log('✅ 06_solo_podium.png captured!');

  s2.disconnect();
  s3.disconnect();
  s4.disconnect();
  await browser.close();
}

main().catch(console.error);
