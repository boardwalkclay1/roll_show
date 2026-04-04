// routes/owner.js — FULL CLEAN REBUILD FOR NEW SCHEMA

import { apiJson, requireRole } from "../users.js";

/* ============================================================
   OWNER: OVERVIEW (MAIN ANALYTICS)
============================================================ */
export async function ownerOverview(request, env) {
  return requireRole(request, env, ["owner"], async () => {
    const db = env.DB_users;

    const total_users = (await db.prepare(
      "SELECT COUNT(*) AS n FROM users"
    ).first()).n;

    const total_skaters = (await db.prepare(
      "SELECT COUNT(*) AS n FROM skaters"
    ).first()).n;

    const total_businesses = (await db.prepare(
      "SELECT COUNT(*) AS n FROM businesses"
    ).first()).n;

    const total_musicians = (await db.prepare(
      "SELECT COUNT(*) AS n FROM musicians"
    ).first()).n;

    const total_buyers = (await db.prepare(
      "SELECT COUNT(*) AS n FROM buyers"
    ).first()).n;

    const total_shows = (await db.prepare(
      "SELECT COUNT(*) AS n FROM shows"
    ).first()).n;

    const total_purchases = (await db.prepare(
      "SELECT COUNT(*) AS n FROM purchases"
    ).first()).n;

    const total_revenue = (await db.prepare(
      "SELECT COALESCE(SUM(amount),0) AS total FROM purchases"
    ).first()).total;

    return apiJson({
      total_users,
      total_skaters,
      total_businesses,
      total_musicians,
      total_buyers,
      total_shows,
      total_purchases,
      total_revenue
    });
  });
}

/* ============================================================
   OWNER: USERS
============================================================ */
export async function ownerUsers(request, env) {
  return requireRole(request, env, ["owner"], async () => {
    const { results } = await env.DB_users.prepare(
      "SELECT id, email, role, is_owner, created_at FROM users ORDER BY created_at DESC"
    ).all();
    return apiJson({ users: results || [] });
  });
}

/* ============================================================
   OWNER: SKATERS
============================================================ */
export async function ownerSkaters(request, env) {
  return requireRole(request, env, ["owner"], async () => {
    const { results } = await env.DB_users.prepare(
      `SELECT s.*, u.email, u.name
       FROM skaters s
       JOIN users u ON s.user_id = u.id
       ORDER BY s.created_at DESC`
    ).all();
    return apiJson({ skaters: results || [] });
  });
}

/* ============================================================
   OWNER: BUSINESSES
============================================================ */
export async function ownerBusinesses(request, env) {
  return requireRole(request, env, ["owner"], async () => {
    const { results } = await env.DB_users.prepare(
      `SELECT b.*, u.email, u.name
       FROM businesses b
       JOIN users u ON b.user_id = u.id
       ORDER BY b.created_at DESC`
    ).all();
    return apiJson({ businesses: results || [] });
  });
}

/* ============================================================
   OWNER: MUSICIANS
============================================================ */
export async function ownerMusicians(request, env) {
  return requireRole(request, env, ["owner"], async () => {
    const { results } = await env.DB_users.prepare(
      `SELECT m.*, u.email, u.name
       FROM musicians m
       JOIN users u ON m.user_id = u.id
       ORDER BY m.created_at DESC`
    ).all();
    return apiJson({ musicians: results || [] });
  });
}

/* ============================================================
   OWNER: SHOWS
============================================================ */
export async function ownerShows(request, env) {
  return requireRole(request, env, ["owner"], async () => {
    const { results } = await env.DB_users.prepare(
      "SELECT * FROM shows ORDER BY created_at DESC"
    ).all();
    return apiJson({ shows: results || [] });
  });
}

/* ============================================================
   OWNER: CONTRACTS
============================================================ */
export async function ownerContracts(request, env) {
  return requireRole(request, env, ["owner"], async () => {
    const { results } = await env.DB_users.prepare(
      "SELECT * FROM contracts ORDER BY created_at DESC"
    ).all();
    return apiJson({ contracts: results || [] });
  });
}

/* ============================================================
   OWNER: MUSIC LIBRARY
============================================================ */
export async function ownerMusic(request, env) {
  return requireRole(request, env, ["owner"], async () => {
    const { results } = await env.DB_users.prepare(
      "SELECT * FROM media WHERE type = 'music' ORDER BY created_at DESC"
    ).all();
    return apiJson({ music: results || [] });
  });
}

/* ============================================================
   OWNER: BUSINESS APPLICATIONS
============================================================ */
export async function ownerBusinessApplications(request, env) {
  return requireRole(request, env, ["owner"], async () => {
    const { results } = await env.DB_users.prepare(
      `SELECT b.*, u.email, u.name
       FROM businesses b
       JOIN users u ON b.user_id = u.id
       WHERE b.verified = 0
       ORDER BY b.created_at DESC`
    ).all();

    return apiJson({ applications: results || [] });
  });
}

/* ============================================================
   OWNER: UPDATE BUSINESS APPLICATION STATUS
============================================================ */
export async function ownerBusinessUpdateStatus(request, env) {
  return requireRole(request, env, ["owner"], async (req) => {
    const body = await req.json().catch(() => ({}));
    const { businessId, verified } = body;

    if (verified !== 0 && verified !== 1) {
      return apiJson({ message: "Invalid verified value" }, 400);
    }

    await env.DB_users.prepare(
      `UPDATE businesses
       SET verified = ?
       WHERE id = ?`
    ).bind(verified, businessId).run();

    return apiJson({ businessId, verified });
  });
}

/* ============================================================
   OWNER: SETTINGS — BRANDING
============================================================ */
export async function ownerSettingsBranding(request, env) {
  return requireRole(request, env, ["owner"], async () => {
    const branding = await env.DB_users.prepare(
      "SELECT * FROM owner_branding LIMIT 1"
    ).first();

    return apiJson({ branding: branding || {} });
  });
}

/* ============================================================
   OWNER: SETTINGS — NOTES
============================================================ */
export async function ownerSettingsNotes(request, env) {
  return requireRole(request, env, ["owner"], async () => {
    const notes = await env.DB_users.prepare(
      "SELECT * FROM owner_notes ORDER BY created_at DESC"
    ).all();

    return apiJson({ notes: notes.results || [] });
  });
}

/* ============================================================
   OWNER: ADS
============================================================ */
export async function ownerAds(request, env) {
  return requireRole(request, env, ["owner"], async () => {
    const { results } = await env.DB_users.prepare(
      "SELECT * FROM ads ORDER BY created_at DESC"
    ).all();

    return apiJson({ ads: results || [] });
  });
}

/* ============================================================
   OWNER: UPDATE AD STATUS
============================================================ */
export async function ownerUpdateAdStatus(request, env) {
  return requireRole(request, env, ["owner"], async (req) => {
    const body = await req.json().catch(() => ({}));
    const { adId, status } = body;

    await env.DB_users.prepare(
      "UPDATE ads SET status = ? WHERE id = ?"
    ).bind(status, adId).run();

    return apiJson({ adId, status });
  });
}

/* ============================================================
   OWNER: SPONSORSHIPS
============================================================ */
export async function ownerSponsorships(request, env) {
  return requireRole(request, env, ["owner"], async () => {
    const { results } = await env.DB_users.prepare(
      "SELECT * FROM sponsorships ORDER BY created_at DESC"
    ).all();

    return apiJson({ sponsorships: results || [] });
  });
}
