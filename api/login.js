// /api/login.js — FINAL FIXED VERSION
// - Correct PBKDF2 verify
// - Correct user lookup
// - Correct role return
// - Correct session cookie
// - ADDS x-user-id + x-user-role headers (critical)
// - Owner account works immediately

import { cors, apiJson, verify } from "../users.js";

const SESSION_COOKIE_NAME = "rs_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function makeSessionCookieValue(payload) {
  try {
    return btoa(JSON.stringify(payload));
  } catch {
    return "";
  }
}

function makeSetCookieHeader(value) {
  return `${SESSION_COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE}`;
}

export default async function login(request, env) {
  try {
    const body = await request.json().catch(() => null);
    const emailRaw = body?.email?.trim() || "";
    const password = body?.password || "";

    if (!emailRaw || !password) {
      return apiJson({ success: false, message: "Missing credentials" }, 400);
    }

    const email = emailRaw.toLowerCase();

    // Fetch user
    const row = await env.DB_roll
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(email)
      .first();

    if (!row) {
      return apiJson({ success: false, message: "Invalid credentials" }, 401);
    }

    if (!row.password_hash || !row.password_salt) {
      return apiJson(
        { success: false, message: "User missing PBKDF2 fields" },
        500
      );
    }

    const iterations = Number(row.password_iterations) || 100000;

    let isValid = false;
    try {
      isValid = await verify(
        password,
        row.password_hash,
        row.password_salt,
        iterations,
        env
      );
    } catch (err) {
      console.error("verify() error", String(err));
      return apiJson(
        {
          success: false,
          message: "Server error",
          detail: "Authentication backend returned an unexpected response"
        },
        500
      );
    }

    if (!isValid) {
      return apiJson({ success: false, message: "Invalid credentials" }, 401);
    }

    // Normalize role
    const role = row.role || "user";

    // Owner detection
    const is_owner =
      role === "owner" ||
      row["owner-1"] === 1 ||
      row["owner-1"] === "1" ||
      row["is_owner"] === 1 ||
      row["is_owner"] === "true" ||
      row["is_owner"] === true;

    const user = {
      id: row.id,
      name: row.name || null,
      email: row.email,
      role,
      is_owner,
      created_at: row.created_at
    };

    // Create session cookie
    const sessionPayload = { id: user.id, role: user.role, ts: Date.now() };
    const cookieValue = makeSessionCookieValue(sessionPayload);
    const setCookie = makeSetCookieHeader(cookieValue);

    // Redirect map
    const redirectMap = {
      owner: "/pages/owner/owner-dashboard.html",
      business: "/pages/business/business-dashboard.html",
      buyer: "/pages/buyer/buyer-dashboard.html",
      skater: "/pages/skater/skater-dashboard.html",
      musician: "/pages/musician/musician-dashboard.html",
      user: "/"
    };
    const redirect = redirectMap[user.role] || "/";

    // ⭐ CRITICAL FIX: add x-user-id + x-user-role headers
    const headers = {
      "Content-Type": "application/json",
      ...cors(),
      "Set-Cookie": setCookie,
      "x-user-id": user.id,
      "x-user-role": user.role
    };

    return new Response(JSON.stringify({ success: true, user, redirect }), {
      status: 200,
      headers
    });

  } catch (err) {
    console.error("Login handler error", String(err));
    return apiJson(
      { success: false, message: "Server error", detail: String(err) },
      500
    );
  }
}
