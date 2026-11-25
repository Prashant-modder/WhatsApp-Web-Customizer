/* preview-bar.js — shared sticky "Apply" bar for uncommitted theme/font previews.
 *
 * Task 2 redesign: selecting a theme or font PREVIEWS it live (persistently)
 * instead of instantly applying. This bar is the single, always-visible commit
 * affordance while any preview is pending. It lives at the popup-chrome level
 * (below the tab content), so switching popup tabs never silently drops a
 * preview — and it doubles as the "you have an unsaved preview" indicator.
 *
 * themes.js and fonts.js stay decoupled: each registers/clears its own pending
 * preview here via window.wcPreviewBar. Apply commits every pending preview;
 * Revert discards every pending preview.
 */
(function () {
  "use strict";

  var pending = { theme: null, font: null }; // kind -> { name, onApply, onRevert }
  var els = null;

  function wire() {
    if (els) return els;
    var root = document.getElementById("preview-bar");
    if (!root) return null;
    els = {
      root: root,
      label: document.getElementById("preview-bar-label"),
      apply: document.getElementById("preview-bar-apply"),
      revert: document.getElementById("preview-bar-revert"),
    };
    if (els.apply) els.apply.addEventListener("click", function () { commit("apply"); });
    if (els.revert) els.revert.addEventListener("click", function () { commit("revert"); });
    return els;
  }

  function names() {
    var out = [];
    if (pending.theme) out.push(pending.theme.name);
    if (pending.font) out.push(pending.font.name);
    return out;
  }

  function anyPending() {
    return !!(pending.theme || pending.font);
  }

  function renderBar() {
    var ui = wire();
    if (!ui) return;
    if (!anyPending()) {
      ui.root.hidden = true;
      return;
    }
    var ns = names();
    if (ui.label) ui.label.textContent = "Previewing: " + ns.join(" + ");
    if (ui.apply) ui.apply.textContent = ns.length > 1 ? "Apply both" : "Apply “" + ns[0] + "”";
    ui.root.hidden = false;
  }

  // Run every pending kind's onApply/onRevert, then clear all. Snapshot first so
  // a callback that clears its own kind can't mutate the map mid-iteration.
  function commit(action) {
    var snapshot = ["theme", "font"]
      .map(function (k) { return pending[k]; })
      .filter(Boolean);
    pending = { theme: null, font: null };
    snapshot.forEach(function (p) {
      try {
        var fn = action === "apply" ? p.onApply : p.onRevert;
        if (typeof fn === "function") fn();
      } catch (e) {
        /* a broken callback must not block the others */
      }
    });
    renderBar();
  }

  window.wcPreviewBar = {
    // spec: { name, onApply, onRevert }. Replacing an existing kind is fine —
    // the caller is responsible for logging replaced_by_other on the outgoing one.
    set: function (kind, spec) {
      if (kind !== "theme" && kind !== "font") return;
      pending[kind] = spec || null;
      renderBar();
    },
    clear: function (kind) {
      if (kind !== "theme" && kind !== "font") return;
      pending[kind] = null;
      renderBar();
    },
    isPending: function (kind) {
      return kind ? !!pending[kind] : anyPending();
    },
  };
})();
