// skaters.js — profile + dashboard only (signup removed)
import { apiJson } from "./users.js";

/* canonical lists */
const allowedDisciplines = ["longboarder", "skate boarder", "roller skater", "inline skater"];
const subclassMap = {
  "longboarder": ["cruiser", "downhill", "dancer"],
  "skate boarder": ["street", "vert"],
  "roller skater": ["rink", "outdoor", "skatepark"],
  "inline skater": ["vert", "street", "rink"]
};

function normalizeString(v) {
  if (v === undefined || v === null) return null;
  return String(v).trim().toLowerCase();
}

/* ============================================================
   PROFILE-ONLY endpoint (idempotent)
   POST /api/profiles/skater
   - Derives user_id from authenticated user (requireRole wraps this)
   - Accepts: stage_name, discipline, subclass
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
   ============================================================ */
export async function skaterDashboard(request, env, user) {
  try {
    const profile = await env.DB_roll.prepare("SELECT * FROM skater_profiles WHERE user_id = ?").bind(user.id).first();
    if (!profile) return { success: false, message: "Skater profile not found" };

    const offeringsRes = await env.DB_roll.prepare("SELECT * FROM skater_offerings WHERE skater_id = ? ORDER BY created_at DESC").bind(profile.id).all();
    const showsRes = await env.DB_roll.prepare("SELECT * FROM shows WHERE host_type = 'skater' AND host_id = ? ORDER BY start_time DESC").bind(profile.id).all();

    const offerings = offeringsRes?.results || [];
    const shows = showsRes?.results || [];

    return { success: true, profile, offerings, shows };
  } catch (err) {
    return { success: false, message: "Server error", detail: String(err) };
  }
}

/* factory expected by worker.js (no signup exported) */
export function makeSkatersApi() {
  return {
    createSkaterProfile: typeof createSkaterProfile === "function" ? createSkaterProfile : async () => ({ success: false, message: "createSkaterProfile not implemented" }),
    skaterDashboard: typeof skaterDashboard === "function" ? skaterDashboard : async () => ({ success: false, message: "skaterDashboard not implemented" })
  };
}
