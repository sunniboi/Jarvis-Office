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

let _speechRecog = null;
let _speechActive = false;
let _ttsEnabled = false;

function initChat(container) {
  container.innerHTML = `
    <div class="app-titlebar">
      <button class="back-btn" onclick="goHome()">←</button>
      <span class="app-title">Jarvis Chat</span>
      <div style="flex:1"></div>
      <button id="tts-toggle" class="btn btn-ghost" style="font-size:12px;padding:4px 10px;" onclick="toggleTTS()" title="Sprachausgabe">🔇</button>
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
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="btn-ghost-xs" onclick="openAgentTools()" title="Agent-Tools">🛠 Tools</button>
            <button class="btn-ghost-xs" onclick="clearChat()">Chat leeren</button>
          </div>
        </div>
        <div id="chat-messages" class="chat-messages"></div>
        <div class="chat-input-bar">
          <button id="mic-btn" class="btn btn-ghost chat-mic-btn" onclick="toggleMic()" title="Spracheingabe">🎤</button>
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
  window._agentTools = JarvisDB.get('agent_tools', { websearch: false, datetime: true, fileread: false });
}

// ===== SPRACHEINGABE =====
function toggleMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showNotify('Spracheingabe nicht unterstützt.', 'error'); return; }
  if (_speechActive) {
    _speechRecog && _speechRecog.stop();
    return;
  }
  _speechRecog = new SR();
  _speechRecog.lang = 'de-DE';
  _speechRecog.continuous = false;
  _speechRecog.interimResults = false;
  _speechRecog.onstart = () => {
    _speechActive = true;
    const btn = document.getElementById('mic-btn');
    if (btn) { btn.textContent = '⏹'; btn.style.color = 'var(--danger)'; }
  };
  _speechRecog.onresult = (e) => {
    const text = e.results[0][0].transcript;
    const ta = document.getElementById('chat-input');
    if (ta) ta.value = text;
  };
  _speechRecog.onend = () => {
    _speechActive = false;
    const btn = document.getElementById('mic-btn');
    if (btn) { btn.textContent = '🎤'; btn.style.color = ''; }
  };
  _speechRecog.onerror = () => {
    _speechActive = false;
    const btn = document.getElementById('mic-btn');
    if (btn) { btn.textContent = '🎤'; btn.style.color = ''; }
    showNotify('Mikrofon-Fehler.', 'error');
  };
  _speechRecog.start();
}

// ===== SPRACHAUSGABE =====
function toggleTTS() {
  _ttsEnabled = !_ttsEnabled;
  const btn = document.getElementById('tts-toggle');
  if (btn) btn.textContent = _ttsEnabled ? '🔊' : '🔇';
  showNotify(_ttsEnabled ? 'Sprachausgabe an.' : 'Sprachausgabe aus.', 'success');
}

function speakText(text) {
  if (!_ttsEnabled || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/[*_`#]/g, '').replace(/<[^>]+>/g, '').substring(0, 500);
  const utt = new SpeechSynthesisUtterance(clean);
  utt.lang = 'de-DE';
  utt.rate = 1.0;
  window.speechSynthesis.speak(utt);
}

// ===== AGENT TOOLS =====
function openAgentTools() {
  const t = window._agentTools || { websearch: false, datetime: true, fileread: false };
  showModal(`
    <h3>🛠 Agent-Tools</h3>
    <p style="font-size:12px;color:var(--text2);margin-bottom:12px;">Diese Tools stehen dem KI-Agenten zur Verfügung.</p>
    <div class="form-group" style="flex-direction:row;align-items:center;gap:10px;">
      <input type="checkbox" id="tool-websearch" ${t.websearch?'checked':''} style="width:auto"/>
      <label for="tool-websearch" style="margin:0">🌐 Websuche (DuckDuckGo)</label>
    </div>
    <div class="form-group" style="flex-direction:row;align-items:center;gap:10px;">
      <input type="checkbox" id="tool-datetime" ${t.datetime?'checked':''} style="width:auto"/>
      <label for="tool-datetime" style="margin:0">🕐 Datum & Uhrzeit</label>
    </div>
    <div class="form-group" style="flex-direction:row;align-items:center;gap:10px;">
      <input type="checkbox" id="tool-fileread" ${t.fileread?'checked':''} style="width:auto"/>
      <label for="tool-fileread" style="margin:0">📂 Datei lesen (vom Gerät)</label>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-cancel">Abbrechen</button>
      <button class="btn btn-primary btn-ok">Speichern</button>
    </div>
  `, () => {
    window._agentTools = {
      websearch: document.getElementById('tool-websearch').checked,
      datetime: document.getElementById('tool-datetime').checked,
      fileread: document.getElementById('tool-fileread').checked,
    };
    JarvisDB.set('agent_tools', window._agentTools);
    showNotify('Tools gespeichert.', 'success');
  });
}

