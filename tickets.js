// tickets.js
import { apiJson } from "./users.js";

/* ============================================================
   INTERNAL: GET BUYER PROFILE
============================================================ */
async function getBuyerProfile(env, userId) {
  return await env.DB_users.prepare(
    "SELECT * FROM buyer_profiles WHERE user_id = ?"
  ).bind(userId).first();
}

/* ============================================================
   CREATE TICKET (RESERVED)
============================================================ */
export async function createTicket(request, env, user) {
  const { show_id, ticket_type = "standard" } = await request.json();
  if (!show_id) return apiJson({ message: "Missing show_id" }, 400);

  const buyer = await getBuyerProfile(env, user.id);
  if (!buyer) return apiJson({ message: "Buyer profile not found" }, 404);

  const show = await env.DB_users.prepare(
    "SELECT * FROM shows WHERE id = ?"
  ).bind(show_id).first();

  if (!show) return apiJson({ message: "Show not found" }, 404);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const price_cents = (show.base_price_cents || 0) + (show.booking_fee_cents || 0);
  const qr_code_url = `/qr/ticket/${id}`;

  await env.DB_users.prepare(
    `INSERT INTO tickets (
       id, show_id, buyer_profile_id, purchaser_user_id,
       ticket_type, price_cents, status, purchased_at,
       funding_applied, checkin_status, checkin_at, qr_code_url
     )
     VALUES (?, ?, ?, ?, ?, ?, 'reserved', ?, 0, 'none', NULL, ?)`
  )
    .bind(id, show_id, buyer.id, user.id, ticket_type, price_cents, now, qr_code_url)
    .run();

  return apiJson({
    ticket_id: id,
    status: "reserved",
    price_cents,
    qr_code_url
  });
}

/* ============================================================
   MARK TICKET CHARGED (WEBHOOK)
============================================================ */
export async function markTicketCharged(request, env) {
  const { ticket_id, amount_cents, partner_transaction_id, status } = await request.json();

  if (status !== "charged") return apiJson({ ok: true });

  const ticket = await env.DB_users.prepare(
    "SELECT * FROM tickets WHERE id = ?"
  ).bind(ticket_id).first();

  if (!ticket) return apiJson({ message: "Ticket not found" }, 404);

  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `UPDATE tickets
     SET status = 'charged',
         purchased_at = ?
     WHERE id = ?`
  ).bind(now, ticket_id).run();

  return apiJson({ ok: true });
}

/* ============================================================
   CHECK-IN TICKET
============================================================ */
export async function checkInTicket(request, env) {
  const { ticket_id } = await request.json();
  if (!ticket_id) return apiJson({ message: "Missing ticket_id" }, 400);

  const ticket = await env.DB_users.prepare(
    "SELECT * FROM tickets WHERE id = ?"
  ).bind(ticket_id).first();

  if (!ticket) return apiJson({ message: "Ticket not found" }, 404);

  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `UPDATE tickets
     SET checkin_status = 'there',
         checkin_at = ?
     WHERE id = ?`
  ).bind(now, ticket_id).run();

  return apiJson({ ok: true, checkin_at: now });
}

/* ============================================================
   LIST BUYER TICKETS
============================================================ */
export async function listTickets(request, env, user) {
  const buyer = await getBuyerProfile(env, user.id);
  if (!buyer) return apiJson({ message: "Buyer profile not found" }, 404);

  const { results } = await env.DB_users.prepare(
    `SELECT 
        t.id AS ticket_id,
        t.ticket_type,
        t.price_cents,
        t.status,
        t.purchased_at,
        t.qr_code_url,
        t.checkin_status,
        s.title AS show_title,
        s.start_time,
        s.end_time,
        s.city,
        s.state
     FROM tickets t
     JOIN shows s ON s.id = t.show_id
     WHERE t.buyer_profile_id = ?
     ORDER BY t.purchased_at DESC`
  ).bind(buyer.id).all();

  return apiJson({ tickets: results });
}
