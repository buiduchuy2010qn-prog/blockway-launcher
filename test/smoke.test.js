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

test('9. Pure Horizon Theme Studio popover overflow guard & translucent dark glass tokens', () => {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/index.html'), 'utf8');
  const glassCss = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/horizon-glass.css'), 'utf8');
  const glassJs = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/horizon-glass.js'), 'utf8');

  const popMatch = html.match(/id="themePickerPopover"[\s\S]*?<\/header>/);
  assert.ok(popMatch, '#themePickerPopover block must exist in header');
  const popBlock = popMatch[0];
  for (const themeId of ['horizon', 'sakura', 'prism', 'lunar', 'rust', 'mojang', 'modrinth', 'feather', 'cherry']) {
    assert.ok(
      popBlock.includes(`data-theme-pick="${themeId}"`),
      `#themePickerPopover must include data-theme-pick="${themeId}"`
    );
  }

  assert.ok(glassCss.includes('#themePickerPopover .tsw-label'), 'horizon-glass.css must style #themePickerPopover .tsw-label');
  assert.ok(glassCss.includes('text-overflow: ellipsis !important'), 'horizon-glass.css must guard labels with text-overflow ellipsis');
  assert.ok(glassCss.includes('#tab-play .dsp-block'), 'horizon-glass.css must apply frosted glass to #tab-play .dsp-block');

  const searchWidthMatch = glassCss.match(/#globalSearchInput\s*\{[^}]*width:\s*(\d+)px\s*!important/);
  assert.ok(searchWidthMatch && Number(searchWidthMatch[1]) >= 76, '#globalSearchInput width must be >= 76px so placeholder does not clip');

  for (const field of ['auroraA', 'auroraB']) {
    assert.ok(glassJs.includes(`lunar:`) && glassJs.includes(`${field}:`), `SCENE_PALETTES must define ${field} for dark frosted glass themes`);
  }
});

test('10. v42.3.0 PRO Deep Java (Compact Headers + AppCDS + Turbo Smooth v4), dGPU Pref & Rust Hybrid P-Core / Anti-EcoQoS', () => {
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

  // 10a. Java 25 Compact Object Headers & ReservedCodeCacheSize vs Java 21 ZGenerational
  const zgc25 = engine.buildGenerationalZgcArgs(25, 12);
  assert.ok(zgc25.includes('-XX:+UseCompactObjectHeaders'), 'Java 25 must include -XX:+UseCompactObjectHeaders');
  assert.ok(zgc25.includes('-XX:ReservedCodeCacheSize=512m'), 'Java 25 must include -XX:ReservedCodeCacheSize=512m');
  const zgc21 = engine.buildGenerationalZgcArgs(21, 12);
  assert.ok(zgc21.includes('-XX:+ZGenerational'), 'Java 21 must include -XX:+ZGenerational');
  assert.ok(!zgc21.includes('-XX:+UseCompactObjectHeaders'), 'Java 21 must NOT include -XX:+UseCompactObjectHeaders');

  const tmpAsciiDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-v423-test-'));
  try {
    // 10b. Auto AppCDS (.jsa) on Java 25 vs empty on Java 17
    const cds25 = engine.buildJavaAppCdsArgs({
      rootDir: tmpAsciiDir,
      mcVersion: '26.3',
      loaderType: 'fabric',
      javaMajor: 25
    });
    assert.ok(Array.isArray(cds25) && cds25.length >= 3, 'Java 25 AppCDS args must contain archive flags');
    assert.equal(cds25[0], '-Xshare:auto');
    assert.equal(cds25[1], '-XX:+AutoCreateSharedArchive');
    assert.ok(cds25[cds25.length - 1].endsWith('.jsa'), 'AppCDS SharedArchiveFile flag must end with .jsa');
    assert.deepEqual(
      engine.buildJavaAppCdsArgs({
        rootDir: tmpAsciiDir,
        mcVersion: '26.3',
        loaderType: 'fabric',
        javaMajor: 17
      }),
      [],
      'Java 17 must return empty AppCDS args'
    );

    // 10c. Turbo Smooth v4 apply & clean revert for FerriteCore, Lithium, C2ME, MoreCulling & gpuCulling:auto
    const tmpSmoothDir = path.join(tmpAsciiDir, 'smooth-game');
    const modsDir = path.join(tmpSmoothDir, 'mods');
    fs.mkdirSync(modsDir, { recursive: true });
    for (const jarName of ['ferritecore-7.0.jar', 'lithium-0.14.jar', 'c2me-0.3.jar', 'moreculling-1.0.jar']) {
      fs.writeFileSync(path.join(modsDir, jarName), 'mock-jar', 'utf8');
    }

    const applyRes = engine.applyDeepGameSmoothEngine({ gameDir: tmpSmoothDir, loaderType: 'fabric' });
    assert.equal(applyRes.ok, true, 'applyDeepGameSmoothEngine must succeed');

    const ferriteCfg = fs.readFileSync(path.join(tmpSmoothDir, 'config', 'ferritecore.mixin.properties'), 'utf8');
    assert.ok(ferriteCfg.includes('replaceBakedQuad=true'), 'ferritecore.mixin.properties must set replaceBakedQuad=true');

    const lithiumCfg = fs.readFileSync(path.join(tmpSmoothDir, 'config', 'lithium.properties'), 'utf8');
    assert.ok(lithiumCfg.includes('mixin.ai.nearby_entity_tracking=true'), 'lithium.properties must set mixin.ai.nearby_entity_tracking=true');

    const c2meCfg = fs.readFileSync(path.join(tmpSmoothDir, 'config', 'c2me.toml'), 'utf8');
    assert.ok(c2meCfg.includes('globalExecutorParallelism'), 'c2me.toml must configure globalExecutorParallelism');

    const moreCullingCfg = fs.readFileSync(path.join(tmpSmoothDir, 'config', 'moreculling.toml'), 'utf8');
    assert.ok(moreCullingCfg.includes('useBlockStateCulling = true'), 'moreculling.toml must set useBlockStateCulling = true');

    const hzGfx = fs.readFileSync(path.join(tmpSmoothDir, 'horizon-graphics.txt'), 'utf8');
    assert.ok(hzGfx.includes('gpuCulling:auto'), 'horizon-graphics.txt must set gpuCulling:auto');

    const revertRes = engine.revertDeepGameSmoothEngine({ gameDir: tmpSmoothDir });
    assert.equal(revertRes.ok, true, 'revertDeepGameSmoothEngine must succeed');
    for (const rel of [
      'config/ferritecore.mixin.properties',
      'config/lithium.properties',
      'config/c2me.toml',
      'config/moreculling.toml',
      'horizon-graphics.txt'
    ]) {
      assert.equal(
        fs.existsSync(path.join(tmpSmoothDir, ...rel.split('/'))),
        false,
        `revertDeepGameSmoothEngine must remove newly created ${rel}`
      );
    }
  } finally {
    fs.rmSync(tmpAsciiDir, { recursive: true, force: true });
  }

  // 10d. Windows DirectX High-Performance dGPU preference
  const gpuRes = engine.ensureWindowsHighPerfGpuPreference(
    ['C:\\Java\\bin\\javaw.exe', 'C:\\Horizon\\horizon-client.exe'],
    { platform: 'win32', gentleMode: false, dryRun: true }
  );
  assert.equal(gpuRes.ok, true);
  assert.ok(Array.isArray(gpuRes.entries) && gpuRes.entries.length >= 2);
  for (const entry of gpuRes.entries) {
    assert.equal(entry.regKey, 'HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences');
    assert.equal(entry.valueData, 'GpuPreference=2;');
  }
  const gpuGentle = engine.ensureWindowsHighPerfGpuPreference(
    ['C:\\Java\\bin\\javaw.exe'],
    { platform: 'win32', gentleMode: true, dryRun: true }
  );
  assert.equal(gpuGentle.skipped, true, 'gentleMode: true must skip dGPU registry override');

  // 10e. Rust horizon-threads Windows Hybrid P-Core & Anti-EcoQoS symbols
  const threadsRs = fs.readFileSync(
    path.join(REPO_ROOT, 'rust-engine', 'crates', 'horizon-threads', 'src', 'lib.rs'),
    'utf8'
  );
  for (const sym of [
    'parse_windows_performance_cores',
    'GetLogicalProcessorInformationEx',
    'disable_thread_power_throttling',
    'disable_process_power_throttling'
  ]) {
    assert.ok(threadsRs.includes(sym), `horizon-threads/src/lib.rs must include ${sym}`);
  }
});

test('11. v42.4.0 PRO Full-Version Smooth v5 (1.8.9 -> 26.3), Ultra-Light Rust HeapCompact & 120Hz Launcher Hibernation', () => {
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

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-v424-test-'));
  try {
    // 11a. Legacy 1.8.9 esports tuning writes useVbo/fboEnable and omits post-1.16 options
    const legacyDir = path.join(tmpRoot, 'legacy-189');
    fs.mkdirSync(legacyDir, { recursive: true });
    const legacyRes = engine.applyDeepGameSmoothEngine({
      gameDir: legacyDir,
      loaderType: 'vanilla',
      mcVersion: '1.8.9',
      smoothProfile: 'esports'
    });
    assert.equal(legacyRes.ok, true, '1.8.9 applyDeepGameSmoothEngine must succeed');
    const legacyOpts = fs.readFileSync(path.join(legacyDir, 'options.txt'), 'utf8');
    assert.ok(legacyOpts.includes('useVbo:true'), '1.8.9 options.txt must set useVbo:true');
    assert.ok(legacyOpts.includes('fboEnable:true'), '1.8.9 options.txt must set fboEnable:true');
    assert.ok(!legacyOpts.includes('simulationDistance:'), '1.8.9 options.txt must omit simulationDistance');
    assert.ok(!legacyOpts.includes('syncChunkWrites:'), '1.8.9 options.txt must omit syncChunkWrites');

    // 11b. Modern 26.3 ultra_low + BadOptimizations tuning & clean 1-Click Revert
    const modernDir = path.join(tmpRoot, 'modern-263');
    const modernMods = path.join(modernDir, 'mods');
    fs.mkdirSync(modernMods, { recursive: true });
    fs.writeFileSync(path.join(modernMods, 'badoptimizations-2.2.jar'), 'mock-jar', 'utf8');

    const modernRes = engine.applyDeepGameSmoothEngine({
      gameDir: modernDir,
      loaderType: 'fabric',
      mcVersion: '26.3',
      smoothProfile: 'ultra_low'
    });
    assert.equal(modernRes.ok, true, '26.3 applyDeepGameSmoothEngine must succeed');

    const modernOpts = fs.readFileSync(path.join(modernDir, 'options.txt'), 'utf8');
    assert.ok(modernOpts.includes('menuBackgroundBlurriness:0'), '26.3 options.txt must set menuBackgroundBlurriness:0');

    const hzGfx = fs.readFileSync(path.join(modernDir, 'horizon-graphics.txt'), 'utf8');
    assert.ok(hzGfx.includes('lodDistance:16'), 'ultra_low horizon-graphics.txt must set lodDistance:16');
    assert.ok(hzGfx.includes('opaqueIce:true'), 'ultra_low horizon-graphics.txt must set opaqueIce:true');

    const badOptCfg = fs.readFileSync(path.join(modernDir, 'config', 'badoptimizations.txt'), 'utf8');
    assert.ok(
      badOptCfg.includes('enable_toast_optimizations=true'),
      'config/badoptimizations.txt must set enable_toast_optimizations=true'
    );

    const revertModern = engine.revertDeepGameSmoothEngine({ gameDir: modernDir });
    assert.equal(revertModern.ok, true, 'revertDeepGameSmoothEngine on 26.3 must succeed');
    for (const rel of ['options.txt', 'horizon-graphics.txt', 'config/badoptimizations.txt']) {
      assert.equal(
        fs.existsSync(path.join(modernDir, ...rel.split('/'))),
        false,
        `revertDeepGameSmoothEngine must cleanly remove newly created ${rel}`
      );
    }
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }

  // 11c. Smart Hybrid G1GC thread capping & -XX:+AlwaysPreTouch
  const g1Args = engine.buildMultiCoreSmoothExitArgs(16, 17, { totalMemGB: 16, allocatedRamGB: 4 });
  assert.ok(g1Args.includes('-XX:+AlwaysPreTouch'), '16GB system with 4GB heap must include -XX:+AlwaysPreTouch');
  const pgcFlag = g1Args.find((a) => a.startsWith('-XX:ParallelGCThreads='));
  assert.ok(pgcFlag, 'Java 17 G1GC args must specify -XX:ParallelGCThreads=');
  const pgcVal = Number(pgcFlag.split('=')[1]);
  assert.ok(Number.isFinite(pgcVal) && pgcVal >= 2 && pgcVal <= 11, `Expected ParallelGCThreads <= 11, got ${pgcFlag}`);

  // 11d. 120Hz Launcher Chromium GPU Zero-Copy & 1 FPS Gameplay Hibernation + CSS content-visibility
  const mainSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'main.js'), 'utf8');
  assert.ok(mainSrc.includes('enable-gpu-rasterization'), 'src/main.js must append enable-gpu-rasterization');
  assert.ok(mainSrc.includes('setFrameRate(1)'), 'src/main.js must drop minimized gameplay compositor to setFrameRate(1)');

  const glassCss = fs.readFileSync(path.join(REPO_ROOT, 'src', 'ui', 'horizon-glass.css'), 'utf8');
  assert.ok(glassCss.includes('content-visibility: auto'), 'src/ui/horizon-glass.css must enable content-visibility: auto');

  // 11e. Ultra-Light Rust Core: Win32 HeapCompact, mimalloc PURGE_DECOMMITS, 1 MiB worker stack & debuginfo strip
  const threadsLib = fs.readFileSync(
    path.join(REPO_ROOT, 'rust-engine', 'crates', 'horizon-threads', 'src', 'lib.rs'),
    'utf8'
  );
  assert.ok(threadsLib.includes('HeapCompact'), 'horizon-threads/src/lib.rs must include Win32 HeapCompact');
  assert.ok(threadsLib.includes('PURGE_DECOMMITS'), 'horizon-threads/src/lib.rs must configure mimalloc PURGE_DECOMMITS');

  const threadsJobs = fs.readFileSync(
    path.join(REPO_ROOT, 'rust-engine', 'crates', 'horizon-threads', 'src', 'jobs.rs'),
    'utf8'
  );
  assert.ok(
    threadsJobs.includes('.stack_size(1024 * 1024)'),
    'horizon-threads/src/jobs.rs must set 1 MiB worker stack_size(1024 * 1024)'
  );

  const cargoToml = fs.readFileSync(path.join(REPO_ROOT, 'rust-engine', 'Cargo.toml'), 'utf8');
  assert.ok(cargoToml.includes('strip = "debuginfo"'), 'rust-engine/Cargo.toml must strip debuginfo in release profile');
});

