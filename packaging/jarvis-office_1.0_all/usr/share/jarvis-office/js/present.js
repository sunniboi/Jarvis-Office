// ===== JARVIS PRESENT =====

function initPresent(container) {
  let slides = [];
  let currentSlide = 0;
  let selectedEl = null;
  let currentDocId = null;
  let dragEl = null, dragOff = { x: 0, y: 0 };

  const THEMES = {
    dark: { bg: '#1a1a2e', text: '#e2e8f0', accent: '#7c3aed', sub: '#94a3b8' },
    light: { bg: '#ffffff', text: '#1f2937', accent: '#3b82f6', sub: '#6b7280' },
    pro: { bg: '#0f172a', text: '#f1f5f9', accent: '#10b981', sub: '#64748b' },
    warm: { bg: '#fffbeb', text: '#78350f', accent: '#d97706', sub: '#92400e' },
    minimal: { bg: '#f9fafb', text: '#111827', accent: '#6b7280', sub: '#9ca3af' },
  };

  function makeSlide(title = 'Folie', layout = 'title', theme = 'dark') {
    const t = THEMES[theme] || THEMES.dark;
    return {
      id: '_' + Math.random().toString(36).slice(2),
      layout,
      theme,
      elements: layout === 'title' ? [
        { id: 'e1', type: 'text', text: title, x: 80, y: 180, w: 800, h: 80, fontSize: 48, fontWeight: 'bold', color: t.text, align: 'center' },
        { id: 'e2', type: 'text', text: 'Untertitel', x: 80, y: 290, w: 800, h: 40, fontSize: 24, fontWeight: 'normal', color: t.sub, align: 'center' },
        { id: 'e3', type: 'rect', x: 380, y: 350, w: 200, h: 4, color: t.accent },
      ] : layout === 'content' ? [
        { id: 'e1', type: 'text', text: 'Abschnittstitel', x: 60, y: 40, w: 840, h: 50, fontSize: 32, fontWeight: 'bold', color: t.text, align: 'left' },
        { id: 'e2', type: 'text', text: '• Punkt 1\n• Punkt 2\n• Punkt 3', x: 60, y: 110, w: 500, h: 300, fontSize: 18, fontWeight: 'normal', color: t.sub, align: 'left' },
        { id: 'e3', type: 'rect', x: 60, y: 82, w: 120, h: 3, color: t.accent },
      ] : [
        { id: 'e1', type: 'text', text: title, x: 60, y: 220, w: 840, h: 60, fontSize: 36, fontWeight: 'bold', color: t.text, align: 'center' },
      ],
    };
  }

  function loadDefault() {
    slides = [
      makeSlide('Jarvis Present', 'title', 'dark'),
      makeSlide('Inhalte', 'content', 'dark'),
      makeSlide('Fazit', 'blank', 'dark'),
    ];
    currentSlide = 0;
    render();
  }

  container.innerHTML = `
    <div class="app-titlebar">
      <button class="back-btn" onclick="goHome()">←</button>
      <span class="app-title" style="color:var(--present)">📽 Jarvis Present</span>
      <span class="filename" id="present-filename">Präsentation1.jpres</span>
      <div class="titlebar-actions">
        <button class="tb-btn" onclick="presNew()">📄 Neu</button>
        <button class="tb-btn" onclick="presOpen()">📂 Öffnen</button>
        <button class="tb-btn" onclick="presSave()">💾 Speichern</button>
        <button class="tb-btn" onclick="presExport()">⬇ HTML Export</button>
        <button class="tb-btn" onclick="presPresent()">▶ Präsentieren</button>
      </div>
    </div>
    <div class="toolbar">
      <button class="tb-btn" onclick="presAddSlide('title')">+ Titelfolie</button>
      <button class="tb-btn" onclick="presAddSlide('content')">+ Inhaltsfolie</button>
      <button class="tb-btn" onclick="presAddSlide('blank')">+ Leerfolie</button>
      <button class="tb-btn" onclick="presDeleteSlide()">🗑 Folie löschen</button>
      <div class="tb-sep"></div>
      <button class="tb-btn" onclick="presAddText()">T+ Text</button>
      <button class="tb-btn" onclick="presAddRect()">□ Rechteck</button>
      <button class="tb-btn" onclick="presAddCircle()">○ Kreis</button>
      <button class="tb-btn" onclick="presAddLine()">— Linie</button>
      <button class="tb-btn" onclick="presAddImage()">🖼 Bild</button>
      <div class="tb-sep"></div>
      <select class="tb-select" id="pres-theme" style="width:90px" onchange="presChangeTheme(this.value)">
        ${Object.keys(THEMES).map(t=>`<option value="${t}">${t}</option>`).join('')}
      </select>
      <div class="tb-sep"></div>
      <button class="tb-btn" onclick="presMoveUp()">← Zurück</button>
      <button class="tb-btn" onclick="presMoveDown()">Vor →</button>
    </div>
    <div class="present-layout">
      <div class="slides-panel" id="slides-panel"></div>
      <div class="slide-editor">
        <div class="slide-canvas-wrap" id="slide-canvas-wrap">
          <div class="slide-stage" id="slide-stage" onclick="presDeselectEl(event)"></div>
        </div>
        <div class="statusbar" style="padding:6px 12px;">
          <span id="pres-slide-info">Folie 1 / 1</span>
          <span style="margin-left:auto">Doppelklick = Text bearbeiten | Drag = Verschieben</span>
        </div>
      </div>
      <div style="width:220px;background:var(--bg2);border-left:1px solid var(--border);padding:12px;overflow-y:auto;flex-shrink:0;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:10px;">Element</div>
        <div id="pres-props"><p style="color:var(--text3);font-size:12px">Kein Element ausgewählt.</p></div>
      </div>
    </div>
  `;

  function render() {
    renderThumbs();
    renderStage();
    document.getElementById('pres-slide-info').textContent = `Folie ${currentSlide+1} / ${slides.length}`;
  }

  function renderThumbs() {
    const panel = document.getElementById('slides-panel');
    panel.innerHTML = '';
    slides.forEach((slide, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'slide-thumb' + (i === currentSlide ? ' active' : '');
      thumb.style.cssText = `background:${(THEMES[slide.theme]||THEMES.dark).bg};`;
      thumb.innerHTML = `<div class="slide-thumb-content" style="font-size:9px;color:${(THEMES[slide.theme]||THEMES.dark).text};padding:4px;overflow:hidden;">${i+1}. ${slide.elements[0]?.text?.substring(0,20)||'Folie'}</div>`;
      thumb.addEventListener('click', () => { currentSlide = i; render(); });
      panel.append(thumb);
    });
  }

  function renderStage() {
    const slide = slides[currentSlide];
    if (!slide) return;
    const stage = document.getElementById('slide-stage');
    const t = THEMES[slide.theme] || THEMES.dark;
    stage.style.background = t.bg;
    stage.innerHTML = '';

    slide.elements.forEach(el => {
      const wrapper = document.createElement('div');
      wrapper.className = 'slide-element' + (el === selectedEl ? ' selected' : '');
      wrapper.style.cssText = `left:${el.x}px;top:${el.y}px;width:${el.w}px;`;
      wrapper.dataset.id = el.id;

      if (el.type === 'text') {
        const div = document.createElement('div');
        div.style.cssText = `font-size:${el.fontSize||18}px;font-weight:${el.fontWeight||'normal'};color:${el.color||t.text};text-align:${el.align||'left'};width:100%;white-space:pre-wrap;line-height:1.3;`;
        div.textContent = el.text || '';
        wrapper.append(div);
        wrapper.addEventListener('dblclick', e => { e.stopPropagation(); editTextEl(el, div); });
      } else if (el.type === 'rect') {
        wrapper.style.height = (el.h || 40) + 'px';
        wrapper.style.background = el.color || t.accent;
        wrapper.style.borderRadius = (el.radius || 0) + 'px';
      } else if (el.type === 'circle') {
        wrapper.style.height = (el.h || el.w || 100) + 'px';
        wrapper.style.background = el.fillColor || t.accent;
        wrapper.style.border = `3px solid ${el.strokeColor || t.accent}`;
        wrapper.style.borderRadius = '50%';
      } else if (el.type === 'line') {
        wrapper.style.height = '3px';
        wrapper.style.background = el.color || t.accent;
      } else if (el.type === 'image') {
        const img = document.createElement('img');
        img.src = el.src;
        img.style.width = '100%';
        img.style.height = (el.h || 200) + 'px';
        img.style.objectFit = 'cover';
        wrapper.append(img);
      }

      wrapper.addEventListener('mousedown', e => {
        e.stopPropagation();
        selectedEl = el;
        dragEl = el;
        dragOff = { x: e.clientX - el.x, y: e.clientY - el.y };
        renderStage();
        showElProps(el);
      });

      stage.append(wrapper);
    });

    // Drag
    const onMove = (e) => {
      if (!dragEl) return;
      dragEl.x = Math.max(0, e.clientX - dragOff.x);
      dragEl.y = Math.max(0, e.clientY - dragOff.y);
      renderStage();
    };
    const onUp = () => { dragEl = null; };
    stage.addEventListener('mousemove', onMove);
    stage.addEventListener('mouseup', onUp);
  }

  function editTextEl(el, div) {
    const ta = document.createElement('textarea');
    ta.value = el.text || '';
    ta.style.cssText = `width:100%;background:rgba(255,255,255,0.1);border:1px dashed ${(THEMES[slides[currentSlide]?.theme]||THEMES.dark).accent};color:${el.color};font-size:${el.fontSize}px;font-weight:${el.fontWeight};resize:none;outline:none;font-family:inherit;line-height:1.3;padding:4px;`;
    ta.rows = Math.max(1, Math.ceil((el.text||'').split('\n').length));
    div.replaceWith(ta);
    ta.focus(); ta.select();
    ta.addEventListener('blur', () => { el.text = ta.value; renderStage(); });
    ta.addEventListener('keydown', e => { if (e.key === 'Escape') { renderStage(); } });
  }

  function showElProps(el) {
    const props = document.getElementById('pres-props');
    props.innerHTML = `
      <div class="form-group"><label>Text</label><textarea id="pp-text" style="height:60px;font-size:12px;">${sanitize(el.text||'')}</textarea></div>
      ${el.type==='text'?`
      <div class="form-group"><label>Schriftgröße</label><input type="number" id="pp-fs" value="${el.fontSize||18}" min="8" max="120"/></div>
      <div class="form-group"><label>Farbe</label><input type="color" id="pp-color" value="${el.color||'#ffffff'}" style="width:50px;height:30px;border:none;cursor:pointer;"/></div>
      <div class="form-group"><label>Ausrichtung</label><select id="pp-align"><option value="left"${el.align==='left'?' selected':''}>Links</option><option value="center"${el.align==='center'?' selected':''}>Mitte</option><option value="right"${el.align==='right'?' selected':''}>Rechts</option></select></div>
      `:''}
      <div class="form-group"><label>X</label><input type="number" id="pp-x" value="${el.x}"/></div>
      <div class="form-group"><label>Y</label><input type="number" id="pp-y" value="${el.y}"/></div>
      <div class="form-group"><label>Breite</label><input type="number" id="pp-w" value="${el.w||200}"/></div>
      <div style="display:flex;gap:6px;margin-top:8px;">
        <button class="btn btn-ghost" style="flex:1;font-size:11px" onclick="presApplyProps()">Anwenden</button>
        <button class="btn btn-danger" style="font-size:11px" onclick="presDeleteEl()">🗑</button>
      </div>
    `;
  }

  window.presApplyProps = () => {
    if (!selectedEl) return;
    const t = document.getElementById('pp-text')?.value;
    if (t !== undefined) selectedEl.text = t;
    const fs = document.getElementById('pp-fs')?.value;
    if (fs) selectedEl.fontSize = +fs;
    const color = document.getElementById('pp-color')?.value;
    if (color) selectedEl.color = color;
    const align = document.getElementById('pp-align')?.value;
    if (align) selectedEl.align = align;
    const x = document.getElementById('pp-x')?.value;
    if (x !== undefined) selectedEl.x = +x;
    const y = document.getElementById('pp-y')?.value;
    if (y !== undefined) selectedEl.y = +y;
    const w = document.getElementById('pp-w')?.value;
    if (w) selectedEl.w = +w;
    renderStage();
  };

  window.presDeleteEl = () => {
    if (!selectedEl) return;
    slides[currentSlide].elements = slides[currentSlide].elements.filter(e => e !== selectedEl);
    selectedEl = null;
    render();
    document.getElementById('pres-props').innerHTML = '<p style="color:var(--text3);font-size:12px">Kein Element ausgewählt.</p>';
  };

  window.presDeselectEl = (e) => {
    if (e.target.id === 'slide-stage') { selectedEl = null; renderStage(); }
  };

  function addEl(el) {
    slides[currentSlide].elements.push({ id: '_'+Math.random().toString(36).slice(2), ...el });
    renderStage();
  }

  window.presAddText = () => addEl({ type:'text', text:'Neuer Text', x:100, y:100, w:400, h:50, fontSize:20, color:(THEMES[slides[currentSlide]?.theme]||THEMES.dark).text, align:'left' });
  window.presAddRect = () => addEl({ type:'rect', x:200, y:150, w:300, h:100, h:6, color:(THEMES[slides[currentSlide]?.theme]||THEMES.dark).accent });
  window.presAddCircle = () => addEl({ type:'circle', x:300, y:150, w:120, h:120, fillColor:(THEMES[slides[currentSlide]?.theme]||THEMES.dark).accent });
  window.presAddLine = () => addEl({ type:'line', x:100, y:300, w:760, h:3, color:(THEMES[slides[currentSlide]?.theme]||THEMES.dark).accent });

  window.presAddImage = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => addEl({ type:'image', src:ev.target.result, x:100, y:100, w:400, h:300 });
      reader.readAsDataURL(file);
    };
    input.click();
  };

  window.presAddSlide = (layout) => {
    const theme = document.getElementById('pres-theme').value || 'dark';
    slides.splice(currentSlide+1, 0, makeSlide('Neue Folie', layout, theme));
    currentSlide++;
    render();
  };

  window.presDeleteSlide = () => {
    if (slides.length <= 1) return showNotify('Letzte Folie kann nicht gelöscht werden.', 'warn');
    slides.splice(currentSlide, 1);
    currentSlide = Math.min(currentSlide, slides.length-1);
    render();
  };

  window.presChangeTheme = (theme) => {
    const t = THEMES[theme];
    if (!t) return;
    slides[currentSlide].theme = theme;
    slides[currentSlide].elements.forEach(el => {
      if (el.type === 'text') el.color = t.text;
      if (el.type === 'rect' || el.type === 'line') el.color = t.accent;
    });
    renderStage();
  };

  window.presMoveUp = () => { if (currentSlide > 0) { currentSlide--; render(); } };
  window.presMoveDown = () => { if (currentSlide < slides.length-1) { currentSlide++; render(); } };

  window.presPresent = () => {
    const win = window.open('', '_blank');
    let idx = 0;
    const renderFull = () => {
      const slide = slides[idx];
      const t = THEMES[slide.theme] || THEMES.dark;
      let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
        body{margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;font-family:sans-serif;}
        .stage{width:960px;height:540px;position:relative;background:${t.bg};border-radius:4px;overflow:hidden;}
        .el{position:absolute;}
      </style></head><body><div class="stage">`;
      slide.elements.forEach(el => {
        if (el.type === 'text') {
          html += `<div class="el" style="left:${el.x}px;top:${el.y}px;width:${el.w}px;font-size:${el.fontSize}px;font-weight:${el.fontWeight||'normal'};color:${el.color};text-align:${el.align||'left'};white-space:pre-wrap;line-height:1.3;">${sanitize(el.text||'')}</div>`;
        } else if (el.type === 'rect' || el.type === 'line') {
          html += `<div class="el" style="left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;background:${el.color||t.accent};border-radius:${el.radius||0}px;"></div>`;
        } else if (el.type === 'image') {
          html += `<div class="el" style="left:${el.x}px;top:${el.y}px;width:${el.w}px;"><img src="${el.src}" style="width:100%;height:${el.h}px;object-fit:cover;"/></div>`;
        }
      });
      html += `</div><script>
        document.addEventListener('keydown', e => {
          if (e.key==='ArrowRight'||e.key==='ArrowDown'||e.key===' ') { window.parent && window.parent.presNextSlide ? window.parent.presNextSlide() : document.dispatchEvent(new Event('next')); }
          if (e.key==='ArrowLeft'||e.key==='ArrowUp') { window.parent && window.parent.presPrevSlide ? window.parent.presPrevSlide() : document.dispatchEvent(new Event('prev')); }
          if (e.key==='Escape') window.close();
        });
        document.addEventListener('click', ()=>document.dispatchEvent(new Event('next')));
      <\/script></body></html>`;
      win.document.open();
      win.document.write(html);
      win.document.close();
    };
    renderFull();
  };

  window.presSave = () => {
    const id = currentDocId || JarvisDB.genId();
    currentDocId = id;
    const name = document.getElementById('present-filename').textContent;
    JarvisDB.saveDoc('present', id, { name, slides });
    showNotify('Gespeichert.', 'success');
  };

  window.presNew = () => { currentDocId = null; loadDefault(); document.getElementById('present-filename').textContent = 'Präsentation1.jpres'; };

  window.presOpen = () => {
    const docs = JarvisDB.listDocs('present');
    if (!docs.length) return showNotify('Keine gespeicherten Präsentationen.', 'warn');
    const items = docs.map(d=>`<div class="sidebar-item" data-id="${d.id}" style="cursor:pointer">${d.name} — <small>${new Date(d.modified).toLocaleString('de-DE')}</small></div>`).join('');
    showModal(`<h3>📂 Öffnen</h3><div style="max-height:300px;overflow-y:auto">${items}</div><div class="modal-actions"><button class="btn btn-ghost btn-cancel">Abbrechen</button></div>`, null);
    setTimeout(()=>{
      $$('.sidebar-item[data-id]').forEach(item => item.addEventListener('click', () => {
        const doc = JarvisDB.loadDoc('present', item.dataset.id);
        if (doc) { currentDocId=doc.id; slides=doc.slides||[]; currentSlide=0; render(); document.querySelector('.modal-overlay')?.remove(); }
      }));
    }, 50);
  };

  window.presExport = () => {
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Präsentation</title><style>
      body{font-family:sans-serif;margin:0;background:#111;}
      .slide{width:960px;height:540px;margin:20px auto;position:relative;overflow:hidden;page-break-after:always;}
      .el{position:absolute;}
      @media print{.slide{margin:0;page-break-after:always;}}
    </style></head><body>`;
    slides.forEach((slide, i) => {
      const t = THEMES[slide.theme] || THEMES.dark;
      html += `<div class="slide" style="background:${t.bg}">`;
      slide.elements.forEach(el => {
        if (el.type === 'text') html += `<div class="el" style="left:${el.x}px;top:${el.y}px;width:${el.w}px;font-size:${el.fontSize}px;font-weight:${el.fontWeight||'normal'};color:${el.color};text-align:${el.align||'left'};white-space:pre-wrap;">${sanitize(el.text||'')}</div>`;
        else if (el.type === 'rect'||el.type==='line') html += `<div class="el" style="left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h||4}px;background:${el.color||t.accent};"></div>`;
      });
      html += '</div>';
    });
    html += '</body></html>';
    downloadFile(html, 'praesentation.html', 'text/html');
  };

  loadDefault();
}
