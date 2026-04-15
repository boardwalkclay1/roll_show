// /app/js/login.js — direct fetch login handler

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("auth-login-form");
  const errorBox = document.getElementById("auth-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.hidden = true;
    errorBox.textContent = "";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const payload = JSON.stringify({ email, password });

    let data;
    try {
      const res = await fetch("https://rollshow.boardwalkclay1.workers.dev/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload
      });

      data = await res.json();
    } catch (err) {
      errorBox.textContent = "Network error";
      errorBox.hidden = false;
      return;
    }

    if (!data.success) {
      errorBox.textContent = data.error || "Login failed";
      errorBox.hidden = false;
      return;
    }

    window.location.href = "/pages/dashboard.html";
  });
});
