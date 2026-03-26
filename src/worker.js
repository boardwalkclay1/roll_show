export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    // --- CORS PRE-FLIGHT ---
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // --- STATIC ASSETS (Pages) ---
    if (
      pathname.startsWith("/app/") ||
      pathname === "/manifest.webmanifest" ||
      pathname === "/service-worker.js" ||
      pathname.endsWith(".html") ||
      pathname.endsWith(".css") ||
      pathname.endsWith(".js") ||
      pathname.endsWith(".png") ||
      pathname.endsWith(".jpg") ||
      pathname.endsWith(".jpeg") ||
      pathname.endsWith(".svg") ||
      pathname.endsWith(".webp")
    ) {
      return env.ASSETS.fetch(request);
    }

    // --- API ROUTES ---
    if (pathname === "/api/shows" && request.method === "GET") {
      return listShows(env);
    }

    if (pathname.startsWith("/api/shows/") && request.method === "GET") {
      const id = pathname.split("/").pop();
      return getShow(env, id);
    }

    if (pathname === "/api/tickets" && request.method === "GET") {
      return listBuyerTickets(request, env);
    }

    if (pathname === "/api/purchases" && request.method === "GET") {
      return listBuyerPurchases(request, env);
    }

    if (pathname === "/api/tickets/create" && request.method === "POST") {
      return createPendingTicket(request, env);
    }

    if (pathname === "/api/webhooks/partner" && request.method === "POST") {
      return handlePartnerWebhook(request, env);
    }

    // --- FALLBACK TO STATIC SITE ---
    return env.ASSETS.fetch(request);
  }
};
