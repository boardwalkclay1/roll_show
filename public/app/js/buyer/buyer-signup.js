// public/app/js/buyer/buyer-signup.js
import API from "/app/js/api.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("buyer-signup-form");
  if (!form) return;

  const ERROR_ID = "buyer-signup-error";
  const RETRY_ID = "buyer-profile-retry";
  const SUBMIT_BTN = form.querySelector('button[type="submit"]');

  // ensure error element exists
  let errorEl = document.getElementById(ERROR_ID);
  if (!errorEl) {
    errorEl = document.createElement("div");
    errorEl.id = ERROR_ID;
    errorEl.style.color = "#ff4d4f";
    errorEl.style.marginTop = "12px";
    errorEl.style.fontWeight = "600";
    errorEl.setAttribute("role", "alert");
    errorEl.style.display = "none";
    form.appendChild(errorEl);
  }

  // ensure retry button placeholder
  let retryEl = document.getElementById(RETRY_ID);
  if (!retryEl) {
    retryEl = document.createElement("button");
    retryEl.id = RETRY_ID;
    retryEl.type = "button";
    retryEl.textContent = "Retry profile creation";
    retryEl.style.display = "none";
    retryEl.style.marginTop = "10px";
    retryEl.style.padding = "10px 14px";
    retryEl.style.borderRadius = "8px";
    retryEl.style.cursor = "pointer";
    form.appendChild(retryEl);
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = "block";
  }

  function clearError() {
    errorEl.textContent = "";
    errorEl.style.display = "none";
    retryEl.style.display = "none";
  }

  function setSubmitting(isSubmitting) {
    if (!SUBMIT_BTN) return;
    SUBMIT_BTN.disabled = isSubmitting;
    SUBMIT_BTN.textContent = isSubmitting ? "Saving…" : "Sign Up";
  }

  // collect profile payload from form (buyer-specific)
  function collectProfilePayload() {
    const fd = new FormData(form);
    const display_name = (fd.get("display_name") || "").trim();
    const billing_address = (fd.get("billing_address") || "").trim() || null;
    return { display_name, billing_address };
  }

  // collect signup payload (users table only)
  function collectSignupPayload() {
    const fd = new FormData(form);
    const name = (fd.get("name") || "").trim() || null;
    const email = (fd.get("email") || "").trim();
    const password = fd.get("password") || "";
    // role is page-specific; prefer hidden input if present
    const roleInput = form.querySelector('input[name="role"]');
    const role = (roleInput && roleInput.value) ? roleInput.value : "buyer";
    return { name, email, password, role };
  }

  // call profile endpoint; returns true on success (including idempotent existing)
  async function createProfile(profilePayload) {
    try {
      const res = await API.post("/api/profiles/buyer", profilePayload);
      // treat success
      if (res && res.success) return { ok: true, res };
      // handle idempotent case: server might return 409 or a specific code/message
      if (res && (res.status === 409 || res.error === "profile_exists" || /exists/i.test(res.error?.message || ""))) {
        return { ok: true, res };
      }
      return { ok: false, error: res?.error || "Profile creation failed" };
    } catch (err) {
      return { ok: false, error: err?.message || "Network error during profile creation" };
    }
  }

  // main submit flow: signup -> profile
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const { name, email, password, role } = collectSignupPayload();
    if (!email || !password) {
      showError("Email and password are required.");
      return;
    }

    // basic profile validation
    const profilePayload = collectProfilePayload();
    if (!profilePayload.display_name) {
      showError("Display name is required.");
      return;
    }

    setSubmitting(true);

    // 1) create users row
    let signupRes;
    try {
      signupRes = await API.post("/api/signup", { name, email, password, role });
    } catch (err) {
      console.error("Signup network error", err);
      showError("Network error during signup. Please try again.");
      setSubmitting(false);
      return;
    }

    if (!signupRes || !signupRes.success) {
      const msg = signupRes?.error?.message || signupRes?.error || "Signup failed. Please check your details.";
      showError(msg);
      setSubmitting(false);
      return;
    }

    // At this point server should have created users row and set session cookie or returned token.
    // 2) create buyer profile
    const profileResult = await createProfile(profilePayload);

    if (!profileResult.ok) {
      // show profile error and allow retry (only profile call)
      showError(typeof profileResult.error === "string" ? profileResult.error : "Profile creation failed. Click retry.");
      retryEl.style.display = "inline-block";
      setSubmitting(false);
      return;
    }

    // success: navigate to buyer final page
    // final page path (adjust if your app uses a different path)
    window.location.href = "/pages/buyer/buyer-dashboard.html";
  });

  // retry handler: only calls profile endpoint
  retryEl.addEventListener("click", async () => {
    clearError();
    retryEl.style.display = "none";
    setSubmitting(true);

    const profilePayload = collectProfilePayload();
    if (!profilePayload.display_name) {
      showError("Display name is required.");
      setSubmitting(false);
      return;
    }

    const profileResult = await createProfile(profilePayload);
    if (!profileResult.ok) {
      showError(typeof profileResult.error === "string" ? profileResult.error : "Profile creation failed. Try again.");
      retryEl.style.display = "inline-block";
      setSubmitting(false);
      return;
    }

    window.location.href = "/pages/buyer/buyer-dashboard.html";
  });
});
