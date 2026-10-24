// ===== JARVIS LAUNCHER =====

const APPS = {
  write:    { name: 'Jarvis Write',    color: 'var(--write)',    init: (c) => initWrite(c) },
  calc:     { name: 'Jarvis Calc',     color: 'var(--calc)',     init: (c) => initCalc(c) },
  matrix:   { name: 'Jarvis Matrix',   color: 'var(--matrix)',   init: (c) => initMatrix(c) },
  draw:     { name: 'Jarvis Draw',     color: 'var(--draw)',     init: (c) => initDraw(c) },
  present:  { name: 'Jarvis Present',  color: 'var(--present)',  init: (c) => initPresent(c) },
  mail:     { name: 'Jarvis Mail',     color: 'var(--mail)',     init: (c) => initMail(c) },
  notes:    { name: 'Jarvis Notes',    color: 'var(--notes)',    init: (c) => initNotes(c) },
  calendar: { name: 'Jarvis Calendar', color: 'var(--calendar)', init: (c) => initCalendar(c) },
  mem:      { name: 'Jarvis Mem',      color: 'var(--mem)',      init: (c) => initMem(c) },
};

let currentApp = null;

function launchApp(name) {
  const app = APPS[name];
  if (!app) return;
  currentApp = name;
  document.getElementById('launcher').classList.add('hidden');
  const container = document.getElementById('app-container');
  container.classList.remove('hidden');
  container.innerHTML = '';
  app.init(container);
}

function goHome() {
  currentApp = null;
  document.getElementById('app-container').classList.add('hidden');
  document.getElementById('launcher').classList.remove('hidden');
}

function openSettings() {
  showModal(`
    <h3>⚙ Einstellungen</h3>
    <div class="form-group">
      <label>Name</label>
      <input type="text" id="set-name" value="${JarvisDB.get('settings', {}).name || 'Master'}" />
    </div>
    <div class="form-group">
      <label>Schriftgröße (Write)</label>
      <input type="number" id="set-fontsize" value="${JarvisDB.get('settings', {}).fontSize || 14}" min="10" max="24" />
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-cancel">Abbrechen</button>
      <button class="btn btn-primary btn-ok">Speichern</button>
    </div>
  `, (modal) => {
    const name = modal.querySelector('#set-name').value;
    const fontSize = parseInt(modal.querySelector('#set-fontsize').value);
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
