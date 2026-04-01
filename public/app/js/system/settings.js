import API from "/js/api.js";

function user() {
  return JSON.parse(localStorage.getItem("user") || "{}");
}

async function loadSettings() {
  const headers = API.withUser(user());
  const res = await API.get("/api/settings", headers);

  if (!res.success) return console.error(res.error);

  document.getElementById("settings-account").innerHTML =
    JSON.stringify(res.data.account || {}, null, 2);

  document.getElementById("settings-payment").innerHTML =
    JSON.stringify(res.data.payment || {}, null, 2);
}

document.addEventListener("DOMContentLoaded", loadSettings);
