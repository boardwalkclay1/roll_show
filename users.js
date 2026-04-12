// users.js — PBKDF2 AUTH WORKER VERSION (UPDATED)
// - verify now accepts iterations and forwards them to the AUTH worker
// - hash returns iterations and signup stores password_iterations in DB

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
   LOGGING
============================================================ */
function logRequest(request, extra = {}) {
  const url = new URL(request.url);
  console.log(JSON.stringify({
    path: url.pathname,
    method: request.method,
    ...extra
  }));
}

/* ============================================================
   JSON RESPONSE WRAPPER
============================================================ */
export function apiJson(body, status = 200) {
  const success = status >= 200 && status < 300;

  return new Response(JSON.stringify({
    success,
    status,
    data: success ? body : null,
    error: success ? null : body
  }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...cors()
    }
  });
}

/* ============================================================
   USER ID EXTRACTION
============================================================ */
export function getUserId(request) {
  return request.headers.get("x-user-id");
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
   - forwards iterations to AUTH worker when available
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

  if (typeof data.ok !== "boolean") {
    throw new Error("AUTH worker missing 'ok' field");
  }

  return data.ok;
}

/* ============================================================
   BASE SIGNUP (PBKDF2)
   - stores password_iterations returned by AUTH worker
============================================================ */
export async function signupBase(env, { name, email, password, role }) {
  if (!name || !email || !password || !role) {
    return { error: "Missing fields" };
  }

  const exists = await env.DB_roll.prepare(
    "SELECT id FROM users WHERE email = ?"
  ).bind(email).first();

  if (exists) {
    return { error: "Email already registered" };
  }

  const id = crypto.randomUUID();
  const created = new Date().toISOString();

  // PBKDF2 HASH (now returns iterations)
  const { hash: password_hash, salt: password_salt, iterations: password_iterations } = await hash(password, env);

  await env.DB_roll.prepare(
    `INSERT INTO users (id, name, email, password_hash, password_salt, password_iterations, role, "owner-1", created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
  ).bind(id, name, email, password_hash, password_salt, password_iterations, role, created).run();

  return {
    id,
    name,
    email,
    role,
    created_at: created
  };
}

/* ============================================================
   LOGIN (PBKDF2)
   - passes stored password_iterations to verify()
============================================================ */
export async function login(request, env) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return apiJson({ message: "Missing credentials" }, 400);
    }

    const row = await env.DB_roll.prepare(
      "SELECT * FROM users WHERE email = ?"
    ).bind(email).first();

    if (!row) {
      return apiJson({ message: "Invalid credentials" }, 401);
    }

    if (!row.password_hash || !row.password_salt) {
      return apiJson({ message: "User missing PBKDF2 fields" }, 500);
    }

    // determine iterations from DB (fallback to 100000 if missing/invalid)
    const iterations = Number(row.password_iterations) || 100000;

    const valid = await verify(
      password,
      row.password_hash,
      row.password_salt,
      iterations,
      env
    );

    if (!valid) {
      return apiJson({ message: "Invalid credentials" }, 401);
    }

    const is_owner =
      row.role === "owner" ||
      row["owner-1"] == 1 ||
      row["owner-1"] === true;

    return apiJson({
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
      { message: "Server error", detail: String(err) },
      500
    );
  }
}

/* ============================================================
   ROLE GUARD (UNCHANGED)
============================================================ */
export async function requireRole(request, env, allowedRoles, handler) {
  try {
    logRequest(request);

    const userId = getUserId(request);
    if (!userId) {
      return apiJson({ message: "Unauthorized" }, 401);
    }

    const user = await env.DB_roll.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(userId).first();

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
