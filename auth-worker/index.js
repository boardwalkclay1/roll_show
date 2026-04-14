// auth-worker/index.js — PBKDF2 hash/verify worker (100000 iterations, always JSON)
const ITERATIONS = 100000;

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function toB64(u8) {
  return btoa(String.fromCharCode(...new Uint8Array(u8)));
}
function fromB64(s) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function derive(password, saltBytes, iterations) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBytes,
      iterations
    },
    key,
    256
  );

  return new Uint8Array(bits);
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    const isHash =
      method === "POST" && (path === "/hash" || path === "/api/auth/hash");
    const isVerify =
      method === "POST" && (path === "/verify" || path === "/api/auth/verify");

    try {
      if (isHash) {
        let body;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
        }

        const password = body && body.password ? String(body.password) : "";
        if (!password) {
          return jsonResponse({ success: false, error: "Missing password" }, 400);
        }

        const salt = crypto.getRandomValues(new Uint8Array(16));
        try {
          const hashBytes = await derive(password, salt, ITERATIONS);
          return jsonResponse({
            success: true,
            hash: toB64(hashBytes),
            salt: toB64(salt),
            iterations: ITERATIONS
          }, 200);
        } catch (err) {
          return jsonResponse({ success: false, error: "PBKDF2 failed", detail: String(err) }, 500);
        }
      }

      if (isVerify) {
        let body;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
        }

        const password = body && body.password ? String(body.password) : "";
        const hash = body && body.hash ? String(body.hash) : "";
        const salt = body && body.salt ? String(body.salt) : "";
        const iterations = Number(body && body.iterations) || ITERATIONS;

        if (!password || !hash || !salt) {
          return jsonResponse({ success: false, error: "Missing fields" }, 400);
        }

        try {
          const saltBytes = fromB64(salt);
          const bits = await derive(password, saltBytes, iterations);
          const newHash = toB64(bits);
          return jsonResponse({ success: true, ok: newHash === hash, iterations }, 200);
        } catch (err) {
          return jsonResponse({ success: false, error: "Verify failed", detail: String(err) }, 500);
        }
      }

      // health
      return jsonResponse({ success: true, message: "Auth worker online", iterations: ITERATIONS }, 200);
    } catch (err) {
      return jsonResponse({ success: false, error: "Unhandled error", detail: String(err) }, 500);
    }
  }
};
