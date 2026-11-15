// Gemeinsame Logik für alle Seiten der Linux-Schulung.

async function api(url, options = {}) {
  const res = await fetch(url, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Unbekannter Fehler.");
    err.status = res.status;
    throw err;
  }
  return data;
}

// Textelement mit Inhalt erzeugen. Nutzt textContent, nie innerHTML: sicherer.
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key === "href") node.setAttribute("href", value);
    else node.setAttribute(key, value);
  }
  for (const child of children) {
    if (child == null) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

// Kopfzeile: zeigt an, ob jemand angemeldet ist.
async function renderHeader() {
  const box = document.getElementById("account");
  if (!box) return null;
  let me = { user: null, courses: [] };
  try {
    me = await api("/api/me");
  } catch (err) {
    // Ohne Verbindung einfach als abgemeldet anzeigen.
  }
  box.replaceChildren();
  if (me.user) {
    box.append(
      el("span", { class: "hello" }, "Hallo, " + me.user.name),
      el("button", { class: "btn btn-ghost btn-small", type: "button", id: "logout" }, "Abmelden")
    );
    document.getElementById("logout").addEventListener("click", async () => {
      await api("/api/logout", { method: "POST" });
      location.reload();
    });
  } else {
    box.append(el("a", { class: "btn btn-ghost btn-small", href: "login.html" }, "Anmelden"));
  }
  return me;
}

document.addEventListener("DOMContentLoaded", renderHeader);
