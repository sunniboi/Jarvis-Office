/* ===== JARVIS OFFICE – CROSS-DEVICE SYNC ===== */
/* Verbindet sich per WebSocket mit dem Sync-Server.
   Patcht JarvisDB transparent: set/del werden zum Server gespiegelt,
   eingehende Änderungen werden in localStorage geschrieben und
   lösen ein 'jarvis:sync' CustomEvent aus, damit offene Apps nachladen. */

const JarvisSync = (() => {

  const CFG_KEY = 'jo2_sync_config';

  function getCfg() {
    try {
      const raw = localStorage.getItem(CFG_KEY);
      return raw ? JSON.parse(raw) : { url: '', secret: '', enabled: false };
    } catch { return { url: '', secret: '', enabled: false }; }
  }

  function saveCfg(cfg) {
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  }

  let ws         = null;
  let reconnTimer = null;
  let pingTimer   = null;
  let connected  = false;
  let cfg        = getCfg();

  // Statusanzeige im UI
  const indicator = (() => {
    const el = document.createElement('div');
    el.id = 'sync-indicator';
    el.title = 'Sync-Status';
    el.style.cssText = [
      'position:fixed', 'bottom:14px', 'right:14px', 'z-index:9999',
      'width:10px', 'height:10px', 'border-radius:50%',
      'background:#555', 'cursor:pointer', 'transition:background .3s',
      'box-shadow:0 0 0 2px rgba(0,0,0,.3)',
    ].join(';');
    el.addEventListener('click', () => JarvisSync.openSettings());
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(el));
    return el;
  })();

  function setStatus(state) {
    const colors = { off: '#555', connecting: '#f0a500', ok: '#22c55e', error: '#ef4444' };
    indicator.style.background = colors[state] || '#555';
    indicator.title = { off: 'Sync: aus', connecting: 'Sync: verbinde…', ok: 'Sync: verbunden', error: 'Sync: Fehler' }[state] || 'Sync';
  }

  // ── JarvisDB patchen ──────────────────────────────────────────────────────
  const _origSet = JarvisDB.set.bind(JarvisDB);
  const _origDel = JarvisDB.del.bind(JarvisDB);

  JarvisDB.set = function(key, val) {
    _origSet(key, val);
    if (connected) send({ type: 'set', key, value: val, ts: Date.now(), secret: cfg.secret });
  };

  JarvisDB.del = function(key) {
    _origDel(key);
    if (connected) send({ type: 'del', key, secret: cfg.secret });
  };

  // ── WebSocket ─────────────────────────────────────────────────────────────
  function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  function applyRemoteSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
    document.dispatchEvent(new CustomEvent('jarvis:sync', { detail: { key, value } }));
  }

  function connect() {
    cfg = getCfg();
    if (!cfg.enabled || !cfg.url) { setStatus('off'); return; }

    clearTimeout(reconnTimer);
    setStatus('connecting');

    try { ws = new WebSocket(cfg.url); } catch (e) {
      console.warn('Sync: ungültige URL', e);
      setStatus('error');
      return;
    }

    ws.onopen = () => {
      connected = true;
      setStatus('ok');
      console.log('Jarvis Sync: verbunden mit', cfg.url);
      pingTimer = setInterval(() => send({ type: 'ping', secret: cfg.secret }), 25000);
    };

    ws.onmessage = (evt) => {
      let msg;
      try { msg = JSON.parse(evt.data); } catch { return; }

      if (msg.type === 'full-sync' && msg.store) {
        for (const [rawKey, entry] of Object.entries(msg.store)) {
          // Nur überschreiben wenn Server-Version neuer ist
          const localRaw = localStorage.getItem(rawKey);
          let localTs = 0;
          if (localRaw) {
            try {
              // ts könnte in den Daten stecken (Dokumente haben modified-Feld)
              const localVal = JSON.parse(localRaw);
              if (typeof localVal === 'object' && localVal !== null) {
                localTs = localVal.modified || 0;
              }
            } catch (_) {}
          }
          if (!localRaw || entry.ts >= localTs) {
            applyRemoteSet(rawKey, entry.value);
          }
        }
        document.dispatchEvent(new CustomEvent('jarvis:full-sync'));
      }

      if (msg.type === 'set') applyRemoteSet(msg.key, msg.value);
      if (msg.type === 'del') {
        localStorage.removeItem(msg.key);
        document.dispatchEvent(new CustomEvent('jarvis:sync', { detail: { key: msg.key, deleted: true } }));
      }
    };

    ws.onclose = () => {
      connected = false;
      clearInterval(pingTimer);
      setStatus('error');
      console.log('Sync: Verbindung getrennt – reconnect in 5s');
      reconnTimer = setTimeout(connect, 5000);
    };

    ws.onerror = () => setStatus('error');
  }

  function disconnect() {
    clearTimeout(reconnTimer);
    clearInterval(pingTimer);
    if (ws) { ws.onclose = null; ws.close(); ws = null; }
    connected = false;
    setStatus('off');
  }

  // ── Settings-Dialog ───────────────────────────────────────────────────────
  function openSettings() {
    const existing = document.getElementById('sync-settings-dialog');
    if (existing) { existing.remove(); return; }

    const c = getCfg();
    const dlg = document.createElement('div');
    dlg.id = 'sync-settings-dialog';
    dlg.innerHTML = `
      <div class="sync-backdrop"></div>
      <div class="sync-card">
        <h3>Sync-Einstellungen</h3>
        <label>Server-URL (ws://…)<br>
          <input id="sy-url" type="text" value="${c.url}" placeholder="ws://192.168.1.x:3000">
        </label>
        <label>Secret (optional)<br>
          <input id="sy-secret" type="password" value="${c.secret}" placeholder="leer = kein Passwort">
        </label>
        <label class="sy-toggle">
          <input id="sy-enabled" type="checkbox" ${c.enabled ? 'checked' : ''}> Sync aktiv
        </label>
        <div class="sync-btns">
          <button id="sy-save">Speichern &amp; verbinden</button>
          <button id="sy-close">Schließen</button>
        </div>
        <p id="sy-status" class="sy-status">${connected ? '🟢 Verbunden' : '🔴 Nicht verbunden'}</p>
      </div>
    `;

    dlg.querySelector('.sync-backdrop').addEventListener('click', () => dlg.remove());
    dlg.querySelector('#sy-close').addEventListener('click', () => dlg.remove());
    dlg.querySelector('#sy-save').addEventListener('click', () => {
      const newCfg = {
        url:     dlg.querySelector('#sy-url').value.trim(),
        secret:  dlg.querySelector('#sy-secret').value,
        enabled: dlg.querySelector('#sy-enabled').checked,
      };
      saveCfg(newCfg);
      disconnect();
      cfg = newCfg;
      connect();
      dlg.querySelector('#sy-status').textContent = newCfg.enabled ? '🟡 Verbinde…' : '⚫ Aus';
    });

    document.body.appendChild(dlg);
  }

  // ── WoL-Trigger ───────────────────────────────────────────────────────────
  async function wakePC(mac) {
    const c = getCfg();
    if (!c.url) { alert('Kein Sync-Server konfiguriert.'); return false; }
    // ws:// → http:// ableiten
    const base = c.url.replace(/^ws/, 'http').replace(/\/$/, '');
    const serverBase = base.replace(/:\d+$/, match => match); // Port behalten
    // Nur Basis ohne /pfad
    const origin = serverBase.split('/').slice(0, 3).join('/');
    try {
      const body = mac ? { mac } : {};
      const res = await fetch(`${origin}/wol`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(c.secret ? { 'X-Jarvis-Secret': c.secret } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return data.ok;
    } catch (e) {
      console.warn('WoL Fehler:', e);
      return false;
    }
  }

  // Auto-Connect beim Start
  document.addEventListener('DOMContentLoaded', () => {
    if (getCfg().enabled) connect();
  });

  return { connect, disconnect, openSettings, wakePC, get connected() { return connected; } };

})();
