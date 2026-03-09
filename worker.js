export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/create-show" && request.method === "POST") {
      return createShow(request, env);
    }

    if (path === "/api/get-shows") {
      return getShows(env);
    }

    if (path === "/api/buy-ticket" && request.method === "POST") {
      return buyTicket(request, env);
    }

    return new Response("Not found", { status: 404 });
  }
};

async function createShow(request, env) {
  const data = await request.json();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO shows (id, skater_id, title, tagline, description, discipline, price, premiere_date, video_id, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    data.skater_id,
    data.title,
    data.tagline,
    data.description,
    data.discipline,
    data.price,
    data.premiereDate,
    data.videoSource,
    "scheduled",
    now
  ).run();

  return Response.json({ success: true, id });
}

async function getShows(env) {
  const shows = await env.DB.prepare("SELECT * FROM shows ORDER BY created_at DESC").all();
  return Response.json(shows.results);
}

async function buyTicket(request, env) {
  const data = await request.json();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Insert ticket
  await env.DB.prepare(`
    INSERT INTO tickets (id, show_id, buyer_id, purchase_time, status)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    id,
    data.show_id,
    data.buyer_id,
    now,
    "valid"
  ).run();

  // TODO: call your payout workflow (15% to you, 85% to skater)

  return Response.json({ success: true, ticket_id: id });
}
