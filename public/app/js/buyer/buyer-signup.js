// buyer-signup.js
import API from "./api.js";

const form = document.getElementById("buyer-signup-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(form);
  const payload = {
    role: "buyer",
    name: fd.get("name"),
    email: fd.get("email"),
    password: fd.get("password")
  };

  try {
    const user = await API.post("/api/signup", payload);
    window.location.href = `/pages/buyer-dashboard.html?user=${encodeURIComponent(
      user.id
    )}`;
  } catch (err) {
    console.error(err);
    alert("There was an issue creating your buyer account.");
  }
});
