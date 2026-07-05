/* first-run-theme-picker.js — one-time "Pick your look" overlay shown on the
 * first popup open after a fresh install.
 *
 * Gating: background.js sets onboarding_pending=true on reason==="install" only.
 * We show the overlay when onboarding_pending is set and has_seen_onboarding is
 * not; we then persist has_seen_onboarding and clear onboarding_pending so it
 * shows exactly once (surviving a second popup open mid-render). Users upgrading
 * from an older version never get onboarding_pending, so they never see it.
 *
 * The seen flag is only written once we've confirmed the overlay and presets are
 * actually renderable, so a failed render can't consume the one-shot silently.
 *
 * Applying a preset writes themes:active (the same key themes.js writes), which
 * the content script reads and paints live on WhatsApp Web. Instantly
 * dismissible — it never blocks popup or WhatsApp Web usage.
 */
(function () {
  "use strict";

  // 4 strong, colour-diverse Edelstein presets, by id. Preset CONTENT is owned
  // by themes-presets.js and is never duplicated or modified here.
  var FEATURED = ["preset-saphir", "preset-smaragd", "preset-amethyst", "preset-rubin"];

  function track(event, props) {
    try {
      window.track && window.track(event, props || {});
    } catch (e) {}
  }

  // presets are built-in (id starts with "preset-"), so theme_id carries no PII.
  function safeId(preset) {
    try {
      if (globalThis.WA_SAFE_THEME_ID_FOR_ANALYTICS)
        return globalThis.WA_SAFE_THEME_ID_FOR_ANALYTICS(preset);
    } catch (e) {}
    return preset && preset.id ? preset.id : "unknown";
  }

  // Mirror themes.js's 4-stripe swatch so onboarding cards read as real themes.
  function buildSwatch(vars) {
    vars = vars || {};
    var stripes = [
      vars["--wc-load-side"] || "#222",
      vars["--wc-load-item"] || "#333",
      vars["--wc-bubble-out"] || "#444",
      vars["--wc-link"] || "#10b981",
    ];
    var row = document.createElement("div");
    row.className = "onboarding-swatch";
    stripes.forEach(function (c) {
      var s = document.createElement("div");
      s.style.cssText = "flex:1 1 0; background:" + c + ";";
      row.appendChild(s);
    });
    return row;
  }

  // Featured presets in order, backfilled from the full list so we always offer
  // up to 4 even if a featured id is ever renamed.
  function featuredPresets() {
    var all = Array.isArray(globalThis.WA_THEME_PRESETS) ? globalThis.WA_THEME_PRESETS : [];
    var byId = {};
    all.forEach(function (p) {
      if (p && p.id) byId[p.id] = p;
    });
    var out = [];
    FEATURED.forEach(function (id) {
      if (byId[id]) out.push(byId[id]);
    });
    for (var i = 0; out.length < 4 && i < all.length; i++) {
      if (out.indexOf(all[i]) === -1) out.push(all[i]);
    }
    return out.slice(0, 4);
  }

  var overlay = null;
  var closed = false;

  function close(reason) {
    if (closed) return;
    closed = true;
    if (overlay) overlay.style.display = "none";
    document.removeEventListener("keydown", onKey);
    if (reason === "dismissed") track("onboarding_dismissed", {});
  }

  function onKey(e) {
    if (e.key === "Escape") close("dismissed");
  }

  function apply(preset) {
    try {
      chrome.storage.local.set({
        "themes:active": { id: preset.id },
        "themes:appliedAt": Date.now(),
      });
    } catch (e) {}
    track("onboarding_theme_selected", { theme_id: safeId(preset), source: "onboarding" });
  }

  // Paint the (already-confirmed renderable) overlay and wire dismissal.
  function render(presets) {
    var grid = document.getElementById("onboarding-grid");
    grid.innerHTML = "";
    presets.forEach(function (preset) {
      var card = document.createElement("div");
      card.className = "onboarding-theme";
      card.setAttribute("role", "button");
      card.tabIndex = 0;
      card.appendChild(buildSwatch(preset.vars));
      var name = document.createElement("div");
      name.className = "onboarding-name";
      name.textContent = preset.name || preset.id;
      card.appendChild(name);
      var choose = function () {
        apply(preset);
        close("selected");
      };
      card.addEventListener("click", choose);
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          choose();
        }
      });
      grid.appendChild(card);
    });

    var closeBtn = document.getElementById("onboarding-close");
    var skipBtn = document.getElementById("onboarding-skip");
    if (closeBtn) closeBtn.addEventListener("click", function () { close("dismissed"); });
    if (skipBtn) skipBtn.addEventListener("click", function () { close("dismissed"); });
    // Click on the backdrop (outside the card) dismisses.
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close("dismissed");
    });
    document.addEventListener("keydown", onKey);

    overlay.style.display = "flex";
    track("onboarding_shown", { theme_count: presets.length });
  }

  function maybeShow() {
    try {
      chrome.storage.local.get(["onboarding_pending", "has_seen_onboarding"], function (data) {
        if (chrome.runtime.lastError) return;
        if (!data || !data.onboarding_pending || data.has_seen_onboarding) return;

        overlay = document.getElementById("onboarding-overlay");
        var grid = document.getElementById("onboarding-grid");
        var presets = featuredPresets();
        // If anything needed to render is missing, leave the flags intact so a
        // later popup open can retry rather than burning the one-shot.
        if (!overlay || !grid || !presets.length) return;

        chrome.storage.local.set({ has_seen_onboarding: true });
        chrome.storage.local.remove("onboarding_pending");
        render(presets);
      });
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", maybeShow);
  } else {
    maybeShow();
  }
})();
