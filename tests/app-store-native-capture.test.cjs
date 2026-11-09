const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const serverPath = path.join(root, 'marketing', 'app-store', 'serve.cjs');

test('native screenshot controller is valid browser-module syntax and does not mock native services', () => {
  const source = fs.readFileSync(path.join(root, 'marketing', 'app-store', 'native-controls.js'), 'utf8');
  const checked = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: source, encoding: 'utf8' });
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(source, /isNative\(\)/);
  assert.doesNotMatch(source, /window\.Capacitor\s*=|voiceStartListening|healthRequestAuthorization|musicSetPlayback/);
});

test('native control server refuses activation outside macOS CI', () => {
  const result = spawnSync(process.execPath, [serverPath], {
    env: { ...process.env, CI: 'false', CAPTURE_NATIVE: '1', CAPTURE_NATIVE_STATE: root },
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /isolated macOS CI/);
});

test('capture readiness rejects hidden tabs, stale dialogs and collapsed exercise details', () => {
  const source = fs.readFileSync(path.join(root, 'marketing', 'app-store', 'native-controls.js'), 'utf8');
  const nodes = new Map();
  const document = { visibilityState: 'visible', querySelector: (selector) => nodes.get(selector) || null };
  const context = vm.createContext({ document });
  vm.runInContext(source.slice(0, source.indexOf('\nrun().catch')).replace(/^import .*$/gm, ''), context);
  const ready = vm.runInContext('captureReady', context);
  const shown = { getClientRects: () => [{}] };
  const hidden = { getClientRects: () => [] };
  assert.equal(ready('workout'), false);
  nodes.set('#tab-workout.active', hidden);
  assert.equal(ready('workout'), false);
  nodes.set('#tab-workout.active', shown);
  assert.equal(ready('workout'), true);
  assert.equal(ready('sets'), false);
  nodes.set('.exercise-card[data-entry-index="1"]:not(.is-collapsed)', shown);
  assert.equal(ready('sets'), true);
  nodes.set('dialog[open]', shown);
  assert.equal(ready('sets'), false);
  nodes.set('#tab-plans.active', shown);
  nodes.set('dialog[open] .training-plan-row', shown);
  assert.equal(ready('plans'), true);
  assert.equal(ready('saved'), false);
  nodes.set('dialog[open].saved-plans-dialog [data-edit-plan]', shown);
  assert.equal(ready('saved'), true);
  document.visibilityState = 'hidden';
  assert.equal(ready('plans'), false);
});

test('capture rendering waits for four actual animation frames and explicitly fails a stalled WebView', async () => {
  const source = fs.readFileSync(path.join(root, 'marketing', 'app-store', 'native-controls.js'), 'utf8');
  const frames = [];
  let timeout, cleared = 0;
  const context = vm.createContext({
    requestAnimationFrame: (callback) => frames.push(callback),
    setTimeout: (callback) => { timeout = callback; return 1; },
    clearTimeout: () => { cleared++; },
  });
  vm.runInContext(source.slice(0, source.indexOf('\nrun().catch')).replace(/^import .*$/gm, ''), context);
  const paint = vm.runInContext('waitForPaint', context);
  let finished = false;
  const pending = paint().then(() => { finished = true; });
  for (let count = 0; count < 3; count++) {
    frames.shift()();
    await Promise.resolve();
    assert.equal(finished, false);
  }
  frames.shift()();
  await pending;
  assert.equal(finished, true);
  assert.equal(cleared, 1);
  const stalled = paint();
  timeout();
  await assert.rejects(stalled, /did not present animation frames/);
});

test('native artifact validation refuses duplicate screen pixels before writing provenance', () => {
  const script = fs.readFileSync(path.join(root, '.github', 'scripts', 'capture-store-simulator.sh'), 'utf8');
  const validator = script.match(/OUTPUT="\$OUTPUT" RUNTIME="\$RUNTIME" node - <<'JS'\r?\n([\s\S]*?)\r?\nJS/);
  assert.ok(validator);
  const screens = ['workout', 'sets', 'plans', 'saved', 'statistics', 'history', 'cardio', 'library'];
  const files = ['iphone', 'ipad'].flatMap((family) => ['he', 'en'].flatMap((language) =>
    screens.map((screen) => `${family}-${language}-${screen}.png`)));
  let writes = 0, duplicates = true;
  const fakeFS = {
    readdirSync: () => files,
    readFileSync: (file) => {
      const buffer = Buffer.alloc(32);
      buffer.writeUInt32BE(1320, 16); buffer.writeUInt32BE(2868, 20);
      buffer[31] = duplicates ? 0 : files.indexOf(path.basename(file));
      return buffer;
    },
    writeFileSync: () => { writes++; },
  };
  const run = () => vm.runInNewContext(validator[1], {
    require: (name) => name === 'fs' ? fakeFS : require(name),
    process: { env: { OUTPUT: 'capture-output', RUNTIME: 'test-runtime', GITHUB_SHA: 'test-source' } },
  });
  assert.throws(run, /duplicate rendered screens/);
  assert.equal(writes, 0);
  duplicates = false;
  run();
  assert.equal(writes, 1);
});

test('ordinary review server exposes neither native controls nor injected production scripts', async (t) => {
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, CAPTURE_NATIVE: '0', PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    child.once('close', resolve); child.kill();
  }));
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Review server startup timed out')), 5000);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.stdout.on('data', (data) => {
      const match = data.toString().match(/127\.0\.0\.1:(\d+)/);
      if (match) { clearTimeout(timer); resolve(Number(match[1])); }
    });
  });
  for (const route of ['/native-controls.js', '/native-store-control.json', '/native-store-ready', '/PROJECT-NOTES.md']) {
    const response = await fetch(`http://127.0.0.1:${port}${route}`, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 404, route);
  }
  const response = await fetch(`http://127.0.0.1:${port}/app/`, { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200);
  assert.doesNotMatch(await response.text(), /native-controls\.js/);
});
