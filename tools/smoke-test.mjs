// Headless smoke test: node tools/smoke-test.mjs   (needs playwright + chromium)
// Loads the game, checks for script errors, runs a scripted bot through the stage in dev/god mode and saves screenshots.
import { createRequire } from 'module';
import path from 'path'; import { fileURLToPath } from 'url'; import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PKG || 'playwright');
const dir = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(dir, '..');
const out = process.env.SHOTS || path.join(root, 'tools', 'shots'); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on('pageerror', e => errors.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto('file://' + path.join(root, 'index.html'));
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(out, '01-title.png') });
const start = (o) => page.evaluate((o) => { TB.Game.devStart(o); document.querySelectorAll('.screen').forEach(s => s.classList.remove('on')); }, o);
// bot: walks right and mashes attack; occasionally dodges/specials
async function bot(seconds, label) {
  const t0 = Date.now(); let n = 0;
  while (Date.now() - t0 < seconds * 1000) {
    await page.evaluate(() => {
      const G = TB.G, P = G.P; if (!P || G.state !== 'play') return;
      const near = G.ents.filter(e => !e.dead && e.state !== 'dying').sort((a, b) => Math.abs(a.x - P.x) + Math.abs(a.y - P.y) - Math.abs(b.x - P.x) - Math.abs(b.y - P.y))[0];
      ['left', 'right', 'up', 'down'].forEach(k => TB.input.release(k));
      let tx = near ? near.x - Math.sign(near.x - P.x) * 26 : P.x + 100, ty = near ? near.y : P.y;
      if (Math.abs(tx - P.x) > 6) TB.input.press(tx > P.x ? 'right' : 'left'); if (Math.abs(ty - P.y) > 4) TB.input.press(ty > P.y ? 'down' : 'up');
      if (near && Math.abs(near.x - P.x) < 48 && Math.abs(near.y - P.y) < 16) { TB.input.press(Math.random() < 0.15 ? 'heavy' : 'light'); if (Math.random() < 0.02) TB.input.press('special'); }
      if (Math.random() < 0.01) TB.input.press('dodge'); if (Math.random() < 0.01) TB.input.press('jump'); if (G.flow.needValve) { TB.input.press('use'); }
    });
    await page.waitForTimeout(50); n++;
  }
}
const info = () => page.evaluate(() => ({ state: TB.G.state, enc: TB.G.encIdx, lvl: TB.G.S.level, xp: Math.floor(TB.G.S.xp), hp: Math.round(TB.G.P ? TB.G.P.hp : 0), ents: TB.G.ents.map(e => e.type + ':' + e.state).join(',') }));
const energies = ['fire', 'lightning', 'ice'];
for (let i = 0; i < 3; i++) {
  await start({ level: 8, tier: [2, 3, 5][i], energy: energies[i], enc: [0, 4, 8][i], god: true });
  await bot(i === 0 ? 14 : 12);
  console.log('run', i, JSON.stringify(await info()));
  await page.screenshot({ path: path.join(out, `0${i + 2}-play-${energies[i]}.png`) });
}
// boss
await start({ level: 8, tier: 5, energy: 'fire', enc: 11, god: true });
await bot(20); console.log('boss', JSON.stringify(await info()));
await page.screenshot({ path: path.join(out, '05-boss.png') });
// upgrade menu screenshots
await start({ level: 3, tier: 3, energy: 'lightning', enc: 0, god: true });
await page.evaluate(() => { TB.G.state = 'menu'; TB.debug.buildUpgrade(); TB.debug.show('sUpg'); });
await page.waitForTimeout(400); await page.screenshot({ path: path.join(out, '06-upgrade.png') });
console.log('errors:', errors.length ? errors : 'none');
await browser.close(); process.exit(errors.length ? 1 : 0);
