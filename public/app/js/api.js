// /app/js/api.js — SHARED INTERNAL API CLIENT
// -------------------------------------------
// Used ONLY after login for: tickets, notifications,
// dashboards, messages, updates, etc.
// No login/signup/auth logic. No routing logic. No helpers.

(function (global) {
  let API_BASE = "https://rollshow.boardwalkclay1.workers.dev";

  // Raw XHR transport — no logic, no decisions
  function rawRequest(url, method = "GET", body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, true);

      for (const [k, v] of Object.entries(headers)) {
        xhr.setRequestHeader(k, v);
      }

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          resolve({
            status: xhr.status,
            text: xhr.responseText
          });
        }
      };

      xhr.onerror = () => reject("Network error");
      xhr.send(body);
    });
  }

  // Public API — ONE function only
  global.API = {
    raw(path, method = "GET", body = null, headers = {}) {
      return rawRequest(API_BASE + path, method, body, headers);
    },

    init({ base }) {
      if (base) API_BASE = base;
    }
  };
})(window);
