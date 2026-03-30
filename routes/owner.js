import { json } from "../utils.js";
import { requireRole } from "../users.js";

/* ============================================================
   OWNER OVERVIEW
============================================================ */
export async function ownerOverview(request, env) {
  return requireRole(request, env, ["owner"], async (_req, env) => {
    const total_users = await env.DB_users.prepare(
      "SELECT COUNT(*) AS c FROM users"
    ).first();

    const total_skaters = await env.DB_users.prepare(
      "SELECT COUNT(*) AS c FROM users WHERE role = 'skater'"
    ).first();

    const total_businesses = await env.DB_users.prepare(
      "SELECT COUNT(*) AS c FROM users WHERE role = 'business'"
    ).first();

    const total_musicians = await env.DB_users.prepare(
      "SELECT COUNT(*) AS c FROM users WHERE role = 'musician'"
    ).first();

    const total_shows = await env.DB_shows.prepare(
      "SELECT COUNT(*) AS c FROM shows"
    ).first();

    const total_tickets = await env.DB_shows.prepare(
      "SELECT COALESCE(SUM(tickets_sold), 0) AS c FROM shows"
    ).first();

    const total_purchases = await env.DB_purchases.prepare(
      "SELECT COUNT(*) AS c FROM purchases"
    ).first();

    const total_revenue = await env.DB_purchases.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS c FROM purchases"
    ).first();

    return json({
      total_users: total_users.c,
      total_skaters: total_skaters.c,
      total_businesses: total_businesses.c,
      total_musicians: total_musicians.c,
      total_shows: total_shows.c,
      total_tickets: total_tickets.c,
      total_purchases: total_purchases.c,
      total_revenue: total_revenue.c
    });
  });
}

/* ============================================================
   OWNER USERS
============================================================ */
export async function ownerUsers(request, env) {
  return requireRole(request, env, ["owner"], async (_req, env) => {
    const rows = await env.DB_users.prepare(
      `SELECT id, name, email, role, is_owner, created_at
       FROM users
       ORDER BY created_at DESC`
    ).all();

    return json({ users: rows.results });
  });
}

/* ============================================================
   OWNER SKATERS
============================================================ */
export async function ownerSkaters(request, env) {
  return requireRole(request, env, ["owner"], async (_req, env) => {
    const rows = await env.DB_users.prepare(
      `SELECT u.id, u.name, u.email, u.created_at,
              COALESCE(COUNT(s.id), 0) AS show_count
       FROM users u
       LEFT JOIN shows s ON s.skater_id = u.id
       WHERE u.role = 'skater'
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    ).all();

    return json({ skaters: rows.results });
  });
}

/* ============================================================
   OWNER BUSINESSES
============================================================ */
export async function ownerBusinesses(request, env) {
  return requireRole(request, env, ["owner"], async (_req, env) => {
    const rows = await env.DB_users.prepare(
      `SELECT u.id, u.name, u.email, u.created_at,
              COALESCE(COUNT(o.id), 0) AS offer_count
       FROM users u
       LEFT JOIN offers o ON o.business_id = u.id
       WHERE u.role = 'business'
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    ).all();

    return json({ businesses: rows.results });
  });
}

/* ============================================================
   OWNER MUSICIANS
============================================================ */
export async function ownerMusicians(request, env) {
  return requireRole(request, env, ["owner"], async (_req, env) => {
    const rows = await env.DB_users.prepare(
      `SELECT u.id, u.name, u.email, u.created_at,
              COALESCE(COUNT(m.id), 0) AS track_count
       FROM users u
       LEFT JOIN music m ON m.musician_id = u.id
       WHERE u.role = 'musician'
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    ).all();

    return json({ musicians: rows.results });
  });
}

/* ============================================================
   OWNER SHOWS
============================================================ */
export async function ownerShows(request, env) {
  return requireRole(request, env, ["owner"], async (_req, env) => {
    const rows = await env.DB_shows.prepare(
      `SELECT s.id, s.title, s.date, s.tickets_sold, s.revenue,
              u.name AS skater_name
       FROM shows s
       LEFT JOIN users u ON u.id = s.skater_id
       ORDER BY s.date DESC`
    ).all();

    return json({ shows: rows.results });
  });
}

/* ============================================================
   OWNER CONTRACTS
============================================================ */
export async function ownerContracts(request, env) {
  return requireRole(request, env, ["owner"], async (_req, env) => {
    const rows = await env.DB_contracts.prepare(
      `SELECT c.id, c.status, c.created_at,
              s.name AS skater_name,
              b.name AS business_name
       FROM contracts c
       LEFT JOIN users s ON s.id = c.skater_id
       LEFT JOIN users b ON b.id = c.business_id
       ORDER BY c.created_at DESC`
    ).all();

    return json({ contracts: rows.results });
  });
}

/* ============================================================
   OWNER MUSIC
============================================================ */
export async function ownerMusic(request, env) {
  return requireRole(request, env, ["owner"], async (_req, env) => {
    const rows = await env.DB_music.prepare(
      `SELECT m.id, m.title, m.created_at,
              u.name AS musician_name,
              COALESCE(m.license_count, 0) AS license_count
       FROM music m
       LEFT JOIN users u ON u.id = m.musician_id
       ORDER BY m.created_at DESC`
    ).all();

    return json({ tracks: rows.results });
  });
}

/* ============================================================
   OWNER SETTINGS — BRANDING
============================================================ */
export async function ownerSettingsBranding(request, env) {
  return requireRole(request, env, ["owner"], async (req, env) => {
    const body = await req.json();
    const { platform_name, primary_color } = body;

    await env.DB_settings.prepare(
      `INSERT INTO settings (id, platform_name, primary_color)
       VALUES ('platform', ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         platform_name = excluded.platform_name,
         primary_color = excluded.primary_color`
    ).bind(platform_name, primary_color).run();

    return json({ success: true });
  });
}

/* ============================================================
   OWNER SETTINGS — NOTES
============================================================ */
export async function ownerSettingsNotes(request, env) {
  return requireRole(request, env, ["owner"], async (req, env) => {
    const body = await req.json();
    const { notes } = body;

    await env.DB_settings.prepare(
      `INSERT INTO settings (id, owner_notes)
       VALUES ('platform', ?)
       ON CONFLICT(id) DO UPDATE SET
         owner_notes = excluded.owner_notes`
    ).bind(notes).run();

    return json({ success: true });
  });
}
