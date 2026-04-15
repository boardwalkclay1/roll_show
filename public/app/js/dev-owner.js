// /app/js/dev-owner.js — owner bypass for development

// Always pretend the user is the OWNER
const devOwner = {
  id: 1,
  email: "dev@local",
  role: "owner",
  devBypass: true
};

// Store fake user globally
localStorage.setItem("user", JSON.stringify(devOwner));

// Override any auth checks your app might use
window.isLoggedIn = () => true;
window.getUser = () => devOwner;

// Prevent logout from clearing dev mode
window.logout = () => {
  console.warn("Logout disabled in dev-owner mode");
};

// Stop any redirect-to-login logic
Object.defineProperty(document, "cookie", {
  get: () => "session=dev-owner",
  set: () => true
});

// ONLY redirect ONCE when landing on login page
if (location.pathname.includes("login")) {
  location.href = "/pages/owner/owner-dashboard.html";
}
