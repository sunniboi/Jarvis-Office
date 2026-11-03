/* ===== JARVIS OFFICE v2 — AGENT SKILLS ===== */

const AGENT_SKILLS = [
  {
    id: 'draft',
    name: 'Textentwurf',
    desc: 'Dokument oder Text verfassen',
    icon: '<path d="M11 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" stroke-width="1.5"/><polyline points="13,2 13,9 20,9" stroke-width="1.5"/><path d="M9 13h6M9 17h4" stroke-width="1.5" stroke-linecap="round"/>',
    color: 'var(--app-write)',
    prompt: 'Du bist ein professioneller Texter. Erstelle einen Textentwurf auf Basis der folgenden Anforderungen. Antworte auf Deutsch, es sei denn der Nutzer gibt eine andere Sprache vor.\n\nAnforderung: ',
  },
  {
    id: 'email',
    name: 'E-Mail verfassen',
    desc: 'Professionelle E-Mail schreiben',
    icon: '<rect x="2" y="5" width="20" height="14" rx="2" stroke-width="1.5"/><polyline points="2,7 12,14 22,7" stroke-width="1.5"/>',
    color: 'var(--app-mail)',
    prompt: 'Du bist ein Experte für professionelle Kommunikation. Schreibe eine E-Mail basierend auf dieser Beschreibung. Ton und Anrede werden vom Nutzer vorgegeben. Antworte auf Deutsch.\n\nBeschreibung: ',
  },
  {
    id: 'summarize',
    name: 'Zusammenfassen',
    desc: 'Text auf das Wesentliche kürzen',
    icon: '<line x1="8" y1="6" x2="21" y2="6" stroke-width="1.5" stroke-linecap="round"/><line x1="8" y1="12" x2="21" y2="12" stroke-width="1.5" stroke-linecap="round"/><line x1="8" y1="18" x2="16" y2="18" stroke-width="1.5" stroke-linecap="round"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>',
    color: 'var(--app-calc)',
    prompt: 'Fasse den folgenden Text präzise und klar zusammen. Behalte alle wichtigen Kernaussagen, lass Unwichtiges weg. Antworte auf Deutsch.\n\nText: ',
  },
  {
    id: 'translate',
    name: 'Übersetzen',
    desc: 'Text in andere Sprache übertragen',
    icon: '<circle cx="12" cy="12" r="10" stroke-width="1.5"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke-width="1.5"/>',
    color: 'var(--app-matrix)',
    prompt: 'Übersetze den folgenden Text. Der Nutzer gibt die Zielsprache an (Standard: Englisch). Liefere nur die Übersetzung, keinen Kommentar.\n\nText: ',
  },
  {
    id: 'brainstorm',
    name: 'Brainstorming',
    desc: 'Ideen entwickeln und strukturieren',
    icon: '<circle cx="12" cy="12" r="10" stroke-width="1.5"/><path d="M12 8v4M12 16h.01" stroke-width="2" stroke-linecap="round"/>',
    color: 'var(--app-present)',
    prompt: 'Du bist ein kreativer Ideengeber. Sammle strukturierte Ideen zum folgenden Thema. Liefere konkrete, umsetzbare Vorschläge als nummerierte Liste. Antworte auf Deutsch.\n\nThema: ',
  },
  {
    id: 'proofread',
    name: 'Korrekturlesen',
    desc: 'Rechtschreibung & Stil prüfen',
    icon: '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke-width="1.5"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="1.5"/>',
    color: 'var(--app-draw)',
    prompt: 'Lese den folgenden Text Korrektur. Korrigiere Rechtschreibung, Grammatik und Zeichensetzung. Verbessere den Stil wo nötig. Zeige zuerst den korrigierten Text, dann eine kurze Liste der Änderungen. Antworte auf Deutsch.\n\nText: ',
  },
  {
    id: 'code',
    name: 'Code erklären',
    desc: 'Quellcode analysieren & verstehen',
    icon: '<polyline points="16,18 22,12 16,6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="8,6 2,12 8,18" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    color: 'var(--app-notes)',
    prompt: 'Erkläre den folgenden Code verständlich und präzise. Beschreibe was er tut, wie er funktioniert und weise auf mögliche Probleme oder Verbesserungen hin. Antworte auf Deutsch.\n\nCode: ',
  },
  {
    id: 'free',
    name: 'Freier Chat',
    desc: 'Direkte Unterhaltung mit Jarvis',
    icon: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke-width="1.5"/>',
    color: 'var(--accent)',
    prompt: '',
  },
];

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
        <div class="agent-skills-header">Skills</div>
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
            <button class="btn btn-primary agent-send-btn" id="agent-send-btn" aria-label="Senden">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Build skill grid
  const grid = container.querySelector('#agent-skills-grid');
  for (const skill of AGENT_SKILLS) {
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

  checkApiConfig();

  // Event listeners
  const input  = container.querySelector('#agent-input');
  const sendBtn = container.querySelector('#agent-send-btn');
  const clearBtn = container.querySelector('#agent-clear-btn');
  const skillClear = container.querySelector('#agent-skill-clear');

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  clearBtn.addEventListener('click', clearHistory);
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

  showModal(`
    <h3>Jarvis Agent — Einstellungen</h3>
    <div class="form-group">
      <label for="ag-provider">KI-Anbieter</label>
      <select id="ag-provider">
        <option value="groq"      ${prov === 'groq'      ? 'selected' : ''}>Groq (kostenlos, sehr schnell)</option>
        <option value="anthropic" ${prov === 'anthropic' ? 'selected' : ''}>Anthropic Claude (bezahlt)</option>
      </select>
    </div>
    <div class="form-group">
      <label for="ag-key" id="ag-key-label">API-Key</label>
      <input type="password" id="ag-key" value="${sanitize(cfg.apiKey || '')}"
             placeholder="${AGENT_PROVIDERS[prov]?.keyPlaceholder || ''}" autocomplete="off" />
    </div>
    <div class="form-group">
      <label for="ag-model">Modell</label>
      <select id="ag-model">${modelOptions(prov)}</select>
    </div>
    <p style="font-size:11px;color:var(--text-faint);margin-top:4px">Key bleibt lokal im Browser — wird nirgends übertragen.</p>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-cancel">Abbrechen</button>
      <button class="btn btn-primary btn-ok">Speichern</button>
    </div>
  `, (modal) => {
    const provider = modal.querySelector('#ag-provider').value;
    const apiKey   = modal.querySelector('#ag-key').value.trim();
    const model    = modal.querySelector('#ag-model').value;
    JarvisDB.set('agentConfig', { provider, apiKey, model });
    showNotify('Agent-Einstellungen gespeichert.', 'success');
    const hint = document.querySelector('#agent-api-hint');
    if (hint && apiKey) {
      hint.innerHTML = `<span style="color:var(--app-calc)">✓ ${AGENT_PROVIDERS[provider]?.label || provider} konfiguriert</span>`;
      const status = document.querySelector('#agent-status');
      if (status) { status.textContent = '● Bereit'; status.style.color = 'var(--app-calc)'; }
    }
  });

  // Live: Provider-Wechsel aktualisiert Modell-Liste + Placeholder
  setTimeout(() => {
    const provSel  = document.querySelector('#ag-provider');
    const modelSel = document.querySelector('#ag-model');
    const keyInput = document.querySelector('#ag-key');
    if (!provSel) return;
    provSel.addEventListener('change', () => {
      const p = AGENT_PROVIDERS[provSel.value];
      if (!p) return;
      modelSel.innerHTML = p.models.map(m =>
        `<option value="${m.id}" ${m.id === p.defaultModel ? 'selected' : ''}>${m.label}</option>`
      ).join('');
      keyInput.placeholder = p.keyPlaceholder;
      keyInput.value = '';
    });
  }, 50);
}
