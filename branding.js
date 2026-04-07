// branding.js
import { apiJson } from "./users.js";

/* ============================================================
   INTERNAL: GET SKATER PROFILE
============================================================ */
async function getSkater(env, userId) {
  return await env.DB_users.prepare(
    "SELECT id FROM skater_profiles WHERE user_id = ?"
  )
    .bind(userId)
    .first();
}

/* ============================================================
   UPLOAD BRANDING ASSET (SKATER)
============================================================ */
export async function uploadBrandingAsset(request, env, user) {
  const skater = await getSkater(env, user.id);
  if (!skater) return apiJson({ message: "Skater profile not found" }, 404);

  const {
    asset_url,
    asset_type,      // overlay | frame | font | background | template
    asset_category   // card | show | campaign | merch
  } = await request.json();

  if (!asset_url || !asset_type) {
    return apiJson({ message: "Missing asset_url or asset_type" }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_users.prepare(
    `INSERT INTO branding_assets (
       id, skater_id, asset_url, asset_type, asset_category, created_at
     )
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      skater.id,
      asset_url,
      asset_type,
      asset_category || null,
      now
    )
    .run();

  return apiJson({
    asset_id: id,
    status: "uploaded"
  });
}

/* ============================================================
   LIST SKATER BRANDING ASSETS
============================================================ */
export async function listBrandingAssets(request, env, user) {
  const skater = await getSkater(env, user.id);
  if (!skater) return apiJson({ message: "Skater profile not found" }, 404);

  const { results } = await env.DB_users.prepare(
    `SELECT *
     FROM branding_assets
     WHERE skater_id = ?
     ORDER BY created_at DESC`
  )
    .bind(skater.id)
    .all();

  return apiJson({ assets: results });
}

/* ============================================================
   DELETE BRANDING ASSET
============================================================ */
export async function deleteBrandingAsset(request, env, user) {
  const skater = await getSkater(env, user.id);
  if (!skater) return apiJson({ message: "Skater profile not found" }, 404);

  const { asset_id } = await request.json();
  if (!asset_id) return apiJson({ message: "Missing asset_id" }, 400);

  // Ensure asset belongs to skater
  const asset = await env.DB_users.prepare(
    "SELECT * FROM branding_assets WHERE id = ? AND skater_id = ?"
  )
    .bind(asset_id, skater.id)
    .first();

  if (!asset) return apiJson({ message: "Asset not found" }, 404);

  await env.DB_users.prepare(
    "DELETE FROM branding_assets WHERE id = ?"
  )
    .bind(asset_id)
    .run();

  return apiJson({ asset_id, status: "deleted" });
}
