// users.js — CLEAN, NO ROLE AUTH, FINAL
// -------------------------------------

export function cors() {
  return {
    "Access-Control-Allow-Origin": "https://roll-show.pages.dev",
    "Access-Control-Allow-Credentials": "true",
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

/* ============================================================
   PBKDF2 VERIFY — MATCHES AUTH-WORKER
   ============================================================ */
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

    const data = await res.json().catch(() => null);
    if (!data || data.success !== true) return false;

    return data.ok === true;
  } catch (err) {
    console.error("verify() failed:", err);
    return false;
  }
}

/* ============================================================
   NO ROLE CHECKER — REMOVED COMPLETELY
   ============================================================ */
// requireRole removed as requested

/* ============================================================
   BASE SIGNUP
   ============================================================ */
export async function signupBase(request, env, role) {
  try {
    const body = await request.json();
    const { name, email, password } = body || {};

    if (!email || !password) {
      return apiJson({ success: false, message: "Missing fields" }, 400);
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Hash password via auth-worker
    const hashRes = await fetch(`${AUTH_URL}/hash`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    const hashData = await hashRes.json().catch(() => null);
    if (!hashData || hashData.success !== true) {
      return apiJson({ success: false, message: "Hash failed" }, 500);
    }

    const { hash, salt, iterations } = hashData;

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const sql = `
      BEGIN;
      INSERT INTO users (id, name, email, role, password_hash, password_salt, password_iterations, password_algo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pbkdf2', ?);
      COMMIT;
    `;

    try {
      await env.DB_roll.prepare(sql)
        .bind(id, name || null, normalizedEmail, role, hash, salt, iterations, createdAt)
        .run();
    } catch (err) {
      const msg = String(err).toLowerCase();
      if (msg.includes("unique") || msg.includes("constraint") || msg.includes("email")) {
        return apiJson({ success: false, message: "Email already in use" }, 409);
      }
      return apiJson({ success: false, message: "Database error", detail: String(err) }, 500);
    }

    return apiJson(
      { success: true, user: { id, name: name || null, email: normalizedEmail, role, created_at: createdAt } },
      201
    );

  } catch (err) {
    return apiJson({ success: false, message: "Server error", detail: String(err) }, 500);
  }
}

/* ============================================================
   BUSINESS SIGNUP
   ============================================================ */
export async function signupBusiness(request, env) {
  try {
    const body = await request.json();
    const { name, email, password } = body || {};

    if (!email || !password) {
      return apiJson({ success: false, message: "Missing user fields" }, 400);
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Hash password
    const hashRes = await fetch(`${AUTH_URL}/hash`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    const hashData = await hashRes.json().catch(() => null);
    if (!hashData || hashData.success !== true) {
      return apiJson({ success: false, message: "Hash failed" }, 500);
    }

    const { hash, salt, iterations } = hashData;

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const sqlUser = `
      BEGIN;
      INSERT INTO users (id, name, email, role, password_hash, password_salt, password_iterations, password_algo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pbkdf2', ?);
      COMMIT;
    `;

    try {
      await env.DB_roll.prepare(sqlUser)
        .bind(id, name || null, normalizedEmail, "business", hash, salt, iterations, createdAt)
        .run();
    } catch (err) {
      const msg = String(err).toLowerCase();
      if (msg.includes("unique") || msg.includes("constraint") || msg.includes("email")) {
        return apiJson({ success: false, message: "Email already in use" }, 409);
      }
      return apiJson({ success: false, message: "Database error", detail: String(err) }, 500);
    }

    const userObj = {
      id,
      name: name || null,
      email: normalizedEmail,
      role: "business",
      created_at: createdAt
    };

    // Optional profile fields
    const company_name = body.company_name?.trim() || null;
    const contact_name = body.contact_name?.trim() || null;
    const contact_email = body.contact_email?.trim() || null;
    const country = body.country?.trim() || null;

    if (!company_name || !contact_name || !contact_email || !country) {
      return apiJson({ success: true, user: userObj, profile_created: false }, 201);
    }

    const profileId = crypto.randomUUID();
    const profileCreatedAt = new Date().toISOString();

    const sqlProfile = `
      BEGIN;
      INSERT INTO business_profiles (id, user_id, company_name, contact_name, contact_email, country, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?);
      COMMIT;
    `;

    try {
      await env.DB_roll.prepare(sqlProfile)
        .bind(profileId, id, company_name, contact_name, contact_email, country, profileCreatedAt)
        .run();

      return apiJson({
        success: true,
        user: userObj,
        profile_created: true,
        profile: {
          id: profileId,
          user_id: id,
          company_name,
          contact_name,
          contact_email,
          country,
          created_at: profileCreatedAt
        }
      }, 201);

    } catch (err) {
      return apiJson({
        success: true,
        user: userObj,
        profile_created: false,
        profile_error: String(err)
      }, 201);
    }

  } catch (err) {
    return apiJson({ success: false, message: "Server error", detail: String(err) }, 500);
  }
}
