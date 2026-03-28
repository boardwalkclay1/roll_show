// /app/js/utils.js
export function getUserIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("user") || "";
}
