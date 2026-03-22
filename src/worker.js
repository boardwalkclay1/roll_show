export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://roll-show.pages.dev",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // AUTH
    if (path === "/api/signup" && request.method === "POST") {
      return signup(request, env, corsHeaders);
    }

    if (path === "/api/login" && request.method === "POST") {
      return login(request, env, corsHeaders);
    }

    // SHOWS
    if (path === "/api/create-show" && request.method === "POST") {
      return createShow(request, env, corsHeaders);
    }

    if (path === "/api/get-shows" && request.method === "GET") {
      return getShows(env, corsHeaders);
    }

    if (path === "/api/buy-ticket" && request.method === "POST") {
      return buyTicket(request, env, corsHeaders);
    }

    // STATIC
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      return addCors(assetResponse, corsHeaders);
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  }
};

// -----------------------------
// CORS WRAPPER
// -----------------------------
function addCors(response, corsHeaders) {
  const newHeaders = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders)) {
    newHeaders.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    headers: newHeaders
  });
}

// -----------------------------
// AUTH HELPERS
// -----------------------------
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// -----------------------------
// SIGNUP
// -----------------------------
async function signup(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const passwordHash = await hashPassword(data.password);

    await env.DB.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, data.name, data.email, passwordHash, data.role, now).run();

    return addCors(Response.json({ success: true, user_id: id }), corsHeaders);

  } catch (err) {
    return addCors(Response.json({ success: false, error: err.message }), corsHeaders);
  }
}

// -----------------------------
// LOGIN
// -----------------------------
async function login(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const passwordHash = await hashPassword(data.password);

    const user = await env.DB.prepare(
      "SELECT * FROM users WHERE email = ?"
    ).bind(data.email).first();

    if (!user) {
      return addCors(Response.json({ success: false, error: "User not found" }), corsHeaders);
    }

    if (user.password_hash !== passwordHash) {
      return addCors(Response.json({ success: false, error: "Invalid password" }), corsHeaders);
    }

    return addCors(Response.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }), corsHeaders);

  } catch (err) {
    return addCors(Response.json({ success: false, error: err.message }), corsHeaders);
  }
}

// -----------------------------
// CREATE SHOW
// -----------------------------
async function createShow(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO shows (
        id, skater_id, title, tagline, description,
        discipline, price, premiere_date, video_id,
        status, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, data.skater_id, data.title, data.tagline, data.description,
      data.discipline, data.price, data.premiereDate, data.videoSource,
      "scheduled", now
    ).run();

    return addCors(Response.json({ success: true, id }), corsHeaders);

  } catch (err) {
    return addCors(Response.json({ success: false, error: err.message }), corsHeaders);
  }
}

// -----------------------------
// GET SHOWS
// -----------------------------
async function getShows(env, corsHeaders) {
  try {
    const shows = await env.DB
      .prepare("SELECT * FROM shows ORDER BY created_at DESC")
      .all();

    return addCors(Response.json(shows.results), corsHeaders);

  } catch (err) {
    return addCors(Response.json({ success: false, error: err.message }), corsHeaders);
  }
}

// -----------------------------
// BUY TICKET
// -----------------------------
async function buyTicket(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO tickets (id, show_id, buyer_id, purchase_time, status)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, data.show_id, data.buyer_id, now, "valid").run();

    return addCors(Response.json({ success: true, ticket_id: id }), corsHeaders);

  } catch (err) {
    return addCors(Response.json({ success: false, error: err.message }), corsHeaders);
  }
}
