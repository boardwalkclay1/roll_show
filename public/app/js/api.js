// /app/js/api.js — XHR-ONLY VERSION (NO FETCH)
// Aligned to use the Worker for /api/* routes by default

(function (global) {
  let API_BASE_PAGES = "https://roll-show.pages.dev";
  let API_BASE_WORKER = "https://rollshow.boardwalkclay1.workers.dev";
  let DEFAULT_TIMEOUT_MS = 15000;

  /* XHR WRAPPER */
  function xhrRequest(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(options.method || "GET", url, true);

      // cookie support for cross-site requests
      xhr.withCredentials = options.credentials === "include";

      if (options.headers) {
        for (const [k, v] of Object.entries(options.headers)) {
          xhr.setRequestHeader(k, v);
        }
      }

      xhr.timeout = timeoutMs;

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          const headers = new Headers();
          const raw = (xhr.getAllResponseHeaders() || "").trim().split(/[\r\n]+/);
          for (const line of raw) {
            const parts = line.split(": ");
            const key = parts.shift();
            const value = parts.join(": ");
            if (key) headers.append(key.toLowerCase(), value);
          }

          resolve(new Response(xhr.responseText, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers
          }));
        }
      };

      xhr.onerror = () => reject(new Error("Network error"));
      xhr.ontimeout = () => reject(new DOMException("Request timed out", "AbortError"));

      xhr.send(options.body || null);
    });
  }

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
    if (!path.startsWith("/")) throw new Error("API path must start with '/'");

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
        const res = await xhrRequest(fullUrl, options, timeoutMs);
        const parsed = await safeParseResponse(res);
        return normalize(parsed);
      } catch (err) {
        const isAbort = err?.name === "AbortError";
        return {
          success: false,
          status: 0,
          data: null,
          user: undefined,
          error: {
            message: isAbort ? "Request timed out" : "Network error",
            detail: err?.message || String(err)
          }
        };
      }
    }

    // API routes → Worker only (ensures auth endpoints, /api/* go to worker)
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
          // legal acceptance endpoint expects form-data; keep as POST to /api/legal/accept
          return request("POST", "/api/legal/accept", payload, headers, opts);
        }
      }
    };
  }
})(window);
