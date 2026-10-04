// Build convoy/data/loot-pool.json (what missions can drop) from the Equipment Wiki catalogue, so the game does not
// load the full 2 MB catalogue. Run after re-importing the wiki: node tools/loot/build-pool.mjs
import fs from 'node:fs';
import {buildPool} from '../../convoy/loot.js';

const data = JSON.parse(fs.readFileSync('wiki/data/items.json', 'utf8'));
const pool = buildPool(data);
fs.writeFileSync('convoy/data/loot-pool.json', JSON.stringify({source: 'wiki/data/items.json', items: pool}) + '\n');
const by = {};
for (const e of pool) by[e.gear || 'goods'] = (by[e.gear || 'goods'] || 0) + 1;
console.log(`loot pool: ${pool.length} items`, by);
