import { json } from "./utils.js";
import { signupBase } from "./users.js";

export async function signupMusician(request, env) {
  const body = await request.json();
  body.role = "musician";

  const base = await signupBase(env, body);
  if (base.error) return json({ success: false, error: base.error }, 400);

  await env.DB_musicians.prepare(
    `INSERT INTO musicians (id, user_id, bio, created_at)
     VALUES (?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    base.id,
    body.bio || null,
    base.created_at
  ).run();

  return json({ success: true, user: base });
}

export async function musicianDashboard(request, env, user) {
  const musician = await env.DB_musicians.prepare(
    "SELECT * FROM musicians WHERE user_id = ?"
  ).bind(user.id).first();

  const tracks = await env.DB_musicians.prepare(
    "SELECT * FROM tracks WHERE artist_id = ? ORDER BY created_at DESC"
  ).bind(musician.id).all();

  const licenses = await env.DB_musicians.prepare(
    `SELECT l.*, t.title
     FROM track_licenses l
     JOIN tracks t ON l.track_id = t.id
     WHERE t.artist_id = ?
     ORDER BY l.created_at DESC`
  ).bind(musician.id).all();

  return json({
    musician,
    tracks: tracks.results,
    licenses: licenses.results
  });
}

export async function uploadTrack(request, env, user) {
  const { title, url } = await request.json();

  const musician = await env.DB_musicians.prepare(
    "SELECT id FROM musicians WHERE user_id = ?"
  ).bind(user.id).first();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_musicians.prepare(
    `INSERT INTO tracks (id, artist_id, title, url, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(id, musician.id, title, url, now).run();

  return json({ success: true, trackId: id });
}

export async function listMusic(env) {
  const { results } = await env.DB_musicians.prepare(
    "SELECT * FROM tracks ORDER BY created_at DESC"
  ).all();

  return json(results);
}

export async function licenseTrack(request, env, user) {
  const { trackId, amount_cents } = await request.json();

  const skater = await env.DB_skaters.prepare(
    "SELECT id FROM skaters WHERE user_id = ?"
  ).bind(user.id).first();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_musicians.prepare(
    `INSERT INTO track_licenses (id, track_id, skater_id, amount_cents, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(id, trackId, skater.id, amount_cents || 1000, now).run();

  return json({ success: true, licenseId: id });
}
