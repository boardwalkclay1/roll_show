// public/app/js/skater/skater-signup.js
import API from "/app/js/api.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("skater-signup-form");
  if (!form) return;

  const ERROR_ID = "skater-signup-error";
  const RETRY_ID = "skater-profile-retry";
  const SUBMIT_BTN = form.querySelector('button[type="submit"]');

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
    SUBMIT_BTN.textContent = isSubmitting ? "Saving…" : "Create Account";
  }

  function collectSignupPayload() {
    const fd = new FormData(form);
    const name = (fd.get("name") || "").trim() || null;
    const email = (fd.get("email") || "").trim();
    const password = fd.get("password") || "";
    const roleInput = form.querySelector('input[name="role"]');
    const role = (roleInput && roleInput.value) ? roleInput.value : "skater";
    return { name, email, password, role };
  }

  function collectProfilePayload() {
    const fd = new FormData(form);
    const stage_name = (fd.get("stage_name") || "").trim();
    const discipline = (fd.get("discipline") || "").trim();
    const subclass = (fd.get("subclass") || "").trim() || null;
    return { stage_name, discipline, subclass };
  }

  async function createProfile(profilePayload) {
    try {
      const res = await API.post("/api/profiles/skater", profilePayload);
      if (res && res.success) return { ok: true, res };
      if (res && (res.status === 409 || res.error === "profile_exists" || /exists/i.test(res.error?.message || ""))) {
        return { ok: true, res };
      }
      return { ok: false, error: res?.error || "Profile creation failed" };
    } catch (err) {
      return { ok: false, error: err?.message || "Network error during profile creation" };
    }
  }

  // Main submit: create user first, only then attempt profile creation
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const { name, email, password, role } = collectSignupPayload();
    if (!email || !password) {
      showError("Email and password are required.");
      return;
    }

    const profilePayload = collectProfilePayload();
    if (!profilePayload.stage_name) {
      showError("Stage name is required.");
      return;
    }
    if (!profilePayload.discipline) {
      showError("Discipline is required.");
      return;
    }

    setSubmitting(true);

    // 1) create users row (skater signup)
    let signupRes;
    try {
      signupRes = await API.post("/api/skater/signup", { name, email, password, role });
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

    // If server created both user and profile in one call, skip profile step
    if (signupRes.data && signupRes.data.profile_created === true) {
      window.location.href = "/pages/skater/skater-dashboard.html";
      return;
    }

    // 2) create skater profile (server derives user_id)
    const profileResult = await createProfile(profilePayload);

    if (!profileResult.ok) {
      showError(typeof profileResult.error === "string" ? profileResult.error : "Profile creation failed. Click retry.");
      retryEl.style.display = "inline-block";
      setSubmitting(false);
      return;
    }

    // success -> navigate to skater dashboard
    window.location.href = "/pages/skater/skater-dashboard.html";
  });

  // Retry only profile creation
  retryEl.addEventListener("click", async () => {
    clearError();
    retryEl.style.display = "none";
    setSubmitting(true);

    const profilePayload = collectProfilePayload();
    if (!profilePayload.stage_name) {
      showError("Stage name is required.");
      setSubmitting(false);
      return;
    }
    if (!profilePayload.discipline) {
      showError("Discipline is required.");
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

    window.location.href = "/pages/skater/skater-dashboard.html";
  });
});
