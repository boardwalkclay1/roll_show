import API from "/js/api.js";

function user() {
  return JSON.parse(localStorage.getItem("user") || "{}");
}

async function runSearch(q) {
  const headers = API.withUser(user());
  const res = await API.get(`/api/search?q=${encodeURIComponent(q)}`, headers);

  if (!res.success) return console.error(res.error);

  const list = document.getElementById("search-results");
  list.innerHTML = "";

  (res.data || []).forEach(r => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <h3>${r.name || r.title}</h3>
      <p>${r.type}</p>
    `;
    list.appendChild(div);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("search-input");
  input.addEventListener("input", () => {
    const q = input.value.trim();
    if (q.length > 1) runSearch(q);
  });
});
