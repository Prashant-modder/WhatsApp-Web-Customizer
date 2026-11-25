/* save-nudge.js  (Task 1 — anti-reset activation nudge)
 *
 * Data point driving this: theme_applied fires ~8x more often than
 * custom_theme_saved, and uninstallers commonly apply 3+ themes then hit
 * theme_reset and leave without ever committing to a look. This nudge invites
 * those high-effort triers to *save* the look they like, turning trial into a
 * persisted outcome.
 *
 * Behaviour:
 *   - Counts distinct themes applied in the current session WITHOUT a save.
 *   - At >=3 distinct applies, surfaces a lightweight, dismissible banner in the
 *     Themes tab inviting "Save this theme". Never modal, never blocking.
 *   - Also offers it once AFTER a reset (theme_reset) when >=3 were applied.
 *   - Self-suppresses: at most once per session, at most 3 times ever, and
 *     never again once the user has any saved custom theme.
 *
 * State lives in a single additive storage key (saveNudge:v1) so it is fully
 * migration-safe: absent -> sensible defaults, never wipes existing data. We
 * piggy-back on themes:active changes to detect applies/resets rather than
 * editing the (minified) themes.js apply/reset handlers.
 */
(function () {
  "use strict";

  var STATE_KEY = "saveNudge:v1";
  var ACTIVE_KEY = "themes:active";
  var CUSTOM_KEY = "themes:custom";

  var SESSION_GAP_MS = 30 * 60 * 1000; // a fresh session after 30 min idle
  var APPLY_THRESHOLD = 3;
  var LIFETIME_CAP = 3;

  // In-memory mirror of the persisted state; storage remains the source of truth.
  var state = null;
  var shownThisRender = false; // banner currently visible & not yet acted on
  var ui = null;

  function track(name, props) {
    try {
      if (window.track) window.track(name, props || {});
    } catch (e) {
      /* analytics is best-effort */
    }
  }

  function getLocal(keys) {
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.get(keys, function (data) {
          resolve(data || {});
        });
      } catch (e) {
        resolve({});
      }
    });
  }

  function persist() {
    try {
      chrome.storage.local.set({ [STATE_KEY]: state });
    } catch (e) {
      /* best-effort */
    }
  }

  function normalize(raw) {
    var s = raw && typeof raw === "object" ? raw : {};
    return {
      sessionTs: Number(s.sessionTs || 0),
      appliedIds: Array.isArray(s.appliedIds) ? s.appliedIds.slice() : [],
      shownThisSession: !!s.shownThisSession,
      lifetimeShown: Number(s.lifetimeShown || 0),
      hasSaved: !!s.hasSaved,
    };
  }

  // True once the user has committed to any custom theme — nudge retires for good.
  function isSuppressed() {
    return !!state.hasSaved;
  }

  function rolloverSession(now) {
    if (!state.sessionTs || now - state.sessionTs > SESSION_GAP_MS) {
      state.appliedIds = [];
      state.shownThisSession = false;
    }
    state.sessionTs = now;
  }

  function showNudge(trigger) {
    if (!ui) return;
    state.shownThisSession = true;
    state.lifetimeShown = state.lifetimeShown + 1;
    persist();

    if (trigger === "post_reset") {
      ui.title.textContent = "Not happy with the look?";
      ui.msg.textContent =
        "Save a starting point first, or browse presets — your next look is one tap from permanent.";
    } else {
      ui.title.textContent = "Found a look you like?";
      ui.msg.textContent =
        "Save it as a custom theme so it's one tap away next time.";
    }
    ui.root.hidden = false;
    shownThisRender = true;
    track("save_nudge_shown", {
      applied_count_in_session: state.appliedIds.length,
      trigger: trigger,
    });
  }

  function hideNudge() {
    if (ui) ui.root.hidden = true;
    shownThisRender = false;
  }

  function maybeShow(trigger) {
    if (isSuppressed()) return;
    if (state.shownThisSession) return;
    if (state.lifetimeShown >= LIFETIME_CAP) return;
    if (state.appliedIds.length < APPLY_THRESHOLD) return;
    showNudge(trigger);
  }

  function onApplied(themeId) {
    if (isSuppressed()) return;
    state.sessionTs = Date.now();
    if (themeId && state.appliedIds.indexOf(themeId) === -1) {
      state.appliedIds.push(themeId);
    }
    persist();
    maybeShow("apply_threshold");
  }

  function onReset() {
    // Surface once, AFTER the reset has committed, so it never adds friction to
    // the reset itself.
    maybeShow("post_reset");
  }

  function wire() {
    var root = document.getElementById("save-nudge");
    if (!root) return;
    ui = {
      root: root,
      title: document.getElementById("save-nudge-title"),
      msg: document.getElementById("save-nudge-msg"),
      save: document.getElementById("save-nudge-save"),
      dismiss: document.getElementById("save-nudge-dismiss"),
    };

    if (ui.save) {
      ui.save.addEventListener("click", function () {
        track("save_nudge_action", { action: "saved" });
        shownThisRender = false;
        hideNudge();
        // One-tap path into the manager's create/save flow.
        try {
          var url = chrome.runtime.getURL("src/pages/themes/themes.html") + "#create";
          if (chrome.tabs && chrome.tabs.create) chrome.tabs.create({ url: url });
          else window.open(url, "_blank");
        } catch (e) {
          /* ignore */
        }
      });
    }
    if (ui.dismiss) {
      ui.dismiss.addEventListener("click", function () {
        track("save_nudge_action", { action: "dismissed" });
        shownThisRender = false;
        hideNudge();
      });
    }

    // Shown but the popup closed without interaction -> "ignored".
    window.addEventListener("pagehide", function () {
      if (shownThisRender) {
        shownThisRender = false;
        track("save_nudge_action", { action: "ignored" });
      }
    });
  }

  function watchStorage() {
    try {
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== "local") return;
        // A saved custom theme retires the nudge permanently.
        if (changes[CUSTOM_KEY]) {
          var nv = changes[CUSTOM_KEY].newValue;
          if (Array.isArray(nv) && nv.length > 0 && !state.hasSaved) {
            state.hasSaved = true;
            persist();
            hideNudge();
          }
        }
        // themes:active is only ever written by the popup: set -> apply,
        // removed -> reset.
        if (changes[ACTIVE_KEY]) {
          var av = changes[ACTIVE_KEY].newValue;
          if (av && av.id) onApplied(av.id);
          else if (typeof av === "undefined") onReset();
        }
      });
    } catch (e) {
      /* ignore */
    }
  }

  function init() {
    wire();
    getLocal([STATE_KEY, CUSTOM_KEY]).then(function (data) {
      state = normalize(data[STATE_KEY]);
      var customs = data[CUSTOM_KEY];
      // Existing users with saved customs never see the nudge.
      if (Array.isArray(customs) && customs.length > 0) state.hasSaved = true;
      rolloverSession(Date.now());
      persist();
      watchStorage();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
