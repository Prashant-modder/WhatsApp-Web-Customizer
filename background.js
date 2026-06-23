// background.js — MV3 service worker.
//
// Listener registrations (analytics.initAnalytics) MUST be at the top
// level. The SW is reinitialized on event wake-ups; async-registered
// listeners would miss the event that woke them.

importScripts("analytics.js");

self.analytics.initAnalytics();

// Task 4 — first-run discovery. Mark genuine fresh installs (not updates) so the
// in-page coachmark (first-run-hint.js) shows exactly once. Registered at the
// top level so the SW doesn't miss the install event on a cold wake-up.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({ first_run_pending: true });
  }
});

// The uninstall feedback URL (with the anonymous userId appended) is
// registered by setupUninstallTracking(), which initAnalytics() wires to
// onInstalled (install/update) and onStartup (browser launch). The
// registration persists across service-worker restarts, so there is no need
// to re-set it on every SW wake-up here.
