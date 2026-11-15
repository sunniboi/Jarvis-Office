// Passwörter und Login-Sitzungen.
// Passwörter: scrypt (gilt als sicher, eingebaut in Node, keine Zusatzpakete).
// Sitzungen: signiertes Cookie mit Ablaufdatum. Kein Klartext-Passwort wird gespeichert.

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SECRET_FILE = path.join(__dirname, "..", "data", ".session-secret");
const COOKIE = "lx_session";
const MAX_AGE_DAYS = 30;

function getSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  try {
    return fs.readFileSync(SECRET_FILE, "utf8").trim();
  } catch (err) {
    // Noch keine Datei: unten neu erzeugen.
  }
  const secret = crypto.randomBytes(48).toString("hex");
  fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
  fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
  return secret;
}

const SECRET = getSecret();

function sign(data) {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

function makeToken(userId) {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + MAX_AGE_DAYS * 86400000 })
  ).toString("base64url");
  return payload + "." + sign(payload);
}

function readToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!data.exp || data.exp < Date.now()) return null;
  return data.uid;
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || "").split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function currentUserId(req) {
  try {
    return readToken(parseCookies(req)[COOKIE]);
  } catch (err) {
    return null;
  }
}

function setSessionCookie(res, userId) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${makeToken(userId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_DAYS * 86400}${secure}`
  );
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return salt.toString("hex") + ":" + hash.toString("hex");
}

function verifyPassword(password, stored) {
  const [saltHex, hashHex] = String(stored).split(":");
  if (!saltHex || !hashHex) return false;
  const hash = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(hashHex, "hex");
  return expected.length === hash.length && crypto.timingSafeEqual(hash, expected);
}

module.exports = {
  currentUserId,
  setSessionCookie,
  clearSessionCookie,
  hashPassword,
  verifyPassword,
};
