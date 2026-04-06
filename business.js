// business.js — FINAL, CLEAN, OWNER‑CONTROLLED, NO DIRECT SKATER CONTACT

import { apiJson } from "./users.js";

/* ============================================================
   GET BUSINESS RECORD
============================================================ */
async function getBusinessByUser(env, userId) {
  return await env.DB_users
    .prepare("SELECT * FROM businesses WHERE user_id = ?")
    .bind(userId)
    .first();
}

/* ============================================================
   BUSINESS SIGNUP
============================================================ */
export async function signupBusiness(request, env) {
  const body = await request.json();
  body.role = "business";

  // Create user
  const base = await env.signupBase(env, body);
  if (base.error) return apiJson({ message: base.error }, 400);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO businesses (
       id, user_id, company_name, website, phone, address, ein,
       verified, review_status, review_notes, submitted_at, created_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'pending', '', ?, ?)`
  )
    .bind(
      id,
      base.id,
      body.company_name || body.name || null,
      body.website || null,
      body.phone || null,
      body.address || null,
      body.ein || null,
      now,
      base.created_at
    )
    .run();

  return apiJson({
    user: base,
    business: {
      id,
      company_name: body.company_name || null,
      website: body.website || null,
      phone: body.phone || null,
      address: body.address || null,
      ein: body.ein || null,
      verified: 0,
      review_status: "pending"
    }
  });
}

/* ============================================================
   BUSINESS DASHBOARD (READ‑ONLY)
============================================================ */
export async function businessDashboard(request, env, user) {
  const business = await getBusinessByUser(env, user.id);
  if (!business) return apiJson({ message: "Business profile not found." }, 404);

  if (!business.verified) {
    return apiJson(
      {
        message: "Your business is not verified yet.",
        review_status: business.review_status,
        review_notes: business.review_notes
      },
      403
    );
  }

  /* ------------------------------------------------------------
     ANALYTICS
  ------------------------------------------------------------ */
  const revenueRow = await env.DB_users.prepare(
    `SELECT SUM(amount_cents) AS revenue_cents
     FROM payouts
     WHERE business_id = ?`
  )
    .bind(business.id)
    .first();

  const revenue_cents = revenueRow?.revenue_cents || 0;

  /* ------------------------------------------------------------
     SUBMISSIONS (NOT PUBLISHED ITEMS)
  ------------------------------------------------------------ */
  const { results: submissions } = await env.DB_users.prepare(
    `SELECT *
     FROM business_submissions
     WHERE business_id = ?
     ORDER BY created_at DESC`
  )
    .bind(business.id)
    .all();

  /* ------------------------------------------------------------
     STAFF
  ------------------------------------------------------------ */
  const { results: staff } = await env.DB_users.prepare(
    `SELECT *
     FROM business_staff
     WHERE business_id = ?
     ORDER BY created_at DESC`
  )
    .bind(business.id)
    .all();

  return apiJson({
    business,
    revenue_cents,
    submissions,
    staff
  });
}

/* ============================================================
   SUBMIT OFFER TO SKATER (THROUGH OWNER)
============================================================ */
export async function businessSubmitOffer(request, env, user) {
  const body = await request.json();
  const { skater_id, type, amount_cents, terms } = body;

  const business = await getBusinessByUser(env, user.id);
  if (!business) return apiJson({ message: "Business not found." }, 404);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO business_submissions
       (id, business_id, submission_type, payload_json, status, created_at)
     VALUES (?, ?, 'offer', ?, 'pending_owner', ?)`
  )
    .bind(
      id,
      business.id,
      JSON.stringify({ skater_id, type, amount_cents, terms }),
      now
    )
    .run();

  return apiJson({ submissionId: id });
}

/* ============================================================
   SUBMIT EVENT (THROUGH OWNER)
============================================================ */
export async function businessSubmitEvent(request, env, user) {
  const body = await request.json();
  const { title, description, location, lat, lng, start_at, end_at } = body;

  const business = await getBusinessByUser(env, user.id);
  if (!business) return apiJson({ message: "Business not found." }, 404);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO business_submissions
       (id, business_id, submission_type, payload_json, status, created_at)
     VALUES (?, ?, 'event', ?, 'pending_owner', ?)`
  )
    .bind(
      id,
      business.id,
      JSON.stringify({
        title,
        description,
        location,
        lat,
        lng,
        start_at,
        end_at
      }),
      now
    )
    .run();

  return apiJson({ submissionId: id });
}

/* ============================================================
   SUBMIT AD (THROUGH OWNER)
============================================================ */
export async function businessSubmitAd(request, env, user) {
  const body = await request.json();
  const { title, image_r2_key, target_url, start_at, end_at } = body;

  const business = await getBusinessByUser(env, user.id);
  if (!business) return apiJson({ message: "Business not found." }, 404);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO business_submissions
       (id, business_id, submission_type, payload_json, status, created_at)
     VALUES (?, ?, 'ad', ?, 'pending_owner', ?)`
  )
    .bind(
      id,
      business.id,
      JSON.stringify({
        title,
        image_r2_key,
        target_url,
        start_at,
        end_at
      }),
      now
    )
    .run();

  return apiJson({ submissionId: id });
}

