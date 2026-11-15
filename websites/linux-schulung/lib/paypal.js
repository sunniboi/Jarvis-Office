// Kleine Anbindung an die PayPal-REST-API (Orders v2).
// Die Zugangsdaten bleiben auf dem Server, nie im Browser.

const BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function accessToken() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("PayPal ist nicht eingerichtet (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET fehlen).");
  }
  const res = await fetch(BASE + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("PayPal-Anmeldung fehlgeschlagen (HTTP " + res.status + ").");
  return (await res.json()).access_token;
}

async function api(method, urlPath, body, requestId) {
  const token = await accessToken();
  const headers = { Authorization: "Bearer " + token, "Content-Type": "application/json" };
  if (requestId) headers["PayPal-Request-Id"] = requestId;
  const res = await fetch(BASE + urlPath, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.message || "PayPal-Fehler (HTTP " + res.status + ")");
    err.details = json;
    throw err;
  }
  return json;
}

function createOrder({ amount, currency, referenceId, customId, description, requestId }) {
  return api(
    "POST",
    "/v2/checkout/orders",
    {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: referenceId,
          custom_id: customId,
          description,
          amount: { currency_code: currency, value: amount },
        },
      ],
    },
    requestId
  );
}

function getOrder(orderId) {
  return api("GET", `/v2/checkout/orders/${encodeURIComponent(orderId)}`);
}

function captureOrder(orderId, requestId) {
  return api("POST", `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, null, requestId);
}

module.exports = { createOrder, getOrder, captureOrder, BASE };
