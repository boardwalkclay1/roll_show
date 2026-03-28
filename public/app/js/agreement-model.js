// agreement-modal.js
export function initAgreementModal(modalId = "agreement-modal") {
  const modal = document.getElementById(modalId);
  const titleEl = modal.querySelector("#agreement-title");
  const textEl = modal.querySelector("#agreement-text");
  const checkbox = modal.querySelector("#agree-checkbox");
  const button = modal.querySelector("#agree-button");

  let onAgree = null;

  checkbox.addEventListener("change", () => {
    button.disabled = !checkbox.checked;
  });

  button.addEventListener("click", () => {
    if (typeof onAgree === "function") onAgree(textEl.innerHTML);
    modal.classList.add("hidden");
    checkbox.checked = false;
    button.disabled = true;
  });

  function open({ title, html, onAgreeCallback }) {
    titleEl.textContent = title;
    textEl.innerHTML = html;
    onAgree = onAgreeCallback;
    checkbox.checked = false;
    button.disabled = true;
    modal.classList.remove("hidden");
  }

  return { open };
}
