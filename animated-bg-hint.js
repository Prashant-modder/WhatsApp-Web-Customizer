/* animated-bg-hint.js  (Task 3 — cap & persist the animated-background hint)
 *
 * Data point driving this: animated_hint_shown fired 798x across 166 users but
 * was dismissed only 16x — individual users saw it 32, 27, 26, 22 times. The
 * old code re-revealed the hint on every popup open until the user happened to
 * dismiss it, so it nagged indefinitely.
 *
 * Fix: a persisted lifetime show counter caps the hint at SHOW_CAP total, and
 * a single dismiss is sticky forever. Both keys are additive and migration-safe
 * (absent -> 0 / not-dismissed). This file runs once per popup load, so there
 * is no mutation/re-render loop to re-fire within a single load.
 */
!(function () {
  "use strict";

  var SEEN_KEY = "animatedBgHintSeen"; // sticky-dismiss flag (pre-existing)
  var COUNT_KEY = "animatedBgHintShowCount"; // lifetime shows (new, additive)
  var SHOW_CAP = 3;

  var tab = document.getElementById("tab-backgrounds");
  if (!tab) return;

  var subtab = tab.querySelector('[data-bg-subtab="bg-animated"]');
  var badge = document.getElementById("bg-animated-badge");
  var hint = document.getElementById("bg-anim-hint");
  var cta = document.getElementById("bg-anim-hint-cta");
  var dismissBtn = document.getElementById("bg-anim-hint-dismiss");
  if (!subtab) return;

  var dismissed = false;

  function track(name, props) {
    try {
      if (window.track) window.track(name, props || {});
    } catch (e) {
      /* analytics best-effort */
    }
  }

  function dismiss(method) {
    if (dismissed) return;
    dismissed = true;
    if (badge) badge.hidden = true;
    if (hint) hint.hidden = true;
    subtab.classList.remove("pulse");
    try {
      chrome.storage.local.set({ [SEEN_KEY]: true });
    } catch (e) {
      /* best-effort */
    }
    track("animated_hint_dismissed", { method: method || "unknown" });
  }

  subtab.addEventListener("click", function () {
    dismiss("subtab_click");
  });
  if (dismissBtn) {
    dismissBtn.addEventListener("click", function () {
      dismiss("close");
    });
  }
  if (cta) {
    cta.addEventListener("click", function () {
      track("animated_hint_cta_clicked", {});
      subtab.click();
    });
  }

  try {
    chrome.storage.local.get([SEEN_KEY, COUNT_KEY], function (data) {
      if (data && data[SEEN_KEY]) return; // dismissed once -> never again
      var count = Number((data && data[COUNT_KEY]) || 0);
      if (count >= SHOW_CAP) return; // lifetime cap reached
      var next = count + 1;
      try {
        chrome.storage.local.set({ [COUNT_KEY]: next });
      } catch (e) {
        /* best-effort */
      }
      if (badge) badge.hidden = false;
      if (hint) hint.hidden = false;
      subtab.classList.add("pulse");
      track("animated_hint_shown", { show_count: next });
    });
  } catch (e) {
    /* storage unavailable — skip the hint silently */
  }
})();
