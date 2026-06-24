// Relays waitlist signups to Klaviyo from the server side.
// The browser calls this at /.netlify/functions/subscribe (same origin),
// so it is never blocked by tracker protection. This function then talks
// to Klaviyo, where domain-blocking does not apply.
//
// The public key below is the same one already used on the public site —
// it is safe to expose. Never put a Klaviyo PRIVATE key in here.

const KLAVIYO_PUBLIC_KEY = "VUNV3k";
const KLAVIYO_LIST_ID = "QUq9mG";

export default async (req) => {
  const json = (obj, status) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let email = "";
  try {
    const body = await req.json();
    email = (body && body.email ? String(body.email) : "").trim();
  } catch (e) {
    return json({ error: "Invalid request." }, 400);
  }

  // basic email sanity check
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }

  const payload = {
    data: {
      type: "subscription",
      attributes: {
        profile: { data: { type: "profile", attributes: { email } } },
      },
      relationships: {
        list: { data: { type: "list", id: KLAVIYO_LIST_ID } },
      },
    },
  };

  try {
    const kRes = await fetch(
      "https://a.klaviyo.com/client/subscriptions/?company_id=" +
        encodeURIComponent(KLAVIYO_PUBLIC_KEY),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          revision: "2024-10-15",
        },
        body: JSON.stringify(payload),
      }
    );

    // Klaviyo returns 202 (Accepted) on success.
    if (kRes.ok) {
      return json({ ok: true }, 200);
    }

    let detail = "";
    try {
      detail = await kRes.text();
    } catch (e) {}
    console.error("Klaviyo error", kRes.status, detail);
    return json({ error: "Signup failed", status: kRes.status }, 502);
  } catch (e) {
    console.error("Could not reach Klaviyo:", e);
    return json({ error: "Could not reach Klaviyo." }, 502);
  }
};
