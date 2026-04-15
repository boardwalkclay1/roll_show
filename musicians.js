// musicians.js — profile + dashboard only (signup removed)
// - Auth/signup is handled by the separate auth-worker
// - This module exposes musician profile creation and other musician APIs expected by worker.js

import { apiJson } from "./users.js";

/* ============================================================
   PROFILE-ONLY endpoint (idempotent)
   POST /api/profiles/musician
   - Derives user_id from authenticated user (requireRole wraps this)
   - Accepts: stage_name, genre
   ============================================================ */
export async function createMusicianProfile(request, env, user) {
  try {
    const body = await request.json().catch(() => ({}));
    const stage_name = body.stage_name ? String(body.stage_name).trim() : null;
    const genre = body.genre ? String(body.genre).trim() : null;

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
          created_at: existing.created_at
        }
      };
    }

    const profileId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      await env.DB_roll.prepare(
        `INSERT INTO musician_profiles
           (id, user_id, stage_name, genre, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(profileId, user.id, stage_name, genre, now)
        .run();

      return {
        success: true,
        profile_created: true,
        profile: { id: profileId, user_id: user.id, stage_name, genre, created_at: now }
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
   - Returns musician profile and list of tracks/offers (simple)
   ============================================================ */
export async function musicianDashboard(request, env, user) {
  try {
    const profile = await env.DB_roll.prepare("SELECT * FROM musician_profiles WHERE user_id = ?").bind(user.id).first();
    if (!profile) return { success: false, message: "Musician profile not found" };

    const tracksRes = await env.DB_roll.prepare("SELECT * FROM tracks WHERE musician_id = ? ORDER BY created_at DESC").bind(profile.id).all();
    const offersRes = await env.DB_roll.prepare("SELECT * FROM musician_offers WHERE musician_id = ? ORDER BY created_at DESC").bind(profile.id).all();

    const tracks = tracksRes?.results || [];
    const offers = offersRes?.results || [];

    return { success: true, profile, tracks, offers };
  } catch (err) {
    return { success: false, message: "Server error", detail: String(err) };
  }
}

/* ============================================================
   Minimal stubs for worker imports (implementations can be added later)
   - uploadTrack, listMusic, licenseTrack, musicianCreateOffer, listMusicianOffers
   ============================================================ */
export async function uploadTrack(request, env, user) {
  return { success: false, message: "uploadTrack not implemented" };
}

export async function listMusic(request, env, user) {
  return { success: false, message: "listMusic not implemented" };
}

export async function licenseTrack(request, env, user) {
  return { success: false, message: "licenseTrack not implemented" };
}

export async function musicianCreateOffer(request, env, user) {
  return { success: false, message: "musicianCreateOffer not implemented" };
}

export async function listMusicianOffers(request, env, user) {
  return { success: false, message: "listMusicianOffers not implemented" };
}

/* ============================================================
   Factory expected by worker.js
   - No signupMusician exported here; signup is handled by auth-worker
   ============================================================ */
export function makeMusiciansApi() {
  return {
    createMusicianProfile: typeof createMusicianProfile === "function" ? createMusicianProfile : async () => ({ success: false, message: "createMusicianProfile not implemented" }),
    musicianDashboard: typeof musicianDashboard === "function" ? musicianDashboard : async () => ({ success: false, message: "musicianDashboard not implemented" }),
    uploadTrack: typeof uploadTrack === "function" ? uploadTrack : async () => ({ success: false, message: "uploadTrack not implemented" }),
    listMusic: typeof listMusic === "function" ? listMusic : async () => ({ success: false, message: "listMusic not implemented" }),
    licenseTrack: typeof licenseTrack === "function" ? licenseTrack : async () => ({ success: false, message: "licenseTrack not implemented" }),
    musicianCreateOffer: typeof musicianCreateOffer === "function" ? musicianCreateOffer : async () => ({ success: false, message: "musicianCreateOffer not implemented" }),
    listMusicianOffers: typeof listMusicianOffers === "function" ? listMusicianOffers : async () => ({ success: false, message: "listMusicianOffers not implemented" })
  };
}
