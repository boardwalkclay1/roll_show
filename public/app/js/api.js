// /app/js/api.js — ROLL SHOW GLOBAL SAFE API CLIENT (CLEAN FINAL)
// - Cookie support (credentials: "include")
// - Worker-first for /api/*
// - Stable fallback logic
// - Safe JSON parsing
// - Unified normalized response shape
// - Timeout support (no .finally on fetch)
// - Explicit error reporting

(function (global) {
  let API_BASE_PAGES = "https://roll-show.pages.dev";
  let API_BASE_WORKER = "https://rollshow.boardwalkclay1.workers.dev";
  let DEFAULT_TIMEOUT_MS = 15000;

  /* SAFE PARSE */
  async function safeParseResponse(res) {
    const status = res.status;
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const text = await res.text();

    if (!text) {
      return {
        ok: res.ok,
        status,
        body: null,
        error: res.ok ? null : { message: "Empty response", status }
      };
    }

    if (contentType.includes("application/json")) {
      try {
        const parsed = JSON.parse(text);
        return {
          ok: res.ok,
          status,
          body: parsed,
          error: parsed?.error || (res.ok ? null : { message: "Request failed", status })
        };
      } catch {
        return {
          ok: res.ok,
          status,
          body: null,
          error: { message: "Invalid JSON", status }
        };
      }
    }

    return {
      ok: res.ok,
      status,
      body: text,
      error: res.ok ? null : { message: "Non-JSON response", status }
    };
  }

  /* TIMEOUT WRAPPER (NO .finally ON PROMISE) */
  async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const opts = { ...options, signal: controller.signal };

    try {
      return await fetch(url, opts);
    } finally {
      clearTimeout(timer);
    }
  }

  /* NORMALIZE */
  function normalize(parsed) {
    const body = parsed.body;
    const status = parsed.status;
    let success = parsed.ok;
    let data = null;
    let user = undefined;
    let error = parsed.error;

    if (body && typeof body === "object") {
      if ("success" in body) success = !!body.success;
      if ("data" in body) data = body.data;
      if ("user" in body) user = body.user;
      if (body.error) error = body.error;

      if (data === null) data = body;
    } else {
      data = body;
    }

    return { success, status, data, user, error };
  }

  /* CORE REQUEST */
  async function request(method, path, payload = null, extraHeaders = {}, opts = {}) {
    if (!path || typeof path !== "string" || !path.startsWith("/")) {
      throw new Error("API path must be a string starting with '/'");
    }

    const headers = { ...extraHeaders };
    const options = {
      method,
      headers,
      credentials: "include"
    };

    if (payload && !(payload instanceof FormData) && !(payload instanceof Blob)) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(payload);
    } else if (payload) {
      options.body = payload;
    }

    const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;

    async function run(fullUrl) {
      try {
        const res = await fetchWithTimeout(fullUrl, options, timeoutMs);
        const parsed = await safeParseResponse(res);
        return normalize(parsed);
      } catch (err) {
        const isAbort = err && err.name === "AbortError";
        return {
          success: false,
          status: 0,
          data: null,
          user: undefined,
          error: {
            message: isAbort ? "Request timed out" : "Network error",
            detail: err && err.message ? err.message : String(err || "Unknown error")
          }
        };
      }
    }

    // API routes → Worker only
    if (path.startsWith("/api/") || opts.forceWorker) {
      return await run(API_BASE_WORKER + path);
    }

    // Non-API → Pages first, fallback to Worker
    const pagesResult = await run(API_BASE_PAGES + path);
    if (!pagesResult.success && pagesResult.status >= 400 && !opts.forcePages) {
      const workerResult = await run(API_BASE_WORKER + path);
      if (workerResult.success || workerResult.status !== pagesResult.status) {
        return workerResult;
      }
    }
    return pagesResult;
  }

  /* PUBLIC API */
  if (!global.API) {
    global.API = {
      get(path, headers = {}, opts = {}) {
        return request("GET", path, null, headers, opts);
      },
      post(path, payload = null, headers = {}, opts = {}) {
        return request("POST", path, payload, headers, opts);
      },
      put(path, payload = null, headers = {}, opts = {}) {
        return request("PUT", path, payload, headers, opts);
      },
      delete(path, headers = {}, opts = {}) {
        return request("DELETE", path, null, headers, opts);
      },

      withUser(user) {
        return user
          ? { "x-user-id": user.id, "x-user-role": user.role }
          : {};
      },

      init({ pagesBase, workerBase, defaultTimeoutMs } = {}) {
        if (pagesBase) API_BASE_PAGES = pagesBase;
        if (workerBase) API_BASE_WORKER = workerBase;
        if (defaultTimeoutMs > 0) DEFAULT_TIMEOUT_MS = defaultTimeoutMs;
      },

      _bases: {
        get pages() { return API_BASE_PAGES; },
        get worker() { return API_BASE_WORKER; },
        get timeoutMs() { return DEFAULT_TIMEOUT_MS; }
      },

      legal: {
        accept(payload, headers = {}, opts = {}) {
          return request("POST", "/api/legal/accept", payload, headers, opts);
        }
      }
    };
  }
})(window);
