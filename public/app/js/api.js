// js/api.js — FINAL UNIFIED API CLIENT WITH REAL-TIME POLLING

const API_BASE = "https://rollshow.boardwalkclay1.workers.dev";

/* ------------------------------------------------------------
   SAFE JSON PARSER
------------------------------------------------------------ */
async function safeJson(res) {
  const text = await res.text();
  const type = res.headers.get("content-type") || "";

  if (!type.includes("application/json")) {
    return {
      success: false,
      status: res.status,
      data: null,
      error: { message: "Non‑JSON response from server" }
    };
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      status: res.status,
      data: null,
      error: { message: "Invalid JSON" }
    };
  }
}

/* ------------------------------------------------------------
   INTERNAL REQUEST HANDLER
------------------------------------------------------------ */
async function request(method, path, payload, extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const options = { method, headers };

  if (payload && !(payload instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(payload);
  }

  if (payload instanceof FormData) {
    options.body = payload;
  }

  let res;
  try {
    res = await fetch(API_BASE + path, options);
  } catch {
    return {
      success: false,
      status: 0,
      data: null,
      error: { message: "Network error" }
    };
  }

  const body = await safeJson(res);

  return {
    success: body.success ?? res.ok,
    status: body.status ?? res.status,
    data: body.data ?? null,
    error: body.error ?? (res.ok ? null : { message: "Request failed" })
  };
}

/* ------------------------------------------------------------
   PUBLIC API
------------------------------------------------------------ */
const API = {
  get(path, headers = {}) {
    return request("GET", path, null, headers);
  },

  post(path, payload, headers = {}) {
    return request("POST", path, payload, headers);
  },

  put(path, payload, headers = {}) {
    return request("PUT", path, payload, headers);
  },

  delete(path, headers = {}) {
    return request("DELETE", path, null, headers);
  },

  upload(path, formData, headers = {}) {
    return request("POST", path, formData, headers);
  },

  withUser(user) {
    if (!user || !user.id || !user.role) return {};
    return {
      "x-user-id": user.id,
      "x-user-role": user.role
    };
  },

  /**
   * REAL-TIME POLLING
   * Usage:
   *   const stop = API.poll("/api/notifications", {
   *     interval: 5000,
   *     headers: API.withUser(user),
   *     onData: (res) => { ... }
   *   });
   *   // later: stop();
   */
  poll(path, { interval = 5000, headers = {}, onData } = {}) {
    let stopped = false;

    async function tick() {
      if (stopped) return;
      const res = await request("GET", path, null, headers);
      if (onData) onData(res);
      setTimeout(tick, interval);
    }

    tick();

    return () => {
      stopped = true;
    };
  }
};

export default API;
