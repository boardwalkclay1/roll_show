// /app/js/api.js — INTERNAL APP API CLIENT (NO AUTH LOGIC)

(function (global) {
  let API_BASE = "https://rollshow.boardwalkclay1.workers.dev";

  // Low-level fetch wrapper
  async function rawRequest(path, method = "GET", body = null, headers = {}) {
    const res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: false, error: "Invalid JSON", raw: text };
    }
  }

  // Attach user headers (used by dashboards ONLY)
  function withUser(user) {
    if (!user) return {};
    return {
      "Content-Type": "application/json",
      "x-user-id": user.id,
      "x-user-role": user.role
    };
  }

  // Restore old API.get
  function get(path, user) {
    return rawRequest(path, "GET", null, withUser(user));
  }

  // Restore old API.post
  function post(path, body, user) {
    return rawRequest(path, "POST", body, withUser(user));
  }

  // Restore old API.delete
  function del(path, user) {
    return rawRequest(path, "DELETE", null, withUser(user));
  }

  global.API = {
    init({ base }) {
      if (base) API_BASE = base;
    },
    raw: rawRequest,
    withUser,
    get,
    post,
    delete: del
  };
})(window);
