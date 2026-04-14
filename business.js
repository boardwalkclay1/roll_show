// business.js — CLEAN, ROLE‑SAFE handlers (no direct signup here)
// Exports plain objects (not Response) so requireRole() can wrap with apiJson.
// Assumes requireRole will call these handlers as: handler(request, env, user)

import { /* apiJson not used here; requireRole wraps results */ } from "./users.js";

/* ============================================================
   Helpers
   - All handlers return plain JS objects. Errors are returned
     as objects with success:false so requireRole() will wrap them.
============================================================ */

async function getBusinessByUser(env, userId) {
  return await env.DB_roll
    .prepare("SELECT * FROM businesses WHERE user_id = ?")
    .bind(userId)
    .first();
}

/* ============================================================
   BUSINESS PROFILE (profile-only endpoint)
   POST /api/profiles/business
   - Derives user_id from authenticated user (user.id)
   - Accepts only: company_name, contact_name, contact_email, country
   - Idempotent: if profile exists for user, return success + profile_exists
============================================================ */
export async function createBusinessProfile(request, env, user) {
  try {
    const body = await request.json().catch(() => ({}));
    const company_name = body.company_name ? String(body.company_name).trim() : null;
    const contact_name = body.contact_name ? String(body.contact_name).trim() : null;
    const contact_email = body.contact_email ? String(body.contact_email).trim() : null;
    const country = body.country ? String(body.country).trim() : null;

    // Basic validation
    if (!company_name || !contact_name || !contact_email || !country) {
      return { success: false, message: "Missing profile fields" };
    }

    // Check existing profile
    const existing = await env.DB_roll
      .prepare("SELECT * FROM business_profiles WHERE user_id = ?")
      .bind(user.id)
      .first();

    if (existing) {
      // Return existing profile (idempotent)
      return {
        success: true,
        profile_exists: true,
        profile: {
          id: existing.id,
          user_id: existing.user_id,
          company_name: existing.company_name,
          contact_name: existing.contact_name,
          contact_email: existing.contact_email,
          country: existing.country,
          created_at: existing.created_at
        }
      };
    }

    // Insert profile
    const profileId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      await env.DB_roll.prepare(
        `INSERT INTO business_profiles
           (id, user_id, company_name, contact_name, contact_email, country, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(profileId, user.id, company_name, contact_name, contact_email, country, now)
        .run();

      return {
        success: true,
        profile_created: true,
        profile: {
          id: profileId,
          user_id: user.id,
          company_name,
          contact_name,
          contact_email,
          country,
          created_at: now
        }
      };
    } catch (err) {
      const msg = String(err).toLowerCase();
      // Treat unique/constraint errors as idempotent success if they indicate an existing profile
      if (msg.includes("unique") || msg.includes("constraint") || /business_profiles/.test(msg)) {
        const p = await env.DB_roll
          .prepare("SELECT * FROM business_profiles WHERE user_id = ?")
          .bind(user.id)
          .first();
        if (p) {
          return {
            success: true,
            profile_exists: true,
            profile: {
              id: p.id,
              user_id: p.user_id,
              company_name: p.company_name,
              contact_name: p.contact_name,
              contact_email: p.contact_email,
              country: p.country,
              created_at: p.created_at
            }
          };
        }
      }

      // Other DB error: return failure so client can retry later
      return { success: false, message: "Profile insert failed", detail: String(err) };
    }
  } catch (err) {
    return { success: false, message: "Server error", detail: String(err) };
  }
}

/* ============================================================
   BUSINESS DASHBOARD (requires business role)
   Returns business record, revenue_cents, submissions, staff
   Called via requireRole(..., businessDashboard)
============================================================ */
export async function businessDashboard(request, env, user) {
  try {
    const business = await getBusinessByUser(env, user.id);
    if (!business) return { success: false, message: "Business profile not found." };

    if (!business.verified) {
      return {
        success: false,
        message: "Your business is not verified yet.",
        review_status: business.review_status,
        review_notes: business.review_notes
      };
    }

    const revenueRow = await env.DB_roll.prepare(
      `SELECT SUM(amount_cents) AS revenue_cents
       FROM payouts
       WHERE business_id = ?`
    )
      .bind(business.id)
      .first();

    const revenue_cents = revenueRow?.revenue_cents || 0;

    const { results: submissions } = await env.DB_roll.prepare(
      `SELECT *
       FROM business_submissions
       WHERE business_id = ?
       ORDER BY created_at DESC`
    )
      .bind(business.id)
      .all();

    const { results: staff } = await env.DB_roll.prepare(
      `SELECT *
       FROM business_staff
       WHERE business_id = ?
       ORDER BY created_at DESC`
    )
      .bind(business.id)
      .all();

    return {
      success: true,
      business,
      revenue_cents,
      submissions,
      staff
    };
  } catch (err) {
    return { success: false, message: "Server error", detail: String(err) };
  }
}

/* ============================================================
   SUBMISSIONS / STAFF / SCAN — all accept (request, env, user)
   Return plain objects for requireRole to wrap
============================================================ */

export async function businessSubmitOffer(request, env, user) {
  try {
    const body = await request.json().catch(() => ({}));
    const { skater_id, type, amount_cents, terms } = body;

    const business = await getBusinessByUser(env, user.id);
    if (!business) return { success: false, message: "Business not found." };

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB_roll.prepare(
      `INSERT INTO business_submissions
         (id, business_id, submission_type, payload_json, status, created_at)
       VALUES (?, ?, 'offer', ?, 'pending_owner', ?)`
    )
      .bind(id, business.id, JSON.stringify({ skater_id, type, amount_cents, terms }), now)
      .run();

    return { success: true, submissionId: id };
  } catch (err) {
    return { success: false, message: "Server error", detail: String(err) };
  }
}

export async function businessSubmitEvent(request, env, user) {
  try {
    const body = await request.json().catch(() => ({}));
    const { title, description, location, lat, lng, start_at, end_at } = body;

    const business = await getBusinessByUser(env, user.id);
    if (!business) return { success: false, message: "Business not found." };

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB_roll.prepare(
      `INSERT INTO business_submissions
         (id, business_id, submission_type, payload_json, status, created_at)
       VALUES (?, ?, 'event', ?, 'pending_owner', ?)`
    )
      .bind(
        id,
        business.id,
        JSON.stringify({ title, description, location, lat, lng, start_at, end_at }),
        now
      )
      .run();

    return { success: true, submissionId: id };
  } catch (err) {
    return { success: false, message: "Server error", detail: String(err) };
  }
}

export async function businessSubmitAd(request, env, user) {
  try {
    const body = await request.json().catch(() => ({}));
    const { title, image_r2_key, target_url, start_at, end_at } = body;

    const business = await getBusinessByUser(env, user.id);
    if (!business) return { success: false, message: "Business not found." };

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB_roll.prepare(
      `INSERT INTO business_submissions
         (id, business_id, submission_type, payload_json, status, created_at)
       VALUES (?, ?, 'ad', ?, 'pending_owner', ?)`
    )
      .bind(
        id,
        business.id,
        JSON.stringify({ title, image_r2_key, target_url, start_at, end_at }),
        now
      )
      .run();

    return { success: true, submissionId: id };
  } catch (err) {
    return { success: false, message: "Server error", detail: String(err) };
  }
}

/* Staff management */
export async function businessAddStaff(request, env, user) {
  try {
    const body = await request.json().catch(() => ({}));
    const { staff_name } = body;

    const business = await getBusinessByUser(env, user.id);
    if (!business) return { success: false, message: "Business not found." };

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB_roll.prepare(
      `INSERT INTO business_staff
         (id, business_id, staff_name, created_at)
       VALUES (?, ?, ?, ?)`
    )
      .bind(id, business.id, staff_name, now)
      .run();

    return { success: true, staffId: id };
  } catch (err) {
    return { success: false, message: "Server error", detail: String(err) };
  }
}

export async function businessRemoveStaff(request, env, user) {
  try {
    const body = await request.json().catch(() => ({}));
    const { staff_id } = body;

    const business = await getBusinessByUser(env, user.id);
    if (!business) return { success: false, message: "Business not found." };

    await env.DB_roll.prepare(
      `DELETE FROM business_staff
       WHERE id = ? AND business_id = ?`
    )
      .bind(staff_id, business.id)
      .run();

    return { success: true, removed: true };
  } catch (err) {
    return { success: false, message: "Server error", detail: String(err) };
  }
}

export async function businessListStaff(request, env, user) {
  try {
    const business = await getBusinessByUser(env, user.id);
    if (!business) return { success: false, message: "Business not found." };

    const { results } = await env.DB_roll.prepare(
      `SELECT *
       FROM business_staff
       WHERE business_id = ?
       ORDER BY created_at DESC`
    )
      .bind(business.id)
      .all();

    return { success: true, staff: results };
  } catch (err) {
    return { success: false, message: "Server error", detail: String(err) };
  }
}

/* Ticket scanning: forward hint for worker-level routing */
export async function businessScanTicket(request, env, user) {
  try {
    const body = await request.json().catch(() => ({}));
    const { qr_id } = body;

    const business = await getBusinessByUser(env, user.id);
    if (!business) return { success: false, message: "Business not found." };

    // Return a forward hint; worker can route to tickets.scan if desired
    return { success: true, forward: "tickets.scan", qr_id };
  } catch (err) {
    return { success: false, message: "Server error", detail: String(err) };
  }
}

/* --- Exports expected by worker.js (guarded) --- */
export {
  businessSubmitVenue,
  businessSubmitSponsorship,
  businessSubmitAffiliate,
  businessSubmitDiscount,
  businessSubmitOffer,
  businessSubmitEvent,
  businessSubmitAd,
  businessAddStaff,
  businessRemoveStaff,
  businessListStaff,
  businessScanTicket,
  createBusinessProfile,
  businessDashboard
};
