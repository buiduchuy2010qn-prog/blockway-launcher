/* ============================================================================
   BlockWay Launcher v42.1 PRO — Pure Horizon Glass Runtime
   - Calm Horizon starry cosmos + low twilight horizon glow (zero mid-screen clutter)
   - Dynamic 16px concave fillet clip-path for Home TabbedPanel
   - Left Frosted Sidebar 8-Core Rail <-> Core Loader Engine sync
   - Hero 56px Action Row + Quick Server / Co-op Invite Join pill
   - 2-Column Mod Store Horizontal Glass Rows + Sticky Detail Inspector
   - CSP-safe global <img> fallback guard
   ============================================================================ */
(function initHorizonGlassUI() {
  'use strict';

  const FALLBACK_MOD_ICON =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTQiIGZpbGw9IiM2YjRiZmYiLz48cGF0aCBkPSJNMzIgMTZsMTQgOHYxNmwtMTQgOC0xNC04VjI0eiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjMuNSIvPjwvc3ZnPg==';

  // 1. CSP-safe global image fallback (zero broken image icons)
  document.addEventListener(
    'error',
    (ev) => {
      const el = ev.target;
      if (el && el.tagName === 'IMG' && !el.dataset.hzlFallbackApplied) {
        el.dataset.hzlFallbackApplied = '1';
        el.src = FALLBACK_MOD_ICON;
      }
    },
    true
  );

  // 2. Authentic Calm Horizon Starry Night + Low Twilight Glow Canvas
  //    Upper ~76% is deep calm cosmos for crystal-clear glass legibility;
  //    Lower ~24% blooms into warm Horizon violet-amber twilight + low silhouettes.
  const SCENE_PALETTES = {
    horizon: {
      sky: [
        0x090914, 0x0b0a18, 0x0e0d1e, 0x121026, 0x16132e,
        0x1b1636, 0x22193f, 0x2c1d49, 0x3b2254, 0x52295f,
        0x6e3266, 0x8e3e68, 0xb05166, 0xce6a62, 0xe48663
      ],
      bloom: [242, 148, 108, 0.24],
      ridges: ['#231236', '#140a22'],
      stars: true
    },
    sakura: {
      sky: [
        0xdbe6fb, 0xe1e4fa, 0xe8e3f9, 0xefe2f6, 0xf5e2f2,
        0xfae3ed, 0xfde5e8, 0xffe8e4, 0xffebe1, 0xffefe0,
        0xfff2e1, 0xfff5e4, 0xfff8e9, 0xfffaef, 0xfffdf6
      ],
      bloom: [244, 114, 182, 0.20],
      ridges: ['#dfb2cc', '#c68eb0'],
      stars: false
    },
    prism: {
      sky: [
        0xd4e4fb, 0xdbe9fc, 0xe2eefc, 0xe9f2fd, 0xeff6fe,
        0xf4f9ff, 0xf7fbff, 0xf9fcff, 0xfbfdff, 0xfcfeff,
        0xfdfeff, 0xfeffff, 0xffffff, 0xffffff, 0xffffff
      ],
      bloom: [96, 165, 250, 0.18],
      ridges: ['#b6cde8', '#93b4da'],
      stars: false
    },
    lunar: {
      sky: [
        0x060913, 0x080d1b, 0x0b1224, 0x0e1830, 0x12203d,
        0x16284b, 0x1b325a, 0x213d6b, 0x29497d, 0x32578f,
        0x3d66a0, 0x4b77b0, 0x5b89be, 0x6e9bcb, 0x82add7
      ],
      bloom: [59, 130, 246, 0.20],
      ridges: ['#132342', '#0a1326'],
      stars: true
    },
    rust: {
      sky: [
        0x0d0809, 0x120a0b, 0x180d0d, 0x20100f, 0x2a1412,
        0x371915, 0x482018, 0x5d281c, 0x763320, 0x924025,
        0xae502b, 0xc96334, 0xdf783f, 0xee8e4e, 0xf7a460
      ],
      bloom: [249, 115, 22, 0.22],
      ridges: ['#29120e', '#160907'],
      stars: true
    },
    mojang: {
      sky: [
        0x060e0b, 0x08130f, 0x0b1914, 0x0e201a, 0x122820,
        0x163127, 0x1b3c30, 0x224839, 0x2a5644, 0x346651,
        0x3f785f, 0x4d8b6f, 0x5d9e80, 0x70b192, 0x85c4a5
      ],
      bloom: [16, 185, 129, 0.20],
      ridges: ['#112b21', '#091712'],
      stars: true
    },
    feather: {
      sky: [
        0x050c14, 0x07111d, 0x0a1726, 0x0d1e31, 0x11263d,
        0x152f4b, 0x1a395a, 0x20456b, 0x28537d, 0x316290,
        0x3c73a3, 0x4985b5, 0x5998c6, 0x6baad6, 0x80bce4
      ],
      bloom: [14, 165, 233, 0.20],
      ridges: ['#102940', '#081624'],
      stars: true
    },
    cherry: {
      sky: [
        0x0d0710, 0x120917, 0x180c1f, 0x201029, 0x291434,
        0x341941, 0x421f50, 0x542761, 0x6a3173, 0x833d86,
        0x9d4c99, 0xb75ead, 0xcf72bf, 0xe288d0, 0xef9fdf
      ],
      bloom: [236, 72, 153, 0.22],
      ridges: ['#2a1029', '#160816'],
      stars: true
    }
  };
  SCENE_PALETTES.modrinth = SCENE_PALETTES.mojang;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash1D(x, seed) {
    let h = Math.imul(x ^ seed, 0x27d4eb2d);
    h = (h ^ (h >>> 15)) >>> 0;
    return (h & 0xffff) / 0xffff;
  }

  function valueNoise1D(x, seed) {
    const xi = Math.floor(x);
    const xf = x - xi;
    const u = xf * xf * (3 - 2 * xf);
    return hash1D(xi, seed) * (1 - u) + hash1D(xi + 1, seed) * u;
  }

  function fbm1D(x, seed) {
    let v = 0;
    let amp = 0.5;
    let freq = 1;
    for (let i = 0; i < 4; i++) {
      v += amp * valueNoise1D(x * freq, seed + i * 97);
      freq *= 2.03;
      amp *= 0.5;
    }
    return v;
  }

  function hexToRgb(hexInt) {
    return [(hexInt >> 16) & 255, (hexInt >> 8) & 255, hexInt & 255];
  }

  function lerpRgb(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }

  function drawHorizonScene() {
    const canvas = document.getElementById('hzlSceneCanvas');
    if (!canvas || document.hidden) return;
    const theme = document.documentElement.getAttribute('data-theme') || 'horizon';
    const pal = SCENE_PALETTES[theme] || SCENE_PALETTES.horizon;

    const vw = Math.max(320, window.innerWidth || 1280);
    const vh = Math.max(240, window.innerHeight || 760);
    const pxScale = 3;
    const pw = Math.ceil(vw / pxScale);
    const ph = Math.ceil(vh / pxScale);

    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    // 2a. Non-linear sky curve: keep top ~74% calm deep cosmos, bloom sunset near bottom
    const stops = pal.sky.map(hexToRgb);
    for (let y = 0; y < ph; y++) {
      const linearT = y / Math.max(1, ph - 1);
      const curvedT = Math.pow(linearT, 2.05);
      const pos = curvedT * (stops.length - 1);
      const idx = Math.min(stops.length - 2, Math.floor(pos));
      const c = lerpRgb(stops[idx], stops[idx + 1], pos - idx);
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fillRect(0, y, pw, 1);
    }

    // 2b. Subtle crisp starfield across upper cosmos (exact Horizon night feel)
    const rng = mulberry32(19);
    if (pal.stars) {
      for (let i = 0; i < 88; i++) {
        const sx = Math.floor(rng() * pw);
        const sy = Math.floor(rng() * ph * 0.68);
        const alpha = (0.14 + rng() * 0.48).toFixed(2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(sx, sy, 1, 1);
      }
    }

    // 2c. Soft low horizon twilight glow (peeks gently behind frosted bottom edges)
    const glowX = Math.floor(pw * 0.68);
    const glowY = Math.floor(ph * 0.90);
    const glowR = Math.max(40, Math.floor(pw * 0.36));
    const grad = ctx.createRadialGradient(glowX, glowY, 4, glowX, glowY, glowR);
    grad.addColorStop(0, `rgba(${pal.bloom[0]},${pal.bloom[1]},${pal.bloom[2]},${pal.bloom[3]})`);
    grad.addColorStop(1, `rgba(${pal.bloom[0]},${pal.bloom[1]},${pal.bloom[2]},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, Math.floor(ph * 0.50), pw, Math.ceil(ph * 0.50));

    // 2d. Subtle distant low horizon silhouettes in bottom ~11% only
    const ridgeDefs = [
      { base: 0.90, amp: 0.06, freq: 3.4, seed: 17, color: pal.ridges[0] },
      { base: 0.95, amp: 0.04, freq: 5.1, seed: 41, color: pal.ridges[1] }
    ];
    for (const r of ridgeDefs) {
      ctx.fillStyle = r.color;
      for (let x = 0; x < pw; x++) {
        const nx = (x / pw) * r.freq;
        const h = fbm1D(nx, r.seed);
        const topY = Math.floor(ph * (r.base - (h - 0.35) * r.amp));
        ctx.fillRect(x, topY, 1, ph - topY);
      }
    }
  }

  // 3. Exact 16px Concave Fillet Notched TabbedPanel Path
  function updateTabbedPanelNotch() {
    const panel = document.getElementById('hzlHomeTabbedPanel');
    const tabs = document.getElementById('hzlHomeTabbedStrip');
    if (!panel || !tabs) return;
    const W = Math.round(panel.offsetWidth);
    const H = Math.round(panel.offsetHeight);
    const tw = Math.min(W - 44, Math.max(160, Math.round(tabs.offsetWidth)));
    const th = Math.round(tabs.offsetHeight) || 44;
    if (W < 240 || H < 90) {
      panel.style.clipPath = '';
      return;
    }
    const r = 20;
    const rt = 14;
    const rf = 16; // Horizon's signature 16px concave inward fillet
    const d = [
      `M ${r},0`,
      `L ${tw - rt},0`,
      `Q ${tw},0 ${tw},${rt}`,
      `L ${tw},${th - rf}`,
      `Q ${tw},${th} ${tw + rf},${th}`,
      `L ${W - r},${th}`,
      `Q ${W},${th} ${W},${th + r}`,
      `L ${W},${H - r}`,
      `Q ${W},${H} ${W - r},${H}`,
      `L ${r},${H}`,
      `Q 0,${H} 0,${H - r}`,
      `L 0,${r}`,
      `Q 0,0 ${r},0`,
      'Z'
    ].join(' ');
    panel.style.clipPath = `path('${d}')`;
  }

  // 4. Home Sub-Tabs, Edition Switch, Hero Display Title & Left 8-Core Rail Sync
  let lastJavaCore = 'fabric';

  function syncSidebarCoreIcons() {
    document.querySelectorAll('img[data-sync-core-icon]').forEach((img) => {
      const key = img.getAttribute('data-sync-core-icon');
      const srcImg = document.querySelector(`.core-tab-btn[data-core="${key}"] img.core-svg-icon`);
      if (srcImg && srcImg.src) {
        img.src = srcImg.src;
      }
    });
  }

  function activateHomeSubTab(paneKey) {
    document.querySelectorAll('[data-hzl-pane]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.hzlPane === paneKey);
    });
    document.querySelectorAll('.hzl-tp-pane').forEach((pane) => {
      pane.classList.toggle('hidden', pane.dataset.hzlPaneBody !== paneKey);
    });
    requestAnimationFrame(() => {
      updateTabbedPanelNotch();
      if (paneKey === 'overview') {
        window.dispatchEvent(new Event('resize'));
      }
    });
  }

  function syncHeroEditionUI() {
    const activeCoreBtn = document.querySelector('.core-tab-btn.active');
    const core = activeCoreBtn?.dataset?.core || (typeof state !== 'undefined' ? state.selectedCore : 'fabric') || 'fabric';
    if (core && core !== 'horizon') {
      lastJavaCore = core;
    }
    const isRust = core === 'horizon';
    document.querySelectorAll('[data-hzl-edition]').forEach((btn) => {
      btn.classList.toggle('active', (btn.dataset.hzlEdition === 'rust') === isRust);
    });

    const ver = (typeof state !== 'undefined' && state.selectedVersion) ? state.selectedVersion : '1.21.4';
    const ram = (typeof state !== 'undefined' && state.ramGB) ? state.ramGB : 4;
    const coreLabelMap = {
      vanilla: 'Vanilla',
      optifine: 'OptiFine',
      fabric: 'Fabric',
      forge: 'Forge',
      neoforge: 'NeoForge',
      quilt: 'Quilt',
      legacyfabric: 'Legacy PvP',
      horizon: 'Nhân Rust'
    };

    const heroTitle = document.getElementById('hzlHeroTitle');
    if (heroTitle) {
      heroTitle.textContent = isRust
        ? `BlockWay Rust`
        : `${coreLabelMap[core] || core} ${ver}`;
    }

    // Sync Left Sidebar 8-Core Rail active highlight & live subtitle
    document.querySelectorAll('.hzl-side-core-item[data-side-core]').forEach((item) => {
      const isAct = item.dataset.sideCore === core;
      item.classList.toggle('active', isAct);
      const subWrap = item.querySelector('.hsc-sub');
      const subText = item.querySelector('.hsc-sub span');
      const dot = item.querySelector('.hsc-dot');
      if (dot) dot.classList.toggle('is-online', isAct);
      if (subText && subWrap) {
        subText.textContent = isAct
          ? `Sẵn sàng · ${ver} · ${ram} GB`
          : (subWrap.getAttribute('data-default-sub') || '');
      }
    });

    const jumpBtn = document.getElementById('btnHzlCoreQuickJump');
    if (jumpBtn) {
      jumpBtn.innerHTML = `<span>⚙ ${isRust ? 'Horizon Rust' : core.toUpperCase()} · ${ram} GB</span>`;
    }

    const targetSel = document.getElementById('modTargetPackSelect');
    if (targetSel && targetSel.options && targetSel.options[0] && targetSel.options[0].value === '') {
      targetSel.options[0].textContent = `🏠 Thư mục chính (.minecraft — MC ${ver} • ${isRust ? 'NHÂN RUST HORIZON' : String(core).toUpperCase()})`;
    }
  }

  // 5. Quick Join Server / Co-op Invite Handler
  function handleQuickJoinAction() {
    const inp = document.getElementById('hzlQuickJoinInput');
    const raw = String(inp?.value || '').trim();
    if (!raw) {
      document.querySelector('.nav-item[data-tab="servers"]')?.click();
      setTimeout(() => document.getElementById('serverSearchInput')?.focus(), 60);
      return;
    }
    const looksLikeServerHost = /^[a-z0-9.-]+(?::\d{2,5})?$/i.test(raw) && (raw.includes('.') || raw.includes(':') || /^localhost/i.test(raw));
    if (looksLikeServerHost && typeof state !== 'undefined') {
      if (typeof window.setServerIpEverywhere === 'function') {
        window.setServerIpEverywhere(raw);
      }
      state.pendingOneShotServer = raw;
      const playBtn = document.getElementById('btnLaunch');
      if (playBtn && !state.isLaunching) {
        playBtn.click();
        return;
      }
    }
    // Otherwise route to Co-op / Tools or Servers search
    document.querySelector('.nav-item[data-tab="tools"]')?.click();
    if (typeof window.showAetherNotification === 'function') {
      window.showAetherNotification(`🌐 Đã chuyển mã "${raw}" sang Trạm Co-op & Máy Chủ!`, 'info', 3000);
    }
  }

  // 6. 2-Column Mod Store Sticky Inspector
  let selectedModSlug = '';

  function syncModsSplitVisibility() {
    const split = document.getElementById('hzlModsSplitWrap');
    const aside = document.getElementById('hzlModDetailAside');
    if (!split || !aside) return;
    const activePtype = document.querySelector('#tab-mods .mtype-btn.active')?.dataset?.ptype || 'mod';
    const isStoreGrid = ['mod', 'shader', 'resourcepack'].includes(activePtype);
    aside.classList.toggle('hidden', !isStoreGrid);
    split.classList.toggle('is-single-col', !isStoreGrid);
  }

  function renderModInspectorForCard(cardEl) {
    const aside = document.getElementById('hzlModDetailAside');
    if (!aside || !cardEl) return;

    document.querySelectorAll('#modrinthResultsGrid .mod-card.is-selected').forEach((c) => {
      c.classList.toggle('is-selected', c === cardEl);
    });
    cardEl.classList.add('is-selected');

    const slug = cardEl.dataset.modslug || '';
    selectedModSlug = slug;
    const hits = Array.isArray(window.__bwVisibleModHits) ? window.__bwVisibleModHits : [];
    const hit = hits.find((h) => String(h.slug) === slug) || null;

    const iconSrc = cardEl.querySelector('.mod-icon')?.getAttribute('src') || FALLBACK_MOD_ICON;
    const titleText = cardEl.querySelector('.mod-title')?.textContent || hit?.title || 'Gói mở rộng';
    const metaText = cardEl.querySelector('.mod-meta')?.textContent || '';
    const compatEl = cardEl.querySelector('.mod-compat-pill');
    const descEl = cardEl.querySelector('.mod-desc');
    const fullDesc = descEl?.getAttribute('title') || descEl?.textContent || hit?.description || '';
    const srcBtn = cardEl.querySelector('.btn-install-mod');

    const iconImg = document.getElementById('hmiIcon');
    const titleEl = document.getElementById('hmiTitle');
    const metaOut = document.getElementById('hmiMeta');
    const compatOut = document.getElementById('hmiCompatBox');
    const descOut = document.getElementById('hmiDesc');
    const tagsOut = document.getElementById('hmiTags');
    const actBtn = document.getElementById('hmiInstallBtn');

    if (iconImg) {
      delete iconImg.dataset.hzlFallbackApplied;
      iconImg.src = iconSrc;
    }
    if (titleEl) titleEl.textContent = titleText;
    if (metaOut) metaOut.textContent = metaText;
    if (compatOut) {
      compatOut.className = compatEl ? compatEl.className : 'mod-compat-pill ok';
      compatOut.textContent = compatEl ? compatEl.textContent : 'Sẵn sàng cài đặt';
    }
    if (descOut) descOut.textContent = fullDesc;
    if (tagsOut) {
      tagsOut.innerHTML = '';
      cardEl.querySelectorAll('.mod-tag').forEach((t) => {
        const span = document.createElement('span');
        span.className = 'mod-tag';
        span.textContent = t.textContent;
        tagsOut.appendChild(span);
      });
      if (hit?.versions?.length) {
        const verTag = document.createElement('span');
        verTag.className = 'mod-tag';
        verTag.textContent = `MC ${hit.versions[0]}`;
        tagsOut.appendChild(verTag);
      }
    }
    if (actBtn && srcBtn) {
      actBtn.textContent = srcBtn.textContent || 'Cài đặt';
      actBtn.disabled = Boolean(srcBtn.disabled);
      actBtn.classList.toggle('is-installed', srcBtn.classList.contains('installed'));
      actBtn.onclick = () => {
        if (!srcBtn.disabled) srcBtn.click();
      };
    }
  }

  function refreshModInspectorSelection() {
    syncModsSplitVisibility();
    const grid = document.getElementById('modrinthResultsGrid');
    if (!grid) return;
    let targetCard = selectedModSlug
      ? grid.querySelector(`.mod-card[data-modslug="${CSS.escape(selectedModSlug)}"]`)
      : null;
    if (!targetCard) {
      targetCard = grid.querySelector('.mod-card');
    }
    if (targetCard) {
      renderModInspectorForCard(targetCard);
    }
  }

  // 7. Wire Events on DOMContentLoaded
  window.addEventListener('DOMContentLoaded', () => {
    syncSidebarCoreIcons();
    drawHorizonScene();
    updateTabbedPanelNotch();
    syncHeroEditionUI();

    window.addEventListener('resize', () => {
      drawHorizonScene();
      updateTabbedPanelNotch();
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) drawHorizonScene();
    });

    // Redraw scene when data-theme changes
    const rootObs = new MutationObserver(() => {
      drawHorizonScene();
      requestAnimationFrame(updateTabbedPanelNotch);
    });
    rootObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-ui-sidebar', 'data-ui-density']
    });

    const tabsStrip = document.getElementById('hzlHomeTabbedStrip');
    const tabbedPanel = document.getElementById('hzlHomeTabbedPanel');
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => updateTabbedPanelNotch());
      if (tabsStrip) ro.observe(tabsStrip);
      if (tabbedPanel) ro.observe(tabbedPanel);
    }

    // Left Sidebar 8-Core Rail click handlers
    document.querySelectorAll('.hzl-side-core-item[data-side-core]').forEach((item) => {
      item.addEventListener('click', (ev) => {
        const core = item.dataset.sideCore;
        const clickedMore = Boolean(ev.target?.closest?.('.hsc-more'));
        const coreBtn = document.querySelector(`.core-tab-btn[data-core="${core}"]`);
        if (coreBtn) coreBtn.click();
        if (clickedMore) {
          document.querySelector('.nav-item[data-tab="play"]')?.click();
        }
        setTimeout(syncHeroEditionUI, 35);
      });
    });

    document.getElementById('btnSideAddInstance')?.addEventListener('click', () => {
      document.querySelector('.nav-item[data-tab="play"]')?.click();
    });

    document.getElementById('btnSideOpenServers')?.addEventListener('click', () => {
      document.querySelector('.nav-item[data-tab="servers"]')?.click();
    });

    document.getElementById('btnHomeOpenChangelog')?.addEventListener('click', () => {
      document.querySelector('.nav-item[data-tab="settings"]')?.click();
    });

    // Quick Server / Co-op Join Pill on Home
    document.getElementById('hzlQuickJoinBtn')?.addEventListener('click', handleQuickJoinAction);
    document.getElementById('hzlQuickJoinInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleQuickJoinAction();
      }
    });

    // Home TabbedPanel buttons
    document.querySelectorAll('[data-hzl-pane]').forEach((btn) => {
      btn.addEventListener('click', () => activateHomeSubTab(btn.dataset.hzlPane));
    });

    // Quick 8-Core & RAM jump button
    document.getElementById('btnHzlCoreQuickJump')?.addEventListener('click', () => {
      activateHomeSubTab('cores');
      document.getElementById('hzlHomeTabbedPanel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    // Quick Open .minecraft folder button in 56px Hero Action Row
    document.getElementById('btnHzlOpenMcFolder')?.addEventListener('click', () => {
      document.getElementById('btnOpenGameDirSettings')?.click();
    });

    // Edition Switch (Horizon Rust <-> Java 8 Core)
    document.querySelectorAll('[data-hzl-edition]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const wantRust = btn.dataset.hzlEdition === 'rust';
        if (wantRust) {
          document.querySelector('.core-tab-btn[data-core="horizon"]')?.click();
        } else {
          const curCore = document.querySelector('.core-tab-btn.active')?.dataset?.core;
          if (curCore === 'horizon') {
            document.querySelector(`.core-tab-btn[data-core="${lastJavaCore || 'fabric'}"]`)?.click();
          } else {
            activateHomeSubTab('cores');
          }
        }
        setTimeout(syncHeroEditionUI, 30);
      });
    });

    // Observe core/version/RAM changes to keep Hero Display Title & Left Sidebar synced
    const dockVerTitle = document.getElementById('dockVersionTitle');
    const dockCoreSub = document.getElementById('dockCoreSubtitle');
    if (dockVerTitle || dockCoreSub) {
      const heroObs = new MutationObserver(() => syncHeroEditionUI());
      if (dockVerTitle) heroObs.observe(dockVerTitle, { childList: true, characterData: true, subtree: true });
      if (dockCoreSub) heroObs.observe(dockCoreSub, { childList: true, characterData: true, subtree: true });
    }
    document.querySelectorAll('.core-tab-btn, .ram-pill-btn').forEach((b) => {
      b.addEventListener('click', () => setTimeout(syncHeroEditionUI, 40));
    });
    document.getElementById('ramSlider')?.addEventListener('input', () => setTimeout(syncHeroEditionUI, 40));

    // Recompute notch whenever top navigation returns to Home
    const topNav = document.querySelector('.hzl-top-nav-strip');
    if (topNav) {
      const navObs = new MutationObserver(() => {
        const activeTab = topNav.querySelector('.nav-item.active')?.dataset?.tab || 'home';
        if (activeTab === 'home') {
          requestAnimationFrame(updateTabbedPanelNotch);
        }
      });
      navObs.observe(topNav, { attributes: true, subtree: true, attributeFilter: ['class'] });
    }

    // Ctrl+K global search shortcut
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const inp = document.getElementById('globalSearchInput');
        if (inp) {
          inp.focus();
          inp.select();
        }
      }
    });

    // Mod Store Inspector events
    window.addEventListener('bw:mods-rendered', refreshModInspectorSelection);
    window.addEventListener('bw:mod-card-updated', (ev) => {
      const slug = ev?.detail?.slug;
      if (!slug || slug === selectedModSlug) refreshModInspectorSelection();
    });
    document.getElementById('modrinthResultsGrid')?.addEventListener('click', (e) => {
      const card = e.target.closest('.mod-card');
      if (card) {
        renderModInspectorForCard(card);
      }
    });
    document.querySelectorAll('#tab-mods .mtype-btn').forEach((btn) => {
      btn.addEventListener('click', () => setTimeout(syncModsSplitVisibility, 20));
    });
  });
})();
