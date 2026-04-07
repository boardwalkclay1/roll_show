// contracts.js
import { apiJson } from "./users.js";

/* ============================================================
   CREATE CONTRACT (ANY ROLE)
============================================================ */
export async function createContract(request, env, user) {
  const { template_slug, role, profile_id, terms_json } = await request.json();

  if (!template_slug || !role || !profile_id) {
    return apiJson({ message: "Missing required fields" }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO contracts (
       id, template_slug, role, profile_id, status, signed_at, terms_json, created_at
     )
     VALUES (?, ?, ?, ?, 'pending', NULL, ?, ?)`
  )
    .bind(
      id,
      template_slug,
      role,
      profile_id,
      terms_json ? JSON.stringify(terms_json) : null,
      now
    )
    .run();

  return apiJson({ contract_id: id, status: "pending" });
}

/* ============================================================
   LIST CONTRACTS FOR A PROFILE
============================================================ */
export async function listContractsForProfile(request, env, user) {
  const { profile_id } = await request.json();

  if (!profile_id) return apiJson({ message: "Missing profile_id" }, 400);

  const { results } = await env.DB_users.prepare(
    `SELECT *
     FROM contracts
     WHERE profile_id = ?
     ORDER BY created_at DESC`
  )
    .bind(profile_id)
    .all();

  return apiJson({ contracts: results });
}

/* ============================================================
   APPROVE CONTRACT
============================================================ */
export async function approveContract(request, env, user) {
  const { contract_id } = await request.json();

  if (!contract_id) return apiJson({ message: "Missing contract_id" }, 400);

  const contract = await env.DB_users.prepare(
    "SELECT * FROM contracts WHERE id = ?"
  ).bind(contract_id).first();

  if (!contract) return apiJson({ message: "Contract not found" }, 404);

  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `UPDATE contracts
     SET status = 'approved',
         signed_at = ?
     WHERE id = ?`
  )
    .bind(now, contract_id)
    .run();

  return apiJson({ contract_id, status: "approved" });
}

/* ============================================================
   REJECT CONTRACT
============================================================ */
export async function rejectContract(request, env, user) {
  const { contract_id } = await request.json();

  if (!contract_id) return apiJson({ message: "Missing contract_id" }, 400);

  const contract = await env.DB_users.prepare(
    "SELECT * FROM contracts WHERE id = ?"
  ).bind(contract_id).first();

  if (!contract) return apiJson({ message: "Contract not found" }, 404);

  await env.DB_users.prepare(
    `UPDATE contracts
     SET status = 'rejected'
     WHERE id = ?`
  )
    .bind(contract_id)
    .run();

  return apiJson({ contract_id, status: "rejected" });
}
