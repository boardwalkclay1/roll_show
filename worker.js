export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // CORS
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors() });
      }

      /* ===========================
         AUTH
      =========================== */

      if (path === "/api/signup" && request.method === "POST") {
        return signup(request, env);
      }

      if (path === "/api/login" && request.method === "POST") {
        return login(request, env);
      }

      /* ===========================
         SHOWS (PUBLIC)
      =========================== */

      if (path === "/api/shows" && request.method === "GET") {
        return listShows(env);
      }

      if (path.startsWith("/api/shows/") && request.method === "GET") {
        const id = path.split("/").pop();
        return getShow(env, id);
      }

      /* ===========================
         BUYER ROUTES
      =========================== */

      if (path === "/api/tickets" && request.method === "GET") {
        return requireRole(request, env, ["buyer"], listTickets);
      }

      if (path === "/api/purchases" && request.method === "GET") {
        return requireRole(request, env, ["buyer"], listPurchases);
      }

      if (path === "/api/tickets/create" && request.method === "POST") {
        return requireRole(request, env, ["buyer"], createTicket);
      }

      /* ===========================
         SKATER ROUTES
      =========================== */

      if (path === "/api/skater/shows" && request.method === "GET") {
        return requireRole(request, env, ["skater"], listSkaterShows);
      }

      if (path === "/api/skater/show/create" && request.method === "POST") {
        return requireRole(request, env, ["skater"], createShow);
      }

      if (path === "/api/skater/profile" && request.method === "POST") {
        return requireRole(request, env, ["skater"], updateSkaterProfile);
      }

      /* ===========================
         BUSINESS ROUTES
      =========================== */

      if (path === "/api/business/register" && request.method === "POST") {
        return registerBusiness(request, env);
      }

      if (path === "/api/business/offers" && request.method === "POST") {
        return requireVerifiedBusiness(request, env, createOffer);
      }

      if (path === "/api/business/offers" && request.method === "GET") {
        return requireVerifiedBusiness(request, env, listBusinessOffers);
      }

      /* ===========================
         CONTRACTS
      =========================== */

      if (path === "/api/contracts" && request.method === "POST") {
        return requireRole(request, env, ["business", "skater"], createContract);
      }

      if (path === "/api/contracts" && request.method === "GET") {
        return requireRole(request, env, ["business", "skater"], listContracts);
      }

      /* ===========================
         MUSIC
      =========================== */

      if (path === "/api/music/upload" && request.method === "POST") {
        return requireRole(request, env, ["musician"], uploadTrack);
      }

      if (path === "/api/music/library" && request.method === "GET") {
        return listMusic(env);
      }

      if (path === "/api/music/license" && request.method === "POST") {
        return requireRole(request, env, ["skater"], licenseTrack);
      }

      /* ===========================
         WEBHOOK
      =========================== */

      if (path === "/api/webhooks/partner" && request.method === "POST") {
        return partnerWebhook(request, env);
      }

      return json({ error: "Not found" }, 404);

    } catch (err) {
      return json({ error: "Worker crashed", detail: String(err) }, 500);
    }
  }
};

/* ============================================================
   AUTH
============================================================ */

async function signup(request, env) {
  const { name, email, password, role } = await request.json();

  if (!name || !email || !password || !role) {
    return json({ success: false, error: "Missing fields" }, 400);
  }

  const exists = await env.DB.prepare(
    "SELECT id FROM users WHERE email = ?"
  ).bind(email).first();

  if (exists) {
    return json({ success: false, error: "Email already registered" }, 400);
  }

  const id = crypto.randomUUID();
  const created = new Date().toISOString();
  const hashed = await hash(password);

  await env.DB.prepare(
    `INSERT INTO users (id, name, email, password, role, verified, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, name, email, hashed, role, role === "business" ? 0 : 1, created).run();

  return json({
    success: true,
    user: { id, name, email, role, verified: role !== "business" }
  });
}

async function login(request, env) {
  const { email, password } = await request.json();

  const row = await env.DB.prepare(
    "SELECT * FROM users WHERE email = ?"
  ).bind(email).first();

  if (!row) return json({ success: false, error: "Invalid credentials" }, 401);

  const valid = await verify(password, row.password);
  if (!valid) return json({ success: false, error: "Invalid credentials" }, 401);

  return json({
    success: true,
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      verified: row.verified === 1,
      created_at: row.created_at
    }
  });
}

/* ============================================================
   ROLE GUARDS
============================================================ */

async function requireRole(request, env, allowedRoles, handler) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const user = await env.DB.prepare(
    "SELECT * FROM users WHERE id = ?"
  ).bind(userId).first();

  if (!user || !allowedRoles.includes(user.role)) {
    return json({ error: "Forbidden" }, 403);
  }

  return handler(request, env, user);
}

async function requireVerifiedBusiness(request, env, handler) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const user = await env.DB.prepare(
    "SELECT * FROM users WHERE id = ?"
  ).bind(userId).first();

  if (!user || user.role !== "business" || user.verified !== 1) {
    return json({ error: "Business not verified" }, 403);
  }

  return handler(request, env, user);
}

/* ============================================================
   SHOWS (PUBLIC)
============================================================ */

async function listShows(env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM shows ORDER BY created_at DESC"
  ).all();

  return json(results);
}

async function getShow(env, id) {
  const row = await env.DB.prepare(
    "SELECT * FROM shows WHERE id = ?"
  ).bind(id).first();

  if (!row) return json({ error: "Show not found" }, 404);

  return json(row);
}

/* ============================================================
   SKATER SHOWS
============================================================ */

async function listSkaterShows(request, env, user) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM shows WHERE skater_id = ? ORDER BY created_at DESC"
  ).bind(user.id).all();

  return json(results);
}

async function createShow(request, env, user) {
  const { title, description, premiere_date } = await request.json();

  if (!title) return json({ error: "Missing title" }, 400);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO shows (id, skater_id, title, description, premiere_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, user.id, title, description, premiere_date, now).run();

  return json({ success: true, showId: id });
}

/* ============================================================
   SKATER PROFILE
============================================================ */

async function updateSkaterProfile(request, env, user) {
  const { discipline, bio, clip_url } = await request.json();

  await env.DB.prepare(
    `UPDATE users SET discipline = ?, bio = ?, clip_url = ? WHERE id = ?`
  ).bind(discipline, bio, clip_url, user.id).run();

  return json({ success: true });
}

/* ============================================================
   BUSINESS
============================================================ */

async function registerBusiness(request, env) {
  const { name, email, website, description } = await request.json();

  const id = crypto.randomUUID();
  const created = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO business_requests (id, name, email, website, description, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, name, email, website, description, created).run();

  return json({ success: true, requestId: id });
}

async function createOffer(request, env, user) {
  const { skaterId, amount, terms } = await request.json();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO offers (id, business_id, skater_id, amount, terms, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`
  ).bind(id, user.id, skaterId, amount, terms, now).run();

  return json({ success: true, offerId: id });
}

