/* ===== JARVIS OFFICE v2 — AGENT MANAGER (Auto-Background Agents) ===== */

// Per-app agent definitions: what to extract, what to analyse, how to help
const APP_AGENTS = {
  write: {
    label: 'Schreib-Agent',
    color: 'var(--app-write)',
    extract: (c) => {
      const ed = c.querySelector('[contenteditable]');
      return ed ? ed.innerText.trim() : '';
    },
    minLength: 60,
    system: 'Du bist ein Schreib-Assistent in Jarvis Write. Analysiere den folgenden Text kurz und gib 1–2 konkrete Verbesserungsvorschläge: Stil, Klarheit, Rechtschreibung oder Struktur. Maximal 3 Sätze. Kein Einleitungssatz wie "Hier sind meine Vorschläge". Direkt loslegen.',
    prompt: (text) => `Text:\n${text.slice(0, 1200)}`,
  },
  calc: {
    label: 'Kalkulations-Agent',
    color: 'var(--app-calc)',
    extract: (c) => {
      const cells = c.querySelectorAll('td[data-v]');
      if (!cells.length) return '';
      const vals = [...cells].slice(0, 60).map(td => td.dataset.v || td.textContent).filter(Boolean);
      return vals.join(', ');
    },
    minLength: 10,
    system: 'Du bist ein Analyse-Assistent für Tabellen in Jarvis Calc. Erkenne Muster, Auffälligkeiten oder mögliche Fehler in den Zellwerten. Gib 1–2 präzise Hinweise. Maximal 3 Sätze, direkt ohne Einleitung.',
    prompt: (text) => `Zellwerte: ${text.slice(0, 800)}`,
  },
  matrix: {
    label: 'Matrix-Agent',
    color: 'var(--app-matrix)',
    extract: (c) => {
      const rows = c.querySelectorAll('tr');
      return [...rows].slice(0, 20).map(r => [...r.querySelectorAll('td,th')].map(td => td.textContent.trim()).join('\t')).join('\n');
    },
    minLength: 20,
    system: 'Du bist ein Daten-Assistent für Smart-Tabellen in Jarvis Matrix. Analysiere die Tabellenstruktur und schlage 1–2 sinnvolle Aktionen vor (z.B. Sortierung, Filter, Aggregation). Maximal 3 Sätze, direkt.',
    prompt: (text) => `Tabelle:\n${text.slice(0, 800)}`,
  },
  mail: {
    label: 'Mail-Agent',
    color: 'var(--app-mail)',
    extract: (c) => {
      const preview = c.querySelector('.mail-preview, .mail-body, [class*="mail-content"]');
      if (preview) return preview.innerText.trim();
      const active = c.querySelector('.mail-item.active, .mail-row.active');
      return active ? active.innerText.trim() : '';
    },
    minLength: 40,
    system: 'Du bist ein Mail-Assistent in Jarvis Mail. Lies die angezeigte E-Mail und schlage einen kurzen Antwort-Entwurf oder eine Zusammenfassung des Kerninhalts vor. Maximal 4 Sätze, direkt ohne Einleitung.',
    prompt: (text) => `E-Mail:\n${text.slice(0, 1000)}`,
  },
  notes: {
    label: 'Notiz-Agent',
    color: 'var(--app-notes)',
    extract: (c) => {
      const ed = c.querySelector('textarea, [contenteditable]');
      return ed ? (ed.value || ed.innerText || '').trim() : '';
    },
    minLength: 50,
    system: 'Du bist ein Notiz-Assistent in Jarvis Notes. Lies die Notiz und schlage entweder eine Zusammenfassung in einem Satz vor oder weise auf eine fehlende Information / einen offenen Punkt hin. Maximal 2 Sätze, direkt.',
    prompt: (text) => `Notiz:\n${text.slice(0, 900)}`,
  },
  present: {
    label: 'Präsentations-Agent',
    color: 'var(--app-present)',
    extract: (c) => {
      const slide = c.querySelector('.slide, .slide-content, [class*="slide"]');
      return slide ? slide.innerText.trim() : '';
    },
    minLength: 30,
    system: 'Du bist ein Präsentations-Assistent in Jarvis Present. Analysiere den Inhalt der sichtbaren Folie und gib 1–2 Hinweise zur Verbesserung: Klarheit, Struktur, Aussagekraft. Maximal 3 Sätze, direkt.',
    prompt: (text) => `Folie:\n${text.slice(0, 700)}`,
  },
  draw: {
    label: 'Zeichen-Agent',
    color: 'var(--app-draw)',
    extract: (c) => {
      const svg = c.querySelector('svg');
      if (!svg) return '';
      const shapes = svg.querySelectorAll('rect,circle,path,line,ellipse,polygon');
      return `${shapes.length} Elemente auf der Zeichenfläche.`;
    },
    minLength: 5,
    system: 'Du bist ein Gestaltungs-Assistent in Jarvis Draw. Kommentiere kurz die aktuelle Zeichnung oder schlage einen Layout- bzw. Kompositionshinweis vor. Maximal 2 Sätze, direkt.',
    prompt: (text) => `Zeichnung: ${text}`,
  },
  calendar: {
    label: 'Kalender-Agent',
    color: 'var(--app-calendar)',
    extract: (c) => {
      const evs = c.querySelectorAll('.ev-card, .cal-event, [class*="event"]');
      return [...evs].slice(0, 10).map(e => e.innerText.trim()).join(' | ');
    },
    minLength: 15,
    system: 'Du bist ein Kalender-Assistent in Jarvis Calendar. Sieh dir die sichtbaren Termine an und weise auf Terminüberschneidungen, freie Zeitfenster oder auffällige Lücken hin. Maximal 2 Sätze, direkt.',
    prompt: (text) => `Termine: ${text.slice(0, 600)}`,
  },
};

