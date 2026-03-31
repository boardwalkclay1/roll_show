import API from "../api.js";

const form = document.getElementById("intent-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    skate_style: form.skate_style.value,
    skate_location: form.skate_location.value,
    is_skater: form.is_skater.checked
  };

  // Save intent to backend
  const result = await API.post("/api/skater/intent", payload);

  // Redirect to signup with intent flag
  window.location.href = "/pages/skater-signup.html?intent=1";
});
