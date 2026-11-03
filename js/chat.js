// ===== JARVIS CHAT — prompts.chat Integration =====

const PROMPTS_LIBRARY = [
  { act: "Linux Terminal", prompt: "Ich möchte, dass du als Linux-Terminal agierst. Ich gebe Befehle ein und du antwortest mit dem, was das Terminal ausgeben würde. Nur Terminalausgabe, kein Erklärungstext." },
  { act: "JavaScript Konsole", prompt: "Ich möchte, dass du als JavaScript-Konsole agierst. Ich tippe Code und du gibst die Ausgabe aus. Nur die Ausgabe, keine Erklärungen." },
  { act: "Englisch-Übersetzer & Verbesserer", prompt: "Ich spreche mit dir in beliebiger Sprache. Du erkennst die Sprache, übersetzt ins Englische und verbesserst mein Englisch. Antworte nur mit der Übersetzung/Verbesserung, ohne Erklärungen." },
  { act: "Interviewer", prompt: "Ich möchte, dass du als Interviewer für eine Stelle agierst, die ich dir nenne. Du stellst mir Interviewfragen, eine nach der anderen, und wartest auf meine Antwort. Beginne mit der ersten Frage." },
  { act: "Excel-Tabellen-Experte", prompt: "Ich möchte, dass du als textbasiertes Excel agierst. Ich gebe dir Tabellendaten und du antwortest mit einer formatierten Tabelle, Formeln und Berechnungen." },
  { act: "Englisch-Aussprache-Helfer", prompt: "Ich möchte, dass du als Aussprache-Helfer für englische Texte agierst. Ich schreibe Sätze und du antwortest mit der phonetischen Aussprache auf Deutsch." },
  { act: "Reiseguide", prompt: "Ich möchte, dass du als Reiseguide agierst. Ich nenne dir meinen Standort und du schlägst Sehenswürdigkeiten in der Nähe vor. Ich nenne manchmal auch andere Orte, die ich besuchen möchte." },
  { act: "Plagiatsprüfer", prompt: "Ich möchte, dass du als Plagiatsprüfer agierst. Ich schreibe Sätze und du antwortest nur, wenn du Plagiate findest. Wenn keine gefunden werden, schreibe nichts." },
  { act: "Werbetexter", prompt: "Ich möchte, dass du als Werbetexter agierst. Du erstellst eine Kampagne für ein Produkt oder eine Dienstleistung, die ich dir nenne. Zielgruppe, Kernbotschaft und Slogan." },
  { act: "Story-Erzähler", prompt: "Ich möchte, dass du als Story-Erzähler agierst. Du erzählst unterhaltsame Geschichten, die lehrreich und fantasievoll sind. Ich kann Thema und Zielgruppe vorgeben." },
  { act: "Stand-up Comedian", prompt: "Ich möchte, dass du als Stand-up Comedian agierst. Ich gebe dir Themen und du lieferst lustige, clevere und zeitkritische Routinen dazu." },
  { act: "Motivationscoach", prompt: "Ich möchte, dass du als Motivationscoach agierst. Ich erzähle dir meine Herausforderungen und du gibst mir Strategien und ermutigende Aussagen." },
  { act: "Debattierpartner", prompt: "Ich möchte, dass du die Gegenseite meiner Aussage vertrittst. Ich mache eine Aussage und du argumentierst dagegen, auch wenn du anderer Meinung bist." },
  { act: "SQL-Assistent", prompt: "Ich möchte, dass du als SQL-Assistent agierst. Ich beschreibe, was ich brauche, und du lieferst SQL-Abfragen. Kein Erklärungstext, nur SQL." },
  { act: "Ernährungsberater", prompt: "Ich möchte, dass du als Ernährungsberater agierst. Ich nenne dir meine Lebensmittelpräferenzen und du erstellst individuelle Ernährungspläne." },
  { act: "Psychologe", prompt: "Ich möchte, dass du als Psychologe agierst. Du gibst wissenschaftlich fundierte Ratschläge für emotionale und mentale Herausforderungen." },
  { act: "Haushaltsplaner", prompt: "Ich möchte, dass du als Haushaltsplaner agierst. Ich nenne Einnahmen und Ausgaben und du erstellst einen Sparplan mit konkreten Empfehlungen." },
  { act: "Code-Reviewer", prompt: "Ich möchte, dass du als Code-Reviewer agierst. Ich paste Code und du analysierst ihn auf Bugs, Performance und Best Practices." },
  { act: "Linux-Support (Laien)", prompt: "Ich möchte, dass du Linux-Probleme für Laien erklärst. Ich beschreibe mein Problem und du erklärst die Lösung Schritt für Schritt, ohne Fachwissen vorauszusetzen." },
  { act: "Reparaturberater", prompt: "Ich beschreibe ein defektes Gerät und du analysierst mögliche Ursachen und Reparaturschritte. Fange mit den einfachsten Ursachen an." },
  { act: "Freier Assistent", prompt: "" },
];

