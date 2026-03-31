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
   JSON RESPONSE WRAPPER
============================================================ */
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors() }
  });
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
    return json({ error: "Missing fields" }, 400);
  }

  const exists = await env.DB_users.prepare(
    "SELECT id FROM users WHERE email = ?"
  ).bind(email).first();

  if (exists) {
    return json({ error: "Email already registered" }, 400);
  }

  const id = crypto.randomUUID();
  const created = new Date().toISOString();

  // FIXED: pass env
  const hashed = await hash(password, env);

  await env.DB_users.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, created_at, "owner-1")
     VALUES (?, ?, ?, ?, ?, ?, 0)`
  ).bind(id, name, email, hashed, role, created).run();

  return json({ success: true, id, name, email, role, created_at: created });
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
      return json({ success: false, error: "Invalid credentials" }, 401);
    }

    // FIXED: pass env
    const valid = await verify(password, row.password_hash, env);

    if (!valid) {
      return json({ success: false, error: "Invalid credentials" }, 401);
    }

    const is_owner =
      row.role === "owner" ||
      row["owner-1"] == 1 ||
      row["owner-1"] === true;

    return json({
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
    return json({ success: false, error: "Server error", detail: String(err) }, 500);
  }
}

/* ============================================================
   ROLE GUARD
============================================================ */
export async function requireRole(request, env, allowedRoles, handler) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return json({ error: "Unauthorized" }, 401);
    }

    const user = await env.DB_users.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(userId).first();

    if (!user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const is_owner =
      user.role === "owner" ||
      user["owner-1"] == 1 ||
      user["owner-1"] === true;

    if (is_owner) {
      return handler(request, env, user);
    }

    if (!allowedRoles.includes(user.role)) {
      return json({ error: "Forbidden" }, 403);
    }

    return handler(request, env, user);

  } catch (err) {
    return json({ error: "Server error", detail: String(err) }, 500);
  }
}
