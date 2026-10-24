// Renders comercial.html frame by frame (30 fps) and pipes PNGs to ffmpeg.
// Usage: NODE_PATH=<dir with playwright-core> FFMPEG=<ffmpeg> node render.js [out.mp4] [--frames t1,t2,...]
const { chromium } = require('playwright-core');
const { spawn } = require('child_process');
const path = require('path');
const FPS = 30, DUR = 30, N = FPS * DUR;
const out = process.argv[2] || path.join(__dirname, 'video-only.mp4');
const ff = process.env.FFMPEG || 'ffmpeg';
const stills = (process.argv.find(a => a.startsWith('--frames=')) || '').replace('--frames=', '');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--hide-scrollbars'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'comercial.html'));
  await page.evaluate(() => document.fonts.ready);
  if (stills) {
    for (const t of stills.split(',')) {
      await page.evaluate(x => window.render(x), +t);
      await page.screenshot({ path: path.join(__dirname, `frame-${t}s.png`) });
    }
    await browser.close(); return;
  }
  const enc = spawn(ff, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < N; i++) {
    await page.evaluate(x => window.render(x), i / FPS);
    const buf = await page.screenshot({ type: 'png' });
    if (!enc.stdin.write(buf)) await new Promise(r => enc.stdin.once('drain', r));
    if (i % 90 === 0) process.stderr.write(`frame ${i}/${N}\n`);
  }
  enc.stdin.end();
  await new Promise(r => enc.on('close', r));
  await browser.close();
})();
