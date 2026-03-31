import { json } from "./users.js";
import { signupBase } from "./users.js";

/* ============================================================
   SKATER SIGNUP
============================================================ */
export async function signupSkater(request, env) {
  const body = await request.json();
  body.role = "skater";

  const base = await signupBase(env, body);
  if (base.error) return json({ success: false, error: base.error }, 400);

  await env.DB_skaters.prepare(
    `INSERT INTO skaters (id, user_id, bio, discipline, profile_image, clip_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    base.id,
    body.bio || null,
    body.discipline || null,
    body.profile_image || null,
    body.clip_url || null,
    base.created_at
  ).run();

  return json({ success: true, user: base });
}

/* ============================================================
   PUBLIC SHOW FEED
============================================================ */
export async function listShows(env) {
  const { results } = await env.DB_skaters.prepare(
    `SELECT s.*, sk.discipline, sk.bio
     FROM shows s
     JOIN skaters sk ON s.skater_id = sk.id
     ORDER BY s.created_at DESC`
  ).all();

  return json(results);
}

/* ============================================================
   GET SINGLE SHOW
============================================================ */
export async function getShow(env, id) {
  const row = await env.DB_skaters.prepare(
    `SELECT s.*, sk.discipline, sk.bio
     FROM shows s
     JOIN skaters sk ON s.skater_id = sk.id
     WHERE s.id = ?`
  ).bind(id).first();

  if (!row) return json({ error: "Show not found" }, 404);

  return json(row);
}

/* ============================================================
   SKATER DASHBOARD
============================================================ */
export async function skaterDashboard(request, env, user) {
  const skater = await env.DB_skaters.prepare(
    "SELECT * FROM skaters WHERE user_id = ?"
  ).bind(user.id).first();

  const { results: shows } = await env.DB_skaters.prepare(
    "SELECT * FROM shows WHERE skater_id = ? ORDER BY created_at DESC"
  ).bind(skater.id).all();

  const { results: lessons } = await env.DB_skaters.prepare(
    "SELECT * FROM lessons WHERE skater_id = ? ORDER BY created_at DESC"
  ).bind(skater.id).all();

  const { results: lessonRequests } = await env.DB_skaters.prepare(
    `SELECT lr.*, l.title AS lesson_title, u.name AS buyer_name
     FROM lesson_requests lr
     JOIN lessons l ON lr.lesson_id = l.id
     JOIN users u ON lr.buyer_id = u.id
     WHERE l.skater_id = ?
     ORDER BY lr.created_at DESC`
  ).bind(skater.id).all();

  const { results: offers } = await env.DB_business.prepare(
    `SELECT o.*, u.name AS sender_name
     FROM offers o
     JOIN users u ON o.from_user_id = u.id
     WHERE o.to_user_id = ?
        OR o.from_user_id = ?
     ORDER BY o.created_at DESC`
  ).bind(user.id, user.id).all();

  const { results: contracts } = await env.DB_business.prepare(
    `SELECT c.*, o.type, o.terms
     FROM contracts c
     JOIN offers o ON c.offer_id = o.id
     WHERE o.to_user_id = ? OR o.from_user_id = ?
     ORDER BY c.created_at DESC`
  ).bind(user.id, user.id).all();

  const { results: participants } = await env.DB_business.prepare(
    `SELECT cp.*, u.name
     FROM contract_participants cp
     JOIN users u ON cp.user_id = u.id
     WHERE cp.user_id = ?`
  ).bind(user.id).all();

  const { results: licenses } = await env.DB_musicians.prepare(
    `SELECT l.*, t.title
     FROM track_licenses l
     JOIN tracks t ON l.track_id = t.id
     WHERE l.skater_id = ?
     ORDER BY l.created_at DESC`
  ).bind(skater.id).all();

  return json({
    skater,
    shows,
    lessons,
    lessonRequests,
    offers,
    contracts,
    participants,
    licenses
  });
}

/* ============================================================
   LIST SKATER'S OWN SHOWS
============================================================ */
export async function listSkaterShows(request, env, user) {
  const skater = await env.DB_skaters.prepare(
    "SELECT id FROM skaters WHERE user_id = ?"
  ).bind(user.id).first();

  const { results } = await env.DB_skaters.prepare(
    "SELECT * FROM shows WHERE skater_id = ? ORDER BY created_at DESC"
  ).bind(skater.id).all();

  return json(results);
}

/* ============================================================
   CREATE SHOW
============================================================ */
export async function createShow(request, env, user) {
  const { title, description, premiere_date, price_cents, thumbnail, video_url } =
    await request.json();

  if (!title) return json({ error: "Missing title" }, 400);

  const skater = await env.DB_skaters.prepare(
    "SELECT id FROM skaters WHERE user_id = ?"
  ).bind(user.id).first();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_skaters.prepare(
    `INSERT INTO shows (id, skater_id, title, description, price_cents, thumbnail, video_url, premiere_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, skater.id, title, description, price_cents, thumbnail, video_url, premiere_date, now).run();

  return json({ success: true, showId: id });
}

/* ============================================================
   UPDATE SKATER PROFILE
============================================================ */
export async function updateSkaterProfile(request, env, user) {
  const { discipline, bio, profile_image, clip_url } = await request.json();

  const skater = await env.DB_skaters.prepare(
    "SELECT id FROM skaters WHERE user_id = ?"
  ).bind(user.id).first();

  await env.DB_skaters.prepare(
    `UPDATE skaters SET discipline = ?, bio = ?, profile_image = ?, clip_url = ?
     WHERE id = ?`
  ).bind(discipline, bio, profile_image, clip_url, skater.id).run();

  return json({ success: true });
}

/* ============================================================
   CREATE LESSON
============================================================ */
export async function createLesson(request, env, user) {
  const { title, description, price_cents } = await request.json();

  const skater = await env.DB_skaters.prepare(
    "SELECT id FROM skaters WHERE user_id = ?"
  ).bind(user.id).first();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_skaters.prepare(
    `INSERT INTO lessons (id, skater_id, title, description, price_cents, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, skater.id, title, description, price_cents, now).run();

  return json({ success: true, lessonId: id });
}

/* ============================================================
   RESPOND TO LESSON REQUEST
============================================================ */
export async function respondLessonRequest(request, env, user) {
  const { requestId, status } = await request.json();

  const valid = ["accepted", "declined", "completed"];
  if (!valid.includes(status)) {
    return json({ error: "Invalid status" }, 400);
  }

  const row = await env.DB_skaters.prepare(
    `SELECT lr.id
     FROM lesson_requests lr
     JOIN lessons l ON lr.lesson_id = l.id
     JOIN skaters s ON l.skater_id = s.id
     WHERE lr.id = ? AND s.user_id = ?`
  ).bind(requestId, user.id).first();

  if (!row) {
    return json({ error: "Unauthorized or request not found" }, 403);
  }

  await env.DB_skaters.prepare(
    "UPDATE lesson_requests SET status = ? WHERE id = ?"
  ).bind(status, requestId).run();

  return json({ success: true });
}
import { json } from "./users.js";

/* ============================================================
   SKATER: LIST BUSINESSES (SIGNED ONLY)
============================================================ */
export async function skaterBusinesses(request, env, user) {
  const skater = await env.DB_skaters.prepare(
    "SELECT id, signed_to_label FROM skaters WHERE user_id = ?"
  ).bind(user.id).first();

  if (!skater || !skater.signed_to_label) {
    return json({ error: "You must be signed to the label to access businesses." }, 403);
  }

  const { results: businesses } = await env.DB_business.prepare(
    `SELECT b.id, b.company_name, b.website, b.verified
     FROM businesses b
     WHERE b.verified = 1
     ORDER BY b.company_name ASC`
  ).all();

  const { results: sponsorships } = await env.DB_business.prepare(
    `SELECT s.*, b.company_name
     FROM sponsorships s
     JOIN businesses b ON s.business_id = b.id
     WHERE s.skater_id = ?`
  ).bind(skater.id).all();

  return json({
    businesses,
    sponsorships
  });
}

/* ============================================================
   SKATER: CONTACT BUSINESS (MESSAGE THREAD)
============================================================ */
export async function skaterContactBusiness(request, env, user) {
  const body = await request.json();
  const { businessId, message } = body;

  const skater = await env.DB_skaters.prepare(
    "SELECT id, signed_to_label FROM skaters WHERE user_id = ?"
  ).bind(user.id).first();

  if (!skater || !skater.signed_to_label) {
    return json({ error: "You must be signed to the label to contact businesses." }, 403);
  }

  const business = await env.DB_business.prepare(
    "SELECT id FROM businesses WHERE id = ? AND verified = 1"
  ).bind(businessId).first();

  if (!business) return json({ error: "Business not found." }, 404);

  let thread = await env.DB_business.prepare(
    `SELECT * FROM message_threads
     WHERE skater_id = ? AND business_id = ?`
  ).bind(skater.id, business.id).first();

  const now = new Date().toISOString();

  if (!thread) {
    const threadId = crypto.randomUUID();
    await env.DB_business.prepare(
      `INSERT INTO message_threads (id, skater_id, business_id, sponsorship_id, created_at)
       VALUES (?, ?, ?, NULL, ?)`
    ).bind(threadId, skater.id, business.id, now).run();

    thread = { id: threadId };
  }

  const msgId = crypto.randomUUID();

  await env.DB_business.prepare(
    `INSERT INTO messages (id, thread_id, from_user_id, to_user_id, body, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(msgId, thread.id, user.id, null, message || "Let's talk branding.", now).run();

  return json({ success: true, threadId: thread.id, messageId: msgId });
}
