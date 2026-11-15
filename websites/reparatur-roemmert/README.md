# Reparaturservice Römmert – Website

Eine statische Website (nur HTML, CSS, JavaScript). Sie braucht keinen Server mit Programmierung, nur einen normalen Webspace.

## Vor dem Veröffentlichen anpassen

1. **Platzhalter füllen**: Alles, was in `[eckigen Klammern]` steht, in `impressum.html`, `datenschutz.html` und `index.html` (Fußzeile).
2. **Kontaktadresse** in `js/main.js` bei `CONTACT_MAIL` eintragen.
3. **Formular-Ziel** (optional) in `js/main.js` bei `FORM_ENDPOINT` eintragen.
   - Leer: Das Formular öffnet das E-Mail-Programm des Kunden mit vorausgefülltem Text. Funktioniert ohne jede Einrichtung.
   - Mit Adresse: Die Anfrage geht direkt an den Dienst, z. B. Formspree. Dann kommt die Anfrage als E-Mail bei Ihnen an.
4. **Datenschutzerklärung** nach Anbieter-Angaben ergänzen, z. B. Hosting-Anbieter.

## Veröffentlichen

Alle Dateien in den Ordner des Webspaces hochladen (per FTP oder im Webhosting-Panel), `index.html` muss im Hauptordner liegen.

## Ordnerstruktur

```
index.html          Startseite mit Leistungen, Linux-Bereich, Ablauf, Formular
impressum.html      Impressum (Platzhalter)
datenschutz.html    Datenschutzerklärung (Grundgerüst)
css/style.css       Aussehen, Farben, Hell/Dunkel-Modus
js/main.js          Menü, Formular-Prüfung, Versand
```

## Hinweis zu Preisen

Die Seite nennt bewusst keine Pauschalpreise. Nur klar kalkulierbare Festleistungen wie „Herdanschluss 50 € fest“ stehen drin. Alles andere läuft über den Kostenvoranschlag.
