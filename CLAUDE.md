# Jarvis-Office – Verhaltensregeln

## Automatisches Skill-Routing

Folgende Skills werden **sofort** aufgerufen, sobald die entsprechenden Schlüsselwörter oder Absichten erkannt werden. Kein Nachfragen, kein Zögern – direkt starten.

---

### Deep Research (`anthropic-skills:deep-research`)
**Aufrufen wenn:**
- "recherchiere", "recherchier mal", "forsch nach"
- "was ist", "was sind", "wie funktioniert" (bei komplexen Themen mit mehreren Quellen)
- "Marktüberblick", "Vergleich", "welche Anbieter", "was gibt es für"
- "finde heraus", "ich will wissen ob", "was weiß man über"

---

### Code Review (`code-review`)
**Aufrufen wenn:**
- "review", "code review", "prüf den Code", "schau dir den Code an"
- "was ist falsch", "warum funktioniert das nicht" (bei Code-Fragen)
- "ist das sauber", "kannst du den Code checken"

---

### Code vereinfachen (`simplify`)
**Aufrufen wenn:**
- "vereinfach das", "refactor", "mach das sauberer", "zu komplex"
- "kannst du das kürzen", "optimier den Code"

---

### Lernen / Erklären (`anthropic-skills:learn`)
**Aufrufen wenn:**
- "erkläre mir wie", "lern mir", "bring mir bei", "ich versteh das nicht"
- "was ist der Unterschied zwischen", "wie hängt X mit Y zusammen"
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

### Web Apps / Interaktive Tools (`anthropic-skills:web-artifacts-builder`)
**Aufrufen wenn:**
- "baue eine App", "erstelle eine Web-App", "React", "interaktives Tool"
- "ich brauche ein Interface", "baue mir eine Seite mit"

---

### Plugin / Mod erstellen (`plugin-authoring`)
**Aufrufen wenn:**
- "erstelle ein Plugin", "baue einen Mod", "neuer Slash-Command"
- "füge einen Button hinzu", "ich will eine Statusleiste", "ich will ein Panel"

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
- "konfiguriere", "ändere die Einstellungen", "Hook einrichten"

---

### App starten / testen (`run`)
**Aufrufen wenn:**
- "starte die App", "zeig mir wie das aussieht", "starte den Server"
- "teste ob das läuft", "ich will das sehen", "mach einen Screenshot"

---

### Sicherheits-Review (`security-review`)
**Aufrufen wenn:**
- "ist das sicher", "Sicherheitslücke", "security review"
- "könnte das gehackt werden", "XSS", "SQL Injection"

---

### Tastenkürzel konfigurieren (`keybindings-help`)
**Aufrufen wenn:**
- "Tastenkürzel", "Shortcut", "Keybinding", "Tastenkombination ändern"
- "rebind", "Strg+S belegen"

---

### Claude API / Anthropic SDK (`claude-api`)
**Aufrufen wenn:**
- "Claude API", "Anthropic SDK", "API-Key", "Modell-ID"
- "wie integriere ich Claude", "welches Modell", "Pricing", "Token"

---

### Google Workspace (`anthropic-skills:google-workspace`)
**Aufrufen wenn:**
- "Google Docs", "Google Sheets", "Google Drive", "Gmail öffnen"
- "erstelle ein Google-Dokument", "schreib in Sheets"

---

### Word-Dokument (`.docx`) (`anthropic-skills:docx`)
**Aufrufen wenn:**
- "Word-Datei", ".docx", "erstelle ein Word-Dokument"

---

### Excel / Tabelle (`.xlsx`) (`anthropic-skills:xlsx`)
**Aufrufen wenn:**
- "Excel", ".xlsx", "erstelle eine Tabelle", "Spreadsheet"

---

### PowerPoint (`.pptx`) (`anthropic-skills:pptx`)
**Aufrufen wenn:**
- "PowerPoint", ".pptx", "Präsentation als Datei", "Folien exportieren"

---

### PDF lesen / bearbeiten (`anthropic-skills:pdf`)
**Aufrufen wenn:**
- "lies diese PDF", "extrahiere aus der PDF", "PDF ausfüllen"
- "was steht in dem PDF"

---

### Canvas Design (`anthropic-skills:canvas-design`)
**Aufrufen wenn:**
- "Canvas Design", "Figma-ähnlich", "visuelles Design", "UI-Mockup"

---

### MCP-Server bauen (`anthropic-skills:mcp-builder`)
**Aufrufen wenn:**
- "baue einen MCP-Server", "neues MCP-Tool", "MCP integrieren"

---

### Skill erstellen (`anthropic-skills:skill-creator`)
**Aufrufen wenn:**
- "erstelle einen neuen Skill", "ich will einen eigenen Skill", "Skill bauen"

---

### Theme / Design-System (`anthropic-skills:theme-factory`)
**Aufrufen wenn:**
- "erstelle ein Theme", "Design-System", "Farben anpassen", "neues Theme"

---

### Morgen-Routine (`anthropic-skills:morning`)
**Aufrufen wenn:**
- "guten Morgen", "Tagesüberblick", "was steht heute an", "morning briefing"

---

### Wiederkehrende Aufgaben / Loop (`loop`)
**Aufrufen wenn:**
- "mach das alle X Minuten", "wiederhole das", "lauf im Hintergrund"
- "monitore das", "check regelmäßig"

---

### Weniger Berechtigungs-Prompts (`fewer-permission-prompts`)
**Aufrufen wenn:**
- "zu viele Berechtigungs-Abfragen", "nervige Prompts", "erlaube alles was ich brauche"
- "reduce permission prompts"

---

## Allgemeine Regeln

- Sprache: Deutsch, außer der User wechselt ins Englische
- Ton: direkt, klar, kein Marketing-Speak
- Skills sofort aufrufen – nicht erst fragen ob man es soll
- Keine langen Einleitungen vor Tool-Aufrufen
- Rechtschreibfehler des Users stillschweigend korrigieren, nicht kommentieren
- Keine Wiederholungen, keine Schleifen in den Antworten
- Eigene Meinung klar benennen wenn gefragt
