import { EmailMessage } from "cloudflare:email";

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 5;
const MAX_CACHE_SIZE = 1000;
const EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const requests = new Map();

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  const configured = (env.CONTACT_ALLOWED_ORIGINS || "").split(",").filter(Boolean);
  return [
    "https://wovenmining.ca",
    "https://www.wovenmining.ca",
    ...configured,
  ].includes(origin);
}

async function rateLimited(request, env) {
  const address = request.headers.get("CF-Connecting-IP") || "unknown";
  if (address === "unknown") return true;
  const now = Date.now();

  if (env.CONTACT_RATE_LIMIT) {
    const key = `contact:${address}`;
    const stored = await env.CONTACT_RATE_LIMIT.get(key);
    const count = stored ? Number(stored) + 1 : 1;
    await env.CONTACT_RATE_LIMIT.put(key, String(count), { expirationTtl: 60 });
    return count > MAX_REQUESTS;
  }

  const previous = requests.get(address);

  if (!previous || now - previous.startedAt >= WINDOW_MS) {
    requests.set(address, { startedAt: now, count: 1 });
    if (requests.size > MAX_CACHE_SIZE) {
      for (const [key, entry] of requests) {
        if (now - entry.startedAt >= WINDOW_MS) requests.delete(key);
      }
    }
    return false;
  }

  previous.count += 1;
  return previous.count > MAX_REQUESTS;
}

function clean(value, maximum) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export async function onRequestPost({ request, env }) {
  if (!allowedOrigin(request, env)) {
    console.warn("Contact submission rejected: invalid origin");
    return json({ error: "Request not allowed." }, 403);
  }

  if (await rateLimited(request, env)) {
    console.warn("Contact submission rejected: rate limit exceeded");
    return json({ error: "Too many requests. Please try again later." }, 429);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return json({ error: "Invalid request." }, 400);
  }

  if (clean(payload.website, 100)) {
    console.warn("Contact submission rejected: honeypot triggered");
    return json({ error: "Request not allowed." }, 400);
  }

  const name = clean(payload.name, 100);
  const email = clean(payload.email, 254);
  const message = clean(payload.message, 5000);

  if (!name || !EMAIL_PATTERN.test(email) || !message) {
    return json({ error: "Please provide a name, valid email, and message." }, 400);
  }

  const recipient = env.CONTACT_RECIPIENT;
  const sender = env.CONTACT_SENDER;
  const senderName = env.CONTACT_SENDER_NAME || "Woven Mining Website";
  if (!env.SEND_EMAIL || !sender || !recipient) {
    console.error("Contact email is not configured");
    return json({ error: "Contact form is temporarily unavailable." }, 503);
  }

  const body = [
    `Name: ${name}`,
    `Email: ${email}`,
    "",
    message,
  ].join("\r\n");
  // EmailMessage expects an RFC 5322 message; CRLF and the blank separator are required.
  const raw = [
    `From: ${senderName} <${sender}>`,
    `To: ${recipient}`,
    `Reply-To: ${email}`,
    "Subject: New website contact form message",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
  ].join("\r\n");

  try {
    await env.SEND_EMAIL.send(new EmailMessage(sender, recipient, raw));
    console.info("Contact submission email sent");
    return json({ ok: true });
  } catch (error) {
    console.error("Contact submission email failed", error);
    return json({ error: "Unable to send your message right now." }, 502);
  }
}

export function onRequestOptions({ request, env }) {
  if (!allowedOrigin(request, env)) return new Response(null, { status: 403 });
  return new Response(null, {
    headers: {
      "access-control-allow-origin": request.headers.get("Origin"),
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
    },
  });
}
