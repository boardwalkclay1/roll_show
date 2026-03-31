// api.js — FIXED UNIFIED API

const API_BASE = "https://rollshow.boardwalkclay1.workers.dev";

async function safeJson(res) {
  const text = await res.text();

  // Worker fallback HTML → detect immediately
  if (!res.headers.get("content-type")?.includes("application/json")) {
    return {
      success: false,
      status: res.status,
      data: null,
      error: { message: "Invalid response from server" }
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

async function request(method, path, payload) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" }
  };

  if (payload) options.body = JSON.stringify(payload);

  let res;
  try {
    res = await fetch(API_BASE + path, options);
  } catch (err) {
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

const API = {
  get(path) {
    return request("GET", path);
  },
  post(path, payload) {
    return request("POST", path, payload);
  }
};

export default API;
