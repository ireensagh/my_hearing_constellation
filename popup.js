(() => {
  const FREQS = [125, 250, 500, 1000, 2000, 4000, 8000];
  const FREQ_LABELS = ['125', '250', '500', '1k', '2k', '4k', '8k'];
  const MIN_DB = 0, MAX_DB = 100, STEP_DB = 5; // audiograms are measured in 5 dB steps
  const PAD_L = 26, PAD_R = 10, PAD_T = 10, PAD_B = 16;
  const W = 320, H = 190;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const SVGNS = 'http://www.w3.org/2000/svg';

  const $ = (id) => document.getElementById(id);
  const svg = $('svg'), starsG = $('stars'), curvePath = $('curvePath'), valueLabel = $('valueLabel');
  const saveBtn = $('saveBtn'), saveLabel = $('saveLabel'), toast = $('toast');
  const earSwitch = $('earSwitch'), gridLabel = $('gridLabel');
  const powerSwitch = $('powerSwitch'), popup = $('popup');
  const statusEl = $('status'), statusText = $('statusText');
  const strengthInput = $('strength'), strengthValue = $('strengthValue');

  // Default = 0 dB everywhere (normal hearing) so nothing is "corrected" until the
  // user enters their own results.
  const state = {
    data: { left: FREQS.map(() => 0), right: FREQS.map(() => 0) },
    saved: null,
    ear: 'left',
    enabled: true,
    strength: 75,
    tabId: null
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const clampDb = (v) => (Number.isFinite(v) ? Math.max(MIN_DB, Math.min(MAX_DB, v)) : 0);
  const objToArr = (obj) => FREQS.map((f) => clampDb(Number(obj?.[f])));
  const arrToObj = (arr) => Object.fromEntries(FREQS.map((f, i) => [f, arr[i]]));

  const xForIndex = (i) => PAD_L + (i / (FREQS.length - 1)) * plotW;
  const yForDb = (db) => PAD_T + (db / MAX_DB) * plotH;
  const dbForY = (y) => {
    const raw = ((y - PAD_T) / plotH) * MAX_DB;
    return clampDb(Math.round(raw / STEP_DB) * STEP_DB);
  };

  // 4-point sparkle star centred at (cx, cy)
  function starPath(cx, cy, outerR, innerR) {
    let path = '';
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / 4 - Math.PI / 2;
      path += (i === 0 ? 'M' : 'L') + (cx + Math.cos(angle) * r).toFixed(2) + ',' + (cy + Math.sin(angle) * r).toFixed(2) + ' ';
    }
    return path + 'Z';
  }

  function drawGrid() {
    [0, 20, 40, 60, 80, 100].forEach((db) => {
      const y = yForDb(db);
      const line = document.createElementNS(SVGNS, 'line');
      line.setAttribute('x1', PAD_L); line.setAttribute('x2', W - PAD_R);
      line.setAttribute('y1', y); line.setAttribute('y2', y);
      line.setAttribute('class', db === 0 ? 'grid-line zero' : 'grid-line');
      svg.insertBefore(line, curvePath);

      const label = document.createElementNS(SVGNS, 'text');
      label.setAttribute('x', PAD_L - 5); label.setAttribute('y', y + 2.5);
      label.setAttribute('text-anchor', 'end'); label.setAttribute('class', 'axis-label');
      label.textContent = db;
      svg.insertBefore(label, curvePath);
    });
    FREQ_LABELS.forEach((text, i) => {
      const label = document.createElementNS(SVGNS, 'text');
      label.setAttribute('x', xForIndex(i)); label.setAttribute('y', H - 3);
      label.setAttribute('text-anchor', 'middle'); label.setAttribute('class', 'freq-label');
      label.textContent = text;
      svg.appendChild(label);
    });
  }

  let starEls = [];

  function updateCurve() {
    const vals = state.data[state.ear];
    curvePath.setAttribute(
      'd',
      vals.map((db, i) => (i === 0 ? 'M' : 'L') + xForIndex(i).toFixed(1) + ',' + yForDb(db).toFixed(1)).join(' ')
    );
  }

  function placeStar(i) {
    const x = xForIndex(i), y = yForDb(state.data[state.ear][i]);
    starEls[i].star.setAttribute('d', starPath(x, y, 7.5, 2.8));
    starEls[i].hit.setAttribute('cx', x);
    starEls[i].hit.setAttribute('cy', y);
  }

  function showValue(i) {
    const x = xForIndex(i), y = yForDb(state.data[state.ear][i]);
    valueLabel.textContent = state.data[state.ear][i] + ' dB';
    valueLabel.setAttribute('x', x);
    valueLabel.setAttribute('y', Math.max(9, y - 11));
    valueLabel.setAttribute('visibility', 'visible');
  }

  function buildStars() {
    starsG.innerHTML = '';
    starEls = [];
    state.data[state.ear].forEach((_, i) => {
      const wrap = document.createElementNS(SVGNS, 'g');
      wrap.setAttribute('class', 'star-wrap');

      const star = document.createElementNS(SVGNS, 'path');
      star.setAttribute('fill', 'var(--star)');
      star.setAttribute('class', 'star-point star-glow');

      // generous invisible hit area so the thin star is easy to grab
      const hit = document.createElementNS(SVGNS, 'circle');
      hit.setAttribute('r', 11);
      hit.setAttribute('fill', 'transparent');
      hit.setAttribute('class', 'star-hit');

      wrap.appendChild(star);
      wrap.appendChild(hit);
      starsG.appendChild(wrap);
      starEls.push({ star, hit });
      placeStar(i);

      let dragging = false;
      hit.addEventListener('pointerdown', (e) => {
        dragging = true;
        hit.setPointerCapture(e.pointerId);
        wrap.classList.add('dragging');
        showValue(i);
      });
      hit.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const rect = svg.getBoundingClientRect();
        const localY = ((e.clientY - rect.top) / rect.height) * H;
        state.data[state.ear][i] = dbForY(localY);
        placeStar(i);
        updateCurve();
        showValue(i);
        checkDirty();
      });
      const end = () => {
        dragging = false;
        wrap.classList.remove('dragging');
        valueLabel.setAttribute('visibility', 'hidden');
      };
      hit.addEventListener('pointerup', end);
      hit.addEventListener('pointercancel', end);
    });
    updateCurve();
  }

  function checkDirty() {
    const dirty = JSON.stringify(state.data) !== JSON.stringify(state.saved);
    saveBtn.classList.toggle('dirty', dirty);
    saveLabel.textContent = dirty ? 'Save changes' : 'All up to date';
  }

  // ---------- messaging with the background worker ----------
  const send = (msg) => chrome.runtime.sendMessage({ target: 'background', ...msg }).catch(() => null);

  const getStreamId = (tabId) =>
    new Promise((resolve, reject) => {
      chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
        if (chrome.runtime.lastError || !id) reject(new Error(chrome.runtime.lastError?.message || 'No stream id'));
        else resolve(id);
      });
    });

  function setStatus(kind, text, detail) {
    statusEl.className = 'status ' + (kind || '');
    statusText.textContent = text;
    statusEl.title = detail || '';
  }

  async function startCapture() {
    if (!state.enabled || state.tabId == null) return;
    setStatus('', 'Connecting…');
    try {
      const st = await send({ type: 'GET_STATUS', tabId: state.tabId });
      if (st?.active) return setStatus('ok', 'Correcting this tab');

      const streamId = await getStreamId(state.tabId);
      const res = await send({ type: 'START_CAPTURE', tabId: state.tabId, streamId });
      if (res?.ok) setStatus('ok', 'Correcting this tab');
      else setStatus('warn', "Can't process audio on this page", res?.error);
    } catch (err) {
      setStatus('warn', "Can't process audio on this page", String(err?.message || err));
    }
  }

  // ---------- controls ----------
  document.querySelectorAll('.ear-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.ear = btn.dataset.ear;
      earSwitch.classList.toggle('right', state.ear === 'right');
      earSwitch.classList.toggle('left', state.ear === 'left');
      gridLabel.textContent = state.ear === 'left' ? 'Left ear audiogram' : 'Right ear audiogram';
      buildStars();
    });
  });

  saveBtn.addEventListener('click', async () => {
    if (!saveBtn.classList.contains('dirty')) return;
    await chrome.storage.local.set({
      leftEar: arrToObj(state.data.left),
      rightEar: arrToObj(state.data.right)
    });
    state.saved = clone(state.data);
    checkDirty();
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1600);
  });

  // Strength is a live control: it applies and persists as you move it (no Save needed),
  // so you can tune it by ear while audio plays.
  function applyStrengthUi(v) {
    strengthInput.value = v;
    strengthInput.style.setProperty('--pct', v + '%');
    strengthValue.textContent = v + '%';
  }
  let strengthTimer = null;
  strengthInput.addEventListener('input', () => {
    state.strength = Number(strengthInput.value);
    applyStrengthUi(state.strength);
    clearTimeout(strengthTimer);
    strengthTimer = setTimeout(() => chrome.storage.local.set({ strength: state.strength }), 120);
  });

  function applyPowerUi(on) {
    powerSwitch.classList.toggle('on', on);
    powerSwitch.setAttribute('aria-checked', String(on));
    powerSwitch.title = on ? 'Correction on' : 'Correction off';
    popup.classList.toggle('off', !on);
  }

  powerSwitch.addEventListener('click', async () => {
    state.enabled = !state.enabled;
    applyPowerUi(state.enabled);
    await chrome.storage.local.set({ isEnabled: state.enabled });
    if (state.enabled) {
      startCapture();
    } else {
      await send({ type: 'STOP_CAPTURE' }); // all tabs go back to normal sound
      setStatus('', 'Correction off');
    }
  });

  const themeBtn = $('themeBtn'), themePopover = $('themePopover');

  function applyTheme(name) {
    document.documentElement.dataset.theme = name;
    document.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('active', s.dataset.theme === name));
  }

  themeBtn.addEventListener('click', (e) => { e.stopPropagation(); themePopover.classList.toggle('open'); });
  document.addEventListener('click', () => themePopover.classList.remove('open'));
  document.querySelectorAll('.swatch').forEach((sw) => {
    sw.addEventListener('click', async (e) => {
      e.stopPropagation();
      applyTheme(sw.dataset.theme);
      themePopover.classList.remove('open');
      await chrome.storage.local.set({ theme: sw.dataset.theme });
    });
  });

  // ---------- init ----------
  (async function init() {
    drawGrid();

    const stored = await chrome.storage.local.get(['leftEar', 'rightEar', 'isEnabled', 'theme', 'strength']);
    if (stored.leftEar) state.data.left = objToArr(stored.leftEar);
    if (stored.rightEar) state.data.right = objToArr(stored.rightEar);
    state.saved = clone(state.data);
    state.enabled = stored.isEnabled ?? true;
    state.strength = stored.strength ?? 75;
    applyStrengthUi(state.strength);

    applyTheme(stored.theme || 'space');
    applyPowerUi(state.enabled);
    buildStars();
    checkDirty();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    state.tabId = tab?.id ?? null;

    if (state.enabled) startCapture();
    else setStatus('', 'Correction off');
  })();
})();
