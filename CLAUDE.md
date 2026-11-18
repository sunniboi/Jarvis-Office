# Jarvis Office — Handoff

**Stand:** 2026-11-18  
**Projekt:** Jarvis Office v2 — modulare Browser-Office-Suite + Task Observer  
**Repo-Branch:** `claude/task-observer-7ievi9`

---

## Was fertig ist

### Jarvis Office v2 (vollständig)
Alle Module laufen, persistieren per localStorage, einheitliches Design-System (`css/main.css`):

| Modul | Datei | Status |
|---|---|---|
| Launcher + Uhr + Settings | `js/launcher.js` | ✅ |
| Jarvis Write (Textverarbeitung) | `js/write.js` | ✅ |
| Jarvis Calc (Tabellenkalkulation) | `js/calc.js` | ✅ |
| Jarvis Matrix (Smart-Tabellen) | `js/matrix.js` | ✅ |
| Jarvis Draw (Vektorgrafik) | `js/draw.js` | ✅ |
| Jarvis Present (Präsentationen) | `js/present.js` | ✅ |
| Jarvis Mail (E-Mail-Client, offline) | `js/mail.js` | ✅ |
| Jarvis Notes (Schnellnotizen) | `js/notes.js` | ✅ |
| Jarvis Calendar (Kalender) | `js/calendar.js` | ✅ |
| **Task Observer** | `js/tasks.js` | ✅ |

### Task Observer (neu, dieser Branch)
- Aufgaben mit Titel, Projekt, Priorität (Hoch/Normal/Niedrig), Status (Offen/In Arbeit/Erledigt), Fälligkeitsdatum, Notiz
- Status-Dot direkt anklicken zum Cyclen
- Projekte frei anlegbar
- Sidebar-Filter (Status + Projekt), Suche, Sortierung
- Überfälligkeits-Markierung (roter Rand)
- Persistenz via `JarvisDB` (localStorage, Keys `to_tasks` / `to_projects`)

### Task Observer als Standalone-Artifact
- Veröffentlicht auf: `https://claude.ai/artifact/DqwH8DGtRsMTX1LjRL8bvY`
- Selbständig lauffähig, kein Server nötig
- Vorbefüllt mit: deutschen Feiertagen Nov 2026–Jan 2027, R-S-R-Aufgaben, Engels-Tränen-Aufgaben
- Bootstrap-Mechanismus (Key `boot_v1`): lädt Seed-Daten einmalig beim ersten Öffnen

---

## Was noch offen ist

### 1. Task Observer auf M73 Tiny deployen ← **Hauptaufgabe**

**Ziel:** Echtes Backend mit Benachrichtigungen, kein Cloud-Dienst, kein Account.

**Server-Daten:**
- Hostname: `m73tiny.fritz.box` / IP: `192.168.178.107` (DHCP, kann sich ändern → Fritz!Box Festzuweisung empfohlen)
- SSH: `ssh -i ~/.ssh/m73_ed25519 root@192.168.178.107`
- OS: Debian 13 (Trixie), Kernel 6.12.117, x86_64
- SSH-Key liegt unter `~/.ssh/m73_ed25519` **auf dem lokalen Rechner des Nutzers**

**Problem:** Aus dem Cloud-Container ist `192.168.178.x` (Heimnetz) nicht erreichbar. SSH-Client ist im Container auch nicht installiert.

**Lösung:** Ein fertiges Installations-Shellskript bauen, das der Nutzer einmal auf dem M73 ausführt.

**Was das Skript tun soll:**
```
1. Node.js (LTS) installieren falls nicht vorhanden
2. SQLite3 installieren
3. /opt/jarvis-tasks/ anlegen
4. Backend schreiben: Express.js-API (Tasks CRUD, Projekte)
5. Frontend (Task Observer HTML) als static serve einbinden
6. Cronjob: täglich 08:00 — fällige Aufgaben per E-Mail an sunniboi@freenet.de
7. E-Mail via sendmail/msmtp (freenet SMTP: smtp.freenet.de:587, STARTTLS)
8. systemd-Service: jarvis-tasks.service, autostart
9. Aufruf dann über: http://m73tiny.fritz.box:3000
```

**Noch offen:** E-Mail-Passwort für freenet-SMTP — braucht der Nutzer einzutragen.  
**Noch offen:** Feste IP in Fritz!Box für m73tiny einstellen (empfohlen, damit URL stabil bleibt).

### 2. Passwörter ändern (Sicherheitshinweis)
Root- und Admin-Passwort wurden im Klartext in einem Chat genannt. Sollten geändert werden:
```bash
passwd root
passwd admin
```

### 3. Debian-Paket aktualisieren
`jarvis-office_1.0_all.deb` im Repo ist v1.0 — enthält Task Observer noch nicht.  
Wenn v2 paketiert werden soll: `packaging/`-Ordner aktualisieren und neu bauen.

---

## Repo-Struktur

```
Jarvis-Office/
├── index.html          ← Haupt-App, lädt alle JS-Module
├── css/main.css        ← Design-System (Tokens, alle App-Stile)
├── js/
│   ├── utils.js        ← Hilfsfunktionen, Icons (ICONS-Map), showModal, showNotify
│   ├── storage.js      ← JarvisDB (localStorage wrapper)
│   ├── launcher.js     ← APPS-Registry, buildLauncher(), goHome(), Clock
│   ├── tasks.js        ← Task Observer (NEU, dieser Branch)
│   └── [weitere Module]
├── packaging/          ← Debian-Paket v1.0 (veraltet)
└── replica/            ← Recon-Doku vom v1-Scan
```

## Konventionen
- Jede App hat eine `initXxx(container)`-Funktion, die in `launcher.js` → `APPS` registriert ist
- Icons: `icon(name, size)` aus `utils.js`, ICONS-Map mit SVG-Pfaden (Lucide-kompatibel)
- Speichern: immer `JarvisDB.set(key, value)` / `JarvisDB.get(key, default)`
- Farb-Tokens der Apps: `--app-write`, `--app-calc`, ..., `--app-tasks` in `:root`
- Keine externen Abhängigkeiten, kein Build-System — läuft direkt im Browser

## Nutzer-Info
- Name: Sunniboi
- Betreibt: R-S-R (Reparaturservice Haushaltsgeräte, PC-Hardware, Linux-Support)
- Musikprojekt: Engels Tränen
- E-Mail: sunniboi@freenet.de
- Ton: direkt, kein Marketing-Sprech, Humor ok, Fehler offen ansprechen
