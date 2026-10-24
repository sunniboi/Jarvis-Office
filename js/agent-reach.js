/* ===== AGENT REACH — Jarvis Office KI-Assistent ===== */

function initAgentReach(container) {
  const cfg = JarvisDB.get('agent_reach_cfg', { apiKey: '', model: 'claude-sonnet-4-5', maxTokens: 1024 });
  let history = [];

  container.innerHTML = `
    <div class="titlebar">
      <button class="btn btn-ghost btn-sm" id="ar-back">${icon('arrowLeft', 16)} Zurück</button>
      <span class="titlebar-title">Agent Reach — KI-Assistent</span>
      <button class="btn btn-ghost btn-sm" id="ar-settings">${icon('settings', 16)}</button>
    </div>
    <div class="ar-wrap">
      <div class="ar-messages" id="ar-messages">
        <div class="ar-welcome">
          <div class="ar-avatar">
            <svg width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="14" fill="var(--accent)"/>
            <circle cx="24" cy="18" r="7" fill="rgba(255,255,255,.9)"/>
            <path d="M10 42c0-7.7 6.3-14 14-14s14 6.3 14 14" fill="rgba(255,255,255,.7)"/></svg>
          </div>
          <div class="ar-welcome-text">
            <strong>Agent Reach aktiv</strong><br>
            <span>KI-Assistent für Jarvis Office. API-Schlüssel über das <b>⚙-Menü</b> eintragen.</span>
          </div>
        </div>
      </div>
      <div class="ar-input-row">
        <textarea id="ar-input" class="ar-input" rows="2" placeholder="Frage stellen oder Aufgabe beschreiben …" autocomplete="off"></textarea>
        <button class="btn btn-primary ar-send" id="ar-send">${icon('forward', 16)}</button>
      </div>
      <div class="ar-status" id="ar-status"></div>
    </div>
  `;

  const msgBox    = container.querySelector('#ar-messages');
  const input     = container.querySelector('#ar-input');
  const sendBtn   = container.querySelector('#ar-send');
  const statusEl  = container.querySelector('#ar-status');

  container.querySelector('#ar-back').addEventListener('click', () => {
    if (typeof launchLauncher === 'function') launchLauncher();
  });

  container.querySelector('#ar-settings').addEventListener('click', openSettings);

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  sendBtn.addEventListener('click', send);

  function openSettings() {
    showModal(`
      <h3 style="margin:0 0 16px">Agent Reach – Einstellungen</h3>
      <div class="form-group">
        <label>Anthropic API-Schlüssel</label>
        <input type="password" id="ar-key" value="${sanitize(cfg.apiKey)}" autocomplete="off" placeholder="sk-ant-…" style="font-family:monospace"/>
      </div>
      <div class="form-group">
        <label>Modell</label>
        <select id="ar-model">
          <option value="claude-sonnet-4-5" ${cfg.model==='claude-sonnet-4-5'?'selected':''}>claude-sonnet-4-5 (Standard)</option>
          <option value="claude-haiku-4-5" ${cfg.model==='claude-haiku-4-5'?'selected':''}>claude-haiku-4-5 (schnell)</option>
          <option value="claude-opus-4-5" ${cfg.model==='claude-opus-4-5'?'selected':''}>claude-opus-4-5 (leistungsstark)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Max. Tokens</label>
        <input type="number" id="ar-tokens" value="${cfg.maxTokens}" min="256" max="4096" step="256"/>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-cancel">Abbrechen</button>
        <button class="btn btn-primary btn-ok">Speichern</button>
      </div>
    `, modal => {
      cfg.apiKey    = modal.querySelector('#ar-key').value.trim();
      cfg.model     = modal.querySelector('#ar-model').value;
      cfg.maxTokens = parseInt(modal.querySelector('#ar-tokens').value) || 1024;
      JarvisDB.set('agent_reach_cfg', cfg);
      showNotify('Einstellungen gespeichert.', 'success');
    });
  }

  function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `ar-msg ar-msg-${role}`;
    // User-Text wird escaped, KI-Antwort wird sanitized
    div.innerHTML = role === 'user'
      ? `<div class="ar-bubble">${sanitize(text).replace(/\n/g, '<br>')}</div>`
      : `<div class="ar-bubble">${Strix.sanitizeHTML(text.replace(/\n/g, '<br>'))}</div>`;
    msgBox.appendChild(div);
    msgBox.scrollTop = msgBox.scrollHeight;
    return div;
  }

  async function send() {
    const text = input.value.trim();
    if (!text) return;
    if (!cfg.apiKey) {
      showNotify('Bitte zuerst API-Schlüssel eintragen (⚙).', 'warn');
      return;
    }

    input.value = '';
    sendBtn.disabled = true;
    addMessage('user', text);
    history.push({ role: 'user', content: text });

    const thinking = addMessage('assistant', '…');
    statusEl.textContent = 'Verbinde …';

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':         'application/json',
          'x-api-key':            cfg.apiKey,
          'anthropic-version':    '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model:      cfg.model,
          max_tokens: cfg.maxTokens,
          system:     'Du bist ein hilfreicher Assistent für Jarvis Office. Antworte präzise und auf Deutsch, außer der Nutzer schreibt in einer anderen Sprache.',
          messages:   history
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
        throw new Error(err?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const reply = data?.content?.[0]?.text || '(Keine Antwort)';

      thinking.querySelector('.ar-bubble').innerHTML = Strix.sanitizeHTML(reply.replace(/\n/g, '<br>'));
      history.push({ role: 'assistant', content: reply });
      statusEl.textContent = '';

    } catch(err) {
      thinking.querySelector('.ar-bubble').textContent = `Fehler: ${err.message}`;
      thinking.querySelector('.ar-bubble').style.color = 'var(--danger)';
      statusEl.textContent = '';
      console.error('[AgentReach]', err);
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }
}
