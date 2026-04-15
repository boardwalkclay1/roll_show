// routes/owner.js — cleaned owner dashboard
import { apiJson, requireRole } from "../users.js";

export async function ownerDashboard(request, env) {
  return requireRole(request, env, ["owner"], async () => {
    const db = env.DB_roll;

    // parallel counts
    const tables = [
      "users",
      "skater_profiles",
      "business_profiles",
      "musician_profiles",
      "buyer_profiles",
      "shows",
      "tickets",
      "merch_orders",
      "skate_card_sales"
    ];

    const countPromises = tables.map((t) =>
      db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()
    );
    const countRows = await Promise.all(countPromises);
    const [
      total_users,
      total_skaters,
      total_businesses,
      total_musicians,
      total_buyers,
      total_shows,
      total_tickets,
      total_merch_orders,
      total_skatecard_sales
    ] = countRows.map(r => Number(r?.n || 0));

    // total revenue (cents)
    const revenueRow = await db.prepare(`
      SELECT COALESCE(SUM(price_cents), 0) AS total
      FROM (
        SELECT price_cents FROM tickets
        UNION ALL
        SELECT price_cents FROM merch_orders
        UNION ALL
        SELECT price_cents FROM skate_card_sales
      )
    `).first();
    const total_revenue = Number(revenueRow?.total || 0);

    // recent activity
    const recentUsersRes = await db.prepare(`
      SELECT id, email, role, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `).all();
    const recent_users = recentUsersRes?.results || [];

    const recentReportsRes = await db.prepare(`
      SELECT r.*, u.email AS reporter_email
      FROM feed_reports r
      LEFT JOIN users u ON u.id = r.reporter_id
      ORDER BY r.created_at DESC
      LIMIT 10
    `).all();
    const recent_reports = recentReportsRes?.results || [];

    const recentErrorsRes = await db.prepare(`
      SELECT *
      FROM error_logs
      ORDER BY created_at DESC
      LIMIT 10
    `).all();
    const recent_errors = recentErrorsRes?.results || [];

    const analytics_chips = [
      { label: "Users", value: total_users, link: "/owner/users" },
      { label: "Skaters", value: total_skaters, link: "/owner/skaters" },
      { label: "Businesses", value: total_businesses, link: "/owner/businesses" },
      { label: "Musicians", value: total_musicians, link: "/owner/musicians" },
      { label: "Buyers", value: total_buyers, link: "/owner/buyers" },
      { label: "Shows", value: total_shows, link: "/owner/shows" },
      { label: "Tickets", value: total_tickets, link: "/owner/tickets" },
      { label: "Merch Orders", value: total_merch_orders, link: "/owner/merch" },
      { label: "Skatecard Sales", value: total_skatecard_sales, link: "/owner/skatecards" },
      { label: "Revenue", value: total_revenue / 100, link: "/owner/revenue" }
    ];

    const ghost_buttons = [
      { label: "Users", icon: "users", link: "/owner/users" },
      { label: "Skaters", icon: "skate", link: "/owner/skaters" },
      { label: "Businesses", icon: "briefcase", link: "/owner/businesses" },
      { label: "Musicians", icon: "music", link: "/owner/musicians" },
      { label: "Shows", icon: "ticket", link: "/owner/shows" },
      { label: "Contracts", icon: "file", link: "/owner/contracts" },
      { label: "Reports", icon: "flag", link: "/owner/reports" },
      { label: "Errors", icon: "alert", link: "/owner/errors" },
      { label: "Webhooks", icon: "link", link: "/owner/webhooks" },
      { label: "Branding", icon: "palette", link: "/owner/branding" },
      { label: "Notes", icon: "note", link: "/owner/notes" },
      { label: "Sponsorships", icon: "star", link: "/owner/sponsorships" }
    ];

    const burger_menu = [
      { label: "Owner Dashboard", link: "/owner" },
      { label: "Skater Dashboard", link: "/skater" },
      { label: "Business Dashboard", link: "/business" },
      { label: "Musician Dashboard", link: "/musician" },
      { label: "Buyer Dashboard", link: "/buyer" },
      { label: "Admin Tools", link: "/admin" }
    ];

    return apiJson({
      layout: "owner_dashboard",
      analytics_chips,
      ghost_buttons,
      burger_menu,
      recent_users,
      recent_reports,
      recent_errors
    });
  });
}
