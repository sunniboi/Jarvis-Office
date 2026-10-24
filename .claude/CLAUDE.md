# Jarvis Office — Projektkontext für Claude

## Wer arbeitet hier
Sunniboi (sunniboi@freenet.de) — betreibt R-S-R (Reparaturservice: Haushaltsgeräte, PC-Hardware, Linux-Support) und das Musikprojekt Engels Tränen.

## Was ist Jarvis Office
Offline-first Web-Office-Suite, läuft lokal in Chromium `--app` Mode (kein Server, kein Cloud-Sync). Aktuell v2.0.

**Stack:** reines HTML/CSS/JS — keine Frameworks, keine Build-Tools, keine Dependencies.  
**Speicherung:** ausschließlich `localStorage` pro Modul.  
**Paketformat:** `.deb` für Debian/Ubuntu-basierte Systeme.

## Module (js/)
| Datei | App | localStorage-Key |
|---|---|---|
| `write.js` | Textverarbeitung | `jarvis_write_docs` |
| `calc.js` | Tabellenkalkulation | `jarvis_calc_docs` |
| `matrix.js` | Smart-Tabellen | `jarvis_matrix_docs` |
| `draw.js` | Vektorgrafik-Canvas | `jarvis_draw_docs` |
| `present.js` | Präsentationen | `jarvis_present_docs` |
| `mail.js` | Lokaler Mail-Client (Demo, kein SMTP) | `jarvis_mails` |
| `notes.js` | Schnellnotizen | `jarvis_notes` |
| `calendar.js` | Kalender & Termine | `jarvis_events` |
| `launcher.js` | App-Auswahl, Uhr, Settings | `jarvis_settings` |
| `storage.js` | Shared Storage-Utilities | — |
| `utils.js` | Toast, Modal, getInitials etc. | — |

## App starten
```bash
chromium --app=file:///usr/share/jarvis-office/index.html
# oder direkt im Browser:
# file:///home/user/Jarvis-Office/index.html
```

## Bekannte technische Schulden (aus recon.md)
1. Globale Namespace-Verschmutzung — alle App-Funktionen auf `window`
2. `refreshDisplay()` in Calc loopt 2600 Zellen bei jedem Tastendruck
3. Kein Modul-System — 11 JS-Files laden sequenziell
4. Emoji-Icons in Toolbar — kein Icon-System
5. Modal-Öffnen via `setTimeout` (50ms race condition möglich)
6. Draw: Hit-Testing nur Bounding-Box
7. Present: keine Folien-Übergänge
8. Write: `execCommand()` deprecated

## Was bewusst nicht gebaut wird
- Cloud-Sync (offline-first by design)
- Echte E-Mail / SMTP
- KI-Features
- Kollaboration / WebSocket

## Alle Projekte (GitHub: sunniboi)

| Repo | Sichtbarkeit | Letzter Push | Notiz |
|---|---|---|---|
| **Jarvis-Office** | privat | 2026-10-24 | Dieses Projekt — Offline-Office-Suite |
| **bierdeckel-rechner** | öffentlich | 2026-10-22 | Kleiner Web-Rechner |
| **Paywallscanner** | privat | 2026-10-06 | Paywall-Erkennung (Tool/Scanner) |
| **RadioPlayerV3** | öffentlich (Fork) | 2026-09-11 | Web-Radio-Player |
| **MusicPlayer** | öffentlich (Fork) | 2022-01-19 | Älterer Music-Player |

## Git-Branch für neue Features
`claude/projects-skills-installed-h5d0ef`

## Kommunikationsstil
- Kein Marketing-Speak, direkt und ehrlich
- Fehler klar benennen, nichts beschönigen
- Keine Pauschalpreise außer bei Festleistungen
- Keine Emojis in offiziellen Texten, in Chat ok
