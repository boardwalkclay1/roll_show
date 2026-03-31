/* ============================================================
   CORS HEADERS
============================================================ */
export function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, x-user-id, x-buyer-id, x-skater-id, x-business-id, x-musician-id, x-owner-id"
  };
}

/* ============================================================
   LOGGING
============================================================ */
export function logRequest(request, extra = {}) {
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
   UNIFIED JSON RESPONSE WRAPPER
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
      headers: { "Content-Type": "application/json", ...cors() }
    }
  );
}

/* ============================================================
   UNIFIED USER ID EXTRACTION
============================================================ */
export function getUserId(request) {
  return (
    request.headers.get("x-user-id") ||
    request.headers.get("x-buyer-id") ||
    request.headers.get("x-skater-id") ||
    request.headers.get("x-business-id") ||
    request.headers.get("x-musician-id") ||
    request.headers.get("x-owner-id")
  );
}

/* ============================================================
   PASSWORD HASHING (AUTH WORKER)
============================================================ */
export async function hash(str, env) {
  const res = await env.AUTH.fetch("https://auth/hash", {
    method: "POST",
    body: JSON.stringify({ password: str })
  });

  const data = await res.json();
  return data.hashed;
}

/* ============================================================
   PASSWORD VERIFY (AUTH WORKER)
============================================================ */
export async function verify(str, hashed, env) {
  const res = await env.AUTH.fetch("https://auth/verify", {
    method: "POST",
    body: JSON.stringify({ password: str, hash: hashed })
  });

  const data = await res.json();
  return data.ok;
}

/* ============================================================
   BASE SIGNUP (ALL ROLES)
============================================================ */
export async function signupBase(env, { name, email, password, role }) {
  if (!name || !email || !password || !role) {
    return { error: "Missing fields" };
  }

  const exists = await env.DB_users.prepare(
    "SELECT id FROM users WHERE email = ?"
  ).bind(email).first();

  if (exists) {
    return { error: "Email already registered" };
  }

  const id = crypto.randomUUID();
  const created = new Date().toISOString();
  const hashed = await hash(password, env);

  await env.DB_users.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, created_at, "owner-1")
     VALUES (?, ?, ?, ?, ?, ?, 0)`
  ).bind(id, name, email, hashed, role, created).run();

  return {
    id,
    name,
    email,
    role,
    created_at: created
  };
}

/* ============================================================
   LOGIN
============================================================ */
export async function login(request, env) {
  try {
    const { email, password } = await request.json();

    const row = await env.DB_users.prepare(
      "SELECT * FROM users WHERE email = ?"
    ).bind(email).first();

    if (!row) {
      return apiJson({ message: "Invalid credentials" }, 401);
    }

    const valid = await verify(password, row.password_hash, env);
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
   ROLE GUARD (WITH OWNER OVERRIDE)
============================================================ */
export async function requireRole(request, env, allowedRoles, handler) {
  try {
    logRequest(request);

    const userId = getUserId(request);
    if (!userId) {
      return apiJson({ message: "Unauthorized" }, 401);
    }

    const user = await env.DB_users.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(userId).first();

    if (!user) {
      return apiJson({ message: "Unauthorized" }, 401);
    }

    const is_owner =
      user.role === "owner" ||
      user["owner-1"] == 1 ||
      user["owner-1"] === true;

    // OWNER OVERRIDE
    if (is_owner) {
      return handler(request, env, user);
    }

    // NORMAL ROLE CHECK
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
