// Einfache Datenspeicherung in einer JSON-Datei (data/db.json).
// Gut für den Start und ein paar hundert Kunden. Bei deutlich mehr Kunden
// lohnt sich später der Umstieg auf eine richtige Datenbank (z. B. SQLite oder PostgreSQL).

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "db.json");

let db = null;

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return { users: [], purchases: [] };
    throw err;
  }
}

// Gibt die Datenbank zurück (wird beim ersten Aufruf aus der Datei geladen).
function get() {
  if (!db) db = load();
  return db;
}

// Schreibt zuerst in eine Temp-Datei und benennt sie dann um,
// damit ein Absturz mitten im Schreiben die Datei nicht zerstört.
function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, FILE);
}

module.exports = { get, save };
