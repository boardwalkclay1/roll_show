import { apiJson } from "./users.js";
import { signupBase } from "./users.js";

/* ============================================================
   BUYER SIGNUP
============================================================ */
export async function signupBuyer(request, env) {
  const body = await request.json();
  body.role = "buyer";

  const base = await signupBase(env, body);
  if (base.error) return apiJson({ message: base.error }, 400);

  await env.DB_users.prepare(
    `INSERT INTO buyers (id, user_id, phone, city, state, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      crypto.randomUUID(),
      base.id,
      body.phone || null,
      body.city || null,
      body.state || null,
      base.created_at
    )
    .run();

  return apiJson({ user: base });
}

/* ============================================================
   INTERNAL: GET BUYER RECORD
============================================================ */
async function getBuyer(env, userId) {
  return await env.DB_users.prepare(
    "SELECT id FROM buyers WHERE user_id = ?"
  )
    .bind(userId)
    .first();
}

/* ============================================================
   LIST TICKETS (PAID ONLY)
============================================================ */
export async function listTickets(request, env, user) {
  const buyer = await getBuyer(env, user.id);
  if (!buyer) return apiJson({ message: "Buyer not found" }, 404);

  const { results } = await env.DB_users.prepare(
    `SELECT 
        t.id,
        t.status,
        t.qr_code,
        t.created_at,
        s.title AS show_title,
        s.premiere_date AS date
     FROM tickets t
     JOIN shows s ON t.show_id = s.id
     WHERE t.buyer_id = ? 
       AND t.status = 'paid'
     ORDER BY t.created_at DESC`
  )
    .bind(buyer.id)
    .all();

  return apiJson({ tickets: results });
}

/* ============================================================
   LIST PURCHASES
============================================================ */
export async function listPurchases(request, env, user) {
  const buyer = await getBuyer(env, user.id);
  if (!buyer) return apiJson({ message: "Buyer not found" }, 404);

  const { results } = await env.DB_users.prepare(
    `SELECT 
        p.id,
        p.amount_cents,
        p.created_at,
        s.title AS show_title
     FROM purchases p
     JOIN tickets t ON p.ticket_id = t.id
     JOIN shows s ON t.show_id = s.id
     WHERE p.buyer_id = ?
     ORDER BY p.created_at DESC`
  )
    .bind(buyer.id)
    .all();

  return apiJson({ purchases: results });
}

/* ============================================================
   CREATE TICKET (PENDING)
============================================================ */
export async function createTicket(request, env, user) {
  const { showId } = await request.json();
  if (!showId) return apiJson({ message: "Missing showId" }, 400);

  const buyer = await getBuyer(env, user.id);
  if (!buyer) return apiJson({ message: "Buyer not found" }, 404);

  const id = crypto.randomUUID();
  const qr = `ROLLSHOW-${id}`;
  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO tickets 
       (id, show_id, buyer_id, qr_code, stamp, status, created_at)
     VALUES (?, ?, ?, ?, 'unverified', 'pending', ?)`
  )
    .bind(id, showId, buyer.id, qr, now)
    .run();

  return apiJson({ ticketId: id, status: "pending" });
}

/* ============================================================
   PARTNER WEBHOOK (MARK PAID)
============================================================ */
export async function partnerWebhook(request, env) {
  const body = await request.json();
  const { ticketId, amount_cents, partner_transaction_id, status } = body;

  // Only process paid events
  if (status !== "paid") return apiJson({ ok: true });

  const ticket = await env.DB_users.prepare(
    "SELECT buyer_id FROM tickets WHERE id = ?"
  )
    .bind(ticketId)
    .first();

  if (!ticket) return apiJson({ message: "Ticket not found" }, 404);

  // Mark ticket as paid + verified
  await env.DB_users.prepare(
    "UPDATE tickets SET status = 'paid', stamp = 'verified' WHERE id = ?"
  )
    .bind(ticketId)
    .run();

  // Create purchase record
  const purchaseId = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO purchases 
       (id, buyer_id, ticket_id, amount_cents, partner_transaction_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      purchaseId,
      ticket.buyer_id,
      ticketId,
      amount_cents,
      partner_transaction_id,
      now
    )
    .run();

  return apiJson({ ok: true });
}
