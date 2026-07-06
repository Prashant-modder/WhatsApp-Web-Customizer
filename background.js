// background.js — MV3 service worker.
//
// Listener registrations (analytics.initAnalytics) MUST be at the top
// level. The SW is reinitialized on event wake-ups; async-registered
// listeners would miss the event that woke them.

importScripts("analytics.js");

self.analytics.initAnalytics();

// Task 4 — first-run discovery. Mark genuine fresh installs (not updates) so the
// first-run surfaces show exactly once. Registered at the top level so the SW
// doesn't miss the install event on a cold wake-up.
//
// Two independent flags for two independent surfaces, so they can't race each
// other by both consuming a single flag:
//   - first_run_pending  → in-page coachmark on WhatsApp Web (first-run-hint.js)
//   - onboarding_pending  → "Pick your look" picker on first popup open
//                           (first-run-theme-picker.js)
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({ first_run_pending: true, onboarding_pending: true });
  }
});

// Quick Reply lazy-load migration (one-time). Only 2.4% of users ever add a
// quick reply, yet the feature's MutationObserver ran for 100% of loads. The new
// default is OFF, but existing users must not notice the change: anyone with at
// least one saved reply — or a prior explicit enable — keeps the feature ON.
//
// Keyed on a persisted flag so it computes the enable state exactly once, never
// on later loads. After migration the toggle is fully user-controlled and the
// content script pays only a single boolean read per load.
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const ENABLED_KEY = "quickRepliesEnabled";
    const MIGRATED_KEY = "qr_enabled_migrated";
    const data = await chrome.storage.local.get([ENABLED_KEY, MIGRATED_KEY, "quickReplies"]);
    if (data[MIGRATED_KEY]) return; // already decided — do not recompute
    const hasReplies = Array.isArray(data.quickReplies) && data.quickReplies.length > 0;
    const explicitlyEnabled = data[ENABLED_KEY] === true;
    await chrome.storage.local.set({
      [ENABLED_KEY]: hasReplies || explicitlyEnabled,
      [MIGRATED_KEY]: true,
    });
  } catch (err) {
    console.warn("[quick-reply] enable migration failed:", err && err.message);
  }
});

// The uninstall feedback URL (with the anonymous userId appended) is
// registered by setupUninstallTracking(), which initAnalytics() wires to
// onInstalled (install/update) and onStartup (browser launch). The
// registration persists across service-worker restarts, so there is no need
// to re-set it on every SW wake-up here.
