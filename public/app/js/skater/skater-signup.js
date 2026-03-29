// app/js/skater/skater-signup.js
import API from "../api.js";
import { initAgreementModal } from "../agreement-modal.js";
import RightsEngine from "../rights-engine.js";

const form = document.getElementById("skater-signup-form");
const modal = initAgreementModal("agreement-modal");
const AGREEMENT_VERSION = "skater_v1";

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(form);

  // Base signup payload
  const payload = {
    name: fd.get("name"),
    email: fd.get("email"),
    password: fd.get("password"),
    discipline: fd.get("discipline") || "",
    bio: fd.get("bio") || "",
    recorder_name: fd.get("recorder_name") || "",
    recorder_email: fd.get("recorder_email") || "",
    recorder_percent: fd.get("recorder_percent") || ""
  };

  // Load the skater agreement HTML
  const html = await API.getText("/legal/pages/skater-agreement.html");

  // Open modal
  modal.open({
    title: "Skater Agreement",
    html,
    onAgreeCallback: async (agreementHtml) => {

      // 1. Create the skater user
      const signupRes = await API.post("/api/skater/signup", {
        name: payload.name,
        email: payload.email,
        password: payload.password,
        discipline: payload.discipline,
        bio: payload.bio,
        recorder_name: payload.recorder_name,
        recorder_email: payload.recorder_email,
        recorder_percent: payload.recorder_percent
      });

      if (!signupRes.success) {
        alert("Signup failed: " + signupRes.error);
        return;
      }

      const user = signupRes;

      // 2. Store agreement snapshot
      await API.post("/api/agreements/store", {
        user_id: user.id,
        role: "skater",
        version: AGREEMENT_VERSION,
        html: agreementHtml
      });

      // 3. Redirect to dashboard
      window.location.href = "/pages/skater-dashboard.html";
    }
  });
});
