// library.js
import { apiJson } from "./users.js";

/* ============================================================
   GET BUYER LIBRARY (ALL TYPES)
============================================================ */
export async function getBuyerLibrary(request, env, user) {
  const buyer = await env.DB_users.prepare(
    "SELECT id FROM buyer_profiles WHERE user_id = ?"
  ).bind(user.id).first();

  if (!buyer) return apiJson({ message: "Buyer profile not found" }, 404);

  // Skate cards
  const { results: cards } = await env.DB_users.prepare(
    `SELECT c.*, l.acquired_at
     FROM buyer_skate_card_library l
     JOIN skate_cards c ON c.id = l.card_id
     WHERE l.buyer_id = ?
     ORDER BY l.acquired_at DESC`
  )
    .bind(buyer.id)
    .all();

  // Merch orders
  const { results: merch } = await env.DB_users.prepare(
    `SELECT o.*, m.title, m.image_url
     FROM merch_orders o
     JOIN merch_items m ON m.id = o.merch_id
     WHERE o.buyer_profile_id = ?
     ORDER BY o.created_at DESC`
  )
    .bind(buyer.id)
    .all();

  // Tickets
  const { results: tickets } = await env.DB_users.prepare(
    `SELECT t.*, s.title AS show_title, s.start_time
     FROM tickets t
     JOIN shows s ON s.id = t.show_id
     WHERE t.buyer_profile_id = ?
     ORDER BY t.purchased_at DESC`
  )
    .bind(buyer.id)
    .all();

  return apiJson({
    cards,
    merch,
    tickets
  });
}
