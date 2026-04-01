import API from "/js/api.js";

function user() {
  return JSON.parse(localStorage.getItem("user") || "{}");
}

async function loadProfile() {
  const headers = API.withUser(user());
  const res = await API.get("/api/musician/dashboard", headers);

  if (!res.success) return console.error(res.error);

  const { musician, tracks, albums, collabs, feed } = res.data;

  document.getElementById("musician-name").textContent = musician.name;
  document.getElementById("musician-genre").textContent = musician.genre || "";
  document.getElementById("musician-location").textContent =
    musician.city && musician.state ? `${musician.city}, ${musician.state}` : "";
  document.getElementById("musician-bio").textContent = musician.bio || "";

  const avatar = document.getElementById("musician-avatar");
  avatar.style.backgroundImage = musician.avatar_url
    ? `url(${musician.avatar_url})`
    : "url(/assets/icons/default-avatar.png)";

  renderMini("profile-tracks", tracks, t => t.title);
  renderMini("profile-albums", albums, a => a.title);
  renderMini("profile-collabs", collabs, c => c.title);
  renderFeed("profile-feed", feed);
}

function renderMini(id, items, label) {
  const el = document.getElementById(id);
  el.innerHTML = "";
  (items || []).forEach(i => {
    const div = document.createElement("div");
    div.className = "mini-item";
    div.textContent = label(i);
    el.appendChild(div);
  });
}

function renderFeed(id, posts) {
  const el = document.getElementById(id);
  el.innerHTML = "";
  (posts || []).forEach(p => {
    const div = document.createElement("div");
    div.className = "feed-item";
    div.innerHTML = `
      <div class="feed-header">
        <span>${p.author_name}</span>
        <span>${p.created_at}</span>
      </div>
      <p>${p.content}</p>
    `;
    el.appendChild(div);
  });
}

document.addEventListener("DOMContentLoaded", loadProfile);
