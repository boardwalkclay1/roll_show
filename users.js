// users.js — PBKDF2 AUTH + CORE USER UTILITIES

const AUTH_URL = "https://rollshow-auth.boardwalkclay1.workers.dev";

/* ============================================================
   CORS HEADERS
============================================================ */
export function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-user-id, x-user-role"
  };
}

/* ============================================================
   JSON RESPONSE WRAPPER
============================================================ */
export function apiJson(body, status = 200) {
  const success = status >= 200 && status < 300;

  return new Response(
    JSON.stringify({
      success,
      status,
      data: success ? body : null,
      error: success ? null : body
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...cors()
      }
    }
  );
}

/* ============================================================
   USER ID EXTRACTION
============================================================ */
export function getUserId(request) {
  return request.headers.get("x-user-id");
}

/* ============================================================
   LOGGING
============================================================ */
function logRequest(request, extra = {}) {
  const url = new URL(request.url);
  console.log(
    JSON.stringify({
      path: url.pathname,
      method: request.method,
      ...extra
    })
  );
}

/* ============================================================
   SAFE JSON FOR AUTH WORKER
============================================================ */
async function safeAuthJson(res) {
  const text = await res.text();
  const ct = res.headers.get("content-type") || "";

  if (!ct.toLowerCase().includes("json")) {
    throw new Error("AUTH worker returned non-JSON: " + ct);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("AUTH worker returned invalid JSON: " + text);
  }
}

/* ============================================================
   PASSWORD HASHING (PBKDF2)
   - returns { hash, salt, iterations }
============================================================ */
export async function hash(password, env) {
  const res = await fetch(`${AUTH_URL}/hash`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });

  const data = await safeAuthJson(res);

  if (!data.hash || !data.salt) {
    throw new Error("AUTH worker missing PBKDF2 fields");
  }

  return {
    hash: data.hash,
    salt: data.salt,
    iterations: Number(data.iterations) || 100000
  };
}

/* ============================================================
   PASSWORD VERIFY (PBKDF2)
   - returns full AUTH worker response object
   - login.js interprets success/ok/verified
============================================================ */
export async function verify(password, hashValue, saltValue, iterations, env) {
  const body = {
    password,
    hash: hashValue,
    salt: saltValue
  };

  if (typeof iterations === "number") {
    body.iterations = iterations;
  }

  const res = await fetch(`${AUTH_URL}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await safeAuthJson(res);

  if (data.success !== true) {
    return data;
  }

  // AUTH worker currently returns { success: true, ok: true, iterations: ... }
  if (typeof data.ok !== "boolean" && typeof data.verified !== "boolean") {
    throw new Error("AUTH worker missing ok/verified field");
  }

  return data;
}

/* ============================================================
   BASE SIGNUP (PBKDF2)
   - used by role-specific signup routes
   - stores password_iterations returned by AUTH worker
============================================================ */
export async function signupBase(request, env, role) {
  const { name, email, password } = await request.json();

  if (!name || !email || !password || !role) {
    return apiJson({ message: "Missing fields" }, 400);
  }

  const exists = await env.DB_roll
    .prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first();

  if (exists) {
    return apiJson({ message: "Email already registered" }, 400);
  }

  const id = crypto.randomUUID();
  const created = new Date().toISOString();

  const {
    hash: password_hash,
    salt: password_salt,
    iterations: password_iterations
  } = await hash(password, env);

  await env.DB_roll
    .prepare(
      `INSERT INTO users (
         id,
         name,
         email,
         password_hash,
         password_salt,
         password_iterations,
         role,
         "owner-1",
         created_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
    )
    .bind(
      id,
      name,
      email,
      password_hash,
      password_salt,
      password_iterations,
      role,
      created
    )
    .run();

  return apiJson({
    id,
    name,
    email,
    role,
    created_at: created
  });
}

/* ============================================================
   ROLE GUARD
============================================================ */
export async function requireRole(request, env, allowedRoles, handler) {
  try {
    logRequest(request);

    const userId = getUserId(request);
    if (!userId) {
      return apiJson({ message: "Unauthorized" }, 401);
    }

    const user = await env.DB_roll
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(userId)
      .first();

    if (!user) {
      return apiJson({ message: "Unauthorized" }, 401);
    }

    const is_owner =
      user.role === "owner" ||
      user["owner-1"] == 1 ||
      user["owner-1"] === true;

    if (is_owner) {
      return handler(request, env, user);
    }

    if (!allowedRoles.includes(user.role)) {
      return apiJson({ message: "Forbidden" }, 403);
    }

    return handler(request, env, user);
  } catch (err) {
    return apiJson(
      { message: "Server error", detail: String(err) },
      500
    );
  }
}
