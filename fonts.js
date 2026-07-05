/* fonts.js
 *
 * Font twin of themes.js. Powers the popup's Typography tab: the Presets/Custom
 * card grid, the Create / Manage Fonts / Reset buttons, and keeps the grid live
 * as fonts are added in the manager. Font size is wired in fontSizeChange.js.
 *
 * Task 2 preview redesign: selecting a font (click / Enter / Space) PREVIEWS it
 * live and persistently — it is NOT applied until the user commits via the
 * shared sticky Apply bar (preview-bar.js). The old hover-preview and the
 * mouseleave / popup-close "discard" paths are gone; those fired
 * font_preview_discarded on ordinary browsing and produced the 0-second-discard
 * noise. Discards now carry a `trigger`: explicit_cancel | replaced_by_other |
 * applied_elsewhere.
 */
(function () {
  const ACTIVE_KEY = "fonts:active";
  const CUSTOM_KEY = "fonts:custom";
  const APPLIED_AT_KEY = "fonts:appliedAt";
  let customCount = 0;
  let currentActiveId = null; // committed active font id (from the last render)
  // Uncommitted preview state. previewId is the font being previewed but not yet
  // applied; it persists across tab switches (nothing clears it but an explicit
  // action) and is the source of the sticky Apply bar.
  let previewActive = false;
  let previewId = null;
  let previewStartedAt = 0;

  function track(name, props) {
    try {
      if (window.track) props ? window.track(name, props) : window.track(name);
    } catch (e) {
      /* analytics is best-effort */
    }
  }

  // Push a transient message to every open WhatsApp Web tab. Best-effort: if
  // WhatsApp isn't open, preview is simply a no-op.
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

  // Toggle the "previewing" affordance on the card matching id (never on the
  // committed-active card, which keeps its own .active state).
  function markPreviewing(id) {
    document.querySelectorAll("#tab-typography .theme-card").forEach((c) => {
      const on = !!id && c.dataset.id === id && c.dataset.id !== currentActiveId;
      c.classList.toggle("previewing", on);
    });
  }

  function logDiscard(trigger) {
    const props = { trigger: trigger };
    if (previewStartedAt)
      props.seconds_previewed = Math.max(0, Math.floor((Date.now() - previewStartedAt) / 1000));
    track("font_preview_discarded", props);
  }

  // Live-preview a font without committing it. Persistent: it stays until the
  // user applies it, reverts it, or selects a different one.
  function selectFont(entry) {
    if (!entry || !entry.id) return;
    // Re-selecting the committed font just cancels any pending preview.
    if (entry.id === currentActiveId) {
      revertPreview(null);
      return;
    }
    if (previewActive && previewId && previewId !== entry.id) {
      logDiscard("replaced_by_other");
    }
    sendToWhatsApp({ type: "wc-preview-font", fontId: entry.id });
    if (!previewActive) previewStartedAt = Date.now();
    previewActive = true;
    previewId = entry.id;
    markPreviewing(entry.id);
    if (window.wcPreviewBar) {
      window.wcPreviewBar.set("font", {
        name: entry.name || entry.id,
        onApply: () => applyFont(entry),
        onRevert: () => revertPreview("explicit_cancel"),
      });
    }
  }

  // Revert the live preview to the committed font. A `trigger` logs a categorised
  // font_preview_discarded; a null trigger reverts silently (e.g. re-selecting
  // the active font, reset, or popup close).
  function revertPreview(trigger) {
    if (!previewActive) return;
    sendToWhatsApp({ type: "wc-preview-clear-font" });
    if (trigger) logDiscard(trigger);
    previewActive = false;
    previewId = null;
    previewStartedAt = 0;
    markPreviewing(null);
    if (window.wcPreviewBar) window.wcPreviewBar.clear("font");
  }

  // Commit the previewed font. Clears preview state BEFORE the storage write so
  // the storage.onChanged listener doesn't mistake our own commit for an
  // external "applied_elsewhere" one.
  function applyFont(entry) {
    previewActive = false;
    previewId = null;
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
    markPreviewing(null);
    if (window.wcPreviewBar) window.wcPreviewBar.clear("font");
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
    let cls = "theme-card";
    if (entry.id === activeId) cls += " active";
    else if (entry.id === previewId) cls += " previewing";
    card.className = cls;
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

    // Click / Enter / Space = select + live-preview (not apply). Commit happens
    // through the sticky Apply bar.
    const select = () => selectFont(entry);
    card.addEventListener("click", select);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        select();
      }
    });
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
      // Keep the preview highlight through re-renders (custom list changes etc.).
      markPreviewing(previewId);
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
      t.addEventListener("click", () => switchSubtab(t.dataset.fontsSubtab, true));
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
        revertPreview(null); // drop any pending preview silently — this is a reset, not a discard
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

    // Popup closing with a preview still showing: revert the live preview so we
    // don't leave an uncommitted font on WhatsApp Web — but this is NOT a user
    // discard, so it is not logged (the sticky bar was the unsaved-preview cue).
    window.addEventListener("pagehide", () => {
      if (previewActive) sendToWhatsApp({ type: "wc-preview-clear-font" });
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      // A commit that landed from another surface while we were previewing.
      if (changes[ACTIVE_KEY] && previewActive) {
        const nv = changes[ACTIVE_KEY].newValue;
        const newId = nv && nv.id;
        if (newId !== previewId) revertPreview("applied_elsewhere");
      }
      if (changes[ACTIVE_KEY] || changes[CUSTOM_KEY]) render();
    });
  });
})();
