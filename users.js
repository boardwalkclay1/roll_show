// users.js — FULL REBUILD (PBKDF2, BOOLEAN VERIFY, CLEAN API)

export function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-user-id, x-user-role"
  };
}

export function apiJson(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...cors() }
  });
}

const AUTH_URL = "https://rollshow-auth.boardwalkclay1.workers.dev";

// ============================================================
// PBKDF2 VERIFY — FINAL VERSION (boolean)
// ============================================================
export async function verify(password, hashValue, saltValue, iterations, env) {
  try {
    const payload = {
      password,
      hash: hashValue,
      salt: saltValue,
      iterations: Number(iterations) || 100000
    };

    const res = await fetch(`${AUTH_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const contentType = res.headers.get("Content-Type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(`AUTH worker returned non-JSON: ${contentType}`);
    }

    const data = await res.json();
    // Expecting { success: true, ok: true } or similar from auth worker
    if (!data || data.success !== true) return false;
    return data.ok === true;
  } catch (err) {
    // Treat any error as verification failure (do not leak details)
    return false;
  }
}

// ============================================================
// ROLE CHECKER (middleware style)
// ============================================================
export async function requireRole(request, env, roles, handler) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole || !roles.includes(userRole)) {
      return apiJson({ success: false, message: "Unauthorized" }, 401);
    }

    const result = await handler(request, env, {
      id: userId,
      role: userRole
    });

    return apiJson(result);
  } catch (err) {
    return apiJson(
      { success: false, message: "Server error", detail: String(err) },
      500
    );
  }
}

// ============================================================
// BASE SIGNUP (USED BY SKATERS) — transactional, D1-safe
// - Uses external AUTH_URL /hash to get PBKDF2 hash/salt/iterations
// - Inserts into users table in a single transaction
// - Returns minimal success/failure with appropriate status codes
// ============================================================
export async function signupBase(request, env, role) {
  try {
    const body = await request.json();
    const { name, email, password } = body || {};

    if (!name || !email || !password) {
      return apiJson({ success: false, message: "Missing fields" }, 400);
    }

    // Get hash from auth worker
    const hashRes = await fetch(`${AUTH_URL}/hash`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    if (!hashRes.ok) {
      return apiJson({ success: false, message: "Hash service error" }, 502);
    }

    const hashData = await hashRes.json();
    if (!hashData || hashData.success !== true) {
      return apiJson({ success: false, message: "Hash failed" }, 500);
    }

    const { hash, salt, iterations } = hashData;
    if (!hash || !salt || !iterations) {
      return apiJson({ success: false, message: "Invalid hash response" }, 500);
    }

    // Generate id server-side
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // Use a single SQL transaction to insert the user (D1 / SQLite compatible)
    // The SQL below is intentionally simple and idempotent in behavior:
    // - If email uniqueness constraint fails, we catch and return 409.
    const insertSql = `
      BEGIN;
      INSERT INTO users (id, name, email, role, password_hash, password_salt, password_iterations, password_algo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pbkdf2', ?);
      COMMIT;
    `;

    try {
      await env.DB_roll.prepare(insertSql)
        .bind(id, name, email.toLowerCase(), role, hash, salt, Number(iterations), createdAt)
        .run();
    } catch (dbErr) {
      // Handle unique constraint on email
      const msg = String(dbErr).toLowerCase();
      if (msg.includes("unique") || msg.includes("constraint") || msg.includes("email")) {
        return apiJson({ success: false, message: "Email already in use" }, 409);
      }
      // Generic DB error
      return apiJson({ success: false, message: "Database error", detail: String(dbErr) }, 500);
    }

    // Return created user id and minimal public info
    return apiJson({ success: true, user: { id, name, email: email.toLowerCase(), role, created_at: createdAt } }, 201);
  } catch (err) {
    return apiJson(
      { success: false, message: "Server error", detail: String(err) },
      500
    );
  }
}
