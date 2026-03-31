import { json } from "./users.js";
import { signupBase } from "./users.js";

/* ============================================================
   BUSINESS SIGNUP
============================================================ */
export async function signupBusiness(request, env) {
  const body = await request.json();
  body.role = "business";

  const base = await signupBase(env, body);
  if (base.error) return json({ success: false, error: base.error }, 400);

  await env.DB_business.prepare(
    `INSERT INTO businesses (id, user_id, company_name, website, verified, created_at)
     VALUES (?, ?, ?, ?, 0, ?)`
  ).bind(
    crypto.randomUUID(),
    base.id,
    body.company_name || body.name || null,
    body.website || null,
    base.created_at
  ).run();

  return json({ success: true, user: base });
}

/* ============================================================
   BUSINESS DASHBOARD
============================================================ */
export async function businessDashboard(request, env, user) {
  const business = await env.DB_business.prepare(
    "SELECT * FROM businesses WHERE user_id = ?"
  ).bind(user.id).first();

  const { results: offers } = await env.DB_business.prepare(
    `SELECT o.*, u.name AS skater_name
     FROM offers o
     JOIN users u ON o.to_user_id = u.id OR o.from_user_id = u.id
     WHERE (o.from_user_id = ? OR o.to_user_id = ?)
       AND (u.role = 'skater')
     ORDER BY o.created_at DESC`
  ).bind(user.id, user.id).all();

  const { results: contracts } = await env.DB_business.prepare(
    `SELECT c.*, o.type, o.terms
     FROM contracts c
     JOIN offers o ON c.offer_id = o.id
     WHERE o.from_user_id = ? OR o.to_user_id = ?
     ORDER BY c.created_at DESC`
  ).bind(user.id, user.id).all();

  return json({
    business,
    offers,
    contracts
  });
}

/* ============================================================
   CREATE OFFER (BUSINESS → SKATER)
============================================================ */
export async function createOffer(request, env, user) {
  const { skaterId, type, amount_cents, terms } = await request.json();

  const target = await env.DB_users.prepare(
    "SELECT role FROM users WHERE id = ?"
  ).bind(skaterId).first();

  if (!target || target.role !== "skater") {
    return json({ error: "Businesses may only send offers to skaters." }, 403);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_business.prepare(
    `INSERT INTO offers (id, from_user_id, to_user_id, type, amount_cents, terms, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).bind(id, user.id, skaterId, type, amount_cents, terms, now).run();

  return json({ success: true, offerId: id });
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
  ).bind(user.id).all();

  return json(results);
}

/* ============================================================
   CREATE CONTRACT
============================================================ */
export async function createContract(request, env, user) {
  const { offerId, details } = await request.json();

  const offer = await env.DB_business.prepare(
    `SELECT * FROM offers WHERE id = ? AND (from_user_id = ? OR to_user_id = ?)`
  ).bind(offerId, user.id, user.id).first();

  if (!offer) {
    return json({ error: "Offer not found or not associated with this business." }, 404);
  }

  if (offer.status !== "accepted") {
    return json({ error: "Skater must accept the offer before creating a contract." }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_business.prepare(
    `INSERT INTO contracts (id, offer_id, details, status, created_at)
     VALUES (?, ?, ?, 'pending', ?)`
  ).bind(id, offerId, details, now).run();

  await env.DB_business.prepare(
    `INSERT INTO contract_participants (id, contract_id, user_id, role_in_contract, percentage, signed)
     VALUES (?, ?, ?, 'business', NULL, 0)`
  ).bind(crypto.randomUUID(), id, user.id).run();

  return json({ success: true, contractId: id });
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
  ).bind(user.id, user.id).all();

  return json(results);
}
