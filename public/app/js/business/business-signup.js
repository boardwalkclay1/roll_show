// app/js/business/business-signup.js
import API from "../api.js";

const form = document.getElementById("business-signup-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(form);

  try {
    const res = await API.post("/api/business/signup", {
      name: fd.get("name"),
      email: fd.get("email"),
      password: fd.get("password")
    });

    if (!res.success) {
      alert("Signup failed: " + res.error);
      return;
    }

    alert("Account created! Please log in.");
    window.location.href = "/pages/auth-login.html?role=business";

  } catch (err) {
    console.error(err);
    alert("Signup failed. Please try again.");
  }
});
