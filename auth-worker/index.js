// auth-worker/index.js — bcrypt-edge auth worker (tight, minimal, consistent responses)
// - Endpoints: POST /api/signup, POST /api/login, POST /api/hash, POST /api/verify, GET /health
// - Uses env.DB (D1) for persistence
// - Returns consistent JSON shapes: { success: true, user: { id, email, role, created_at } } or { success: false, error }
// - All password hashing/verification happens server-side with bcrypt-edge

import { genSaltSync, hashSync, compareSync } from "bcrypt-edge";

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

function normalizeEmail(raw) {
  if (!raw) return "";
  return String(raw).trim().toLowerCase();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const rawPath = (url.pathname || "").replace(/\/+$/, "");
    const method = (request.method || "GET").toUpperCase();

    try {
      // Health check
      if (method === "GET" && (rawPath === "" || rawPath === "/health")) {
        return jsonResponse({ success: true, message: "Auth worker (bcrypt) online" }, 200);
      }

      // Helper: safe JSON parse
      async function parseJson(req) {
        try {
          return await req.json();
        } catch {
          return null;
        }
      }

      // POST /api/hash  -> returns bcrypt hash for a password (utility)
      if (method === "POST" && rawPath === "/api/hash") {
        const body = await parseJson(request);
        if (!body || !body.password) return jsonResponse({ success: false, error: "Missing password" }, 400);
        const salt = genSaltSync(10);
        const hash = hashSync(String(body.password), salt);
        return jsonResponse({ success: true, hash }, 200);
      }

      // POST /api/verify -> verify password against hash (utility)
      if (method === "POST" && rawPath === "/api/verify") {
        const body = await parseJson(request);
        if (!body || !body.password || !body.hash) return jsonResponse({ success: false, error: "Missing fields" }, 400);
        const ok = compareSync(String(body.password), String(body.hash));
        return jsonResponse({ success: true, match: !!ok }, 200);
      }

      // Signup: POST /api/signup
      if (method === "POST" && rawPath === "/api/signup") {
        const body = await parseJson(request);
        if (!body) return jsonResponse({ success: false, error: "Invalid JSON" }, 400);

        const email = normalizeEmail(body.email);
        const password = body.password ? String(body.password) : "";
        const role = body.role ? String(body.role) : "user";

        if (!email || !password) return jsonResponse({ success: false, error: "Missing email or password" }, 400);

        // Check existing user
        const existsQ = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).all();
        const exists = existsQ?.results?.length > 0;
        if (exists) return jsonResponse({ success: false, error: "Email already registered" }, 409);

        // Hash password
        const salt = genSaltSync(10);
        const hash = hashSync(password, salt);

        // Insert user (store created_at as ISO string)
        try {
          await env.DB.prepare(
            `INSERT INTO users (email, password_hash, role, created_at)
             VALUES (?, ?, ?, ?)`
          ).bind(email, hash, role, new Date().toISOString()).run();
        } catch (err) {
          // If unique constraint triggered concurrently, return 409
          const msg = String(err || "").toLowerCase();
          if (msg.includes("unique") || msg.includes("constraint")) {
            return jsonResponse({ success: false, error: "Email already registered" }, 409);
          }
          return jsonResponse({ success: false, error: "Database error", detail: String(err) }, 500);
        }

        // Read back user to return id and created_at
        const q = await env.DB.prepare("SELECT id, email, role, created_at FROM users WHERE email = ?").bind(email).all();
        const user = q?.results?.[0] || null;
        if (!user) return jsonResponse({ success: false, error: "Signup succeeded but user not found" }, 500);

        return jsonResponse({ success: true, user: { id: user.id, email: user.email, role: user.role, created_at: user.created_at } }, 201);
      }

      // Login: POST /api/login
      if (method === "POST" && rawPath === "/api/login") {
        const body = await parseJson(request);
        if (!body) return jsonResponse({ success: false, error: "Invalid JSON" }, 400);

        const email = normalizeEmail(body.email);
        const password = body.password ? String(body.password) : "";

        if (!email || !password) return jsonResponse({ success: false, error: "Missing email or password" }, 400);

        const q = await env.DB.prepare("SELECT id, email, password_hash, role, created_at FROM users WHERE email = ?").bind(email).all();
        const user = q?.results?.[0] || null;
        if (!user) return jsonResponse({ success: false, error: "Invalid credentials" }, 401);

        const ok = compareSync(password, user.password_hash);
        if (!ok) return jsonResponse({ success: false, error: "Invalid credentials" }, 401);

        // Successful login — return minimal user object. Session/cookie handling should be implemented separately if needed.
        return jsonResponse({ success: true, user: { id: user.id, email: user.email, role: user.role, created_at: user.created_at } }, 200);
      }

      return jsonResponse({ success: false, error: "Not found" }, 404);
    } catch (err) {
      return jsonResponse({ success: false, error: "Server error", detail: String(err) }, 500);
    }
  }
};
