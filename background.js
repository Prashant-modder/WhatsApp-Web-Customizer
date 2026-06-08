// background.js — MV3 service worker.
//
// Listener registrations (analytics.initAnalytics) MUST be at the top
// level. The SW is reinitialized on event wake-ups; async-registered
// listeners would miss the event that woke them.

importScripts("analytics.js");

self.analytics.initAnalytics();

// The uninstall feedback URL (with the anonymous userId appended) is
// registered by setupUninstallTracking(), which initAnalytics() wires to
// onInstalled (install/update) and onStartup (browser launch). The
// registration persists across service-worker restarts, so there is no need
// to re-set it on every SW wake-up here.
