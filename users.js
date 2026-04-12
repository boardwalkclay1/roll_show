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
    headers: { "Content-Type": "application/json" }
  });
}

// ============================================================
// PBKDF2 VERIFY — FINAL VERSION
// ============================================================

const AUTH_URL = "https://rollshow-auth.boardwalkclay1.workers.dev";

export async function verify(password, hashValue, saltValue, iterations, env) {
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

  if (!data || data.success !== true) {
    return false;
  }

  return data.ok === true;
}

// ============================================================
// ROLE CHECKER
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
// BASE SIGNUP (USED BY SKATERS)
// ============================================================

export async function signupBase(request, env, role) {
  try {
    const body = await request.json();

    const { name, email, password } = body;

    if (!name || !email || !password) {
      return apiJson({ success: false, message: "Missing fields" }, 400);
    }

    const hashRes = await fetch(`${AUTH_URL}/hash`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    const data = await hashRes.json();

    if (!data.success) {
      return apiJson({ success: false, message: "Hash failed" }, 500);
    }

    const { hash, salt, iterations } = data;

    await env.DB_roll
      .prepare(
        `INSERT INTO users (name, email, role, password_hash, password_salt, password_iterations)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(name, email, role, hash, salt, iterations)
      .run();

    return apiJson({ success: true });
  } catch (err) {
    return apiJson(
      { success: false, message: "Server error", detail: String(err) },
      500
    );
  }
}
