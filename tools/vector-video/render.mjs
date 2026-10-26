// 把 tools/vector-video/frame.html 的矢量动画渲染为 mp4。
// 用法（在 applycheck 目录下，因为需要这里的 node_modules/playwright）：
//   node tools/vector-video/render.mjs --out media/applycheck-demo.mp4 --fps 30
// 全程逐帧 PNG → ffmpeg stdin，不在磁盘堆积中间帧。

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i < 0 ? d : process.argv[i + 1];
};

const FPS = Number(arg('fps', 30));
const OUT = path.resolve(arg('out', 'media/applycheck-demo.mp4'));
const CHANNEL = arg('channel', 'chrome');
const W = 1920, H = 1080;

await fs.mkdir(path.dirname(OUT), { recursive: true });

const browser = await chromium.launch({ channel: CHANNEL });
const page = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1
});
await page.goto(pathToFileURL(path.join(here, 'frame.html')).href);
await page.waitForFunction(() => typeof window.render === 'function');
const DUR = await page.evaluate(() => window.DURATION);
const total = Math.round(DUR * FPS);

console.log(`渲染 ${DUR}s @ ${FPS}fps → ${total} 帧 → ${OUT}`);
console.log(`素材: ${path.join(here, 'frame.html')}`);

const ff = spawn('ffmpeg', [
  '-y',
  '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264',
  '-profile:v', 'high', '-level', '4.1',
  '-pix_fmt', 'yuv420p',
  '-crf', '18',
  '-preset', 'medium',
  '-g', String(FPS * 2),
  '-movflags', '+faststart',
  '-an',
  OUT
], { stdio: ['pipe', 'ignore', 'pipe'] });

let ffErr = '';
ff.stderr.on('data', d => { ffErr += d.toString(); });

const ffDone = new Promise((res, rej) => {
  ff.on('close', code => code === 0 ? res() : rej(new Error('ffmpeg exit ' + code + '\n' + ffErr.slice(-1500))));
});

const t0 = Date.now();
for (let i = 0; i < total; i++) {
  const t = i / FPS;
  await page.evaluate(v => window.render(v), t);
  const buf = await page.screenshot({ type: 'png' });
  if (!ff.stdin.write(buf)) {
    await new Promise(r => ff.stdin.once('drain', r));
  }
  if (i % 180 === 0 || i === total - 1) {
    const el = (Date.now() - t0) / 1000;
    const pct = ((i + 1) / total * 100).toFixed(1);
    console.log(`  ${pct}%  frame ${i + 1}/${total}  t=${t.toFixed(2)}s  ${el.toFixed(0)}s elapsed`);
  }
}
ff.stdin.end();
await ffDone;
await browser.close();

// 附带导出两张矢量场景的静帧（供海报/封面使用）
await writeStill(2.3, 'media/applycheck-poster-title.png');
await writeStill(21.2, 'media/applycheck-poster-results.png');

const st = await fs.stat(OUT);
console.log(`完成: ${OUT}  ${(st.size / 1024 / 1024).toFixed(2)} MB  ${((Date.now() - t0) / 1000).toFixed(0)}s`);

async function writeStill(t, rel) {
  const b = await chromium.launch({ channel: CHANNEL });
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await p.goto(pathToFileURL(path.join(here, 'frame.html')).href);
  await p.waitForFunction(() => typeof window.render === 'function');
  await p.evaluate(v => window.render(v), t);
  await fs.mkdir(path.dirname(path.resolve(rel)), { recursive: true });
  await p.screenshot({ path: path.resolve(rel) });
  await b.close();
  console.log('静帧: ' + path.resolve(rel) + `  (t=${t}s, 2x)`);
}
