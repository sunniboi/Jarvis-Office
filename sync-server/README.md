# Jarvis Office – Sync-Server

Läuft auf einem kleinen Heimnetz-Gerät (Raspberry Pi empfohlen, oder ein PC der läuft).  
Alle Geräte (Handy, Tablet, PC) verbinden sich per WebSocket – Änderungen gehen sofort an alle anderen.  
Wake on LAN: Handy/Tablet sagt "PC an" → Magic Packet → PC startet.

---

## Installation

```bash
# 1. Node.js installieren (einmalig)
#    Raspberry Pi / Debian:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Abhängigkeiten installieren
cd sync-server
npm install

# 3. Konfiguration
#    config.json wird beim ersten Start automatisch angelegt.
#    MAC-Adresse des PCs eintragen (für Wake on LAN):
nano config.json
```

### config.json

```json
{
  "port": 3000,
  "wolMac": "f0:de:f1:56:ab:82",
  "wolBroadcast": "255.255.255.255",
  "secret": "mein-geheimes-passwort"
}
```

- `wolMac`: MAC-Adresse des PCs (Netzwerkkarte, die am Switch hängt – WLAN geht bei den meisten PCs **nicht** für WoL)
- `wolBroadcast`: `255.255.255.255` funktioniert meistens; alternativ Subnet-Broadcast, z.B. `192.168.1.255`
- `secret`: Leer lassen wenn das Heimnetz vertrauenswürdig ist. Sonst hier ein Passwort setzen.

---

## Starten

```bash
node server.js
# oder als Dienst (systemd):
sudo cp jarvis-sync.service /etc/systemd/system/
sudo systemctl enable --now jarvis-sync
```

---

## PC konfigurieren (Wake on LAN)

1. **BIOS/UEFI**: Wake on LAN aktivieren (meist unter "Power Management")
2. **Windows**: Geräte-Manager → Netzwerkkarte → Energieverwaltung → "Gerät kann den Computer aus dem Ruhezustand reaktivieren" ✓
3. **Linux**:
   ```bash
   sudo ethtool -s eth0 wol g
   # dauerhaft in /etc/network/interfaces oder udev-Regel
   ```

---

## Jarvis Office verbinden (Browser)

1. Jarvis Office öffnen
2. Unten rechts auf den **kleinen Kreis** klicken (Sync-Indikator)
3. Server-URL eintragen: `ws://192.168.1.x:3000`  (IP des Sync-Server-Geräts)
4. Secret eintragen (falls gesetzt)
5. "Sync aktiv" einschalten → Speichern

---

## Wake on LAN per Sprache

1. In Jarvis Office auf das **Mikrofon-Symbol** klicken (unten rechts, neben dem Sync-Punkt)
2. "PC an" sagen
3. Nur in Chrome / Edge / Android-Browser verfügbar (Web Speech API)

---

## Sicherheit

Der Server ist für das **Heimnetz** gedacht, nicht fürs Internet.  
Wenn du ihn von außen erreichbar machen willst:
- Hinter einem Reverse-Proxy (nginx) mit HTTPS betreiben
- `secret` in config.json setzen
- Nur Port 3000 per Portforwarding oder VPN freigeben
