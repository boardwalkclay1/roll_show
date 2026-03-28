import { json, getUserId, hash, verify } from "./utils.js";

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
  const hashed = await hash(password);

  await env.DB_users.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, created_at, is_owner)
     VALUES (?, ?, ?, ?, ?, ?, 0)`
  ).bind(id, name, email, hashed, role, created).run();

  return json({ success: true, id, name, email, role, created_at: created });
}

/* ============================================================
   LOGIN — SAFE OWNER FLAG
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

    const valid = await verify(password, row.password_hash);
    if (!valid) {
      return json({ success: false, error: "Invalid credentials" }, 401);
    }

    // SAFE OWNER CHECK — handles null, undefined, "1", 1, true
    const is_owner =
      row.role === "owner" ||
      row.is_owner == 1 ||
      row.is_owner === true;

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
   ROLE GUARD — OWNER BYPASS
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
      user.is_owner == 1 ||
      user.is_owner === true;

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
