// users.js — AUTH HELPERS, PBKDF2 VERIFY, ROLE GUARD, SIGNUP BASE + signupBusiness
// Updated with OWNER BYPASS + proper CORS for credentialed cross-site requests

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

// PBKDF2 VERIFY — boolean result
export async function verify(password, hashValue, saltValue, iterations, env) {
  try {
    const payload = {
      password,
      hash: hashValue,
      salt: hashValue ? saltValue : saltValue,
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
    if (!data || data.success !== true) return false;
    return data.ok === true;
  } catch {
    return false;
  }
}

// ROLE CHECKER (middleware style) with OWNER BYPASS
export async function requireRole(request, env, roles, handler) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return apiJson({ success: false, message: "Unauthorized" }, 401);
    }

    // OWNER BYPASS — owner can access ANY route
    if (userRole === "owner") {
      const result = await handler(request, env, { id: userId, role: userRole });
      return apiJson(result);
    }

    if (!roles.includes(userRole)) {
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

// BASE SIGNUP (creates users row only)
export async function signupBase(request, env, role) {
  try {
    const body = await request.json();
    const { name, email, password } = body || {};

    if (!email || !password) {
      return apiJson({ success: false, message: "Missing fields" }, 400);
    }

    const normalizedEmail = String(email).trim().toLowerCase();

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

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const insertSql = `
      BEGIN;
      INSERT INTO users (id, name, email, role, password_hash, password_salt, password_iterations, password_algo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pbkdf2', ?);
      COMMIT;
    `;

    try {
      await env.DB_roll.prepare(insertSql)
        .bind(id, name || null, normalizedEmail, role, hash, salt, Number(iterations), createdAt)
        .run();
    } catch (dbErr) {
      const msg = String(dbErr).toLowerCase();
      if (msg.includes("unique") || msg.includes("constraint") || msg.includes("email")) {
        return apiJson({ success: false, message: "Email already in use" }, 409);
      }
      return apiJson({ success: false, message: "Database error", detail: String(dbErr) }, 500);
    }

    return apiJson(
      { success: true, user: { id, name: name || null, email: normalizedEmail, role, created_at: createdAt } },
      201
    );
  } catch (err) {
    return apiJson(
      { success: false, message: "Server error", detail: String(err) },
      500
    );
  }
}

// BUSINESS SIGNUP (user-first, then profile)
export async function signupBusiness(request, env) {
  try {
    const body = await request.json();
    const { name, email, password } = body || {};

    if (!email || !password) {
      return apiJson({ success: false, message: "Missing user fields" }, 400);
    }

    const normalizedEmail = String(email).trim().toLowerCase();

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

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const insertUserSql = `
      BEGIN;
      INSERT INTO users (id, name, email, role, password_hash, password_salt, password_iterations, password_algo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pbkdf2', ?);
      COMMIT;
    `;

    try {
      await env.DB_roll.prepare(insertUserSql)
        .bind(id, name || null, normalizedEmail, "business", hash, salt, Number(iterations), createdAt)
        .run();
    } catch (dbErr) {
      const msg = String(dbErr).toLowerCase();
      if (msg.includes("unique") || msg.includes("constraint") || msg.includes("email")) {
        return apiJson({ success: false, message: "Email already in use" }, 409);
      }
      return apiJson({ success: false, message: "Database error", detail: String(dbErr) }, 500);
    }

    const userObj = {
      id,
      name: name || null,
      email: normalizedEmail,
      role: "business",
      created_at: createdAt
    };

    const company_name = body.company_name ? String(body.company_name).trim() : null;
    const contact_name = body.contact_name ? String(body.contact_name).trim() : null;
    const contact_email = body.contact_email ? String(body.contact_email).trim() : null;
    const country = body.country ? String(body.country).trim() : null;

    if (!company_name && !contact_name && !contact_email && !country) {
      return apiJson({ success: true, user: userObj, profile_created: false }, 201);
    }

    if (!company_name || !contact_name || !contact_email || !country) {
      return apiJson({
        success: true,
        user: userObj,
        profile_created: false,
        profile_error: "Incomplete profile fields"
      }, 201);
    }

    const insertProfileSql = `
      BEGIN;
      INSERT INTO business_profiles (id, user_id, company_name, contact_name, contact_email, country, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?);
      COMMIT;
    `;

    const profileId = crypto.randomUUID();
    const profileCreatedAt = new Date().toISOString();

    try {
      await env.DB_roll.prepare(insertProfileSql)
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
    } catch (profileErr) {
      const msg = String(profileErr).toLowerCase();
      if (msg.includes("unique") || msg.includes("constraint") || /business_profiles/.test(msg)) {
        return apiJson({
          success: true,
          user: userObj,
          profile_created: true,
          profile_exists: true
        }, 201);
      }

      return apiJson({
        success: true,
        user: userObj,
        profile_created: false,
        profile_error: String(profileErr)
      }, 201);
    }
  } catch (err) {
    return apiJson(
      { success: false, message: "Server error", detail: String(err) },
      500
    );
  }
}
