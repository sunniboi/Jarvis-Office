# Jarvis-Office – Verhaltensregeln

## Automatisches Skill-Routing

Folgende Skills werden **sofort** aufgerufen, sobald die entsprechenden Schlüsselwörter oder Absichten erkannt werden. Kein Nachfragen, kein Zögern – direkt starten.

---

### Deep Research (`anthropic-skills:deep-research`)
**Aufrufen wenn:**
- "recherchiere", "recherchier mal", "forsch nach"
- "was ist", "was sind", "wie funktioniert", "erkläre mir" (bei komplexen Themen, die mehr als eine Quelle brauchen)
- "Marktüberblick", "Vergleich", "welche Anbieter", "was gibt es für"
- "finde heraus", "ich will wissen ob", "was weiß man über"

---

### Code Review (`code-review`)
**Aufrufen wenn:**
- "review", "code review", "prüf den Code", "schau dir den Code an"
- "was ist falsch", "warum funktioniert das nicht" (bei Code-Fragen)
- "ist das sauber", "kannst du den Code checken"

---

### Lernen / Erklären (`anthropic-skills:learn`)
**Aufrufen wenn:**
- "erkläre mir wie", "lern mir", "bring mir bei", "ich versteh das nicht"
- "was ist der Unterschied zwischen", "wie hängt X mit Y zusammen"
- "ich bin nicht sicher ob ich verstehe", "kannst du das erklären"
- "ELI5", "einfach erklärt", "für Anfänger"

---

### Diagramme / Visualisierungen (`artifact-diagramming`)
**Aufrufen wenn:**
- "zeichne", "erstelle ein Diagramm", "visualisiere", "zeig mir als Grafik"
- "Flowchart", "Ablaufdiagramm", "Architektur-Diagramm"

---

### Datenvisualisierung / Charts (`dataviz`)
**Aufrufen wenn:**
- "Chart", "Graph", "Plot", "Dashboard", "Statistik visualisieren"
- "zeig das als Diagramm", "erstelle eine Grafik mit den Daten"

---

### Algorithmic Art (`anthropic-skills:algorithmic-art`)
**Aufrufen wenn:**
- "generative Art", "algorithmische Kunst", "p5.js", "Partikel-System"
- "erstelle Kunst mit Code", "flow field"

---

### Web Artifacts / Apps (`anthropic-skills:web-artifacts-builder`)
**Aufrufen wenn:**
- "baue eine App", "erstelle eine Web-App", "React", "interaktives Tool"
- "ich brauche ein Interface", "baue mir eine Seite mit"

---

### Plugin / Mod erstellen (`plugin-authoring`)
**Aufrufen wenn:**
- "erstelle ein Plugin", "baue einen Mod", "neuer Slash-Command"
- "füge einen Button hinzu", "ich will eine Statusleiste"

---

### Dokumentation schreiben (`anthropic-skills:doc-coauthoring`)
**Aufrufen wenn:**
- "schreib eine Doku", "erstelle eine Spezifikation", "tech spec"
- "ich brauche ein Dokument für", "proposal", "Entscheidungs-Dokument"

---

### Interne Kommunikation (`anthropic-skills:internal-comms`)
**Aufrufen wenn:**
- "Status-Report", "Update für", "Newsletter", "Incident-Report"
- "schreib eine interne Mitteilung"

---

### Einstellungen / Hooks konfigurieren (`update-config`)
**Aufrufen wenn:**
- "ab jetzt immer wenn", "jedes Mal wenn", "automatisch wenn"
- "füge eine Berechtigung hinzu", "erlaube den Befehl"
- "konfiguriere", "ändere die Einstellungen"

---

## Allgemeine Regeln

- Sprache: Deutsch, außer der User wechselt ins Englische
- Ton: direkt, klar, kein Marketing-Speak
- Skills sofort aufrufen – nicht erst fragen ob man es soll
- Keine langen Einleitungen vor Tool-Aufrufen
