/**
 * Jarvis Office – Sync Server
 *
 * Betrieb: Kleines Heimnetz-Gerät (Raspberry Pi, alter PC, Router mit Node).
 * Alle Jarvis-Daten (jo2_*) werden hier zentral gehalten.
 * Geräte verbinden sich per WebSocket – Änderungen gehen sofort an alle anderen.
 * Wake on LAN per POST /wol (MAC-Adresse aus config.json oder Request-Body).
 */

const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const { WebSocketServer, WebSocket } = require('ws');
const wol     = require('wol');

// ── Konfiguration ───────────────────────────────────────────────────────────
const CONFIG_FILE = path.join(__dirname, 'config.json');
const DATA_FILE   = path.join(__dirname, 'data.json');
const PORT        = process.env.PORT || 3000;

let config = {
  port: PORT,
  wolMac: '',          // MAC des PCs, z.B. "AA:BB:CC:DD:EE:FF"
  wolBroadcast: '255.255.255.255',
  secret: '',          // optional: einfaches shared secret
};

if (fs.existsSync(CONFIG_FILE)) {
  try { Object.assign(config, JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))); }
  catch (e) { console.warn('config.json Fehler:', e.message); }
} else {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log('config.json erstellt – bitte MAC-Adresse eintragen.');
}

// ── Datenpersistenz ─────────────────────────────────────────────────────────
let store = {};   // { "jo2_key": { value: any, ts: number } }

function loadStore() {
  if (fs.existsSync(DATA_FILE)) {
    try { store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
    catch (e) { console.warn('data.json Lesefehler:', e.message); }
  }
}

let saveTimer = null;
function persistStore() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store));
  }, 500);
}

loadStore();

// ── HTTP-Server ──────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Jarvis-Secret');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, clients: wss.clients.size, keys: Object.keys(store).length }));
    return;
  }

  if (req.method === 'POST' && req.url === '/wol') {
    let body = '';
    req.on('data', d => { body += d; });
    req.on('end', () => {
      if (config.secret) {
        const secret = req.headers['x-jarvis-secret'] || '';
        if (secret !== config.secret) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Falsches Secret' }));
          return;
        }
      }

      let mac = config.wolMac;
      try { const b = JSON.parse(body); if (b.mac) mac = b.mac; } catch (_) {}

      if (!mac) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Keine MAC-Adresse konfiguriert' }));
        return;
      }

      wol.wake(mac, { address: config.wolBroadcast }, (err) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        } else {
          console.log(`WoL Magic Packet → ${mac}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, mac }));
        }
      });
    });
    return;
  }

  res.writeHead(404); res.end();
});

// ── WebSocket-Server ─────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });

function broadcast(data, exclude = null) {
  const msg = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`Gerät verbunden: ${ip}  (gesamt: ${wss.clients.size})`);

  // Komplett-Sync beim Connect
  ws.send(JSON.stringify({ type: 'full-sync', store }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (config.secret && msg.secret !== config.secret) return;

    if (msg.type === 'set') {
      const existing = store[msg.key];
      // Last-Write-Wins per Timestamp
      if (!existing || msg.ts >= existing.ts) {
        store[msg.key] = { value: msg.value, ts: msg.ts };
        persistStore();
        broadcast({ type: 'set', key: msg.key, value: msg.value, ts: msg.ts }, ws);
      }
    }

    if (msg.type === 'del') {
      delete store[msg.key];
      persistStore();
      broadcast({ type: 'del', key: msg.key }, ws);
    }

    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
    }
  });

  ws.on('close', () => {
    console.log(`Gerät getrennt: ${ip}  (gesamt: ${wss.clients.size})`);
  });

  ws.on('error', (e) => console.warn('WS Fehler:', e.message));
});

server.listen(config.port, '0.0.0.0', () => {
  console.log(`Jarvis Sync-Server läuft auf Port ${config.port}`);
  console.log(`  Status:   http://<IP>:${config.port}/status`);
  console.log(`  WoL:      POST http://<IP>:${config.port}/wol`);
  console.log(`  WS:       ws://<IP>:${config.port}`);
});
