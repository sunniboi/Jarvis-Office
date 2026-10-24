/* ===== JARVIS OFFICE v2 — LAUNCHER ===== */

const APPS = {
  write:    { name: 'Jarvis Write',    desc: 'Textverarbeitung',     color: 'var(--app-write)',    init: (c) => initWrite(c) },
  calc:     { name: 'Jarvis Calc',     desc: 'Tabellenkalkulation',  color: 'var(--app-calc)',     init: (c) => initCalc(c) },
  matrix:   { name: 'Jarvis Matrix',   desc: 'Smart-Tabellen',       color: 'var(--app-matrix)',   init: (c) => initMatrix(c) },
  draw:     { name: 'Jarvis Draw',     desc: 'Vektorgrafik',         color: 'var(--app-draw)',     init: (c) => initDraw(c) },
  present:  { name: 'Jarvis Present',  desc: 'Präsentationen',       color: 'var(--app-present)',  init: (c) => initPresent(c) },
  mail:     { name: 'Jarvis Mail',     desc: 'E-Mail-Client',        color: 'var(--app-mail)',     init: (c) => initMail(c) },
  notes:    { name: 'Jarvis Notes',    desc: 'Schnellnotizen',       color: 'var(--app-notes)',    init: (c) => initNotes(c) },
  calendar: { name: 'Jarvis Calendar', desc: 'Kalender & Termine',   color: 'var(--app-calendar)', init: (c) => initCalendar(c) },
  anydoc:   { name: 'Jarvis AnyDoc',   desc: 'Dokument-Viewer',      color: 'var(--app-anydoc)',   init: (c) => initAnyDoc(c) },
};

// App icons as SVG paths (color inherits from parent)
const APP_ICONS = {
  write:    '<rect x="5" y="4" width="14" height="17" rx="2" stroke-width="1.5"/><line x1="9" y1="9" x2="15" y2="9" stroke-width="1.5"/><line x1="9" y1="13" x2="15" y2="13" stroke-width="1.5"/><line x1="9" y1="17" x2="13" y2="17" stroke-width="1.5"/>',
  calc:     '<rect x="4" y="4" width="16" height="16" rx="2" stroke-width="1.5"/><line x1="4" y1="12" x2="20" y2="12" stroke-width="1.5"/><line x1="12" y1="4" x2="12" y2="20" stroke-width="1.5"/>',
  matrix:   '<rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.5"/><polyline points="7,15 10,11 13,13 17,8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  draw:     '<path d="M12 20h9" stroke-width="1.5" stroke-linecap="round"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke-width="1.5"/>',
  present:  '<rect x="3" y="5" width="18" height="13" rx="2" stroke-width="1.5"/><line x1="12" y1="18" x2="12" y2="22" stroke-width="1.5"/><line x1="8" y1="22" x2="16" y2="22" stroke-width="1.5"/>',
  mail:     '<rect x="2" y="5" width="20" height="14" rx="2" stroke-width="1.5"/><polyline points="2,7 12,14 22,7" stroke-width="1.5"/>',
  notes:    '<path d="M11 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" stroke-width="1.5"/><polyline points="13,2 13,9 20,9" stroke-width="1.5"/><line x1="9" y1="13" x2="15" y2="13" stroke-width="1.5"/><line x1="9" y1="17" x2="13" y2="17" stroke-width="1.5"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2" stroke-width="1.5"/><line x1="16" y1="2" x2="16" y2="6" stroke-width="1.5" stroke-linecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke-width="1.5"/>',
  anydoc:   '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke-width="1.5"/><path d="M14 2v6h6" stroke-width="1.5"/><path d="M10 13l2-2 2 2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="11" x2="12" y2="17" stroke-width="1.5" stroke-linecap="round"/>',
};

let currentApp = null;

function buildLauncher() {
  const grid = document.getElementById('launcher-grid');
  grid.innerHTML = '';
  for (const [key, app] of Object.entries(APPS)) {
    const card = document.createElement('button');
    card.className = 'app-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', app.name + ' öffnen');
    card.dataset.app = key;
    card.innerHTML = `
      <div class="app-icon" style="background:${app.color}22">
        <svg viewBox="0 0 24 24" fill="none" stroke="${app.color}" aria-hidden="true">${APP_ICONS[key] || ''}</svg>
      </div>
      <span class="app-name">${app.name}</span>
      <span class="app-desc">${app.desc}</span>
    `;
    card.addEventListener('click', () => launchApp(key));
    grid.appendChild(card);
  }
}

function launchApp(name) {
  const app = APPS[name];
  if (!app) return;
  currentApp = name;
  document.getElementById('launcher').classList.add('hidden');
  const container = document.getElementById('app-container');
  container.classList.remove('hidden');
  container.innerHTML = '';
  try { app.init(container); }
  catch (err) {
    console.error('App-Fehler:', err);
    container.innerHTML = `<div style="padding:32px;color:var(--danger)">Fehler beim Starten von ${app.name}: ${err.message}</div>`;
  }
}

function goHome() {
  currentApp = null;
  document.getElementById('app-container').classList.add('hidden');
  document.getElementById('launcher').classList.remove('hidden');
  // Clean up any event listeners / intervals the app may have left
  document.getElementById('app-container').innerHTML = '';
}

// Settings modal
document.getElementById('btn-settings').addEventListener('click', openSettings);

function openSettings() {
  const s = JarvisDB.get('settings', {});
  showModal(`
    <h3>Einstellungen</h3>
    <div class="form-group">
      <label for="set-name">Name</label>
      <input type="text" id="set-name" value="${sanitize(s.name || 'Master')}" autocomplete="off" />
    </div>
    <div class="form-group">
      <label for="set-fontsize">Standard-Schriftgröße (Write)</label>
      <input type="number" id="set-fontsize" value="${s.fontSize || 14}" min="10" max="24" />
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-cancel">Abbrechen</button>
      <button class="btn btn-primary btn-ok">Speichern</button>
    </div>
  `, (modal) => {
    const name     = modal.querySelector('#set-name').value.trim() || 'Master';
    const fontSize = parseInt(modal.querySelector('#set-fontsize').value) || 14;
    JarvisDB.set('settings', { name, fontSize });
    showNotify('Einstellungen gespeichert.', 'success');
  });
}

// Clock
function updateClock() {
  const el = document.getElementById('clock');
  if (el) el.textContent = formatDateTime();
}
setInterval(updateClock, 1000);
updateClock();

buildLauncher();
