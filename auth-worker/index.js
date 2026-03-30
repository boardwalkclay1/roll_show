import bcrypt from "bcryptjs";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/hash") {
      const { password } = await request.json();
      const hashed = await bcrypt.hash(password, 10);
      return new Response(JSON.stringify({ hashed }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (path === "/verify") {
      const { password, hash } = await request.json();
      const ok = await bcrypt.compare(password, hash);
      return new Response(JSON.stringify({ ok }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};
