// events.js
import { apiJson } from "./users.js";

/* ============================================================
   CREATE EVENT
============================================================ */
export async function createEvent(request, env, user) {
  const {
    title,
    description,
    location,
    latitude,
    longitude,
    start_time,
    end_time,
    category,
    image_url
  } = await request.json();

  if (!title) return apiJson({ message: "Missing title" }, 400);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO events (
       id, creator_id, title, description,
       location, latitude, longitude,
       start_time, end_time,
       category, image_url,
       created_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      user.id,
      title,
      description || null,
      location || null,
      latitude || null,
      longitude || null,
      start_time || null,
      end_time || null,
      category || null,
      image_url || null,
      now
    )
    .run();

  return apiJson({ event_id: id });
}

/* ============================================================
   LIST EVENTS (BASIC FEED)
============================================================ */
export async function listEvents(request, env) {
  const { results } = await env.DB_users.prepare(
    `SELECT *
     FROM events
     ORDER BY start_time IS NULL, start_time ASC, created_at DESC`
  ).all();

  return apiJson({ events: results });
}

/* ============================================================
   CREATE QR FOR EVENT CHECK-IN
============================================================ */
export async function createEventQr(request, env, user) {
  const { event_id } = await request.json();
  if (!event_id) return apiJson({ message: "Missing event_id" }, 400);

  const event = await env.DB_users.prepare(
    "SELECT * FROM events WHERE id = ?"
  )
    .bind(event_id)
    .first();

  if (!event) return apiJson({ message: "Event not found" }, 404);
  if (event.creator_id !== user.id) {
    return apiJson({ message: "Not event creator" }, 403);
  }

  const qrId = crypto.randomUUID();
  const now = new Date().toISOString();

  // qr_codes: generic QR record
  await env.DB_users.prepare(
    `INSERT INTO qr_codes (
       id, owner_id, type, target_id, tracking_mode, expiration_at, created_at
     )
     VALUES (?, ?, 'event_checkin', ?, 'basic', NULL, ?)`
  )
    .bind(qrId, user.id, event_id, now)
    .run();

  // qr_links: pretty URL + image
  const qrLinkId = crypto.randomUUID();
  const qrImageUrl = `/qr/event/${qrId}`;

  await env.DB_users.prepare(
    `INSERT INTO qr_links (
       id, user_id, target_type, target_id, qr_image_url, created_at
     )
     VALUES (?, ?, 'event', ?, ?, ?)`
  )
    .bind(qrLinkId, user.id, event_id, qrImageUrl, now)
    .run();

  return apiJson({
    qr_id: qrId,
    qr_link_id: qrLinkId,
    qr_image_url: qrImageUrl
  });
}

/* ============================================================
   RECORD QR SCAN (EVENT CHECK-IN PAGE HIT)
============================================================ */
export async function recordQrScan(request, env) {
  const { qr_id, user_id, user_agent, ip_address } = await request.json();
  if (!qr_id) return apiJson({ message: "Missing qr_id" }, 400);

  const id = crypto.randomUUID();

  await env.DB_users.prepare(
    `INSERT INTO qr_scans (
       id, qr_id, scanned_by, user_agent, ip_address
     )
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(id, qr_id, user_id || null, user_agent || null, ip_address || null)
    .run();

  return apiJson({ ok: true });
}
