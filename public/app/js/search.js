import API from "/app/js/api.js";

const user = JSON.parse(localStorage.getItem("user") || "{}");

const inputEl = document.getElementById("global-search-input");
const btnEl = document.getElementById("global-search-btn");
const roleFilterEl = document.getElementById("global-search-role-filter");
const tagFilterEl = document.getElementById("global-search-tag-filter");
const resultsEl = document.getElementById("search-results");

function roleLabel(role) {
  if (!role) return "";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function renderTagsLine(tags) {
  if (!tags || !tags.length) return "";
  return tags.slice(0, 10).map(t => `#${t}`).join(" ");
}

async function loadTagsForSearch() {
  const res = await API.get("/api/users/tags", API.withUser(user));
  if (!res.success) return;

  const tags = res.data.tags || [];
  tagFilterEl.innerHTML = `<option value="">All tags</option>` +
    tags.map(t => `<option value="${t}">${t}</option>`).join("");
}

async function runSearch() {
  const q = inputEl.value.trim();
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (roleFilterEl.value) params.set("role", roleFilterEl.value);
  if (tagFilterEl.value) params.set("tag", tagFilterEl.value);

  const res = await API.get(`/api/users/search?${params.toString()}`, API.withUser(user));
  if (!res.success) {
    resultsEl.innerHTML = `<p class="empty">Error searching.</p>`;
    return;
  }

  const users = res.data.users || [];
  if (!users.length) {
    resultsEl.innerHTML = `<p class="empty">No results.</p>`;
    return;
  }

  resultsEl.innerHTML = users.map(u => `
    <div class="search-result-row" data-user-id="${u.id}">
      <img class="avatar" src="${u.avatar || "/img/default-avatar.png"}" alt="" />
      <div class="search-result-main">
        <div class="search-result-top">
          <span class="search-result-name">${u.stage_name || u.username}</span>
          <span class="role-pill role-${u.role}">${roleLabel(u.role)}</span>
        </div>
        <div class="search-result-tags">${renderTagsLine(u.tags || [])}</div>
      </div>
      <div class="search-result-actions">
        <button class="btn-primary btn-message" data-user-id="${u.id}">Message</button>
      </div>
    </div>
  `).join("");

  document.querySelectorAll(".btn-message").forEach(btn => {
    btn.addEventListener("click", async () => {
      const targetId = btn.getAttribute("data-user-id");

      const res = await API.post("/api/messages/start", {
        target_id: targetId
      }, API.withUser(user));

      if (res.success && res.data.thread_id) {
        window.location.href = `/pages/messages/messages.html?thread=${res.data.thread_id}`;
      } else {
        alert("Unable to start conversation.");
      }
    });
  });
}

btnEl.addEventListener("click", runSearch);
inputEl.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    runSearch();
  }
});
roleFilterEl.addEventListener("change", runSearch);
tagFilterEl.addEventListener("change", runSearch);

(async function init() {
  await loadTagsForSearch();
})();
