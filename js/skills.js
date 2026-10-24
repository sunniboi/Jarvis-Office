/* ===== JARVIS OFFICE v2 — FIND SKILLS ===== */

const SKILLS_DATA = [
  // Write
  { app: 'write', appName: 'Jarvis Write', color: 'var(--app-write)',
    skill: 'Text formatieren', tags: ['fett', 'kursiv', 'unterstrichen', 'format'],
    desc: 'Markiere Text und nutze die Toolbar oder Strg+B / Strg+I / Strg+U.' },
  { app: 'write', appName: 'Jarvis Write', color: 'var(--app-write)',
    skill: 'Dokument exportieren', tags: ['speichern', 'export', 'txt', 'download'],
    desc: 'Klicke auf „Exportieren" in der Toolbar — speichert als .txt-Datei.' },
  { app: 'write', appName: 'Jarvis Write', color: 'var(--app-write)',
    skill: 'Schriftgröße ändern', tags: ['schrift', 'größe', 'font'],
    desc: 'Über Einstellungen (⚙) lässt sich die Standard-Schriftgröße festlegen.' },
  { app: 'write', appName: 'Jarvis Write', color: 'var(--app-write)',
    skill: 'Zeichen zählen', tags: ['zählen', 'wörter', 'zeichen', 'statistik'],
    desc: 'Die Statusleiste zeigt Wörter und Zeichen in Echtzeit.' },

  // Calc
  { app: 'calc', appName: 'Jarvis Calc', color: 'var(--app-calc)',
    skill: 'Formel eingeben', tags: ['formel', 'rechnen', 'summe', 'berechnen'],
    desc: 'Zelle anklicken und mit = beginnen, z. B. =A1+B1 oder =SUMME(A1:A10).' },
  { app: 'calc', appName: 'Jarvis Calc', color: 'var(--app-calc)',
    skill: 'Zeile / Spalte einfügen', tags: ['zeile', 'spalte', 'einfügen', 'hinzufügen'],
    desc: 'Rechtsklick auf Zeilen-/Spaltenkopf → Einfügen.' },
  { app: 'calc', appName: 'Jarvis Calc', color: 'var(--app-calc)',
    skill: 'CSV exportieren', tags: ['export', 'csv', 'speichern', 'download'],
    desc: 'Toolbar → Export → als CSV-Datei herunterladen.' },
  { app: 'calc', appName: 'Jarvis Calc', color: 'var(--app-calc)',
    skill: 'Zellen verbinden', tags: ['verbinden', 'merge', 'zusammenführen'],
    desc: 'Mehrere Zellen markieren → Rechtsklick → Verbinden.' },

  // Matrix
  { app: 'matrix', appName: 'Jarvis Matrix', color: 'var(--app-matrix)',
    skill: 'Zeile hinzufügen', tags: ['zeile', 'eintrag', 'hinzufügen', 'neu'],
    desc: 'Klicke auf „+ Zeile" am Ende der Tabelle.' },
  { app: 'matrix', appName: 'Jarvis Matrix', color: 'var(--app-matrix)',
    skill: 'Spalte definieren', tags: ['spalte', 'typ', 'feld', 'definieren'],
    desc: 'Über „Spalte hinzufügen" lassen sich Typ (Text, Zahl, Datum, Auswahl) und Name festlegen.' },
  { app: 'matrix', appName: 'Jarvis Matrix', color: 'var(--app-matrix)',
    skill: 'Daten filtern', tags: ['filter', 'suchen', 'sortieren'],
    desc: 'Klicke auf den Spalten-Header, um aufsteigend/absteigend zu sortieren oder den Filter anzuwenden.' },
  { app: 'matrix', appName: 'Jarvis Matrix', color: 'var(--app-matrix)',
    skill: 'Tabelle exportieren', tags: ['export', 'csv', 'json', 'speichern'],
    desc: 'Toolbar → Export → CSV oder JSON.' },

  // Draw
  { app: 'draw', appName: 'Jarvis Draw', color: 'var(--app-draw)',
    skill: 'Freihand zeichnen', tags: ['zeichnen', 'stift', 'freihand'],
    desc: 'Stift-Werkzeug wählen und auf der Leinwand zeichnen.' },
  { app: 'draw', appName: 'Jarvis Draw', color: 'var(--app-draw)',
    skill: 'Form einfügen', tags: ['form', 'rechteck', 'kreis', 'linie'],
    desc: 'Shapes-Toolbar → Form wählen → auf Leinwand ziehen.' },
  { app: 'draw', appName: 'Jarvis Draw', color: 'var(--app-draw)',
    skill: 'Als PNG exportieren', tags: ['export', 'png', 'bild', 'speichern'],
    desc: 'Toolbar → Exportieren → PNG-Datei wird heruntergeladen.' },
  { app: 'draw', appName: 'Jarvis Draw', color: 'var(--app-draw)',
    skill: 'Leinwand leeren', tags: ['löschen', 'leeren', 'neu', 'clear'],
    desc: 'Toolbar → Neu / Alles löschen.' },

  // Present
  { app: 'present', appName: 'Jarvis Present', color: 'var(--app-present)',
    skill: 'Folie hinzufügen', tags: ['folie', 'slide', 'hinzufügen', 'neu'],
    desc: 'Klicke auf „+ Folie" im Folien-Panel links.' },
  { app: 'present', appName: 'Jarvis Present', color: 'var(--app-present)',
    skill: 'Präsentation starten', tags: ['präsentation', 'vollbild', 'starten', 'show'],
    desc: 'Toolbar → Präsentieren → öffnet Vollbildmodus.' },
  { app: 'present', appName: 'Jarvis Present', color: 'var(--app-present)',
    skill: 'Hintergrundfarbe ändern', tags: ['hintergrund', 'farbe', 'design', 'aussehen'],
    desc: 'Folie auswählen → rechtes Panel → Hintergrund → Farbe wählen.' },
  { app: 'present', appName: 'Jarvis Present', color: 'var(--app-present)',
    skill: 'Textblock einfügen', tags: ['text', 'textfeld', 'beschriftung', 'einfügen'],
    desc: 'Toolbar → Text-Werkzeug → auf die Folie klicken.' },

  // Mail
  { app: 'mail', appName: 'Jarvis Mail', color: 'var(--app-mail)',
    skill: 'Neue E-Mail schreiben', tags: ['mail', 'schreiben', 'senden', 'neu', 'compose'],
    desc: 'Klicke auf „Neue E-Mail" (✉+) — öffnet den Schreib-Dialog.' },
  { app: 'mail', appName: 'Jarvis Mail', color: 'var(--app-mail)',
    skill: 'Konto einrichten', tags: ['konto', 'account', 'einrichten', 'imap', 'smtp'],
    desc: 'Einstellungen (⚙) → Mail-Konten → IMAP/SMTP-Daten eingeben.' },
  { app: 'mail', appName: 'Jarvis Mail', color: 'var(--app-mail)',
    skill: 'E-Mail suchen', tags: ['suchen', 'finden', 'suche', 'filter'],
    desc: 'Suchfeld oben rechts — durchsucht Betreff und Absender.' },
  { app: 'mail', appName: 'Jarvis Mail', color: 'var(--app-mail)',
    skill: 'Ordner erstellen', tags: ['ordner', 'mappe', 'erstellen', 'organisieren'],
    desc: 'Linke Sidebar → Ordner → + → Name eingeben.' },

  // Notes
  { app: 'notes', appName: 'Jarvis Notes', color: 'var(--app-notes)',
    skill: 'Neue Notiz anlegen', tags: ['notiz', 'neu', 'anlegen', 'erstellen'],
    desc: 'Klicke auf „+ Notiz" oder nutze Strg+N.' },
  { app: 'notes', appName: 'Jarvis Notes', color: 'var(--app-notes)',
    skill: 'Notiz suchen', tags: ['suchen', 'finden', 'filter'],
    desc: 'Suchfeld oben — filtert Titel und Inhalt in Echtzeit.' },
  { app: 'notes', appName: 'Jarvis Notes', color: 'var(--app-notes)',
    skill: 'Notiz löschen', tags: ['löschen', 'entfernen', 'trash'],
    desc: 'Notiz öffnen → Papierkorb-Symbol klicken.' },
  { app: 'notes', appName: 'Jarvis Notes', color: 'var(--app-notes)',
    skill: 'Markdown nutzen', tags: ['markdown', 'formatierung', 'überschrift', 'liste'],
    desc: 'Notes unterstützt Markdown — # für Überschriften, - für Listen, **fett**.' },

  // Calendar
  { app: 'calendar', appName: 'Jarvis Calendar', color: 'var(--app-calendar)',
    skill: 'Termin anlegen', tags: ['termin', 'event', 'anlegen', 'neu', 'erstellen'],
    desc: 'Auf einen Tageslslot klicken oder „+ Termin" — Dialog öffnet sich.' },
  { app: 'calendar', appName: 'Jarvis Calendar', color: 'var(--app-calendar)',
    skill: 'Monat / Woche wechseln', tags: ['monat', 'woche', 'ansicht', 'wechseln', 'navigation'],
    desc: 'Pfeile in der Kopfzeile wechseln den Zeitraum, Buttons schalten Ansicht um.' },
  { app: 'calendar', appName: 'Jarvis Calendar', color: 'var(--app-calendar)',
    skill: 'Termin löschen', tags: ['termin', 'löschen', 'entfernen', 'abbrechen'],
    desc: 'Termin anklicken → Löschen-Symbol oder Kontextmenü.' },
  { app: 'calendar', appName: 'Jarvis Calendar', color: 'var(--app-calendar)',
    skill: 'Termin verschieben', tags: ['verschieben', 'drag', 'ziehen', 'umlegen'],
    desc: 'Termin per Drag & Drop auf einen anderen Slot ziehen.' },
];

