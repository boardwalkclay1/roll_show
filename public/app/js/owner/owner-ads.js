import API from "/app/js/api.js";

const user = JSON.parse(localStorage.getItem("user") || "{}");
const adsTable = document.querySelector("#ads-table tbody");

async function loadAds() {
  const res = await API.get("/api/owner/ads", API.withUser(user));
  if (!res.success) return;

  const ads = res.data.ads || [];

  adsTable.innerHTML = ads.map(a => `
    <tr>
      <td>${a.id}</td>
      <td>${a.business_name}</td>
      <td>${a.media_type}</td>
      <td>
        <span class="status-pill status-${a.status}">
          ${a.status}
        </span>
      </td>
      <td>${new Date(a.created_at).toLocaleString()}</td>
      <td>
        <button class="btn-approve" data-id="${a.id}">Approve</button>
        <button class="btn-reject" data-id="${a.id}">Reject</button>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll(".btn-approve").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      await API.post("/api/owner/ads", { adId: id, status: "approved" }, API.withUser(user));
      loadAds();
    });
  });

  document.querySelectorAll(".btn-reject").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      await API.post("/api/owner/ads", { adId: id, status: "rejected" }, API.withUser(user));
      loadAds();
    });
  });
}

loadAds();