function initChat(container) {
  const settings = JarvisDB.get('settings', {});
  const apiSettings = JarvisDB.get('chat_api', { provider: 'none', key: '', model: '' });

  container.innerHTML = `
    <div class="app-titlebar">
      <button class="back-btn" onclick="goHome()">←</button>
      <span class="app-title">Jarvis Chat</span>
      <div style="flex:1"></div>
      <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px;" onclick="openChatSettings()">⚙ API</button>
    </div>
    <div class="chat-layout">
      <aside class="chat-sidebar">
        <div class="chat-sidebar-header">
          <span>Prompt-Bibliothek</span>
          <span class="chat-badge">prompts.chat</span>
        </div>
        <input type="text" id="prompt-search" class="chat-search" placeholder="Suchen…" oninput="filterPrompts(this.value)" />
        <div id="prompt-list" class="prompt-list"></div>
      </aside>
      <div class="chat-main">
        <div id="chat-system-bar" class="chat-system-bar">
          <span id="chat-system-label">Modus: <em id="chat-act-name">Freier Assistent</em></span>
          <button class="btn-ghost-xs" onclick="clearChat()">Chat leeren</button>
        </div>
        <div id="chat-messages" class="chat-messages"></div>
        <div class="chat-input-bar">
          <textarea id="chat-input" class="chat-textarea" placeholder="Nachricht eingeben… (Enter = senden, Shift+Enter = Zeilenumbruch)" rows="3"></textarea>
          <button id="chat-send-btn" class="btn btn-primary chat-send-btn" onclick="sendChatMessage()">Senden</button>
        </div>
      </div>
    </div>
  `;

  renderPromptList(PROMPTS_LIBRARY);
  selectPrompt(PROMPTS_LIBRARY[PROMPTS_LIBRARY.length - 1]);

  const ta = document.getElementById('chat-input');
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
  });

  window._chatHistory = [];
  window._chatSystemPrompt = '';
  window._chatActName = 'Freier Assistent';
}

function renderPromptList(prompts) {
  const list = document.getElementById('prompt-list');
  if (!list) return;
  list.innerHTML = prompts.map((p, i) => `
    <button class="prompt-item ${window._chatActName === p.act ? 'active' : ''}"
      onclick="selectPromptByAct('${escHTML(p.act)}')" title="${escHTML(p.prompt)}">
      ${escHTML(p.act)}
    </button>
  `).join('');
}

