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
   BCRYPTJS — WORKER SAFE
============================================================ */
import bcrypt from "bcryptjs";

/* ============================================================
   PASSWORD HASHING (bcrypt)
============================================================ */
export async function hash(str) {
  return await bcrypt.hash(str, 10);
}

/* ============================================================
   PASSWORD VERIFY (bcrypt)
============================================================ */
export async function verify(str, hashed) {
  return await bcrypt.compare(str, hashed);
}
