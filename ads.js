// ads.js
import { apiJson } from "./users.js";

/* ============================================================
   INTERNAL: GET BUSINESS PROFILE
============================================================ */
async function getBusiness(env, userId) {
  return await env.DB_users.prepare(
    "SELECT * FROM business_profiles WHERE user_id = ?"
  )
    .bind(userId)
    .first();
}

/* ============================================================
   CREATE SPONSORSHIP CAMPAIGN
============================================================ */
export async function createSponsorshipCampaign(request, env, user) {
  const business = await getBusiness(env, user.id);
  if (!business) return apiJson({ message: "Business profile not found" }, 404);
  if (!business.ad_account_enabled) {
    return apiJson({ message: "Ad account not enabled" }, 403);
  }

  const {
    title,
    description,
    campaign_type = "general",
    show_id,
    budget_cents,
    coupon_code,
    coupon_percent,
    duration_days
  } = await request.json();

  if (!title || !budget_cents) {
    return apiJson({ message: "Missing title or budget_cents" }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO sponsorship_campaigns (
       id, business_id, title, description,
       campaign_type, show_id,
       budget_cents, coupon_code, coupon_percent, duration_days,
       status, created_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
  )
    .bind(
      id,
      business.id,
      title,
      description || null,
      campaign_type,
      show_id || null,
      budget_cents,
      coupon_code || null,
      coupon_percent || null,
      duration_days || null,
      now
    )
    .run();

  return apiJson({ campaign_id: id, status: "active" });
}

/* ============================================================
   LIST BUSINESS CAMPAIGNS
============================================================ */
export async function listBusinessCampaigns(request, env, user) {
  const business = await getBusiness(env, user.id);
  if (!business) return apiJson({ message: "Business profile not found" }, 404);

  const { results } = await env.DB_users.prepare(
    `SELECT *
     FROM sponsorship_campaigns
     WHERE business_id = ?
     ORDER BY created_at DESC`
  )
    .bind(business.id)
    .all();

  return apiJson({ campaigns: results });
}

/* ============================================================
   CREATE SPONSORSHIP OFFER TO SKATER
============================================================ */
export async function createSponsorshipOffer(request, env, user) {
  const business = await getBusiness(env, user.id);
  if (!business) return apiJson({ message: "Business profile not found" }, 404);

  const {
    campaign_id,
    skater_id,
    offer_type = "sponsorship",
    show_id,
    terms_json
  } = await request.json();

  if (!campaign_id || !skater_id) {
    return apiJson({ message: "Missing campaign_id or skater_id" }, 400);
  }

  // Ensure campaign belongs to this business
  const campaign = await env.DB_users.prepare(
    "SELECT * FROM sponsorship_campaigns WHERE id = ? AND business_id = ?"
  )
    .bind(campaign_id, business.id)
    .first();

  if (!campaign) {
    return apiJson({ message: "Campaign not found or not owned by business" }, 404);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO sponsorship_offers (
       id, campaign_id, skater_id,
       offer_type, show_id,
       status, terms_json,
       created_at, updated_at
     )
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, NULL)`
  )
    .bind(
      id,
      campaign_id,
      skater_id,
      offer_type,
      show_id || null,
      terms_json ? JSON.stringify(terms_json) : null,
      now
    )
    .run();

  return apiJson({ offer_id: id, status: "pending" });
}

/* ============================================================
   SKATER: LIST SPONSORSHIP OFFERS
============================================================ */
export async function listSkaterOffers(request, env, user) {
  const skater = await env.DB_users.prepare(
    "SELECT id FROM skater_profiles WHERE user_id = ?"
  )
    .bind(user.id)
    .first();

  if (!skater) return apiJson({ message: "Skater profile not found" }, 404);

  const { results } = await env.DB_users.prepare(
    `SELECT 
        o.*,
        c.title AS campaign_title,
        c.campaign_type,
        b.brand_name,
        b.company_name
     FROM sponsorship_offers o
     JOIN sponsorship_campaigns c ON c.id = o.campaign_id
     JOIN business_profiles b ON b.id = c.business_id
     WHERE o.skater_id = ?
     ORDER BY o.created_at DESC`
  )
    .bind(skater.id)
    .all();

  return apiJson({ offers: results });
}

/* ============================================================
   SKATER: RESPOND TO OFFER
============================================================ */
export async function respondToOffer(request, env, user) {
  const { offer_id, action, terms_json } = await request.json();

  const skater = await env.DB_users.prepare(
    "SELECT id FROM skater_profiles WHERE user_id = ?"
  )
    .bind(user.id)
    .first();

  if (!skater) return apiJson({ message: "Skater profile not found" }, 404);

  const offer = await env.DB_users.prepare(
    "SELECT * FROM sponsorship_offers WHERE id = ? AND skater_id = ?"
  )
    .bind(offer_id, skater.id)
    .first();

  if (!offer) return apiJson({ message: "Offer not found" }, 404);

  let newStatus;
  if (action === "accept") newStatus = "accepted";
  else if (action === "reject") newStatus = "rejected";
  else if (action === "modify") newStatus = "modified";
  else return apiJson({ message: "Invalid action" }, 400);

  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `UPDATE sponsorship_offers
     SET status = ?,
         terms_json = COALESCE(?, terms_json),
         updated_at = ?
     WHERE id = ?`
  )
    .bind(
      newStatus,
      terms_json ? JSON.stringify(terms_json) : null,
      now,
      offer_id
    )
    .run();

  return apiJson({ offer_id, status: newStatus });
}
