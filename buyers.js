// buyers.js — signupBuyer (minimal, user-first then profile)
import { apiJson } from "./users.js";
import { signupBase } from "./users.js"; // ensure this export matches users.js

export async function signupBuyer(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    // Ensure role is buyer for the users row
    const signupReqBody = { name: body.name || null, email: body.email, password: body.password, role: "buyer" };

    // Call signupBase and parse its JSON response
    // signupBase may be implemented as signupBase(request, env, role) or as a function that returns apiJson Response.
    // Here we call the exported helper as a function that returns a Response-like object.
    // If your signupBase signature differs, adapt this call to match it.
    const signupRes = await signupBase(
      // If signupBase expects (request, env, role) use:
      // new Request(request.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(signupReqBody) }),
      // env,
      // "buyer"
      // Otherwise if signupBase accepts (env, body) adapt accordingly.
      // The following assumes signupBase returns a Response (apiJson).
      new Request(request.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(signupReqBody) }),
      env,
      "buyer"
    );

    // If signupBase returned a Response object, parse it; otherwise assume it's already an object
    let base;
    if (signupRes && typeof signupRes.json === "function") {
      base = await signupRes.json().catch(() => null);
    } else {
      base = signupRes;
    }

    if (!base || base.success !== true || !base.user) {
      // Normalize error message
      const msg = (base && (base.message || (base.error && base.error.message))) || "Signup failed";
      return apiJson({ success: false, message: msg }, base && base.status ? base.status : 400);
    }

    const userId = base.user.id;
    const createdAt = base.user.created_at || new Date().toISOString();

    // Create buyer profile row
    const profileId = crypto.randomUUID();
    await env.DB_roll.prepare(
      `INSERT INTO buyer_profiles (
         id, user_id, name, phone, city, state,
         default_payment_method, preferred_rink, profile_weather_snapshot_json,
         created_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        profileId,
        userId,
        body.name || null,
        body.phone || null,
        body.city || null,
        body.state || null,
        body.default_payment_method || null,
        body.preferred_rink || null,
        null,
        createdAt
      )
      .run();

    return apiJson({ success: true, user: base.user, buyer_profile_id: profileId }, 201);
  } catch (err) {
    return apiJson({ success: false, message: "Server error", detail: String(err) }, 500);
  }
}

/* --- Exports expected by worker.js (guarded) --- */
export {
  listTickets,
  createTicket,
  partnerWebhook,
  checkInTicket,
  buyerDashboard,
  signupBuyer
};
