import { json } from "../utils.js";
import { requireRole } from "../users.js";

export async function ownerOverview(request, env) {
  return requireRole(request, env, ["owner"], async (_req, env) => {

    const total_users = await env.DB_users.prepare(
      "SELECT COUNT(*) AS c FROM users"
    ).first();

    const total_skaters = await env.DB_users.prepare(
      "SELECT COUNT(*) AS c FROM users WHERE role='skater'"
    ).first();

    const total_businesses = await env.DB_users.prepare(
      "SELECT COUNT(*) AS c FROM users WHERE role='business'"
    ).first();

    const total_musicians = await env.DB_users.prepare(
      "SELECT COUNT(*) AS c FROM users WHERE role='musician'"
    ).first();

    const total_shows = await env.DB_shows.prepare(
      "SELECT COUNT(*) AS c FROM shows"
    ).first();

    const total_tickets = await env.DB_shows.prepare(
      "SELECT COALESCE(SUM(tickets_sold),0) AS c FROM shows"
    ).first();

    const total_purchases = await env.DB_purchases.prepare(
      "SELECT COUNT(*) AS c FROM purchases"
    ).first();

    const total_revenue = await env.DB_purchases.prepare(
      "SELECT COALESCE(SUM(amount),0) AS c FROM purchases"
    ).first();

    return json({
      total_users: total_users.c,
      total_skaters: total_skaters.c,
      total_businesses: total_businesses.c,
      total_musicians: total_musicians.c,
      total_shows: total_shows.c,
      total_tickets: total_tickets.c,
      total_purchases: total_purchases.c,
      total_revenue: total_revenue.c
    });
  });
}
