// ===== JARVIS DRAW =====

function initDraw(container) {
  let tool = 'select';
  let isDrawing = false;
  let startX, startY;
  let strokeColor = '#7c3aed';
  let fillColor = '#a78bfa';
  let lineWidth = 2;
  let opacity = 1;
  let elements = [];
  let selectedEl = null;
  let history = [];
  let redoStack = [];
  let currentDocId = null;
  let canvasW = 1200, canvasH = 800;
  let offset = { x: 0, y: 0 };
  let dragEl = null, dragOff = { x: 0, y: 0 };
  let textInput = null;

  container.innerHTML = `
    <div class="app-titlebar">
      <button class="back-btn" onclick="goHome()">←</button>
      <span class="app-title" style="color:var(--draw)">🎨 Jarvis Draw</span>
      <span class="filename" id="draw-filename">Zeichnung1.jdraw</span>
      <div class="titlebar-actions">
        <button class="tb-btn" onclick="drawNew()">📄 Neu</button>
        <button class="tb-btn" onclick="drawOpen()">📂 Öffnen</button>
        <button class="tb-btn" onclick="drawSave()">💾 Speichern</button>
        <button class="tb-btn" onclick="drawExportSVG()">⬇ SVG</button>
        <button class="tb-btn" onclick="drawExportPNG()">⬇ PNG</button>
      </div>
    </div>
    <div class="toolbar">
      <button class="tb-btn" onclick="drawUndo()">↩ Rückgängig</button>
      <button class="tb-btn" onclick="drawRedo()">↪ Wiederholen</button>
      <div class="tb-sep"></div>
      <button class="tb-btn" onclick="drawClear()" title="Alles löschen">🗑 Leeren</button>
      <button class="tb-btn" onclick="drawDeleteSelected()" title="Auswahl löschen">✕ Löschen</button>
      <button class="tb-btn" onclick="drawBringFront()">▲ Vorne</button>
      <button class="tb-btn" onclick="drawSendBack()">▼ Hinten</button>
      <button class="tb-btn" onclick="drawDuplicate()">⧉ Duplizieren</button>
      <button class="tb-btn" onclick="drawGroup()">⊞ Gruppe</button>
      <div class="tb-sep"></div>
      <label style="color:var(--text2);font-size:12px">Strich:</label>
      <input type="color" id="draw-stroke" value="#7c3aed" style="width:24px;height:24px;border:none;background:none;cursor:pointer;padding:0;" />
      <label style="color:var(--text2);font-size:12px">Füllung:</label>
      <input type="color" id="draw-fill" value="#a78bfa" style="width:24px;height:24px;border:none;background:none;cursor:pointer;padding:0;" />
      <label style="color:var(--text2);font-size:12px">Breite:</label>
      <input type="range" id="draw-linewidth" min="1" max="20" value="2" style="width:70px;" />
      <label style="color:var(--text2);font-size:12px">Transparenz:</label>
      <input type="range" id="draw-opacity" min="10" max="100" value="100" style="width:70px;" />
    </div>
    <div class="draw-layout">
      <div class="draw-tools">
        ${[
          ['select','↖','Auswahl'],
          ['pen','✏','Freihand'],
          ['rect','□','Rechteck'],
          ['circle','○','Ellipse'],
          ['line','╱','Linie'],
          ['arrow','→','Pfeil'],
          ['text','T','Text'],
          ['poly','⬠','Polygon'],
          ['star','★','Stern'],
          ['triangle','▲','Dreieck'],
          ['eraser','⌫','Radierer'],
          ['fill','🪣','Füllen'],
          ['zoom+','🔍','Zoom +'],
          ['zoom-','🔎','Zoom -'],
        ].map(([t,i,n])=>`<button class="draw-tool-btn${t===tool?' active':''}" data-tool="${t}" title="${n}" onclick="drawSetTool('${t}')">${i}</button>`).join('')}
        <div style="margin-top:auto;padding:4px;border-top:1px solid var(--border);width:100%"></div>
        ${['#ef4444','#f97316','#f59e0b','#22c55e','#3b82f6','#7c3aed','#ec4899','#000000','#ffffff'].map(c=>`<div style="width:24px;height:24px;background:${c};border-radius:3px;margin:2px;cursor:pointer;border:2px solid transparent;" onclick="drawSetStrokeColor('${c}')" title="${c}"></div>`).join('')}
      </div>
      <div class="draw-canvas-wrap" id="draw-canvas-wrap">
        <canvas id="draw-canvas" width="${canvasW}" height="${canvasH}"></canvas>
      </div>
      <div class="draw-props" id="draw-props">
        <h4>Eigenschaften</h4>
        <div id="draw-props-content"><p style="color:var(--text3);font-size:12px">Kein Element ausgewählt.</p></div>
      </div>
    </div>
    <div class="statusbar">
      <span id="draw-info">Werkzeug: Auswahl</span>
      <span id="draw-coords">X: 0 Y: 0</span>
      <span id="draw-elcount">Elemente: 0</span>
      <span style="margin-left:auto" id="draw-zoom">Zoom: 100%</span>
    </div>
  `;

  const canvas = document.getElementById('draw-canvas');
  const ctx = canvas.getContext('2d');
  let zoom = 1;
  let tempPath = null;
  let polyPoints = [];

  document.getElementById('draw-stroke').addEventListener('input', e => { strokeColor = e.target.value; redrawSelected(); });
  document.getElementById('draw-fill').addEventListener('input', e => { fillColor = e.target.value; redrawSelected(); });
  document.getElementById('draw-linewidth').addEventListener('input', e => { lineWidth = +e.target.value; redrawSelected(); });
  document.getElementById('draw-opacity').addEventListener('input', e => { opacity = +e.target.value / 100; redrawSelected(); });

  function redrawSelected() {
    if (selectedEl) {
      selectedEl.strokeColor = strokeColor;
      selectedEl.fillColor = fillColor;
      selectedEl.lineWidth = lineWidth;
      selectedEl.opacity = opacity;
      redraw();
    }
  }

  window.drawSetTool = (t) => {
    tool = t;
    $$('.draw-tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
    document.getElementById('draw-info').textContent = `Werkzeug: ${t}`;
    polyPoints = [];
    if (t === 'zoom+') { zoom = Math.min(3, zoom + 0.2); applyZoom(); }
    if (t === 'zoom-') { zoom = Math.max(0.3, zoom - 0.2); applyZoom(); }
  };

  window.drawSetStrokeColor = (c) => {
    strokeColor = c;
    document.getElementById('draw-stroke').value = c;
    redrawSelected();
  };

  function applyZoom() {
    canvas.style.transform = `scale(${zoom})`;
    canvas.style.transformOrigin = 'top left';
    document.getElementById('draw-zoom').textContent = `Zoom: ${Math.round(zoom*100)}%`;
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom
    };
  }

  canvas.addEventListener('mousemove', e => {
    const p = getPos(e);
    document.getElementById('draw-coords').textContent = `X: ${Math.round(p.x)} Y: ${Math.round(p.y)}`;
    if (dragEl) {
      dragEl.x = p.x - dragOff.x;
      dragEl.y = p.y - dragOff.y;
      redraw();
      return;
    }
    if (!isDrawing) return;
    tempPath = { ...buildShape(p), temp: true };
    redraw();
    drawEl(tempPath, true);
  });

  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    const p = getPos(e);
    if (tool === 'select') {
      // Hit test
      const hit = [...elements].reverse().find(el => hitTest(el, p));
      selectedEl = hit || null;
      if (hit) {
        dragEl = hit;
        dragOff = { x: p.x - hit.x, y: p.y - hit.y };
        showProps(hit);
      } else {
        showProps(null);
      }
      redraw();
      return;
    }
    if (tool === 'eraser') {
      elements = elements.filter(el => !hitTest(el, p));
      redraw();
      return;
    }
    if (tool === 'fill') {
      const hit = [...elements].reverse().find(el => hitTest(el, p));
      if (hit) { hit.fillColor = fillColor; redraw(); }
      return;
    }
    if (tool === 'text') {
      addText(p);
      return;
    }
    if (tool === 'poly') {
      if (polyPoints.length && Math.abs(p.x - polyPoints[0].x) < 10 && Math.abs(p.y - polyPoints[0].y) < 10) {
        const el = { id: uid(), type: 'poly', points: [...polyPoints], strokeColor, fillColor, lineWidth, opacity, x: 0, y: 0 };
        pushHistory();
        elements.push(el);
        polyPoints = [];
        redraw();
      } else {
        polyPoints.push(p);
        redraw();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, 2*Math.PI);
        ctx.fillStyle = strokeColor;
        ctx.fill();
      }
      return;
    }
    isDrawing = true;
    startX = p.x; startY = p.y;
  });

  canvas.addEventListener('mouseup', e => {
    if (dragEl) { dragEl = null; pushHistory(); return; }
    if (!isDrawing) return;
    isDrawing = false;
    const p = getPos(e);
    if (tool === 'pen') {
      if (tempPath && tempPath.points?.length > 1) { pushHistory(); elements.push({ ...tempPath, id: uid(), temp: false }); }
    } else {
      const shape = buildShape(p);
      if (Math.abs(shape.w || shape.r2 || 10) > 3 || Math.abs(shape.h || 10) > 3) {
        pushHistory();
        elements.push({ id: uid(), ...shape, temp: false });
      }
    }
    tempPath = null;
    redraw();
    document.getElementById('draw-elcount').textContent = `Elemente: ${elements.length}`;
  });

  // Pen path
  let penPath = [];
  canvas.addEventListener('mousemove', e => {
    if (!isDrawing || tool !== 'pen') return;
    const p = getPos(e);
    penPath.push(p);
    tempPath = { type: 'pen', points: [...penPath], strokeColor, lineWidth, opacity, x: 0, y: 0 };
  });
  canvas.addEventListener('mousedown', e => {
    if (tool === 'pen') penPath = [getPos(e)];
  });

  function buildShape(p) {
    const x = Math.min(startX, p.x), y = Math.min(startY, p.y);
    const w = Math.abs(p.x - startX), h = Math.abs(p.y - startY);
    const base = { strokeColor, fillColor, lineWidth, opacity, x, y, w, h };
    switch (tool) {
      case 'rect': return { type: 'rect', ...base };
      case 'circle': return { type: 'ellipse', cx: startX+(p.x-startX)/2, cy: startY+(p.y-startY)/2, rx: w/2, ry: h/2, ...base };
      case 'line': return { type: 'line', x1: startX, y1: startY, x2: p.x, y2: p.y, ...base };
      case 'arrow': return { type: 'arrow', x1: startX, y1: startY, x2: p.x, y2: p.y, ...base };
      case 'triangle': return { type: 'triangle', x1: x+w/2, y1, x2: x, y2: y+h, x3: x+w, y3: y+h, ...base };
      case 'star': return { type: 'star', cx: startX+(p.x-startX)/2, cy: startY+(p.y-startY)/2, r: Math.min(w,h)/2, ...base };
      default: return { type: 'rect', ...base };
    }
  }

  function drawEl(el, isTemp = false) {
    ctx.save();
    ctx.globalAlpha = el.opacity ?? 1;
    ctx.strokeStyle = el.strokeColor || '#000';
    ctx.fillStyle = el.fillColor || 'transparent';
    ctx.lineWidth = el.lineWidth || 2;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    switch (el.type) {
      case 'rect':
        ctx.beginPath(); ctx.rect(el.x, el.y, el.w, el.h);
        if (el.fillColor !== 'transparent') ctx.fill();
        ctx.stroke();
        break;
      case 'ellipse':
        ctx.beginPath(); ctx.ellipse(el.cx, el.cy, Math.max(1,el.rx), Math.max(1,el.ry), 0, 0, 2*Math.PI);
        if (el.fillColor !== 'transparent') ctx.fill();
        ctx.stroke();
        break;
      case 'line':
        ctx.beginPath(); ctx.moveTo(el.x1, el.y1); ctx.lineTo(el.x2, el.y2); ctx.stroke();
        break;
      case 'arrow': {
        ctx.beginPath(); ctx.moveTo(el.x1, el.y1); ctx.lineTo(el.x2, el.y2); ctx.stroke();
        const angle = Math.atan2(el.y2-el.y1, el.x2-el.x1);
        const al = 14, aw = 0.5;
        ctx.beginPath();
        ctx.moveTo(el.x2, el.y2);
        ctx.lineTo(el.x2 - al*Math.cos(angle-aw), el.y2 - al*Math.sin(angle-aw));
        ctx.lineTo(el.x2 - al*Math.cos(angle+aw), el.y2 - al*Math.sin(angle+aw));
        ctx.closePath(); ctx.fill();
        break;
      }
      case 'pen':
        if (!el.points?.length) break;
        ctx.beginPath(); ctx.moveTo(el.points[0].x, el.points[0].y);
        el.points.forEach(pt => ctx.lineTo(pt.x, pt.y));
        ctx.stroke();
        break;
      case 'text':
        ctx.font = `${el.fontSize||16}px ${el.fontFamily||'sans-serif'}`;
        ctx.fillStyle = el.strokeColor || '#000';
        ctx.fillText(el.text || '', el.x, el.y);
        break;
      case 'triangle':
        ctx.beginPath(); ctx.moveTo(el.x1, el.y1); ctx.lineTo(el.x2, el.y2); ctx.lineTo(el.x3, el.y3); ctx.closePath();
        if (el.fillColor !== 'transparent') ctx.fill(); ctx.stroke();
        break;
      case 'star': {
        const r2 = el.r * 0.4, pts = 5;
        ctx.beginPath();
        for (let i = 0; i < pts*2; i++) {
          const angle = (i*Math.PI/pts) - Math.PI/2;
          const r = i%2===0 ? el.r : r2;
          ctx[i===0?'moveTo':'lineTo'](el.cx + r*Math.cos(angle), el.cy + r*Math.sin(angle));
        }
        ctx.closePath();
        if (el.fillColor !== 'transparent') ctx.fill(); ctx.stroke();
        break;
      }
      case 'poly':
        if (!el.points?.length) break;
        ctx.beginPath(); ctx.moveTo(el.points[0].x, el.points[0].y);
        el.points.forEach(pt => ctx.lineTo(pt.x, pt.y));
        ctx.closePath();
        if (el.fillColor !== 'transparent') ctx.fill(); ctx.stroke();
        break;
    }

    // Selection indicator
    if (!isTemp && el === selectedEl) {
      ctx.save();
      ctx.strokeStyle = 'rgba(124,58,237,0.8)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      const b = getBounds(el);
      ctx.strokeRect(b.x-4, b.y-4, b.w+8, b.h+8);
      ctx.restore();
    }
    ctx.restore();
  }

  function getBounds(el) {
    switch (el.type) {
      case 'ellipse': return { x: el.cx-el.rx, y: el.cy-el.ry, w: el.rx*2, h: el.ry*2 };
      case 'line': case 'arrow': return { x: Math.min(el.x1,el.x2), y: Math.min(el.y1,el.y2), w: Math.abs(el.x2-el.x1), h: Math.abs(el.y2-el.y1) };
      case 'pen': {
        const xs = el.points.map(p=>p.x), ys = el.points.map(p=>p.y);
        return { x:Math.min(...xs), y:Math.min(...ys), w:Math.max(...xs)-Math.min(...xs), h:Math.max(...ys)-Math.min(...ys) };
      }
      case 'text': return { x: el.x, y: el.y - (el.fontSize||16), w: 200, h: el.fontSize||16 };
      case 'triangle': {
        const xs=[el.x1,el.x2,el.x3], ys=[el.y1,el.y2,el.y3];
        return { x:Math.min(...xs), y:Math.min(...ys), w:Math.max(...xs)-Math.min(...xs), h:Math.max(...ys)-Math.min(...ys) };
      }
      case 'star': return { x: el.cx-el.r, y: el.cy-el.r, w: el.r*2, h: el.r*2 };
      case 'poly': {
        const xs=el.points.map(p=>p.x), ys=el.points.map(p=>p.y);
        return { x:Math.min(...xs), y:Math.min(...ys), w:Math.max(...xs)-Math.min(...xs), h:Math.max(...ys)-Math.min(...ys) };
      }
      default: return { x: el.x, y: el.y, w: el.w, h: el.h };
    }
  }

  function hitTest(el, p) {
    const b = getBounds(el);
    const pad = Math.max(8, el.lineWidth || 2);
    return p.x >= b.x-pad && p.x <= b.x+b.w+pad && p.y >= b.y-pad && p.y <= b.y+b.h+pad;
  }

  function redraw() {
    ctx.clearRect(0, 0, canvasW, canvasH);
    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);
    // Grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= canvasW; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasH); ctx.stroke(); }
    for (let y = 0; y <= canvasH; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasW, y); ctx.stroke(); }
    elements.forEach(el => drawEl(el));
    if (tempPath) drawEl(tempPath, true);
    // Poly preview
    if (polyPoints.length) {
      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([4,4]);
      ctx.beginPath();
      ctx.moveTo(polyPoints[0].x, polyPoints[0].y);
      polyPoints.forEach(pt => ctx.lineTo(pt.x, pt.y));
      ctx.stroke();
      ctx.restore();
    }
  }

  function addText(p) {
    const text = prompt('Text eingeben:');
    if (!text) return;
    pushHistory();
    elements.push({ id: uid(), type: 'text', text, x: p.x, y: p.y, fontSize: 16, fontFamily: 'sans-serif', strokeColor, lineWidth, opacity, w: 0, h: 0 });
    redraw();
  }

  function showProps(el) {
    const content = document.getElementById('draw-props-content');
    if (!el) { content.innerHTML = '<p style="color:var(--text3);font-size:12px">Kein Element ausgewählt.</p>'; return; }
    content.innerHTML = `
      <div class="prop-row"><span>Typ</span><span>${el.type}</span></div>
      <div class="prop-row"><span>Strich</span><input type="color" value="${el.strokeColor}" oninput="drawEl_stroke(this.value)" style="width:28px;height:20px;border:none;cursor:pointer;"/></div>
      <div class="prop-row"><span>Füllung</span><input type="color" value="${el.fillColor||'#ffffff'}" oninput="drawEl_fill(this.value)" style="width:28px;height:20px;border:none;cursor:pointer;"/></div>
      <div class="prop-row"><span>Breite</span><input type="range" min="1" max="20" value="${el.lineWidth||2}" oninput="drawEl_lw(this.value)" style="width:80px;"/></div>
      ${el.type==='text'?`<div class="prop-row"><span>Text</span><input type="text" value="${sanitize(el.text)}" oninput="drawEl_text(this.value)" style="width:80px;font-size:11px;"/></div>`:'' }
      ${el.type==='text'?`<div class="prop-row"><span>Größe</span><input type="number" value="${el.fontSize||16}" oninput="drawEl_fs(this.value)" style="width:50px;font-size:11px;"/></div>`:'' }
    `;
  }

  window.drawEl_stroke = v => { if (selectedEl) { selectedEl.strokeColor = v; redraw(); } };
  window.drawEl_fill = v => { if (selectedEl) { selectedEl.fillColor = v; redraw(); } };
  window.drawEl_lw = v => { if (selectedEl) { selectedEl.lineWidth = +v; redraw(); } };
  window.drawEl_text = v => { if (selectedEl && selectedEl.type==='text') { selectedEl.text = v; redraw(); } };
  window.drawEl_fs = v => { if (selectedEl && selectedEl.type==='text') { selectedEl.fontSize = +v; redraw(); } };

  function pushHistory() {
    history.push(JSON.parse(JSON.stringify(elements)));
    if (history.length > 50) history.shift();
    redoStack = [];
  }

  function uid() { return '_' + Math.random().toString(36).slice(2, 9); }

  window.drawUndo = () => {
    if (!history.length) return;
    redoStack.push(JSON.parse(JSON.stringify(elements)));
    elements = history.pop();
    selectedEl = null; redraw();
  };
  window.drawRedo = () => {
    if (!redoStack.length) return;
    history.push(JSON.parse(JSON.stringify(elements)));
    elements = redoStack.pop();
    selectedEl = null; redraw();
  };
  window.drawClear = () => {
    if (!confirm('Alles löschen?')) return;
    pushHistory(); elements = []; selectedEl = null; redraw();
  };
  window.drawDeleteSelected = () => {
    if (!selectedEl) return;
    pushHistory();
    elements = elements.filter(e => e !== selectedEl);
    selectedEl = null; redraw(); showProps(null);
  };
  window.drawBringFront = () => {
    if (!selectedEl) return;
    elements = elements.filter(e => e !== selectedEl);
    elements.push(selectedEl); redraw();
  };
  window.drawSendBack = () => {
    if (!selectedEl) return;
    elements = elements.filter(e => e !== selectedEl);
    elements.unshift(selectedEl); redraw();
  };
  window.drawDuplicate = () => {
    if (!selectedEl) return;
    const dup = { ...JSON.parse(JSON.stringify(selectedEl)), id: uid(), x: selectedEl.x+20, y: selectedEl.y+20 };
    elements.push(dup); selectedEl = dup; redraw();
  };
  window.drawGroup = () => showNotify('Gruppierung: wähle Elemente mit Shift+Click (coming soon).', 'info');

  window.drawSave = () => {
    const id = currentDocId || JarvisDB.genId();
    currentDocId = id;
    const name = document.getElementById('draw-filename').textContent;
    JarvisDB.saveDoc('draw', id, { name, elements });
    showNotify('Gespeichert.', 'success');
  };

  window.drawNew = () => {
    currentDocId = null; elements = []; selectedEl = null; redraw();
    document.getElementById('draw-filename').textContent = 'Zeichnung1.jdraw';
  };

  window.drawOpen = () => {
    const docs = JarvisDB.listDocs('draw');
    if (!docs.length) return showNotify('Keine gespeicherten Zeichnungen.', 'warn');
    const items = docs.map(d=>`<div class="sidebar-item" data-id="${d.id}" style="cursor:pointer">${d.name} — <small>${new Date(d.modified).toLocaleString('de-DE')}</small></div>`).join('');
    showModal(`<h3>📂 Öffnen</h3><div style="max-height:300px;overflow-y:auto">${items}</div><div class="modal-actions"><button class="btn btn-ghost btn-cancel">Abbrechen</button></div>`, null);
    setTimeout(()=>{
      $$('.sidebar-item[data-id]').forEach(item => item.addEventListener('click', () => {
        const doc = JarvisDB.loadDoc('draw', item.dataset.id);
        if (doc) { currentDocId=doc.id; elements=doc.elements||[]; redraw(); document.querySelector('.modal-overlay')?.remove(); }
      }));
    }, 50);
  };

  window.drawExportSVG = () => {
    let svgEls = '';
    elements.forEach(el => {
      const stroke = el.strokeColor || '#000';
      const fill = el.fillColor !== 'transparent' ? el.fillColor : 'none';
      const lw = el.lineWidth || 2;
      const op = el.opacity ?? 1;
      const base = `stroke="${stroke}" fill="${fill}" stroke-width="${lw}" opacity="${op}"`;
      switch (el.type) {
        case 'rect': svgEls += `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" ${base}/>`; break;
        case 'ellipse': svgEls += `<ellipse cx="${el.cx}" cy="${el.cy}" rx="${el.rx}" ry="${el.ry}" ${base}/>`; break;
        case 'line': svgEls += `<line x1="${el.x1}" y1="${el.y1}" x2="${el.x2}" y2="${el.y2}" ${base}/>`; break;
        case 'text': svgEls += `<text x="${el.x}" y="${el.y}" font-size="${el.fontSize||16}" fill="${stroke}">${sanitize(el.text||'')}</text>`; break;
        case 'pen': svgEls += `<polyline points="${el.points.map(p=>`${p.x},${p.y}`).join(' ')}" ${base} fill="none"/>`; break;
      }
    });
    const svg = `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}">${svgEls}</svg>`;
    downloadFile(svg, 'zeichnung.svg', 'image/svg+xml');
  };

  window.drawExportPNG = () => {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'zeichnung.png';
    a.click();
  };

  redraw();
}
