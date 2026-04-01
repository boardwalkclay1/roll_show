import API from "/js/api.js";

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function getGroupId() {
  const url = new URL(window.location.href);
  return url.searchParams.get("id");
}

async function loadGroup() {
  const id = getGroupId();
  if (!id) return;

  const user = getUser();
  const headers = API.withUser(user);

  const res = await API.get(`/api/skater/groups/${id}`, headers);
  if (!res.success || !res.data) {
    console.error("Failed to load group", res.error);
    return;
  }

  const { group, members, shows, feed } = res.data;

  document.getElementById("group-name").textContent = group.name;
  document.getElementById("group-description").textContent =
    group.description || "";

  renderList("group-members", members, m => m.name);
  renderList("group-shows", shows, s => s.title);
  renderFeed("group-feed", feed || []);
}

function renderList(id, items, labelFn) {
  const el = document.getElementById(id);
  el.innerHTML = "";
  (items || []).forEach(item => {
    const div = document.createElement("div");
    div.className = "mini-item";
    div.textContent = labelFn(item);
    el.appendChild(div);
  });
}

function renderFeed(id, items) {
  const el = document.getElementById(id);
  el.innerHTML = "";
  (items || []).forEach(post => {
    const div = document.createElement("div");
    div.className = "feed-item";
    div.innerHTML = `
      <div class="feed-header">
        <span>${post.author_name || "Member"}</span>
        <span class="feed-time">${post.created_at || ""}</span>
      </div>
      <p>${post.content || ""}</p>
    `;
    el.appendChild(div);
  });
}

function bindActions() {
  const editBtn = document.getElementById("edit-group-btn");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      alert("Group editing UI coming next pass.");
    });
  }

  const showBtn = document.getElementById("group-show-btn");
  if (showBtn) {
    showBtn.addEventListener("click", () => {
      const id = getGroupId();
      window.location.href = `/public/pages/skater/create-show.html?group_id=${id}`;
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadGroup();
  bindActions();
});
