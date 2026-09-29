// Headless smoke test: node tools/smoke-test.mjs   (needs playwright + chromium)
// 1) drives the menus with the KEYBOARD only, 2) runs a scripted bot with every turtle/energy on both stages and both bosses.
import { createRequire } from 'module';
import path from 'path'; import { fileURLToPath } from 'url'; import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PKG || 'playwright');
const dir = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(dir, '..');
const out = process.env.SHOTS || path.join(root, 'tools', 'shots'); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on('pageerror', e => errors.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('dialog', d => d.accept());
await page.goto('file://' + path.join(root, 'index.html'));
await page.waitForTimeout(400);
const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await page.waitForTimeout(60); } };
const st = () => page.evaluate(() => ({ state: TB.G.state, turtle: TB.G.S && TB.G.S.turtle, stage: TB.G.stageIdx, enc: TB.G.encIdx, screen: (document.querySelector('.screen.on') || {}).id }));
// ---- keyboard-only menu flow: title -> New Game -> pick Donatello (key 3) ----
await page.evaluate(() => TB.wipeSave());
await page.reload(); await page.waitForTimeout(400);
console.log('title focus:', await page.evaluate(() => document.activeElement.id));
await key('Enter'); await page.waitForTimeout(200); console.log('screen:', (await st()).screen);
await page.screenshot({ path: path.join(out, '10-select.png') });
await key('Digit3'); await page.waitForTimeout(300); console.log('started:', JSON.stringify(await st()));
// play a few seconds with real key presses
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(600); await page.keyboard.up('ArrowRight');
await key('KeyJ', 3); await key('Tab'); await page.waitForTimeout(200); console.log('after Tab:', JSON.stringify(await st()));
await key('Digit1'); await page.waitForTimeout(200); console.log('switched:', JSON.stringify(await st()));
await page.screenshot({ path: path.join(out, '11-upgrade-kbd.png') });
await key('Escape'); await page.waitForTimeout(150); console.log('resumed:', JSON.stringify(await st()));
// ---- bot runs ----
const start = (o) => page.evaluate((o) => { TB.Game.devStart(o); document.querySelectorAll('.screen').forEach(s => s.classList.remove('on')); }, o);
async function bot(seconds) {
  const t0 = Date.now();
  while (Date.now() - t0 < seconds * 1000) {
    await page.evaluate(() => {
      const G = TB.G, P = G.P; if (!P || G.state !== 'play') return;
      const near = G.ents.filter(e => !e.dead && e.state !== 'dying').sort((a, b) => Math.abs(a.x - P.x) + Math.abs(a.y - P.y) - Math.abs(b.x - P.x) - Math.abs(b.y - P.y))[0];
      ['left', 'right', 'up', 'down'].forEach(k => TB.input.release(k));
      const tx = near ? near.x - Math.sign(near.x - P.x) * 26 : P.x + 100, ty = near ? near.y : P.y;
      if (Math.abs(tx - P.x) > 6) TB.input.press(tx > P.x ? 'right' : 'left'); if (Math.abs(ty - P.y) > 4) TB.input.press(ty > P.y ? 'down' : 'up');
      if (near && Math.abs(near.x - P.x) < 50 && Math.abs(near.y - P.y) < 16) { TB.input.press(Math.random() < 0.15 ? 'heavy' : 'light'); if (Math.random() < 0.03) TB.input.press('special'); }
      if (Math.random() < 0.01) TB.input.press('dodge'); if (Math.random() < 0.01) TB.input.press('jump'); if (G.flow.needValve) TB.input.press('use');
    });
    await page.waitForTimeout(50);
  }
}
const info = () => page.evaluate(() => ({ state: TB.G.state, stage: TB.G.stageIdx, enc: TB.G.encIdx, xp: Math.floor(TB.G.S.xp), ents: TB.G.ents.map(e => e.type).join(',') }));
const turtles = ['leo', 'raph', 'don', 'mike'], energies = ['none', 'fire', 'lightning', 'ice', 'toxic', 'mystic'];
let n = 0;
for (const t of turtles) for (const e of energies) {
  const stage = n % 2, enc = [1, 3, 5, 7][n % 4]; n++;
  await start({ turtle: t, level: 8, tier: 1 + (n % 5), energy: e, stage, enc, god: true });
  await bot(5); console.log(t, e, 'S' + (stage + 1), JSON.stringify(await info()));
  if (n === 5) await page.screenshot({ path: path.join(out, `20-${t}-${e}.png`) });
}
for (const [stage, enc, name] of [[0, 12, 'boss1'], [1, 9, 'boss2']]) {
  await start({ turtle: 'don', level: 8, tier: 5, energy: 'mystic', stage, enc, god: true });
  await bot(25); console.log(name, JSON.stringify(await info()));
  await page.screenshot({ path: path.join(out, `30-${name}.png`) });
}
console.log('errors:', errors.length ? errors : 'none');
await browser.close(); process.exit(errors.length ? 1 : 0);
