// /app/js/api.js — ROLL SHOW GLOBAL SAFE API CLIENT (UMD / browser global)
// Finalized: stable defaults, configurable init, robust parsing, timeout support,
// consistent normalized response shape, safe cookie-friendly defaults.

(function (global) {
  // Configurable defaults (can be changed via API.init)
  let API_BASE_PAGES = "https://roll-show.pages.dev";
  let API_BASE_WORKER = "https://rollshow.boardwalkclay1.workers.dev";
  let DEFAULT_TIMEOUT_MS = 15000;

  /* SAFE PARSE RESPONSE
     Returns: { ok, status, body, contentType, error }
  */
  async function safeParseResponse(res) {
    const status = res.status;
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const text = await res.text();

    if (!text) {
      return {
        ok: res.ok,
        status,
        body: null,
        contentType,
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
          contentType,
          error: parsed && parsed.error ? parsed.error : (res.ok ? null : { message: "Request failed", status })
        };
      } catch (err) {
        return {
          ok: res.ok,
          status,
          body: null,
          contentType,
          error: { message: "Invalid JSON", status }
        };
      }
    }

    // Non-JSON: return raw text
    return {
      ok: res.ok,
      status,
      body: text,
      contentType,
      error: res.ok ? null : { message: "Non-JSON response", status }
    };
  }

  /* FETCH WITH TIMEOUT */
  function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    if (!timeoutMs || timeoutMs <= 0) return fetch(url, options);
    const controller = new AbortController();
    const signal = controller.signal;
    const opts = Object.assign({}, options, { signal });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, opts).finally(() => clearTimeout(timer));
  }

  /* NORMALIZE PARSED RESPONSE
     Public shape: { success, status, data, user, error }
  */
  function normalizeParsed(parsed) {
    const body = parsed.body;
    const status = parsed.status || 0;
    let success = parsed.ok || false;
    let data = null;
    let user = undefined;
    let error = parsed.error || null;

    if (body && typeof body === "object") {
      if (typeof body.success !== "undefined") success = !!body.success;
      if (body.data !== undefined) data = body.data;
      if (body.user !== undefined) user = body.user;
      if (body.error) error = body.error;

      if (data === null) {
        if (success) {
          data = body;
        } else if (!body.data && body.user) {
          data = body;
        } else {
          data = body;
        }
      }
    } else {
      data = body;
    }

    return { success, status, data, user, error };
  }

  /* CORE REQUEST */
  async function request(method, path, payload = null, extraHeaders = {}, opts = {}) {
    if (!path || typeof path !== "string" || !path.startsWith("/")) {
      throw new Error("API request path must start with '/'");
    }

    const headers = Object.assign({}, extraHeaders);
    const options = {
      method,
      headers,
      // 🔥 CRITICAL FIX: allow cross-site cookies (Pages → Worker)
      credentials: "include"
    };

    if (payload && !(payload instanceof FormData) && !(payload instanceof Blob)) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(payload);
    } else if (payload instanceof FormData || payload instanceof Blob) {
      options.body = payload;
    }

    const timeoutMs = typeof opts.timeoutMs === "number" ? opts.timeoutMs : DEFAULT_TIMEOUT_MS;

    async function fetchAndNormalize(fullUrl) {
      try {
        const res = await fetchWithTimeout(fullUrl, options, timeoutMs);
        const parsed = await safeParseResponse(res);
        return normalizeParsed(parsed);
      } catch (err) {
        const isAbort = err && err.name === "AbortError";
        return {
          success: false,
          status: 0,
          data: null,
          user: undefined,
          error: { message: isAbort ? "Request timed out" : "Network error", detail: err?.message }
        };
      }
    }

    // API routes should prefer Worker
    if (path.startsWith("/api/") || opts.forceWorker) {
      return await fetchAndNormalize(API_BASE_WORKER + path);
    }

    // Non-API: try Pages first, fallback to Worker
    try {
      const pagesResult = await fetchAndNormalize(API_BASE_PAGES + path);
      if (!pagesResult.success && pagesResult.status >= 400 && !opts.forcePages) {
        const workerResult = await fetchAndNormalize(API_BASE_WORKER + path);
        if (workerResult.success || workerResult.status !== pagesResult.status) return workerResult;
      }
      return pagesResult;
    } catch {
      return await fetchAndNormalize(API_BASE_WORKER + path);
    }
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
        if (!user) return {};
        return {
          "x-user-id": user.id,
          "x-user-role": user.role
        };
      },

      init({ pagesBase, workerBase, defaultTimeoutMs } = {}) {
        if (pagesBase && typeof pagesBase === "string") API_BASE_PAGES = pagesBase;
        if (workerBase && typeof workerBase === "string") API_BASE_WORKER = workerBase;
        if (typeof defaultTimeoutMs === "number" && defaultTimeoutMs > 0) {
          DEFAULT_TIMEOUT_MS = defaultTimeoutMs;
        }
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
