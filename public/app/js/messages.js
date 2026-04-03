import API from "/app/js/api.js";

const user = JSON.parse(localStorage.getItem("user") || "{}");

/* DOM */
const folderButtons = document.querySelectorAll(".messages-tabs .tab-button");
const threadListEl = document.getElementById("messages-thread-list");
const roleFilterEl = document.getElementById("messages-role-filter");
const tagFilterEl = document.getElementById("messages-tag-filter");
const searchInputEl = document.getElementById("messages-search-input");
const searchBtnEl = document.getElementById("messages-search-btn");

const threadEmptyEl = document.getElementById("thread-empty-state");
const threadPanelEl = document.getElementById("thread-panel");
const threadMessagesEl = document.getElementById("thread-messages");
const threadBannerEl = document.getElementById("thread-system-banner");

const partnerAvatarEl = document.getElementById("thread-partner-avatar");
const partnerNameEl = document.getElementById("thread-partner-name");
const partnerRoleEl = document.getElementById("thread-partner-role");
const partnerTagsEl = document.getElementById("thread-partner-tags");

const threadStarBtn = document.getElementById("thread-star-btn");
const threadMoreBtn = document.getElementById("thread-more-btn");

const composerLockedEl = document.getElementById("thread-composer-locked");
const composerActiveEl = document.getElementById("thread-composer-active");
const threadInputEl = document.getElementById("thread-input");
const threadSendBtn = document.getElementById("thread-send-btn");

/* STATE */
let currentFolder = "requests"; // "requests" | "important" | "conversations"
let currentThreadId = null;
let currentThreadMeta = null;
let tagsLoaded = false;

/* Helpers */
function roleLabel(role) {
  if (!role) return "";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function renderTagsLine(tags) {
  if (!tags || !tags.length) return "";
  return tags.slice(0, 10).map(t => `#${t}`).join(" ");
}

function renderMessageBubble(msg) {
  const mine = msg.sender_id === user.id;
  const cls = mine ? "bubble bubble-mine" : "bubble bubble-theirs";
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return `
    <div class="${cls}">
      <div class="bubble-body">${msg.body}</div>
      <div class="bubble-meta">${time}</div>
    </div>
  `;
}

/* Folder switching */
folderButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    folderButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFolder = btn.getAttribute("data-folder");
    loadThreads();
  });
});

/* Load tags for filters */
async function loadTags() {
  if (tagsLoaded) return;
  const res = await API.get("/api/users/tags", API.withUser(user));
  if (!res.success) return;

  const tags = res.data.tags || [];
  tagFilterEl.innerHTML = `<option value="">All tags</option>` +
    tags.map(t => `<option value="${t}">${t}</option>`).join("");

  const globalTagFilter = document.getElementById("global-search-tag-filter");
  if (globalTagFilter) {
    globalTagFilter.innerHTML = `<option value="">All tags</option>` +
      tags.map(t => `<option value="${t}">${t}</option>`).join("");
  }

  tagsLoaded = true;
}

/* Load thread list */
async function loadThreads(query = "") {
  const params = new URLSearchParams();
  params.set("folder", currentFolder);
  if (roleFilterEl.value) params.set("role", roleFilterEl.value);
  if (tagFilterEl.value) params.set("tag", tagFilterEl.value);
  if (query) params.set("q", query);

  const res = await API.get(`/api/messages/list?${params.toString()}`, API.withUser(user));
  if (!res.success) {
    threadListEl.innerHTML = `<p class="empty">Error loading messages.</p>`;
    return;
  }

  const threads = res.data.threads || [];
  if (!threads.length) {
    threadListEl.innerHTML = `<p class="empty">No conversations here yet.</p>`;
    return;
  }

  threadListEl.innerHTML = threads.map(t => `
    <div class="thread-row" data-thread-id="${t.id}">
      <img class="avatar" src="${t.partner_avatar || "/img/default-avatar.png"}" alt="" />
      <div class="thread-row-main">
        <div class="thread-row-top">
          <span class="thread-row-name">${t.partner_stage_name}</span>
          <span class="thread-row-time">${new Date(t.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <div class="thread-row-meta">
          <span class="role-pill role-${t.partner_role}">${roleLabel(t.partner_role)}</span>
          <span class="tags-line">${renderTagsLine(t.partner_tags || [])}</span>
        </div>
        <div class="thread-row-preview">
          ${t.last_message_preview || ""}
        </div>
      </div>
      ${t.unread_count ? `<span class="unread-badge">${t.unread_count}</span>` : ""}
    </div>
  `).join("");

  document.querySelectorAll(".thread-row").forEach(row => {
    row.addEventListener("click", () => {
      const id = row.getAttribute("data-thread-id");
      openThread(id);
    });
  });
}

