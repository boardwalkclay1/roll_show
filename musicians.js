// musicians.js — signup + profile + dashboard (user-first then profile, idempotent profile endpoint)
import { apiJson } from "./users.js";
import { signupBase } from "./users.js";

/* ============================================================
   SIGNUP (user-first then optional profile)
   POST /api/musician/signup
   - Accepts JSON body with user fields and optional profile fields:
     { name, email, password, stage_name, genre, bio }
   - Creates users row first via signupBase, then attempts profile insert
   - Returns { success, user, profile_created, profile?, profile_error? }
============================================================ */
export async function signupMusician(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    const signupReqBody = {
      name: body.name || null,
      email: body.email,
      password: body.password,
      role: "musician"
    };

    // Call signupBase as implemented in users.js
    const signupRes = await signupBase(
      new Request(request.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupReqBody)
      }),
      env,
      "musician"
    );

    // signupBase returns a Response (apiJson) — parse it if so
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

    // Profile fields (only accept these)
    const stage_name = body.stage_name ? String(body.stage_name).trim() : null;
    const genre = body.genre ? String(body.genre).trim() : null;
    const bio = body.bio ? String(body.bio).trim() : null;

    // If no profile fields provided, return user created and profile_created:false
    if (!stage_name && !genre && !bio) {
      return apiJson({ success: true, user: base.user, profile_created: false }, 201);
    }

    // If profile fields incomplete, return user created but profile not created
    if (!stage_name || !genre) {
      return apiJson({
        success: true,
        user: base.user,
        profile_created: false,
        profile_error: "Missing required profile fields (stage_name, genre)"
      }, 201);
    }

    // Attempt to insert musician profile
    const profileId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      await env.DB_roll.prepare(
        `INSERT INTO musician_profiles
           (id, user_id, stage_name, genre, bio, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(profileId, userId, stage_name, genre, bio, now)
        .run();

      return apiJson({
        success: true,
        user: base.user,
        profile_created: true,
        profile: { id: profileId, user_id: userId, stage_name, genre, bio, created_at: now }
      }, 201);
    } catch (err) {
      const msg = String(err).toLowerCase();
      // Treat unique/constraint errors as idempotent success if profile exists
      if (msg.includes("unique") || msg.includes("constraint") || /musician_profiles/.test(msg)) {
        const existing = await env.DB_roll.prepare("SELECT * FROM musician_profiles WHERE user_id = ?").bind(userId).first();
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
              genre: existing.genre,
              bio: existing.bio,
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
   POST /api/profiles/musician
   - Called after signup when session/auth is present
   - Derives user_id from authenticated user (requireRole wraps this)
   - Accepts only: stage_name, genre, bio
   - Returns { success, profile_created|profile_exists, profile }
============================================================ */
export async function createMusicianProfile(request, env, user) {
  try {
    const body = await request.json().catch(() => ({}));
    const stage_name = body.stage_name ? String(body.stage_name).trim() : null;
    const genre = body.genre ? String(body.genre).trim() : null;
    const bio = body.bio ? String(body.bio).trim() : null;

    if (!stage_name || !genre) {
      return { success: false, message: "Missing profile fields" };
    }

    // Check existing
    const existing = await env.DB_roll.prepare("SELECT * FROM musician_profiles WHERE user_id = ?").bind(user.id).first();
    if (existing) {
      return {
        success: true,
        profile_exists: true,
        profile: {
          id: existing.id,
          user_id: existing.user_id,
          stage_name: existing.stage_name,
          genre: existing.genre,
          bio: existing.bio,
          created_at: existing.created_at
        }
      };
    }

    const profileId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      await env.DB_roll.prepare(
        `INSERT INTO musician_profiles
           (id, user_id, stage_name, genre, bio, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(profileId, user.id, stage_name, genre, bio, now)
        .run();

      return {
        success: true,
        profile_created: true,
        profile: { id: profileId, user_id: user.id, stage_name, genre, bio, created_at: now }
      };
    } catch (err) {
      const msg = String(err).toLowerCase();
      if (msg.includes("unique") || msg.includes("constraint") || /musician_profiles/.test(msg)) {
        const p = await env.DB_roll.prepare("SELECT * FROM musician_profiles WHERE user_id = ?").bind(user.id).first();
        if (p) {
          return {
            success: true,
            profile_exists: true,
            profile: {
              id: p.id,
              user_id: p.user_id,
              stage_name: p.stage_name,
              genre: p.genre,
              bio: p.bio,
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
   MUSICIAN DASHBOARD (requires musician role)
   Called via requireRole(request, env, ["musician"], musicianDashboard)
   Returns musician profile and list of tracks/offers (simple)
============================================================ */
export async function musicianDashboard(request, env, user) {
  try {
    const profile = await env.DB_roll.prepare("SELECT * FROM musician_profiles WHERE user_id = ?").bind(user.id).first();
    if (!profile) return { success: false, message: "Musician profile not found" };

    const { results: tracks } = await env.DB_roll.prepare("SELECT * FROM tracks WHERE musician_id = ? ORDER BY created_at DESC").bind(profile.id).all();
    const { results: offers } = await env.DB_roll.prepare("SELECT * FROM musician_offers WHERE musician_id = ? ORDER BY created_at DESC").bind(profile.id).all();

    return { success: true, profile, tracks, offers };
  } catch (err) {
    return { success: false, message: "Server error", detail: String(err) };
  }
}
