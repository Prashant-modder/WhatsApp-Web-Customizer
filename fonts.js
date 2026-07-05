/* fonts.js
 *
 * Font twin of themes.js. Powers the popup's Typography tab: the Presets/Custom
 * card grid (instant selection), the Create / Manage Fonts / Reset buttons, and
 * keeps the grid live as fonts are added in the manager. Font size is wired
 * separately in fontSizeChange.js.
 */
(function () {
  const ACTIVE_KEY = "fonts:active";
  const CUSTOM_KEY = "fonts:custom";
  const APPLIED_AT_KEY = "fonts:appliedAt";
  let customCount = 0;
  let currentActiveId = null; // committed active font id (from the last render)
  // True while WhatsApp is showing a transient hover-preview that the user has
  // NOT committed. Used to revert on popup close and to log preview discards.
  let previewActive = false;
  let previewStartedAt = 0; // ms timestamp the current preview episode began

  function track(name, props) {
    try {
      if (window.track) props ? window.track(name, props) : window.track(name);
    } catch (e) {
      /* analytics is best-effort */
    }
  }

  // Push a transient message to every open WhatsApp Web tab (host permission
  // covers web.whatsapp.com, so no "tabs" permission is needed). Best-effort:
  // if WhatsApp isn't open, preview is simply a no-op.
  function sendToWhatsApp(msg) {
    try {
      if (!chrome.tabs || !chrome.tabs.query) return;
      chrome.tabs.query({ url: "https://web.whatsapp.com/*" }, (tabs) => {
        if (chrome.runtime.lastError) return;
        (tabs || []).forEach((t) => {
          try {
            chrome.tabs.sendMessage(t.id, msg, () => void chrome.runtime.lastError);
          } catch (e) {
            /* tab went away */
          }
        });
      });
    } catch (e) {
      /* best-effort */
    }
  }

  // Live-preview a font without committing it. Only flags previewActive when the
  // previewed font actually differs from the committed one, so re-hovering the
  // active card never counts as a discard.
  function previewFont(entry) {
    if (!entry || !entry.id) return;
    sendToWhatsApp({ type: "wc-preview-font", fontId: entry.id });
    if (entry.id !== currentActiveId) {
      if (!previewActive) previewStartedAt = Date.now();
      previewActive = true;
    }
  }

  // Stop showing an uncommitted preview and restore the committed font.
  // `discarded:true` means the user browsed away without applying — a normal
  // browsing signal that is logged as font_preview_discarded, kept SEPARATE
  // from font_reset (the regret/revert signal). A revert/commit clears silently.
  function clearFontPreview(opts) {
    if (!previewActive) return;
    previewActive = false;
    sendToWhatsApp({ type: "wc-preview-clear-font" });
    if (opts && opts.discarded) {
      const props = {};
      if (previewStartedAt)
        props.seconds_previewed = Math.max(0, Math.floor((Date.now() - previewStartedAt) / 1000));
      track("font_preview_discarded", props);
    }
    previewStartedAt = 0;
  }

  // Open the full Font Manager (fonts.html), optionally jumping to the editor.
  function openManager(opts) {
    const source = opts && opts.source;
    const hash = (opts && opts.hash) || "";
    track("font_manager_opened", source ? { source: source } : undefined);
    const url = chrome.runtime.getURL("fonts.html") + hash;
    if (chrome.tabs && chrome.tabs.create) chrome.tabs.create({ url: url });
    else window.open(url, "_blank");
  }

  // One font card (wrapped in a Bootstrap .col-6 like the theme cards).
  function buildCard(entry, activeId) {
    const fallback = globalThis.WA_FONT_FALLBACK || "sans-serif";
    if (globalThis.WA_INJECT_FONT_FACE) globalThis.WA_INJECT_FONT_FACE(document, entry);

    const col = document.createElement("div");
    col.className = "col-6";

    const card = document.createElement("div");
    card.className = "theme-card" + (entry.id === activeId ? " active" : "");
    card.dataset.id = entry.id;
    card.setAttribute("role", "button");
    card.tabIndex = 0;

    const swatch = document.createElement("div");
    swatch.className = "theme-swatch font-swatch";
    const sample = document.createElement("div");
    sample.className = "font-sample";
    sample.textContent = "Ag";
    if (entry.font && entry.font.family) {
      const fb = (entry.font && entry.font.fallback) || fallback;
      sample.style.fontFamily =
        "'" + String(entry.font.family).replace(/['\\]/g, "") + "', " + fb;
    }
    swatch.appendChild(sample);

    const label = document.createElement("div");
    label.className = "theme-label";
    label.textContent = entry.name || entry.id;

    const tag = document.createElement("span");
    tag.className = "theme-tag";
    tag.textContent = entry.source === "preset" ? "Preset" : "Custom";

    card.appendChild(swatch);
    card.appendChild(label);
    card.appendChild(tag);
    col.appendChild(card);

    const apply = () => {
      // Explicit commit. The committed state now equals what was being
      // previewed, so the preview is no longer "uncommitted" (and is not a
      // discard).
      previewActive = false;
      previewStartedAt = 0;
      currentActiveId = entry.id;
      chrome.storage.local.set({
        [ACTIVE_KEY]: { id: entry.id },
        [APPLIED_AT_KEY]: Date.now(),
      });
      track("font_applied", {
        font_id: globalThis.WA_SAFE_FONT_ID_FOR_ANALYTICS(entry),
        source: entry.source === "preset" ? "preset" : "custom",
      });
    };
    card.addEventListener("click", apply);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        apply();
      }
    });
    // Hover / keyboard-focus = live preview on WhatsApp without committing.
    card.addEventListener("mouseenter", () => previewFont(entry));
    card.addEventListener("focus", () => previewFont(entry));
    return col;
  }

  function render() {
    const presetsGrid = document.getElementById("font-presets-grid");
    const customsGrid = document.getElementById("font-customs-grid");
    const empty = document.getElementById("font-customs-empty");
    const newBtn = document.getElementById("font-customs-new");
    if (!presetsGrid || !customsGrid) return;

    chrome.storage.local.get([ACTIVE_KEY, CUSTOM_KEY], (data) => {
      const activeId = (data[ACTIVE_KEY] && data[ACTIVE_KEY].id) || null;
      currentActiveId = activeId;
      const presets = Array.isArray(globalThis.WA_FONT_PRESETS)
        ? globalThis.WA_FONT_PRESETS
        : [];
      const customs = Array.isArray(data[CUSTOM_KEY]) ? data[CUSTOM_KEY] : [];
      customCount = customs.length;

      presetsGrid.innerHTML = "";
      presets.forEach((f) => presetsGrid.appendChild(buildCard(f, activeId)));

      customsGrid.innerHTML = "";
      if (customs.length === 0) {
        if (empty) empty.style.display = "";
        if (newBtn) newBtn.style.display = "none";
      } else {
        if (empty) empty.style.display = "none";
        if (newBtn) newBtn.style.display = "";
        customs.forEach((f) => customsGrid.appendChild(buildCard(f, activeId)));
      }
    });
  }

  function subtabName(id) {
    if (id === "fonts-presets") return "presets";
    if (id === "fonts-customs") return "custom";
    return id;
  }

  function switchSubtab(targetId, fireEvent) {
    const tabs = document.querySelectorAll("[data-fonts-subtab]");
    if (!tabs.length) return;
    let from = null;
    tabs.forEach((t) => {
      const isActive = t.dataset.fontsSubtab === targetId;
      if (t.classList.contains("active")) from = t.dataset.fontsSubtab;
      t.classList.toggle("active", isActive);
      t.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    document
      .querySelectorAll("#tab-typography .bg-subpane")
      .forEach((p) => (p.hidden = p.id !== targetId));
    if (fireEvent && from && from !== targetId) {
      track("fonts_subtab_changed", {
        from_subtab: subtabName(from),
        to_subtab: subtabName(targetId),
        custom_font_count: customCount,
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    render();

    document.querySelectorAll("[data-fonts-subtab]").forEach((t) => {
      t.addEventListener("click", () =>
        switchSubtab(t.dataset.fontsSubtab, true)
      );
    });

    const manage = document.getElementById("open-font-manager");
    if (manage) manage.addEventListener("click", () => openManager());

    const create = document.getElementById("create-font");
    if (create)
      create.addEventListener("click", () =>
        openManager({ source: "create_button", hash: "#create" })
      );

    const emptyCreate = document.getElementById("font-customs-create");
    if (emptyCreate)
      emptyCreate.addEventListener("click", () =>
        openManager({ source: "popup_custom_empty_state", hash: "#create" })
      );

    const newBtn = document.getElementById("font-customs-new");
    if (newBtn)
      newBtn.addEventListener("click", () =>
        openManager({ source: "popup_custom_subtab", hash: "#create" })
      );

    const reset = document.getElementById("reset-font");
    if (reset)
      reset.addEventListener("click", () => {
        clearFontPreview();
        chrome.storage.local.get([APPLIED_AT_KEY], (d) => {
          const appliedAt = Number(d[APPLIED_AT_KEY]) || 0;
          const props = { trigger: "manual_button" };
          if (appliedAt)
            props.seconds_since_apply = Math.max(0, Math.floor((Date.now() - appliedAt) / 1000));
          currentActiveId = null;
          chrome.storage.local.remove([ACTIVE_KEY, APPLIED_AT_KEY]);
          track("font_reset", props);
        });
      });

    // Leaving the typography pane reverts any uncommitted hover-preview and
    // logs it as a discard (browsing signal), NOT a reset.
    const typoPane = document.getElementById("tab-typography");
    if (typoPane)
      typoPane.addEventListener("mouseleave", () => clearFontPreview({ discarded: true }));

    // Popup closing with a preview still showing = browsed-and-discarded.
    window.addEventListener("pagehide", () => clearFontPreview({ discarded: true }));

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && (changes[ACTIVE_KEY] || changes[CUSTOM_KEY])) {
        render();
      }
    });
  });
})();
