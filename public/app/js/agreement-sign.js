// /app/js/legal/agreement-sign.js
import API from "../api.js";
import { getUserIdFromQuery } from "../utils.js";

(function initAgreementSign() {
  const block = document.querySelector(".sign-block");
  if (!block) return;

  const userId = getUserIdFromQuery();
  if (!userId) {
    console.error("Missing user ID (?user=ID)");
    return;
  }

  const agreementType = block.dataset.agreementType;
  const agreementVersion = block.dataset.agreementVersion;
  const contentSelector = block.dataset.contentSelector || "#agreement-body";

  const contentEl = document.querySelector(contentSelector);
  const checkbox = document.getElementById("sign-agree-checkbox");
  const button = document.getElementById("sign-agreement-btn");
  const status = document.getElementById("sign-status");

  if (!contentEl || !checkbox || !button) {
    console.error("Agreement signing elements missing.");
    return;
  }

  // Enable button only when checkbox is checked
  checkbox.addEventListener("change", () => {
    button.disabled = !checkbox.checked;
  });

  // Handle signing
  button.addEventListener("click", async () => {
    if (!checkbox.checked) return;

    button.disabled = true;
    status.textContent = "Saving your signature...";

    const agreementHtml = contentEl.innerHTML;

    try {
      await API.post("/api/agreements/sign", {
        user_id: userId,
        agreement_type: agreementType,
        agreement_version: agreementVersion,
        agreement_html: agreementHtml
      });

      status.textContent = "Agreement signed and saved.";
    } catch (err) {
      console.error(err);
      status.textContent = "Error saving signature.";
      button.disabled = false;
    }
  });
})();
