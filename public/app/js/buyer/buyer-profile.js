document.addEventListener("DOMContentLoaded", () => {
  const user = getUser();
  if (!user || user.role !== "buyer") {
    window.location.href = "/auth-login.html";
    return;
  }

  const form = document.getElementById("buyerProfileForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const res = await fetch(`${API_BASE}/api/save-buyer-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyer_id: user.id,
        phone: document.getElementById("phone").value,
        city: document.getElementById("city").value,
        state: document.getElementById("state").value,
        payment_method: document.getElementById("paymentMethod").value,
        agreed: document.getElementById("agreeTerms").checked
      })
    });

    const data = await res.json();

    if (data.success) {
      window.location.href = "/buyer-dashboard.html";
    } else {
      alert("Could not save profile.");
    }
  });
});
