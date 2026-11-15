// Linux-Schulung: Webserver mit Konten, PayPal-Kasse und geschützten Kursinhalten.

const path = require("path");
const crypto = require("crypto");
const express = require("express");

const store = require("./lib/store");
const auth = require("./lib/auth");
const paypal = require("./lib/paypal");
const courses = require("./data/courses.json");

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
app.use(express.static(path.join(__dirname, "public")));

// ---------- Hilfsfunktionen ----------

const findCourse = (slug) => courses.find((c) => c.slug === slug);

const publicCourse = (c) => ({
  slug: c.slug,
  title: c.title,
  subtitle: c.subtitle,
  description: c.description,
  highlights: c.highlights,
  price: c.price,
  currency: c.currency,
  lessonCount: c.lessons.length,
});

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });

function findUser(req) {
  const uid = auth.currentUserId(req);
  if (!uid) return null;
  return store.get().users.find((u) => u.id === uid) || null;
}

function hasAccess(userId, slug) {
  return store.get().purchases.some(
    (p) => p.userId === userId && p.courseSlug === slug && p.status === "paid"
  );
}

function requireUser(req, res, next) {
  const user = findUser(req);
  if (!user) return res.status(401).json({ error: "Bitte melde dich zuerst an." });
  req.user = user;
  next();
}

// ---------- Konto ----------

app.post("/api/register", (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 100);
  const email = String(req.body.email || "").trim().toLowerCase().slice(0, 200);
  const password = String(req.body.password || "");

  if (!name) return res.status(400).json({ error: "Bitte gib deinen Namen an." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Bitte gib eine gültige E-Mail-Adresse an." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Das Passwort braucht mindestens 8 Zeichen." });
  }

  const db = store.get();
  if (db.users.some((u) => u.email === email)) {
    return res.status(409).json({ error: "Zu dieser E-Mail gibt es schon ein Konto. Bitte melde dich an." });
  }

  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash: auth.hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  store.save();
  auth.setSessionCookie(res, user.id);
  res.status(201).json({ user: publicUser(user) });
});

app.post("/api/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = store.get().users.find((u) => u.email === email);

  // Gleiche Fehlermeldung für "unbekannt" und "falsches Passwort".
  if (!user || !auth.verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "E-Mail oder Passwort stimmt nicht." });
  }
  auth.setSessionCookie(res, user.id);
  res.json({ user: publicUser(user) });
});

app.post("/api/logout", (req, res) => {
  auth.clearSessionCookie(res);
  res.json({ ok: true });
});

app.get("/api/me", (req, res) => {
  const user = findUser(req);
  if (!user) return res.json({ user: null, courses: [] });
  const owned = store
    .get()
    .purchases.filter((p) => p.userId === user.id && p.status === "paid")
    .map((p) => p.courseSlug);
  res.json({ user: publicUser(user), courses: owned });
});

// ---------- Kurse ----------

app.get("/api/config", (req, res) => {
  res.json({
    paypalClientId: process.env.PAYPAL_CLIENT_ID || null,
    paypalEnv: process.env.PAYPAL_ENV === "live" ? "live" : "sandbox",
  });
});

app.get("/api/courses", (req, res) => {
  res.json(courses.map(publicCourse));
});

// Kursinhalte gibt es nur mit Zugang.
app.get("/api/courses/:slug/lessons", requireUser, (req, res) => {
  const course = findCourse(req.params.slug);
  if (!course) return res.status(404).json({ error: "Diesen Kurs gibt es nicht." });
  if (!hasAccess(req.user.id, course.slug)) {
    return res.status(403).json({ error: "Für diesen Kurs hast du noch keinen Zugang." });
  }
  res.json({ title: course.title, lessons: course.lessons });
});

// ---------- PayPal ----------

// 1. Bestellung anlegen. Preis kommt vom Server, nie vom Browser.
app.post("/api/paypal/orders", requireUser, async (req, res) => {
  const course = findCourse(req.body.courseSlug);
  if (!course) return res.status(404).json({ error: "Diesen Kurs gibt es nicht." });
  if (req.body.agb !== true || req.body.widerruf !== true) {
    return res.status(400).json({ error: "Bitte bestätige zuerst die Hinweise zu AGB und Widerruf." });
  }
  if (hasAccess(req.user.id, course.slug)) {
    return res.status(409).json({ error: "Du hast diesen Kurs schon." });
  }

  try {
    const order = await paypal.createOrder({
      amount: course.price,
      currency: course.currency,
      referenceId: course.slug,
      customId: req.user.id,
      description: course.title,
      requestId: crypto.randomUUID(),
    });
    res.json({ id: order.id });
  } catch (err) {
    console.error("PayPal createOrder:", err.message, err.details || "");
    res.status(502).json({ error: "PayPal ist gerade nicht erreichbar. Bitte versuche es später noch einmal." });
  }
});

// 2. Nach Freigabe durch den Kunden: prüfen und abbuchen, dann Zugang freischalten.
app.post("/api/paypal/orders/:id/capture", requireUser, async (req, res) => {
  const orderId = req.params.id;
  const db = store.get();

  // Schon verarbeitet? (z. B. Seite wurde neu geladen)
  const existing = db.purchases.find((p) => p.orderId === orderId);
  if (existing) {
    if (existing.userId !== req.user.id) {
      return res.status(400).json({ error: "Diese Bestellung gehört nicht zu deinem Konto." });
    }
    return res.json({ ok: true, alreadyDone: true });
  }

  try {
    // Vor dem Abbuchen prüfen: passt Betrag, Währung, Kurs und Kunde?
    const order = await paypal.getOrder(orderId);
    const unit = order.purchase_units && order.purchase_units[0];
    const course = unit && findCourse(unit.reference_id);
    if (
      !course ||
      unit.custom_id !== req.user.id ||
      unit.amount.currency_code !== course.currency ||
      unit.amount.value !== course.price
    ) {
      return res.status(400).json({ error: "Die Bestellung passt nicht zu deinem Konto oder Kurs." });
    }

    let result = order;
    if (order.status === "APPROVED") {
      result = await paypal.captureOrder(orderId, "capture-" + orderId);
    }
    const capture = result.purchase_units[0].payments && result.purchase_units[0].payments.captures[0];
    if (result.status !== "COMPLETED" || !capture || capture.status !== "COMPLETED") {
      return res.status(402).json({ error: "Die Zahlung wurde nicht abgeschlossen. Dir wurde nichts berechnet, bitte versuche es erneut." });
    }

    db.purchases.push({
      id: crypto.randomUUID(),
      userId: req.user.id,
      courseSlug: course.slug,
      orderId,
      captureId: capture.id,
      amount: capture.amount.value,
      currency: capture.amount.currency_code,
      status: "paid",
      createdAt: new Date().toISOString(),
    });
    store.save();
    res.json({ ok: true });
  } catch (err) {
    console.error("PayPal capture:", err.message, err.details || "");
    res.status(502).json({ error: "Die Zahlung konnte nicht bestätigt werden. Falls Geld abgebucht wurde, melde dich bitte bei uns." });
  }
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Linux-Schulung läuft auf http://localhost:${PORT}`);
  if (!process.env.PAYPAL_CLIENT_ID) {
    console.log("Hinweis: PayPal ist noch nicht eingerichtet (siehe README.md).");
  }
});
