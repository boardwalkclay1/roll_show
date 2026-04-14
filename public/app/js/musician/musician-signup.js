// /app/js/musician/musician-signup.js
// Client-side musician signup: password verify, basic validation, POST to API.

const form = document.getElementById("musician-signup-form");
const errorEl = document.getElementById("musician-signup-error");
const submitBtn = document.getElementById("musician-signup-submit");

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.style.display = "block";
}

function clearError() {
  errorEl.textContent = "";
  errorEl.style.display = "none";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const fd = new FormData(form);
  const name = (fd.get("name") || "").trim();
  const email = (fd.get("email") || "").trim();
  const password = fd.get("password") || "";
  const passwordVerify = fd.get("password_verify") || "";
  const stage_name = (fd.get("stage_name") || "").trim();
  const genre = (fd.get("genre") || "").trim();
  const role = fd.get("role") || "musician";

  if (!email) return showError("Please enter an email.");
  if (!password) return showError("Please enter a password.");
  if (password !== passwordVerify) return showError("Passwords do not match.");
  if (!stage_name) return showError("Please enter a stage name.");
  if (!genre) return showError("Please enter a genre.");

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating…";

  try {
    const payload = {
      name,
      email,
      password,
      password_verify: passwordVerify,
      role,
      stage_name,
      genre
    };

    const res = await fetch("/api/signup/musician", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "same-origin"
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data) {
      showError((data && data.message) || "Signup failed. Please try again.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Create Account";
      return;
    }

    if (data.success) {
      window.location.href = data.redirect || "/pages/onboarding-musician.html";
      return;
    } else {
      showError(data.message || data.profile_error || "Signup failed. Please check your input.");
    }
  } catch (err) {
    showError("Network error. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create Account";
  }
});
