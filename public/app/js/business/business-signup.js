// business-signup.js
import API from "./api.js";
import { initAgreementModal } from "./agreement-modal.js";
import RightsEngine from "./rights-engine.js";

const form = document.getElementById("business-signup-form");
const modal = initAgreementModal("agreement-modal");
const AGREEMENT_VERSION = "business_v1";

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(form);
  const payload = {
    name: fd.get("name"),
    email: fd.get("email"),
    password: fd.get("password"),
    extra: {
      company_name: fd.get("company_name") || ""
    }
  };

  try {
    const html = await API.getText("/legal/business-agreement.html");

    modal.open({
      title: "Business / Collab Agreement",
      html,
      onAgreeCallback: async (agreementHtml) => {
        try {
          const user = await RightsEngine.handleSignupWithAgreement({
            role: "business",
            signupPath: "/api/signup",
            rightsPath: "/api/rights/business-signup",
            agreementType: "business",
            agreementVersion: AGREEMENT_VERSION,
            agreementHtml,
            formData: payload
          });

          window.location.href = `/pages/business-dashboard.html?user=${encodeURIComponent(
            user.id
          )}`;
        } catch (err) {
          console.error(err);
          alert("There was an issue creating your business account.");
        }
      }
    });
  } catch (err) {
    console.error(err);
    alert("Unable to load business agreement.");
  }
});
