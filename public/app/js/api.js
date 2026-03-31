// api.js — FINAL VERSION FOR UNIFIED API

const API_BASE = "https://rollshow.boardwalkclay1.workers.dev";

async function safeJson(res) {
  const text = await res.text();

  // Worker fallback HTML → JSON parse error → detect it
  if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
    return {
      success: false,
      status: res.status,
      data: null,
      error: { message: "Worker returned HTML instead of JSON" }
    };
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      status: res.status,
      data: null,
      error: { message: "Invalid JSON response" }
    };
  }
}

const API = {
  async get(path) {
    const res = await fetch(API_BASE + path, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    const body = await safeJson(res);

    // Always return unified shape
    return {
      success: body.success ?? res.ok,
      status: body.status ?? res.status,
      data: body.data ?? null,
      error: body.error ?? (res.ok ? null : { message: "Request failed" })
    };
  },

  async post(path, payload) {
    const res = await fetch(API_BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const body = await safeJson(res);

    return {
      success: body.success ?? res.ok,
      status: body.status ?? res.status,
      data: body.data ?? null,
      error: body.error ?? (res.ok ? null : { message: "Request failed" })
    };
  }
};

export default API;
