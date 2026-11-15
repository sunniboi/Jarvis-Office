// Reparaturservice Römmert – kleine Logik für Menü und Kontaktformular.
//
// FORM_ENDPOINT: Hier kommt die Adresse hin, die die Formular-Daten annimmt
// (z. B. ein Formular-Dienst wie Formspree oder ein eigenes Skript auf Ihrem Webspace).
// Leer lassen = das Formular öffnet das E-Mail-Programm des Kunden mit dem fertigen Text.
const FORM_ENDPOINT = "";
const CONTACT_MAIL = "kontakt@example.de"; // TODO: echte Adresse eintragen

// Menü auf dem Handy
const toggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  nav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    })
  );
}

// Kontaktformular
const form = document.getElementById("kontaktformular");
const statusEl = document.getElementById("formstatus");

function setStatus(text, ok) {
  statusEl.textContent = text;
  statusEl.className = "formstatus " + (ok ? "ok" : "err");
}

function validate() {
  let valid = true;
  let firstBad = null;
  form.querySelectorAll("[required]").forEach((el) => {
    const wrap = el.closest(".field");
    const isOk = el.type === "checkbox" ? el.checked : el.value.trim() !== "" && el.checkValidity();
    wrap.classList.toggle("invalid", !isOk);
    if (!isOk) {
      valid = false;
      firstBad = firstBad || el;
    }
  });
  if (firstBad) {
    firstBad.focus();
    setStatus("Bitte füllen Sie die markierten Felder aus.", false);
  }
  return valid;
}

function buildMailto(data) {
  const body = [
    `Name: ${data.name}`,
    `E-Mail: ${data.email}`,
    `Telefon: ${data.telefon || "-"}`,
    `Anliegen: ${data.anliegen}`,
    `Gerät: ${data.geraet || "-"}`,
    "",
    data.nachricht,
  ].join("\n");
  const subject = `Anfrage Reparaturservice: ${data.anliegen}`;
  return `mailto:${CONTACT_MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    // Honeypot: Bots füllen das versteckte Feld aus, Menschen nicht.
    if (data.firma_web) {
      setStatus("Danke! Ihre Anfrage ist angekommen.", true);
      form.reset();
      return;
    }

    if (!FORM_ENDPOINT) {
      window.location.href = buildMailto(data);
      setStatus("Ihr E-Mail-Programm öffnet sich. Bitte dort auf Senden drücken.", true);
      return;
    }

    setStatus("Wird gesendet …", true);
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      form.reset();
      setStatus("Danke! Ihre Anfrage ist angekommen. Wir melden uns in der Regel innerhalb von zwei Werktagen.", true);
    } catch (err) {
      setStatus(
        `Das hat leider nicht geklappt. Bitte schreiben Sie uns direkt an ${CONTACT_MAIL}.`,
        false
      );
    }
  });
}
