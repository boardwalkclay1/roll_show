// rights-engine.js
import API from "./api.js";

const RightsEngine = {
  async handleSignupWithAgreement({
    role,
    signupPath,
    rightsPath,
    agreementType,
    agreementVersion,
    agreementHtml,
    formData
  }) {
    // 1) create user
    const user = await API.post(signupPath, {
      role,
      name: formData.name,
      email: formData.email,
      password: formData.password
    });

    // 2) create creator + agreement snapshot + default splits (backend handles details)
    await API.post(rightsPath, {
      user_id: user.id,
      agreement_type: agreementType,
      agreement_version: agreementVersion,
      agreement_content: agreementHtml,
      extra: formData.extra || {}
    });

    return user;
  }
};

export default RightsEngine;
