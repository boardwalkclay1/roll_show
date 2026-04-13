// public/app/js/skater/skater-signup.js
import API from "/app/js/api.js";

const form = document.getElementById("skater-signup-form");
const errorEl = document.getElementById("skater-signup-error");

function showError(msg) {
  if (!errorEl) return alert(msg);
  errorEl.textContent = msg;
  errorEl.style.display = "block";
}

function clearError() {
  if (!errorEl) return;
  errorEl.textContent = "";
  errorEl.style.display = "none";
}

function detectRole() {
  const bodyRole = document.body?.dataset?.role;
  if (bodyRole) return bodyRole;
  const path = location.pathname.split("/").filter(Boolean);
  const possible = ["skater", "musician", "buyer", "business", "owner"];
  for (const seg of path) if (possible.includes(seg)) return seg;
  return "skater";
}

if (form) {
  const role = detectRole() || "skater";

  // ensure hidden role input exists for form semantics (optional)
  (function ensureHiddenRoleInput() {
    let hidden = form.querySelector('input[name="role"][type="hidden"]');
    if (!hidden) {
      hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = "role";
      form.appendChild(hidden);
    }
    hidden.value = role;
  })();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const fd = new FormData(form);
    const name = (fd.get("name") || "").trim() || null;
    const email = (fd.get("email") || "").trim();
    const password = fd.get("password") || "";

    if (!email || !password) {
      showError("Email and password are required.");
      return;
    }

    // Only call API via the shared API module. Payload is users-only.
    const payload = { name, email, password, role };

    try {
      const res = await API.post("/api/signup", payload);

      if (!res || !res.success) {
        const msg = res?.error?.message || res?.error || "Signup failed. Try again.";
        showError(msg);
        return;
      }

      // Prefer server-returned role if present
      const returnedRole = res.role || role;
      const redirectMap = {
        skater: "/onboard/skater",
        musician: "/onboard/musician",
        buyer: "/onboard/buyer",
        business: "/onboard/business",
        owner: "/dashboard"
      };

      const next = redirectMap[returnedRole] || "/dashboard";
      window.location.href = next;

    } catch (err) {
      console.error("Signup error", err);
      showError("Network error. Please try again.");
    }
  });
}
