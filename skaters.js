// skaters.js — signup + profile + dashboard (user-first then profile, idempotent profile endpoint)
import { apiJson } from "./users.js";
import { signupBase } from "./users.js";

/* ============================================================
   Canonical discipline and subclass mapping
   Keys are lowercase and must match client-side option values.
============================================================ */
const allowedDisciplines = ["longboarder", "skate boarder", "roller skater", "inline skater"];

const subclassMap = {
  "longboarder": ["cruiser", "downhill", "dancer"],
  "skate boarder": ["street", "vert"],
  "roller skater": ["rink", "outdoor", "skatepark"],
  "inline skater": ["vert", "street", "rink"]
};

function normalizeString(v) {
  if (!v && v !== "") return null;
  return String(v).trim().toLowerCase();
}

/* ============================================================
   SIGNUP (user-first then optional profile)
   POST /api/skater/signup
   - Accepts JSON body with user fields and optional profile fields:
     { name, email, password, password_verify, stage_name, discipline, subclass }
   - Creates users row first via signupBase, then attempts profile insert
   - Returns { success, user, profile_created, profile?, profile_error? }
============================================================ */
export async function signupSkater(request, env) {
  try {
    const body = await request.json().catch(() => ({}));

    // Password confirmation (server-side authoritative)
    const password = body.password || null;
    const password_verify = body.password_verify || body.passwordConfirm || null;
    if (!password || !password_verify || password !== password_verify) {
      return apiJson({ success: false, message: "Passwords do not match" }, 400);
    }

    const signupReqBody = {
      name: body.name || null,
      email: body.email,
      password: password,
      role: "skater"
    };

    const signupRes = await signupBase(
      new Request(request.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupReqBody)
      }),
      env,
      "skater"
    );

    let base;
    if (signupRes && typeof signupRes.json === "function") {
      base = await signupRes.json().catch(() => null);
    } else {
      base = signupRes;
    }

    if (!base || base.success !== true || !base.user) {
      const msg = (base && (base.message || (base.error && base.error.message))) || "Signup failed";
      return apiJson({ success: false, message: msg }, base && base.status ? base.status : 400);
    }

    const userId = base.user.id;
    const createdAt = base.user.created_at || new Date().toISOString();

    // Profile fields (normalize)
    const stage_name = body.stage_name ? String(body.stage_name).trim() : null;
    const disciplineRaw = body.discipline || null;
    const subclassRaw = body.subclass || null;
    const discipline = normalizeString(disciplineRaw);
    const subclass = subclassRaw ? String(subclassRaw).trim().toLowerCase() : null;

    // If no profile fields provided, return early (user created only)
    if (!stage_name && !discipline && !subclass) {
      return apiJson({ success: true, user: base.user, profile_created: false }, 201);
    }

    // Required profile fields
    if (!stage_name || !discipline) {
      return apiJson({
        success: true,
        user: base.user,
        profile_created: false,
        profile_error: "Missing required profile fields (stage_name, discipline)"
      }, 201);
    }

    // Validate discipline
    if (!allowedDisciplines.includes(discipline)) {
      return apiJson({
        success: true,
        user: base.user,
        profile_created: false,
        profile_error: `Invalid discipline. Allowed: ${allowedDisciplines.join(", ")}`
      }, 201);
    }

    // Validate subclass if provided
    if (subclass) {
      const allowed = subclassMap[discipline] || [];
      if (!allowed.includes(subclass)) {
        return apiJson({
          success: true,
          user: base.user,
          profile_created: false,
          profile_error: `Invalid subclass for discipline ${discipline}. Allowed: ${allowed.join(", ")}`
        }, 201);
      }
    }

    const profileId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      await env.DB_roll.prepare(
        `INSERT INTO skater_profiles
           (id, user_id, stage_name, discipline, subclass, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(profileId, userId, stage_name, discipline, subclass, now)
        .run();

      return apiJson({
        success: true,
        user: base.user,
        profile_created: true,
        profile: { id: profileId, user_id: userId, stage_name, discipline, subclass, created_at: now }
      }, 201);
    } catch (err) {
      const msg = String(err).toLowerCase();
      if (msg.includes("unique") || msg.includes("constraint") || /skater_profiles/.test(msg)) {
        const existing = await env.DB_roll.prepare("SELECT * FROM skater_profiles WHERE user_id = ?").bind(userId).first();
        if (existing) {
          return apiJson({
            success: true,
            user: base.user,
            profile_created: true,
            profile_exists: true,
            profile: {
              id: existing.id,
              user_id: existing.user_id,
              stage_name: existing.stage_name,
              discipline: existing.discipline,
              subclass: existing.subclass,
              created_at: existing.created_at
            }
          }, 201);
        }
      }

      return apiJson({
        success: true,
        user: base.user,
        profile_created: false,
        profile_error: String(err)
      }, 201);
    }
  } catch (err) {
    return apiJson({ success: false, message: "Server error", detail: String(err) }, 500);
  }
}

/* ============================================================
   PROFILE-ONLY endpoint (idempotent)
   POST /api/profiles/skater
   - Derives user_id from authenticated user (requireRole wraps this)
   - Accepts only: stage_name, discipline, subclass
   - Validates discipline/subclass against canonical lists
============================================================ */
export async function createSkaterProfile(request, env, user) {
  try {
    const body = await request.json().catch(() => ({}));
    const stage_name = body.stage_name ? String(body.stage_name).trim() : null;
    const discipline = body.discipline ? normalizeString(body.discipline) : null;
    const subclass = body.subclass ? String(body.subclass).trim().toLowerCase() : null;

    if (!stage_name || !discipline) {
      return { success: false, message: "Missing profile fields" };
    }

    if (!allowedDisciplines.includes(discipline)) {
      return { success: false, message: `Invalid discipline. Allowed: ${allowedDisciplines.join(", ")}` };
    }

    if (subclass) {
      const allowed = subclassMap[discipline] || [];
      if (!allowed.includes(subclass)) {
        return { success: false, message: `Invalid subclass for discipline ${discipline}. Allowed: ${allowed.join(", ")}` };
      }
    }

    const existing = await env.DB_roll.prepare("SELECT * FROM skater_profiles WHERE user_id = ?").bind(user.id).first();
    if (existing) {
      return {
        success: true,
        profile_exists: true,
        profile: {
          id: existing.id,
          user_id: existing.user_id,
          stage_name: existing.stage_name,
          discipline: existing.discipline,
          subclass: existing.subclass,
          created_at: existing.created_at
        }
      };
    }

    const profileId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      await env.DB_roll.prepare(
        `INSERT INTO skater_profiles
           (id, user_id, stage_name, discipline, subclass, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(profileId, user.id, stage_name, discipline, subclass, now)
        .run();

      return {
        success: true,
        profile_created: true,
        profile: { id: profileId, user_id: user.id, stage_name, discipline, subclass, created_at: now }
      };
    } catch (err) {
      const msg = String(err).toLowerCase();
      if (msg.includes("unique") || msg.includes("constraint") || /skater_profiles/.test(msg)) {
        const p = await env.DB_roll.prepare("SELECT * FROM skater_profiles WHERE user_id = ?").bind(user.id).first();
        if (p) {
          return {
            success: true,
            profile_exists: true,
            profile: {
              id: p.id,
              user_id: p.user_id,
              stage_name: p.stage_name,
              discipline: p.discipline,
              subclass: p.subclass,
              created_at: p.created_at
            }
          };
        }
      }
      return { success: false, message: "Profile insert failed", detail: String(err) };
    }
  } catch (err) {
    return { success: false, message: "Server error", detail: String(err) };
  }
}

