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
      "SELECT COUNT(*) AS n FROM skater_profiles"
    ).first()).n;

    const total_businesses = (await db.prepare(
      "SELECT COUNT(*) AS n FROM business_profiles"
    ).first()).n;

    const total_musicians = (await db.prepare(
      "SELECT COUNT(*) AS n FROM musician_profiles"
    ).first()).n;

    const tickets_sold = (await db.prepare(
      "SELECT COUNT(*) AS n FROM tickets WHERE status = 'charged'"
    ).first()).n;

    const revenue = (await db.prepare(
      "SELECT COALESCE(SUM(price_cents),0) AS total FROM tickets WHERE status = 'charged'"
    ).first()).total;

    const active_shows = (await db.prepare(
      "SELECT COUNT(*) AS n FROM shows WHERE status = 'active'"
    ).first()).n;

    const pending_verifications = (await db.prepare(
      "SELECT COUNT(*) AS n FROM verifications WHERE status = 'pending'"
    ).first()).n;

    return apiJson({
      total_users,
      total_skaters,
      total_businesses,
      total_musicians,
      tickets_sold,
      revenue,
      active_shows,
      pending_verifications
    });
  });
}

/* ============================================================
   OWNER: USERS
============================================================ */
export async function ownerUsers(request, env) {
  return requireRole(request, env, ["owner"], async () => {
    const { results } = await env.DB_users.prepare(
      "SELECT id, email, role, created_at FROM users ORDER BY created_at DESC"
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
      `SELECT sp.*, u.email, u.name
       FROM skater_profiles sp
       JOIN users u ON sp.user_id = u.id
       ORDER BY sp.created_at DESC`
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
      `SELECT bp.*, u.email, u.name
       FROM business_profiles bp
       JOIN users u ON bp.user_id = u.id
       ORDER BY bp.created_at DESC`
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
      `SELECT mp.*, u.email, u.name
       FROM musician_profiles mp
       JOIN users u ON mp.user_id = u.id
       ORDER BY mp.created_at DESC`
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
      "SELECT * FROM tracks ORDER BY created_at DESC"
    ).all();
    return apiJson({ tracks: results || [] });
  });
}

/* ============================================================
   OWNER: BUSINESS APPLICATIONS
============================================================ */
export async function ownerBusinessApplications(request, env) {
  return requireRole(request, env, ["owner"], async () => {
    const { results } = await env.DB_users.prepare(
      `SELECT bp.*, u.email, u.name
       FROM business_profiles bp
       JOIN users u ON bp.user_id = u.id
       WHERE bp.review_status IN ('pending','needs_info')
       ORDER BY bp.created_at DESC`
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
    const { businessId, action, notes } = body;

    const valid = ["approve", "reject", "needs_info"];
    if (!valid.includes(action)) {
      return apiJson({ message: "Invalid action" }, 400);
    }

    const verified = action === "approve" ? 1 : 0;
    const review_status =
      action === "approve"
        ? "approved"
        : action === "reject"
        ? "rejected"
        : "needs_info";

    await env.DB_users.prepare(
      `UPDATE business_profiles
       SET verified = ?, review_status = ?, review_notes = ?
       WHERE id = ?`
    ).bind(verified, review_status, notes || "", businessId).run();

    return apiJson({ businessId, review_status, verified });
  });
}
