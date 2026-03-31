const form = document.getElementById("business-apply-form");
const messageEl = document.getElementById("business-apply-message");

function showMessage(text, type = "info") {
  messageEl.textContent = text;
  messageEl.className = "rs-message " + type;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showMessage("Submitting application...", "info");

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  try {
    const res = await fetch("/api/business/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showMessage(data.error || "Application failed.", "error");
      return;
    }

    showMessage(
      "Application submitted. Your business will be reviewed before access is granted.",
      "success"
    );

    form.reset();
  } catch (err) {
    showMessage("Network error. Please try again.", "error");
  }
});
