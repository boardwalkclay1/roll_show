// discounts.js
import { apiJson } from "./users.js";

/* ============================================================
   SET DEFAULT BUSINESS DISCOUNT
============================================================ */
export async function setDefaultDiscount(request, env, user) {
  const { coupon_code, coupon_percent } = await request.json();

  const business = await env.DB_users.prepare(
    "SELECT id FROM business_profiles WHERE user_id = ?"
  ).bind(user.id).first();

  if (!business) return apiJson({ message: "Business profile not found" }, 404);

  await env.DB_users.prepare(
    `UPDATE business_profiles
     SET default_coupon_code = ?, default_coupon_percent = ?
     WHERE id = ?`
  )
    .bind(coupon_code, coupon_percent, business.id)
    .run();

  return apiJson({ status: "updated" });
}

/* ============================================================
   APPLY DISCOUNT TO PRICE
============================================================ */
export function applyDiscount(price_cents, coupon_percent) {
  if (!coupon_percent) return price_cents;
  return Math.max(0, Math.floor(price_cents * (100 - coupon_percent) / 100));
}
