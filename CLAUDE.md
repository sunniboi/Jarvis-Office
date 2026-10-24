# Jarvis Office — Claude Code Setup

## Projektübersicht

Jarvis Office ist eine browserbasierte Office-Suite (kein Build-System, kein Framework).
Reine HTML/CSS/JS-Architektur, läuft direkt im Browser ohne Kompilierung.

## Projektstruktur

```
index.html          Einstiegspunkt, lädt alle Module
css/main.css        Globales Stylesheet
js/
  utils.js          Hilfsfunktionen
  storage.js        LocalStorage-Abstraktion
  launcher.js       App-Launcher (Startseite)
  write.js          Textverarbeitung
  calc.js           Tabellenkalkulaton
  matrix.js         Matrix-/Tabellenfunktionen
  draw.js           Zeichenprogramm
  present.js        Präsentationen
  mail.js           E-Mail-Client
  notes.js          Notizen
  calendar.js       Kalender
packaging/          .deb Paketierung für Linux
replica/            Backup/Snapshot-Verzeichnis
```

## Entwicklungsregeln

- **Kein Build-Schritt** — kein npm, webpack, babel oder ähnliches
- **Vanilla JS** — keine Frameworks (React, Vue, Angular etc.)
- **Browser-APIs** — LocalStorage für Persistenz, native DOM-Manipulation
- **Deutsch** — UI-Texte und Kommentare auf Deutsch
- **Modular** — jede App in eigener JS-Datei, kein Cross-Import zwischen Apps
- **CSS-Variablen** — Farben und Abstände über `var(--name)` aus `main.css`

## Coding-Standards

- Keine unnötigen Kommentare — Code soll selbsterklärend sein
- Keine externen Abhängigkeiten ohne explizite Genehmigung
- Keine `console.log` im finalen Code
- Funktionen kurz halten, eine Aufgabe pro Funktion
- Fehler klar benennen, nichts beschönigen

## Git-Workflow

- Branch: `ccr-dc8995c7-yzeuvz` für laufende Entwicklung
- Commit-Nachrichten: Deutsch, präzise, beschreiben das "Warum"
- Kein Force-Push ohne explizite Erlaubnis

## Testen

Kein Test-Framework vorhanden. Änderungen manuell im Browser prüfen:
1. `index.html` direkt im Browser öffnen (file:// oder lokaler Server)
2. Alle betroffenen Funktionen durchklicken
3. Browser-Konsole auf Fehler prüfen
