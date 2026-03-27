/* ============================================================
   CORS HEADERS
============================================================ */
export function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, x-user-id, x-buyer-id, x-skater-id, x-business-id, x-musician-id, x-owner-id"
  };
}

/* ============================================================
   JSON RESPONSE WRAPPER
============================================================ */
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors() }
  });
}

/* ============================================================
   UNIFIED USER ID EXTRACTION
   - Supports ALL roles
   - Worker treats all IDs the same
============================================================ */
export function getUserId(request) {
  return (
    request.headers.get("x-user-id") ||
    request.headers.get("x-buyer-id") ||
    request.headers.get("x-skater-id") ||
    request.headers.get("x-business-id") ||
    request.headers.get("x-musician-id") ||
    request.headers.get("x-owner-id")
  );
}

/* ============================================================
   PASSWORD HASHING (SHA-256)
============================================================ */
export async function hash(str) {
  const data = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ============================================================
   PASSWORD VERIFY
============================================================ */
export async function verify(str, hashed) {
  return (await hash(str)) === hashed;
}
