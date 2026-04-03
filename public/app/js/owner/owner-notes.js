import API from "/app/js/api.js";

const user = JSON.parse(localStorage.getItem("user") || "{}");

const notesList = document.getElementById("notes-list");
const noteText = document.getElementById("note-text");
const btnAddNote = document.getElementById("btn-add-note");

async function loadNotes() {
  const res = await API.get("/api/owner/settings/notes", API.withUser(user));
  if (!res.success) return;

  const notes = res.data.notes || [];

  notesList.innerHTML = notes.map(n => `
    <div class="note-item">
      <div>
        <div class="note-text">${n.note}</div>
        <div class="note-meta">${new Date(n.created_at).toLocaleString()}</div>
      </div>
      <button class="note-delete" data-id="${n.id}">Delete</button>
    </div>
  `).join("");

  document.querySelectorAll(".note-delete").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      await API.delete(`/api/owner/settings/notes?id=${id}`, API.withUser(user));
      loadNotes();
    });
  });
}

btnAddNote.addEventListener("click", async () => {
  const text = noteText.value.trim();
  if (!text) return;

  await API.post("/api/owner/settings/notes", { note: text }, API.withUser(user));
  noteText.value = "";
  loadNotes();
});

loadNotes();
