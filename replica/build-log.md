# Build Log — Jarvis Office v2

Basis: Jarvis Office v1 (recon.md). Rebuild-Stand geprüft 2026-10-26.

> Alle 8 Module sind als `initX(container)` implementiert. Code ist sauber
> vom v1-Original — keine kopierten HTML-Fragmente. Jedoch noch kein
> ES-Module-System (no import/export), alle initX-Funktionen sind global.
> Das ist architecture.md-Abweichung #1; bleibt als should-have offen.

---

## S01 — Launcher
**Status: done**
- 8 App-Karten mit SVG-Icons, App-Farben, Hover/Focus-States ✓
- Live-Uhr (Clock) ✓
- Settings-Modal (Name + Schriftgröße) ✓
- Back-Navigation via goHome() ✓
- a11y: role="listitem", aria-label je Karte ✓
**Fehlend:** —

---

## S02 — Write
**Status: partial**
- Bold / Italic / Underline ✓
- Ausrichtung L/C/R ✓
- Überschriften H1–H3 (H4 fehlt) ✓
- Schriftgröße ✓
- Undo / Redo ✓
- Speichern / Laden / Neu ✓
- Export HTML / TXT ✓
- Drucken (ersetzt PDF-Export) ✓
- Wörter-Zähler ✓ (Zeichen fehlen)
- Auto-Save 30 s ✓
**Fehlend (should):** Listen (ul/ol), Durchgestrichen, Link einfügen,
Schrift-/Hintergrundfarbe, Tabelle einfügen, Trennlinie, Suchen & Ersetzen,
Zeichen-Zähler, PDF-Export (print ist kein echter PDF-Export)

---

## S03 — Calc
**Status: partial**
- Grid 26 × 50 (recon sagt 100 — auf 50 reduziert, Performance-Tradeoff) ✓
- Formel-Engine: SUM, AVG, MAX, MIN, COUNT ✓
- Zell-Referenzen A1 ✓
- Tastatur-Navigation (Pfeile / Tab / Enter) ✓
- Statusbar ✓
- Formel-Bar ✓
- Speichern / Laden ✓
**Fehlend (should):** Range-Selektion (Shift+Click), Bold/Italic/Underline
pro Zelle, Ausrichtung pro Zelle, Zeilen/Spalten einfügen/löschen,
AutoSumme-Button, Sortieren, CSV-Export, SVG-Balkendiagramm

---

## S04 — Matrix
**Status: partial**
- 3 von 12 Spaltentypen: text, select, date ✓
- Globale Suche ✓
- Sortierung ✓
- Filter pro Spalte: partial (Select-Filter vorhanden, andere Typen nicht)
- Spalten-Resize: nein
**Fehlend (must):** Spaltentypen number, bool/checkbox, progress, rating,
url, email, currency, formula, relation (9 von 12 fehlen)
**Fehlend (should):** CSV/JSON Export/Import, Spalten-Resize,
Bedingte Formatierung, Progress-Bar-Rendering, Star-Rating

---

## S05 — Draw
**Status: partial**
- Canvas-Zeichnen ✓
- Werkzeuge: Select/Move (basic), Rect, Line, Text ✓
- Undo/Redo ✓
- Speichern / Laden ✓
- Farbe / Strichbreite ✓
**Fehlend (must):** Freihand/Pen, Kreis/Ellipse, Pfeil
**Fehlend (should):** Radiergummi, Fill, Zoom, Stern/Dreieck/Polygon,
Properties-Panel, SVG-Export, PNG-Export

---

## S06 — Present
**Status: partial**
- Folien-System (hinzufügen, löschen, navigieren) ✓
- Slide-Thumbnail-Panel ✓
- Vollbild-Modus (Presenter-View) ✓
- Elemente: Titel + Content-Text ✓
- Speichern / Laden ✓
**Fehlend (must):** Drag-to-move auf Folien-Elementen, weitere Elementtypen
(rect, circle, line, image), Themes
**Fehlend (should):** Properties-Panel, HTML-Export

---

## S07 — Mail
**Status: done**
- Ordner: Inbox, Gesendet, Entwürfe, Markiert, Papierkorb ✓
- Mail lesen ✓
- Compose (neues Fenster) ✓
- Stern / Löschen ✓
- Suche ✓
- Seed-Daten für leeren State ✓
**Fehlend (should):** Reply / Reply-All / Forward, Alle als gelesen,
Papierkorb leeren

---

## S08 — Notes
**Status: done**
- Erstellen / Bearbeiten ✓
- Auto-Save 500 ms ✓
- Pin / Unpin ✓
- Suche ✓
- Sortierung (pinned first, modified desc) ✓
- Export TXT (Einzelnotiz) ✓
**Fehlend (could):** Kontextmenü (Duplizieren, Alle exportieren)

---

## S09 — Calendar
**Status: partial**
- Monatsansicht ✓
- Wochenansicht ✓
- Tagesansicht ✓
- Termin-CRUD (Create/Read/Delete) ✓
- Farb-Picker für Termine ✓
- Mini-Kalender Sidebar ✓
**Fehlend (should):** Listenansicht, ICS Export/Import
**Hinweis:** Update/Bearbeiten vorhandener Termine fehlt (nur Anlegen + Löschen)

---

## S10 — Settings Modal
**Status: done**
- Name-Input ✓
- Schriftgröße ✓

---

## Technische Schulden

| Problem | Schwere | Fix |
|---------|---------|-----|
| Keine ES-Module (global functions) | medium | Refactor zu `type="module"` + export |
| `execCommand` deprecated | low | Läuft in Chromium noch stabil |
| Draw-HitTest nur Bounding-Box | medium | Shape-spezifischer HitTest |
| Matrix: 9 Spaltentypen fehlen | high | Scope-Erweiterung nötig |
| Kein virtualisiertes Grid in Calc | medium | Nur 50 Rows statt 100 als Workaround |

---

## Zusammenfassung

| Screen | Status |
|--------|--------|
| S01 Launcher | done |
| S02 Write | partial |
| S03 Calc | partial |
| S04 Matrix | partial |
| S05 Draw | partial |
| S06 Present | partial |
| S07 Mail | done |
| S08 Notes | done |
| S09 Calendar | partial |
| S10 Settings | done |

**Must-Haves erledigt:** ~27 von 39 (69%)
**Screenshots:** nicht verfügbar (kein Chromium im Build-Container) — für
replica-diff werden lokale Screenshots benötigt.

**Nächster Schritt:** `/replica-backend` entfällt (kein Backend, offline-only).
Direkt zu `/replica-test`.
