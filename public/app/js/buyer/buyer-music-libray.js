import { api } from "/js/core/api.js";

export async function init() {
  const list = document.getElementById("buyer-music-list");
  const tracks = await api("/buyer/music/list");

  list.innerHTML = tracks.map(t => `
    <div class="track-item">
      <h3>${t.title}</h3>
      <audio controls src="${t.audio_url}"></audio>
    </div>
  `).join("");
}
