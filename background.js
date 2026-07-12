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

// Quick Replies removal cleanup (one-time). The feature was removed in 1.2.0.
// Only 2.6% of users ever created/edited/deleted a quick reply, and it was the
// heaviest content-script surface (bubble injection + a composer MutationObserver).
// Delete every key it ever wrote so existing users aren't left with dead data in
// chrome.storage. Runs on install and update; storage.remove is idempotent, so
// re-running on a later update is harmless and needs no migration flag.
chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.storage.local.remove([
      "quickReplies",
      "quickRepliesEnabled",
      "qr_enabled_migrated",
      "qr_first_added_at",
    ]);
  } catch (err) {
    console.warn("[quick-reply] removal cleanup failed:", err && err.message);
  }
});

// The uninstall feedback URL (with the anonymous userId appended) is
// registered by setupUninstallTracking(), which initAnalytics() wires to
// onInstalled (install/update) and onStartup (browser launch). The
// registration persists across service-worker restarts, so there is no need
// to re-set it on every SW wake-up here.
