# Übergabe: M73 Tiny einrichten

Stand: 18.11.2026, 20:59 (Europe/Berlin)

## Ziel

Auf dem M73 (Debian 13) installieren und laufen lassen:

1. Alle benötigten Programme
2. Obsidian (läuft beim Login automatisch, Vault unter `/home/sohndesvolkes/Fjarvis`)
3. Asterisk-Server

Der Rechner soll ohne Nachfragen flüssig laufen. Probleme sind offen zu melden.

## Zugang

- Host: `m73tiny.fritz.box` bzw. `192.168.178.107` (DHCP, kann wechseln)
- Benutzer: `root`, Anmeldung per SSH-Schlüssel `~/.ssh/m73_ed25519`
- Port: 22

Die Passwörter liegen nicht in diesem Dokument. Sie stehen nur im Chat und müssen nach der Einrichtung geändert werden.

## Stand

- Repo `Jarvis-Office` ist als Obsidian-Vault vorbereitet (`.obsidian/`, `README.md`)
- Autostart-Skript für Obsidian: `setup/autostart.sh`
- Auf dem M73 ist noch nichts installiert (nicht geprüft)

## Bekannte Blocker

- Die Cloud-Sitzung erreicht den M73 nicht (Heimnetz, Verbindung abgelehnt, Name nicht auflösbar).
- Der Schlüssel `m73_ed25519` liegt nur auf dem Rechner „debian“.
- Die Ordner auf „debian“ (`Jarvis`, `Smarthome-Bridge`, `mail-reader-marketplace`) sind für Cloud-Sitzungen nicht freigegeben.

## Nächste Schritte

1. Sitzung auf „debian“ starten, die den Schlüssel hat.
2. Verbindung prüfen: `ssh -i ~/.ssh/m73_ed25519 root@m73tiny.fritz.box`
3. Pakete aktualisieren, Obsidian installieren (Flatpak oder .deb), Autostart einrichten.
4. Asterisk installieren und konfigurieren.
5. Passwörter für `root`, `admin` und `sohndesvolkes` ändern.

## Offen für Asterisk

Asterisk allein kann nicht ins Telefonnetz. Dafür muss der M73 als SIP-Telefon an der Fritz!Box angemeldet werden. Das ist in der Fritz!Box einzurichten und noch nicht geklärt.
