// music.js
import { apiJson } from "./users.js";

/* ============================================================
   INTERNAL: GET MUSICIAN PROFILE
============================================================ */
async function getMusician(env, userId) {
  return await env.DB_users.prepare(
    "SELECT * FROM musician_profiles WHERE user_id = ?"
  ).bind(userId).first();
}

/* ============================================================
   UPLOAD TRACK
============================================================ */
export async function uploadTrack(request, env, user) {
  const musician = await getMusician(env, user.id);
  if (!musician) return apiJson({ message: "Musician profile not found" }, 404);

  const {
    title,
    description,
    genre,
    bpm,
    duration_seconds,
    r2_key,
    artwork_r2_key,
    isrc,
    visibility = "public",
    price_cents = 100,
    license_to_rollshow = 0,
    royalty_split_json
  } = await request.json();

  if (!r2_key) return apiJson({ message: "Missing r2_key" }, 400);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO tracks (
       id, musician_id, title, description, genre, bpm, duration_seconds,
       r2_key, artwork_r2_key, isrc, visibility,
       price_cents, license_to_rollshow, royalty_split_json,
       status, created_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
  )
    .bind(
      id,
      musician.id,
      title,
      description || null,
      genre || null,
      bpm || null,
      duration_seconds || null,
      r2_key,
      artwork_r2_key || null,
      isrc || null,
      visibility,
      price_cents,
      license_to_rollshow ? 1 : 0,
      royalty_split_json ? JSON.stringify(royalty_split_json) : null,
      now
    )
    .run();

  return apiJson({ track_id: id });
}

/* ============================================================
   LICENSE TRACK (SKATER | BUSINESS | ROLLSHOW)
============================================================ */
export async function licenseTrack(request, env, user) {
  const { track_id, license_type, amount_cents, terms_json } = await request.json();

  const track = await env.DB_users.prepare(
    "SELECT * FROM tracks WHERE id = ?"
  ).bind(track_id).first();

  if (!track) return apiJson({ message: "Track not found" }, 404);

  // Determine who is licensing the track
  let role = null;
  let profile_id = null;

  // Skater?
  const skater = await env.DB_users.prepare(
    "SELECT id FROM skater_profiles WHERE user_id = ?"
  ).bind(user.id).first();

  if (skater) {
    role = "skater";
    profile_id = skater.id;
  }

  // Business?
  if (!role) {
    const business = await env.DB_users.prepare(
      "SELECT id FROM business_profiles WHERE user_id = ?"
    ).bind(user.id).first();

    if (business) {
      role = "business";
      profile_id = business.id;
    }
  }

  // Owner / Roll Show?
  if (!role && user.role === "owner") {
    role = "rollshow";
    profile_id = "rollshow";
  }

  if (!role) {
    return apiJson({ message: "User cannot license music" }, 403);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO track_licenses (
       id, track_id, musician_id,
       granted_to_role, granted_to_profile_id,
       license_type, amount_cents, terms_json,
       approved_by_owner, created_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
  )
    .bind(
      id,
      track_id,
      track.musician_id,
      role,
      profile_id,
      license_type,
      amount_cents,
      terms_json ? JSON.stringify(terms_json) : null,
      now
    )
    .run();

  return apiJson({ license_id: id, status: "pending" });
}

/* ============================================================
   LIST MUSICIAN TRACKS + LICENSES
============================================================ */
export async function musicianMusicDashboard(request, env, user) {
  const musician = await getMusician(env, user.id);
  if (!musician) return apiJson({ message: "Musician profile not found" }, 404);

  const { results: tracks } = await env.DB_users.prepare(
    "SELECT * FROM tracks WHERE musician_id = ? ORDER BY created_at DESC"
  ).bind(musician.id).all();

  const { results: licenses } = await env.DB_users.prepare(
    `SELECT l.*, t.title
     FROM track_licenses l
     JOIN tracks t ON t.id = l.track_id
     WHERE l.musician_id = ?
     ORDER BY l.created_at DESC`
  ).bind(musician.id).all();

  return apiJson({ musician, tracks, licenses });
}