/* ============================================================
   SKATER DASHBOARD (requires skater role)
   Called via requireRole(request, env, ["skater"], skaterDashboard)
============================================================ */
export async function skaterDashboard(request, env, user) {
  try {
    const profile = await env.DB_roll.prepare("SELECT * FROM skater_profiles WHERE user_id = ?").bind(user.id).first();
    if (!profile) return { success: false, message: "Skater profile not found" };

    const { results: offerings } = await env.DB_roll.prepare("SELECT * FROM skater_offerings WHERE skater_id = ? ORDER BY created_at DESC").bind(profile.id).all();
    const { results: shows } = await env.DB_roll.prepare("SELECT * FROM shows WHERE host_type = 'skater' AND host_id = ? ORDER BY start_time DESC").bind(profile.id).all();

    return { success: true, profile, offerings, shows };
  } catch (err) {
    return { success: false, message: "Server error", detail: String(err) };
  }
}

// Auto-added factory expected by worker.js
export function makeSkatersApi() {
  return {
    signupSkater: typeof signupSkater === "function" ? signupSkater : async () => ({ success: false, message: "signupSkater not implemented" }),
    createSkaterProfile: typeof createSkaterProfile === "function" ? createSkaterProfile : async () => ({ success: false, message: "createSkaterProfile not implemented" }),
    skaterDashboard: typeof skaterDashboard === "function" ? skaterDashboard : async () => ({ success: false, message: "skaterDashboard not implemented" })
  };
}
