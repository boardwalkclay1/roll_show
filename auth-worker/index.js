export default {
  async fetch(request) {
    const url = new URL(request.url);

    // PBKDF2 HASH
    if (url.pathname === "/hash" && request.method === "POST") {
      const { password } = await request.json();

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

      return new Response(
        JSON.stringify({
          hash: btoa(String.fromCharCode(...new Uint8Array(bits))),
          salt: btoa(String.fromCharCode(...salt))
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // PBKDF2 VERIFY
    if (url.pathname === "/verify" && request.method === "POST") {
      const { password, hash, salt } = await request.json();

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

    return new Response("Auth worker online");
  }
};
