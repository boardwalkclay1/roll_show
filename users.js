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
export function logRequest(request, extra = {}) {
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
   PASSWORD HASHING (AUTH WORKER)
============================================================ */
export async function hash(password, env) {
  const res = await env.AUTH.fetch("/hash", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });

  const data = await safeAuthJson(res);

  if (!data.hashed) {
    throw new Error("AUTH worker missing 'hashed' field");
  }

  return data.hashed;
}

/* ============================================================
   PASSWORD VERIFY (AUTH WORKER)
============================================================ */
export async function verify(password, hash, env) {
  const res = await env.AUTH.fetch("/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, hash })
  });

  const data = await safeAuthJson(res);

  if (typeof data.ok !== "boolean") {
    throw new Error("AUTH worker missing 'ok' field");
  }

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
    `INSERT INTO users (id, name, email, password_hash, role, is_owner, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`
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
   LOGIN (USES AUTH WORKER VERIFY)
============================================================ */
export async function login(request, env) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return apiJson({ message: "Missing credentials" }, 400);
    }

    const row = await env.DB_users.prepare(
      "SELECT * FROM users WHERE email = ?"
    ).bind(email).first();

    if (!row) {
      return apiJson({ message: "Invalid credentials" }, 401);
    }

    if (!row.password_hash) {
      return apiJson({ message: "User has no password_hash" }, 500);
    }

    const valid = await verify(password, row.password_hash, env);
    if (!valid) {
      return apiJson({ message: "Invalid credentials" }, 401);
    }

    const is_owner =
      row.role === "owner" ||
      row.is_owner == 1 ||
      row.is_owner === true;

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
   ROLE GUARD (OWNER OVERRIDE)
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
      user.is_owner == 1 ||
      user.is_owner === true;

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
