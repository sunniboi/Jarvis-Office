// ===== JARVIS WRITE =====

function initWrite(container) {
  const docId = JarvisDB.genId();
  let currentDocId = null;
  let wordCount = 0;

  container.innerHTML = `
    <div class="app-titlebar">
      <button class="back-btn" onclick="goHome()" title="Zurück zum Launcher">←</button>
      <span class="app-title" style="color:var(--write)">✍ Jarvis Write</span>
      <span class="filename" id="write-filename">Unbenannt.jdoc</span>
      <div class="titlebar-actions">
        <button class="tb-btn" onclick="writeNew()" title="Neu">📄 Neu</button>
        <button class="tb-btn" onclick="writeOpen()" title="Öffnen">📂 Öffnen</button>
        <button class="tb-btn" onclick="writeSave()" title="Speichern (Strg+S)">💾 Speichern</button>
        <button class="tb-btn" onclick="writeExport()" title="Exportieren">⬇ Export</button>
        <button class="tb-btn" onclick="writePrint()" title="Drucken">🖨 Drucken</button>
      </div>
    </div>
    <div class="toolbar">
      <select class="tb-select" id="write-font" title="Schriftart" style="width:130px">
        <option value="Georgia">Georgia</option>
        <option value="Arial">Arial</option>
        <option value="Times New Roman">Times New Roman</option>
        <option value="Helvetica">Helvetica</option>
        <option value="Courier New">Courier New</option>
        <option value="Verdana">Verdana</option>
      </select>
      <select class="tb-select" id="write-size" title="Schriftgröße" style="width:60px">
        ${[8,9,10,11,12,14,16,18,20,22,24,28,32,36,48,72].map(s=>`<option value="${s}"${s===14?' selected':''}>${s}</option>`).join('')}
      </select>
      <div class="tb-sep"></div>
      <button class="tb-btn" onclick="writeCmd('bold')" title="Fett (Strg+B)"><b>B</b></button>
      <button class="tb-btn" onclick="writeCmd('italic')" title="Kursiv (Strg+I)"><i>I</i></button>
      <button class="tb-btn" onclick="writeCmd('underline')" title="Unterstrichen (Strg+U)"><u>U</u></button>
      <button class="tb-btn" onclick="writeCmd('strikeThrough')" title="Durchgestrichen"><s>S</s></button>
      <div class="tb-sep"></div>
      <button class="tb-btn" onclick="writeCmd('justifyLeft')" title="Linksbündig">⬅</button>
      <button class="tb-btn" onclick="writeCmd('justifyCenter')" title="Zentriert">↔</button>
      <button class="tb-btn" onclick="writeCmd('justifyRight')" title="Rechtsbündig">➡</button>
      <button class="tb-btn" onclick="writeCmd('justifyFull')" title="Blocksatz">▬</button>
      <div class="tb-sep"></div>
      <button class="tb-btn" onclick="writeCmd('insertUnorderedList')" title="Aufzählung">• Liste</button>
      <button class="tb-btn" onclick="writeCmd('insertOrderedList')" title="Nummerierte Liste">1. Liste</button>
      <div class="tb-sep"></div>
      <select class="tb-select" id="write-heading" title="Überschrift" style="width:110px">
        <option value="p">Absatz</option>
        <option value="h1">Überschrift 1</option>
        <option value="h2">Überschrift 2</option>
        <option value="h3">Überschrift 3</option>
        <option value="h4">Überschrift 4</option>
        <option value="pre">Code</option>
        <option value="blockquote">Zitat</option>
      </select>
      <div class="tb-sep"></div>
      <button class="tb-btn" onclick="writeInsertTable()" title="Tabelle einfügen">⊞ Tabelle</button>
      <button class="tb-btn" onclick="writeInsertHR()" title="Trennlinie">— Linie</button>
      <button class="tb-btn" onclick="writeInsertLink()" title="Link einfügen">🔗 Link</button>
      <div class="tb-sep"></div>
      <input type="color" id="write-fgcolor" value="#000000" title="Schriftfarbe" style="width:28px;height:28px;border:none;background:none;cursor:pointer;padding:0;" />
      <input type="color" id="write-bgcolor" value="#ffff00" title="Hintergrundfarbe" style="width:28px;height:28px;border:none;background:none;cursor:pointer;padding:0;" />
      <div class="tb-sep"></div>
      <button class="tb-btn" onclick="writeCmd('undo')" title="Rückgängig">↩</button>
      <button class="tb-btn" onclick="writeCmd('redo')" title="Wiederholen">↪</button>
      <div class="tb-sep"></div>
      <button class="tb-btn" onclick="writeFindReplace()" title="Suchen & Ersetzen">🔍 Suchen</button>
    </div>
    <div class="write-layout">
      <div class="write-body">
        <div class="write-page" id="write-page" contenteditable="true" spellcheck="true">
          <h1>Willkommen bei Jarvis Write</h1>
          <p>Beginne hier mit deinem Dokument. Verwende die Werkzeuge oben zur Formatierung.</p>
        </div>
      </div>
    </div>
    <div class="statusbar">
      <span id="write-wordcount">Wörter: 0</span>
      <span id="write-charcount">Zeichen: 0</span>
      <span id="write-saved">✓ Gespeichert</span>
      <span style="margin-left:auto">Seite 1</span>
    </div>
  `;

  const page = document.getElementById('write-page');

  // Font/size change
  document.getElementById('write-font').addEventListener('change', e => {
    writeCmd('fontName', e.target.value);
    page.focus();
  });
  document.getElementById('write-size').addEventListener('change', e => {
    writeCmd('fontSize', '7');
    const sel = window.getSelection();
    if (sel.rangeCount) {
      const range = sel.getRangeAt(0);
      const spans = range.cloneContents().querySelectorAll('[size="7"]');
      document.querySelectorAll('.write-page [size="7"]').forEach(s => {
        s.removeAttribute('size');
        s.style.fontSize = e.target.value + 'pt';
      });
    }
    page.focus();
  });

  // Heading
  document.getElementById('write-heading').addEventListener('change', e => {
    writeCmd('formatBlock', e.target.value);
    page.focus();
  });

  // Colors
  document.getElementById('write-fgcolor').addEventListener('input', e => {
    writeCmd('foreColor', e.target.value);
  });
  document.getElementById('write-bgcolor').addEventListener('input', e => {
    writeCmd('hiliteColor', e.target.value);
  });

  // Word count
  page.addEventListener('input', debounce(() => {
    const text = page.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    document.getElementById('write-wordcount').textContent = `Wörter: ${words}`;
    document.getElementById('write-charcount').textContent = `Zeichen: ${chars}`;
    document.getElementById('write-saved').textContent = '● Ungespeichert';
    document.getElementById('write-saved').style.color = 'var(--warn)';
  }, 400));

  // Keyboard shortcuts
  page.addEventListener('keydown', e => {
    if (e.ctrlKey) {
      if (e.key === 's') { e.preventDefault(); writeSave(); }
      else if (e.key === 'z') { e.preventDefault(); writeCmd('undo'); }
      else if (e.key === 'y') { e.preventDefault(); writeCmd('redo'); }
      else if (e.key === 'f') { e.preventDefault(); writeFindReplace(); }
    }
  });

  // Auto-save
  setInterval(writeSave, 30000);
  page.focus();

  window.writeCmd = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    page.focus();
  };

  window.writeSave = () => {
    const id = currentDocId || JarvisDB.genId();
    currentDocId = id;
    const name = document.getElementById('write-filename').textContent;
    JarvisDB.saveDoc('write', id, { name, html: page.innerHTML });
    document.getElementById('write-saved').textContent = '✓ Gespeichert';
    document.getElementById('write-saved').style.color = 'var(--success)';
    showNotify('Gespeichert.', 'success');
  };

  window.writeNew = () => {
    currentDocId = null;
    page.innerHTML = '<h1>Neues Dokument</h1><p></p>';
    document.getElementById('write-filename').textContent = 'Unbenannt.jdoc';
    page.focus();
  };

  window.writeOpen = () => {
    const docs = JarvisDB.listDocs('write');
    if (!docs.length) return showNotify('Keine gespeicherten Dokumente.', 'warn');
    const items = docs.map(d => `<div class="sidebar-item" data-id="${d.id}" style="cursor:pointer">${d.name || 'Unbenannt'} — <small>${new Date(d.modified).toLocaleString('de-DE')}</small></div>`).join('');
    showModal(`<h3>📂 Dokument öffnen</h3><div style="max-height:300px;overflow-y:auto">${items}</div><div class="modal-actions"><button class="btn btn-ghost btn-cancel">Abbrechen</button></div>`,
      null, null);
    setTimeout(() => {
      $$('.sidebar-item[data-id]').forEach(item => {
        item.addEventListener('click', () => {
          const doc = JarvisDB.loadDoc('write', item.dataset.id);
          if (doc) {
            currentDocId = doc.id;
            page.innerHTML = doc.html || '';
            document.getElementById('write-filename').textContent = doc.name;
            document.querySelector('.modal-overlay')?.remove();
          }
        });
      });
    }, 50);
  };

  window.writeExport = () => {
    showModal(`<h3>⬇ Exportieren</h3>
      <div class="modal-actions" style="justify-content:flex-start;gap:8px">
        <button class="btn btn-ghost" id="exp-html">HTML</button>
        <button class="btn btn-ghost" id="exp-txt">Text</button>
        <button class="btn btn-primary" id="exp-print">PDF (drucken)</button>
      </div>
      <div class="modal-actions"><button class="btn btn-ghost btn-cancel">Schließen</button></div>
    `, null);
    setTimeout(() => {
      document.getElementById('exp-html')?.addEventListener('click', () => {
        const full = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Georgia;max-width:794px;margin:auto;padding:72px 80px;}</style></head><body>${page.innerHTML}</body></html>`;
        downloadFile(full, 'dokument.html', 'text/html');
      });
      document.getElementById('exp-txt')?.addEventListener('click', () => {
        downloadFile(page.innerText, 'dokument.txt');
      });
      document.getElementById('exp-print')?.addEventListener('click', writePrint);
    }, 50);
  };

  window.writePrint = () => {
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Georgia;max-width:794px;margin:auto;padding:72px 80px;font-size:14px;}</style></head><body>${page.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  window.writeInsertTable = () => {
    showModal(`<h3>⊞ Tabelle einfügen</h3>
      <div class="form-group"><label>Spalten</label><input type="number" id="tbl-cols" value="3" min="1" max="20"/></div>
      <div class="form-group"><label>Zeilen</label><input type="number" id="tbl-rows" value="3" min="1" max="50"/></div>
      <div class="modal-actions"><button class="btn btn-ghost btn-cancel">Abbrechen</button><button class="btn btn-primary btn-ok">Einfügen</button></div>
    `, (modal) => {
      const cols = parseInt(modal.querySelector('#tbl-cols').value);
      const rows = parseInt(modal.querySelector('#tbl-rows').value);
      let html = '<table><thead><tr>' + Array(cols).fill('<th>Kopf</th>').join('') + '</tr></thead><tbody>';
      for (let r = 0; r < rows; r++) html += '<tr>' + Array(cols).fill('<td>&nbsp;</td>').join('') + '</tr>';
      html += '</tbody></table><p></p>';
      writeCmd('insertHTML', html);
      page.focus();
    });
  };

  window.writeInsertHR = () => { writeCmd('insertHTML', '<hr/><p></p>'); };

  window.writeInsertLink = () => {
    const url = prompt('URL eingeben:');
    if (url) writeCmd('createLink', url);
  };

  window.writeFindReplace = () => {
    showModal(`<h3>🔍 Suchen & Ersetzen</h3>
      <div class="form-group"><label>Suchen</label><input type="text" id="fr-search" /></div>
      <div class="form-group"><label>Ersetzen durch</label><input type="text" id="fr-replace" /></div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-cancel">Schließen</button>
        <button class="btn btn-ghost" id="fr-find-btn">Suchen</button>
        <button class="btn btn-primary btn-ok">Alle ersetzen</button>
      </div>
    `, (modal) => {
      const search = modal.querySelector('#fr-search').value;
      const replace = modal.querySelector('#fr-replace').value;
      if (!search) return;
      page.innerHTML = page.innerHTML.split(search).join(replace);
      showNotify('Ersetzt.', 'success');
    });
    setTimeout(() => {
      document.getElementById('fr-find-btn')?.addEventListener('click', () => {
        const search = document.getElementById('fr-search').value;
        if (search) window.find(search);
      });
    }, 50);
  };
}
