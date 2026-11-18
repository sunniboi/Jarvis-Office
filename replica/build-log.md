# Build-Log Jarvis Office v2

Stand: 18.11.2026

## Gebaut
- Module neu geschrieben: Write, Calc, Matrix, Draw, Present, Mail, Notes, Calendar, AnyDoc, Agenten Office, Find Skills, Launcher
- Design-System mit WCAG-AA-geprüften Tokens, CSS neu
- Debian-Paket 2.4 (Chromium-App-Modus, Launcher, Desktop-Datei) gebaut aus diesem Branch

## Geprüft
- JavaScript-Syntax aller Module (node --check): ok
- Paket im Browser geladen: Launcher zeigt 12 Apps, keine Konsolenfehler

## Noch nicht enthalten
- Task Observer, Strix (Sicherheitsschicht), Agent Reach, UI/UX-Skill, Stop-Slop und Replica-Skills liegen nur auf `main`, nicht auf diesem Branch.
- Die beiden Stände müssen zusammengeführt werden, bevor ein gemeinsames Paket entsteht.

## Commits (neueste zuerst)
- 7076520 Merge pull request #2 from sunniboi/claude/anydoc-required-twwbvm
- 893af2f merge: AnyDoc + Agenten-Office zusammenführen
- 028ee02 chore: .gitignore für .env.local (ElevenLabs API Key)
- 1094bac pkg: Paketinhalt auf v2.0 aktualisiert (alle Module inkl. AnyDoc)
- 942d96b pkg: Jarvis Office 2.0 .deb mit AnyDoc (9 Module)
- c404899 Merge pull request #1 from sunniboi/claude/skill-auto-research-install-bmudms
- 776bb71 build: Debian-Paket auf v2.0 mit Jarvis Agenten Office
- 2100811 feat: Jarvis Agenten Office – Modul im Launcher, Skill umbenannt
- f6a456c feat: Auto-Router-Skill mit Arbeiter- und Prüfer-Agenten
- 50b5639 feat: register SessionStart hook in .claude/settings.json
- 8cfd614 feat: vollständige Skill-Installation — CLAUDE.md erweitert, Session-Start-Hook
- 0ac23c8 Add CLAUDE.md with automatic skill routing rules
