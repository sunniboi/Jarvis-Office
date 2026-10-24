# Jarvis Office — Recon Map

**App:** Jarvis Office v1.0  
**Platform:** Web (HTML/CSS/JS, Chromium --app mode, offline-first)  
**Slice:** Alle 8 Module (Write, Calc, Matrix, Draw, Present, Mail, Notes, Calendar)  
**Ziel:** Neuaufbau mit sauberem Design-System, Modul-Namespace, besserem UI

---

## Screen Inventory

| ID  | Screen          | Einstieg              | Zweck                          | Hauptkomponenten                          | States gesehen           |
|-----|-----------------|-----------------------|--------------------------------|-------------------------------------------|--------------------------|
| S01 | Launcher        | Start                 | App-Auswahl, Uhr               | 8×AppCard, Clock, Settings-Button        | filled                   |
| S02 | Write           | launchApp('write')    | Textverarbeitung               | Titlebar, Toolbar, contenteditable Page, Statusbar | filled, empty          |
| S03 | Calc            | launchApp('calc')     | Tabellenkalkulation            | Titlebar, Toolbar, FormulaBar, Grid 26×100, Statusbar | filled, empty, error  |
| S04 | Matrix          | launchApp('matrix')   | Smart-Tabellen                 | Titlebar, Toolbar, FilterBar, Table mit 12 Spaltentypen, Summary-Row | filled, empty, filtered |
| S05 | Draw            | launchApp('draw')     | Vektorgrafik-Canvas            | Titlebar, Toolbox (links), Canvas, Props-Panel (rechts) | leer, Elemente vorhanden |
| S06 | Present         | launchApp('present')  | Präsentationen                 | Titlebar, Slide-Thumbnail-Panel, Stage 960×540, Props-Panel | 1 Slide, mehrere Slides |
| S07 | Mail            | launchApp('mail')     | Lokaler E-Mail-Client (offline)| Folder-Sidebar, Mail-Liste, Mail-Viewer, Compose-Button | Inbox filled, leer      |
| S08 | Notes           | launchApp('notes')    | Schnellnotizen                 | Notes-Liste (links), Editor (rechts), Search | leer, filled, gepinnt   |
| S09 | Calendar        | launchApp('calendar') | Kalender & Termine             | Mini-Cal Sidebar, Monats/Wochen/Tag/Liste-View, Event-Modal | leer, Events vorhanden  |
| S10 | Settings Modal  | openSettings()        | Name + Schriftgröße            | Modal overlay, 2 Inputs                   | —                        |

---

## User Flows

```
F01 Neues Dokument erstellen (Write)
    S01 → S02 → [Neu-Button] → S02 (leer) → tippen → Ctrl+S → gespeichert
    Kanten: kein Titel → "Unbenannt.jdoc"

F02 Tabelle berechnen (Calc)
    S01 → S03 → Zelle klicken → Wert/Formel eingeben → Enter → Ergebnis
    Kanten: Division durch 0 → #DIV/0, Kreisreferenz → #FEHLER

F03 Zeichnung erstellen (Draw)
    S01 → S05 → Tool wählen → auf Canvas zeichnen → Undo/Redo → Export PNG/SVG
    Kanten: leere Auswahl beim Export → alles exportieren

F04 Präsentation erstellen (Present)
    S01 → S06 → Folie hinzufügen → Element ziehen → Vollbild-Modus
    Kanten: kein Element ausgewählt → kein Props-Panel

F05 Notiz erstellen (Notes)
    S01 → S08 → [+ Neu] → tippen → autosave nach 500ms → anpinnen
    Kanten: alle Notizen löschen → leerer State

F06 Termin anlegen (Calendar)
    S01 → S09 → Datum klicken → Modal → Titel/Zeit/Farbe → Speichern
    Kanten: überlappende Termine (kein Konflikt-Check)

F07 Dokument öffnen
    S02/S03/S04 → Öffnen-Button → Modal mit Liste → Dokument anklicken → geladen
    Kanten: keine Dokumente → Toast "Keine gespeicherten Dokumente"
```

---

## Components