// ---- AgentManager --------------------------------------------------------

const AgentManager = (() => {
  let panelEl = null;
  let appObserver = null;
  let contentTimer = null;
  let statusTimer = null;
  let currentAppKey = null;
  let lastContent = '';
  let isAnalysing = false;
  let enabled = true;

  function cfg() { return JarvisDB.get('agentConfig', {}); }

  function boot() {
    // Watch launcher → app transitions via class changes on app-container
    const container = document.getElementById('app-container');
    new MutationObserver(() => onContainerChange(container))
      .observe(container, { attributes: true, attributeFilter: ['class'], childList: true });
  }

  function onContainerChange(container) {
    const hidden = container.classList.contains('hidden');
    if (hidden) {
      teardown();
    } else {
      // small delay so the app has time to render its DOM
      setTimeout(() => setup(container), 180);
    }
  }

  function setup(container) {
    currentAppKey = window.currentApp || null;
    if (!currentAppKey || currentAppKey === 'agent') return; // Agent-App braucht keinen eigenen Agent

    injectPanel(container);
    watchContent(container);
    setStatus('Bereit', 'idle');
  }

  function teardown() {
    if (panelEl) panelEl.remove();
    panelEl = null;
    if (appObserver) { appObserver.disconnect(); appObserver = null; }
    clearTimeout(contentTimer);
    clearTimeout(statusTimer);
    currentAppKey = null;
    lastContent = '';
    isAnalysing = false;
  }

  function injectPanel(container) {
    if (panelEl) panelEl.remove();

    const def = APP_AGENTS[currentAppKey];
    const color = def ? def.color : 'var(--accent)';
    const label = def ? def.label : 'Jarvis Agent';

    panelEl = document.createElement('div');
    panelEl.className = 'am-panel';
    panelEl.id = 'am-panel';
    panelEl.innerHTML = `
      <div class="am-header" id="am-header">
        <span class="am-dot" id="am-dot" style="background:${color}"></span>
        <span class="am-label">${label}</span>
        <button class="am-toggle" id="am-toggle" title="Agent ein/ausblenden" aria-label="Agent-Panel umschalten">▾</button>
      </div>
      <div class="am-body" id="am-body">
        <div class="am-status" id="am-status">Warte auf Inhalt …</div>
        <div class="am-result" id="am-result" style="display:none"></div>
      </div>
    `;

    container.style.position = 'relative';
    container.appendChild(panelEl);

    let collapsed = false;
    panelEl.querySelector('#am-toggle').addEventListener('click', () => {
      collapsed = !collapsed;
      panelEl.querySelector('#am-body').style.display = collapsed ? 'none' : '';
      panelEl.querySelector('#am-toggle').textContent = collapsed ? '▸' : '▾';
    });
  }

  function watchContent(container) {
    if (appObserver) appObserver.disconnect();
    appObserver = new MutationObserver(() => scheduleAnalysis(container));
    appObserver.observe(container, { childList: true, subtree: true, characterData: true });

    // Also catch keyboard events for editors
    container.addEventListener('input', () => scheduleAnalysis(container), { passive: true });
  }

  function scheduleAnalysis(container) {
    clearTimeout(contentTimer);
    contentTimer = setTimeout(() => analyse(container), 3500); // 3.5s debounce
  }

  async function analyse(container) {
    if (isAnalysing || !enabled) return;
    const c = cfg();
    if (!c.apiKey) {
      setStatus('API-Key fehlt — Einstellungen öffnen', 'warn');
      return;
    }

    const def = APP_AGENTS[currentAppKey];
    if (!def) return;

    const content = def.extract(container);
    if (!content || content.length < def.minLength) {
      setStatus('Warte auf Inhalt …', 'idle');
      return;
    }
    if (content === lastContent) return; // nothing changed
    lastContent = content;

    isAnalysing = true;
    setStatus('Analysiert …', 'busy');

    try {
      const text = await agentCallOnce(def.system, def.prompt(content));
      showResult(text);
      setStatus('Aktuell', 'ok');
    } catch (e) {
      setStatus(`Fehler: ${e.message.slice(0, 60)}`, 'error');
    } finally {
      isAnalysing = false;
    }
  }

  function showResult(text) {
    if (!panelEl) return;
    const res = panelEl.querySelector('#am-result');
    if (!res) return;
    res.style.display = '';
    res.innerHTML = `
      <div class="am-result-text">${sanitize(text)}</div>
      <button class="am-copy-btn" title="Kopieren">Kopieren</button>
    `;
    res.querySelector('.am-copy-btn').addEventListener('click', () => {
      navigator.clipboard?.writeText(text).then(() => showNotify('Kopiert.', 'success'));
    });
  }

  function setStatus(msg, type) {
    if (!panelEl) return;
    const dot = panelEl.querySelector('#am-dot');
    const status = panelEl.querySelector('#am-status');
    if (!dot || !status) return;
    status.textContent = msg;
    const colors = { idle: 'var(--text-faint)', busy: 'var(--warning)', ok: 'var(--app-calc)', warn: 'var(--warning)', error: 'var(--danger)' };
    dot.style.background = colors[type] || 'var(--text-faint)';
  }

  return { boot };
})();

// Auto-boot as soon as DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AgentManager.boot());
} else {
  AgentManager.boot();
}
