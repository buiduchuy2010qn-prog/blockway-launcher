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
    if (/\.(js|json|html|css|txt|svg|md|yml)$/i.test(f.rel)) {
      assert.equal(
        diskBuf.includes(0x0d),
        false,
        `Text file ${f.rel} must use pure LF line endings (zero \\r bytes) for deterministic OTA SHA-256`
      );
    }
    assert.ok(
      matchesExpectedTextOrBinSha(diskBuf, entry.sha256, f.rel),
      `SHA-256 mismatch for ${f.rel}`
    );
    assert.equal(
      sha256Buffer(diskBuf),
      entry.sha256,
      `Exact byte-for-byte LF SHA-256 mismatch for ${f.rel}`
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

test('6. Native 26.3 Datapack extraction & Worldgen self-healing prevent map crash', () => {
  const engine = require('../src/launcher-engine');
  const tmpGame = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-dp263-test-'));
  try {
    const mockTerralithZip = {
      getEntries: () => [
        {
          entryName: 'pack.mcmeta',
          isDirectory: false,
          getData: () => Buffer.from(JSON.stringify({ pack: { description: 'Terralith 26.3', min_format: 121, max_format: 121 } }), 'utf8')
        },
        {
          entryName: 'data/minecraft/tags/worldgen/configured_feature/can_spawn_from_bone_meal.json',
          isDirectory: false,
          getData: () => Buffer.from(JSON.stringify({ values: ['minecraft:oak'] }), 'utf8')
        },
        {
          entryName: 'data/minecraft/worldgen/density_function/overworld/final_density.json',
          isDirectory: false,
          getData: () => Buffer.from(JSON.stringify({
            type: 'minecraft:add',
            left: 'minecraft:beardifier',
            right: {
              type: 'minecraft:cache',
              input: {
                type: 'minecraft:interpolated',
                cell_size_xz: 4,
                cell_size_y: 8,
                input: { type: 'minecraft:abs', input: 0.5 }
              }
            }
          }), 'utf8')
        },
        {
          entryName: 'data/terralith/function/init.mcfunction',
          isDirectory: false,
          getData: () => Buffer.from('say Terralith ready\n', 'utf8')
        }
      ]
    };

    const installed = engine.tryInstallNative263DatapackArchive(mockTerralithZip, {
      gameDir: tmpGame,
      preferredModId: 'terralith',
      displayName: 'Terralith'
    });
    assert.ok(installed, 'Must recognize native 26.3 datapack archive');
    assert.equal(installed.mod_id, 'terralith');
    assert.equal(installed.verdict, 'works');

    const checkClean = engine.inspectWorldgenDatapackDir(installed.output_path);
    assert.equal(checkClean.valid, true, 'Extracted 26.3 density_function must remain 100% valid');
    assert.equal(checkClean.checkedFiles, 1);

    // Simulate a previously corrupted world datapack (`"left": null, "right": null`)
    const worldDir = path.join(tmpGame, 'saves', 'New World');
    const brokenDp = path.join(worldDir, 'datapacks', 'terralith', 'data', 'minecraft', 'worldgen', 'density_function', 'overworld');
    fs.mkdirSync(brokenDp, { recursive: true });
    fs.writeFileSync(path.join(worldDir, 'level.dat'), 'dummy');
    fs.writeFileSync(
      path.join(brokenDp, 'final_density.json'),
      JSON.stringify({ type: 'minecraft:add', left: null, right: null }),
      'utf8'
    );

    assert.equal(
      engine.inspectWorldgenDatapackDir(path.join(worldDir, 'datapacks', 'terralith')).valid,
      false,
      'Must detect null left/right density_function corruption'
    );

    const healReport = engine.sanitizeCorruptedWorldgenDatapacks(tmpGame);
    assert.deepEqual(healReport.repairedInSaves, ['New World/terralith']);
    assert.equal(
      engine.inspectWorldgenDatapackDir(path.join(worldDir, 'datapacks', 'terralith')).valid,
      true,
      'World datapack must be automatically repaired from clean new-world-datapacks copy'
    );
  } finally {
    fs.rmSync(tmpGame, { recursive: true, force: true });
  }
});

test('7. Unified Monorepo: Rust engine lives in rust-engine/ and zero separate-repo references remain', () => {
  assert.equal(
    fs.existsSync(path.join(REPO_ROOT, 'rust-engine', 'Cargo.toml')),
    true,
    'rust-engine/Cargo.toml must exist inside unified blockway-launcher repo'
  );
  const srcFiles = walkFiles(path.join(REPO_ROOT, 'src'), 'src').filter((f) => /\.(js|html|css)$/i.test(f.rel));
  for (const f of srcFiles) {
    const txt = fs.readFileSync(f.full, 'utf8');
    assert.equal(
      txt.includes('blockway-rust-engine'),
      false,
      `${f.rel} must not reference legacy separate blockway-rust-engine repo`
    );
  }
});

test('8. Kho Mod sorts already-installed addons continuously to the top', () => {
  const engine = require('../src/launcher-engine');
  const mixed = [
    { slug: 'ferrite-core', isInstalledExact: true, isBuiltinLocked: false },
    { slug: 'yacl', isInstalledExact: false, isBuiltinLocked: false },
    { slug: 'fabric-language-kotlin', isInstalledExact: true, isBuiltinLocked: false },
    { slug: 'sodium', isInstalledExact: true, isBuiltinLocked: true },
    { slug: 'xaeros-minimap', isInstalledExact: true, isBuiltinLocked: false },
    { slug: 'entity-texture-features', isInstalledExact: false, isBuiltinLocked: false },
    { slug: 'architectury-api', isInstalledExact: false, isBuiltinLocked: false },
    { slug: 'sodium-extra', isInstalledExact: true, isBuiltinLocked: false }
  ];
  const sorted = engine.sortModStoreEntriesInstalledFirst(mixed);
  assert.deepEqual(
    sorted.map((x) => x.slug),
    [
      'ferrite-core',
      'fabric-language-kotlin',
      'xaeros-minimap',
      'sodium-extra',
      'sodium',
      'yacl',
      'entity-texture-features',
      'architectury-api'
    ],
    'Installed addons must appear first in original popularity order, followed by builtin engine and uninstalled items'
  );

  const storeUi = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/store-features.js'), 'utf8');
  assert.ok(storeUi.includes('getModCardSortRank'), 'store-features.js must define getModCardSortRank');
  assert.ok(storeUi.includes('is-installed-card'), 'store-features.js must tag installed cards with is-installed-card');
  assert.ok(storeUi.includes('promoteCardToInstalledGroup'), 'store-features.js must promote newly installed cards to the installed block');
});
