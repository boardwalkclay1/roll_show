// /app/js/buyer/buyer-signup.js
// Client-side signup logic: password verify, basic validation, POST to API.

const form = document.getElementById("buyer-signup-form");
const errorEl = document.getElementById("buyer-signup-error");
const submitBtn = document.getElementById("buyer-signup-submit");

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

  const formData = new FormData(form);
  const name = (formData.get("name") || "").trim();
  const email = (formData.get("email") || "").trim();
  const password = formData.get("password") || "";
  const passwordVerify = formData.get("password_verify") || "";
  const display_name = (formData.get("display_name") || "").trim();
  const billing_address = (formData.get("billing_address") || "").trim();
  const role = formData.get("role") || "buyer";

  // Basic client-side validation
  if (!email) return showError("Please enter an email.");
  if (!password) return showError("Please enter a password.");
  if (password !== passwordVerify) return showError("Passwords do not match.");
  if (!display_name) return showError("Please enter a display name.");

  // Disable submit while request is in-flight
  submitBtn.disabled = true;
  submitBtn.textContent = "Signing up…";

  try {
    const payload = {
      name,
      email,
      password,
      password_verify: passwordVerify,
      role,
      display_name,
      billing_address: billing_address || null
    };

    const res = await fetch("/api/signup/buyer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "same-origin"
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data) {
      showError((data && data.message) || "Signup failed. Please try again.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign Up";
      return;
    }

    if (data.success) {
      // Redirect to onboarding or dashboard as appropriate
      window.location.href = data.redirect || "/pages/onboarding-buyer.html";
      return;
    } else {
      showError(data.message || "Signup failed. Please check your input.");
    }
  } catch (err) {
    showError("Network error. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign Up";
  }
});
