import { apiJson, signupBase } from "./users.js";

/* ============================================================
   BUSINESS SIGNUP
============================================================ */
export async function signupBusiness(request, env) {
  const body = await request.json();
  body.role = "business";

  const base = await signupBase(env, body);
  if (base.error) return apiJson({ message: base.error }, 400);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_business.prepare(
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
      company_name: body.company_name || body.name || null,
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
   BUSINESS DASHBOARD
============================================================ */
export async function businessDashboard(request, env, user) {
  const business = await env.DB_business.prepare(
    "SELECT * FROM businesses WHERE user_id = ?"
  )
    .bind(user.id)
    .first();

  if (!business) {
    return apiJson({ message: "Business profile not found." }, 404);
  }

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
     REVENUE
  ------------------------------------------------------------ */
  const revenueRow = await env.DB_business.prepare(
    `SELECT SUM(amount_cents) AS revenue_cents
     FROM contracts
     WHERE business_id = ? AND status = 'completed'`
  )
    .bind(business.id)
    .first();

  const revenue_cents = revenueRow?.revenue_cents || 0;

  /* ------------------------------------------------------------
     OFFERS SENT TO SKATERS
  ------------------------------------------------------------ */
  const { results: offers } = await env.DB_business.prepare(
    `SELECT o.*, u.name AS skater_name
     FROM offers o
     JOIN users u ON o.to_user_id = u.id
     WHERE o.from_user_id = ?
       AND u.role = 'skater'
     ORDER BY o.created_at DESC`
  )
    .bind(user.id)
    .all();

  /* ------------------------------------------------------------
     CONTRACTS
  ------------------------------------------------------------ */
  const { results: contracts } = await env.DB_business.prepare(
    `SELECT c.*, o.type, o.terms
     FROM contracts c
     JOIN offers o ON c.offer_id = o.id
     WHERE o.from_user_id = ? OR o.to_user_id = ?
     ORDER BY c.created_at DESC`
  )
    .bind(user.id, user.id)
    .all();

  /* ------------------------------------------------------------
     ADS
  ------------------------------------------------------------ */
  const { results: ads } = await env.DB_business.prepare(
    `SELECT * FROM business_ads
     WHERE business_id = ?
     ORDER BY created_at DESC`
  )
    .bind(business.id)
    .all();

  /* ------------------------------------------------------------
     SPONSORSHIPS
  ------------------------------------------------------------ */
  const { results: sponsorships } = await env.DB_business.prepare(
    `SELECT s.*, sk.discipline, sk.bio, u.name AS skater_name
     FROM sponsorships s
     JOIN skaters sk ON s.skater_id = sk.id
     JOIN users u ON sk.user_id = u.id
     WHERE s.business_id = ?
     ORDER BY s.created_at DESC`
  )
    .bind(business.id)
    .all();

  /* ------------------------------------------------------------
     MESSAGE THREADS
  ------------------------------------------------------------ */
  const { results: threads } = await env.DB_business.prepare(
    `SELECT mt.*, s.discipline, b.company_name
     FROM message_threads mt
     LEFT JOIN skaters s ON mt.skater_id = s.id
     LEFT JOIN businesses b ON mt.business_id = b.id
     WHERE mt.business_id = ?`
  )
    .bind(business.id)
    .all();

  /* ------------------------------------------------------------
     EVENTS
  ------------------------------------------------------------ */
  const { results: events } = await env.DB_business.prepare(
    `SELECT * FROM events
     WHERE created_by_business_id = ?
     ORDER BY start_at DESC`
  )
    .bind(business.id)
    .all();

  /* ------------------------------------------------------------
     SKATER OPPORTUNITIES
  ------------------------------------------------------------ */
  const { results: skater_opportunities } = await env.DB_skaters.prepare(
    `SELECT s.id, s.bio, s.discipline, u.name
     FROM skaters s
     JOIN users u ON s.user_id = u.id
     WHERE s.signed_to_label = 1`
  ).all();

  return apiJson({
    business,
    revenue_cents,
    offers,
    contracts,
    ads,
    sponsorships,
    threads,
    events,
    skater_opportunities
  });
}

/* ============================================================
   CREATE OFFER
============================================================ */
export async function createOffer(request, env, user) {
  const { skaterId, type, amount_cents, terms } = await request.json();

  const target = await env.DB_users.prepare(
    "SELECT role FROM users WHERE id = ?"
  )
    .bind(skaterId)
    .first();

  if (!target || target.role !== "skater") {
    return apiJson(
      { message: "Businesses may only send offers to skaters." },
      403
    );
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_business.prepare(
    `INSERT INTO offers 
       (id, from_user_id, to_user_id, type, amount_cents, terms, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
  )
    .bind(id, user.id, skaterId, type, amount_cents, terms, now)
    .run();

  return apiJson({ offerId: id });
}

/* ============================================================
   LIST BUSINESS OFFERS
============================================================ */
export async function listBusinessOffers(request, env, user) {
  const { results } = await env.DB_business.prepare(
    `SELECT o.*, u.name AS skater_name
     FROM offers o
     JOIN users u ON o.to_user_id = u.id
     WHERE o.from_user_id = ?
       AND u.role = 'skater'
     ORDER BY o.created_at DESC`
  )
    .bind(user.id)
    .all();

  return apiJson({ offers: results });
}

/* ============================================================
   CREATE CONTRACT
============================================================ */
export async function createContract(request, env, user) {
  const { offerId, details } = await request.json();

  const offer = await env.DB_business.prepare(
    `SELECT * FROM offers
     WHERE id = ? AND (from_user_id = ? OR to_user_id = ?)`
  )
    .bind(offerId, user.id, user.id)
    .first();

  if (!offer) {
    return apiJson(
      { message: "Offer not found or not associated with this business." },
      404
    );
  }

  if (offer.status !== "accepted") {
    return apiJson(
      { message: "Skater must accept the offer before creating a contract." },
      400
    );
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_business.prepare(
    `INSERT INTO contracts (id, offer_id, details, status, created_at)
     VALUES (?, ?, ?, 'pending', ?)`
  )
    .bind(id, offerId, details, now)
    .run();

  await env.DB_business.prepare(
    `INSERT INTO contract_participants
     (id, contract_id, user_id, role_in_contract, percentage, signed)
     VALUES (?, ?, ?, 'business', NULL, 0)`
  )
    .bind(crypto.randomUUID(), id, user.id)
    .run();

  return apiJson({ contractId: id });
}

/* ============================================================
   LIST CONTRACTS
============================================================ */
export async function listContracts(request, env, user) {
  const { results } = await env.DB_business.prepare(
    `SELECT c.*, o.type, o.terms
     FROM contracts c
     JOIN offers o ON c.offer_id = o.id
     WHERE o.from_user_id = ? OR o.to_user_id = ?
     ORDER BY c.created_at DESC`
  )
    .bind(user.id, user.id)
    .all();

  return apiJson({ contracts: results });
}

/* ============================================================
   CREATE AD
============================================================ */
export async function businessCreateAd(request, env, user) {
  const body = await request.json();
  const { title, image_r2_key, target_url, start_at, end_at } = body;

  const business = await env.DB_business.prepare(
    "SELECT id FROM businesses WHERE user_id = ?"
  )
    .bind(user.id)
    .first();

  if (!business) return apiJson({ message: "Business not found." }, 404);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_business.prepare(
    `INSERT INTO business_ads
     (id, business_id, title, image_r2_key, target_url, start_at, end_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
  )
    .bind(
      id,
      business.id,
      title,
      image_r2_key || null,
      target_url || null,
      start_at || null,
      end_at || null,
      now
    )
    .run();

  return apiJson({ adId: id });
}

/* ============================================================
   CREATE EVENT
============================================================ */
export async function businessCreateEvent(request, env, user) {
  const body = await request.json();
  const { title, description, location, lat, lng, start_at, end_at } = body;

  const business = await env.DB_business.prepare(
    "SELECT id FROM businesses WHERE user_id = ?"
  )
    .bind(user.id)
    .first();

  if (!business) return apiJson({ message: "Business not found." }, 404);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_business.prepare(
    `INSERT INTO events
     (id, type, title, description, location, lat, lng, start_at, end_at, created_by_business_id, created_at)
     VALUES (?, 'business', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      title,
      description || null,
      location || null,
      lat || null,
      lng || null,
      start_at || null,
      end_at || null,
      business.id,
      now
    )
    .run();

  return apiJson({ eventId: id });
}
