import { apiJson } from "./users.js";
import { signupBase } from "./users.js";

/* ============================================================
   MUSICIAN SIGNUP
============================================================ */
export async function signupMusician(request, env) {
  const body = await request.json();
  body.role = "musician";

  const base = await signupBase(env, body);
  if (base.error) return apiJson({ message: base.error }, 400);

  const id = crypto.randomUUID();
  const created_at = base.created_at || new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO musician_profiles (
       id, user_id, name, bio, genre, avatar_url, city, state, created_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    base.id,
    body.name || null,
    body.bio || null,
    body.genre || null,
    body.avatar_url || null,
    body.city || null,
    body.state || null,
    created_at
  ).run();

  return apiJson({ user: base, musician_profile_id: id });
}

/* ============================================================
   MUSICIAN DASHBOARD
============================================================ */
export async function musicianDashboard(request, env, user) {
  const musician = await env.DB_users.prepare(
    "SELECT * FROM musician_profiles WHERE user_id = ?"
  ).bind(user.id).first();

  if (!musician) {
    return apiJson({ message: "Musician profile not found" }, 404);
  }

  const { results: tracks } = await env.DB_users.prepare(
    `SELECT *
     FROM tracks
     WHERE musician_id = ?
     ORDER BY created_at DESC`
  ).bind(musician.id).all();

  const { results: licenses } = await env.DB_users.prepare(
    `SELECT l.*, t.title
     FROM track_licenses l
     JOIN tracks t ON l.track_id = t.id
     WHERE l.musician_id = ?
     ORDER BY l.created_at DESC`
  ).bind(musician.id).all();

  return apiJson({
    musician,
    tracks,
    licenses
  });
}

/* ============================================================
   UPLOAD TRACK (R2 STORAGE)
============================================================ */
export async function uploadTrack(request, env, user) {
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

  if (!r2_key) {
    return apiJson({ message: "Missing R2 key for uploaded file." }, 400);
  }

  const musician = await env.DB_users.prepare(
    "SELECT id FROM musician_profiles WHERE user_id = ?"
  ).bind(user.id).first();

  if (!musician) {
    return apiJson({ message: "Musician profile not found" }, 404);
  }

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
  ).bind(
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
  ).run();

  return apiJson({ trackId: id });
}

/* ============================================================
   PUBLIC MUSIC LIBRARY
============================================================ */
export async function listMusic(env) {
  const { results } = await env.DB_users.prepare(
    `SELECT
       id,
       musician_id,
       title,
       genre,
       artwork_r2_key,
       visibility,
       created_at
     FROM tracks
     WHERE visibility = 'public'
     ORDER BY created_at DESC`
  ).all();

  return apiJson({ tracks: results });
}

/* ============================================================
   LICENSE TRACK (SKATER → MUSICIAN)
============================================================ */
export async function licenseTrack(request, env, user) {
  const { trackId, amount_cents, license_type = "sync", terms_json } =
    await request.json();

  // Resolve skater profile for this user
  const skater = await env.DB_users.prepare(
    "SELECT id FROM skater_profiles WHERE user_id = ?"
  ).bind(user.id).first();

  if (!skater) {
    return apiJson({ message: "Only skaters can license music." }, 403);
  }

  const track = await env.DB_users.prepare(
    "SELECT * FROM tracks WHERE id = ?"
  ).bind(trackId).first();

  if (!track) {
    return apiJson({ message: "Track not found." }, 404);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO track_licenses (
       id,
       track_id,
       musician_id,
       granted_to_role,
       granted_to_profile_id,
       license_type,
       amount_cents,
       terms_json,
       approved_by_owner,
       created_at
     )
     VALUES (?, ?, ?, 'skater', ?, ?, ?, ?, 0, ?)`
  ).bind(
    id,
    trackId,
    track.musician_id,
    skater.id,
    license_type,
    amount_cents || 1000,
    terms_json ? JSON.stringify(terms_json) : null,
    now
  ).run();

  return apiJson({ licenseId: id });
}

/* ============================================================
   CREATE OFFER (MUSICIAN → SKATER)
============================================================ */
export async function musicianCreateOffer(request, env, user) {
  const { skaterUserId, type, terms, amount_cents } = await request.json();

  // Ensure target is a skater by checking skater_profiles
  const skaterProfile = await env.DB_users.prepare(
    "SELECT id FROM skater_profiles WHERE user_id = ?"
  ).bind(skaterUserId).first();

  if (!skaterProfile) {
    return apiJson({ message: "Musicians may only send offers to skaters." }, 403);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO offers (
       id,
       from_user_id,
       to_user_id,
       type,
       amount_cents,
       terms,
       status,
       created_at
     )
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).bind(
    id,
    user.id,
    skaterUserId,
    type,
    amount_cents || 0,
    terms || null,
    now
  ).run();

  return apiJson({ offerId: id });
}

/* ============================================================
   LIST MUSICIAN OFFERS
============================================================ */
export async function listMusicianOffers(request, env, user) {
  const { results } = await env.DB_users.prepare(
    `SELECT
       o.*,
       u.name AS skater_name
     FROM offers o
     JOIN users u ON o.to_user_id = u.id
     WHERE o.from_user_id = ?
     ORDER BY o.created_at DESC`
  ).bind(user.id).all();

  return apiJson({ offers: results });
}