async function listBusinessOffers(request, env, user) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM offers WHERE business_id = ? ORDER BY created_at DESC"
  ).bind(user.id).all();

  return json(results);
}

/* ============================================================
   CONTRACTS
============================================================ */

async function createContract(request, env, user) {
  const { offerId, details } = await request.json();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO contracts (id, offer_id, details, status, created_at)
     VALUES (?, ?, ?, 'pending', ?)`
  ).bind(id, offerId, details, now).run();

  return json({ success: true, contractId: id });
}

async function listContracts(request, env, user) {
  const { results } = await env.DB.prepare(
    `SELECT c.*, o.skater_id, o.business_id
     FROM contracts c
     JOIN offers o ON c.offer_id = o.id
     WHERE o.skater_id = ? OR o.business_id = ?
     ORDER BY c.created_at DESC`
  ).bind(user.id, user.id).all();

  return json(results);
}

/* ============================================================
   MUSIC
============================================================ */

async function uploadTrack(request, env, user) {
  const { title, url } = await request.json();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO music (id, artist_id, title, url, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(id, user.id, title, url, now).run();

  return json({ success: true, trackId: id });
}

async function listMusic(env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM music ORDER BY created_at DESC"
  ).all();

  return json(results);
}

async function licenseTrack(request, env, user) {
  const { trackId } = await request.json();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO music_licenses (id, track_id, skater_id, amount_cents, created_at)
     VALUES (?, ?, ?, 1000, ?)`
  ).bind(id, trackId, user.id, now).run();

  return json({ success: true, licenseId: id });
}

/* ============================================================
   TICKETS (BUYER)
============================================================ */

async function listTickets(request, env, user) {
  const { results } = await env.DB.prepare(
    `SELECT t.*, s.title, s.premiere_date
     FROM tickets t
     JOIN shows s ON t.show_id = s.id
     WHERE t.buyer_id = ? AND t.status = 'paid'
     ORDER BY t.created_at DESC`
  ).bind(user.id).all();

  return json(results);
}

async function listPurchases(request, env, user) {
  const { results } = await env.DB.prepare(
    `SELECT p.*, s.title
     FROM purchases p
     JOIN tickets t ON p.ticket_id = t.id
     JOIN shows s ON t.show_id = s.id
     WHERE p.buyer_id = ?
     ORDER BY p.created_at DESC`
  ).bind(user.id).all();

  return json(results);
}

async function createTicket(request, env, user) {
  const { showId } = await request.json();
  if (!showId) return json({ error: "Missing showId" }, 400);

  const id = crypto.randomUUID();
  const qr = `ROLLSHOW-${id}`;
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO tickets (id, show_id, buyer_id, qr_code, stamp, status, created_at)
     VALUES (?, ?, ?, ?, 'unverified', 'pending', ?)`
  ).bind(id, showId, user.id, qr, now).run();

  return json({ ticketId: id, status: "pending" });
}

/* ============================================================
   WEBHOOK
============================================================ */

async function partnerWebhook(request, env) {
  const body = await request.json();
  const { ticketId, amount_cents, partner_transaction_id, status } = body;

  if (status !== "paid") return json({ ok: true });

  const ticket = await env.DB.prepare(
    "SELECT buyer_id FROM tickets WHERE id = ?"
  ).bind(ticketId).first();

  if (!ticket) return json({ error: "Ticket not found" }, 404);

  await env.DB.prepare(
    "UPDATE tickets SET status = 'paid', stamp = 'verified' WHERE id = ?"
  ).bind(ticketId).run();

  const purchaseId = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
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

/* ============================================================
   HELPERS
============================================================ */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors() }
  });
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-user-id"
  };
}

async function hash(str) {
  const data = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verify(str, hashed) {
  return (await hash(str)) === hashed;
}