function initSkills(container) {
  container.innerHTML = `
    <div class="skills-app">
      <div class="app-titlebar">
        <button class="btn-icon btn-back" onclick="goHome()" aria-label="Zurück zum Launcher">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <span class="app-title">Find Skills</span>
      </div>

      <div class="skills-search-bar">
        <div class="skills-search-wrap">
          <svg class="skills-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="search"
            id="skills-search"
            class="skills-search-input"
            placeholder="Was möchtest du tun? z. B. „Formel eingeben" oder „Export" …"
            autocomplete="off"
            aria-label="Skills durchsuchen"
          />
          <button class="skills-search-clear hidden" id="skills-clear" aria-label="Suche löschen">✕</button>
        </div>
        <div class="skills-filters" id="skills-filters" role="group" aria-label="Nach App filtern">
          <button class="skills-filter-btn active" data-app="">Alle</button>
          <button class="skills-filter-btn" data-app="write" style="--fc:var(--app-write)">Write</button>
          <button class="skills-filter-btn" data-app="calc" style="--fc:var(--app-calc)">Calc</button>
          <button class="skills-filter-btn" data-app="matrix" style="--fc:var(--app-matrix)">Matrix</button>
          <button class="skills-filter-btn" data-app="draw" style="--fc:var(--app-draw)">Draw</button>
          <button class="skills-filter-btn" data-app="present" style="--fc:var(--app-present)">Present</button>
          <button class="skills-filter-btn" data-app="mail" style="--fc:var(--app-mail)">Mail</button>
          <button class="skills-filter-btn" data-app="notes" style="--fc:var(--app-notes)">Notes</button>
          <button class="skills-filter-btn" data-app="calendar" style="--fc:var(--app-calendar)">Calendar</button>
        </div>
      </div>

      <div class="skills-results" id="skills-results" role="list" aria-label="Gefundene Skills"></div>
      <div class="skills-empty hidden" id="skills-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <p>Keine Skills gefunden.</p>
        <span>Probiere andere Suchbegriffe oder wähle eine andere App.</span>
      </div>
    </div>
  `;

  let activeApp = '';
  let query = '';

  const input     = container.querySelector('#skills-search');
  const clearBtn  = container.querySelector('#skills-clear');
  const results   = container.querySelector('#skills-results');
  const emptyMsg  = container.querySelector('#skills-empty');
  const filterBtns = container.querySelectorAll('.skills-filter-btn');

  function render() {
    const q = query.toLowerCase();
    const filtered = SKILLS_DATA.filter(s => {
      const matchApp = !activeApp || s.app === activeApp;
      const matchQ   = !q ||
        s.skill.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q) ||
        s.tags.some(t => t.includes(q)) ||
        s.appName.toLowerCase().includes(q);
      return matchApp && matchQ;
    });

    results.innerHTML = '';
    if (filtered.length === 0) {
      emptyMsg.classList.remove('hidden');
      return;
    }
    emptyMsg.classList.add('hidden');

    filtered.forEach(s => {
      const card = document.createElement('div');
      card.className = 'skill-card';
      card.setAttribute('role', 'listitem');
      card.innerHTML = `
        <div class="skill-app-badge" style="background:${s.color}22;color:${s.color}">
          ${s.appName}
        </div>
        <div class="skill-body">
          <strong class="skill-name">${highlight(s.skill, q)}</strong>
          <p class="skill-desc">${highlight(s.desc, q)}</p>
        </div>
        <button class="btn skill-open-btn" style="--bc:${s.color}" onclick="launchApp('${s.app}')" aria-label="${s.appName} öffnen">
          Öffnen
        </button>
      `;
      results.appendChild(card);
    });
  }

  function highlight(text, q) {
    if (!q) return sanitize(text);
    const safe = sanitize(text);
    const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safe.replace(new RegExp(`(${safeQ})`, 'gi'), '<mark class="skill-hl">$1</mark>');
  }

  input.addEventListener('input', () => {
    query = input.value;
    clearBtn.classList.toggle('hidden', !query);
    render();
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    query = '';
    clearBtn.classList.add('hidden');
    input.focus();
    render();
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeApp = btn.dataset.app;
      render();
    });
  });

  render();
  input.focus();
}
