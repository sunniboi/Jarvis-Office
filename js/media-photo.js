/* ===== JARVIS OFFICE v2 — STUDIO: Foto-Editor ===== */

const JMPhoto = (() => {
  const DEFAULTS = {
    brightness: 0, contrast: 0, saturation: 0, warmth: 0, sharpen: 0, blur: 0, vignette: 0,
    filter: 'none', auto: null, rotate: 0, flipH: false, crop: null,
    text: '', textPosition: 'bottom', textSize: 6, textColor: '#ffffff',
  };
  const FILTERS = [['none', 'Ohne'], ['bw', 'Schwarz-Weiß'], ['sepia', 'Sepia'], ['vintage', 'Vintage'],
    ['cool', 'Kühl'], ['warm', 'Warm'], ['dramatic', 'Dramatisch'], ['fade', 'Verblasst']];
  const SLIDERS = [['brightness', 'Helligkeit', -100, 100], ['contrast', 'Kontrast', -100, 100],
    ['saturation', 'Sättigung', -100, 100], ['warmth', 'Wärme', -100, 100], ['sharpen', 'Schärfe', 0, 100],
    ['blur', 'Weichzeichnen', 0, 100], ['vignette', 'Vignette', 0, 100]];
  const ASPECTS = [['free', 'Frei', 0], ['orig', 'Original', -1], ['1:1', '1:1', 1], ['4:5', '4:5', 0.8],
    ['9:16', '9:16', 9 / 16], ['16:9', '16:9', 16 / 9], ['3:2', '3:2', 1.5]];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Misst das Bild und liefert Tonwert-, Gamma- und Weißabgleich-Korrektur.
  function computeAuto(data) {
    const d = data.data, hist = new Uint32Array(256);
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 16) {            // jedes vierte Pixel reicht
      hist[(d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8]++;
      r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
    }
    const at = frac => { let acc = 0; for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= n * frac) return i; } return 255; };
    let lo = at(0.005), hi = at(0.995);
    if (hi - lo < 64) { const mid = (hi + lo) / 2; lo = Math.max(0, mid - 32); hi = Math.min(255, mid + 32); }
    lo = Math.min(lo, 60); hi = Math.max(hi, 180);       // nie brutal strecken
    const median = clamp((at(0.5) - lo) / (hi - lo), 0.05, 0.95);
    const gamma = 1 + (clamp(Math.log(0.5) / Math.log(median), 0.75, 1.35) - 1) * 0.6;
    const avg = (r + g + b) / 3 || 1;
    const gain = c => 1 + (clamp(avg / (c || 1), 0.85, 1.18) - 1) * 0.5;
    return { lo: lo / 255, hi: hi / 255, gamma, r: gain(r), g: gain(g), b: gain(b) };
  }

  // Wendet alle Farbkorrekturen in einem Durchgang an.
  function applyColor(data, a) {
    let con = 1 + a.contrast / 100, sat = 1 + a.saturation / 100, warm = a.warmth / 100, lift = 0;
    let tint = null;
    if (a.filter === 'bw') sat = 0;
    if (a.filter === 'sepia') { sat = 0; tint = [1.10, 0.96, 0.76]; }
    if (a.filter === 'vintage') { con *= 0.9; sat *= 0.8; warm += 0.3; lift = 0.06; }
    if (a.filter === 'cool') warm -= 0.4;
    if (a.filter === 'warm') warm += 0.4;
    if (a.filter === 'dramatic') { con *= 1.35; sat *= 0.75; }
    if (a.filter === 'fade') { con *= 0.85; sat *= 0.85; lift = 0.1; }
    const au = a.auto || { lo: 0, hi: 1, gamma: 1, r: 1, g: 1, b: 1 };
    const bright = a.brightness / 100 * 0.35;
    const lut = gain => {
      const t = new Uint8ClampedArray(256);
      for (let i = 0; i < 256; i++) {
        let v = clamp((i / 255 - au.lo) / (au.hi - au.lo), 0, 1);
        v = Math.pow(v, au.gamma) * gain + bright;
        v = (v - 0.5) * con + 0.5;
        t[i] = (lift + v * (1 - lift)) * 255;
      }
      return t;
    };
    const lr = lut(au.r * (1 + warm * 0.18)), lg = lut(au.g), lb = lut(au.b * (1 - warm * 0.18));
    const d = data.data;
    for (let i = 0; i < d.length; i += 4) {
      let r = lr[d[i]], g = lg[d[i + 1]], b = lb[d[i + 2]];
      if (sat !== 1) {
        const y = 0.299 * r + 0.587 * g + 0.114 * b;
        r = y + (r - y) * sat; g = y + (g - y) * sat; b = y + (b - y) * sat;
      }
      if (tint) { r *= tint[0]; g *= tint[1]; b *= tint[2]; }
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
  }

  function canvasOf(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    return c;
  }

  // Zeichnet das gedrehte/gespiegelte Bild; `scale` verkleinert für die Vorschau.
  function oriented(img, a, scale) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const swap = a.rotate === 90 || a.rotate === 270;
    const c = canvasOf((swap ? ih : iw) * scale, (swap ? iw : ih) * scale);
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.translate(c.width / 2, c.height / 2);
    x.rotate(a.rotate * Math.PI / 180);
    if (a.flipH) x.scale(-1, 1);
    x.drawImage(img, -iw * scale / 2, -ih * scale / 2, iw * scale, ih * scale);
    return c;
  }

  // Vollständige Bearbeitung. maxSide begrenzt die längste Seite, outWidth erzwingt eine Breite.
  function render(img, a, { maxSide = 0, outWidth = 0, noCrop = false } = {}) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const swap = a.rotate === 90 || a.rotate === 270;
    const ow = swap ? ih : iw, oh = swap ? iw : ih;
    const crop = (!noCrop && a.crop) || { x: 0, y: 0, w: 1, h: 1 };
    let scale = 1;
    const cw = ow * crop.w, ch = oh * crop.h;
    if (outWidth) scale = outWidth / cw;
    else if (maxSide && Math.max(cw, ch) > maxSide) scale = maxSide / Math.max(cw, ch);
    scale = Math.min(scale, 8000 / Math.max(cw, ch));
    const full = oriented(img, a, scale);
    let c = canvasOf(cw * scale, ch * scale);
    let x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(full, -crop.x * full.width, -crop.y * full.height);

    const data = x.getImageData(0, 0, c.width, c.height);
    applyColor(data, a);
    if (a.sharpen > 0) {                                  // Unscharf maskieren
      const soft = canvasOf(c.width, c.height), sx = soft.getContext('2d', { willReadFrequently: true });
      sx.filter = `blur(${Math.max(0.6, c.width / 1400)}px)`;
      sx.putImageData(data, 0, 0);
      sx.drawImage(soft, 0, 0);
      const bl = sx.getImageData(0, 0, c.width, c.height).data, d = data.data, k = a.sharpen / 100 * 1.6;
      for (let i = 0; i < d.length; i += 4) {
        d[i] += (d[i] - bl[i]) * k; d[i + 1] += (d[i + 1] - bl[i + 1]) * k; d[i + 2] += (d[i + 2] - bl[i + 2]) * k;
      }
    }
    x.putImageData(data, 0, 0);
    if (a.blur > 0) {
      const b2 = canvasOf(c.width, c.height), bx = b2.getContext('2d');
      bx.filter = `blur(${a.blur / 100 * c.width / 60}px)`;
      bx.drawImage(c, 0, 0);
      c = b2; x = bx; x.filter = 'none';
    }
    const vig = a.vignette / 100 + (a.filter === 'dramatic' ? 0.3 : 0);
    if (vig > 0) {
      const g = x.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.35,
        c.width / 2, c.height / 2, Math.hypot(c.width, c.height) / 2);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, vig * 0.8)})`);
      x.fillStyle = g;
      x.fillRect(0, 0, c.width, c.height);
    }
    if (a.text.trim()) {
      const size = c.height * a.textSize / 100, lines = a.text.split('\n');
      x.font = `700 ${size}px Inter, 'Segoe UI', sans-serif`;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineJoin = 'round'; x.lineWidth = size / 7; x.strokeStyle = 'rgba(0,0,0,.75)'; x.fillStyle = a.textColor;
      const block = lines.length * size * 1.2;
      const top = a.textPosition === 'top' ? c.height * 0.07 : a.textPosition === 'center' ? (c.height - block) / 2 : c.height * 0.93 - block;
      lines.forEach((l, i) => {
        const y = top + size * 0.6 + i * size * 1.2;
        x.strokeText(l, c.width / 2, y); x.fillText(l, c.width / 2, y);
      });
    }
    return c;
  }

  function autoFor(img, a) {
    const c = render(img, { ...DEFAULTS, rotate: a.rotate, flipH: a.flipH, crop: a.crop }, { maxSide: 640 });
    return computeAuto(c.getContext('2d').getImageData(0, 0, c.width, c.height));
  }

  function loadImage(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('Das Bild lässt sich nicht lesen.'));
      img.src = src;
    });
  }

  // Einfache deutsche Befehle für den Fall ohne KI.
  function rules(text, a) {
    const t = ' ' + text.toLowerCase() + ' ', has = (...w) => w.some(x => t.includes(x)), did = [];
    const much = has('viel ', 'stark', 'deutlich', 'sehr') ? 45 : has('etwas', 'leicht', 'bisschen', 'wenig') ? 12 : 25;
    if (has('heller', 'aufhellen')) { a.brightness += much; did.push('heller'); }
    if (has('dunkler', 'abdunkeln')) { a.brightness -= much; did.push('dunkler'); }
    if (has('kontrast')) { a.contrast += has('weniger kontrast') ? -much : much; did.push('Kontrast'); }
    if (has('kräftig', 'bunter', 'satter', 'sättigung', 'farbiger')) { a.saturation += much; did.push('kräftigere Farben'); }
    if (has('blasser', 'entsättig')) { a.saturation -= much; did.push('blasser'); }
    if (has('wärmer', 'warm')) { a.warmth += much; did.push('wärmer'); }
    if (has('kälter', 'kühler', 'kühl')) { a.warmth -= much; did.push('kühler'); }
    if (has('schärfer', 'scharf', 'schärfen')) { a.sharpen = Math.max(a.sharpen, 2 * much); did.push('schärfer'); }
    if (has('weichzeichn', 'unscharf', 'blur')) { a.blur = much; did.push('weichgezeichnet'); }
    if (has('vignette')) { a.vignette = 2 * much; did.push('Vignette'); }
    if (has('schwarz-weiß', 'schwarzweiß', 'schwarz weiß', 's/w', 'graustufen')) { a.filter = 'bw'; did.push('Schwarz-Weiß'); }
    else if (has('sepia')) { a.filter = 'sepia'; did.push('Sepia'); }
    else if (has('vintage', 'retro')) { a.filter = 'vintage'; did.push('Vintage'); }
    else if (has('dramatisch')) { a.filter = 'dramatic'; did.push('dramatisch'); }
    const asp = has('quadrat', '1:1') ? 1 : has('hochkant', '9:16', 'story') ? 9 / 16 : has('4:5') ? 0.8 : has('16:9', 'breitbild') ? 16 / 9 : 0;
    if (asp) did.push('zugeschnitten');
    if (has('links drehen', 'nach links')) { a.rotate = (a.rotate + 270) % 360; a.crop = null; did.push('gedreht'); }
    else if (has('drehen', 'rechts drehen', 'nach rechts')) { a.rotate = (a.rotate + 90) % 360; a.crop = null; did.push('gedreht'); }
    if (has('spiegeln', 'gespiegelt')) { a.flipH = !a.flipH; did.push('gespiegelt'); }
    const auto = has('auto', 'verbesser', 'optimier', 'schöner', 'aufhübsch') || !did.length;
    if (auto) did.unshift('automatisch verbessert');
    for (const k of ['brightness', 'contrast', 'saturation', 'warmth']) a[k] = clamp(a[k], -100, 100);
    return { auto, aspect: asp, did };
  }

  function mount(pane, ctx) {
    pane.innerHTML = `
      <div class="jp">
        <div class="jp-main">
          <div class="jp-stage" id="jp-stage">
            <div class="jm-empty" id="jp-empty">
              <h3>Foto-Editor</h3>
              <p>Ein Foto aus der Bibliothek über „Bearbeiten“ öffnen – oder direkt eine Bilddatei wählen.</p>
              <div class="jm-empty-actions">
                <button class="btn btn-primary btn-sm" id="jp-pick">Aus Bibliothek</button>
                <button class="btn btn-ghost btn-sm" id="jp-local">Datei vom Rechner</button>
              </div>
            </div>
            <div class="jp-canvas-wrap hidden" id="jp-wrap">
              <canvas id="jp-canvas"></canvas>
              <div class="jp-crop hidden" id="jp-crop"><i data-h="nw"></i><i data-h="ne"></i><i data-h="sw"></i><i data-h="se"></i></div>
            </div>
          </div>
          <div class="jp-bar">
            <span id="jp-name" class="jp-name"></span>
            <label class="jm-check"><input type="checkbox" id="jp-compare"/> Original zeigen</label>
            <button class="btn btn-ghost btn-sm" id="jp-open">${icon('folderOpen', 15)} Anderes Foto</button>
          </div>
        </div>
        <aside class="jm-panel" id="jp-panel">
          <details open><summary>Automatik</summary>
            <button class="btn btn-primary jm-wide" id="jp-auto">Automatisch verbessern</button>
            <div class="jm-row"><input type="text" id="jp-prompt" placeholder="z. B. „heller, wärmer, quadratisch“" /><button class="btn btn-ghost btn-sm" id="jp-go">Los</button></div>
            <p class="jm-hint" id="jp-note"></p>
          </details>
          <details open><summary>Anpassen</summary>
            ${SLIDERS.map(([k, n, lo, hi]) => `
              <label class="jm-slider"><span>${n}</span><input type="range" data-k="${k}" min="${lo}" max="${hi}" value="0" /><output>0</output></label>`).join('')}
          </details>
          <details><summary>Filter</summary>
            <div class="jm-chips jp-filters">${FILTERS.map(([k, n]) => `<button class="jm-chip" data-filter="${k}">${n}</button>`).join('')}</div>
          </details>
          <details><summary>Zuschneiden & Drehen</summary>
            <div class="jm-row">
              <button class="btn btn-ghost btn-sm" id="jp-rotl">↺ Links</button>
              <button class="btn btn-ghost btn-sm" id="jp-rotr">↻ Rechts</button>
              <button class="btn btn-ghost btn-sm" id="jp-flip">⇋ Spiegeln</button>
            </div>
            <div class="jm-chips jp-aspects">${ASPECTS.map(([k, n]) => `<button class="jm-chip" data-aspect="${k}">${n}</button>`).join('')}</div>
            <div class="jm-row">
              <button class="btn btn-primary btn-sm hidden" id="jp-crop-ok">Zuschnitt übernehmen</button>
              <button class="btn btn-ghost btn-sm hidden" id="jp-crop-cancel">Abbrechen</button>
              <button class="btn btn-ghost btn-sm hidden" id="jp-crop-clear">Zuschnitt entfernen</button>
            </div>
            <p class="jm-hint">Seitenverhältnis wählen, Rahmen im Bild ziehen, dann übernehmen.</p>
          </details>
          <details><summary>Text</summary>
            <textarea id="jp-text" rows="2" placeholder="Text im Bild"></textarea>
            <div class="jm-row">
              <select id="jp-textpos"><option value="top">Oben</option><option value="center">Mitte</option><option value="bottom" selected>Unten</option></select>
              <input type="color" id="jp-textcolor" value="#ffffff" class="tb-color" aria-label="Textfarbe" />
            </div>
            <label class="jm-slider"><span>Größe</span><input type="range" id="jp-textsize" min="2" max="20" value="6" /><output>6</output></label>
          </details>
          <details open><summary>Speichern</summary>
            <div class="jm-row">
              <select id="jp-format"><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select>
              <input type="number" id="jp-width" min="16" max="8000" placeholder="Breite px" aria-label="Breite in Pixel" />
            </div>
            <label class="jm-slider"><span>Qualität</span><input type="range" id="jp-quality" min="40" max="100" value="90" /><output>90</output></label>
            <button class="btn btn-primary jm-wide" id="jp-save">In Bibliothek speichern</button>
            <div class="jm-row">
              <button class="btn btn-ghost btn-sm" id="jp-saveshare">Speichern & Teilen</button>
              <button class="btn btn-ghost btn-sm" id="jp-download">${icon('download', 14)} Herunterladen</button>
              <button class="btn btn-ghost btn-sm" id="jp-reset">Zurücksetzen</button>
            </div>
          </details>
        </aside>
        <input type="file" id="jp-file" accept="image/*" hidden />
      </div>`;

    const $p = s => pane.querySelector(s);
    const canvas = $p('#jp-canvas'), wrap = $p('#jp-wrap'), cropEl = $p('#jp-crop'), note = $p('#jp-note');
    let img = null, name = '', photoId = null, a = { ...DEFAULTS };
    let cropMode = false, cropRect = null, cropAspect = 0, raf = 0;

    function draw() {
      raf = 0;
      if (!img) return;
      const compare = $p('#jp-compare').checked;
      const src = compare ? { ...DEFAULTS, rotate: a.rotate, flipH: a.flipH, crop: a.crop } : a;
      const c = render(img, src, { maxSide: 1400, noCrop: cropMode });
      canvas.width = c.width; canvas.height = c.height;
      canvas.getContext('2d').drawImage(c, 0, 0);
    }
    const redraw = () => { if (!raf) raf = requestAnimationFrame(draw); };

    function syncUI() {
      pane.querySelectorAll('input[data-k]').forEach(i => { i.value = a[i.dataset.k]; i.nextElementSibling.textContent = a[i.dataset.k]; });
      pane.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b.dataset.filter === a.filter));
      $p('#jp-text').value = a.text; $p('#jp-textpos').value = a.textPosition;
      $p('#jp-textcolor').value = a.textColor; $p('#jp-textsize').value = a.textSize;
      $p('#jp-textsize').nextElementSibling.textContent = a.textSize;
      $p('#jp-crop-clear').classList.toggle('hidden', !a.crop || cropMode);
      $p('#jp-auto').textContent = a.auto ? 'Automatik zurücknehmen' : 'Automatisch verbessern';
    }

    function setImage(image, label, id = null) {
      img = image; name = label; photoId = id; a = { ...DEFAULTS };
      endCrop(false);
      $p('#jp-empty').classList.add('hidden'); wrap.classList.remove('hidden');
      $p('#jp-name').textContent = `${label} · ${img.naturalWidth}×${img.naturalHeight}`;
      $p('#jp-width').value = '';
      $p('#jp-format').value = /\.png$/i.test(label) ? 'image/png' : 'image/jpeg';
      note.textContent = '';
      syncUI(); redraw();
    }

    async function loadItem(item) {
      try { return await loadImage(ctx.url(`/media/${item.id}`, { v: item.mtime })); }
      catch { return loadImage(ctx.url(`/media/${item.id}/conv`, { v: item.mtime })); }   // z. B. TIFF/HEIC
    }

    async function open(item) {
      try { setImage(await loadItem(item), item.name, item.id); }
      catch (err) { showNotify(err.message, 'error'); }
    }

    function pickLocal() { $p('#jp-file').click(); }
    $p('#jp-file').addEventListener('change', async e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try { setImage(await loadImage(URL.createObjectURL(f)), f.name); }
      catch (err) { showNotify(err.message, 'error'); }
    });
    async function pickLibrary() {
      if (!ctx.connected) return pickLocal();
      const item = await ctx.pickItem(['image'], 'Foto wählen');
      if (item) open(item);
    }
    $p('#jp-pick').addEventListener('click', pickLibrary);
    $p('#jp-local').addEventListener('click', pickLocal);
    $p('#jp-open').addEventListener('click', pickLibrary);
    $p('#jp-compare').addEventListener('change', redraw);

    // Regler, Filter, Text
    pane.querySelectorAll('input[data-k]').forEach(i => i.addEventListener('input', () => {
      a[i.dataset.k] = Number(i.value); i.nextElementSibling.textContent = i.value; redraw();
    }));
    pane.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => { a.filter = b.dataset.filter; syncUI(); redraw(); }));
    $p('#jp-text').addEventListener('input', e => { a.text = e.target.value; redraw(); });
    $p('#jp-textpos').addEventListener('change', e => { a.textPosition = e.target.value; redraw(); });
    $p('#jp-textcolor').addEventListener('input', e => { a.textColor = e.target.value; redraw(); });
    $p('#jp-textsize').addEventListener('input', e => { a.textSize = Number(e.target.value); e.target.nextElementSibling.textContent = e.target.value; redraw(); });
    $p('#jp-quality').addEventListener('input', e => { e.target.nextElementSibling.textContent = e.target.value; });
    $p('#jp-reset').addEventListener('click', () => { if (!img) return; a = { ...DEFAULTS }; endCrop(false); syncUI(); redraw(); note.textContent = ''; });

    // Automatik
    function applyAuto() {
      a.auto = autoFor(img, a);
      a.saturation = clamp(a.saturation + 8, -100, 100);
      a.sharpen = Math.max(a.sharpen, 15);
    }
    $p('#jp-auto').addEventListener('click', () => {
      if (!img) return;
      if (a.auto) a.auto = null; else applyAuto();
      syncUI(); redraw();
    });

    function centerCrop(aspect) {
      const swap = a.rotate === 90 || a.rotate === 270;
      const ia = (swap ? img.naturalHeight : img.naturalWidth) / (swap ? img.naturalWidth : img.naturalHeight);
      const w = aspect < ia ? aspect / ia : 1, h = aspect < ia ? 1 : ia / aspect;
      return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
    }

    function applyAdjust(adj) {
      for (const k of ['brightness', 'contrast', 'saturation', 'warmth']) if (k in adj) a[k] = clamp(Number(adj[k]) || 0, -100, 100);
      for (const k of ['sharpen', 'blur', 'vignette']) if (k in adj) a[k] = clamp(Number(adj[k]) || 0, 0, 100);
      if (FILTERS.some(f => f[0] === adj.filter)) a.filter = adj.filter;
      if ([0, 90, 180, 270].includes(adj.rotate) && adj.rotate) { a.rotate = (a.rotate + adj.rotate) % 360; a.crop = null; }
      if (adj.flipH) a.flipH = !a.flipH;
      const c = adj.crop;
      if (c && c.w > 0.05 && c.h > 0.05) {
        const x = clamp(c.x, 0, 0.95), y = clamp(c.y, 0, 0.95);
        a.crop = { x, y, w: clamp(c.w, 0.05, 1 - x), h: clamp(c.h, 0.05, 1 - y) };
      }
      if (typeof adj.text === 'string' && adj.text) a.text = adj.text.slice(0, 200);
      if (['top', 'center', 'bottom'].includes(adj.textPosition)) a.textPosition = adj.textPosition;
      if (adj.auto) applyAuto();
    }

    async function runPrompt() {
      if (!img) return;
      const text = $p('#jp-prompt').value.trim();
      const btn = $p('#jp-go');
      if (ctx.connected && ctx.info.ai && photoId) {
        btn.disabled = true; note.textContent = 'Die KI sieht sich das Foto an …';
        try {
          const r = await ctx.api('POST', '/api/ai/photo', { id: photoId, prompt: text });
          applyAdjust(r.adjust || {});
          note.textContent = 'KI: ' + (r.explanation || 'angepasst.');
        } catch (err) { note.textContent = `KI nicht verfügbar (${err.message}) – Stichwörter verwendet.`; localRules(text); }
        btn.disabled = false;
      } else localRules(text);
      syncUI(); redraw();
    }
    function localRules(text) {
      const r = rules(text, a);
      if (r.aspect) a.crop = centerCrop(r.aspect);
      if (r.auto) applyAuto();
      if (!note.textContent.startsWith('KI nicht')) note.textContent = 'Erledigt: ' + r.did.join(', ') + '.';
    }
    $p('#jp-go').addEventListener('click', runPrompt);
    $p('#jp-prompt').addEventListener('keydown', e => { if (e.key === 'Enter') runPrompt(); });

    // Drehen / Spiegeln
    const turn = deg => { if (!img) return; a.rotate = (a.rotate + deg) % 360; a.crop = null; endCrop(false); syncUI(); redraw(); };
    $p('#jp-rotl').addEventListener('click', () => turn(270));
    $p('#jp-rotr').addEventListener('click', () => turn(90));
    $p('#jp-flip').addEventListener('click', () => { if (!img) return; a.flipH = !a.flipH; a.crop = null; endCrop(false); syncUI(); redraw(); });

    // Zuschneiden
    function placeCrop() {
      const r = cropRect;
      cropEl.style.left = r.x * 100 + '%'; cropEl.style.top = r.y * 100 + '%';
      cropEl.style.width = r.w * 100 + '%'; cropEl.style.height = r.h * 100 + '%';
    }
    function startCrop(key) {
      if (!img) return;
      const def = ASPECTS.find(x => x[0] === key);
      const swap = a.rotate === 90 || a.rotate === 270;
      const ia = (swap ? img.naturalHeight : img.naturalWidth) / (swap ? img.naturalWidth : img.naturalHeight);
      cropAspect = def[2] === -1 ? ia : def[2];
      cropRect = cropAspect ? centerCrop(cropAspect) : (a.crop ? { ...a.crop } : { x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
      cropAspect = cropAspect ? cropAspect / ia : 0;      // als Verhältnis der normierten Seiten
      cropMode = true;
      pane.querySelectorAll('[data-aspect]').forEach(b => b.classList.toggle('active', b.dataset.aspect === key));
      cropEl.classList.remove('hidden');
      $p('#jp-crop-ok').classList.remove('hidden'); $p('#jp-crop-cancel').classList.remove('hidden');
      $p('#jp-crop-clear').classList.add('hidden');
      placeCrop(); redraw();
    }
    function endCrop(apply) {
      if (apply && cropRect) a.crop = { ...cropRect };
      cropMode = false; cropRect = null;
      cropEl.classList.add('hidden');
      pane.querySelectorAll('[data-aspect]').forEach(b => b.classList.remove('active'));
      $p('#jp-crop-ok').classList.add('hidden'); $p('#jp-crop-cancel').classList.add('hidden');
      $p('#jp-crop-clear').classList.toggle('hidden', !a.crop);
    }
    pane.querySelectorAll('[data-aspect]').forEach(b => b.addEventListener('click', () => startCrop(b.dataset.aspect)));
    $p('#jp-crop-ok').addEventListener('click', () => { endCrop(true); redraw(); });
    $p('#jp-crop-cancel').addEventListener('click', () => { endCrop(false); redraw(); });
    $p('#jp-crop-clear').addEventListener('click', () => { a.crop = null; endCrop(false); redraw(); });

    cropEl.addEventListener('pointerdown', e => {
      e.preventDefault();
      const handle = e.target.dataset.h, box = wrap.getBoundingClientRect(), start = { ...cropRect };
      const px = e.clientX, py = e.clientY;
      cropEl.setPointerCapture(e.pointerId);
      const move = ev => {
        const dx = (ev.clientX - px) / box.width, dy = (ev.clientY - py) / box.height;
        const r = { ...start };
        if (!handle) {
          r.x = clamp(start.x + dx, 0, 1 - start.w); r.y = clamp(start.y + dy, 0, 1 - start.h);
        } else {
          const right = start.x + start.w, bottom = start.y + start.h;
          let x1 = handle.includes('w') ? clamp(start.x + dx, 0, right - 0.05) : start.x;
          let x2 = handle.includes('e') ? clamp(right + dx, start.x + 0.05, 1) : right;
          let y1 = handle.includes('n') ? clamp(start.y + dy, 0, bottom - 0.05) : start.y;
          let y2 = handle.includes('s') ? clamp(bottom + dy, start.y + 0.05, 1) : bottom;
          if (cropAspect) {                                 // Höhe folgt der Breite
            let w = x2 - x1, h = w / cropAspect;
            const room = handle.includes('n') ? bottom : 1 - start.y;
            if (h > room) { h = room; w = h * cropAspect; if (handle.includes('w')) x1 = x2 - w; else x2 = x1 + w; }
            if (handle.includes('n')) y1 = bottom - h; else y2 = start.y + h;
          }
          r.x = x1; r.y = y1; r.w = x2 - x1; r.h = y2 - y1;
        }
        cropRect = r; placeCrop();
      };
      const up = () => { cropEl.removeEventListener('pointermove', move); cropEl.removeEventListener('pointerup', up); };
      cropEl.addEventListener('pointermove', move);
      cropEl.addEventListener('pointerup', up);
    });

    // Speichern
    function outName(type) {
      const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[type];
      return name.replace(/\.[^.]+$/, '') + ' – bearbeitet.' + ext;
    }
    function toBlob(image, adj, type, quality, width) {
      const c = render(image, adj, { outWidth: width || 0 });
      return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('Das Bild konnte nicht erzeugt werden.')), type, quality));
    }
    async function upload(blob, fileName) {
      const res = await fetch(ctx.url('/api/photo', { name: fileName }), { method: 'PUT', body: blob });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Speichern fehlgeschlagen.');
      return data;
    }
    async function exportBlob() {
      if (!img) { showNotify('Erst ein Foto öffnen.', 'warn'); return null; }
      if (cropMode) endCrop(true);
      const type = $p('#jp-format').value;
      const blob = await toBlob(img, a, type, Number($p('#jp-quality').value) / 100, Number($p('#jp-width').value) || 0);
      return { blob, fileName: outName(type) };
    }
    async function save(share) {
      try {
        const out = await exportBlob();
        if (!out) return;
        if (!ctx.connected) { downloadFile(out.blob, out.fileName, out.blob.type); return; }
        const item = await upload(out.blob, out.fileName);
        await ctx.refresh();
        showNotify(`Gespeichert: ${item.name}`, 'success');
        if (share) ctx.share(item);
      } catch (err) { showNotify(err.message, 'error'); }
    }
    $p('#jp-save').addEventListener('click', () => save(false));
    $p('#jp-saveshare').addEventListener('click', () => save(true));
    $p('#jp-download').addEventListener('click', async () => {
      try { const out = await exportBlob(); if (out) downloadFile(out.blob, out.fileName, out.blob.type); }
      catch (err) { showNotify(err.message, 'error'); }
    });

    // Für „Automatik“ in der Bibliothek: verbessern und als Kopie speichern, ohne den Editor zu öffnen.
    async function autoSave(item) {
      const image = await loadItem(item);
      const adj = { ...DEFAULTS };
      adj.auto = autoFor(image, adj);
      adj.saturation = 8; adj.sharpen = 15;
      const blob = await toBlob(image, adj, 'image/jpeg', 0.92, 0);
      return upload(blob, item.name.replace(/\.[^.]+$/, '') + ' – Auto.jpg');
    }

    return { open, pickLocal, autoSave };
  }

  return { mount, _test: { computeAuto, rules, DEFAULTS } };
})();
