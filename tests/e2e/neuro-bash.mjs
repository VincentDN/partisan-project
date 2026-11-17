// Neuro-Bash loads in the normal modder without duplicate factory magazines or stocks.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';
const server = await startServer(8187), browser = await launch();
try {
  const page = await open(browser, server.url + 'workbench/#rifle=stg44-neuro-bash');
  await page.waitForFunction(() => document.querySelector('[data-rifle="stg44-neuro-bash"]')?.getAttribute('aria-pressed') === 'true');
  const result = await page.evaluate(async () => {
    const {loadRifle, applySlotState} = await import('./rifle-instance.js');
    const rifle = await loadRifle('stg44-neuro-bash');
    const visible = id => rifle.slots[id].original.children.filter(n => n.visible).map(n => n.name);
    applySlotState(rifle, 'magazine', '25');
    applySlotState(rifle, 'stock', 'fixed');
    const first = [visible('magazine'), visible('stock')];
    applySlotState(rifle, 'magazine', '40');
    applySlotState(rifle, 'stock', 'adjustable');
    return {first, second: [visible('magazine'), visible('stock')]};
  });
  assert.deepEqual(result.first, [['mag_25'], ['stock_fixed']]);
  assert.deepEqual(result.second, [['mag_40'], ['stock_adj_body', 'stock_adj_tube']]);
  console.log('Neuro-Bash rendered selection and factory swaps passed');
} finally { await browser.close(); server.stop(); }