async function runAgentTools(userText) {
  const tools = window._agentTools || {};
  const results = [];

  if (tools.datetime) {
    const now = new Date();
    results.push(`[Aktuelles Datum & Uhrzeit: ${now.toLocaleString('de-DE')}]`);
  }

  if (tools.websearch && userText.length > 5) {
    try {
      const query = encodeURIComponent(userText.substring(0, 100));
      const res = await fetch(`https://api.duckduckgo.com/?q=${query}&format=json&no_html=1&skip_disambig=1`);
      const data = await res.json();
      if (data.AbstractText) {
        results.push(`[Websuche-Ergebnis: ${data.AbstractText.substring(0, 400)}]`);
      } else if (data.RelatedTopics?.[0]?.Text) {
        results.push(`[Websuche: ${data.RelatedTopics[0].Text.substring(0, 400)}]`);
      }
    } catch(e) {}
  }

  return results.join('\n');
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

  const apiSettings = JarvisDB.get('chat_api', { provider: 'none', key: '', model: '' });

  if (!apiSettings.key || apiSettings.provider === 'none') {
    appendChatMsg('assistant', '⚠ Kein API-Key konfiguriert. Bitte unter ⚙ API den Key eintragen.');
    return;
  }

  const btn = document.getElementById('chat-send-btn');
  if (btn) { btn.disabled = true; btn.textContent = '…'; }

  try {
    const toolContext = await runAgentTools(text);
    const fullText = toolContext ? `${toolContext}\n\nNutzerfrage: ${text}` : text;
    window._chatHistory.push({ role: 'user', content: fullText });
    const reply = await callChatAPI(apiSettings, window._chatSystemPrompt, window._chatHistory);
    window._chatHistory.push({ role: 'assistant', content: reply });
    appendChatMsg('assistant', reply);
    speakText(reply);
  } catch (err) {
    appendChatMsg('assistant', `❌ Fehler: ${err.message}`);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Senden'; }
  }
}

const GROQ_FALLBACK_MODELS = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'meta-models/muse-spark-open',
];

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

    if (cfg.provider === 'groq' && cfg.model) {
      const modelsToTry = [cfg.model, ...GROQ_FALLBACK_MODELS.filter(m => m !== cfg.model)];
      for (const model of modelsToTry) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.key}` },
            body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.7 }),
          });
          if (res.status === 404 || res.status === 400) continue;
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
          const data = await res.json();
          if (model !== cfg.model) {
            cfg.model = model;
            JarvisDB.set('chat_api', cfg);
            showNotify(`Modell gewechselt zu: ${model}`, 'success');
          }
          return data.choices?.[0]?.message?.content || '(Keine Antwort)';
        } catch(e) {
          if (!e.message.includes('404') && !e.message.includes('400')) throw e;
        }
      }
      throw new Error('Kein verfügbares Modell gefunden. Bitte auf console.groq.com prüfen.');
    }

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
  const s = JarvisDB.get('chat_api', { provider: 'groq', key: '', model: '', baseUrl: '' });
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
      <div style="display:flex;gap:6px;">
        <input type="password" id="cs-key" value="${s.key||''}" placeholder="gsk_… / sk-… / sk-ant-…" autocomplete="off" style="flex:1"/>
        <button class="btn btn-ghost" style="padding:0 10px;font-size:12px;" onclick="loadGroqModels()">Modelle laden</button>
      </div>
    </div>
    <div class="form-group">
      <label>Modell</label>
      <select id="cs-model-select" style="display:none"></select>
      <input type="text" id="cs-model" value="${s.model||''}" placeholder="Key eingeben → Modelle laden klicken"/>
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
    const sel = document.getElementById('cs-model-select');
    const model = (sel && sel.style.display !== 'none' ? sel.value : document.getElementById('cs-model').value).trim();
    const baseUrl = document.getElementById('cs-baseurl')?.value.trim();
    JarvisDB.set('chat_api', { provider, key, model, baseUrl });
    showNotify('API-Einstellungen gespeichert.', 'success');
  });

  setTimeout(() => {
    const provSel = document.getElementById('cs-provider');
    if (provSel) provSel.addEventListener('change', () => {
      const g = document.getElementById('cs-baseurl-group');
      if (g) g.style.display = provSel.value === 'ollama' ? '' : 'none';
    });
  }, 50);
}

async function loadGroqModels() {
  const key = document.getElementById('cs-key')?.value.trim();
  const provider = document.getElementById('cs-provider')?.value;
  if (!key) { showNotify('Erst API-Key eintragen.', 'error'); return; }

  const urls = {
    groq: 'https://api.groq.com/openai/v1/models',
    openai: 'https://api.openai.com/v1/models',
  };
  const url = urls[provider];
  if (!url) { showNotify('Modell-Liste nur für Groq/OpenAI verfügbar.', 'error'); return; }

  try {
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${key}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const models = (data.data || [])
      .filter(m => !m.id.includes('whisper') && !m.id.includes('guard') && !m.id.includes('safeguard') && !m.id.includes('tts') && !m.id.includes('embed'))
      .map(m => m.id)
      .sort();

    const sel = document.getElementById('cs-model-select');
    const inp = document.getElementById('cs-model');
    const current = inp.value;
    sel.innerHTML = models.map(m => `<option value="${m}" ${m===current?'selected':''}>${m}</option>`).join('');
    sel.style.display = '';
    inp.style.display = 'none';
    showNotify(`${models.length} Modelle geladen.`, 'success');
  } catch(e) {
    showNotify('Fehler: ' + e.message, 'error');
  }
}
