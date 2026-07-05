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
  const GUARD_ID = "wa-font-guard";

  // Fixed chrome/UI font stack. Extension-owned UI is locked to this and must
  // never render in the user's (often decorative/pixel) font.
  const UI_FONT_STACK =
    'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  // Extension-owned in-page UI that must NOT inherit the user font. Each of
  // these roots re-points the inherited --wc-user-font custom property back to
  // --wc-ui-font; because custom properties inherit, the global
  // `* { font-family: var(--wc-user-font) }` rule then resolves to the UI font
  // for the entire subtree — a structural fix, not a specificity war with the
  // !important. New extension UI can opt in with class .wc-ui-scope /
  // attribute [data-wc-ui]. (reviewPrompt uses a shadow root and is already
  // isolated; its light-DOM host is tagged for belt-and-suspenders.)
  const UI_SCOPE_SELECTORS = [
    ".wc-ui-scope",
    "[data-wc-ui]",
    "#save-nudge",
    "#quick-reply-bubbles",
    ".quick-reply-bubble",
    "#wa-review-prompt-host",
    ".custom-burger-menu",
    "#custom-welcome-title",
    "#custom-welcome-subtitle",
    '[class^="wac-"]',
    '[class*=" wac-"]',
    '[id^="wa-anim-hint"]',
    '[class^="wa-anim-hint"]',
  ].join(",");

  // Always-present guard: defines --wc-ui-font and the UI-scope reset. Injected
  // once and intentionally NOT removed by clearInjected (different id prefix),
  // so the protection survives font changes/clears.
  function ensureGuard() {
    if (document.getElementById(GUARD_ID)) return;
    const g = document.createElement("style");
    g.id = GUARD_ID;
    g.textContent =
      ":root{--wc-ui-font:" +
      UI_FONT_STACK +
      ";}" +
      UI_SCOPE_SELECTORS +
      "{--wc-user-font:var(--wc-ui-font) !important;}";
    (document.head || document.documentElement).appendChild(g);
  }

  function clearInjected() {
    document
      .querySelectorAll('[id^="wa-gfont-"],[id^="wa-fontface-"]')
      .forEach((n) => n.remove());
    const s = document.getElementById(STYLE_ID);
    if (s) s.remove();
  }

  // Positive allowlist of READABLE WhatsApp text surfaces. The user font is
  // applied ONLY here — never via a blanket `*` — so WhatsApp's icon glyphs,
  // timestamps, menus, and structural labels keep their own font. Grounded in
  // the selectors the rest of this repo already targets (themes-overrides.css,
  // changeContent.js): chat-list names/preview, message body text, the
  // conversation header name, and the composer input. WhatsApp class names are
  // obfuscated, so we lean on stable attributes (span[title], span[dir],
  // .copyable-text/.selectable-text, contenteditable) rather than hashed
  // classes. Verify against the live DOM if WhatsApp restructures.
  const WA_TEXT_SELECTORS = [
    '#pane-side span[title]', // chat / contact names
    '#pane-side span[dir="auto"]', // last-message preview & metadata text
    "#main .copyable-text", // message bubble text container
    "#main span.selectable-text", // message text + composed text spans
    '#main header span[title]', // open conversation: contact name
    '#main header span[dir="auto"]', // open conversation: subtitle text
    '#main footer div[contenteditable="true"]', // message composer
    'div[contenteditable="true"][data-tab]', // composer (attribute variant)
  ].join(",");

  // Safety net: icons are SVG-based `span[data-icon]` in current WhatsApp, but
  // older builds use ligature/icon fonts. Re-asserting --wc-ui-font here means a
  // text node that an allowlist selector accidentally reaches degrades to the
  // normal UI font ("text unchanged") instead of a broken pixel/script glyph.
  // Emoji render as <img>, which ignore font-family, so they are preserved.
  const WA_ICON_GUARD = "[data-icon],[data-icon] *";

  function applyEntry(entry) {
    clearInjected();
    ensureGuard();
    if (!entry || !entry.font || !entry.font.family) return;
    if (globalThis.WA_INJECT_FONT_FACE) {
      globalThis.WA_INJECT_FONT_FACE(document, entry);
    }
    const fallback =
      entry.font.fallback || globalThis.WA_FONT_FALLBACK || "sans-serif";
    const family = String(entry.font.family).replace(/['\\]/g, "");
    const style = document.createElement("style");
    style.id = STYLE_ID;
    // The user font is delivered via a namespaced custom property so it can be
    // neutralised per-subtree by the UI-scope guard. The var() fallback keeps
    // things sane if the property is ever missing.
    style.textContent =
      ":root{--wc-user-font:'" +
      family +
      "', " +
      fallback +
      ";}" +
      WA_TEXT_SELECTORS +
      "{font-family:var(--wc-user-font, " +
      UI_FONT_STACK +
      ") !important;}" +
      WA_ICON_GUARD +
      "{font-family:var(--wc-ui-font) !important;}";
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
  ensureGuard();
  loadAndApply();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes[ACTIVE_KEY] || changes[CUSTOM_KEY])) {
      loadAndApply();
    }
  });

  // Task 5 — live, transient hover-preview from the popup. Never touches
  // storage, so nothing is committed; clearing simply re-applies the committed
  // state. The next storage change / page reload also restores committed state,
  // so a missed clear can never strand a preview permanently.
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || typeof msg.type !== "string") return;
    if (msg.type === "wc-preview-font") {
      chrome.storage.local.get([CUSTOM_KEY], (data) => {
        const entry = findFont(msg.fontId, data[CUSTOM_KEY]);
        if (entry) applyEntry(entry);
      });
    } else if (msg.type === "wc-preview-clear-font") {
      loadAndApply();
    }
  });
})();
