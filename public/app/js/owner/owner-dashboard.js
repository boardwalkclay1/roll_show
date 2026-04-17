// ============================================================
// OWNER DASHBOARD JS — NO API CALLS, NO LOADERS, NO ERRORS
// ============================================================

let owner = null;

window.addEventListener("DOMContentLoaded", () => {
  owner = (typeof requireUser === "function")
    ? requireUser(["owner"])
    : getUser();

  initOwnerDashboard();
});

// ============================================================
// SECTION SWITCHING
// ============================================================
const navButtons = document.querySelectorAll(".owner-nav button");
const sections = document.querySelectorAll(".owner-section");

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.section;

    navButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    sections.forEach(sec => {
      sec.classList.toggle("active", sec.id === `section-${target}`);
    });
  });
});

// ============================================================
// DISABLED FEATURES (NO API CALLS)
// ============================================================

async function loadBranding() {
  // no-op
}

async function loadNotes() {
  // no-op
}

async function loadAds() {
  // no-op
}

async function loadSponsorships() {
  // no-op
}

// disable all buttons so nothing fires API calls
document.querySelectorAll("button").forEach(btn => {
  btn.addEventListener("click", e => {
    const id = btn.id || btn.className || "button";
    console.log(`Button ${id} clicked — API disabled`);
  });
});

// ============================================================
// INIT — NOTHING CALLS ANYTHING
// ============================================================
async function initOwnerDashboard() {
  // no API calls
  console.log("Owner dashboard loaded (API disabled)");
}
