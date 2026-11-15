# Jarvis Office

Lokale Office-Suite im Browser: Write, Calc, Matrix, Draw, Present, Mail, Notes, Calendar – und **Jarvis Studio** für Video, Foto und GIF.

## Installieren und starten

```bash
sudo apt install ./jarvis-office_2.1_all.deb   # holt python3 und ffmpeg mit
jarvis-office                                   # oder über das Anwendungsmenü
```

Ohne Installation, direkt aus diesem Ordner: `./start.sh` (braucht `python3` und `ffmpeg`).

Paket neu bauen: `packaging/build-deb.sh`

## Jarvis Studio

| Bereich | Was es kann |
|---|---|
| Bibliothek | Videos, Fotos, GIFs, Ton hochladen (bis 5 GB je Datei) oder direkt nach `~/JarvisMedia/Bibliothek` kopieren |
| Automatik | Ein Klick oder ein Satz: Pausen und Schwarzbild raus, Kurzfassung, Format für TikTok/Reels/Shorts/YouTube/WhatsApp, GIF, MP3, Titel. Auf Wunsch automatisch nach jedem Upload |
| Video-Schnitt | Zeitachse mit Teilen, Kürzen, Umsortieren, Tempo, mehrere Clips und Fotos, Musik, Text, Blenden, Stabilisieren, Export als MP4/WebM/GIF/MP3 |
| Foto | Automatisch verbessern, Regler, Filter, Zuschneiden, Drehen, Text, Export als JPEG/PNG/WebP |
| Teilen | Upload-Seite der Plattform öffnen und Datei im Ordner zeigen; QR-Code, um die Datei im WLAN aufs Handy zu holen |

**KI-Regie:** Unter „KI & Einstellungen“ einen Anthropic-API-Schlüssel hinterlegen. Dann versteht die Automatik freie
Wünsche, sieht sich Standbilder an und schlägt Beitragstexte vor. Ohne Schlüssel arbeitet sie mit Stichwörtern und Messwerten.

### Grenzen – ehrlich

- **Kein direktes Posten.** Instagram, TikTok, YouTube und Co. lassen fremde Programme nur mit eigener, geprüfter
  Entwickler-Freigabe hochladen. Das Studio öffnet die Upload-Seite und legt die Datei bereit; den letzten Klick macht der Mensch.
- **Kurzfassung = lauteste Stellen.** Das ist ein Messwert, kein Urteil über den Inhalt. Mit KI-Schlüssel kommen Standbilder dazu.
- **Blitz-Schnitt** schneidet nur an Schlüsselbildern (bis ca. 2 Sekunden ungenau), dafür in Sekunden.
- **Hochladen kopiert die Datei** nach `~/JarvisMedia` – ein 5-GB-Film belegt danach 5 GB zusätzlich.
- Die Anbindung an die Anthropic-API ist gegen eine Test-Gegenstelle geprüft, nicht gegen den echten Dienst.

### Technik

`server/jarvis_media.py` ist ein kleiner Dienst nur aus der Python-Standardbibliothek. Er lauscht auf `127.0.0.1`,
verlangt bei jeder Anfrage ein Token und beendet sich nach 20 Minuten Leerlauf. Die Handy-Freigabe öffnet nur auf
Wunsch einen zweiten Port im lokalen Netz und liefert dort ausschließlich die freigegebene Datei (2 Stunden gültig).

Ohne Oberfläche:

```bash
python3 server/jarvis_media.py --auto film.mp4 --prompt "Pausen raus, hochkant für TikTok" --out ./JarvisMedia
```

## Im Claude-Chat: „Mach mir ein Video fertig“

In `.claude/skills/` liegen zwei Skills, die Claude Code (auch in der Handy-App, Cloud-Sitzung mit diesem Repo) automatisch lädt:

- `video-fertig` – ruft die Automatik oben auf und schickt das fertige Video zurück.
- `ffmpeg-skill` – Kopie von [kajisho5/ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill) (MIT) mit 42 ffmpeg-Werkzeugen für Sonderfälle; siehe `HERKUNFT.md` dort.
