/* first-run-hint.js
 *
 * Task 4 — first-run popup discovery.
 *
 * 45% of new installers never open the popup, so they get zero value and
 * churn. On the FIRST WhatsApp Web load after a fresh install (only), this
 * shows a small, dismissible, non-blocking coachmark anchored to the injected
 * burger entry, pointing the user at the extension icon that opens the
 * customizer. It is shown at most once and never re-appears.
 *
 * Gating:
 *   - `first_run_pending` is set ONLY on the `install` reason (see
 *     background.js), so users who merely *update* never see it.
 *   - `first_run_seen` is set the moment the hint renders, so it shows once
 *     even across reloads/tabs.
 *
 * Events: first_run_hint_shown / first_run_hint_clicked / first_run_hint_dismissed.
 */
(function () {
  "use strict";

  const PENDING_KEY = "first_run_pending";
  const SEEN_KEY = "first_run_seen";
  const HOST_ID = "wc-first-run-hint";

  function track(name) {
    try {
      window.track && window.track(name);
    } catch (e) {
      /* analytics is best-effort */
    }
  }

  // Resolve the in-page entry to anchor against: prefer our injected burger,
  // fall back to the chat-list header so the hint still has a sensible home if
  // the burger hasn't mounted yet.
  function findAnchor() {
    return (
      document.querySelector(".custom-burger-menu") ||
      document.querySelector('header[data-testid="chatlist-header"]') ||
      null
    );
  }

  function removeHint() {
    const el = document.getElementById(HOST_ID);
    if (el) el.remove();
  }

  function dismiss(eventName) {
    track(eventName);
    removeHint();
  }

  function position(host, anchor) {
    try {
      const r = anchor.getBoundingClientRect();
      // Sit just below the entry, nudged in from the left edge.
      const top = Math.max(8, Math.min(window.innerHeight - 80, r.bottom + 10));
      const left = Math.max(8, Math.min(window.innerWidth - 280, r.left));
      host.style.top = top + "px";
      host.style.left = left + "px";
    } catch (e) {
      host.style.top = "64px";
      host.style.left = "12px";
    }
  }

  function render(anchor) {
    if (document.getElementById(HOST_ID)) return;

    const host = document.createElement("div");
    host.id = HOST_ID;
    // .wc-ui-scope keeps the hint in the fixed UI font even when the user has
    // applied a decorative font to WhatsApp (see fonts-content.js guard).
    host.className = "wc-ui-scope";
    host.setAttribute("role", "dialog");
    host.setAttribute("aria-label", "Customize WhatsApp");
    host.style.cssText = [
      "position:fixed",
      "z-index:2147483646",
      "max-width:260px",
      "background:#202c33",
      "color:#e9edef",
      "border:1px solid #2a3942",
      "border-radius:12px",
      "box-shadow:0 8px 28px rgba(0,0,0,0.45)",
      "padding:12px 14px",
      "font:13px/1.45 system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
      "cursor:pointer",
    ].join(";");

    const arrow = document.createElement("div");
    arrow.textContent = "↑";
    arrow.setAttribute("aria-hidden", "true");
    arrow.style.cssText =
      "font-size:18px;line-height:1;color:#00a884;font-weight:700;margin-bottom:4px";

    const title = document.createElement("div");
    title.textContent = "Customize WhatsApp here →";
    title.style.cssText = "font-weight:600;margin-bottom:3px";

    const body = document.createElement("div");
    body.textContent =
      "Click the extension icon in your toolbar to change themes, fonts and backgrounds.";
    body.style.cssText = "color:#aebac1";

    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss");
    close.textContent = "✕";
    close.style.cssText = [
      "position:absolute",
      "top:6px",
      "right:8px",
      "background:transparent",
      "border:none",
      "color:#8696a0",
      "font-size:14px",
      "line-height:1",
      "cursor:pointer",
      "padding:2px",
    ].join(";");
    close.addEventListener("click", (e) => {
      e.stopPropagation();
      dismiss("first_run_hint_dismissed");
    });

    host.appendChild(arrow);
    host.appendChild(title);
    host.appendChild(body);
    host.appendChild(close);
    // Clicking the body counts as engagement (we can't open the popup from a
    // content script, so this acknowledges + dismisses).
    host.addEventListener("click", () => dismiss("first_run_hint_clicked"));

    document.body.appendChild(host);
    position(host, anchor);

    const reposition = () => position(host, anchor);
    window.addEventListener("resize", reposition, { passive: true });

    track("first_run_hint_shown");
  }

  function maybeShow() {
    chrome.storage.local.get([PENDING_KEY, SEEN_KEY], (data) => {
      if (chrome.runtime.lastError) return;
      if (!data[PENDING_KEY] || data[SEEN_KEY]) return;

      // Mark seen up-front so reloads / a second tab can't double-show it.
      chrome.storage.local.set({ [SEEN_KEY]: true });
      chrome.storage.local.remove(PENDING_KEY);

      let tries = 0;
      const timer = setInterval(() => {
        const anchor = findAnchor();
        if (anchor) {
          clearInterval(timer);
          render(anchor);
        } else if (++tries > 40) {
          // ~20s with no anchor: render against the body so the hint is never
          // silently lost, then stop polling.
          clearInterval(timer);
          render(document.body);
        }
      }, 500);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", maybeShow);
  } else {
    maybeShow();
  }
})();
