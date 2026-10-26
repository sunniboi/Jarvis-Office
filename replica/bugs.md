# Bug Report — Jarvis Office v2

Generated: 2026-10-26

---

## BUG-001 — Farbkontrast: --text-faint zu dunkel auf surface-hi

**Severity:** S3  
**Status:** FIXED (commit: accessibility fixes)

**Steps:**
1. Notes-App öffnen
2. Eine Notiz anklicken (active state: background = --surface-hi #242448)
3. Preview-Text und Datum im aktiven Item betrachten

**Expected:** Kontrastverhältnis ≥ 4.5:1 (WCAG AA)  
**Actual:** --text-faint #586880 auf #242448 = 3.14:1 — WCAG-Verstoß

**Fix:** --text-faint geändert zu #8499b0 (5.04:1 auf surface-hi, 6.07:1 auf bg-elevated)

---

## BUG-002 — Kalender Nav-Buttons ohne zugänglichen Text

**Severity:** S2  
**Status:** FIXED

**Steps:**
1. Kalender öffnen
2. Mit Screenreader über Vor/Zurück-Buttons navigieren

**Expected:** Buttons haben beschreibenden Text oder aria-label  
**Actual:** Buttons enthalten nur SVG-Icon ohne aria-label → axe: button-name

**Fix:** aria-label="Zurück" / aria-label="Weiter" hinzugefügt

---

## BUG-003 — Falsche ARIA-Rollen im Launcher (listitem ohne list)

**Severity:** S3  
**Status:** FIXED

**Steps:**
1. Launcher mit Screenreader öffnen

**Expected:** App-Karten sind als Buttons erkennbar  
**Actual:** role="listitem" ohne role="list" Parent → aria-required-parent Verstoß

**Fix:** role="button" auf App-Karten, role="list" Elterncontainer entfernt

---

## BUG-004 — Landmark-Verschachtelung im Write-App

**Severity:** S3  
**Status:** FIXED

**Steps:**
1. Write-App öffnen, axe-Scan ausführen

**Expected:** Keine verschachtelten Hauptlandmarks  
**Actual:** <main> innerhalb eines role="region" innerhalb role="main" → landmark-nesting-violation

**Fix:** role="region" von #app-container entfernt, write.js erhält sr-only h1 und main-Element

---

## BUG-005 — Mini-Kalender Sidebar fehlt

**Severity:** S4  
**Status:** OPEN

**Steps:**
1. Kalender öffnen
2. Suche nach .mini-cal Element

**Expected:** Mini-Kalender-Sidebar für schnelle Datumsnavigation vorhanden  
**Actual:** Element existiert nicht — Feature nicht implementiert

**Workaround:** Ansichts-Buttons (Monat/Woche/Tag) + Vor/Zurück-Navigation verfügbar

---

## BUG-006 — Inkonsistenter Button-Text im Termin-Modal

**Severity:** S4  
**Status:** OPEN (by design)

**Steps:**
1. Kalender öffnen → Tag anklicken → neues Termin-Modal öffnet sich

**Expected:** Einheitlicher Button-Text ("Speichern") für alle Aktionen  
**Actual:** Neuer Termin zeigt "Hinzufügen", bestehender zeigt "Speichern" — verwirrend

**Note:** Semantisch korrekt, aber UI-Konsistenz empfohlen

---

## Zu prüfen (nicht reproduziert)

- Verhalten bei 100+ Terminen im gleichen Monat (Performance)
- Zeitzonenverhalten bei DST-Umstellung (isoDate-Berechnung)
- Offline-Verhalten (localStorage bereits genutzt, sollte funktionieren)
