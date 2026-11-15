/* ===== JARVIS OFFICE v2 — STUDIO: Video-Schnitt ===== */

const JMVideo = (() => {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4, 8];

  function blank() {
    return {
      name: 'Mein Video', segments: [],
      format: { preset: 'original', width: 0, height: 0, fit: 'contain' },
      look: { brightness: 0, contrast: 1, saturation: 1, rotate: 0, flipH: false, enhance: false, stabilize: false, denoise: false },
      audio: { mute: false, volume: 1, normalize: true, music: null },
      fadeIn: 0, fadeOut: 0,
      text: { content: '', position: 'bottom', size: 6, color: '#ffffff', start: 0, end: 0 },
      output: { container: 'mp4', quality: 'medium', targetMB: 0, fast: false },
    };
  }

  function mount(pane, ctx) {
    pane.innerHTML = `
      <div class="jv">
        <div class="jv-main">
          <div class="jv-top">
            <input type="text" id="jv-name" class="jv-name" aria-label="Projektname" />
            <button class="btn btn-ghost btn-sm" id="jv-new">${icon('filePlus', 15)} Neu</button>
            <button class="btn btn-ghost btn-sm" id="jv-open">${icon('folderOpen', 15)} Öffnen</button>
            <button class="btn btn-ghost btn-sm" id="jv-save">${icon('save', 15)} Projekt speichern</button>
            <span class="jv-dirty" id="jv-dirty"></span>
          </div>
          <div class="jv-stage-wrap" id="jv-wrap" tabindex="0">
            <div class="jm-empty" id="jv-empty">
              <h3>Video-Schnitt</h3>
              <p>Ein Video hinzufügen – danach rechts „KI-Regie“ oder „Auto-Schnitt“ nutzen. Von Hand geht es auch: Abspielkopf setzen, teilen, löschen.</p>
              <div class="jm-empty-actions"><button class="btn btn-primary btn-sm" id="jv-first">${icon('plus', 15)} Clip aus der Bibliothek</button></div>
            </div>
            <div class="jv-stage hidden" id="jv-stage">
              <video id="jv-video" playsinline preload="auto"></video>
              <img id="jv-img" class="hidden" alt="" />
              <div class="jv-text" id="jv-text"></div>
              <div class="jv-msg hidden" id="jv-msg"></div>
            </div>
          </div>
          <div class="jv-transport">
            <button class="btn-icon" id="jv-play" title="Abspielen / Pause (Leertaste)">▶</button>
            <span class="jv-time" id="jv-time">0:00,0 / 0:00,0</span>
            <span class="toolbar-sep"></span>
            <button class="btn btn-ghost btn-sm" id="jv-split" title="Am Abspielkopf teilen (S)">✂ Teilen</button>
            <button class="btn btn-ghost btn-sm" id="jv-del" title="Clip löschen (Entf)">${icon('trash', 14)} Löschen</button>
            <button class="btn-icon" id="jv-left" title="Clip nach links">${icon('chevronLeft', 16)}</button>
            <button class="btn-icon" id="jv-right" title="Clip nach rechts">${icon('chevronRight', 16)}</button>
            <span class="toolbar-sep"></span>
            <button class="btn-icon" id="jv-undo" title="Rückgängig (Strg+Z)">${icon('undo', 16)}</button>
            <button class="btn-icon" id="jv-redo" title="Wiederholen (Strg+Y)">${icon('redo', 16)}</button>
            <span class="toolbar-sep"></span>
            <button class="btn btn-ghost btn-sm" id="jv-add">${icon('plus', 14)} Clip</button>
            <label class="jv-zoom">Zoom <input type="range" id="jv-zoom" min="1" max="40" value="1" class="tb-range" /></label>
          </div>
          <div class="jv-timeline" id="jv-timeline" tabindex="0">
            <div class="jv-scroll" id="jv-scroll">
              <div class="jv-ruler" id="jv-ruler"></div>
              <div class="jv-track" id="jv-track"></div>
              <div class="jv-playhead" id="jv-playhead"></div>
            </div>
          </div>
        </div>
        <aside class="jm-panel">
          <details open><summary>KI-Regie</summary>
            <textarea id="jv-prompt" rows="3" placeholder="Sag, was aus dem Video werden soll – z. B. „Pausen raus, 60 Sekunden, hochkant für TikTok, Titel: &quot;Läuft wieder&quot;“"></textarea>
            <div class="jm-row">
              <button class="btn btn-primary btn-sm" id="jv-ai-plan">Schnitt vorschlagen</button>
              <button class="btn btn-ghost btn-sm" id="jv-ai-run">Direkt fertig machen</button>
            </div>
            <p class="jm-hint" id="jv-note"></p>
          </details>
          <details open><summary>Auto-Schnitt</summary>
            <div class="jm-stack">
              <button class="btn btn-ghost btn-sm" data-an="silence">Sprechpausen entfernen</button>
              <button class="btn btn-ghost btn-sm" data-an="black">Schwarzbild entfernen</button>
              <button class="btn btn-ghost btn-sm" data-an="scenes">An Szenenwechseln teilen</button>
              <div class="jm-row">
                <button class="btn btn-ghost btn-sm" data-an="highlights">Kurzfassung auf</button>
                <input type="number" id="jv-target" value="60" min="3" max="3600" aria-label="Ziel-Länge in Sekunden" /> <span class="jm-unit">s</span>
              </div>
            </div>
            <p class="jm-hint">Gilt für den gewählten Clip – ohne Auswahl für das ganze Video.</p>
          </details>
          <details id="jv-clipbox"><summary>Gewählter Clip</summary><div id="jv-clip"></div></details>
          <details><summary>Format</summary>
            <select id="jv-preset" aria-label="Formatvorlage"></select>
            <p class="jm-hint" id="jv-preset-hint"></p>
            <label class="jm-field"><span>Wenn das Bild nicht passt</span>
              <select data-path="format.fit"><option value="contain">Schwarze Balken</option><option value="blur">Unscharfer Hintergrund</option><option value="cover">Bild füllen (schneidet Ränder ab)</option></select></label>
          </details>
          <details><summary>Bild</summary>
            <label class="jm-slider"><span>Helligkeit</span><input type="range" data-path="look.brightness" min="-0.5" max="0.5" step="0.01" /><output></output></label>
            <label class="jm-slider"><span>Kontrast</span><input type="range" data-path="look.contrast" min="0.5" max="1.8" step="0.01" /><output></output></label>
            <label class="jm-slider"><span>Sättigung</span><input type="range" data-path="look.saturation" min="0" max="2" step="0.01" /><output></output></label>
            <div class="jm-row">
              <button class="btn btn-ghost btn-sm" id="jv-rot">↻ Drehen</button>
              <label class="jm-check"><input type="checkbox" data-path="look.flipH" /> Spiegeln</label>
            </div>
            <label class="jm-check"><input type="checkbox" data-path="look.enhance" /> Farben automatisch verbessern</label>
            <label class="jm-check"><input type="checkbox" data-path="look.stabilize" /> Verwackeln ausgleichen (langsamer)</label>
            <label class="jm-check"><input type="checkbox" data-path="look.denoise" /> Bildrauschen mindern</label>
          </details>
          <details><summary>Ton & Musik</summary>
            <label class="jm-check"><input type="checkbox" data-path="audio.normalize" /> Lautstärke angleichen</label>
            <label class="jm-check"><input type="checkbox" data-path="audio.mute" /> Originalton stumm</label>
            <label class="jm-slider"><span>Lautstärke</span><input type="range" data-path="audio.volume" min="0" max="2" step="0.05" /><output></output></label>
            <div id="jv-music"></div>
          </details>
          <details><summary>Text & Blenden</summary>
            <textarea data-path="text.content" rows="2" placeholder="Titel oder Schriftzug im Bild"></textarea>
            <div class="jm-row">
              <select data-path="text.position"><option value="top">Oben</option><option value="center">Mitte</option><option value="bottom">Unten</option></select>
              <input type="color" data-path="text.color" class="tb-color" aria-label="Textfarbe" />
            </div>
            <label class="jm-slider"><span>Textgröße</span><input type="range" data-path="text.size" min="2" max="20" step="1" /><output></output></label>
            <label class="jm-slider"><span>Einblenden</span><input type="range" data-path="fadeIn" min="0" max="3" step="0.1" /><output></output></label>
            <label class="jm-slider"><span>Ausblenden</span><input type="range" data-path="fadeOut" min="0" max="3" step="0.1" /><output></output></label>
          </details>
          <details open><summary>Export</summary>
            <div class="jm-row">
              <select data-path="output.container" aria-label="Dateiformat">
                <option value="mp4">MP4 (überall abspielbar)</option><option value="webm">WebM</option>
                <option value="gif">GIF (ohne Ton)</option><option value="mp3">MP3 (nur Ton)</option></select>
              <select data-path="output.quality" aria-label="Qualität">
                <option value="high">Hoch</option><option value="medium">Mittel</option><option value="small">Klein</option></select>
            </div>
            <label class="jm-field"><span>Zielgröße in MB (0 = egal)</span><input type="number" data-path="output.targetMB" min="0" step="1" /></label>
            <label class="jm-check"><input type="checkbox" data-path="output.fast" /> Blitz-Schnitt ohne Neukodierung</label>
            <p class="jm-hint">Blitz-Schnitt ist in Sekunden fertig, auch bei 5-GB-Filmen – schneidet aber nur an Schlüsselbildern (bis ca. 2 s ungenau) und ignoriert Format, Bild, Ton und Text.</p>
            <button class="btn btn-primary jm-wide" id="jv-export">Exportieren</button>
            <button class="btn btn-ghost jm-wide" id="jv-exportshare">Exportieren & Teilen</button>
          </details>
        </aside>
      </div>`;

    const $p = s => pane.querySelector(s);
    const video = $p('#jv-video'), imgEl = $p('#jv-img'), stage = $p('#jv-stage'), wrap = $p('#jv-wrap');
    const track = $p('#jv-track'), ruler = $p('#jv-ruler'), playhead = $p('#jv-playhead'), scroll = $p('#jv-scroll');
    const timeline = $p('#jv-timeline'), msg = $p('#jv-msg'), note = $p('#jv-note');

    let p = blank(), docId = null, isDirty = false, sel = null;
    let T = 0, playing = false, cur = -1, zoom = 1, pps = 50, lastTick = 0, loadToken = 0;
    let history = [JSON.stringify(p)], redoStack = [];
    const proxy = {};                    // itemId -> 'proxy' | 'pending' | 'failed'

    // ── Zeitachsen-Rechnung ────────────────────────────────────────────────
    const segDur = s => (s.end - s.start) / s.speed;
    const total = () => p.segments.reduce((a, s) => a + segDur(s), 0);
    function locate(t) {
      let off = 0;
      for (let i = 0; i < p.segments.length; i++) {
        const d = segDur(p.segments[i]);
        if (t < off + d - 1e-6 || i === p.segments.length - 1) {
          return { i, seg: p.segments[i], off, local: p.segments[i].start + clamp(t - off, 0, d) * p.segments[i].speed };
        }
        off += d;
      }
      return null;
    }
    const newSeg = (src, start, end, speed = 1, volume = 1) => ({ id: JarvisDB.genId(), src, start, end, speed, volume });

    // ── Änderungen, Rückgängig ─────────────────────────────────────────────
    function commit() {
      const snap = JSON.stringify(p);
      if (snap !== history[history.length - 1]) {
        history.push(snap);
        if (history.length > 80) history.shift();
        redoStack = [];
        setDirty(true);
      }
      renderAll();
    }
    function setDirty(d) { isDirty = d; $p('#jv-dirty').textContent = d && p.segments.length ? '● Ungespeichert' : ''; }
    function restore(snap) {
      p = JSON.parse(snap);
      if (!p.segments.some(s => s.id === sel)) sel = null;
      T = Math.min(T, total());
      setDirty(true);
      renderAll();
    }
    function undo() { if (history.length < 2) return; redoStack.push(history.pop()); restore(history[history.length - 1]); }
    function redo() { if (!redoStack.length) return; const s = redoStack.pop(); history.push(s); restore(s); }
    function reset(project) {
      pause();
      p = project; sel = p.segments[0] ? p.segments[0].id : null; T = 0; cur = -1;
      history = [JSON.stringify(p)]; redoStack = [];
      renderAll();
    }

    // ── Vorschau-Quelle (Original oder kleine Vorschau-Datei) ──────────────
    function mediaUrl(item) {
      if (proxy[item.id] === 'proxy') return ctx.url(`/media/${item.id}/proxy`, { v: item.mtime });
      if (item.playable) return ctx.url(`/media/${item.id}`, { v: item.mtime });
      needProxy(item);
      return null;
    }
    async function needProxy(item) {
      if (proxy[item.id]) return;
      proxy[item.id] = 'pending';
      try {
        const head = await fetch(ctx.url(`/media/${item.id}/proxy`), { method: 'HEAD' });
        if (head.ok) { proxy[item.id] = 'proxy'; showFrame(true); return; }
        const job = await ctx.api('POST', '/api/proxy', { id: item.id });
        ctx.trackJob(job, done => {
          proxy[item.id] = done.state === 'done' ? 'proxy' : 'failed';
          showFrame(true);
        });
      } catch { proxy[item.id] = 'failed'; }
      showFrame(true);
    }
    video.addEventListener('error', () => {
      const loc = locate(T), item = loc && ctx.item(loc.seg.src);
      if (item && !proxy[item.id] && video.dataset.id === item.id) needProxy(item);   // Browser kann das Format nicht
    });

    // ── Bühne ──────────────────────────────────────────────────────────────
    function aspect() {
      if (p.format.width && p.format.height) return p.format.width / p.format.height;
      const first = p.segments.map(s => ctx.item(s.src)).find(i => i && i.width);
      if (!first) return 16 / 9;
      const a = first.width / first.height;
      return p.look.rotate % 180 ? 1 / a : a;
    }
    function layout() {
      const has = p.segments.length > 0;
      $p('#jv-empty').classList.toggle('hidden', has);
      stage.classList.toggle('hidden', !has);
      if (!has || !wrap.clientWidth) return;
      const a = aspect(), W = wrap.clientWidth - 24, H = wrap.clientHeight - 24;
      const w = Math.min(W, H * a), h = w / a;
      stage.style.width = w + 'px'; stage.style.height = h + 'px';
      const quarter = p.look.rotate % 180 !== 0;
      const css = `brightness(${1 + p.look.brightness}) contrast(${p.look.contrast}) saturate(${p.look.saturation})`;
      for (const m of [video, imgEl]) {
        m.style.width = (quarter ? h : w) + 'px'; m.style.height = (quarter ? w : h) + 'px';
        m.style.transform = `translate(-50%,-50%) rotate(${p.look.rotate}deg) scaleX(${p.look.flipH ? -1 : 1})`;
        m.style.objectFit = p.format.fit === 'cover' ? 'cover' : 'contain';
        m.style.filter = css;
      }
      const tx = $p('#jv-text');
      tx.textContent = p.text.content;
      tx.style.fontSize = h * p.text.size / 100 + 'px';
      tx.style.color = p.text.color;
      tx.dataset.pos = p.text.position;
      renderTimeline();
    }
    new ResizeObserver(() => { if (pane.isConnected && !pane.classList.contains('hidden')) layout(); }).observe(wrap);

    function setMsg(text) { msg.textContent = text || ''; msg.classList.toggle('hidden', !text); }

    // Zeigt das Bild zum Abspielkopf. force = Quelle neu laden.
    function showFrame(force) {
      const loc = locate(T);
      updateClock();
      if (!loc) return;
      const item = ctx.item(loc.seg.src);
      if (!item) { setMsg('Datei fehlt in der Bibliothek'); return; }
      if (item.kind === 'image') {
        video.pause();
        video.classList.add('hidden'); imgEl.classList.remove('hidden');
        const src = ctx.url(`/media/${item.id}${item.playable ? '' : '/conv'}`, { v: item.mtime });
        if (imgEl.dataset.src !== src) { imgEl.dataset.src = src; imgEl.src = src; }
        setMsg('');
        return;
      }
      imgEl.classList.add('hidden'); video.classList.remove('hidden');
      const src = mediaUrl(item);
      if (!src) {
        video.pause();
        setMsg(proxy[item.id] === 'failed' ? 'Vorschau nicht möglich – der Export funktioniert trotzdem.' : 'Vorschau wird erzeugt … (Fortschritt unter „Aufträge“)');
        return;
      }
      setMsg(item.kind === 'audio' ? '♪ Nur Ton' : '');
      video.playbackRate = clamp(loc.seg.speed, 0.0625, 16);
      video.muted = p.audio.mute;
      video.volume = clamp(loc.seg.volume * p.audio.volume, 0, 1);
      if (force || video.dataset.src !== src) {
        const token = ++loadToken, at = loc.local;
        video.dataset.src = src; video.dataset.id = item.id;
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          if (token !== loadToken) return;
          video.currentTime = at;
          if (playing) video.play().catch(() => {});
        }, { once: true });
      } else if (!playing && Math.abs(video.currentTime - loc.local) > 0.04) {
        video.currentTime = loc.local;
      }
    }

    function updateClock() {
      const tot = total();
      $p('#jv-time').textContent = `${jmDur(T).replace('.', ',')} / ${jmDur(tot).replace('.', ',')}`;
      playhead.style.left = T * pps + 'px';
      const end = p.text.end > p.text.start ? p.text.end : tot;
      $p('#jv-text').classList.toggle('hidden', !(p.text.content && T >= p.text.start && T <= end));
    }

    // ── Wiedergabe ─────────────────────────────────────────────────────────
    function enter(i, local) {
      cur = i;
      let off = 0;
      for (let k = 0; k < i; k++) off += segDur(p.segments[k]);
      T = off + (local - p.segments[i].start) / p.segments[i].speed;
      showFrame(false);
      const item = ctx.item(p.segments[i].src);
      if (item && item.kind !== 'image' && video.dataset.id === item.id && video.readyState >= 1) {
        if (Math.abs(video.currentTime - local) > 0.04) video.currentTime = local;
        video.play().catch(() => {});
      }
    }
    function play() {
      if (!p.segments.length) return;
      if (T >= total() - 0.05) T = 0;
      playing = true; $p('#jv-play').textContent = '⏸';
      const loc = locate(T);
      enter(loc.i, loc.local);
      lastTick = performance.now();
      requestAnimationFrame(tick);
    }
    function pause() {
      playing = false; $p('#jv-play').textContent = '▶';
      video.pause();
    }
    function tick(now) {
      if (!playing || !pane.isConnected) return;
      const dt = (now - lastTick) / 1000; lastTick = now;
      const seg = p.segments[cur];
      if (!seg) return pause();
      let off = 0;
      for (let k = 0; k < cur; k++) off += segDur(p.segments[k]);
      const item = ctx.item(seg.src);
      if (!item || item.kind === 'image' || !video.dataset.src || video.dataset.id !== item.id) T += dt;      // Standbild oder fehlende Vorschau: Uhr läuft weiter
      else if (video.readyState >= 2 && !video.seeking) T = off + (video.currentTime - seg.start) / seg.speed;
      if (T >= off + segDur(seg) - 0.02 || video.ended) {
        if (cur + 1 < p.segments.length) enter(cur + 1, p.segments[cur + 1].start);
        else { T = total(); pause(); }
      }
      updateClock();
      const x = T * pps;                                     // Abspielkopf im Blick halten
      if (x < timeline.scrollLeft || x > timeline.scrollLeft + timeline.clientWidth - 40) timeline.scrollLeft = Math.max(0, x - 80);
      requestAnimationFrame(tick);
    }
    function seek(t) {
      const was = playing;
      if (was) pause();
      T = clamp(t, 0, total());
      showFrame(false);
      if (was) play();
    }

    // ── Zeitachse ──────────────────────────────────────────────────────────
    function renderTimeline() {
      const tot = total();
      const fit = (timeline.clientWidth - 24) / Math.max(tot, 1);
      pps = Math.max(0.01, fit * zoom);
      scroll.style.width = Math.max(timeline.clientWidth - 2, tot * pps + 24) + 'px';
      track.innerHTML = p.segments.map(s => {
        const item = ctx.item(s.src), w = segDur(s) * pps;
        const thumb = item && item.kind !== 'audio' ? `background-image:url('${ctx.url(`/media/${item.id}/thumb`, { v: item.mtime })}')` : '';
        const wave = item && item.hasAudio && item.kind !== 'image'
          ? `background-image:url('${ctx.url(`/media/${item.id}/wave`, { v: item.mtime })}');background-size:${item.duration / s.speed * pps}px 100%;background-position:${-s.start / s.speed * pps}px 0` : '';
        return `<div class="jv-seg${s.id === sel ? ' sel' : ''}${item ? '' : ' missing'}" data-id="${s.id}" style="width:${w}px">
          <div class="jv-seg-bg" style="${thumb}"></div><div class="jv-seg-wave" style="${wave}"></div>
          <span class="jv-seg-label">${sanitize(item ? item.name : 'Datei fehlt')} · ${jmDur(segDur(s))}${s.speed !== 1 ? ` · ${s.speed}×` : ''}</span>
          <i class="jv-h jv-h-l"></i><i class="jv-h jv-h-r"></i></div>`;
      }).join('');
      const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800, 3600];
      const step = steps.find(x => x * pps >= 70) || 7200;
      let marks = '';
      for (let t = 0; t <= tot + 1e-6 && marks.length < 40000; t += step) marks += `<span style="left:${t * pps}px">${jmDur(t).replace(/\.\d$/, '')}</span>`;
      ruler.innerHTML = marks;
      updateClock();
    }

    scroll.addEventListener('pointerdown', e => {
      if (!p.segments.length) return;
      const segEl = e.target.closest('.jv-seg');
      const handle = e.target.classList.contains('jv-h') ? (e.target.classList.contains('jv-h-l') ? 'l' : 'r') : null;
      const x0 = e.clientX;
      if (handle && segEl) {                               // Clip-Rand ziehen = kürzen/verlängern
        e.preventDefault();
        pause();
        const seg = p.segments.find(s => s.id === segEl.dataset.id), item = ctx.item(seg.src);
        const max = item && item.kind !== 'image' ? item.duration : 600;
        const s0 = seg.start, e0 = seg.end;
        sel = seg.id;
        scroll.setPointerCapture(e.pointerId);
        const move = ev => {
          const d = (ev.clientX - x0) / pps * seg.speed;
          if (handle === 'l') seg.start = clamp(s0 + d, 0, e0 - 0.1);
          else seg.end = clamp(e0 + d, s0 + 0.1, max);
          segEl.style.width = segDur(seg) * pps + 'px';
          if (handle === 'l' && item && item.kind === 'image') { seg.end -= seg.start; seg.start = 0; }
          const loc = locate(T);
          if (loc && loc.seg === seg) {} // Abspielkopf bleibt
        };
        const up = () => {
          scroll.removeEventListener('pointermove', move); scroll.removeEventListener('pointerup', up);
          let off = 0;
          for (const s of p.segments) { if (s === seg) break; off += segDur(s); }
          T = handle === 'l' ? off : off + segDur(seg) - 0.05;
          commit();
        };
        scroll.addEventListener('pointermove', move);
        scroll.addEventListener('pointerup', up);
        return;
      }
      const rect = scroll.getBoundingClientRect();
      if (segEl) { sel = segEl.dataset.id; renderAll(); }
      seek((e.clientX - rect.left) / pps);
      scroll.setPointerCapture(e.pointerId);                 // Ziehen = spulen
      const move = ev => seek((ev.clientX - rect.left) / pps);
      const up = () => { scroll.removeEventListener('pointermove', move); scroll.removeEventListener('pointerup', up); };
      scroll.addEventListener('pointermove', move);
      scroll.addEventListener('pointerup', up);
    });

    // ── Schnitt-Befehle ────────────────────────────────────────────────────
    function split() {
      const loc = locate(T);
      if (!loc) return;
      const s = loc.seg, item = ctx.item(s.src);
      if (loc.local - s.start < 0.1 * s.speed || s.end - loc.local < 0.1 * s.speed) { showNotify('Zu nah am Clip-Rand zum Teilen.', 'warn'); return; }
      const a = newSeg(s.src, s.start, loc.local, s.speed, s.volume);
      const b = item && item.kind === 'image' ? newSeg(s.src, 0, s.end - loc.local, s.speed, s.volume) : newSeg(s.src, loc.local, s.end, s.speed, s.volume);
      p.segments.splice(loc.i, 1, a, b);
      sel = b.id;
      commit();
    }
    function removeSel() {
      const i = p.segments.findIndex(s => s.id === sel);
      if (i < 0) { showNotify('Erst einen Clip in der Zeitachse anklicken.', 'warn'); return; }
      pause();
      p.segments.splice(i, 1);
      sel = (p.segments[i] || p.segments[i - 1] || {}).id || null;
      T = Math.min(T, total());
      commit();
    }
    function moveSel(dir) {
      const i = p.segments.findIndex(s => s.id === sel), j = i + dir;
      if (i < 0 || j < 0 || j >= p.segments.length) return;
      [p.segments[i], p.segments[j]] = [p.segments[j], p.segments[i]];
      commit();
    }
    function addClip(item, select) {
      if (!item) return;
      if (!p.segments.length && p.name === 'Mein Video') p.name = item.name.replace(/\.[^.]+$/, '');
      const s = newSeg(item.id, 0, item.kind === 'image' ? 4 : item.duration);
      p.segments.push(s);
      if (select || !sel) { sel = s.id; T = total() - segDur(s); }
      commit();
      showFrame(false);
    }
    async function pickClip() {
      if (!ctx.connected) { showNotify('Der Medien-Dienst ist nicht verbunden.', 'error'); return; }
      addClip(await ctx.pickItem(['video', 'gif', 'image', 'audio'], 'Clip hinzufügen'), true);
    }

    $p('#jv-play').addEventListener('click', () => playing ? pause() : play());
    $p('#jv-split').addEventListener('click', split);
    $p('#jv-del').addEventListener('click', removeSel);
    $p('#jv-left').addEventListener('click', () => moveSel(-1));
    $p('#jv-right').addEventListener('click', () => moveSel(1));
    $p('#jv-undo').addEventListener('click', undo);
    $p('#jv-redo').addEventListener('click', redo);
    $p('#jv-add').addEventListener('click', pickClip);
    $p('#jv-first').addEventListener('click', pickClip);
    $p('#jv-zoom').addEventListener('input', e => { zoom = Number(e.target.value); renderTimeline(); });

    pane.addEventListener('keydown', e => {
      if (e.target.matches('input, textarea, select')) return;
      const k = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey) {
        if (k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
        if (k === 'y') { e.preventDefault(); redo(); }
        if (k === 's') { e.preventDefault(); saveProject(); }
        return;
      }
      if (k === ' ') { e.preventDefault(); playing ? pause() : play(); }
      if (k === 's') split();
      if (k === 'delete' || k === 'backspace') removeSel();
      if (k === 'arrowleft') seek(T - (e.shiftKey ? 5 : 1));
      if (k === 'arrowright') seek(T + (e.shiftKey ? 5 : 1));
      if (k === ',') seek(T - 0.04);
      if (k === '.') seek(T + 0.04);
    });

    // ── Seitenleiste ───────────────────────────────────────────────────────
    const getPath = path => path.split('.').reduce((o, k) => o[k], p);
    function setPath(path, v) {
      const keys = path.split('.'), last = keys.pop();
      keys.reduce((o, k) => o[k], p)[last] = v;
    }
    function syncPanel() {
      $p('#jv-name').value = p.name;
      pane.querySelectorAll('[data-path]').forEach(i => {
        const v = getPath(i.dataset.path);
        if (i.type === 'checkbox') i.checked = !!v; else i.value = v;
        if (i.type === 'range') i.nextElementSibling.textContent = Number(v).toFixed(i.step < 1 ? (i.step < 0.1 ? 2 : 1) : 0).replace('.', ',');
      });
      const presets = (ctx.info && ctx.info.presets) || [{ key: 'original', name: 'Original', hint: '' }];
      const ps = $p('#jv-preset');
      ps.innerHTML = presets.map(x => `<option value="${x.key}">${sanitize(x.name)}</option>`).join('');
      ps.value = p.format.preset;
      $p('#jv-preset-hint').textContent = (presets.find(x => x.key === p.format.preset) || {}).hint || '';
      const m = p.audio.music, mi = m && ctx.item(m.id);
      $p('#jv-music').innerHTML = m
        ? `<div class="jm-row"><span class="jv-music-name">♪ ${sanitize(mi ? mi.name : 'Datei fehlt')}</span><button class="btn btn-ghost btn-sm" id="jv-music-x">Entfernen</button></div>
           <label class="jm-slider"><span>Musik</span><input type="range" id="jv-music-vol" min="0" max="2" step="0.05" value="${m.volume}" /><output>${String(m.volume).replace('.', ',')}</output></label>`
        : `<button class="btn btn-ghost btn-sm" id="jv-music-add">♪ Hintergrundmusik wählen</button>`;
      renderClip();
    }
    function renderClip() {
      const s = p.segments.find(x => x.id === sel), box = $p('#jv-clip');
      if (!s) { box.innerHTML = '<p class="jm-hint">Kein Clip gewählt. In der Zeitachse anklicken.</p>'; return; }
      const item = ctx.item(s.src), still = item && item.kind === 'image';
      box.innerHTML = `
        <div class="jm-row">
          ${still ? '' : `<label class="jm-field"><span>Start (s)</span><input type="number" data-seg="start" step="0.1" min="0" value="${s.start.toFixed(2)}" /></label>`}
          <label class="jm-field"><span>${still ? 'Dauer (s)' : 'Ende (s)'}</span><input type="number" data-seg="end" step="0.1" min="0.1" value="${s.end.toFixed(2)}" /></label>
        </div>
        <label class="jm-field"><span>Tempo</span><select data-seg="speed">${SPEEDS.map(v => `<option value="${v}" ${v === s.speed ? 'selected' : ''}>${String(v).replace('.', ',')}×</option>`).join('')}</select></label>
        ${still ? '' : `<label class="jm-slider"><span>Lautstärke</span><input type="range" data-seg="volume" min="0" max="2" step="0.05" value="${s.volume}" /><output>${String(s.volume).replace('.', ',')}</output></label>`}`;
    }
    $p('#jv-clip').addEventListener('change', e => {
      const s = p.segments.find(x => x.id === sel), k = e.target.dataset.seg;
      if (!s || !k) return;
      const item = ctx.item(s.src), max = item && item.kind !== 'image' ? item.duration : 600;
      const v = Number(e.target.value) || 0;
      if (k === 'start') s.start = clamp(v, 0, s.end - 0.1);
      if (k === 'end') s.end = clamp(v, s.start + 0.1, max);
      if (k === 'speed') s.speed = v || 1;
      if (k === 'volume') s.volume = clamp(v, 0, 2);
      T = Math.min(T, total());
      commit();
    });

    pane.querySelector('.jm-panel').addEventListener('input', e => {
      const i = e.target;
      if (i.id === 'jv-music-vol' && p.audio.music) { p.audio.music.volume = Number(i.value); i.nextElementSibling.textContent = i.value.replace('.', ','); return; }
      if (!i.dataset.path) return;
      setPath(i.dataset.path, i.type === 'checkbox' ? i.checked : (i.type === 'range' || i.type === 'number') ? Number(i.value) || 0 : i.value);
      if (i.type === 'range') i.nextElementSibling.textContent = Number(i.value).toFixed(i.step < 1 ? (i.step < 0.1 ? 2 : 1) : 0).replace('.', ',');
      layout(); showFrame(false);
    });
    pane.querySelector('.jm-panel').addEventListener('change', e => {
      if (e.target.dataset.path || e.target.id === 'jv-music-vol') commit();
    });
    pane.querySelector('.jm-panel').addEventListener('click', async e => {
      if (e.target.closest('#jv-music-add')) {
        const item = await ctx.pickItem(['audio', 'video'], 'Hintergrundmusik wählen');
        if (item) { p.audio.music = { id: item.id, volume: 0.5 }; commit(); }
      }
      if (e.target.closest('#jv-music-x')) { p.audio.music = null; commit(); }
    });
    $p('#jv-name').addEventListener('input', e => { p.name = e.target.value; });
    $p('#jv-name').addEventListener('change', commit);
    $p('#jv-preset').addEventListener('change', e => {
      const pre = ctx.info.presets.find(x => x.key === e.target.value);
      p.format = { preset: pre.key, width: pre.w, height: pre.h, fit: pre.fit };
      commit();
    });
    $p('#jv-rot').addEventListener('click', () => { p.look.rotate = (p.look.rotate + 90) % 360; commit(); });

    // ── Auto-Schnitt ───────────────────────────────────────────────────────
    function targets() {
      const one = p.segments.find(s => s.id === sel);
      if (one) return [one];
      const srcs = new Set(p.segments.map(s => s.src));
      if (srcs.size === 1) return [...p.segments];
      showNotify('Mehrere Quellen in der Zeitachse – bitte erst einen Clip anklicken.', 'warn');
      return [];
    }
    pane.querySelectorAll('[data-an]').forEach(b => b.addEventListener('click', async () => {
      const segs = targets();
      if (!segs.length) { if (!p.segments.length) showNotify('Erst ein Video hinzufügen.', 'warn'); return; }
      const kind = b.dataset.an, src = segs[0].src;
      const params = kind === 'highlights' ? { target: Number($p('#jv-target').value) || 60 } : {};
      let job;
      try { job = await ctx.api('POST', '/api/analyze', { id: src, kind, params }); }
      catch (err) { showNotify(err.message, 'error'); return; }
      b.disabled = true;
      note.textContent = 'Analyse läuft …';
      ctx.trackJob(job, done => {
        b.disabled = false;
        if (done.state !== 'done') { note.textContent = ''; return; }
        const ranges = done.result.segments;
        const before = total();
        let changed = 0;
        for (const s of segs) {
          const i = p.segments.indexOf(s);
          if (i < 0) continue;                                // inzwischen gelöscht
          const parts = ranges.map(([a, z]) => [Math.max(a, s.start), Math.min(z, s.end)]).filter(([a, z]) => z - a > 0.15)
            .map(([a, z]) => newSeg(s.src, a, z, s.speed, s.volume));
          if (!parts.length) continue;
          p.segments.splice(i, 1, ...parts);
          changed++;
        }
        if (!changed) { note.textContent = 'Nichts gefunden – das Video bleibt, wie es ist.'; return; }
        sel = null; T = 0;
        commit();
        const cut = before - total();
        note.textContent = kind === 'scenes' ? `An ${p.segments.length - 1} Stellen geteilt.`
          : cut > 0.2 ? `${jmDur(cut)} herausgeschnitten, ${p.segments.length} Clips übrig.` : 'Nichts zum Herausschneiden gefunden.';
      });
    }));

    // ── KI-Regie ───────────────────────────────────────────────────────────
    async function regie(run) {
      const seg = p.segments.find(s => s.id === sel) || p.segments[0];
      if (!seg) { showNotify('Erst ein Video hinzufügen.', 'warn'); return; }
      const item = ctx.item(seg.src);
      if (!item || item.kind === 'image') { showNotify('Die Regie braucht ein Video oder eine Tondatei.', 'warn'); return; }
      let job;
      try { job = await ctx.api('POST', '/api/auto', { id: item.id, prompt: $p('#jv-prompt').value, run }); }
      catch (err) { showNotify(err.message, 'error'); return; }
      note.textContent = ctx.info.ai ? 'Die KI plant …' : 'Automatik plant (ohne KI-Schlüssel: nur Stichwörter) …';
      ctx.trackJob(job, done => {
        if (done.state !== 'done') { note.textContent = ''; return; }
        const r = done.result;
        if (run) { ctx.refresh(); note.textContent = r.notes; ctx.notifyDone(`Fertig: ${r.item.name}`, r.item, r); }
        else loadProject(r.project, r.notes);
      });
    }
    $p('#jv-ai-plan').addEventListener('click', () => regie(false));
    $p('#jv-ai-run').addEventListener('click', () => regie(true));

    // ── Export ─────────────────────────────────────────────────────────────
    async function exportNow(share) {
      if (!p.segments.length) { showNotify('Die Zeitachse ist leer.', 'warn'); return; }
      if (p.segments.some(s => !ctx.item(s.src))) { showNotify('Ein Clip verweist auf eine gelöschte Datei – bitte entfernen.', 'error'); return; }
      let job;
      try { job = await ctx.api('POST', '/api/export', { project: p }); }
      catch (err) { showNotify(err.message, 'error'); return; }
      showNotify('Export läuft – Fortschritt unten und unter „Aufträge“.', 'info');
      ctx.trackJob(job, done => {
        if (done.state !== 'done') return;
        ctx.refresh();
        if (share) ctx.share(done.result);
        else ctx.notifyDone(`Export fertig: ${done.result.name} (${jmSize(done.result.size)})`, done.result);
      });
    }
    $p('#jv-export').addEventListener('click', () => exportNow(false));
    $p('#jv-exportshare').addEventListener('click', () => exportNow(true));

    // ── Projekte ───────────────────────────────────────────────────────────
    function loadProject(project, notes) {
      const base = blank();
      const merged = { ...base, ...project };
      for (const k of ['format', 'look', 'audio', 'text', 'output']) merged[k] = { ...base[k], ...(project[k] || {}) };
      merged.segments = (project.segments || []).map(s => newSeg(s.src, Number(s.start) || 0, Number(s.end) || 0, Number(s.speed) || 1, s.volume == null ? 1 : Number(s.volume)));
      docId = null;
      reset(merged);
      setDirty(true);
      note.textContent = notes || '';
    }
    function saveProject() {
      if (!p.segments.length) { showNotify('Nichts zu speichern.', 'warn'); return; }
      if (!docId) docId = JarvisDB.genId();
      JarvisDB.saveDoc('media', docId, { title: p.name || 'Mein Video', project: p });
      setDirty(false);
      showNotify('Projekt gespeichert: ' + (p.name || 'Mein Video'), 'success');
    }
    $p('#jv-save').addEventListener('click', saveProject);
    $p('#jv-new').addEventListener('click', () => {
      if (isDirty && p.segments.length && !confirm('Aktuelles Projekt verwerfen?')) return;
      docId = null; reset(blank()); setDirty(false); note.textContent = '';
    });
    $p('#jv-open').addEventListener('click', () => {
      const docs = JarvisDB.listDocs('media');
      if (!docs.length) { showNotify('Keine gespeicherten Projekte.', 'info'); return; }
      const modal = showModal(`<h3>Projekt öffnen</h3><div class="doc-list">${docs.map(d => `
        <div class="doc-row" data-id="${sanitize(d.id)}" tabindex="0" role="button">
          <span class="doc-row-title">${sanitize(d.title)}</span>
          <span class="doc-row-date">${formatDateTime(new Date(d.modified))}</span>
          <button class="btn btn-ghost btn-sm doc-delete" aria-label="Projekt löschen">${icon('trash', 14)}</button>
        </div>`).join('')}</div><div class="modal-actions"><button class="btn btn-ghost btn-cancel">Abbrechen</button></div>`);
      modal.querySelectorAll('.doc-row').forEach(r => r.addEventListener('click', e => {
        if (e.target.closest('.doc-delete')) {
          if (confirm('Projekt löschen?')) { JarvisDB.deleteDoc('media', r.dataset.id); r.remove(); }
          return;
        }
        if (isDirty && p.segments.length && !confirm('Aktuelles Projekt verwerfen?')) return;
        const d = JarvisDB.loadDoc('media', r.dataset.id);
        modal.closest('.modal-overlay').remove();
        loadProject(d.project);
        docId = d.id; setDirty(false);
      }));
    });

    function renderAll() { syncPanel(); layout(); showFrame(false); }
    renderAll();

    return {
      addClip, loadProject, pause, layout: renderAll,
      dirty: () => isDirty && p.segments.length > 0,
      itemsChanged: renderAll,
    };
  }

  return { mount };
})();
