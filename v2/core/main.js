import Store from './store.js';

const MODULES = [
  { id: 'write',    label: 'Write',    color: 'var(--app-write)',    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>` },
  { id: 'calc',     label: 'Calc',     color: 'var(--app-calc)',     icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/></svg>` },
  { id: 'matrix',   label: 'Matrix',   color: 'var(--app-matrix)',   icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>` },
  { id: 'draw',     label: 'Draw',     color: 'var(--app-draw)',     icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="3"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 9v-7M12 22v-7M9 12H2M22 12h-7"/></svg>` },
  { id: 'present',  label: 'Present',  color: 'var(--app-present)',  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>` },
  { id: 'notes',    label: 'Notes',    color: 'var(--app-notes)',    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>` },
  { id: 'calendar', label: 'Calendar', color: 'var(--app-calendar)', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>` },
  { id: 'mail',     label: 'Mail',     color: 'var(--app-mail)',     icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>` },
];

const moduleCache = {};
let currentModule = null;
let clockInterval = null;

export async function launchApp(id) {
  if (currentModule?.unmount) currentModule.unmount();
  currentModule = null;
  if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }

  const app = document.getElementById('app');
  app.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:var(--text-sm);">Laden…</div>`;

  if (!moduleCache[id]) {
    moduleCache[id] = (await import(`../modules/${id}/index.js`)).default;
  }
  currentModule = moduleCache[id];
  app.innerHTML = '';
  currentModule.mount(app);
}

export function showLauncher() {
  if (currentModule?.unmount) currentModule.unmount();
  currentModule = null;
  if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }

  const app = document.getElementById('app');
  const settings = Store.get('jarvis_settings', { name: '', fontSize: 13 });

  app.innerHTML = `
    <div class="launcher">
      <header class="launcher-header">
        <div class="launcher-logo">
          <svg width="32" height="32" viewBox="0 0 40 40">
            <rect width="40" height="40" rx="10" fill="var(--accent)"/>
            <path d="M10 20 L20 10 L30 20 L20 30 Z" fill="rgba(255,255,255,0.22)"/>
            <circle cx="20" cy="20" r="5" fill="#fff"/>
          </svg>
          Jarvis Office
        </div>
        <div class="launcher-right">
          <time id="launcher-clock" class="launcher-clock"></time>
          <button class="btn-icon" id="btn-settings" aria-label="Einstellungen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          </button>
        </div>
      </header>
      <div class="launcher-body">
        <div class="app-grid" id="app-grid"></div>
      </div>
    </div>
  `;

  const grid = document.getElementById('app-grid');
  for (const mod of MODULES) {
    const card = document.createElement('button');
    card.className = 'app-card';
    card.style.setProperty('--app-color', mod.color);
    card.setAttribute('aria-label', mod.label + ' öffnen');
    card.innerHTML = `
      <div class="app-card-icon" style="color:${mod.color}">${mod.icon}</div>
      <span class="app-card-label">${mod.label}</span>
    `;
    card.addEventListener('click', () => launchApp(mod.id));
    grid.append(card);
  }

  const clockEl = document.getElementById('launcher-clock');
  const tick = () => { clockEl.textContent = new Date().toLocaleTimeString('de-DE'); };
  tick();
  clockInterval = setInterval(tick, 1000);

  document.getElementById('btn-settings').addEventListener('click', openSettings);

  if (settings.name) {
    document.querySelector('.launcher-logo').insertAdjacentHTML(
      'beforeend',
      `<span style="font-size:var(--text-sm);font-weight:400;color:var(--text-muted);margin-left:var(--sp-2)">${settings.name}</span>`
    );
  }
}

function openSettings() {
  const settings = Store.get('jarvis_settings', { name: '', fontSize: 13 });
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Einstellungen">
      <div class="modal-header">
        <span class="modal-title">Einstellungen</span>
        <button class="btn-icon" id="modal-close" aria-label="Schließen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <label class="form-label" for="set-name">Name</label>
          <input class="form-input" id="set-name" type="text" placeholder="Dein Name" value="${settings.name || ''}" />
        </div>
        <div class="form-row">
          <label class="form-label" for="set-fontsize">Schriftgröße (10–24 px)</label>
          <input class="form-input" id="set-fontsize" type="number" min="10" max="24" value="${settings.fontSize || 13}" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="modal-cancel">Abbrechen</button>
        <button class="btn btn-primary" id="modal-save">Speichern</button>
      </div>
    </div>
  `;

  document.body.append(backdrop);

  const close = () => backdrop.remove();
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  backdrop.querySelector('#modal-close').addEventListener('click', close);
  backdrop.querySelector('#modal-cancel').addEventListener('click', close);
  backdrop.querySelector('#modal-save').addEventListener('click', () => {
    const name = backdrop.querySelector('#set-name').value.trim();
    const fontSize = Math.min(24, Math.max(10, parseInt(backdrop.querySelector('#set-fontsize').value) || 13));
    Store.set('jarvis_settings', { name, fontSize });
    document.documentElement.style.setProperty('font-size', fontSize + 'px');
    close();
    showLauncher();
  });

  backdrop.querySelector('#set-name').focus();
}

// Apply saved font size on boot
const saved = Store.get('jarvis_settings', null);
if (saved?.fontSize) document.documentElement.style.setProperty('font-size', saved.fontSize + 'px');

showLauncher();
