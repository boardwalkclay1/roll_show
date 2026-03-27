import { json } from "./utils.js";
import { signupBase } from "./users.js";

export async function signupBuyer(request, env) {
  const body = await request.json();
  body.role = "buyer";

  const base = await signupBase(env, body);
  if (base.error) return json({ success: false, error: base.error }, 400);

  await env.DB_buyers.prepare(
    `INSERT INTO buyers (id, user_id, phone, city, state, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    base.id,
    body.phone || null,
    body.city || null,
    body.state || null,
    base.created_at
  ).run();

  return json({ success: true, user: base });
}

export async function listTickets(request, env, user) {
  const buyer = await env.DB_buyers.prepare(
    "SELECT id FROM buyers WHERE user_id = ?"
  ).bind(user.id).first();

  const { results } = await env.DB_buyers.prepare(
    `SELECT t.*, s.title, s.premiere_date
     FROM tickets t
     JOIN shows s ON t.show_id = s.id
     WHERE t.buyer_id = ? AND t.status = 'paid'
     ORDER BY t.created_at DESC`
  ).bind(buyer.id).all();

  return json(results);
}

export async function listPurchases(request, env, user) {
  const buyer = await env.DB_buyers.prepare(
    "SELECT id FROM buyers WHERE user_id = ?"
  ).bind(user.id).first();

  const { results } = await env.DB_buyers.prepare(
    `SELECT p.*, s.title
     FROM purchases p
     JOIN tickets t ON p.ticket_id = t.id
     JOIN shows s ON t.show_id = s.id
     WHERE p.buyer_id = ?
     ORDER BY p.created_at DESC`
  ).bind(buyer.id).all();

  return json(results);
}

export async function createTicket(request, env, user) {
  const { showId } = await request.json();
  if (!showId) return json({ error: "Missing showId" }, 400);

  const buyer = await env.DB_buyers.prepare(
    "SELECT id FROM buyers WHERE user_id = ?"
  ).bind(user.id).first();

  const id = crypto.randomUUID();
  const qr = `ROLLSHOW-${id}`;
  const now = new Date().toISOString();

  await env.DB_buyers.prepare(
    `INSERT INTO tickets (id, show_id, buyer_id, qr_code, stamp, status, created_at)
     VALUES (?, ?, ?, ?, 'unverified', 'pending', ?)`
  ).bind(id, showId, buyer.id, qr, now).run();

  return json({ ticketId: id, status: "pending" });
}

export async function partnerWebhook(request, env) {
  const body = await request.json();
  const { ticketId, amount_cents, partner_transaction_id, status } = body;

  if (status !== "paid") return json({ ok: true });

  const ticket = await env.DB_buyers.prepare(
    "SELECT buyer_id FROM tickets WHERE id = ?"
  ).bind(ticketId).first();

  if (!ticket) return json({ error: "Ticket not found" }, 404);

  await env.DB_buyers.prepare(
    "UPDATE tickets SET status = 'paid', stamp = 'verified' WHERE id = ?"
  ).bind(ticketId).run();

  const purchaseId = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_buyers.prepare(
    `INSERT INTO purchases (id, buyer_id, ticket_id, amount_cents, partner_transaction_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    purchaseId,
    ticket.buyer_id,
    ticketId,
    amount_cents,
    partner_transaction_id,
    now
  ).run();

  return json({ ok: true });
}
