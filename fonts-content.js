/* fonts-content.js
 *
 * Font twin of themes-content.js. Applies the active font to WhatsApp Web and
 * keeps it in sync with storage. Font size (`wa-custom-scale`) is handled
 * elsewhere (content.js) and is intentionally untouched here.
 */
(function () {
  const ACTIVE_KEY = "fonts:active";
  const CUSTOM_KEY = "fonts:custom";
  const STYLE_ID = "wa-font-style";

  function clearInjected() {
    document
      .querySelectorAll('[id^="wa-gfont-"],[id^="wa-fontface-"]')
      .forEach((n) => n.remove());
    const s = document.getElementById(STYLE_ID);
    if (s) s.remove();
  }

  function applyEntry(entry) {
    clearInjected();
    if (!entry || !entry.font || !entry.font.family) return;
    if (globalThis.WA_INJECT_FONT_FACE) {
      globalThis.WA_INJECT_FONT_FACE(document, entry);
    }
    const fallback =
      entry.font.fallback || globalThis.WA_FONT_FALLBACK || "sans-serif";
    const family = String(entry.font.family).replace(/['\\]/g, "");
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      "* { font-family: '" + family + "', " + fallback + " !important; }";
    (document.head || document.documentElement).appendChild(style);
  }

  function findFont(id, customs) {
    if (!id) return null;
    const presets = Array.isArray(globalThis.WA_FONT_PRESETS)
      ? globalThis.WA_FONT_PRESETS
      : [];
    const list = Array.isArray(customs) ? customs : [];
    return [...presets, ...list].find((f) => f && f.id === id) || null;
  }

  function loadAndApply() {
    chrome.storage.local.get([ACTIVE_KEY, CUSTOM_KEY], (data) => {
      const active = data[ACTIVE_KEY];
      const entry = active && active.id ? findFont(active.id, data[CUSTOM_KEY]) : null;
      if (entry) applyEntry(entry);
      else clearInjected();
    });
  }

  if (globalThis.WA_MIGRATE_FONT_STORAGE) globalThis.WA_MIGRATE_FONT_STORAGE();
  loadAndApply();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes[ACTIVE_KEY] || changes[CUSTOM_KEY])) {
      loadAndApply();
    }
  });
})();
