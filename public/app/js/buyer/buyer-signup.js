// /app/js/buyer/buyer-signup.js
const form = document.getElementById("buyer-signup-form");
const errorEl = document.getElementById("buyer-signup-error");
const submitBtn = document.getElementById("buyer-signup-submit");

function showError(msg){ errorEl.textContent = msg; errorEl.style.display = "block"; }
function clearError(){ errorEl.textContent = ""; errorEl.style.display = "none"; }

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const fd = new FormData(form);
  const name = (fd.get("name") || "").trim();
  const email = (fd.get("email") || "").trim();
  const password = fd.get("password") || "";
  const passwordVerify = fd.get("password_verify") || "";
  const display_name = (fd.get("display_name") || "").trim();
  const billing_address = (fd.get("billing_address") || "").trim();

  if (!email) return showError("Please enter an email.");
  if (!password) return showError("Please enter a password.");
  if (password !== passwordVerify) return showError("Passwords do not match.");
  if (!display_name) return showError("Please enter a display name.");

  submitBtn.disabled = true;
  submitBtn.textContent = "Signing up…";

  try {
    const payload = {
      name,
      email,
      password,
      password_verify: passwordVerify,
      role: "buyer",
      display_name,
      billing_address: billing_address || null
    };

    const res = await fetch("/api/signup", {
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