function escHTML(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function filterPrompts(q) {
  const filtered = q.trim()
    ? PROMPTS_LIBRARY.filter(p => p.act.toLowerCase().includes(q.toLowerCase()))
    : PROMPTS_LIBRARY;
  renderPromptList(filtered);
}

function selectPromptByAct(act) {
  const p = PROMPTS_LIBRARY.find(x => x.act === act);
  if (p) selectPrompt(p);
}

function selectPrompt(p) {
  window._chatSystemPrompt = p.prompt;
  window._chatActName = p.act;
  window._chatHistory = [];
  const nameEl = document.getElementById('chat-act-name');
  if (nameEl) nameEl.textContent = p.act;
  const msgs = document.getElementById('chat-messages');
  if (msgs) msgs.innerHTML = '';
  renderPromptList(PROMPTS_LIBRARY.filter(x => {
    const q = document.getElementById('prompt-search')?.value || '';
    return !q || x.act.toLowerCase().includes(q.toLowerCase());
  }));
  if (p.prompt) {
    appendChatMsg('system', `System-Prompt aktiv: "${p.prompt.substring(0, 120)}${p.prompt.length > 120 ? '…' : ''}"`);
  }
}

function appendChatMsg(role, text) {
  const msgs = document.getElementById('chat-messages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = `chat-msg chat-msg-${role}`;
  div.innerHTML = `<div class="chat-bubble">${formatChatText(text)}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function formatChatText(text) {
  return escHTML(text)
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

async function sendChatMessage() {
  const ta = document.getElementById('chat-input');
  const text = ta.value.trim();
  if (!text) return;
  ta.value = '';

  appendChatMsg('user', text);
  window._chatHistory.push({ role: 'user', content: text });

  const apiSettings = JarvisDB.get('chat_api', { provider: 'none', key: '', model: '' });

  if (!apiSettings.key || apiSettings.provider === 'none') {
    appendChatMsg('assistant', '⚠ Kein API-Key konfiguriert. Bitte unter ⚙ API den Key eintragen.\n\n*Tipp: OpenAI, Anthropic Claude oder Ollama (lokal) werden unterstützt.*');
    return;
  }

  const btn = document.getElementById('chat-send-btn');
  if (btn) { btn.disabled = true; btn.textContent = '…'; }

  try {
    const reply = await callChatAPI(apiSettings, window._chatSystemPrompt, window._chatHistory);
    window._chatHistory.push({ role: 'assistant', content: reply });
    appendChatMsg('assistant', reply);
  } catch (err) {
    appendChatMsg('assistant', `❌ Fehler: ${err.message}`);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Senden'; }
  }
}

async function callChatAPI(cfg, systemPrompt, history) {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push(...history);

  if (cfg.provider === 'openai' || cfg.provider === 'ollama' || cfg.provider === 'groq') {
    const url = cfg.provider === 'ollama'
      ? `${cfg.baseUrl || 'http://localhost:11434'}/v1/chat/completions`
      : cfg.provider === 'groq'
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cfg.provider !== 'ollama' ? { 'Authorization': `Bearer ${cfg.key}` } : {}),
      },
      body: JSON.stringify({
        model: cfg.model || (cfg.provider === 'ollama' ? 'llama3' : cfg.provider === 'groq' ? 'llama-3.1-8b-instant' : 'gpt-4o-mini'),
        messages,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '(Keine Antwort)';
  }

  if (cfg.provider === 'anthropic') {
    const claudeMessages = history.map(m => ({ role: m.role, content: m.content }));
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cfg.key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: cfg.model || 'claude-haiku-4-5',
        system: systemPrompt || undefined,
        messages: claudeMessages,
        max_tokens: 2048,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.content?.[0]?.text || '(Keine Antwort)';
  }

  throw new Error(`Unbekannter Provider: ${cfg.provider}`);
}

function clearChat() {
  window._chatHistory = [];
  const msgs = document.getElementById('chat-messages');
  if (msgs) msgs.innerHTML = '';
  if (window._chatSystemPrompt) {
    appendChatMsg('system', `System-Prompt aktiv: "${window._chatSystemPrompt.substring(0, 120)}${window._chatSystemPrompt.length > 120 ? '…' : ''}"`);
  }
}

function openChatSettings() {
  const s = JarvisDB.get('chat_api', { provider: 'openai', key: '', model: '', baseUrl: '' });
  showModal(`
    <h3>⚙ Chat API-Einstellungen</h3>
    <div class="form-group">
      <label>Provider</label>
      <select id="cs-provider">
        <option value="groq" ${s.provider==='groq'?'selected':''}>Groq (kostenlos)</option>
        <option value="openai" ${s.provider==='openai'?'selected':''}>OpenAI (ChatGPT)</option>
        <option value="anthropic" ${s.provider==='anthropic'?'selected':''}>Anthropic (Claude)</option>
        <option value="ollama" ${s.provider==='ollama'?'selected':''}>Ollama (lokal)</option>
        <option value="none" ${s.provider==='none'||!s.provider?'selected':''}>— kein API —</option>
      </select>
    </div>
    <div class="form-group">
      <label>API-Key</label>
      <input type="password" id="cs-key" value="${s.key||''}" placeholder="sk-… / sk-ant-…" autocomplete="off"/>
    </div>
    <div class="form-group">
      <label>Modell</label>
      <input type="text" id="cs-model" value="${s.model||''}" placeholder="z.B. gpt-4o-mini / claude-haiku-4-5 / llama3"/>
    </div>
    <div class="form-group" id="cs-baseurl-group" style="${s.provider==='ollama'?'':'display:none'}">
      <label>Ollama Base URL</label>
      <input type="text" id="cs-baseurl" value="${s.baseUrl||'http://localhost:11434'}" />
    </div>
    <p style="font-size:11px;color:var(--text3);margin-top:8px;">Der API-Key wird nur lokal im Browser gespeichert (localStorage).</p>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-cancel">Abbrechen</button>
      <button class="btn btn-primary btn-ok">Speichern</button>
    </div>
  `, () => {
    const provider = document.getElementById('cs-provider').value;
    const key = document.getElementById('cs-key').value.trim();
    const model = document.getElementById('cs-model').value.trim();
    const baseUrl = document.getElementById('cs-baseurl')?.value.trim();
    JarvisDB.set('chat_api', { provider, key, model, baseUrl });
    showNotify('API-Einstellungen gespeichert.', 'success');
  });

  setTimeout(() => {
    const sel = document.getElementById('cs-provider');
    if (sel) sel.addEventListener('change', () => {
      const g = document.getElementById('cs-baseurl-group');
      if (g) g.style.display = sel.value === 'ollama' ? '' : 'none';
    });
  }, 50);
}
