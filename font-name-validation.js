/* font-name-validation.js
 *
 * Font twin of theme-name-validation.js. Guards the editor's Save button while
 * the name is empty: keeps it visibly disabled and, if clicked anyway, surfaces
 * an inline error instead of saving a nameless font.
 */
!(function () {
  "use strict";
  var nameInput = document.getElementById("editor-name");
  var saveBtn = document.getElementById("editor-save");
  var errorEl = document.getElementById("editor-name-error");
  var backdrop = document.getElementById("editor-backdrop");

  function isEmpty() {
    return 0 === nameInput.value.trim().length;
  }

  function sync() {
    var empty = isEmpty();
    saveBtn.classList.toggle("is-disabled", empty);
    saveBtn.setAttribute("aria-disabled", empty ? "true" : "false");
    if (!empty) {
      errorEl.textContent = "";
      nameInput.classList.remove("error");
    }
  }

  if (nameInput && saveBtn && errorEl) {
    nameInput.addEventListener("input", sync);
    if (backdrop) {
      new MutationObserver(sync).observe(backdrop, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }
    saveBtn.addEventListener(
      "click",
      function (e) {
        if (isEmpty()) {
          e.preventDefault();
          e.stopImmediatePropagation();
          nameInput.classList.add("error");
          errorEl.textContent = "Please enter a name before saving.";
          nameInput.focus();
          try {
            window.track && window.track("custom_font_save_blocked_empty");
          } catch (err) {
            /* analytics best-effort */
          }
        }
      },
      true
    );
    sync();
  }
})();
