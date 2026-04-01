import { api } from "/js/core/api.js";

export async function init() {
  const container = document.getElementById("buyer-profile-container");
  const profile = await api("/buyer/profile/get");

  container.innerHTML = `
    <div class="profile-card">
      <h2>${profile.name}</h2>
      <p>${profile.city}, ${profile.state}</p>
      <p>${profile.phone || ""}</p>
    </div>
  `;
}
