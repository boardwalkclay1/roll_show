// buyers.js — profile-only + buyer handlers (signup removed)
// - Auth/signup is handled by the separate auth-worker
// - This module exposes buyer profile creation and other buyer APIs expected by worker.js

import { apiJson } from "./users.js";

/* ============================================================
   Create Buyer Profile (idempotent)
   POST /api/profiles/buyer
   - Derives user_id from authenticated user (requireRole wraps this)
   - Accepts: name, phone, city, state, default_payment_method, preferred_rink
   ============================================================ */
export async function createBuyerProfile(request, env, user) {
  try {
    const body = await request.json().catch(() => ({}));

    const name = body.name ? String(body.name).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    const city = body.city ? String(body.city).trim() : null;
    const state = body.state ? String(body.state).trim() : null;
    const default_payment_method = body.default_payment_method ? String(body.default_payment_method).trim() : null;
    const preferred_rink = body.preferred_rink ? String(body.preferred_rink).trim() : null;

    // Basic required-field check (adjust as needed)
    if (!name && !phone && !city && !state && !default_payment_method && !preferred_rink) {
      return { success: false, message: "No profile fields provided" };
    }

    // If profile already exists, return it (idempotent)
    const existing = await env.DB_roll.prepare("SELECT * FROM buyer_profiles WHERE user_id = ?").bind(user.id).first();
    if (existing) {
      return {
        success: true,
        profile_exists: true,
        profile: {
          id: existing.id,
          user_id: existing.user_id,
          name: existing.name,
          phone: existing.phone,
          city: existing.city,
          state: existing.state,
          default_payment_method: existing.default_payment_method,
          preferred_rink: existing.preferred_rink,
          created_at: existing.created_at
        }
      };
    }

    const profileId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      await env.DB_roll.prepare(
        `INSERT INTO buyer_profiles (
           id, user_id, name, phone, city, state,
           default_payment_method, preferred_rink, profile_weather_snapshot_json,
           created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          profileId,
          user.id,
          name,
          phone,
          city,
          state,
          default_payment_method,
          preferred_rink,
          null,
          now
        )
        .run();

      return {
        success: true,
        profile_created: true,
        profile: {
          id: profileId,
          user_id: user.id,
          name,
          phone,
          city,
          state,
          default_payment_method,
          preferred_rink,
          created_at: now
        }
      };
    } catch (err) {
      const msg = String(err).toLowerCase();
      if (msg.includes("unique") || msg.includes("constraint") || /buyer_profiles/.test(msg)) {
        const existing2 = await env.DB_roll.prepare("SELECT * FROM buyer_profiles WHERE user_id = ?").bind(user.id).first();
        if (existing2) {
          return {
            success: true,
            profile_exists: true,
            profile: {
              id: existing2.id,
              user_id: existing2.user_id,
              name: existing2.name,
              phone: existing2.phone,
              city: existing2.city,
              state: existing2.state,
              default_payment_method: existing2.default_payment_method,
              preferred_rink: existing2.preferred_rink,
              created_at: existing2.created_at
            }
          };
        }
      }
      return { success: false, message: "Profile insert failed", detail: String(err) };
    }
  } catch (err) {
    return { success: false, message: "Server error", detail: String(err) };
  }
}

/* ============================================================
   Buyer handlers (stubs / safe defaults)
   - Implementations can be expanded as needed; worker.js expects these exports
   ============================================================ */
export async function listTickets(request, env, user) {
  return { success: false, message: "listTickets not implemented" };
}

export async function createTicket(request, env, user) {
  return { success: false, message: "createTicket not implemented" };
}

export async function partnerWebhook(request, env) {
  return { success: false, message: "partnerWebhook not implemented" };
}

export async function checkInTicket(request, env, user) {
  return { success: false, message: "checkInTicket not implemented" };
}

export async function buyerDashboard(request, env, user) {
  return { success: false, message: "buyerDashboard not implemented" };
}

/* ============================================================
   Factory expected by worker.js
   - No signupBuyer exported here; signup is handled by auth-worker
   ============================================================ */
export function makeBuyersApi() {
  return {
    createBuyerProfile: typeof createBuyerProfile === "function" ? createBuyerProfile : async () => ({ success: false, message: "createBuyerProfile not implemented" }),
    listTickets: typeof listTickets === "function" ? listTickets : async () => ({ success: false, message: "listTickets not implemented" }),
    createTicket: typeof createTicket === "function" ? createTicket : async () => ({ success: false, message: "createTicket not implemented" }),
    partnerWebhook: typeof partnerWebhook === "function" ? partnerWebhook : async () => ({ success: false, message: "partnerWebhook not implemented" }),
    checkInTicket: typeof checkInTicket === "function" ? checkInTicket : async () => ({ success: false, message: "checkInTicket not implemented" }),
    buyerDashboard: typeof buyerDashboard === "function" ? buyerDashboard : async () => ({ success: false, message: "buyerDashboard not implemented" })
  };
}
