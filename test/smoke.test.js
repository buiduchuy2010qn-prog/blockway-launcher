const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

function walkFiles(dir, relBase = '') {
  const results = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    const rel = relBase ? `${relBase}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      results.push(...walkFiles(full, rel));
    } else if (ent.isFile()) {
      results.push({ full, rel });
    }
  }
  return results;
}

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function matchesExpectedTextOrBinSha(buf, expectedSha, relPath) {
  const clean = String(expectedSha || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(clean)) return false;
  if (sha256Buffer(buf) === clean) return true;
  if (!/\.(js|json|html|css|txt|md|yml|yaml|bat|svg|xml|map)$/i.test(relPath)) return false;
  const lf = Buffer.from(buf.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
  if (sha256Buffer(lf) === clean) return true;
  const crlf = Buffer.from(buf.toString('latin1').replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'), 'latin1');
  return sha256Buffer(crlf) === clean;
}

test('1. Syntax check passes on all JavaScript files in src/', () => {
  const jsFiles = walkFiles(path.join(REPO_ROOT, 'src'), 'src').filter((f) => f.rel.endsWith('.js'));
  assert.ok(jsFiles.length >= 6, 'Expected at least 6 JS files in src/');
  for (const file of jsFiles) {
    execFileSync(process.execPath, ['--check', file.full], { stdio: 'pipe' });
  }
});

test('2. Version sync & OTA SHA-256 manifest integrity', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'ota-manifest.json'), 'utf8'));
  const html = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/index.html'), 'utf8');

  assert.equal(manifest.version, pkg.version, 'ota-manifest.json version must match package.json');
  assert.ok(html.includes(`BlockWay Launcher v${pkg.version} PRO`), 'index.html <title> must match package.json version');
  assert.ok(html.includes(`id="titlebarUpdateVer">v${pkg.version}<`), 'titlebarUpdateVer must match package.json version');
  assert.ok(html.includes(`id="updateBtnText">v${pkg.version}<`), 'updateBtnText must match package.json version');

  assert.ok(manifest.files && typeof manifest.files === 'object' && !Array.isArray(manifest.files));
  assert.ok(manifest.files['package.json'], 'ota-manifest.json must include package.json');

  const srcFiles = walkFiles(path.join(REPO_ROOT, 'src'), 'src');
  for (const f of [{ full: path.join(REPO_ROOT, 'package.json'), rel: 'package.json' }, ...srcFiles]) {
    const entry = manifest.files[f.rel];
    assert.ok(entry, `Missing ${f.rel} in ota-manifest.json`);
    assert.match(entry.sha256, /^[a-f0-9]{64}$/, `Invalid sha256 format for ${f.rel}`);
    const diskBuf = fs.readFileSync(f.full);
    assert.ok(
      matchesExpectedTextOrBinSha(diskBuf, entry.sha256, f.rel),
      `SHA-256 mismatch for ${f.rel}`
    );
  }
});

test('3. UI CSP, 8 Core Loaders invariant, and honest performance labels', () => {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/index.html'), 'utf8');

  const cspMatch = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
  assert.ok(cspMatch, 'index.html must declare a Content-Security-Policy meta tag');
  const csp = cspMatch[1];
  assert.ok(csp.includes("default-src 'self'"), 'CSP must restrict default-src to self');
  assert.ok(csp.includes("object-src 'none'"), 'CSP must disable object-src');
  assert.ok(!csp.includes("'unsafe-eval'"), 'CSP must not allow unsafe-eval');

  const cores = [...html.matchAll(/data-core="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(
    cores,
    ['vanilla', 'optifine', 'fabric', 'forge', 'neoforge', 'quilt', 'legacyfabric', 'horizon'],
    'Must preserve the exact 8 Core Loader buttons'
  );

  assert.ok(!html.includes('260 FPS • 0ms'), 'index.html must not contain unverified "260 FPS • 0ms" claims');
  assert.ok(!html.includes('0% GPU'), 'index.html must not contain unverified "0% GPU" claims');
});

test('4. Electron Main process security guards & XSS escaping hygiene', () => {
  const mainSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/main.js'), 'utf8');
  assert.ok(mainSrc.includes('contextIsolation: true'), 'BrowserWindow must enable contextIsolation');
  assert.ok(mainSrc.includes('nodeIntegration: false'), 'BrowserWindow must disable nodeIntegration');
  assert.ok(mainSrc.includes('sandbox: true'), 'BrowserWindow must enable sandbox');
  assert.ok(mainSrc.includes('function assertTrustedIpcSender'), 'IPC handlers must verify sender frame/origin');
  assert.ok(mainSrc.includes('async function openDirectorySafely'), 'Directory opener must block UNC and file execution');
  assert.ok(mainSrc.includes('function encryptSecretForDisk'), 'Credentials must use safeStorage encryption helper');
  assert.ok(mainSrc.includes('function parseOtaManifestEntries'), 'OTA updater must parse object-map manifest entries');

  const authSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/microsoft-auth.js'), 'utf8');
  assert.ok(authSrc.includes('crypto.timingSafeEqual'), 'Auth loopback & portal must verify CSRF/state tokens in constant time');

  for (const uiRel of ['src/ui/renderer.js', 'src/ui/store-features.js']) {
    const uiSrc = fs.readFileSync(path.join(REPO_ROOT, uiRel), 'utf8');
    assert.ok(
      !uiSrc.includes('(s) => String(s ?? \'\')'),
      `${uiRel} must not contain no-op escapeHtml fallbacks`
    );
  }
});

test('5. Zip-Slip protection & Horizon Rust compatibility classifier unit tests', () => {
  const Module = require('node:module');
  const localNm = path.join(REPO_ROOT, 'node_modules');
  const installedAppNm = path.join(
    process.env.LOCALAPPDATA || '',
    'Programs',
    'aether-craft-launcher',
    'AetherCraft',
    'resources',
    'app',
    'node_modules'
  );
  if (!fs.existsSync(localNm) && installedAppNm && fs.existsSync(installedAppNm)) {
    process.env.NODE_PATH = process.env.NODE_PATH ? `${process.env.NODE_PATH}${path.delimiter}${installedAppNm}` : installedAppNm;
    Module._initPaths();
  }
  const engine = require('../src/launcher-engine');
  const auth = require('../src/microsoft-auth');

  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-smoke-test-'));
  try {
    // 5a. Safe ZIP extraction works
    const safeZip = {
      getEntries: () => [
        {
          entryName: 'sub/hello.txt',
          isDirectory: false,
          getData: () => Buffer.from('blockway-ok', 'utf8')
        }
      ]
    };
    const safeDest = path.join(tmpBase, 'safe-out');
    engine.extractZipSafely(safeZip, safeDest);
    assert.equal(fs.readFileSync(path.join(safeDest, 'sub/hello.txt'), 'utf8'), 'blockway-ok');

    // 5b. Malicious Zip-Slip entry is blocked before touching parent directory
    const evilDest = path.join(tmpBase, 'nested', 'target');
    const escapedFile = path.join(tmpBase, 'pwned.txt');
    const evilZip = {
      getEntries: () => [
        {
          entryName: '../../pwned.txt',
          isDirectory: false,
          getData: () => Buffer.from('evil', 'utf8')
        }
      ]
    };
    assert.throws(
      () => engine.extractZipSafely(evilZip, evilDest),
      /Zip-Slip/i,
      'extractZipSafely must throw on path traversal entries'
    );
    assert.equal(fs.existsSync(escapedFile), false, 'Zip-Slip file must never be written outside destDir');
  } finally {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  }

  // 5c. Horizon Rust port classifier rejects pure-Java Mixin fallback resourcepacks (e.g. AppleSkin)
  assert.equal(
    engine.isGenuineHorizonPortResult({ verdict: 'no', kind: 'java_code', files_packed: 0 }),
    false
  );
  assert.equal(
    engine.isGenuineHorizonPortResult({
      verdict: 'partly',
      kind: 'resourcepack',
      files_packed: 2,
      skipped: ['8 Java Mixins']
    }),
    false,
    'Must reject Java Mixin mods that only had minor GUI PNGs'
  );
  assert.equal(
    engine.isGenuineHorizonPortResult({ verdict: 'works', kind: 'datapack', files_packed: 41, skipped: [] }),
    true
  );
  assert.equal(
    engine.isGenuineHorizonPortResult({ verdict: 'works', kind: 'hmod', blocks: 12, items: 4 }),
    true
  );

  // 5d. Horizon version picker prioritizes native Datapack over NeoForge/Fabric .jar
  const picked = engine.pickBestHorizonModrinthVersion(
    [
      { id: 'jar-v1', loaders: ['neoforge'], game_versions: ['1.21.11'] },
      { id: 'dp-v2', loaders: ['datapack'], game_versions: ['26.3', '1.21.11'] }
    ],
    '26.3'
  );
  assert.equal(picked?.id, 'dp-v2', 'Must pick datapack version first for Horizon Rust');

  // 5e. Deterministic RFC 4122 v3 Offline UUID generation
  const uuidA = auth.generateOfflineUUID('StevePlayer');
  const uuidB = auth.generateOfflineUUID('StevePlayer');
  assert.equal(uuidA, uuidB);
  assert.match(uuidA, /^[0-9a-f]{8}-[0-9a-f]{4}-3[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});
