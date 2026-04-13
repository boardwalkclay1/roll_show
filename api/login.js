// /api/login.js — FULL REBUILD (PBKDF2, BOOLEAN VERIFY)

import { apiJson, verify } from "../users.js";

export default async function login(request, env) {
  try {
    const body = await request.json().catch(() => null);
    const emailRaw = (body && body.email) ? String(body.email).trim() : "";
    const password = (body && body.password) ? String(body.password) : "";

    if (!emailRaw || !password) {
      return apiJson({ success: false, message: "Missing credentials" }, 400);
    }

    const email = emailRaw.toLowerCase();

    // Fetch user by email (use parameter binding)
    const row = await env.DB_roll
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(email)
      .first();

    if (!row) {
      // Do not reveal whether email exists
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

    if (isValid !== true) {
      return apiJson({ success: false, message: "Invalid credentials" }, 401);
    }

    // Determine owner flag (support legacy boolean/integer columns)
    const is_owner =
      row.role === "owner" ||
      row["owner-1"] === 1 ||
      row["owner-1"] === "1" ||
      row["is_owner"] === 1 ||
      row["is_owner"] === "true" ||
      row["is_owner"] === true;

    return apiJson({
      success: true,
      user: {
        id: row.id,
        name: row.name || null,
        email: row.email || email,
        role: row.role || "user",
        is_owner,
        created_at: row.created_at || null
      }
    });
  } catch (err) {
    console.error("Login handler error", String(err));
    return apiJson(
      { success: false, message: "Server error", detail: String(err) },
      500
    );
  }
}
