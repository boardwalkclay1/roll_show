import API from "/js/api.js";

function user() {
  return JSON.parse(localStorage.getItem("user") || "{}");
}

async function loadConversations() {
  const headers = API.withUser(user());
  const res = await API.get("/api/messages", headers);

  if (!res.success) return console.error(res.error);

  const list = document.getElementById("conversations-list");
  list.innerHTML = "";

  (res.data || []).forEach(conv => {
    const div = document.createElement("div");
    div.className = "conversation-item";
    div.dataset.id = conv.id;
    div.textContent = conv.name;
    list.appendChild(div);
  });

  list.addEventListener("click", e => {
    const item = e.target.closest(".conversation-item");
    if (!item) return;
    loadChat(item.dataset.id);
  });
}

async function loadChat(id) {
  const headers = API.withUser(user());
  const res = await API.get(`/api/messages/${id}`, headers);

  if (!res.success) return console.error(res.error);

  const win = document.getElementById("chat-window");
  win.innerHTML = "";

  (res.data || []).forEach(msg => {
    const div = document.createElement("div");
    div.className = "chat-msg";
    div.innerHTML = `<strong>${msg.sender_name}</strong>: ${msg.text}`;
    win.appendChild(div);
  });
}

function bindSend() {
  const btn = document.getElementById("chat-send");
  const input = document.getElementById("chat-text");

  btn.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return;

    const headers = API.withUser(user());
    await API.post("/api/messages/send", { text }, headers);

    input.value = "";
    loadConversations();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadConversations();
  bindSend();
});
