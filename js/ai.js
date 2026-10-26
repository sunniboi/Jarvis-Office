/* ===== JARVIS AI — Free LLM API Integration ===== */

const AI_PROVIDERS = {
  groq: {
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
      { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B (schnell)' },
      { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B' },
      { id: 'gemma2-9b-it',            label: 'Gemma 2 9B' },
    ],
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
    buildBody: (model, messages) => JSON.stringify({ model, messages, stream: false }),
    extractReply: (data) => data.choices[0].message.content,
    keyHint: 'console.groq.com → API Keys → Free',
  },
  openrouter: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    models: [
      { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)' },
      { id: 'mistralai/mistral-7b-instruct:free',     label: 'Mistral 7B (free)' },
      { id: 'google/gemma-2-9b-it:free',              label: 'Gemma 2 9B (free)' },
      { id: 'microsoft/phi-3-mini-128k-instruct:free',label: 'Phi-3 Mini (free)' },
    ],
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}`, 'HTTP-Referer': 'jarvis-office', 'X-Title': 'Jarvis Office' }),
    buildBody: (model, messages) => JSON.stringify({ model, messages }),
    extractReply: (data) => data.choices[0].message.content,
    keyHint: 'openrouter.ai → Keys → Free Tier (kein Zahlungsmittel nötig)',
  },
  gemini: {
    name: 'Google Gemini',
    url: null, // built per-call
    models: [
      { id: 'gemini-1.5-flash',   label: 'Gemini 1.5 Flash (free)' },
      { id: 'gemini-1.5-flash-8b',label: 'Gemini 1.5 Flash 8B (free)' },
    ],
    authHeader: () => ({}),
    buildBody: (model, messages) => {
      const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
      const systemMsg = messages.find(m => m.role === 'system');
      const body = { contents };
      if (systemMsg) body.system_instruction = { parts: [{ text: systemMsg.content }] };
      return JSON.stringify(body);
    },
    extractReply: (data) => data.candidates[0].content.parts[0].text,
    keyHint: 'aistudio.google.com → Get API Key → kostenlos',
    getUrl: (model, key) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
  },
};

function loadAIConfig() {
  return JSON.parse(localStorage.getItem('jarvis_ai_config') || '{}');
}

function saveAIConfig(cfg) {
  localStorage.setItem('jarvis_ai_config', JSON.stringify(cfg));
}

function initAI(container) {
  const cfg = loadAIConfig();

  container.innerHTML = `
    <div class="app-titlebar">
      <button class="btn-back" onclick="goHome()" aria-label="Zurück">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M19 12H5M5 12l7-7M5 12l7 7"/></svg>
      </button>
      <span class="app-title">Office AI</span>
      <button id="ai-settings-btn" class="btn-icon" title="API-Einstellungen" aria-label="API-Einstellungen">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><circle cx="10" cy="10" r="3"/><path d="M10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.22 4.22l1.06 1.06M14.72 14.72l1.06 1.06M4.22 15.78l1.06-1.06M14.72 5.28l1.06-1.06"/></svg>
      </button>
    </div>

    <div id="ai-settings-panel" class="ai-settings-panel hidden">
      <div class="ai-settings-inner">
        <h3>API-Einstellungen</h3>
        <div class="ai-provider-tabs">
          ${Object.entries(AI_PROVIDERS).map(([id, p]) => `
            <button class="ai-tab" data-provider="${id}">${p.name}</button>
          `).join('')}
        </div>
        ${Object.entries(AI_PROVIDERS).map(([id, p]) => `
          <div class="ai-provider-config hidden" id="ai-cfg-${id}">
            <label>API-Key <small>(${p.keyHint})</small></label>
            <div class="ai-key-row">
              <input type="password" id="ai-key-${id}" placeholder="API-Key eingeben..." value="${cfg[id]?.key || ''}" autocomplete="off" />
              <button class="btn-show-key" data-provider="${id}" title="Key anzeigen">👁</button>
            </div>
            <label>Modell</label>
            <select id="ai-model-${id}">
              ${p.models.map(m => `<option value="${m.id}" ${cfg[id]?.model === m.id ? 'selected' : ''}>${m.label}</option>`).join('')}
            </select>
          </div>
        `).join('')}
        <div class="ai-settings-actions">
          <button id="ai-save-cfg" class="btn-primary">Speichern</button>
          <button id="ai-close-cfg" class="btn-secondary">Schließen</button>
        </div>
      </div>
    </div>

    <div class="ai-main">
      <div class="ai-provider-bar">
        <select id="ai-active-provider">
          ${Object.entries(AI_PROVIDERS).map(([id, p]) => `
            <option value="${id}" ${cfg.activeProvider === id ? 'selected' : ''}>${p.name}</option>
          `).join('')}
        </select>
        <button id="ai-clear-btn" class="btn-icon" title="Chat leeren" aria-label="Chat leeren">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>

      <div id="ai-messages" class="ai-messages" aria-live="polite" aria-label="Chatverlauf">
        <div class="ai-welcome">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--app-ai)" stroke-width="1.5" width="48" height="48"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/><circle cx="12" cy="12" r="3" fill="var(--app-ai)" opacity=".3"/></svg>
          <p>Office AI ist bereit.<br><small>API-Key über das Zahnrad-Icon eintragen.</small></p>
        </div>
      </div>

      <div class="ai-input-area">
        <div class="ai-system-row">
          <input type="text" id="ai-system-prompt" placeholder="System-Prompt (optional)..." value="${cfg.systemPrompt || ''}" />
        </div>
        <div class="ai-input-row">
          <textarea id="ai-user-input" placeholder="Nachricht eingeben…" rows="1" aria-label="Nachricht"></textarea>
          <button id="ai-send-btn" class="btn-send" aria-label="Senden" title="Senden (Enter)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;

  const messages = [];
  let activeProviderTabId = Object.keys(AI_PROVIDERS)[0];

  // Settings panel toggle
  document.getElementById('ai-settings-btn').addEventListener('click', () => {
    document.getElementById('ai-settings-panel').classList.toggle('hidden');
    showProviderTab(activeProviderTabId);
  });

  document.getElementById('ai-close-cfg').addEventListener('click', () => {
    document.getElementById('ai-settings-panel').classList.add('hidden');
  });

  // Provider tabs in settings
  container.querySelectorAll('.ai-tab').forEach(btn => {
    btn.addEventListener('click', () => showProviderTab(btn.dataset.provider));
  });

  function showProviderTab(id) {
    activeProviderTabId = id;
    container.querySelectorAll('.ai-tab').forEach(b => b.classList.toggle('active', b.dataset.provider === id));
    container.querySelectorAll('.ai-provider-config').forEach(d => d.classList.add('hidden'));
    const el = document.getElementById(`ai-cfg-${id}`);
    if (el) el.classList.remove('hidden');
  }
  showProviderTab(activeProviderTabId);

  // Show/hide key buttons
  container.querySelectorAll('.btn-show-key').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(`ai-key-${btn.dataset.provider}`);
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  // Save config
  document.getElementById('ai-save-cfg').addEventListener('click', () => {
    const newCfg = { activeProvider: document.getElementById('ai-active-provider').value, systemPrompt: document.getElementById('ai-system-prompt').value };
    Object.keys(AI_PROVIDERS).forEach(id => {
      newCfg[id] = {
        key: document.getElementById(`ai-key-${id}`).value.trim(),
        model: document.getElementById(`ai-model-${id}`).value,
      };
    });
    saveAIConfig(newCfg);
    document.getElementById('ai-settings-panel').classList.add('hidden');
    appendSystemMsg('Einstellungen gespeichert.');
  });

  // Clear chat
  document.getElementById('ai-clear-btn').addEventListener('click', () => {
    messages.length = 0;
    document.getElementById('ai-messages').innerHTML = '';
    appendSystemMsg('Chat geleert.');
  });

  // Auto-resize textarea
  const textarea = document.getElementById('ai-user-input');
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
  });

  // Send on Enter (Shift+Enter = Zeilenumbruch)
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  document.getElementById('ai-send-btn').addEventListener('click', sendMessage);

  async function sendMessage() {
    const cfg = loadAIConfig();
    const providerId = document.getElementById('ai-active-provider').value;
    const provider = AI_PROVIDERS[providerId];
    const apiKey = cfg[providerId]?.key;
    const model = cfg[providerId]?.model || provider.models[0].id;
    const userText = textarea.value.trim();
    const systemPromptText = document.getElementById('ai-system-prompt').value.trim();

    if (!userText) return;
    if (!apiKey) {
      appendSystemMsg('Kein API-Key konfiguriert. Bitte über das Zahnrad-Icon eintragen.');
      return;
    }

    textarea.value = '';
    textarea.style.height = 'auto';

    appendMessage('user', userText);

    const payload = [];
    if (systemPromptText) payload.push({ role: 'system', content: systemPromptText });
    messages.push({ role: 'user', content: userText });
    payload.push(...messages);

    const loadingId = appendLoading();
    document.getElementById('ai-send-btn').disabled = true;

    try {
      const url = provider.getUrl ? provider.getUrl(model, apiKey) : provider.url;
      const headers = { 'Content-Type': 'application/json', ...provider.authHeader(apiKey) };
      const body = provider.buildBody(model, payload);

      const resp = await fetch(url, { method: 'POST', headers, body });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 200)}`);
      }

      const data = await resp.json();
      const reply = provider.extractReply(data);

      removeLoading(loadingId);
      messages.push({ role: 'assistant', content: reply });
      appendMessage('assistant', reply);
    } catch (err) {
      removeLoading(loadingId);
      appendSystemMsg(`Fehler: ${err.message}`);
      messages.pop(); // remove last user message so retry works
    } finally {
      document.getElementById('ai-send-btn').disabled = false;
      textarea.focus();
    }
  }

  function appendMessage(role, text) {
    const el = document.createElement('div');
    el.className = `ai-msg ai-msg-${role}`;
    el.innerHTML = `<div class="ai-bubble">${formatAIText(text)}</div>`;
    const msgArea = document.getElementById('ai-messages');
    // Remove welcome screen on first real message
    const welcome = msgArea.querySelector('.ai-welcome');
    if (welcome) welcome.remove();
    msgArea.appendChild(el);
    msgArea.scrollTop = msgArea.scrollHeight;
  }

  function appendSystemMsg(text) {
    const el = document.createElement('div');
    el.className = 'ai-system-msg';
    el.textContent = text;
    const msgArea = document.getElementById('ai-messages');
    msgArea.appendChild(el);
    msgArea.scrollTop = msgArea.scrollHeight;
  }

  let loadingCounter = 0;
  function appendLoading() {
    const id = `ai-loading-${++loadingCounter}`;
    const el = document.createElement('div');
    el.className = 'ai-msg ai-msg-assistant';
    el.id = id;
    el.innerHTML = '<div class="ai-bubble ai-loading"><span></span><span></span><span></span></div>';
    const msgArea = document.getElementById('ai-messages');
    msgArea.appendChild(el);
    msgArea.scrollTop = msgArea.scrollHeight;
    return id;
  }

  function removeLoading(id) {
    document.getElementById(id)?.remove();
  }

  function formatAIText(text) {
    // Minimal Markdown: code blocks, inline code, bold, newlines
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/```([\s\S]*?)```/g, (_, c) => `<pre><code>${c.trim()}</code></pre>`)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }
}
