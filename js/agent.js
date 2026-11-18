/* ===== JARVIS OFFICE v2 — AGENT SKILLS ===== */

// Alle verfügbaren Skills (Marktplatz-Bibliothek)
const ALL_SKILLS = [
  // ── Texte & Kommunikation ──
  {
    id: 'draft', cat: 'text',
    name: 'Textentwurf', desc: 'Dokument oder Text verfassen',
    icon: '<path d="M11 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" stroke-width="1.5"/><polyline points="13,2 13,9 20,9" stroke-width="1.5"/><path d="M9 13h6M9 17h4" stroke-width="1.5" stroke-linecap="round"/>',
    color: 'var(--app-write)',
    prompt: 'Du bist ein professioneller Texter. Erstelle einen Textentwurf auf Basis der folgenden Anforderungen. Antworte auf Deutsch, es sei denn der Nutzer gibt eine andere Sprache vor.\n\nAnforderung: ',
  },
  {
    id: 'email', cat: 'text',
    name: 'E-Mail verfassen', desc: 'Professionelle E-Mail schreiben',
    icon: '<rect x="2" y="5" width="20" height="14" rx="2" stroke-width="1.5"/><polyline points="2,7 12,14 22,7" stroke-width="1.5"/>',
    color: 'var(--app-mail)',
    prompt: 'Du bist ein Experte für professionelle Kommunikation. Schreibe eine E-Mail basierend auf dieser Beschreibung. Ton und Anrede werden vom Nutzer vorgegeben. Antworte auf Deutsch.\n\nBeschreibung: ',
  },
  {
    id: 'summarize', cat: 'text',
    name: 'Zusammenfassen', desc: 'Text auf das Wesentliche kürzen',
    icon: '<line x1="8" y1="6" x2="21" y2="6" stroke-width="1.5" stroke-linecap="round"/><line x1="8" y1="12" x2="21" y2="12" stroke-width="1.5" stroke-linecap="round"/><line x1="8" y1="18" x2="16" y2="18" stroke-width="1.5" stroke-linecap="round"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>',
    color: 'var(--app-calc)',
    prompt: 'Fasse den folgenden Text präzise und klar zusammen. Behalte alle wichtigen Kernaussagen, lass Unwichtiges weg. Antworte auf Deutsch.\n\nText: ',
  },
  {
    id: 'proofread', cat: 'text',
    name: 'Korrekturlesen', desc: 'Rechtschreibung & Stil prüfen',
    icon: '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke-width="1.5"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="1.5"/>',
    color: 'var(--app-draw)',
    prompt: 'Lese den folgenden Text Korrektur. Korrigiere Rechtschreibung, Grammatik und Zeichensetzung. Verbessere den Stil wo nötig. Zeige zuerst den korrigierten Text, dann eine kurze Liste der Änderungen. Antworte auf Deutsch.\n\nText: ',
  },
  {
    id: 'translate', cat: 'text',
    name: 'Übersetzen', desc: 'Text in andere Sprache übertragen',
    icon: '<circle cx="12" cy="12" r="10" stroke-width="1.5"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke-width="1.5"/>',
    color: 'var(--app-matrix)',
    prompt: 'Übersetze den folgenden Text. Der Nutzer gibt die Zielsprache an (Standard: Englisch). Liefere nur die Übersetzung, keinen Kommentar.\n\nText: ',
  },
  {
    id: 'rephrase', cat: 'text',
    name: 'Umformulieren', desc: 'Text anders ausdrücken',
    icon: '<polyline points="1,4 1,10 7,10" stroke-width="1.5" stroke-linecap="round"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10" stroke-width="1.5" stroke-linecap="round"/>',
    color: 'var(--app-write)',
    prompt: 'Formuliere den folgenden Text um. Behalte den Sinn, ändere aber Wortwahl und Struktur. Antworte auf Deutsch.\n\nText: ',
  },
  // ── Produktivität ──
  {
    id: 'brainstorm', cat: 'productivity',
    name: 'Brainstorming', desc: 'Ideen entwickeln und strukturieren',
    icon: '<circle cx="12" cy="12" r="10" stroke-width="1.5"/><path d="M12 8v4M12 16h.01" stroke-width="2" stroke-linecap="round"/>',
    color: 'var(--app-present)',
    prompt: 'Du bist ein kreativer Ideengeber. Sammle strukturierte Ideen zum folgenden Thema. Liefere konkrete, umsetzbare Vorschläge als nummerierte Liste. Antworte auf Deutsch.\n\nThema: ',
  },
  {
    id: 'todo', cat: 'productivity',
    name: 'To-Do-Liste', desc: 'Aufgaben strukturieren & planen',
    icon: '<rect x="3" y="5" width="6" height="6" rx="1" stroke-width="1.5"/><rect x="3" y="13" width="6" height="6" rx="1" stroke-width="1.5"/><line x1="13" y1="8" x2="21" y2="8" stroke-width="1.5" stroke-linecap="round"/><line x1="13" y1="16" x2="21" y2="16" stroke-width="1.5" stroke-linecap="round"/>',
    color: 'var(--app-calendar)',
    prompt: 'Erstelle eine strukturierte To-Do-Liste. Priorisiere die Aufgaben und füge Schätzungen für den Zeitaufwand hinzu wo sinnvoll. Antworte auf Deutsch.\n\nAufgaben/Kontext: ',
  },
  {
    id: 'meeting', cat: 'productivity',
    name: 'Meeting-Protokoll', desc: 'Notizen in Protokoll verwandeln',
    icon: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke-width="1.5"/><circle cx="9" cy="7" r="4" stroke-width="1.5"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke-width="1.5"/>',
    color: 'var(--app-notes)',
    prompt: 'Verwandle die folgenden Meeting-Notizen in ein strukturiertes Protokoll mit: Teilnehmer (falls genannt), besprochene Punkte, Beschlüsse, Aufgaben mit Verantwortlichen. Antworte auf Deutsch.\n\nNotizen: ',
  },
  {
    id: 'research', cat: 'productivity',
    name: 'Recherche', desc: 'Thema analysieren & zusammenfassen',
    icon: '<circle cx="11" cy="11" r="8" stroke-width="1.5"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke-width="1.5" stroke-linecap="round"/>',
    color: 'var(--app-matrix)',
    prompt: 'Analysiere das folgende Thema. Erkläre Hintergrund, wichtige Aspekte und aktuelle Entwicklungen. Strukturiere die Antwort klar. Antworte auf Deutsch.\n\nThema: ',
  },
  // ── Code & Technik ──
  {
    id: 'code', cat: 'code',
    name: 'Code erklären', desc: 'Quellcode analysieren & verstehen',
    icon: '<polyline points="16,18 22,12 16,6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="8,6 2,12 8,18" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    color: 'var(--app-notes)',
    prompt: 'Erkläre den folgenden Code verständlich und präzise. Beschreibe was er tut, wie er funktioniert und weise auf mögliche Probleme oder Verbesserungen hin. Antworte auf Deutsch.\n\nCode: ',
  },
  {
    id: 'codefix', cat: 'code',
    name: 'Code reparieren', desc: 'Fehler finden & beheben',
    icon: '<circle cx="12" cy="12" r="10" stroke-width="1.5"/><line x1="12" y1="8" x2="12" y2="12" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2" stroke-linecap="round"/>',
    color: 'var(--danger)',
    prompt: 'Analysiere den folgenden Code auf Fehler. Erkläre den Fehler und liefere den korrigierten Code. Antworte auf Deutsch.\n\nCode: ',
  },
  {
    id: 'codewrite', cat: 'code',
    name: 'Code schreiben', desc: 'Funktion oder Skript erstellen',
    icon: '<rect x="2" y="3" width="20" height="14" rx="2" stroke-width="1.5"/><line x1="8" y1="21" x2="16" y2="21" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="17" x2="12" y2="21" stroke-width="1.5" stroke-linecap="round"/>',
    color: 'var(--app-notes)',
    prompt: 'Schreibe folgenden Code. Liefere sauberen, kommentierten Code mit einer kurzen Erklärung. Antworte auf Deutsch.\n\nAufgabe: ',
  },
  // ── Alltag ──
  {
    id: 'recipe', cat: 'daily',
    name: 'Rezept-Ideen', desc: 'Gerichte aus Zutaten vorschlagen',
    icon: '<path d="M18 8h1a4 4 0 010 8h-1" stroke-width="1.5"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" stroke-width="1.5"/><line x1="6" y1="1" x2="6" y2="4" stroke-width="1.5" stroke-linecap="round"/><line x1="10" y1="1" x2="10" y2="4" stroke-width="1.5" stroke-linecap="round"/><line x1="14" y1="1" x2="14" y2="4" stroke-width="1.5" stroke-linecap="round"/>',
    color: 'var(--app-matrix)',
    prompt: 'Schlage 2–3 Gerichte vor, die ich aus den folgenden Zutaten kochen kann. Nenne Zubereitung in kurzen Schritten. Antworte auf Deutsch.\n\nZutaten: ',
  },
  {
    id: 'explain', cat: 'daily',
    name: 'Erklären', desc: 'Komplexes einfach erklären',
    icon: '<circle cx="12" cy="12" r="10" stroke-width="1.5"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke-width="2" stroke-linecap="round"/>',
    color: 'var(--app-calc)',
    prompt: 'Erkläre folgendes Thema so einfach wie möglich — als würdest du es einem Schüler erklären. Verwende Beispiele. Antworte auf Deutsch.\n\nThema: ',
  },
  {
    id: 'letter', cat: 'daily',
    name: 'Brief schreiben', desc: 'Formellen Brief verfassen',
    icon: '<path d="M21 2H3v16h18V2zM3 7l9 6 9-6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    color: 'var(--app-mail)',
    prompt: 'Schreibe einen formellen Brief. Verwende korrekte Briefform mit Anrede, Inhalt und Grußformel. Antworte auf Deutsch.\n\nInhalt/Zweck: ',
  },
  // ── Chat ──
  {
    id: 'free', cat: 'chat',
    name: 'Freier Chat', desc: 'Direkte Unterhaltung mit Jarvis',
    icon: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke-width="1.5"/>',
    color: 'var(--accent)',
    prompt: '',
  },
];