test('12. v42.4.1 PRO Instant <1s Rust Launch: zero-network warm ensureHorizonEnginePrepared, 0ms metadata probeHorizonLaunchApi & filtered extractZipSafely', async () => {
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
  const AdmZip = require('adm-zip');

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-v4241-test-'));
  try {
    const platSpec = engine.getHorizonPlatformSpec();
    const engineRoot = path.join(tmpRoot, 'horizon-engine', platSpec.dirName);
    const resDir = path.join(engineRoot, '.local', 'horizon-client', '26.3');
    fs.mkdirSync(resDir, { recursive: true });

    const clientPath = path.join(engineRoot, platSpec.clientBin);
    // Deliberately write non-executable dummy bytes so any spawn attempt would fail
    fs.writeFileSync(clientPath, 'NOT_AN_EXECUTABLE_DUMMY_BINARY', 'utf8');
    fs.writeFileSync(path.join(engineRoot, platSpec.prepareBin), 'dummy-prepare', 'utf8');
    fs.writeFileSync(path.join(engineRoot, 'research-lock.json'), JSON.stringify({ minecraft: { version: '26.3', java_major: 25 } }), 'utf8');
    fs.writeFileSync(path.join(engineRoot, 'blockway-rust-build.json'), JSON.stringify({
      engine: 'blockway-rust',
      commit: 'testcommit1234',
      nativeMultiVersion: true,
      cliFlag: '--mc-version'
    }), 'utf8');
    fs.writeFileSync(path.join(resDir, 'horizon-resources.json'), JSON.stringify({ ok: true }), 'utf8');

    // 12a. Warm ensureHorizonEnginePrepared returns in < 50ms with zero network requests
    const t0 = performance.now();
    const st = await engine.ensureHorizonEnginePrepared({ rootDir: tmpRoot });
    const prepMs = performance.now() - t0;
    assert.equal(st.engineInstalled, true);
    assert.equal(st.isPrepared, true);
    assert.ok(prepMs < 50, `Expected warm ensureHorizonEnginePrepared < 50ms, got ${prepMs.toFixed(2)}ms`);

    // 12b. Metadata probeHorizonLaunchApi returns in < 15ms without spawning horizon-client
    const t1 = performance.now();
    const apiInfo = engine.probeHorizonLaunchApi(clientPath);
    const probeMs = performance.now() - t1;
    assert.equal(apiInfo.ok, true);
    assert.equal(apiInfo.isBlockWayRust, true);
    assert.equal(apiInfo.supportsMcVersion, true);
    assert.ok(probeMs < 15, `Expected metadata probeHorizonLaunchApi < 15ms, got ${probeMs.toFixed(2)}ms`);

    // 12c. Filtered extractZipSafely skips crates/ while keeping runtime binaries & still enforces Zip-Slip
    const zip = new AdmZip();
    zip.addFile('horizon-windows-x64/horizon-client.exe', Buffer.from('runtime-bin'));
    zip.addFile('horizon-windows-x64/crates/foo.rs', Buffer.from('fn dev_only() {}'));
    const zipDest = path.join(tmpRoot, 'unzip-out');
    engine.extractZipSafely(zip, zipDest, {
      filterEntry: (cleanRel) => !/(^|\/)(crates|tools|exporters)\//i.test(cleanRel)
    });
    assert.equal(fs.existsSync(path.join(zipDest, 'horizon-windows-x64', 'horizon-client.exe')), true);
    assert.equal(fs.existsSync(path.join(zipDest, 'horizon-windows-x64', 'crates', 'foo.rs')), false);

    const evilZip = {
      getEntries: () => [
        { entryName: '../evil.txt', isDirectory: false, getData: () => Buffer.from('pwn') }
      ]
    };
    assert.throws(() => {
      engine.extractZipSafely(evilZip, zipDest, { filterEntry: () => true });
    }, /Zip-Slip/i);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('13. v42.5.0 PRO Hybrid U-Series Worker Unlock, Battery Unthrottling & Isolated Rust 26.3 Saves', async () => {
  const zlib = require('node:zlib');
  const AdmZip = require('adm-zip');
  const engine = require('../src/launcher-engine');
  const worldCreator = require('../src/world-creator');
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-v425-'));
  try {
    // 13a. Hybrid U-series worker budget (Core 7 150U 12T -> 9, 8T -> 6, 4T -> 3)
    assert.equal(engine.computeOptimalHorizonWorkers(12), 9);
    assert.equal(engine.computeOptimalHorizonWorkers(8), 6);
    assert.equal(engine.computeOptimalHorizonWorkers(4), 3);

    // 13b. No synchronous PowerShell EmptyWorkingSet trim stall left in launcher-engine.js
    const engineSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'launcher-engine.js'), 'utf8');
    assert.equal(engineSrc.includes('EmptyWorkingSet'), false);

    // 13c. applyDeepGameSmoothEngine clears batteryMode & unlocks workers even with gentleMode:true, and reverts cleanly
    const gfxPath = path.join(tmpRoot, 'horizon-graphics.txt');
    fs.writeFileSync(gfxPath, 'batteryMode:true\nworkers:3\n', 'utf8');
    const smoothRes = engine.applyDeepGameSmoothEngine({
      gameDir: tmpRoot,
      loaderType: 'horizon',
      mcVersion: '26.3',
      cpuCores: 12,
      gentleMode: true
    });
    assert.equal(smoothRes.ok, true);
    const tunedGfx = fs.readFileSync(gfxPath, 'utf8');
    assert.match(tunedGfx, /^batteryMode:false$/m);
    assert.match(tunedGfx, /^workers:9$/m);

    const revRes = engine.revertDeepGameSmoothEngine({ gameDir: tmpRoot });
    assert.equal(revRes.ok, true);
    const revertedGfx = fs.readFileSync(gfxPath, 'utf8');
    assert.match(revertedGfx, /^batteryMode:true$/m);
    assert.match(revertedGfx, /^workers:3$/m);

    // 13d. createQuickWorld writes truthful 26.3/5023 metadata even if displayMcVersion is 1.21.11
    const mockJarDir = path.join(tmpRoot, 'versions', '26.3');
    fs.mkdirSync(mockJarDir, { recursive: true });
    const mockJarZip = new AdmZip();
    mockJarZip.addFile(
      'version.json',
      Buffer.from(JSON.stringify({
        id: '26.3',
        name: '26.3',
        world_version: 5023,
        series_id: 'main',
        pack_version: { resource: 75, data: 101 },
        stable: true
      }), 'utf8')
    );
    mockJarZip.addFile(
      'data/minecraft/worldgen/world_preset/normal.json',
      Buffer.from(JSON.stringify({
        dimensions: {
          'minecraft:overworld': {
            type: 'minecraft:overworld',
            generator: {
              type: 'minecraft:noise',
              settings: 'minecraft:overworld',
              biome_source: { type: 'minecraft:multi_noise', preset: 'minecraft:overworld' }
            }
          }
        }
      }), 'utf8')
    );
    mockJarZip.writeZip(path.join(mockJarDir, '26.3.jar'));

    const qwGameDir = path.join(tmpRoot, 'qw-game');
    const qw = await worldCreator.createQuickWorld({
      rootDir: tmpRoot,
      gameDirectory: qwGameDir,
      mcVersion: '26.3',
      displayMcVersion: '1.21.11',
      loaderType: 'horizon',
      levelName: 'Test Rust 26.3'
    });
    assert.equal(qw.ok, true, qw.error || 'createQuickWorld failed');
    const qwInspected = worldCreator.inspectWorldNbt(path.join(qwGameDir, 'saves', qw.folderName));
    assert.equal(qwInspected.dataVersion, 5023);
    assert.equal(qwInspected.versionId, 5023);
    assert.equal(qwInspected.mcVersion, '1.21.11');

    const qwVanilla = await worldCreator.createQuickWorld({
      rootDir: tmpRoot,
      gameDirectory: qwGameDir,
      mcVersion: '26.3',
      displayMcVersion: '1.21.11',
      loaderType: 'vanilla',
      levelName: 'Test Vanilla 26.3'
    });
    assert.equal(qwVanilla.ok, true, qwVanilla.error || 'createQuickWorld vanilla failed');
    const qwVanillaInspected = worldCreator.inspectWorldNbt(path.join(qwGameDir, 'saves', qwVanilla.folderName));
    assert.equal(qwVanillaInspected.dataVersion, 5023);
    assert.equal(qwVanillaInspected.versionId, 5023);
    assert.equal(qwVanillaInspected.mcVersion, '26.3');

    // 13e. ensureHorizonRustWorkspace migrates mismatched Rust saves (5023/4671) into horizon-rust/saves & leaves genuine 1.21.11 (4671/4671) untouched
    const wsRoot = path.join(tmpRoot, 'ws-root');
    const { writeNbtRoot, nbt } = worldCreator._internal;
    const writeDummyLevelDat = (dir, { dataVersion, versionId, versionName, levelName }) => {
      fs.mkdirSync(dir, { recursive: true });
      const raw = writeNbtRoot(nbt.compound({
        Data: nbt.compound({
          DataVersion: nbt.int(dataVersion),
          Version: nbt.compound({
            Id: nbt.int(versionId),
            Name: nbt.string(versionName),
            Series: nbt.string('main'),
            Snapshot: nbt.byte(0)
          }),
          LevelName: nbt.string(levelName)
        })
      }));
      fs.writeFileSync(path.join(dir, 'level.dat'), zlib.gzipSync(raw));
    };

    writeDummyLevelDat(path.join(wsRoot, 'saves', 'RustMismatched'), {
      dataVersion: 5023,
      versionId: 4671,
      versionName: '1.21.11',
      levelName: 'Mismatched Rust Map'
    });
    writeDummyLevelDat(path.join(wsRoot, 'saves', 'Java12111'), {
      dataVersion: 4671,
      versionId: 4671,
      versionName: '1.21.11',
      levelName: 'Real Java 1.21.11'
    });

    const rustWs = engine.ensureHorizonRustWorkspace(wsRoot);
    assert.equal(rustWs, path.join(wsRoot, 'horizon-rust'));
    assert.equal(fs.existsSync(path.join(rustWs, 'saves', 'RustMismatched', 'level.dat')), true);
    assert.equal(fs.existsSync(path.join(wsRoot, 'saves', 'RustMismatched')), false);
    assert.equal(fs.existsSync(path.join(wsRoot, 'saves', 'Java12111', 'level.dat')), true);
    assert.equal(fs.existsSync(path.join(rustWs, 'saves', 'Java12111')), false);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('14. v42.5.1 PRO Instant 0ms Cached Microsoft Token, Non-Blocking Rust Singleplayer Refresh & Fast Workspace Cache', async () => {
  const engine = require('../src/launcher-engine');
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-v4251-'));
  try {
    // 14a. Token freshness checks
    const validProfile = {
      name: 'Deadnated1',
      uuid: 'db646d57-90e6-47b5-8183-95e9127ff0fc',
      isOfficialLicense: true,
      accessToken: 'fresh_token_abc',
      refreshToken: 'refresh_token_xyz',
      expiresAt: Date.now() + 20 * 60 * 1000
    };
    const expiredProfile = {
      ...validProfile,
      accessToken: 'stale_token_old',
      expiresAt: Date.now() - 10 * 1000
    };
    const legacyExpiredProfile = {
      ...validProfile,
      accessToken: 'stale_token_1793',
      expiresAt: 1793706953217
    };
    assert.equal(engine.isMicrosoftTokenFresh(validProfile), true);
    assert.equal(engine.isMicrosoftTokenFresh(expiredProfile), false);
    assert.equal(engine.isMicrosoftTokenFresh(legacyExpiredProfile), false);

    // 14b. Fresh token returns immediately (< 5ms) with zero network refresh
    const t0 = performance.now();
    const resFresh = await engine.resolveMicrosoftLaunchProfile(validProfile, {
      requireOnlineSession: true,
      refreshFn: () => {
        throw new Error('must not call network for fresh token');
      }
    });
    const freshMs = performance.now() - t0;
    assert.equal(resFresh, validProfile);
    assert.ok(freshMs < 5, `Expected fresh token check < 5ms, got ${freshMs.toFixed(2)}ms`);

    // 14c. Stale token during Rust singleplayer does not block launch & completes background refresh asynchronously
    const expectedRefreshed = {
      ...expiredProfile,
      accessToken: 'refreshed_token_new',
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    };
    let onRefreshedCalledWith = null;
    const t1 = performance.now();
    const resNonBlocking = await engine.resolveMicrosoftLaunchProfile(expiredProfile, {
      requireOnlineSession: false,
      refreshFn: () => new Promise((resolve) => setTimeout(() => resolve(expectedRefreshed), 80)),
      onRefreshed: (fresh) => {
        onRefreshedCalledWith = fresh;
      }
    });
    const nonBlockMs = performance.now() - t1;
    assert.equal(resNonBlocking, expiredProfile);
    assert.ok(nonBlockMs < 15, `Expected non-blocking Rust singleplayer auth < 15ms, got ${nonBlockMs.toFixed(2)}ms`);
    assert.equal(onRefreshedCalledWith, null, 'Background refresh should still be in-flight right after launch return');
    await new Promise((resolve) => setTimeout(resolve, 130));
    assert.deepEqual(onRefreshedCalledWith, expectedRefreshed);

    // 14d. ensureHorizonRustWorkspace seeds .horizon-cache & caches repeated calls (< 5ms)
    const cacheSrcDir = path.join(tmpRoot, '.horizon-cache');
    fs.mkdirSync(cacheSrcDir, { recursive: true });
    fs.writeFileSync(path.join(cacheSrcDir, 'registry-v1.bin'), Buffer.from('warm-cache-bytes'));
    const rustWs1 = engine.ensureHorizonRustWorkspace(tmpRoot);
    assert.equal(fs.existsSync(path.join(rustWs1, '.horizon-cache', 'registry-v1.bin')), true);

    const t2 = performance.now();
    const rustWs2 = engine.ensureHorizonRustWorkspace(tmpRoot);
    const warmWsMs = performance.now() - t2;
    assert.equal(rustWs2, rustWs1);
    assert.ok(warmWsMs < 5, `Expected warm ensureHorizonRustWorkspace < 5ms, got ${warmWsMs.toFixed(2)}ms`);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('15. v42.6.0 PRO Final Release Polish: Sidebar Rust Core Status, Modern Dependencies & README Sync', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  const html = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/index.html'), 'utf8');
  const preloadSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/preload.js'), 'utf8');
  const mainSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/main.js'), 'utf8');
  const readme = fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8');

  // 15a. Upgraded dependencies in package.json
  const parseMajor = (spec) => Number(String(spec || '').replace(/^[^\d]*/, '').split('.')[0]) || 0;
  assert.ok(String(pkg.dependencies['adm-zip'] || '').includes('0.6'), 'adm-zip should be on 0.6.x');
  assert.ok(String(pkg.dependencies['minecraft-launcher-core'] || '').includes('3.18'), 'minecraft-launcher-core should be on 3.18.x');
  assert.ok(parseMajor(pkg.devDependencies.electron) >= 40, `Expected Electron >= 40, got ${pkg.devDependencies.electron}`);
  assert.ok(parseMajor(pkg.devDependencies['electron-builder']) >= 26, `Expected electron-builder >= 26, got ${pkg.devDependencies['electron-builder']}`);

  // 15b. Live Rust Core sidebar status badge & IPC event hook
  assert.ok(html.includes('id="btnSidebarRustStatus"'), 'index.html must include sidebar Rust Core status button');
  assert.ok(html.includes('id="sidebarRustVer"'), 'index.html must include sidebar Rust Core version badge');
  assert.ok(preloadSrc.includes('onHorizonUpgraded'), 'preload.js must expose onHorizonUpgraded');
  assert.ok(mainSrc.includes("'horizon:upgraded'"), 'main.js must emit horizon:upgraded when background core update finishes');

  // 15c. README stays synced with package.json version
  assert.ok(readme.includes(`BlockWay Launcher v${pkg.version} PRO`), `README.md must reflect v${pkg.version} PRO`);
});

test('16. v42.6.2 PRO Legacy OTA Self-Healing & Zero-Snap Horizontal Drag/Wheel/Chevron Tab Scroll', () => {
  const mainSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/main.js'), 'utf8');
  const html = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/index.html'), 'utf8');
  const rendererSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/renderer.js'), 'utf8');
  const glassCss = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/horizon-glass.css'), 'utf8');
  const glassJs = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/horizon-glass.js'), 'utf8');

  // 16a. Legacy pre-v41.8.0 OTA self-heal & missing UI asset detection
  for (const sym of [
    'CRITICAL_OTA_UI_FILES',
    'isWritableUnpackedAppRoot',
    'findMissingCriticalOtaAssets',
    'autoRepairMissingOtaAssets',
    'repairMissingAssets'
  ]) {
    assert.ok(mainSrc.includes(sym), `src/main.js must include ${sym}`);
  }
  assert.ok(mainSrc.includes("'src/ui/horizon-glass.css'"), 'src/main.js must guard src/ui/horizon-glass.css');
  assert.ok(mainSrc.includes("'src/ui/horizon-glass.js'"), 'src/main.js must guard src/ui/horizon-glass.js');
  assert.ok(rendererSrc.includes('repairMissingAssets'), 'src/ui/renderer.js must handle repairMissingAssets prompt');

  // 16b. Draggable, wheel-scrollable & chevron-navigable horizontal tab strips without MutationObserver snap-back
  assert.ok(html.includes('class="hzl-top-nav-shell"'), 'index.html must wrap top nav in .hzl-top-nav-shell');
  assert.ok(html.includes('id="btnTopNavScrollLeft"'), 'index.html must include #btnTopNavScrollLeft');
  assert.ok(html.includes('id="btnTopNavScrollRight"'), 'index.html must include #btnTopNavScrollRight');
  for (const sym of [
    'enableHorizontalStripScroll',
    "'wheel'",
    "'pointerdown'",
    "'pointermove'",
    'hzl-is-dragging',
    'lastActiveTopTab',
    'syncScrollArrows',
    'hzlHomeTabbedStrip'
  ]) {
    assert.ok(glassJs.includes(sym), `src/ui/horizon-glass.js must include ${sym}`);
  }
  assert.ok(glassCss.includes('.hzl-top-nav-shell'), 'horizon-glass.css must style .hzl-top-nav-shell');
  assert.ok(glassCss.includes('.hzl-nav-scroll-btn'), 'horizon-glass.css must style .hzl-nav-scroll-btn');
  assert.ok(glassCss.includes('-webkit-app-region: no-drag !important'), 'horizon-glass.css must enforce no-drag on top nav strip');
  assert.ok(glassCss.includes('.hzl-is-dragging'), 'horizon-glass.css must style .hzl-is-dragging grab feedback');
  assert.ok(glassCss.includes('cursor: grabbing !important'), 'horizon-glass.css must show grabbing cursor while dragging tabs');
});

test('17. v42.6.3 PRO Rail Top-Nav Protection, 2-Col Skin Studio, Stable 3D Framing & Local PNG Skin Upload', () => {
  const layoutCss = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/layout-v33.css'), 'utf8');
  const glassCss = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/horizon-glass.css'), 'utf8');
  const html = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/index.html'), 'utf8');
  const rendererSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/renderer.js'), 'utf8');
  const preloadSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/preload.js'), 'utf8');
  const mainSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/main.js'), 'utf8');
  const engine = require('../src/launcher-engine');

  // 17a. Rail mode must never hide top navigation spans or squish top nav pills
  assert.equal(
    /html\[data-ui-sidebar="rail"\]\s+\.sidebar-nav\b/.test(layoutCss),
    false,
    'layout-v33.css must scope rail .sidebar-nav rules to .sidebar'
  );
  assert.ok(
    layoutCss.includes('html[data-ui-sidebar="rail"] .sidebar .sidebar-nav .nav-item span'),
    'layout-v33.css must scope rail .nav-item span hiding to .sidebar'
  );
  assert.equal(
    /#tab-skin\s+\.wtab-panel\.hidden\s*\{/.test(layoutCss),
    false,
    'layout-v33.css must not hide #tab-skin .wtab-panel sections'
  );
  assert.ok(
    glassCss.includes('html:root:root[data-ui-sidebar="rail"]') && glassCss.includes('.hzl-top-nav-strip .nav-item span'),
    'horizon-glass.css must protect .hzl-top-nav-strip .nav-item span in rail mode'
  );

  // 17b. 2-col Skin Studio layout & all 3 wardrobe panels visible with prominent upload + drop overlay
  assert.ok(glassCss.includes('#tab-skin .skin-studio-page-grid'), 'horizon-glass.css must define #tab-skin 2-col grid');
  assert.ok(glassCss.includes('@media (max-width: 780px)'), 'horizon-glass.css must keep #tab-skin 2-col down to 780px');
  assert.ok(glassCss.includes('.hzl-skin-upload-primary'), 'horizon-glass.css must style .hzl-skin-upload-primary');
  assert.ok(glassCss.includes('.hzl-skin-drop-overlay'), 'horizon-glass.css must style .hzl-skin-drop-overlay');

  assert.ok(html.includes('id="skinDropOverlay"'), 'index.html must include #skinDropOverlay');
  assert.ok(html.includes('id="btnUploadSkinPng"'), 'index.html must include #btnUploadSkinPng');
  assert.ok(/<div class="wtab-panel active" id="wtab-skin">/.test(html), '#wtab-skin must be visible (not hidden)');
  assert.ok(/<div class="wtab-panel active" id="wtab-cape">/.test(html), '#wtab-cape must be visible (not hidden)');

  // 17c. Stable 3D character framing & local PNG upload + dataUrl save path
  for (const sym of ['resizeAndFrame3DSkinViewer', 'enableZoom = false', 'applyUploadedLocalSkinDataUrl', 'saveLocalSkinDataUrl']) {
    assert.ok(rendererSrc.includes(sym), `src/ui/renderer.js must include ${sym}`);
  }
  assert.ok(preloadSrc.includes('saveLocalSkinDataUrl'), 'src/preload.js must expose saveLocalSkinDataUrl');
  assert.ok(mainSrc.includes('saveCustomLocalSkinDataUrl'), 'src/main.js must wire saveCustomLocalSkinDataUrl');

  // 17d. Unit test saveCustomLocalSkinDataUrl PNG validation & write
  const tmpSkinDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-v4263-skin-'));
  try {
    const fakeValidPng = Buffer.alloc(96, 0);
    fakeValidPng[0] = 0x89;
    fakeValidPng[1] = 0x50;
    fakeValidPng[2] = 0x4e;
    fakeValidPng[3] = 0x47;
    fakeValidPng[4] = 0x0d;
    fakeValidPng[5] = 0x0a;
    fakeValidPng[6] = 0x1a;
    fakeValidPng[7] = 0x0a;
    const validRes = engine.saveCustomLocalSkinDataUrl(
      tmpSkinDir,
      'TestUser',
      `data:image/png;base64,${fakeValidPng.toString('base64')}`
    );
    assert.equal(validRes.ok, true);
    assert.equal(
      fs.existsSync(path.join(tmpSkinDir, 'CustomSkinLoader', 'LocalSkin', 'skins', 'TestUser.png')),
      true,
      'saveCustomLocalSkinDataUrl must write validated PNG into LocalSkin/skins/TestUser.png'
    );
    assert.throws(
      () => engine.saveCustomLocalSkinDataUrl(tmpSkinDir, 'TestUser', 'data:image/png;base64,bm90LXBuZw=='),
      /PNG/i,
      'saveCustomLocalSkinDataUrl must reject non-PNG header bytes'
    );
  } finally {
    fs.rmSync(tmpSkinDir, { recursive: true, force: true });
  }
});

test('18. v42.7.0 PRO Full-App Audit Fixes: Engine, Security, Auth, IPC & Zero-Clip Horizon UI', () => {
  const engineSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/launcher-engine.js'), 'utf8');
  const mainSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/main.js'), 'utf8');
  const worldCreatorSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/world-creator.js'), 'utf8');
  const authSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/microsoft-auth.js'), 'utf8');
  const storeFeaturesSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/store-features.js'), 'utf8');
  const rendererSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/renderer.js'), 'utf8');
  const glassJsSrc = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/horizon-glass.js'), 'utf8');
  const layoutCss = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/layout-v33.css'), 'utf8');
  const glassCss = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/horizon-glass.css'), 'utf8');
  const html = fs.readFileSync(path.join(REPO_ROOT, 'src/ui/index.html'), 'utf8');
  const engine = require('../src/launcher-engine');
  const AdmZip = require('adm-zip');

  // 18a. Backend launcher engine fixes
  for (const sym of [
    'fetchJson(url, redirectsLeft = 6)',
    'url: v.url',
    'await getRequiredJavaMajor',
    "child.on('error'",
    'INSTANCE_META_FILE',
    '.horizon-session-',
    "proc.on('error'",
    'safeModFilename',
    'safeZipName'
  ]) {
    assert.ok(engineSrc.includes(sym), `src/launcher-engine.js must include ${sym}`);
  }
  assert.ok(
    /function fetchBufferHttps\([^)]*redirectsLeft = 6/.test(engineSrc),
    'src/launcher-engine.js fetchBufferHttps must enforce redirectsLeft = 6'
  );

  // 18b. Unit test backupLocalWorld traversal guard & importWorldZip sandboxed extraction
  const tmpWorldDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-v4270-world-'));
  try {
    assert.throws(
      () => engine.backupLocalWorld(tmpWorldDir, '../outside'),
      'backupLocalWorld must block path traversal outside saves/'
    );
    const zip = new AdmZip();
    zip.addFile('world/level.dat', Buffer.from('blockway-world-test'));
    zip.addFile('../escaped.txt', Buffer.from('should-not-escape'));
    const zipPath = path.join(tmpWorldDir, 'SampleWorld.zip');
    zip.writeZip(zipPath);
    const importRes = engine.importWorldZip(tmpWorldDir, zipPath);
    assert.equal(importRes.ok, true);
    const savesRoot = path.resolve(tmpWorldDir, 'saves');
    assert.ok(
      path.resolve(importRes.worldPath).startsWith(savesRoot + path.sep),
      'importWorldZip must extract strictly inside saves/'
    );
    assert.equal(fs.existsSync(path.join(tmpWorldDir, 'escaped.txt')), false, 'Zip traversal must never escape tmpDir');
    assert.equal(fs.existsSync(path.join(savesRoot, 'escaped.txt')), false, 'Zip traversal must never escape world folder');
  } finally {
    fs.rmSync(tmpWorldDir, { recursive: true, force: true });
  }

  // 18c. Main IPC, concurrency, CurseForge lazy load & updater semver gating
  for (const sym of [
    'if (mcGameRunning)',
    'clearPlaytimeTimer',
    'acquiredLock',
    'compareSemver(relVer, latestVersion) >= 0',
    '_cfKeyApplied'
  ]) {
    assert.ok(mainSrc.includes(sym), `src/main.js must include ${sym}`);
  }
  assert.equal(
    /^loadCurseForgeKeyFromDisk\s*\(/m.test(mainSrc),
    false,
    'src/main.js must not execute loadCurseForgeKeyFromDisk() unconditionally at top-level'
  );

  // 18d. World creator & Microsoft Auth fixes
  assert.ok(worldCreatorSrc.includes("'blockway-rust'"), 'src/world-creator.js must include blockway-rust unmodded check');
  assert.ok(worldCreatorSrc.includes("'file/blockway-rules'"), 'src/world-creator.js must manage file/blockway-rules cleanup');
  for (const sym of [
    'crypto.randomInt(100000, 1000000)',
    "server.once('error'",
    'activeAuthAbort',
    'activeBrowserAbort'
  ]) {
    assert.ok(authSrc.includes(sym), `src/microsoft-auth.js must include ${sym}`);
  }

  // 18e. Frontend JS guards & DOM ID alignment
  assert.ok(storeFeaturesSrc.includes('formatWorldLastPlayed'), 'store-features.js must define formatWorldLastPlayed');
  assert.equal(
    /getElementById\(['"]username['"]\)/.test(storeFeaturesSrc),
    false,
    'store-features.js must use usernameInput instead of missing username element'
  );
  assert.ok(storeFeaturesSrc.includes('usernameInput'), 'store-features.js must reference usernameInput');
  assert.ok(storeFeaturesSrc.includes('cleanName'), 'store-features.js must safely guard cleanName');
  assert.ok(rendererSrc.includes("typeof uuid === 'string'"), 'renderer.js must guard uuid type in updateCrackUuidPreview');
  assert.ok(glassJsSrc.includes('modTargetInstanceSelect'), 'horizon-glass.js must reference modTargetInstanceSelect');
  assert.equal(glassJsSrc.includes('modTargetPackSelect'), false, 'horizon-glass.js must not reference stale modTargetPackSelect');

  // 18f. CSS & HTML polish (zero stale theme selectors, Section 12 zero-clip rules, clean Tools header)
  assert.equal(/\.theme-(?:prism|sakura)\b/.test(layoutCss), false, 'layout-v33.css must not use stale .theme-prism/.theme-sakura selectors');
  for (const cssRule of [
    '#homeRightSkinSlot .stage-ctrl-btn',
    '#tab-play .version-selectors-row .vtype-btn',
    '.mods-cat-primary-chips',
    '.soi-side-action'
  ]) {
    assert.ok(glassCss.includes(cssRule), `horizon-glass.css must include v42.7.0 rule: ${cssRule}`);
  }
  assert.equal(html.includes('giữ nút cho JS'), false, 'index.html #tab-tools subtitle must not expose internal DOM note');
  assert.equal(html.includes('0% GPU'), false, 'index.html must not contain unverified 0% GPU text');
  assert.equal(html.includes('260 FPS • 0ms'), false, 'index.html must not contain unverified 260 FPS • 0ms text');
});