/* Open thread */
async function openThread(threadId) {
  currentThreadId = threadId;

  const res = await API.get(`/api/messages/thread?id=${threadId}`, API.withUser(user));
  if (!res.success) return;

  const { thread, messages } = res.data;
  currentThreadMeta = thread;

  // header
  partnerAvatarEl.src = thread.partner_avatar || "/img/default-avatar.png";
  partnerNameEl.textContent = thread.partner_stage_name;
  partnerRoleEl.textContent = roleLabel(thread.partner_role);
  partnerRoleEl.className = `role-pill role-${thread.partner_role}`;
  partnerTagsEl.textContent = renderTagsLine(thread.partner_tags || []);

  // banner
  if (thread.status === "request") {
    threadBannerEl.classList.remove("hidden");
    threadBannerEl.textContent = `Message request from ${roleLabel(thread.partner_role)}. Accept to continue.`;
  } else {
    threadBannerEl.classList.add("hidden");
    threadBannerEl.textContent = "";
  }

  // composer lock
  const locked = thread.composer_locked;
  composerLockedEl.classList.toggle("hidden", !locked);
  composerActiveEl.classList.toggle("hidden", !!locked);

  // messages
  threadMessagesEl.innerHTML = messages.map(renderMessageBubble).join("");
  threadMessagesEl.scrollTop = threadMessagesEl.scrollHeight;

  // star state
  threadStarBtn.classList.toggle("active", !!thread.is_important);

  // show panel
  threadEmptyEl.classList.add("hidden");
  threadPanelEl.classList.remove("hidden");

  // mark read
  await API.post("/api/messages/mark-read", { thread_id: threadId }, API.withUser(user));
}

/* Send message (with silent moderation hook) */
async function sendMessage() {
  if (!currentThreadId) return;
  const body = threadInputEl.value.trim();
  if (!body) return;

  // optional: local optimistic render
  const tempMsg = {
    sender_id: user.id,
    body,
    created_at: new Date().toISOString()
  };
  threadMessagesEl.innerHTML += renderMessageBubble(tempMsg);
  threadMessagesEl.scrollTop = threadMessagesEl.scrollHeight;
  threadInputEl.value = "";

  // send to backend (backend does silent moderation)
  const res = await API.post("/api/messages/send", {
    thread_id: currentThreadId,
    body
  }, API.withUser(user));

  if (!res.success) {
    // rollback or show error
    // for now, just show banner
    threadBannerEl.classList.remove("hidden");
    threadBannerEl.textContent = "Message could not be delivered.";
  }
}

/* Star / unstar thread */
async function toggleStar() {
  if (!currentThreadId) return;
  const newState = !threadStarBtn.classList.contains("active");

  const res = await API.post("/api/messages/important", {
    thread_id: currentThreadId,
    important: newState
  }, API.withUser(user));

  if (res.success) {
    threadStarBtn.classList.toggle("active", newState);
  }
}

/* Filters + search */
roleFilterEl.addEventListener("change", () => loadThreads());
tagFilterEl.addEventListener("change", () => loadThreads());

searchBtnEl.addEventListener("click", () => {
  const q = searchInputEl.value.trim();
  loadThreads(q);
});

searchInputEl.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const q = searchInputEl.value.trim();
    loadThreads(q);
  }
});

/* Composer events */
threadSendBtn.addEventListener("click", sendMessage);
threadInputEl.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

threadStarBtn.addEventListener("click", toggleStar);
threadMoreBtn.addEventListener("click", () => {
  // placeholder for future actions (block, report, etc.)
});

/* INIT */
(async function init() {
  await loadTags();
  await loadThreads();
})();
