/* themes.js
 *
 * Powers the popup's Themes tab: the Presets/Custom card grid, the
 * Create / Manage Themes / Reset buttons, and keeps the grid live as custom
 * themes are saved in the manager.
 *
 * Task 2 preview redesign: selecting a theme (click / Enter / Space) PREVIEWS it
 * live and persistently — it is NOT applied until the user commits via the
 * shared sticky Apply bar (preview-bar.js). The old hover-preview and the
 * mouseleave / popup-close "discard" paths are gone; those fired
 * theme_preview_discarded on ordinary browsing and produced the 0-second-discard
 * noise. Discards now carry a `trigger`: explicit_cancel | replaced_by_other |
 * applied_elsewhere.
 *
 * (This file was previously shipped minified; it is de-minified here so the
 * preview rewrite is reviewable. No build step exists — this IS the source.)
 */
(function () {
  const ACTIVE_KEY = "themes:active";
  const CUSTOM_KEY = "themes:custom";
  const APPLIED_AT_KEY = "themes:appliedAt";

  let customCount = 0;
  let currentActiveId = null; // committed active theme id (from the last render)
  // Uncommitted preview state — persists across tab switches until an explicit
  // action; drives the sticky Apply bar.
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

  // Push a transient message to every open WhatsApp Web tab. Best-effort.
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

  function markPreviewing(id) {
    document.querySelectorAll("#tab-themes .theme-card").forEach((c) => {
      const on = !!id && c.dataset.id === id && c.dataset.id !== currentActiveId;
      c.classList.toggle("previewing", on);
    });
  }

  function logDiscard(trigger) {
    const props = { trigger: trigger };
    if (previewStartedAt)
      props.seconds_previewed = Math.max(0, Math.floor((Date.now() - previewStartedAt) / 1000));
    track("theme_preview_discarded", props);
  }

  // Live-preview a theme without committing it. Persistent.
  function selectTheme(theme) {
    if (!theme || !theme.id) return;
    if (theme.id === currentActiveId) {
      revertPreview(null); // re-selecting the committed theme just cancels a pending preview
      return;
    }
    if (previewActive && previewId && previewId !== theme.id) {
      logDiscard("replaced_by_other");
    }
    sendToWhatsApp({ type: "wc-preview-theme", themeId: theme.id });
    if (!previewActive) previewStartedAt = Date.now();
    previewActive = true;
    previewId = theme.id;
    markPreviewing(theme.id);
    if (window.wcPreviewBar) {
      window.wcPreviewBar.set("theme", {
        name: theme.name || theme.id,
        onApply: () => applyTheme(theme),
        onRevert: () => revertPreview("explicit_cancel"),
      });
    }
  }

  function revertPreview(trigger) {
    if (!previewActive) return;
    sendToWhatsApp({ type: "wc-preview-clear-theme" });
    if (trigger) logDiscard(trigger);
    previewActive = false;
    previewId = null;
    previewStartedAt = 0;
    markPreviewing(null);
    if (window.wcPreviewBar) window.wcPreviewBar.clear("theme");
  }

  // Commit the previewed theme. Clears preview state BEFORE the storage write so
  // the storage.onChanged listener doesn't mistake our own commit for an
  // external "applied_elsewhere" one.
  function applyTheme(theme) {
    previewActive = false;
    previewId = null;
    previewStartedAt = 0;
    currentActiveId = theme.id;
    chrome.storage.local.set({
      [ACTIVE_KEY]: { id: theme.id },
      [APPLIED_AT_KEY]: Date.now(),
    });
    track("theme_applied", {
      theme_id: globalThis.WA_SAFE_THEME_ID_FOR_ANALYTICS(theme),
      source: theme.source === "preset" ? "preset" : "custom",
    });
    markPreviewing(null);
    if (window.wcPreviewBar) window.wcPreviewBar.clear("theme");
  }

  // Open the full Theme Manager (themes.html), optionally jumping to the editor.
  function openManager(opts) {
    const source = opts && opts.source;
    const hash = (opts && opts.hash) || "";
    try {
      if (window.track)
        source
          ? window.track("theme_manager_opened", { source: source })
          : window.track("theme_manager_opened");
    } catch (e) {
      /* best-effort */
    }
    const url = chrome.runtime.getURL("src/pages/themes/themes.html") + hash;
    if (chrome.tabs && chrome.tabs.create) chrome.tabs.create({ url: url });
    else window.open(url, "_blank");
  }

  // The 4-stripe theme swatch (load-side / load-item / bubble-out / link).
  function buildSwatch(vars) {
    vars = vars || {};
    const stripes = [
      vars["--wc-load-side"] || "#222",
      vars["--wc-load-item"] || "#333",
      vars["--wc-bubble-out"] || "#444",
      vars["--wc-link"] || "#10b981",
    ];
    const row = document.createElement("div");
    row.style.cssText = "display:flex; width:100%; height:100%;";
    stripes.forEach((c) => {
      const s = document.createElement("div");
      s.style.cssText = `flex:1 1 0; background:${c};`;
      row.appendChild(s);
    });
    return row;
  }

  function buildCard(theme, activeId) {
    const col = document.createElement("div");
    col.className = "col-6";

    const card = document.createElement("div");
    let cls = "theme-card";
    if (theme.id === activeId) cls += " active";
    else if (theme.id === previewId) cls += " previewing";
    card.className = cls;
    card.dataset.id = theme.id;
    card.setAttribute("role", "button");
    card.tabIndex = 0;

    const swatch = document.createElement("div");
    swatch.className = "theme-swatch";
    swatch.appendChild(buildSwatch(theme.vars || {}));

    const label = document.createElement("div");
    label.className = "theme-label";
    label.textContent = theme.name || theme.id;

    const tag = document.createElement("span");
    tag.className = "theme-tag";
    tag.textContent = theme.source === "preset" ? "Preset" : "Custom";

    card.appendChild(swatch);
    card.appendChild(label);
    card.appendChild(tag);
    col.appendChild(card);

    // Click / Enter / Space = select + live-preview (not apply). Commit happens
    // through the sticky Apply bar.
    const select = () => selectTheme(theme);
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
    const presetsGrid = document.getElementById("theme-presets-grid");
    const customsGrid = document.getElementById("theme-customs-grid");
    const empty = document.getElementById("theme-customs-empty");
    const newBtn = document.getElementById("theme-customs-new");
    if (!presetsGrid || !customsGrid) return;

    chrome.storage.local.get([ACTIVE_KEY, CUSTOM_KEY], (data) => {
      const activeId = (data[ACTIVE_KEY] && data[ACTIVE_KEY].id) || null;
      currentActiveId = activeId;

      const presets = Array.isArray(globalThis.WA_THEME_PRESETS)
        ? globalThis.WA_THEME_PRESETS
        : [];
      const rawCustoms = Array.isArray(data[CUSTOM_KEY]) ? data[CUSTOM_KEY] : [];
      const customs = rawCustoms.map((x) =>
        globalThis.WA_MIGRATE_THEME ? globalThis.WA_MIGRATE_THEME(x) : x
      );

      presetsGrid.innerHTML = "";
      presets.forEach((th) => presetsGrid.appendChild(buildCard(th, activeId)));

      customsGrid.innerHTML = "";
      customCount = customs.length;
      if (customs.length === 0) {
        if (empty) empty.style.display = "";
        if (newBtn) newBtn.style.display = "none";
      } else {
        if (empty) empty.style.display = "none";
        if (newBtn) newBtn.style.display = "";
        customs.forEach((th) => customsGrid.appendChild(buildCard(th, activeId)));
      }
      // Keep the preview highlight through re-renders.
      markPreviewing(previewId);
    });
  }

  function subtabName(id) {
    if (id === "themes-presets") return "presets";
    if (id === "themes-customs") return "custom";
    return id;
  }

  function switchSubtab(targetId, fireEvent) {
    const tabs = document.querySelectorAll("[data-themes-subtab]");
    if (!tabs.length) return;
    let from = null;
    tabs.forEach((t) => {
      const isActive = t.dataset.themesSubtab === targetId;
      if (t.classList.contains("active")) from = t.dataset.themesSubtab;
      t.classList.toggle("active", isActive);
      t.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    document
      .querySelectorAll("#tab-themes .bg-subpane")
      .forEach((p) => (p.hidden = p.id !== targetId));
    if (fireEvent && from && from !== targetId) {
      track("themes_subtab_changed", {
        from_subtab: subtabName(from),
        to_subtab: subtabName(targetId),
        custom_theme_count: customCount,
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    render();

    document.querySelectorAll("[data-themes-subtab]").forEach((t) => {
      t.addEventListener("click", () => switchSubtab(t.dataset.themesSubtab, true));
    });

    const manage = document.getElementById("open-theme-manager");
    if (manage) manage.addEventListener("click", () => openManager());

    const create = document.getElementById("create-theme");
    if (create)
      create.addEventListener("click", () =>
        openManager({ source: "create_button", hash: "#create" })
      );

    const emptyCreate = document.getElementById("theme-customs-create");
    if (emptyCreate)
      emptyCreate.addEventListener("click", () =>
        openManager({ source: "popup_custom_empty_state", hash: "#create" })
      );

    const newBtn = document.getElementById("theme-customs-new");
    if (newBtn)
      newBtn.addEventListener("click", () =>
        openManager({ source: "popup_custom_subtab", hash: "#create" })
      );

    const reset = document.getElementById("reset-theme");
    if (reset)
      reset.addEventListener("click", () => {
        revertPreview(null); // drop any pending preview silently — this is a reset, not a discard
        try {
          chrome.storage.local.set({ "review:lastResetDate": Date.now() });
        } catch (e) {
          /* best-effort */
        }
        chrome.storage.local.get([APPLIED_AT_KEY], (d) => {
          const appliedAt = Number(d[APPLIED_AT_KEY]) || 0;
          const props = { trigger: "manual_button" };
          if (appliedAt)
            props.seconds_since_apply = Math.max(0, Math.floor((Date.now() - appliedAt) / 1000));
          currentActiveId = null;
          chrome.storage.local.remove([ACTIVE_KEY, APPLIED_AT_KEY]);
          track("theme_reset", props);
        });
      });

    // Popup closing with a preview still showing: revert the live preview so we
    // don't leave an uncommitted theme on WhatsApp Web — NOT logged as a discard.
    window.addEventListener("pagehide", () => {
      if (previewActive) sendToWhatsApp({ type: "wc-preview-clear-theme" });
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes[ACTIVE_KEY] && previewActive) {
        const nv = changes[ACTIVE_KEY].newValue;
        const newId = nv && nv.id;
        if (newId !== previewId) revertPreview("applied_elsewhere");
      }
      if (changes[ACTIVE_KEY] || changes[CUSTOM_KEY]) render();
    });
  });
})();