/* ============================================================
   SUBMIT VENUE OPPORTUNITY (THROUGH OWNER)
============================================================ */
export async function businessSubmitVenue(request, env, user) {
  const body = await request.json();
  const { venue_name, address, capacity, payout_model, notes } = body;

  const business = await getBusinessByUser(env, user.id);
  if (!business) return apiJson({ message: "Business not found." }, 404);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO business_submissions
       (id, business_id, submission_type, payload_json, status, created_at)
     VALUES (?, ?, 'venue', ?, 'pending_owner', ?)`
  )
    .bind(
      id,
      business.id,
      JSON.stringify({
        venue_name,
        address,
        capacity,
        payout_model,
        notes
      }),
      now
    )
    .run();

  return apiJson({ submissionId: id });
}

/* ============================================================
   SUBMIT SPONSORSHIP (THROUGH OWNER)
============================================================ */
export async function businessSubmitSponsorship(request, env, user) {
  const body = await request.json();
  const { skater_id, amount_cents, duration_days, notes } = body;

  const business = await getBusinessByUser(env, user.id);
  if (!business) return apiJson({ message: "Business not found." }, 404);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO business_submissions
       (id, business_id, submission_type, payload_json, status, created_at)
     VALUES (?, ?, 'sponsorship', ?, 'pending_owner', ?)`
  )
    .bind(
      id,
      business.id,
      JSON.stringify({
        skater_id,
        amount_cents,
        duration_days,
        notes
      }),
      now
    )
    .run();

  return apiJson({ submissionId: id });
}

/* ============================================================
   SUBMIT AFFILIATE CAMPAIGN (THROUGH OWNER)
============================================================ */
export async function businessSubmitAffiliate(request, env, user) {
  const body = await request.json();
  const { product_name, payout_percent, link_url } = body;

  const business = await getBusinessByUser(env, user.id);
  if (!business) return apiJson({ message: "Business not found." }, 404);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO business_submissions
       (id, business_id, submission_type, payload_json, status, created_at)
     VALUES (?, ?, 'affiliate', ?, 'pending_owner', ?)`
  )
    .bind(
      id,
      business.id,
      JSON.stringify({
        product_name,
        payout_percent,
        link_url
      }),
      now
    )
    .run();

  return apiJson({ submissionId: id });
}

/* ============================================================
   SUBMIT DISCOUNT CAMPAIGN (THROUGH OWNER)
============================================================ */
export async function businessSubmitDiscount(request, env, user) {
  const body = await request.json();
  const { discount_percent, description, start_at, end_at } = body;

  const business = await getBusinessByUser(env, user.id);
  if (!business) return apiJson({ message: "Business not found." }, 404);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO business_submissions
       (id, business_id, submission_type, payload_json, status, created_at)
     VALUES (?, ?, 'discount', ?, 'pending_owner', ?)`
  )
    .bind(
      id,
      business.id,
      JSON.stringify({
        discount_percent,
        description,
        start_at,
        end_at
      }),
      now
    )
    .run();

  return apiJson({ submissionId: id });
}

/* ============================================================
   STAFF MANAGEMENT
============================================================ */
export async function businessAddStaff(request, env, user) {
  const body = await request.json();
  const { staff_name } = body;

  const business = await getBusinessByUser(env, user.id);
  if (!business) return apiJson({ message: "Business not found." }, 404);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO business_staff
       (id, business_id, staff_name, created_at)
     VALUES (?, ?, ?, ?)`
  )
    .bind(id, business.id, staff_name, now)
    .run();

  return apiJson({ staffId: id });
}

export async function businessRemoveStaff(request, env, user) {
  const body = await request.json();
  const { staff_id } = body;

  const business = await getBusinessByUser(env, user.id);
  if (!business) return apiJson({ message: "Business not found." }, 404);

  await env.DB_users.prepare(
    `DELETE FROM business_staff
     WHERE id = ? AND business_id = ?`
  )
    .bind(staff_id, business.id)
    .run();

  return apiJson({ removed: true });
}

export async function businessListStaff(request, env, user) {
  const business = await getBusinessByUser(env, user.id);
  if (!business) return apiJson({ message: "Business not found." }, 404);

  const { results } = await env.DB_users.prepare(
    `SELECT *
     FROM business_staff
     WHERE business_id = ?
     ORDER BY created_at DESC`
  )
    .bind(business.id)
    .all();

  return apiJson({ staff: results });
}

/* ============================================================
   TICKET SCANNING
============================================================ */
export async function businessScanTicket(request, env, user) {
  const body = await request.json();
  const { qr_id } = body;

  const business = await getBusinessByUser(env, user.id);
  if (!business) return apiJson({ message: "Business not found." }, 404);

  // Worker routes to Tickets.scanTicket
  return apiJson({ forward: "tickets.scan", qr_id });
}