| Component     | Varianten                  | States                          | Screens      |
|---------------|----------------------------|---------------------------------|--------------|
| AppCard       | 8 Farb-Varianten           | default, hover, active          | S01          |
| Titlebar      | mit Filename, mit Aktionen | —                               | S02–S09      |
| Toolbar       | Write, Calc, Draw, ...     | btn default/hover/active        | S02–S09      |
| TbBtn         | icon-only, text+icon       | default, hover, active          | alle Apps    |
| TbSelect      | font, size, heading, format| default, hover                  | S02, S03     |
| Modal         | Form, Liste, Bestätigung   | open, closed                    | alle Apps    |
| Toast/Notify  | info, success, error, warn | erscheint, verschwindet         | global       |
| Statusbar     | Write, Calc, global        | —                               | S02, S03     |
| FormulaBar    | CellRef + Input            | focus, blur                     | S03          |
| CalcCell      | normal, selected, editing, formula, error, number | 6 States | S03       |
| CanvasTool    | select, pen, rect, circle, line, arrow, text, ... | active/inactive | S05  |
| SlideThumbnail| normal, selected           | selected                        | S06          |
| FolderItem    | normal, active             | active                          | S07          |
| MailRow       | unread, read, starred      | 3 States                        | S07          |
| NoteCard      | normal, pinned, selected   | 3 States                        | S08          |
| CalendarDay   | today, hasEvent, selected  | 3 States                        | S09          |

---

## Inferred Data Model

```
Settings  { name: string, fontSize: number }
          localStorage: 'jarvis_settings'
          confidence: high

WriteDoc  { id, name, html, modified }
          localStorage: 'jarvis_write_docs'[id]
          confidence: high

CalcDoc   { id, name, cells: { [ref]: { raw, value, style } }, modified }
          localStorage: 'jarvis_calc_docs'[id]
          confidence: high

MatrixDoc { id, name, columns: [], rows: [], filters: {}, condFmt: [], modified }
          localStorage: 'jarvis_matrix_docs'[id]
          confidence: high

DrawDoc   { id, name, elements: [], modified }
          localStorage: 'jarvis_draw_docs'[id]
          confidence: high

PresentDoc { id, name, slides: [{ id, layout, theme, elements[] }], modified }
            localStorage: 'jarvis_present_docs'[id]
            confidence: high

Mails     { inbox: [], sent: [], drafts: [], starred: [], trash: [] }
          localStorage: 'jarvis_mails'
          confidence: high

Notes     [{ id, title, body, pinned, created, modified }]
          localStorage: 'jarvis_notes'
          confidence: high

Events    [{ id, title, date, time, duration, color, location, desc, repeat }]
          localStorage: 'jarvis_events'
          confidence: high
```

---

## Bekannte Probleme (v1.0)

1. **Globale Namespace-Verschmutzung** — alle App-Funktionen auf `window` (`writeCmd`, `writeSave`, `calcSave` etc.)
2. **refreshDisplay() in Calc** — loopt 2600 Zellen bei jedem Tastendruck
3. **kein Modul-System** — alle 11 JS-Files laden sequenziell, keine Code-Isolation
4. **Emoji-Icons in Toolbar** — inkonsistent, kein Icon-System
5. **Modal-Öffnen via setTimeout** — Event-Listener werden 50ms verzögert angehängt (race condition möglich)
6. **Draw**: Hit-Testing nur über Bounding-Box, kein echtes Vektorpfad-HitTest
7. **Present**: Keine Animations-Übergänge zwischen Folien
8. **Mail**: Komplett offline, keine echte SMTP-Integration vorgesehen
9. **Write**: execCommand() ist deprecated (aber noch funktional in Chromium)

---

## Was nicht geklont wird (skip)

| Feature               | Warum                                    |
|-----------------------|------------------------------------------|
| Cloud-Sync            | Bewusst offline — kein Server            |
| Echte E-Mail (SMTP)   | Mail ist Demo-Modul                      |
| KI-Features           | Kein API-Key / keine Abhängigkeit        |
| Kollaboration         | Offline-first, kein WebSocket            |

---

## Größe

- 9 Screens, 7 Flows, 9 Entities
- Hardest parts: Calc-Performance, Draw-Canvas-Events, Calendar-Ansichten
- **Größe: M** (sauberer Neuaufbau: ~1 Woche)