const SKILL_CATEGORIES = {
  text:         { label: 'Texte & Kommunikation', icon: '✍️' },
  productivity: { label: 'Produktivität',          icon: '⚡' },
  code:         { label: 'Code & Technik',         icon: '💻' },
  daily:        { label: 'Alltag',                 icon: '🌟' },
  chat:         { label: 'Chat',                   icon: '💬' },
};

// Active skills (from storage or default set)
function getActiveSkills() {
  const saved = JarvisDB.get('activeSkillIds', null);
  if (saved) return ALL_SKILLS.filter(s => saved.includes(s.id));
  return ALL_SKILLS.filter(s => ['draft','email','summarize','translate','brainstorm','proofread','code','free'].includes(s.id));
}

function saveActiveSkills(ids) {
  JarvisDB.set('activeSkillIds', ids);
}

// Backwards compat alias
const AGENT_SKILLS = ALL_SKILLS;

function initAgent(container) {
  const s = JarvisDB.get('settings', {});
  let activeSkill = null;
  let chatHistory = [];
  let isStreaming = false;

  container.innerHTML = `
    <div class="app-titlebar">
      <button class="btn-icon" onclick="goHome()" aria-label="Zurück zum Launcher">${icon('arrowLeft', 18)}</button>
      <div class="titlebar-center">
        <span class="app-title">Jarvis Agent</span>
        <span class="agent-status" id="agent-status">●&nbsp;Bereit</span>
      </div>
      <button class="btn btn-ghost btn-sm" id="agent-clear-btn">Verlauf leeren</button>
    </div>
    <div class="agent-layout">
      <div class="agent-skills-panel" id="agent-skills-panel">
        <div class="agent-skills-header">
          <span>Skills</span>
          <button class="btn btn-ghost btn-xs" id="agent-skill-market" title="Skills verwalten">+ Skills</button>
        </div>
        <div class="agent-skills-grid" id="agent-skills-grid"></div>
        <div class="agent-api-hint" id="agent-api-hint"></div>
      </div>
      <div class="agent-chat-panel">
        <div class="agent-chat-history" id="agent-chat-history">
          <div class="agent-welcome">
            <svg width="48" height="48" viewBox="0 0 40 40" aria-hidden="true">
              <rect width="40" height="40" rx="10" fill="var(--accent)"/>
              <path d="M10 20 L20 10 L30 20 L20 30 Z" fill="rgba(255,255,255,0.25)"/>
              <circle cx="20" cy="20" r="5" fill="#fff"/>
            </svg>
            <h3>Jarvis Agent</h3>
            <p>Wähle einen Skill oder starte direkt mit einer Frage.</p>
          </div>
        </div>
        <div class="agent-input-area">
          <div class="agent-active-skill" id="agent-active-skill" style="display:none">
            <span id="agent-skill-label"></span>
            <button class="agent-skill-clear" id="agent-skill-clear" title="Skill deaktivieren">✕</button>
          </div>
          <div class="agent-input-row">
            <textarea class="agent-input" id="agent-input" rows="3" placeholder="Nachricht eingeben … (Enter = senden, Shift+Enter = neue Zeile)" aria-label="Nachricht an Jarvis Agent"></textarea>
            <button class="btn btn-ghost agent-tts-btn" id="agent-tts-btn" title="Letzte Antwort vorlesen" aria-label="Vorlesen">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>
            </button>
            <button class="btn btn-primary agent-send-btn" id="agent-send-btn" aria-label="Senden">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  let lastAssistantText = '';

  function buildSkillGrid() {
    const grid = container.querySelector('#agent-skills-grid');
    grid.innerHTML = '';
    for (const skill of getActiveSkills()) {
      const btn = document.createElement('button');
      btn.className = 'agent-skill-card';
      btn.setAttribute('aria-label', skill.name);
      btn.dataset.skillId = skill.id;
      btn.innerHTML = `
        <div class="agent-skill-icon" style="color:${skill.color}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${skill.icon}</svg>
        </div>
        <span class="agent-skill-name">${skill.name}</span>
        <span class="agent-skill-desc">${skill.desc}</span>
      `;
      btn.addEventListener('click', () => activateSkill(skill));
      grid.appendChild(btn);
    }
  }
  buildSkillGrid();

  checkApiConfig();

  // Event listeners
  const input  = container.querySelector('#agent-input');
  const sendBtn = container.querySelector('#agent-send-btn');
  const clearBtn = container.querySelector('#agent-clear-btn');
  const skillClear = container.querySelector('#agent-skill-clear');
  const ttsBtn = container.querySelector('#agent-tts-btn');
  const marketBtn = container.querySelector('#agent-skill-market');

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  clearBtn.addEventListener('click', clearHistory);

  ttsBtn.addEventListener('click', async () => {
    if (!lastAssistantText) { showNotify('Noch keine Antwort zum Vorlesen.', 'warn'); return; }
    const cfg = JarvisDB.get('agentConfig', {});
    if (!cfg.elevenLabsKey) { showNotify('ElevenLabs API-Key fehlt — bitte in Agent-Einstellungen eintragen.', 'warn'); openAgentSettings(); return; }
    try {
      ttsBtn.disabled = true;
      ttsBtn.style.opacity = '.5';
      await elevenLabsSpeak(lastAssistantText);
    } catch(e) {
      showNotify('Sprachausgabe Fehler: ' + e.message, 'error');
    } finally {
      ttsBtn.disabled = false;
      ttsBtn.style.opacity = '';
    }
  });

  marketBtn.addEventListener('click', openSkillMarket);

  skillClear.addEventListener('click', () => {
    activeSkill = null;
    container.querySelector('#agent-active-skill').style.display = 'none';
    container.querySelectorAll('.agent-skill-card').forEach(c => c.classList.remove('active'));
    input.placeholder = 'Nachricht eingeben … (Enter = senden, Shift+Enter = neue Zeile)';
  });

  function activateSkill(skill) {
    activeSkill = skill;
    container.querySelectorAll('.agent-skill-card').forEach(c => c.classList.remove('active'));
    const card = container.querySelector(`[data-skill-id="${skill.id}"]`);
    if (card) card.classList.add('active');
    const activeBar = container.querySelector('#agent-active-skill');
    activeBar.style.display = 'flex';
    container.querySelector('#agent-skill-label').textContent = `Skill: ${skill.name}`;
    input.placeholder = skill.id === 'free'
      ? 'Freier Chat mit Jarvis …'
      : `${skill.name}: Deine Eingabe …`;
    input.focus();
  }

  function checkApiConfig() {
    const hint = container.querySelector('#agent-api-hint');
    const cfg = JarvisDB.get('agentConfig', {});
    if (!cfg.apiKey) {
      hint.innerHTML = `<span style="color:var(--warning)">⚠ Kein API-Key konfiguriert.</span><br><button class="btn btn-ghost btn-sm" id="agent-open-settings">Einstellungen öffnen</button>`;
      hint.querySelector('#agent-open-settings')?.addEventListener('click', openAgentSettings);
      setStatus('Kein API-Key', 'warn');
    } else {
      hint.innerHTML = `<span style="color:var(--app-calc)">✓ API konfiguriert</span>`;
      setStatus('Bereit', 'ok');
    }
  }

  function setStatus(text, type) {
    const el = container.querySelector('#agent-status');
    if (!el) return;
    el.textContent = `● ${text}`;
    el.style.color = type === 'ok' ? 'var(--app-calc)' : type === 'warn' ? 'var(--warning)' : type === 'error' ? 'var(--danger)' : 'var(--text-muted)';
  }

  function clearHistory() {
    chatHistory = [];
    const hist = container.querySelector('#agent-chat-history');
    hist.innerHTML = `
      <div class="agent-welcome">
        <svg width="48" height="48" viewBox="0 0 40 40" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="var(--accent)"/>
          <path d="M10 20 L20 10 L30 20 L20 30 Z" fill="rgba(255,255,255,0.25)"/>
          <circle cx="20" cy="20" r="5" fill="#fff"/>
        </svg>
        <h3>Jarvis Agent</h3>
        <p>Verlauf geleert. Wähle einen Skill oder starte direkt.</p>
      </div>
    `;
  }

  function addMessage(role, text, isStreaming = false) {
    const hist = container.querySelector('#agent-chat-history');
    const welcome = hist.querySelector('.agent-welcome');
    if (welcome) welcome.remove();

    const wrap = document.createElement('div');
    wrap.className = `agent-msg agent-msg-${role}`;
    if (isStreaming) wrap.id = 'agent-streaming-msg';

    const bubble = document.createElement('div');
    bubble.className = 'agent-bubble';
    bubble.textContent = text;
    wrap.appendChild(bubble);
    hist.appendChild(wrap);
    hist.scrollTop = hist.scrollHeight;
    return bubble;
  }

  async function send() {
    if (isStreaming) return;
    const cfg = JarvisDB.get('agentConfig', {});
    if (!cfg.apiKey) {
      showNotify('Bitte zuerst API-Key in den Einstellungen hinterlegen.', 'warn');
      openAgentSettings();
      return;
    }

    const raw = container.querySelector('#agent-input').value.trim();
    if (!raw) return;
    container.querySelector('#agent-input').value = '';

    const userText = activeSkill && activeSkill.prompt
      ? activeSkill.prompt + raw
      : raw;

    // Show user message (display prompt-prefix only when it's short / free chat)
    addMessage('user', activeSkill && activeSkill.id !== 'free' ? `[${activeSkill.name}] ${raw}` : raw);
    chatHistory.push({ role: 'user', content: userText });

    isStreaming = true;
    setStatus('Denkt nach …', 'busy');
    sendBtn.disabled = true;

    const bubble = addMessage('assistant', '', true);
    const hist = container.querySelector('#agent-chat-history');

    try {
      const system = 'Du bist Jarvis, ein präziser und hilfreicher KI-Assistent innerhalb der Jarvis Office Suite. Antworte klar, direkt und ohne unnötige Floskeln.';
      const fullText = await agentCallStream(system, chatHistory, (text) => {
        bubble.textContent = text;
        hist.scrollTop = 9999;
      });

      bubble.removeAttribute('id');
      lastAssistantText = fullText;
      chatHistory.push({ role: 'assistant', content: fullText });
      setStatus('Bereit', 'ok');

    } catch (err) {
      bubble.textContent = `Fehler: ${err.message}`;
      bubble.style.color = 'var(--danger)';
      bubble.removeAttribute('id');
      chatHistory.pop();
      setStatus('Fehler', 'error');
      showNotify(`API-Fehler: ${err.message}`, 'error');
    } finally {
      isStreaming = false;
      sendBtn.disabled = false;
      container.querySelector('#agent-input').focus();
    }
  }
}

function openSkillMarket() {
  const activeIds = (JarvisDB.get('activeSkillIds', null)) ||
    ['draft','email','summarize','translate','brainstorm','proofread','code','free'];

  const catHtml = Object.entries(SKILL_CATEGORIES).map(([catKey, cat]) => {
    const skills = ALL_SKILLS.filter(s => s.cat === catKey);
    const rows = skills.map(s => {
      const checked = activeIds.includes(s.id) ? 'checked' : '';
      const disabled = s.id === 'free' ? 'disabled' : '';
      return `
        <label class="skill-market-row ${checked ? 'active' : ''}">
          <input type="checkbox" value="${s.id}" ${checked} ${disabled} class="skill-market-cb" />
          <span class="skill-market-icon" style="color:${s.color}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${s.icon}</svg>
          </span>
          <span class="skill-market-info">
            <span class="skill-market-name">${s.name}</span>
            <span class="skill-market-desc">${s.desc}</span>
          </span>
        </label>`;
    }).join('');
    return `<div class="skill-market-cat"><div class="skill-market-cat-label">${cat.icon} ${cat.label}</div>${rows}</div>`;
  }).join('');

  showModal(`
    <h3>Skills verwalten</h3>
    <p style="font-size:12px;color:var(--text-faint);margin-bottom:12px">Wähle welche Skills im Jarvis Agent angezeigt werden.</p>
    <div class="skill-market-list">${catHtml}</div>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-cancel">Abbrechen</button>
      <button class="btn btn-primary btn-ok">Speichern</button>
    </div>
  `, () => {
    const checked = [...document.querySelectorAll('.skill-market-cb:checked')].map(cb => cb.value);
    if (!checked.includes('free')) checked.push('free');
    saveActiveSkills(checked);
    // Rebuild grid in open agent instance
    const container = document.getElementById('app-container');
    if (container) {
      const grid = container.querySelector('#agent-skills-grid');
      if (grid) {
        grid.innerHTML = '';
        for (const skill of getActiveSkills()) {
          const btn = document.createElement('button');
          btn.className = 'agent-skill-card';
          btn.setAttribute('aria-label', skill.name);
          btn.dataset.skillId = skill.id;
          btn.innerHTML = `
            <div class="agent-skill-icon" style="color:${skill.color}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${skill.icon}</svg>
            </div>
            <span class="agent-skill-name">${skill.name}</span>
            <span class="agent-skill-desc">${skill.desc}</span>
          `;
          btn.addEventListener('click', () => {
            document.querySelectorAll('.agent-skill-card').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const bar = container.querySelector('#agent-active-skill');
            if (bar) bar.style.display = 'flex';
            const lbl = container.querySelector('#agent-skill-label');
            if (lbl) lbl.textContent = `Skill: ${skill.name}`;
            const inp = container.querySelector('#agent-input');
            if (inp) { inp.placeholder = skill.id === 'free' ? 'Freier Chat mit Jarvis …' : `${skill.name}: Deine Eingabe …`; inp.focus(); }
          });
          grid.appendChild(btn);
        }
      }
    }
    showNotify('Skills aktualisiert.', 'success');
  });

  // Live-toggle highlight
  setTimeout(() => {
    document.querySelectorAll('.skill-market-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        cb.closest('.skill-market-row').classList.toggle('active', cb.checked);
      });
    });
  }, 50);
}

function openAgentSettings() {
  const cfg = JarvisDB.get('agentConfig', {});
  const prov = cfg.provider || 'groq';

  function modelOptions(provider) {
    const p = AGENT_PROVIDERS[provider];
    if (!p) return '';
    return p.models.map(m =>
      `<option value="${m.id}" ${(cfg.model || p.defaultModel) === m.id ? 'selected' : ''}>${m.label}</option>`
    ).join('');
  }

  function providerOptions() {
    return Object.entries(AGENT_PROVIDERS).map(([key, p]) =>
      `<option value="${key}" ${prov === key ? 'selected' : ''}>${p.label}${p.free ? ' ✓ kostenlos' : ''}</option>`
    ).join('');
  }

  function voiceOptions() {
    return ELEVENLABS_VOICES.map(v =>
      `<option value="${v.id}" ${(cfg.elevenLabsVoice || ELEVENLABS_VOICES[0].id) === v.id ? 'selected' : ''}>${v.label}</option>`
    ).join('');
  }

  const fbProv = cfg.fallbackProvider || '';
  function fallbackOptions() {
    const opts = `<option value="">Kein Fallback</option>` +
      Object.entries(AGENT_PROVIDERS).filter(([k]) => k !== prov).map(([key, p]) =>
        `<option value="${key}" ${fbProv === key ? 'selected' : ''}>${p.label}${p.free ? ' ✓' : ''}</option>`
      ).join('');
    return opts;
  }

  showModal(`
    <h3>Jarvis Agent — Einstellungen</h3>

    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-faint);margin:0 0 8px">KI-Anbieter</div>
    <div class="form-group">
      <label for="ag-provider">Primärer Anbieter</label>
      <select id="ag-provider">${providerOptions()}</select>
    </div>
    <div class="form-group">
      <label for="ag-key">API-Key <span id="ag-signup-link" style="font-size:11px;color:var(--accent)"></span></label>
      <input type="password" id="ag-key" value="${sanitize(cfg.apiKey || '')}"
             placeholder="${AGENT_PROVIDERS[prov]?.keyPlaceholder || ''}" autocomplete="off" />
    </div>
    <div class="form-group">
      <label for="ag-model">Modell</label>
      <select id="ag-model">${modelOptions(prov)}</select>
    </div>
    <div class="form-group">
      <label for="ag-fallback">Fallback bei Rate-Limit</label>
      <select id="ag-fallback">${fallbackOptions()}</select>
    </div>
    <div class="form-group" id="ag-fbkey-wrap" style="${fbProv ? '' : 'display:none'}">
      <label for="ag-fbkey">Fallback API-Key</label>
      <input type="password" id="ag-fbkey" value="${sanitize(cfg.fallbackApiKey || '')}" placeholder="Key des Fallback-Anbieters" autocomplete="off" />
    </div>

    <hr style="border-color:var(--border);margin:14px 0 10px"/>
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-faint);margin-bottom:8px">Sprachausgabe (ElevenLabs)</div>
    <div class="form-group">
      <label for="ag-11key">ElevenLabs API-Key <a href="https://elevenlabs.io" target="_blank" style="font-size:11px;color:var(--accent)">kostenlos → elevenlabs.io</a></label>
      <input type="password" id="ag-11key" value="${sanitize(cfg.elevenLabsKey || '')}" placeholder="sk_…" autocomplete="off" />
    </div>
    <div class="form-group">
      <label for="ag-11voice">Stimme</label>
      <select id="ag-11voice">${voiceOptions()}</select>
    </div>

    <p style="font-size:11px;color:var(--text-faint);margin-top:8px">Alle Keys bleiben lokal im Browser — nichts wird gespeichert oder übertragen.</p>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-cancel">Abbrechen</button>
      <button class="btn btn-primary btn-ok">Speichern</button>
    </div>
  `, (modal) => {
    const provider        = modal.querySelector('#ag-provider').value;
    const apiKey          = modal.querySelector('#ag-key').value.trim();
    const model           = modal.querySelector('#ag-model').value;
    const fallbackProvider= modal.querySelector('#ag-fallback').value;
    const fallbackApiKey  = modal.querySelector('#ag-fbkey')?.value.trim() || '';
    const elevenLabsKey   = modal.querySelector('#ag-11key').value.trim();
    const elevenLabsVoice = modal.querySelector('#ag-11voice').value;
    JarvisDB.set('agentConfig', { provider, apiKey, model, fallbackProvider, fallbackApiKey, elevenLabsKey, elevenLabsVoice });
    showNotify('Einstellungen gespeichert.', 'success');
    const hint = document.querySelector('#agent-api-hint');
    if (hint && apiKey) {
      hint.innerHTML = `<span style="color:var(--app-calc)">✓ ${AGENT_PROVIDERS[provider]?.label || provider} konfiguriert</span>`;
      const status = document.querySelector('#agent-status');
      if (status) { status.textContent = '● Bereit'; status.style.color = 'var(--app-calc)'; }
    }
  });

  setTimeout(() => {
    const provSel  = document.querySelector('#ag-provider');
    const modelSel = document.querySelector('#ag-model');
    const keyInput = document.querySelector('#ag-key');
    const fbSel    = document.querySelector('#ag-fallback');
    const fbWrap   = document.querySelector('#ag-fbkey-wrap');
    const signupEl = document.querySelector('#ag-signup-link');

    function updateProviderUI(key) {
      const p = AGENT_PROVIDERS[key];
      if (!p) return;
      modelSel.innerHTML = p.models.map(m =>
        `<option value="${m.id}" ${m.id === p.defaultModel ? 'selected' : ''}>${m.label}</option>`
      ).join('');
      keyInput.placeholder = p.keyPlaceholder;
      keyInput.value = '';
      if (signupEl) signupEl.innerHTML = p.signup
        ? `— <a href="${p.signup}" target="_blank" style="color:var(--accent)">${p.free ? 'kostenlos' : 'registrieren'} → ${p.signup.replace('https://','')}</a>`
        : '';
      // Update fallback options
      fbSel.innerHTML = `<option value="">Kein Fallback</option>` +
        Object.entries(AGENT_PROVIDERS).filter(([k]) => k !== key).map(([fk, fp]) =>
          `<option value="${fk}">${fp.label}${fp.free ? ' ✓' : ''}</option>`
        ).join('');
    }

    if (provSel) {
      updateProviderUI(provSel.value);
      provSel.addEventListener('change', () => updateProviderUI(provSel.value));
    }
    if (fbSel && fbWrap) {
      fbSel.addEventListener('change', () => { fbWrap.style.display = fbSel.value ? '' : 'none'; });
    }
  }, 50);
}
