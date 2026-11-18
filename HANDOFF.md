# Handoff — Stand 2026-11-18

## Erledigt

### UI/UX Pro Max Skill installiert
- Skill v2.15.0 liegt in `.claude/skills/ui-ux-pro-max/`
- 79 UI-Stile, 192 Farbpaletten, 74 Font-Pairings, 119 UX-Richtlinien, 22 Stacks
- Automatisch aktiv bei jedem UI-Task (via CLAUDE.md)

### CLAUDE.md konfiguriert
- Projektlokal: `/home/user/Jarvis-Office/CLAUDE.md` → lädt Skill bei jedem UI-Task
- Global: `/root/.claude/CLAUDE.md` → gilt für alle Repos

### Alles committed und gepusht
- Branch: `ccr-f54a59a3-stdfhu`
- Repo: `sunniboi/Jarvis-Office`

---

## Offen / Nächster Schritt

### UI/UX Pro Max auf M73 Tiny installieren

Der Benutzer möchte Claude Code + UI/UX Pro Max Skill auf seinem Lenovo ThinkCentre M73 Tiny installieren.

**Verbindungsdaten M73:**
```
IP:        192.168.178.107  (DHCP — kann wechseln, Hostname m73tiny.fritz.box ist stabiler)
User:      root
SSH-Key:   ~/.ssh/m73_ed25519
Port:      22
Befehl:    ssh -i ~/.ssh/m73_ed25519 root@192.168.178.107
OS:        Debian 13 (Trixie), x86_64
```

**Problem bisher:** Dieser Cloud-Container hat kein `ssh`-Binary und kann private IPs (192.168.x.x) nicht erreichen.

**Lösung — zwei Wege:**

**Weg 1 (empfohlen): Claude Code direkt auf M73 installieren**
Auf dem M73 ausführen:
```bash
# Node.js installieren falls nicht vorhanden
apt install -y nodejs npm

# Claude Code installieren
npm install -g @anthropic-ai/claude-code

# UI/UX Pro Max Skill einrichten
mkdir -p ~/.claude/skills
cd ~/.claude/skills
git clone https://github.com/nextlevelbuilder/ui-ux-pro-max-skill tmp_skill
cp -r tmp_skill/src/ui-ux-pro-max .
rm -rf tmp_skill

# Globale CLAUDE.md
cat > ~/.claude/CLAUDE.md << 'EOF'
# Globale Regeln für Claude (alle Projekte)

## UI/UX Skill

Bei jedem UI-bezogenen Task automatisch den Skill laden:
/ui-ux-pro-max
EOF

# Claude Code starten
claude
```

**Weg 2: Remote Control einrichten**
Auf dem M73 den Claude Remote Control Agent installieren → dann kann dieser Cloud-Container direkt auf den M73 zugreifen.
Doku: https://claude.ai/code/docs → Remote Control

---

## Projekt-Status Jarvis-Office

Jarvis Office v1.0 ist eine Offline-Web-App (HTML/CSS/JS) mit 8 Modulen:
Write, Calc, Matrix, Draw, Present, Mail, Notes, Calendar.

Bekannte Baustellen laut `replica/recon.md`:
- Globale Namespace-Verschmutzung (alles auf `window`)
- Emoji-Icons statt Icon-System
- Calc refresht 2600 Zellen bei jedem Tastendruck
- Kein Modul-System

Nächste sinnvolle Aufgabe: UI-Redesign mit UI/UX Pro Max Skill.
Einstieg: `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "productivity office suite desktop" --design-system -p "Jarvis Office"`
