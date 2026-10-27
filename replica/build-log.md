# Build Log — Jarvis Office v2

## 2026-10-27

| Modul    | Was | Status | Anmerkung |
|----------|-----|--------|-----------|
| Write    | Strikethrough, H4, ul/ol Listen | done | execCommand-basiert, funktioniert in allen Browsern |
| Calc     | 100 Zeilen (war 50) | done | ROWS-Konstante geändert |
| Draw     | Pen/Freihand (SVG path), Pen-Dragging | done | pts[]-Array mit M…L-Pfad, Drag verschiebt alle Punkte |
| Draw     | Select/Move für alle Shapes inkl. Pen | done | war partial, jetzt vollständig |
| Draw     | Rect/Ellipse/Linie (waren partial) | done | Code war da, war aber partial gemeldet |
| Present  | Draggable Elemente auf Folien | done | text/rect/circle, %-Koordinaten, pointer events |
| Present  | Element-Typen text/rect/circle | done | Toolbar-Buttons, Fullscreen-Render |
| Matrix   | 12 Spaltentypen | done | war 3 (text/select/date), jetzt alle 12 |
| Matrix   | Filter pro Spalte | done | Filter-Zeile im thead, live-Filter |
| Calendar | Termin CRUD | done | war als partial gemeldet, Code war vollständig |

## Parity-Entwicklung

| Zeitpunkt | Score | Must-haves |
|-----------|-------|------------|
| Start (replica-diff) | 56.9/100 | 27/39 |
| Nach diesem Build | 67.6/100 | 39/39 |

**Status: Shippable** — alle Must-haves erledigt, keine S1/S2 Bugs.
