// app/js/business/business-signup.js
import API from "../api.js";
import { initAgreementModal } from "/app/js/agreement-model.js";

const form = document.getElementById("business-signup-form");
const modal = initAgreementModal("agreement-modal");
const AGREEMENT_VERSION = "business_v1";

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(form);

  // Base signup payload
  const payload = {
    name: fd.get("name"),
    email: fd.get("email"),
    password: fd.get("password"),
    company_name: fd.get("company_name") || "",
    website: fd.get("website") || ""
  };

  // Load the business agreement HTML
  const html = await API.getText("/legal/pages/business-agreement.html");

  // Open modal
  modal.open({
    title: "Business Agreement",
    html,
    onAgreeCallback: async (agreementHtml) => {

      // 1. Create the business user
      const signupRes = await API.post("/api/business/signup", {
        name: payload.name,
        email: payload.email,
        password: payload.password,
        company_name: payload.company_name,
        website: payload.website
      });

      if (!signupRes.success) {
        alert("Signup failed: " + signupRes.error);
        return;
      }

      const user = signupRes;

      // 2. Store agreement snapshot
      await API.post("/api/agreements/store", {
        user_id: user.id,
        role: "business",
        version: AGREEMENT_VERSION,
        html: agreementHtml
      });

      // 3. Redirect to dashboard
      window.location.href = "/pages/business-dashboard.html";
    }
  });
});
