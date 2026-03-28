// skater-signup.js
import API from "./api.js";
import { initAgreementModal } from "./agreement-modal.js";
import RightsEngine from "./rights-engine.js";

const form = document.getElementById("skater-signup-form");
const modal = initAgreementModal("agreement-modal");
const AGREEMENT_VERSION = "skater_v1";

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(form);
  const recorderName = fd.get("recorder_name") || "";
  const recorderEmail = fd.get("recorder_email") || "";
  const recorderPercent = fd.get("recorder_percent") || "";

  const payload = {
    name: fd.get("name"),
    email: fd.get("email"),
    password: fd.get("password"),
    extra: {
      recorder_name: recorderName,
      recorder_email: recorderEmail,
      recorder_percent: recorderPercent
    }
  };

  try {
    const html = await API.getText("/legal/skater-agreement.html");

    modal.open({
      title: "Skater Agreement",
      html,
      onAgreeCallback: async (agreementHtml) => {
        try {
          const user = await RightsEngine.handleSignupWithAgreement({
            role: "skater",
            signupPath: "/api/signup",
            rightsPath: "/api/rights/skater-signup",
            agreementType: "skater",
            agreementVersion: AGREEMENT_VERSION,
            agreementHtml,
            formData: payload
          });

          window.location.href = `/pages/skater-dashboard.html?user=${encodeURIComponent(
            user.id
          )}`;
        } catch (err) {
          console.error(err);
          alert("There was an issue creating your skater account.");
        }
      }
    });
  } catch (err) {
    console.error(err);
    alert("Unable to load skater agreement.");
  }
});
