import API from "../api.js";

const form = document.getElementById("buyer-signup-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(form);

  const user = await API.post("/api/signup", {
    role: "buyer",
    name: fd.get("name"),
    email: fd.get("email"),
    password: fd.get("password")
  });

  window.location.href = `/pages/buyer/buyer-dashboard.html?user=${user.id}`;
});
