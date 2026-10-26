# Architecture: Jarvis Office v2 (Rebuild von Jarvis Office v1)

> Offline-first Desktop-App im Chromium --app Modus. Kein Server, kein Auth,
> kein Netz. Persistenz über localStorage. Stack-Empfehlungen für SaaS
> entfallen; diese App ist eine eigenständige Browser-App.

## Stack

| Layer       | Wahl                              | Warum                                                       |
|-------------|-----------------------------------|-------------------------------------------------------------|
| App-Shell   | Vanilla JS + ES-Module (no build) | kein Build-Step, läuft direkt im Chromium --app Modus       |
| Styling     | CSS Custom Properties + BEM       | Token-basiert, kein Framework nötig, offline-kompatibel     |
| Persistenz  | localStorage (JSON-Serialisierung)| offline-first, kein Server, bereits etabliert in v1         |
| Modulsystem | ES-Module per `type="module"`     | löst Namespace-Verschmutzung (Problem #1 aus recon.md)      |
| Icons       | SVG-Sprites inline                | ersetzt Emoji-Icons, konsistent, kein Netz nötig            |
| Build       | keiner (oder optional esbuild)    | vereinfacht Deployment, läuft auch ohne npm                 |
| Hosting     | Debian-Paket (.deb) / lokales FS  | wie v1 — kein Cloud-Hosting                                 |
| Mobile      | entfällt                          | Desktop-App, kein Mobile-Target                             |
| Auth        | entfällt                          | single-user, kein Login                                     |
| Payments    | entfällt                          | lokale App, keine Monetarisierung geplant                   |
| E-Mail      | entfällt (Mail-Modul ist Demo)    | Mail ist offline-Demo, kein SMTP                            |
| Background  | entfällt / setTimeout für Autosave| kein Worker nötig, Autosave per debounced setTimeout        |

## Datenschicht (localStorage-Schema)

Kein SQL — Persistenz in localStorage. Jede Entität hat einen festen Key.
Zugriff ausschließlich über ein zentrales `Storage`-Modul (`js/storage.js`),
nie direkt über `localStorage.*` aus App-Code. Das ist die einzige
Zugangskontrolle, die diese App braucht.

Struktur und Keys → siehe `replica/schema.sql` (als kommentiertes
Pseudo-Schema mit JSON-Typen).

Entitäten: 9. Zugriffsstrategie: data-layer checks im Storage-Modul.

## API / Interne Modul-Schnittstelle

Kein HTTP. Statt Routes: definierte Export-Funktionen pro Modul.

| Modul        | exportiert                                    | aufgerufen von  | Flow    |
|--------------|-----------------------------------------------|-----------------|---------|
| `storage.js` | `load(key)`, `save(key, val)`, `remove(key)`  | alle Module     | global  |
| `launcher.js`| `launchApp(id)`, `closeApp()`                 | index.html      | F01–F07 |
| `write.js`   | `writeInit()`, `writeSave()`, `writeOpen()`   | launcher        | F01     |
| `calc.js`    | `calcInit()`, `calcSave()`, `calcEval()`      | launcher        | F02     |
| `matrix.js`  | `matrixInit()`, `matrixFilter()`              | launcher        | —       |
| `draw.js`    | `drawInit()`, `drawExport(fmt)`               | launcher        | F03     |
| `present.js` | `presentInit()`, `presentFullscreen()`        | launcher        | F04     |
| `mail.js`    | `mailInit()`, `mailCompose()`                 | launcher        | —       |
| `notes.js`   | `notesInit()`, `notesSave()`                  | launcher        | F05     |
| `calendar.js`| `calInit()`, `calAddEvent()`                  | launcher        | F06     |

Kein globaler Zustand auf `window`. Jedes Modul verwaltet seinen eigenen
State intern (Modul-Scope).

Webhooks: keine.  
Jobs: `debounce(writeSave, 30 000)` für Write-Autosave,
`debounce(notesSave, 500)` für Notes-Autosave.

## Die Stellen, die beißen

- **Calc-Performance:** `refreshDisplay()` iteriert 2 600 Zellen bei jedem
  Tastendruck (recon.md #2). Fix: virtualisiertes Rendering — nur sichtbare
  Zeilen rendern, Dirty-Tracking für geänderte Zellen.

- **Kreisreferenzen in Calc:** Dependency-Graph mit Zykluserkennung (DFS)
  nötig, sonst Endlosschleife beim Formel-Eval.

- **execCommand() deprecated:** Write nutzt `document.execCommand()` (recon
  #9). In Chromium noch funktional; Risiko: bricht bei einer Chromium-Major-
  Version weg. Mittelfristig auf Selection-API + eigene Mutation umstellen.

- **Canvas-HitTest in Draw:** Aktuell nur Bounding-Box (recon #6). Für
  Freihand-Pfade und Kreise führt das zu Frustration. Fix: separater
  HitTest-Algorithmus pro Shape-Typ.

- **localStorage-Limit:** Browser setzen ~5 MB Limit. Große Draw-Dokumente
  oder viele Präsentationen können das überschreiten. Fix: Quota-Check im
  Storage-Modul mit Toast-Warnung; optional IndexedDB als Fallback für Blobs.

- **Modal-Race (recon #5):** Event-Listener werden 50 ms nach Modal-Öffnung
  angehängt (`setTimeout`). Fix: Listener direkt nach DOM-Insertion setzen,
  kein Timeout.

- **Keine Undo/Redo im Draw-globalen State:** 50-Schritte-History im Modul-
  Scope, nicht in localStorage persistiert — verloren beim Reload. Akzeptiert.

## Build-Reihenfolge

### 1. Vertical Slice (beweist das Modul-System)
- Screens: S01 (Launcher), S02 (Write) — minimal
- Ziel: `launchApp('write')` funktioniert, schreibt in localStorage,
  lädt beim Neustart
- Tabellen/Entitäten: `settings`, `write_docs`
- Kein globaler State auf `window`, ES-Module laden korrekt

### 2. Must-Haves (nach Bereich aus features.csv)
- **Launcher:** 8 App-Karten, Uhr, Settings-Modal (S01, S10)
- **Write:** vollständige Toolbar, Speichern/Laden/Neu, Undo/Redo (S02)
- **Calc:** Grid, Formel-Engine, Tastatur-Nav, Statusbar, FormulaBar (S03)
- **Matrix:** 12 Spaltentypen, Filter, Suche, Sortierung (S04)
- **Draw:** Canvas, Select/Move, Shapes, Undo/Redo (S05)
- **Present:** Folien-System, Element-Typen, Vollbild (S06)
- **Mail:** Ordner, Lesen, Compose (S07)
- **Notes:** Erstellen, Autosave, Suche (S08)
- **Calendar:** Monatsansicht, Termin-CRUD (S09)

### 3. Should-Haves
- Write: Export HTML/TXT/PDF, Suchen & Ersetzen, Auto-Save
- Calc: Range-Selektion, Zeilen/Spalten einfügen, CSV-Export, Diagramm
- Matrix: CSV/JSON Export/Import, Spalten-Resize, Bedingte Formatierung
- Draw: Properties-Panel, SVG/PNG Export, Fill/Zoom
- Present: 5 Themes, Properties-Panel, HTML-Export
- Calendar: Wochen/Tag/Listenansicht, Farb-Picker, Mini-Kalender

### 4. Fixes aus replica-entrepreneur
(nach Durchlauf von `/replica-entrepreneur` eintragen)

## Nächster Schritt

`/replica-design` — Design-Tokens, Farbrollen, Type-Scale, Komponenten-Specs.
