import API from "../api.js";
import { initAgreementModal } from "../agreement-modal.js";
import RightsEngine from "../rights-engine.js";

const form = document.getElementById("musician-signup-form");
const modal = initAgreementModal("agreement-modal");
const AGREEMENT_VERSION = "artist_v1";

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(form);

  const payload = {
    name: fd.get("name"),
    email: fd.get("email"),
    password: fd.get("password"),
    extra: {}
  };

  const html = await API.getText("/legal/pages/artist-agreement.html");

  modal.open({
    title: "Artist Agreement",
    html,
    onAgreeCallback: async (agreementHtml) => {
      const user = await RightsEngine.signupWithAgreement({
        role: "musician",
        signupPath: "/api/signup",
        rightsPath: "/api/rights/artist-signup",
        agreementType: "artist",
        agreementVersion: AGREEMENT_VERSION,
        agreementHtml,
        formData: payload
      });

      window.location.href = `/pages/musician/musician-dashboard.html?user=${user.id}`;
    }
  });
});
