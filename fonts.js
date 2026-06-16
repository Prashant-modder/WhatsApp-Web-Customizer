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
  let customCount = 0;

  function track(name, props) {
    try {
      if (window.track) props ? window.track(name, props) : window.track(name);
    } catch (e) {
      /* analytics is best-effort */
    }
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
      chrome.storage.local.set({ [ACTIVE_KEY]: { id: entry.id } });
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
        chrome.storage.local.remove(ACTIVE_KEY);
        track("font_reset");
      });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && (changes[ACTIVE_KEY] || changes[CUSTOM_KEY])) {
        render();
      }
    });
  });
})();
