/** Static release preparation; no dependencies, gameplay execution, or publication. */
import { readFileSync, existsSync, readdirSync, statSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFileSync(path.join(root, file), 'utf8');
const fail = message => { throw new Error(message); };
const games = JSON.parse(read('data/games.json'));
if (!Array.isArray(games) || !games.length) fail('Catalog must be a nonempty array');
const ids = new Set();
for (const game of games) {
  if (typeof game.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.id) || ids.has(game.id)) {
    fail(`Invalid/duplicate catalog ID: ${game.id}`);
  }
  ids.add(game.id);
  for (const key of ['title', 'category', 'tagline']) {
    if (typeof game[key] !== 'string' || !game[key]) fail(`${game.id}: invalid ${key}`);
  }
}
const context = { window: {} };
vm.runInNewContext(read('games-data.js'), context);
if (JSON.stringify(context.window.__NP_GAMES_CACHE__) !== JSON.stringify(games)) fail('Embedded catalog differs from games.json');
vm.runInNewContext(read('scripts/game-registry.js'), context);
const entries = context.window.NP_GameRegistry.entries;
const engineFiles = readdirSync(path.join(root, 'scripts')).filter(name => /^engines.*\.js$/.test(name));
const engineSource = engineFiles.map(name => read(`scripts/${name}`)).join('\n');
const definitions = new Set([...engineSource.matchAll(/function (launch\w+)\(/g)].map(match => match[1]));
for (const [id, engine] of Object.entries(entries)) {
  if (!ids.has(id)) fail(`Registry ID not in catalog: ${id}`);
  if (!definitions.has(engine)) fail(`Engine missing: ${id} -> ${engine}`);
  if (engine === 'launchRetroArcade') fail(`Generic arcade cannot represent ${id}`);
}
const html = read('index.html');
const scriptFiles = [...html.matchAll(/<script\b[^>]*\bsrc="([^"?]+)(?:\?[^\"]*)?"/g)].map(match => match[1]);
const styleFiles = [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"?]+)(?:\?[^\"]*)?"/g)].map(match => match[1]);
for (const [kind, files] of [['script', scriptFiles], ['stylesheet', styleFiles]]) {
  const seen = new Set();
  for (const file of files) {
    if (seen.has(file)) fail(`Duplicate ${kind} include: ${file}`);
    seen.add(file);
  }
}
for (const file of styleFiles) {
  if (!file.endsWith('.css') || file.startsWith('/') || file.includes('..') || !existsSync(path.join(root, file))) fail(`Stylesheet missing/invalid: ${file}`);
}
for (const required of ['games-data.js', 'scripts/game-session.js', 'scripts/game-registry.js',
  'scripts/engines.js', 'app.js']) {
  if (!scriptFiles.includes(required)) fail(`Required script not loaded: ${required}`);
}
for (const file of scriptFiles) {
  if (!existsSync(path.join(root, file))) fail(`Script missing: ${file}`);
  new vm.Script(read(file), { filename: file });
}
if (scriptFiles.indexOf('scripts/game-session.js') > scriptFiles.indexOf('scripts/engines.js')) fail('Session manager must load before engines');
if (scriptFiles.indexOf('scripts/game-registry.js') > scriptFiles.indexOf('app.js')) fail('Registry must load before app');
const inventory = JSON.parse(read('data/game-operations.json'));
if (inventory.games.length !== games.length) fail('Operational inventory length differs from catalog');
const inventoryIds = new Set();
for (const record of inventory.games) {
  if (!ids.has(record.id) || inventoryIds.has(record.id)) fail(`Invalid inventory ID: ${record.id}`);
  inventoryIds.add(record.id);
  if (record.engine !== (entries[record.id] || null)) fail(`Operational inventory is stale: ${record.id}`);
  if (record.status !== (entries[record.id] ? 'prototype' : 'planned')) fail(`Status differs from registry: ${record.id}`);
}
const manifest = JSON.parse(read('assets/ASSET_MANIFEST.json'));
if (!Array.isArray(manifest)) fail('Asset manifest must be an array');
const declaredAssets = new Set();
const assetRoot = path.join(root, 'assets');
for (const record of manifest) {
  if (typeof record.local_path !== 'string') fail('Asset record must have a local_path');
  const absolute = path.resolve(root, record.local_path);
  if (!absolute.startsWith(`${assetRoot}${path.sep}`) || !existsSync(absolute) || !statSync(absolute).isFile()) {
    fail(`Asset manifest path missing/invalid: ${record.local_path}`);
  }
  if (declaredAssets.has(record.local_path)) fail(`Duplicate asset record: ${record.local_path}`);
  declaredAssets.add(record.local_path);
}
function bytes(directory) {
  return readdirSync(directory).reduce((sum, name) => {
    const file = path.join(directory, name);
    return sum + (statSync(file).isDirectory() ? bytes(file) : statSync(file).size);
  }, 0);
}
const assetBytes = bytes(assetRoot);
const codeBytes = scriptFiles.reduce((sum, file) => sum + Buffer.byteLength(read(file)), 0);
console.log(JSON.stringify({ catalog: games.length, prototypes: Object.keys(entries).length,
  planned: games.length - Object.keys(entries).length, sourceJavaScriptBytes: codeBytes, assetBytes,
  declaredAssetFiles: declaredAssets.size,
  scope: 'Static consistency and syntax only; gameplay and rights require separate review.' }, null, 2));

if (process.argv.includes('--prepare')) {
  const output = path.join(root, '.pages-site');
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output);
  for (const file of ['index.html', ...styleFiles, ...scriptFiles, 'data/games.json', 'assets']) {
    const target = path.join(output, file);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(path.join(root, file), target, { recursive: true,
      // Superseded/rights-unverified covers remain in source pending review, not in the site artifact.
      filter: source => !['do_min_cover.png', 'line_98_cover.png', 'hang_rong_cover.png', 'ca_pho_concept_art.jpg', 'zuma_cover.png', 'zuma_intro.jpg', 'tetris_cover.png', 'pacman_cover.png', 'pikachu_cover.png', 'audition_cover.jpg', 'boom_online_cover.jpg', 'duck_hunt_cover.jpg', 'rockman_cover.jpg', 'road_rash_cover.jpg', 'street_fighter_cover.jpg', 'bubble_bobble_cover.jpg', 'age_of_war_cover.jpg', 'bloxorz_cover.jpg', 'dat_bom_cover.png', 'datbom_intro.jpg', 'ban_bi_cover.png', 'banbi_intro.jpg', 'o_an_quan_cover.png', 'mario_cover.png', 'diner_dash_cover.png', 'diner_intro.jpg', 'pvz_cover.png', 'uno_cover.png', 'uno_intro.jpg', 'dao_vang_cover.png', 'daovang_intro.jpg', 'ban_trung_cover.png', 'bantrung_intro.jpg', 'kim_cuong_cover.png', 'xe_tang_1990_cover.png', 'nong_trai_cover.png', 'gunny_cover.png', 'nuoi_ca_cover.png', 'ca_lon_nuot_ca_be_cover.png', 'snake_cover.png', 'caro_cover.png', 'co_tuong_cover.png', 'cotuong_intro.jpg'].some(name => path.relative(root, source) === path.join('assets', name)) });
  }
  console.log(`Prepared static site: ${output}`);
}
