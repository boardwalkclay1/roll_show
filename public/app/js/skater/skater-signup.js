// /app/js/skater/skater-signup.js
const form = document.getElementById("skater-signup-form");
const disciplineSelect = document.getElementById("discipline");
const subclassSelect = document.getElementById("subclass");
const errorEl = document.getElementById("skater-signup-error");
const submitBtn = document.getElementById("skater-signup-submit");

const subclassMap = {
  "longboarder": ["cruiser", "downhill", "dancer"],
  "skate boarder": ["street", "vert"],
  "roller skater": ["rink", "outdoor", "skatepark"],
  "inline skater": ["vert", "street", "rink"]
};

function showError(msg){ errorEl.textContent = msg; errorEl.style.display = "block"; }
function clearError(){ errorEl.textContent = ""; errorEl.style.display = "none"; }
function normalizeDiscipline(raw){ if(!raw) return ""; return String(raw).trim().toLowerCase(); }

function populateSubclassOptions(rawDiscipline){
  const discipline = normalizeDiscipline(rawDiscipline);
  const subs = subclassMap[discipline] || [];
  if(!subs.length){
    subclassSelect.innerHTML = `<option value="">Select subclass (optional)</option>`;
    subclassSelect.disabled = true;
    return;
  }
  const options = [`<option value="">Select subclass (optional)</option>`]
    .concat(subs.map(s => `<option value="${s}">${s.charAt(0).toUpperCase()+s.slice(1)}</option>`))
    .join("");
  subclassSelect.innerHTML = options;
  subclassSelect.disabled = false;
}

disciplineSelect.addEventListener("change", () => { populateSubclassOptions(disciplineSelect.value); clearError(); });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const fd = new FormData(form);
  const name = (fd.get("name") || "").trim();
  const email = (fd.get("email") || "").trim();
  const password = fd.get("password") || "";
  const passwordVerify = fd.get("password_verify") || "";
  const stage_name = (fd.get("stage_name") || "").trim();

  const rawDiscipline = fd.get("discipline") || "";
  const rawSubclass = fd.get("subclass") || "";
  const discipline = normalizeDiscipline(rawDiscipline);
  const subclass = rawSubclass ? String(rawSubclass).trim().toLowerCase() : "";

  if (!email) return showError("Please enter an email.");
  if (!password) return showError("Please enter a password.");
  if (password !== passwordVerify) return showError("Passwords do not match.");
  if (!stage_name) return showError("Please enter a stage name.");
  if (!discipline) return showError("Please select a discipline.");
  if (subclass) {
    const allowed = subclassMap[discipline] || [];
    if (!allowed.includes(subclass)) return showError("Invalid subclass for selected discipline.");
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating…";

  try {
    const payload = {
      name,
      email,
      password,
      password_verify: passwordVerify,
      role: "skater",
      stage_name,
      discipline,
      subclass: subclass || null
    };

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "same-origin"
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data) {
      showError((data && data.message) || "Signup failed. Please try again.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Create Account";
      return;
    }

    if (data.success) {
      window.location.href = data.redirect || "/pages/onboarding-skater.html";
      return;
    } else {
      showError(data.message || data.profile_error || "Signup failed. Please check your input.");
    }
  } catch (err) {
    showError("Network error. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create Account";
  }
});

document.addEventListener("DOMContentLoaded", () => { populateSubclassOptions(disciplineSelect.value); });
