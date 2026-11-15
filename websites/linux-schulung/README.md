# Linuxschulung – Online-Kurs mit PayPal

Ein kleiner Webshop für Online-Kurse: Konten, PayPal-Kasse, Kursinhalte, die nur gekaufte Kunden sehen.

## Was schon drin ist

- Startseite mit Kursübersicht und FAQ
- Konto anlegen und anmelden (Passwörter werden mit scrypt gespeichert)
- PayPal-Kasse: Betrag kommt vom Server, nicht vom Browser. Vor dem Abbuchen wird die Bestellung geprüft (Betrag, Währung, Kurs, Kunde).
- Kursinhalte nur für Kunden mit bezahltem Zugang
- Hinweise zu AGB und Widerruf als Pflichthäkchen vor der Zahlung

## Was noch fehlt (ehrlich)

1. **Rechtstexte**: Impressum, Datenschutz, AGB und die Widerrufs-Formulierung sind Vorlagen. Lass sie vor dem Start prüfen (Stichwort: digitale Inhalte, § 356 Abs. 5 BGB).
2. **PayPal-Webhook**: Wenn ein Kunde nach der Zahlung den Browser schließt, bevor die Bestätigung ankommt, bekommt er keinen Zugang automatisch. Dafür braucht es einen PayPal-Webhook. Das ist ein eigener Schritt.
3. **Passwort vergessen**: Gibt es noch nicht, weil kein Mailversand eingerichtet ist.
4. **Videos**: Die Lektionen sind Text. Videos müssten extern gehostet werden (z. B. als nicht gelistete Videos), damit Ihr Server nicht die Bandbreite zahlt.
5. **Skalierung**: Daten liegen in einer JSON-Datei. Für ein paar hundert Kunden reicht das. Danach lieber auf eine Datenbank umstellen.

## Einrichten (lokal testen)

Voraussetzung: Node.js 22 oder neuer.

```bash
cd websites/linux-schulung
cp .env.example .env     # dann PAYPAL_CLIENT_ID und PAYPAL_CLIENT_SECRET aus dem PayPal-Developer-Dashboard eintragen
npm install
npm start
```

Dann im Browser `http://localhost:3000` öffnen.

### PayPal zuerst im Sandbox-Modus testen

- Im PayPal-Developer-Dashboard (developer.paypal.com) eine Sandbox-App anlegen. Die Client-ID und das Secret dort kopieren.
- In `.env`: `PAYPAL_ENV=sandbox`
- Zum Testen einen Sandbox-Käufer (Personal-Konto) im Dashboard anlegen und damit bezahlen. Es wird kein echtes Geld bewegt.
- Erst wenn alles funktioniert: Live-Zugangsdaten eintragen und `PAYPAL_ENV=live` setzen.

## Kurse ändern

Alles über Kurse steht in `data/courses.json`: Titel, Preis (als Text, z. B. `"49.00"`), Beschreibung und die Lektionen. Nach einer Änderung Server neu starten.

## Veröffentlichen

Die Seite braucht einen Server, auf dem Node.js läuft (z. B. ein kleiner VPS oder ein Node-Hosting-Dienst). Ein reiner Webspace ohne Node reicht nicht.

Auf dem Server:
- `NODE_ENV=production` setzen (Cookies werden dann nur über HTTPS geschickt, also HTTPS einrichten)
- Echte Live-Zugangsdaten bei PayPal eintragen
- `.env` nicht hochladen, sondern dort direkt anlegen

## Dateien

```
server.js            Webserver und alle Routen (Konto, Kurse, PayPal)
lib/auth.js          Passwörter und Login-Sitzungen
lib/paypal.js        PayPal-Anbindung
lib/store.js         Speichern in data/db.json
data/courses.json    Kurse und Lektionen
public/              Seiten für Besucher
```
