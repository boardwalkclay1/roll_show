function wirePageLinks(userId) {
  document.getElementById("tracks-link").href =
    `/app/pages/musician/tracks.html?user=${userId}`;

  document.getElementById("licenses-link").href =
    `/app/pages/musician/licenses.html?user=${userId}`;

  document.getElementById("feed-link").href =
    `/app/pages/musician/musician-feed.html?user=${userId}`;

  document.getElementById("upload-link").href =
    `/app/pages/musician/upload-track.html?user=${userId}`;

  document.getElementById("branding-link").href =
    `/app/pages/musician/branding-studio.html?user=${userId}`;

  document.getElementById("library-link").href =
    `/app/pages/musician/music-library.html?user=${userId}`;
}
