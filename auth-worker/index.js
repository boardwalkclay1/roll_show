export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Normalize: accept both direct and forwarded paths
    const isHash =
      method === "POST" &&
      (path === "/hash" || path === "/api/auth/hash");

    const isVerify =
      method === "POST" &&
      (path === "/verify" || path === "/api/auth/verify");

    // ============================
    // PBKDF2 HASH
    // ============================
    if (isHash) {
      let body;
      try {
        body = await request.json();
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Invalid JSON" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const password = body.password;
      if (!password) {
        return new Response(
          JSON.stringify({ error: "Missing password" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const salt = crypto.getRandomValues(new Uint8Array(16));

      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
      );

      const bits = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          salt,
          iterations: 310000
        },
        key,
        256
      );

      const hash = btoa(String.fromCharCode(...new Uint8Array(bits)));
      const saltB64 = btoa(String.fromCharCode(...salt));

      return new Response(
        JSON.stringify({ hash, salt: saltB64 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // ============================
    // PBKDF2 VERIFY
    // ============================
    if (isVerify) {
      let body;
      try {
        body = await request.json();
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Invalid JSON" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const { password, hash, salt } = body;

      if (!password || !hash || !salt) {
        return new Response(
          JSON.stringify({ error: "Missing fields" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0));

      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
      );

      const bits = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          salt: saltBytes,
          iterations: 310000
        },
        key,
        256
      );

      const newHash = btoa(String.fromCharCode(...new Uint8Array(bits)));

      return new Response(
        JSON.stringify({ ok: newHash === hash }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Default
    return new Response("Auth worker online");
  }
};
