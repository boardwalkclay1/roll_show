// auth-worker/index.js — bcrypt-based auth worker (signup + login)
// Uses D1 binding at env.DB; adjust SQL/table names to match your DB.
import { genSaltSync, hashSync, compareSync } from "bcrypt-edge";

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");
    const method = request.method.toUpperCase();

    try {
      // Signup: POST /api/signup
      if (method === "POST" && (path === "/api/signup" || path === "/api/signup/")) {
        let body;
        try { body = await request.json(); } catch { return jsonResponse({ success: false, error: "Invalid JSON" }, 400); }

        const email = body?.email ? String(body.email).trim().toLowerCase() : "";
        const password = body?.password ? String(body.password) : "";
        const role = body?.role ? String(body.role) : "user";
        const stage_name = body?.stage_name ? String(body.stage_name) : null;
        const discipline = body?.discipline ? String(body.discipline) : null;
        const subclass = body?.subclass ? String(body.subclass) : null;

        if (!email || !password) return jsonResponse({ success: false, error: "Missing email or password" }, 400);

        // check existing
        const existsRes = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).all();
        if (existsRes && existsRes.results && existsRes.results.length) {
          return jsonResponse({ success: false, error: "Email already registered" }, 409);
        }

        const salt = genSaltSync(10);
        const hash = hashSync(password, salt);

        // insert (adjust columns to your schema)
        await env.DB.prepare(
          `INSERT INTO users (email, password_hash, role, stage_name, discipline, subclass, created_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
        ).bind(email, hash, role, stage_name, discipline, subclass).run();

        return jsonResponse({ success: true, email, role }, 201);
      }

      // Login: POST /api/login
      if (method === "POST" && (path === "/api/login" || path === "/api/login/")) {
        let body;
        try { body = await request.json(); } catch { return jsonResponse({ success: false, error: "Invalid JSON" }, 400); }

        const email = body?.email ? String(body.email).trim().toLowerCase() : "";
        const password = body?.password ? String(body.password) : "";

        if (!email || !password) return jsonResponse({ success: false, error: "Missing email or password" }, 400);

        const q = await env.DB.prepare("SELECT id, email, password_hash, role FROM users WHERE email = ?").bind(email).all();
        const user = q && q.results && q.results[0] ? q.results[0] : null;
        if (!user) return jsonResponse({ success: false, error: "Invalid credentials" }, 401);

        const ok = compareSync(password, user.password_hash);
        if (!ok) return jsonResponse({ success: false, error: "Invalid credentials" }, 401);

        // return minimal user info; set cookie/session elsewhere if needed
        return jsonResponse({ success: true, id: user.id, email: user.email, role: user.role }, 200);
      }

      // Health
      if (method === "GET" && (path === "/health" || path === "/")) {
        return jsonResponse({ success: true, message: "Auth worker (bcrypt) online" });
      }

      return jsonResponse({ success: false, message: "Not found" }, 404);
    } catch (err) {
      return jsonResponse({ success: false, error: "Server error", detail: String(err) }, 500);
    }
  }
};
