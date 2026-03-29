// app/js/musician/musician-signup.js
import API from "../api.js";
import { initAgreementModal } from "../agreement-modal.js";

const form = document.getElementById("musician-signup-form");
const modal = initAgreementModal("agreement-modal");
const AGREEMENT_VERSION = "artist_v1";

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(form);

  // Base signup payload
  const payload = {
    name: fd.get("name"),
    email: fd.get("email"),
    password: fd.get("password"),
    bio: fd.get("bio") || ""
  };

  // Load the musician agreement HTML
  const html = await API.getText("/legal/pages/artist-agreement.html");

  // Open modal
  modal.open({
    title: "Artist Agreement",
    html,
    onAgreeCallback: async (agreementHtml) => {

      // 1. Create the musician user
      const signupRes = await API.post("/api/musician/signup", {
        name: payload.name,
        email: payload.email,
        password: payload.password,
        bio: payload.bio
      });

      if (!signupRes.success) {
        alert("Signup failed: " + signupRes.error);
        return;
      }

      const user = signupRes;

      // 2. Store agreement snapshot
      await API.post("/api/agreements/store", {
        user_id: user.id,
        role: "musician",
        version: AGREEMENT_VERSION,
        html: agreementHtml
      });

      // 3. Redirect to dashboard
      window.location.href = "/pages/musician-dashboard.html";
    }
  });
});
