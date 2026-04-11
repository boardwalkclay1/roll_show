// ROLL SHOW — GLOBAL SAFE API CLIENT (FULL REBUILD)

// Always prefer Pages domain (no CORS), fallback to Worker for API routes
window.API_BASE_PAGES  = "https://roll-show.pages.dev";
window.API_BASE_WORKER = "https://rollshow.boardwalkclay1.workers.dev";

/* -------------------------------------------------------
   SAFE JSON PARSER
------------------------------------------------------- */
async function safeJson(res) {
  const text = await res.text();
  const type = res.headers.get("content-type") || "";

  if (!type.toLowerCase().includes("application/json")) {
    return {
      success: false,
      status: res.status,
      data: null,
      user: undefined,
      error: { message: "Non-JSON response" }
    };
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      status: res.status,
      data: null,
      user: undefined,
      error: { message: "Invalid JSON" }
    };
  }
}

/* -------------------------------------------------------
   INTERNAL REQUEST HANDLER (FULLY FIXED)
------------------------------------------------------- */
async function request(method, path, payload = null, extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const options = { method, headers };

  // JSON payload
  if (payload && !(payload instanceof FormData) && !(payload instanceof Blob)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(payload);
  }

  // FormData / Blob payload
  if (payload instanceof FormData || payload instanceof Blob) {
    options.body = payload;
  }

  let res;

  try {
    // Try Pages first
    res = await fetch(window.API_BASE_PAGES + path, options);
  } catch {
    // Pages unreachable → go straight to Worker
    res = await fetch(window.API_BASE_WORKER + path, options);
    const body = await safeJson(res);
    return {
      success: body.success ?? res.ok ?? false,
      status: res.status,
      data: body.data ?? null,
      user: body.user ?? undefined,
      error: body.error ?? null
    };
  }

  // If Pages returns ANY non-OK status → fallback to Worker
  if (!res.ok) {
    try {
      res = await fetch(window.API_BASE_WORKER + path, options);
    } catch {
      return {
        success: false,
        status: 0,
        data: null,
        user: undefined,
        error: { message: "Network error" }
      };
    }
  }

  const body = await safeJson(res);

  return {
    success: body.success ?? res.ok ?? false,
    status: res.status,
    data: body.data ?? null,
    user: body.user ?? undefined,
    error: body.error ?? (res.ok ? null : { message: "Request failed" })
  };
}

/* -------------------------------------------------------
   PUBLIC API (SAFE AGAINST DUPLICATE LOADS)
------------------------------------------------------- */
if (!window.API) {
  window.API = {
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

    withUser(user) {
      if (!user) return {};
      return {
        "x-user-id": user.id,
        "x-user-role": user.role
      };
    }
  };
}
