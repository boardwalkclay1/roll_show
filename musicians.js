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

  await env.DB_musicians.prepare(
    `INSERT INTO musicians (id, user_id, bio, created_at)
     VALUES (?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    base.id,
    body.bio || null,
    base.created_at
  ).run();

  return apiJson({ user: base });
}

/* ============================================================
   MUSICIAN DASHBOARD
============================================================ */
export async function musicianDashboard(request, env, user) {
  const musician = await env.DB_musicians.prepare(
    "SELECT * FROM musicians WHERE user_id = ?"
  ).bind(user.id).first();

  if (!musician) return apiJson({ message: "Musician profile not found" }, 404);

  const { results: tracks } = await env.DB_musicians.prepare(
    "SELECT * FROM tracks WHERE artist_id = ? ORDER BY created_at DESC"
  ).bind(musician.id).all();

  const { results: licenses } = await env.DB_musicians.prepare(
    `SELECT l.*, t.title
     FROM track_licenses l
     JOIN tracks t ON l.track_id = t.id
     WHERE t.artist_id = ?
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
  const { title, r2_key, artwork_r2_key } = await request.json();

  if (!r2_key) {
    return apiJson({ message: "Missing R2 key for uploaded file." }, 400);
  }

  const musician = await env.DB_musicians.prepare(
    "SELECT id FROM musicians WHERE user_id = ?"
  ).bind(user.id).first();

  if (!musician) return apiJson({ message: "Musician not found" }, 404);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_musicians.prepare(
    `INSERT INTO tracks (id, artist_id, title, r2_key, artwork_r2_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, musician.id, title, r2_key, artwork_r2_key || null, now).run();

  return apiJson({ trackId: id });
}

/* ============================================================
   PUBLIC MUSIC LIBRARY
============================================================ */
export async function listMusic(env) {
  const { results } = await env.DB_musicians.prepare(
    `SELECT id, artist_id, title, artwork_r2_key, created_at
     FROM tracks
     ORDER BY created_at DESC`
  ).all();

  return apiJson({ tracks: results });
}

/* ============================================================
   LICENSE TRACK (SKATER → MUSICIAN)
============================================================ */
export async function licenseTrack(request, env, user) {
  const { trackId, amount_cents } = await request.json();

  const skater = await env.DB_skaters.prepare(
    "SELECT id FROM skaters WHERE user_id = ?"
  ).bind(user.id).first();

  if (!skater) {
    return apiJson({ message: "Only skaters can license music." }, 403);
  }

  const track = await env.DB_musicians.prepare(
    "SELECT * FROM tracks WHERE id = ?"
  ).bind(trackId).first();

  if (!track) {
    return apiJson({ message: "Track not found." }, 404);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_musicians.prepare(
    `INSERT INTO track_licenses (id, track_id, skater_id, amount_cents, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(id, trackId, skater.id, amount_cents || 1000, now).run();

  return apiJson({ licenseId: id });
}

/* ============================================================
   CREATE OFFER (MUSICIAN → SKATER)
============================================================ */
export async function musicianCreateOffer(request, env, user) {
  const { skaterId, type, terms, amount_cents } = await request.json();

  const target = await env.DB_users.prepare(
    "SELECT role FROM users WHERE id = ?"
  ).bind(skaterId).first();

  if (!target || target.role !== "skater") {
    return apiJson({ message: "Musicians may only send offers to skaters." }, 403);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_business.prepare(
    `INSERT INTO offers (id, from_user_id, to_user_id, type, amount_cents, terms, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).bind(id, user.id, skaterId, type, amount_cents, terms, now).run();

  return apiJson({ offerId: id });
}

/* ============================================================
   LIST MUSICIAN OFFERS
============================================================ */
export async function listMusicianOffers(request, env, user) {
  const { results } = await env.DB_business.prepare(
    `SELECT o.*, u.name AS skater_name
     FROM offers o
     JOIN users u ON o.to_user_id = u.id
     WHERE o.from_user_id = ?
       AND u.role = 'skater'
     ORDER BY o.created_at DESC`
  ).bind(user.id).all();

  return apiJson({ offers: results });
}
