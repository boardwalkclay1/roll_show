// js/api.js — FINAL UNIFIED API CLIENT WITH MEDIA + AUTH HEADERS

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
      error: { message: "Server returned non‑JSON response" }
    };
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      status: res.status,
      data: null,
      error: { message: "Invalid JSON from server" }
    };
  }
}

/* ------------------------------------------------------------
   INTERNAL REQUEST HANDLER
------------------------------------------------------------ */
async function request(method, path, payload = null, extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const options = { method, headers };

  // JSON payload
  if (payload && !(payload instanceof FormData) && !(payload instanceof Blob)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(payload);
  }

  // FormData payload
  if (payload instanceof FormData) {
    options.body = payload;
  }

  // Binary payload (file upload)
  if (payload instanceof Blob) {
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

  /* ------------------------------------------------------------
     AUTH HEADERS (THE FIX)
  ------------------------------------------------------------ */
  withUser(user) {
    if (!user) return {};

    return {
      "x-user-id": user.id,
      "x-user-role": user.role
    };
  },

  /* ------------------------------------------------------------
     REAL-TIME POLLING
  ------------------------------------------------------------ */
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
  },

  /* ------------------------------------------------------------
     MEDIA API (R2 + KV)
  ------------------------------------------------------------ */
  media: {
    // Step 1: Initialize upload (get media ID + upload path)
    initUpload(type, file, user) {
      return request(
        "POST",
        "/api/media/init-upload",
        {
          type,
          filename: file.name,
          contentType: file.type,
          size: file.size
        },
        API.withUser(user)
      );
    },

    // Step 2: Upload file body (PUT binary)
    async uploadFile(mediaId, file, user) {
      return request(
        "PUT",
        `/api/media/upload/${mediaId}`,
        file,
        {
          "Content-Type": file.type,
          ...API.withUser(user)
        }
      );
    },

    // Step 3: Get metadata
    getMeta(mediaId, user) {
      return request(
        "GET",
        `/api/media/meta/${mediaId}`,
        null,
        API.withUser(user)
      );
    },

    // Step 4: Stream file (returns a real Response, not JSON)
    async getFile(mediaId, user) {
      const res = await fetch(API_BASE + `/api/media/file/${mediaId}`, {
        method: "GET",
        headers: API.withUser(user)
      });

      if (!res.ok) {
        return {
          success: false,
          status: res.status,
          error: { message: "Failed to fetch file" }
        };
      }

      return res; // caller handles blob/stream
    }
  }
};

export default API;
