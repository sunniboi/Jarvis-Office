---
name: video-fertig
description: 'Macht ein Video automatisch fertig: Pausen und Schwarzbild raus, Format für TikTok/Reels/Shorts/YouTube/WhatsApp, Kurzfassung, GIF, MP3, Titel, Ton angleichen. Nutzen, sobald der Nutzer „mach mir ein Video fertig“, „schneide das Video“, „mach ein Reel/Short/GIF draus“ o. Ä. sagt oder eine Video-/Tondatei hochlädt und ein Ergebnis will.'
---

# Video fertig machen

Ein Befehl erledigt Analyse, Schnitt und Export. Er nutzt die Schnitt-Engine von Jarvis Studio
(`server/jarvis_media.py`, nur Python-Standardbibliothek + ffmpeg).

## Ablauf

1. **Datei finden.** Der Nutzer hat sie hochgeladen oder nennt einen Pfad. Fehlt sie: nach der Datei fragen, nichts erfinden.
2. **ffmpeg prüfen** (`command -v ffmpeg ffprobe`). Fehlt es: `apt-get install -y ffmpeg`.
3. **Ausführen** (vom Repo-Stammordner):

   ```bash
   python3 server/jarvis_media.py --auto "<DATEI>" --prompt "<Wunsch des Nutzers, wörtlich>" --out "<Arbeitsordner>/JarvisMedia"
   ```

   - `--prompt` leer lassen = Pausen und Schwarzbild raus, Ton angleichen, MP4 in Originalgröße.
   - `--plan` anhängen = nur den Schnittplan zeigen, nichts rendern.
   - Fortschritt kommt auf stderr, das Ergebnis als JSON auf stdout (`output` = fertige Datei).
4. **Ergebnis liefern.** Die Datei aus `output` dem Nutzer schicken (SendUserFile) und in zwei, drei Sätzen sagen,
   was gemacht wurde: `notes`, herausgeschnittene Sekunden, Länge, Auflösung, Dateigröße. Zahlen aus dem JSON nehmen.

## Was der Wunsch-Text versteht

Ohne KI-Schlüssel arbeitet die Engine mit Stichwörtern:

| Wunsch | Stichwörter |
|---|---|
| Hochkant 9:16 | tiktok, reel, short, hochkant, story |
| Instagram 4:5 / Quadrat | instagram, 4:5 / quadrat, 1:1 |
| YouTube 16:9 | youtube, full hd |
| Klein für Messenger | whatsapp, telegram, e-mail, „15 MB“ |
| Kurzfassung | „60 Sekunden“, „2 Minuten“, highlight, kurzfassung |
| Andere Formate | gif, mp3 / nur ton, webm |
| Sonstiges | stumm, schneller, zeitlupe, stabilisieren, entrauschen, farben verbessern, einblenden, drehen |
| Schriftzug | `Titel: "Text"` |
| Kein Schnitt | ungeschnitten, nicht schneiden |

Liegt in `~/JarvisMedia/.config.json` ein Anthropic-Schlüssel (in Jarvis Studio unter „KI & Einstellungen“ hinterlegt),
plant stattdessen die KI frei nach dem Wunsch.

Passt kein Stichwort zu dem, was der Nutzer will (z. B. „schneide von 0:30 bis 1:10“), den Wunsch selbst in ein
Projekt übersetzen: mit `--plan` den Plan holen und die Bereiche anpassen, oder für Sonderfälle den Skill
`ffmpeg-skill` (im selben Ordner) verwenden.

## Ehrlich bleiben

- Die Kurzfassung wählt die **lautesten** Stellen. Das ist ein Messwert, kein Urteil über den Inhalt – so sagen.
- Fotos kann dieser Befehl nicht; die werden in Jarvis Studio (Reiter „Foto“) bearbeitet.
- Schlägt der Befehl fehl, die Fehlermeldung nennen. Kein Ergebnis behaupten, das es nicht gibt.
- Originale nie überschreiben; die Ausgabe landet immer in `<out>/Exporte`.
