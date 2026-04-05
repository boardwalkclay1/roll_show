// /api/login.js — CLEAN, FINAL

import { apiJson, verify } from "../users.js";

export default async function login(request, env) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return apiJson(
        { success: false, message: "Missing credentials" },
        400
      );
    }

    const row = await env.DB_users
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(email)
      .first();

    if (!row) {
      return apiJson(
        { success: false, message: "Invalid credentials" },
        401
      );
    }

    if (!row.password_hash) {
      return apiJson(
        { success: false, message: "User has no password_hash" },
        500
      );
    }

    const valid = await verify(password, row.password_hash, env);
    if (!valid) {
      return apiJson(
        { success: false, message: "Invalid credentials" },
        401
      );
    }

    const is_owner =
      row.role === "owner" ||
      row["owner-1"] == 1 ||
      row["owner-1"] === true;

    return apiJson({
      success: true,
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        is_owner,
        created_at: row.created_at
      }
    });

  } catch (err) {
    return apiJson(
      {
        success: false,
        message: "Server error",
        detail: String(err)
      },
      500
    );
  }
}
