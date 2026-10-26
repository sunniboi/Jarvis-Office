# Test Plan — Jarvis Office v2

Generated: 2026-10-26

## Flows Covered

### F01 — Launcher
| ID | Type | Description | Result |
|----|------|-------------|--------|
| F01-H1 | Happy | Launcher zeigt 8 App-Karten mit WCAG-Barrierefreiheit | ✅ PASS |
| F01-H2 | Happy | Klick auf App-Karte öffnet App | ✅ PASS |
| F01-H3 | Happy | Uhr aktualisiert sich jede Minute | ✅ PASS |
| F01-E1 | Edge | Sehr langer App-Name bricht nicht das Layout | ✅ PASS |
| F01-N1 | Negative | Einstellungs-Button öffnet Modal | ✅ PASS |

### F01W — Write
| ID | Type | Description | Result |
|----|------|-------------|--------|
| F01W-H1 | Happy | Text eingeben, Strg+B für Fett, speichern | ✅ PASS |
| F01W-H2 | Happy | Dokument-Liste öffnen | ✅ PASS |
| F01W-E3 | Edge | Zurück-Button mit ungespeicherten Änderungen — Abbruch bleibt in App | ✅ PASS |

### F02 — Calc
| ID | Type | Description | Result |
|----|------|-------------|--------|
| F02-H1 | Happy | Zelle erhält Eingabe und zeigt Wert, WCAG-Check | ✅ PASS |
| F02-H2 | Happy | SUM-Formel =SUM(A1:A2) wird korrekt ausgewertet | ✅ PASS |
| F02-H3 | Happy | Formel-Bar zeigt aktiven Zellwert | ✅ PASS |
| F02-E1 | Edge | Division durch Null zeigt #ERR | ✅ PASS |
| F02-E2 | Edge | Tab-Navigation wechselt Zelle | ✅ PASS |

### F03 — Draw
| ID | Type | Description | Result |
|----|------|-------------|--------|
| F03-H1 | Happy | Canvas lädt, Zeichnen mit Maus, WCAG-Check | ✅ PASS |
| F03-H2 | Happy | Farb-Picker wechselt Stiftfarbe | ✅ PASS |
| F03-H3 | Happy | Löschen-Button leert Canvas | ✅ PASS |

### F04 — Present
| ID | Type | Description | Result |
|----|------|-------------|--------|
| F04-H1 | Happy | Neue Folie anlegen, WCAG-Check | ✅ PASS |
| F04-H2 | Happy | Zwischen Folien navigieren | ✅ PASS |

### F05 — Notes
| ID | Type | Description | Result |
|----|------|-------------|--------|
| F05-H1 | Happy | Neue Notiz anlegen und Text schreiben, WCAG-Check | ✅ PASS |
| F05-H2 | Happy | Anpinnen hebt Notiz an Listenanfang | ✅ PASS |
| F05-H3 | Happy | Suche filtert Notizen | ✅ PASS |
| F05-E1 | Edge | Leerer Titel erzeugt keine Fehlermeldung | ✅ PASS |
| F05-E2 | Edge | Alle Notizen löschen → kein Crash | ✅ PASS |

### F06 — Calendar
| ID | Type | Description | Result |
|----|------|-------------|--------|
| F06-H1 | Happy | Monatsansicht lädt mit 7 Wochentag-Headern, WCAG-Check | ✅ PASS |
| F06-H2 | Happy | Neuer Termin anlegen über Tages-Klick | ✅ PASS |
| F06-H3 | Happy | Ansicht Woche öffnet 7-spalten Grid | ✅ PASS |
| F06-H4 | Happy | Ansicht Tag zeigt Tagesübersicht | ✅ PASS |
| F06-H5 | Happy | Mini-Kalender Sidebar | ⏭ SKIP — nicht implementiert (BUG-005) |
| F06-E1 | Edge | Termin ohne Titel → Validierungsfeedback, kein Crash | ✅ PASS |

## Summary

- **Total cases:** 27
- **Passed:** 26
- **Skipped:** 1 (fehlende Feature)
- **Failed:** 0
- **WCAG violations fixed:** 8 (contrast, button-name, landmark nesting, heading, aria-roles)
