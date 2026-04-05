// /js/api.js — ROLL SHOW STABLE VERSION

const API_BASE = "/api";

/* ---------------- SAFE JSON PARSER ---------------- */
async function safeJson(res) {
  const text = await res.text();
  const type = res.headers.get("content-type") || "";

  if (!type.includes("application/json")) {
    return {
      success: false,
      status: res.status,
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
      user: undefined,
      error: { message: "Invalid JSON" }
    };
  }
}

/* ---------------- INTERNAL REQUEST ---------------- */
async function request(method, path, payload = null, extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const options = { method, headers };

  if (payload && !(payload instanceof FormData) && !(payload instanceof Blob)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(payload);
  }

  if (payload instanceof FormData || payload instanceof Blob) {
    options.body = payload;
  }

  let res;
  try {
    res = await fetch(API_BASE + path, options);
  } catch {
    return {
      success: false,
      status: 0,
      user: undefined,
      error: { message: "Network error" }
    };
  }

  const body = await safeJson(res);

  return {
    success: body.success ?? res.ok ?? false,
    status: res.status,
    user: body.user ?? body.data ?? undefined,
    error: body.error ?? (res.ok ? null : { message: "Request failed" })
  };
}

/* ---------------- PUBLIC API ---------------- */
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

  withUser(user) {
    if (!user) return {};
    return {
      "x-user-id": user.id,
      "x-user-role": user.role
    };
  }
};

// expose globally
window.API = API;
