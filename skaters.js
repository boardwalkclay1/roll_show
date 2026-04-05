import { apiJson } from "./users.js";
import { signupBase } from "./users.js";

/* ============================================================
   SKATER SIGNUP
============================================================ */
export async function signupSkater(request, env) {
  const body = await request.json();
  body.role = "skater";

  const base = await signupBase(env, body);
  if (base.error) return apiJson({ message: base.error }, 400);

  await env.DB_users
    .prepare(
      `INSERT INTO skaters (id, user_id, bio, discipline, profile_image, clip_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      base.id,
      body.bio || null,
      body.discipline || null,
      body.profile_image || null,
      body.clip_url || null,
      base.created_at
    )
    .run();

  return apiJson({ user: base });
}

/* ============================================================
   PUBLIC SHOW FEED
============================================================ */
export async function listShows(env) {
  const { results } = await env.DB_users
    .prepare(
      `SELECT s.*, sk.discipline, sk.bio
       FROM shows s
       JOIN skaters sk ON s.skater_id = sk.id
       ORDER BY s.created_at DESC`
    )
    .all();

  return apiJson({ shows: results });
}

/* ============================================================
   GET SINGLE SHOW
============================================================ */
export async function getShow(env, id) {
  const row = await env.DB_users
    .prepare(
      `SELECT s.*, sk.discipline, sk.bio
       FROM shows s
       JOIN skaters sk ON s.skater_id = sk.id
       WHERE s.id = ?`
    )
    .bind(id)
    .first();

  if (!row) return apiJson({ message: "Show not found" }, 404);

  return apiJson({ show: row });
}

/* ============================================================
   SKATER DASHBOARD
============================================================ */
export async function skaterDashboard(request, env, user) {
  const skater = await env.DB_users
    .prepare("SELECT * FROM skaters WHERE user_id = ?")
    .bind(user.id)
    .first();

  if (!skater) return apiJson({ message: "Skater profile not found" }, 404);

  const { results: shows } = await env.DB_users
    .prepare("SELECT * FROM shows WHERE skater_id = ? ORDER BY created_at DESC")
    .bind(skater.id)
    .all();

  const { results: lessons } = await env.DB_users
    .prepare("SELECT * FROM lessons WHERE skater_id = ? ORDER BY created_at DESC")
    .bind(skater.id)
    .all();

  const { results: lessonRequests } = await env.DB_users
    .prepare(
      `SELECT lr.*, l.title AS lesson_title, u.name AS buyer_name
       FROM lesson_requests lr
       JOIN lessons l ON lr.lesson_id = l.id
       JOIN users u ON lr.buyer_id = u.id
       WHERE l.skater_id = ?
       ORDER BY lr.created_at DESC`
    )
    .bind(skater.id)
    .all();

  const { results: offers } = await env.DB_users
    .prepare(
      `SELECT o.*, u.name AS sender_name
       FROM offers o
       JOIN users u ON o.from_user_id = u.id
       WHERE o.to_user_id = ? OR o.from_user_id = ?
       ORDER BY o.created_at DESC`
    )
    .bind(user.id, user.id)
    .all();

  const { results: contracts } = await env.DB_users
    .prepare(
      `SELECT c.*, o.type, o.terms
       FROM contracts c
       JOIN offers o ON c.offer_id = o.id
       WHERE o.to_user_id = ? OR o.from_user_id = ?
       ORDER BY c.created_at DESC`
    )
    .bind(user.id, user.id)
    .all();

  const { results: participants } = await env.DB_users
    .prepare(
      `SELECT cp.*, u.name
       FROM contract_participants cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.user_id = ?`
    )
    .bind(user.id)
    .all();

  const { results: licenses } = await env.DB_users
    .prepare(
      `SELECT l.*, t.title
       FROM track_licenses l
       JOIN tracks t ON l.track_id = t.id
       WHERE l.skater_id = ?
       ORDER BY l.created_at DESC`
    )
    .bind(skater.id)
    .all();

  return apiJson({
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
   LIST SKATER SHOWS
============================================================ */
export async function listSkaterShows(request, env, user) {
  const skater = await env.DB_users
    .prepare("SELECT id FROM skaters WHERE user_id = ?")
    .bind(user.id)
    .first();

  if (!skater) return apiJson({ message: "Skater not found" }, 404);

  const { results } = await env.DB_users
    .prepare("SELECT * FROM shows WHERE skater_id = ? ORDER BY created_at DESC")
    .bind(skater.id)
    .all();

  return apiJson({ shows: results });
}

/* ============================================================
   CREATE SHOW
============================================================ */
export async function createShow(request, env, user) {
  const {
    title,
    description,
    premiere_date,
    price_cents,
    thumbnail,
    video_url
  } = await request.json();

  if (!title) return apiJson({ message: "Missing title" }, 400);

  const skater = await env.DB_users
    .prepare("SELECT id FROM skaters WHERE user_id = ?")
    .bind(user.id)
    .first();

  if (!skater) return apiJson({ message: "Skater not found" }, 404);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users
    .prepare(
      `INSERT INTO shows (id, skater_id, title, description, price_cents, thumbnail, video_url, premiere_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      skater.id,
      title,
      description || null,
      price_cents || null,
      thumbnail || null,
      video_url || null,
      premiere_date || null,
      now
    )
    .run();

  return apiJson({ showId: id });
}

/* ============================================================
   UPDATE SKATER PROFILE
============================================================ */
export async function updateSkaterProfile(request, env, user) {
  const { discipline, bio, profile_image, clip_url } = await request.json();

  const skater = await env.DB_users
    .prepare("SELECT id FROM skaters WHERE user_id = ?")
    .bind(user.id)
    .first();

  if (!skater) return apiJson({ message: "Skater not found" }, 404);

  await env.DB_users
    .prepare(
      `UPDATE skaters
       SET discipline = ?, bio = ?, profile_image = ?, clip_url = ?
       WHERE id = ?`
    )
    .bind(
      discipline || null,
      bio || null,
      profile_image || null,
      clip_url || null,
      skater.id
    )
    .run();

  return apiJson({ success: true });
}

/* ============================================================
   CREATE LESSON (OFFERING)
============================================================ */
export async function createLesson(request, env, user) {
  const { title, description, price_cents } = await request.json();

  if (!title) return apiJson({ message: "Missing title" }, 400);

  const skater = await env.DB_users
    .prepare("SELECT id FROM skaters WHERE user_id = ?")
    .bind(user.id)
    .first();

  if (!skater) return apiJson({ message: "Skater not found" }, 404);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users
    .prepare(
      `INSERT INTO lessons (id, skater_id, title, description, price_cents, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(id, skater.id, title, description || null, price_cents || null, now)
    .run();

  return apiJson({ lessonId: id });
}

/* ============================================================
   RESPOND TO LESSON REQUEST
============================================================ */
export async function respondLessonRequest(request, env, user) {
  const { requestId, status } = await request.json();

  const valid = ["accepted", "declined", "completed"];
  if (!valid.includes(status)) {
    return apiJson({ message: "Invalid status" }, 400);
  }

  const row = await env.DB_users
    .prepare(
      `SELECT lr.id
       FROM lesson_requests lr
       JOIN lessons l ON lr.lesson_id = l.id
       JOIN skaters s ON l.skater_id = s.id
       WHERE lr.id = ? AND s.user_id = ?`
    )
    .bind(requestId, user.id)
    .first();

  if (!row) {
    return apiJson({ message: "Unauthorized or request not found" }, 403);
  }

  await env.DB_users
    .prepare("UPDATE lesson_requests SET status = ? WHERE id = ?")
    .bind(status, requestId)
    .run();

  return apiJson({ success: true });
}

/* ============================================================
   SKATER: LIST BUSINESSES
============================================================ */
export async function skaterBusinesses(request, env, user) {
  const skater = await env.DB_users
    .prepare("SELECT id, signed_to_label FROM skaters WHERE user_id = ?")
    .bind(user.id)
    .first();

  if (!skater || !skater.signed_to_label) {
    return apiJson(
      { message: "You must be signed to the label to access businesses." },
      403
    );
  }

  const { results: businesses } = await env.DB_users
    .prepare(
      `SELECT b.id, b.company_name, b.website, b.verified
       FROM businesses b
       WHERE b.verified = 1
       ORDER BY b.company_name ASC`
    )
    .all();

  const { results: sponsorships } = await env.DB_users
    .prepare(
      `SELECT s.*, b.company_name
       FROM sponsorships s
       JOIN businesses b ON s.business_id = b.id
       WHERE s.skater_id = ?`
    )
    .bind(skater.id)
    .all();

  return apiJson({
    businesses,
    sponsorships
  });
}

/* ============================================================
   SKATER: CONTACT BUSINESS
============================================================ */
export async function skaterContactBusiness(request, env, user) {
  const { businessId, message } = await request.json();

  const skater = await env.DB_users
    .prepare("SELECT id, signed_to_label FROM skaters WHERE user_id = ?")
    .bind(user.id)
    .first();

  if (!skater || !skater.signed_to_label) {
    return apiJson(
      { message: "You must be signed to the label to contact businesses." },
      403
    );
  }

  const business = await env.DB_users
    .prepare("SELECT id FROM businesses WHERE id = ? AND verified = 1")
    .bind(businessId)
    .first();

  if (!business) return apiJson({ message: "Business not found." }, 404);

  let thread = await env.DB_users
    .prepare(
      `SELECT * FROM message_threads
       WHERE skater_id = ? AND business_id = ?`
    )
    .bind(skater.id, business.id)
    .first();

  const now = new Date().toISOString();

  if (!thread) {
    const threadId = crypto.randomUUID();
    await env.DB_users
      .prepare(
        `INSERT INTO message_threads (id, skater_id, business_id, sponsorship_id, created_at)
         VALUES (?, ?, ?, NULL, ?)`
      )
      .bind(threadId, skater.id, business.id, now)
      .run();

    thread = { id: threadId };
  }

  const msgId = crypto.randomUUID();

  await env.DB_users
    .prepare(
      `INSERT INTO messages (id, thread_id, from_user_id, to_user_id, body, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      msgId,
      thread.id,
      user.id,
      null,
      message || "Let's talk branding.",
      now
    )
    .run();

  return apiJson({ threadId: thread.id, messageId: msgId });
}

/* ============================================================
   SKATER OFFERINGS (LESSONS)
============================================================ */
export async function listSkaterOfferings(request, env, user) {
  const skater = await env.DB_users
    .prepare("SELECT id FROM skaters WHERE user_id = ?")
    .bind(user.id)
    .first();

  if (!skater) return apiJson({ message: "Skater not found" }, 404);

  const { results } = await env.DB_users
    .prepare(
      `SELECT id, title, description, price_cents, created_at
       FROM lessons
       WHERE skater_id = ?
       ORDER BY created_at DESC`
    )
    .bind(skater.id)
    .all();

  return apiJson({ offerings: results });
}

/* ============================================================
   SKATER CALENDAR (SHOWS + LESSONS)
============================================================ */
export async function skaterCalendar(request, env, user) {
  const skater = await env.DB_users
    .prepare("SELECT id FROM skaters WHERE user_id = ?")
    .bind(user.id)
    .first();

  if (!skater) return apiJson({ message: "Skater not found" }, 404);

  const { results: shows } = await env.DB_users
    .prepare(
      `SELECT id, title, premiere_date AS date, 'show' AS type
       FROM shows
       WHERE skater_id = ?
       ORDER BY premiere_date DESC`
    )
    .bind(skater.id)
    .all();

  const { results: lessons } = await env.DB_users
    .prepare(
      `SELECT id, title, created_at AS date, 'lesson' AS type
       FROM lessons
       WHERE skater_id = ?
       ORDER BY created_at DESC`
    )
    .bind(skater.id)
    .all();

  return apiJson({ items: [...shows, ...lessons] });
}

/* ============================================================
   SKATER CAMPAIGNS (SPONSORSHIPS)
============================================================ */
export async function skaterCampaigns(request, env, user) {
  const skater = await env.DB_users
    .prepare("SELECT id FROM skaters WHERE user_id = ?")
    .bind(user.id)
    .first();

  if (!skater) return apiJson({ message: "Skater not found" }, 404);

  const { results } = await env.DB_users
    .prepare(
      `SELECT s.*, b.company_name
       FROM sponsorships s
       JOIN businesses b ON s.business_id = b.id
       WHERE s.skater_id = ?
       ORDER BY s.created_at DESC`
    )
    .bind(skater.id)
    .all();

  return apiJson({ campaigns: results });
}

/* ============================================================
   SKATER CARDS (CONTRACTS AS CARDS)
============================================================ */
export async function skaterCards(request, env, user) {
  const { results } = await env.DB_users
    .prepare(
      `SELECT c.id, c.status, c.created_at, o.type, o.terms
       FROM contracts c
       JOIN offers o ON c.offer_id = o.id
       WHERE o.to_user_id = ? OR o.from_user_id = ?
       ORDER BY c.created_at DESC`
    )
    .bind(user.id, user.id)
    .all();

  return apiJson({ cards: results });
}

/* ============================================================
   SKATER MUSIC (LICENSED TRACKS)
============================================================ */
export async function skaterMusic(request, env, user) {
  const skater = await env.DB_users
    .prepare("SELECT id FROM skaters WHERE user_id = ?")
    .bind(user.id)
    .first();

  if (!skater) return apiJson({ message: "Skater not found" }, 404);

  const { results } = await env.DB_users
    .prepare(
      `SELECT l.id, l.created_at, t.title, t.artist_name
       FROM track_licenses l
       JOIN tracks t ON l.track_id = t.id
       WHERE l.skater_id = ?
       ORDER BY l.created_at DESC`
    )
    .bind(skater.id)
    .all();

  return apiJson({ tracks: results });
}

/* ============================================================
   SKATER BRANDING ASSETS (PROFILE + CLIP)
============================================================ */
export async function skaterBrandingAssets(request, env, user) {
  const skater = await env.DB_users
    .prepare(
      "SELECT profile_image, clip_url, discipline, bio FROM skaters WHERE user_id = ?"
    )
    .bind(user.id)
    .first();

  if (!skater) return apiJson({ message: "Skater not found" }, 404);

  const assets = [];

  if (skater.profile_image) {
    assets.push({
      id: "profile_image",
      asset_type: "image",
      asset_url: skater.profile_image,
      label: "Profile Image"
    });
  }

  if (skater.clip_url) {
    assets.push({
      id: "clip_url",
      asset_type: "video",
      asset_url: skater.clip_url,
      label: "Intro Clip"
    });
  }

  return apiJson({ assets });
}

/* ============================================================
   SKATER ANALYTICS
============================================================ */
export async function skaterAnalytics(request, env, user) {
  const url = new URL(request.url);
  const range = parseInt(url.searchParams.get("range") || "7", 10);

  const skater = await env.DB_users
    .prepare("SELECT id FROM skaters WHERE user_id = ?")
    .bind(user.id)
    .first();

  if (!skater) return apiJson({ message: "Skater not found" }, 404);

  const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000).toISOString();

  const { results: shows } = await env.DB_users
    .prepare(
      `SELECT * FROM shows
       WHERE skater_id = ? AND created_at >= ?
       ORDER BY created_at DESC`
    )
    .bind(skater.id, since)
    .all();

  const { results: lessons } = await env.DB_users
    .prepare(
      `SELECT * FROM lessons
       WHERE skater_id = ? AND created_at >= ?
       ORDER BY created_at DESC`
    )
    .bind(skater.id, since)
    .all();

  const { results: lessonRequests } = await env.DB_users
    .prepare(
      `SELECT lr.*
       FROM lesson_requests lr
       JOIN lessons l ON lr.lesson_id = l.id
       WHERE l.skater_id = ? AND lr.created_at >= ?
       ORDER BY lr.created_at DESC`
    )
    .bind(skater.id, since)
    .all();

  const { results: licenses } = await env.DB_users
    .prepare(
      `SELECT l.*, t.title
       FROM track_licenses l
       JOIN tracks t ON l.track_id = t.id
       WHERE l.skater_id = ? AND l.created_at >= ?
       ORDER BY l.created_at DESC`
    )
    .bind(skater.id, since)
    .all();

  const overview = {
    shows: shows.length,
    lessons: lessons.length,
    lesson_requests: lessonRequests.length,
    track_licenses: licenses.length
  };

  const top_content = [...shows, ...lessons].slice(0, 10).map(item => ({
    id: item.id,
    title: item.title,
    created_at: item.created_at
  }));

  return apiJson({
    overview,
    top_content
  });
}
