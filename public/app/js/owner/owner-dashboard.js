import API from "/js/api.js";

function user() {
  return JSON.parse(localStorage.getItem("user") || "{}");
}

async function loadOwnerDashboard() {
  const headers = API.withUser(user());
  const res = await API.get("/api/owner/overview", headers);

  if (!res.success) return console.error(res.error);

  const { users, shows, revenue } = res.data;

  document.getElementById("owner-users").innerHTML = `
    <h3>Total Users</h3>
    <strong>${users.total}</strong>
  `;

  document.getElementById("owner-shows").innerHTML = `
    <h3>Total Shows</h3>
    <strong>${shows.total}</strong>
  `;

  document.getElementById("owner-revenue").innerHTML = `
    <h3>Revenue</h3>
    <strong>$${(revenue.total / 100).toFixed(2)}</strong>
  `;
}

document.addEventListener("DOMContentLoaded", loadOwnerDashboard);
