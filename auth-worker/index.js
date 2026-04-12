// auth-worker/index.js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const isHash =
      method === "POST" &&
      (path === "/hash" || path === "/api/auth/hash");

    const isVerify =
      method === "POST" &&
      (path === "/verify" || path === "/api/auth/verify");

    // helper: JSON response
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { "Content-Type": "application/json" }
      });

    // safe base64 helpers
    const toB64 = (u8) =>
      btoa(String.fromCharCode(...new Uint8Array(u8)));
    const fromB64 = (s) =>
      Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

    // PBKDF2 worker function with try/catch and optional fallback
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
          iterations,
        },
        key,
        256
      );

      return new Uint8Array(bits);
    }

    try {
      if (isHash) {
        let body;
        try {
          body = await request.json();
        } catch (e) {
          return json({ success: false, error: "Invalid JSON" }, 400);
        }

        const password = body.password;
        if (!password) {
          return json({ success: false, error: "Missing password" }, 400);
        }

        // primary iteration count (your production target)
        const PRIMARY_ITER = 310000;
        // fallback for testing if primary fails (reduce CPU/time)
        const FALLBACK_ITER = 100000;

        const salt = crypto.getRandomValues(new Uint8Array(16));
        try {
          const hashBytes = await derive(password, salt, PRIMARY_ITER);
          return json({
            success: true,
            hash: toB64(hashBytes),
            salt: toB64(salt),
            iterations: PRIMARY_ITER,
            warning: null
          });
        } catch (errPrimary) {
          // log the primary failure
          console.error("PBKDF2 primary failed:", String(errPrimary));

          // try fallback once (useful for debugging / edge limits)
          try {
            const hashBytes = await derive(password, salt, FALLBACK_ITER);
            return json({
              success: true,
              hash: toB64(hashBytes),
              salt: toB64(salt),
              iterations: FALLBACK_ITER,
              warning: "Primary iterations failed; used fallback iterations"
            });
          } catch (errFallback) {
            console.error("PBKDF2 fallback failed:", String(errFallback));
            return json(
              { success: false, error: "PBKDF2 failed", detail: String(errFallback) },
              500
            );
          }
        }
      }

      if (isVerify) {
        let body;
        try {
          body = await request.json();
        } catch (e) {
          return json({ success: false, error: "Invalid JSON" }, 400);
        }

        const { password, hash, salt, iterations } = body;
        if (!password || !hash || !salt) {
          return json({ success: false, error: "Missing fields" }, 400);
        }

        const saltBytes = fromB64(salt);
        const iter = iterations || 310000;

        try {
          const bits = await derive(password, saltBytes, iter);
          const newHash = toB64(bits);
          return json({ success: true, ok: newHash === hash });
        } catch (err) {
          console.error("Verify PBKDF2 failed:", String(err));
          return json({ success: false, error: "Verify failed", detail: String(err) }, 500);
        }
      }

      return new Response("Auth worker online");
    } catch (err) {
      // catch-all: log and return JSON so caller never sees plain 1101
      console.error("Unhandled auth worker error:", String(err));
      return json({ success: false, error: "Unhandled error", detail: String(err) }, 500);
    }
  }
};
