/* quick-reply-bubbles.js  (Task 4 — debounce render loop & fix shown over-fire)
 *
 * Data point driving this: quick_reply_bubbles_shown was 9,057 of 37,172 total
 * events (24%) from only 32 users — one user fired it 2,707 times (vs 727
 * inserts). The old code ran a MutationObserver on document.body {subtree:true}
 * and re-built bubbles (and re-emitted the event, throttled) on WhatsApp's hot
 * mutation path, poisoning every metric and plausibly causing the "extension
 * makes WhatsApp laggy" churn.
 *
 * Fix:
 *   - Observer work per mutation is now just scheduling a debounced reconcile
 *     (a single early-returning timer check); the real work runs at most once
 *     per DEBOUNCE_MS.
 *   - quick_reply_bubbles_shown fires once per visibility transition (bubbles
 *     become visible == a chat opened), not per mutation. Settings-driven
 *     rebuilds do NOT emit it.
 *   - The observer is scoped to the stable #app root rather than document.body.
 */
const bubbleStyles =
  "\n  #quick-reply-bubbles {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 10px;\n    margin: 12px 10px;\n    padding: 8px 12px;\n    justify-content: flex-start;\n    z-index: 100;\n  }\n\n  .quick-reply-bubble {\n    background: linear-gradient(135deg, #ffffff, #f0f0f5);\n    color: #333;\n    border-radius: 20px;\n    padding: 10px 16px;\n    cursor: pointer;\n    font-size: 14px;\n    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n    white-space: nowrap;\n    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);\n    transition: transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;\n    animation: bubbleAppear 0.4s ease-out forwards;\n  }\n\n  @keyframes bubbleAppear {\n    0% {\n      opacity: 0;\n      transform: translateY(10px);\n    }\n    100% {\n      opacity: 1;\n      transform: translateY(0);\n    }\n  }\n\n  .quick-reply-bubble:hover {\n    background: linear-gradient(135deg, #e0f7fa, #b2ebf2);\n    transform: translateY(-2px) scale(1.05);\n    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);\n  }\n\n  .quick-reply-bubble:active {\n    animation: bubbleClick 0.2s ease;\n  }\n\n  @keyframes bubbleClick {\n    0% {\n      transform: scale(1);\n    }\n    50% {\n      transform: scale(0.95);\n    }\n    100% {\n      transform: scale(1);\n    }\n  }\n";

let sessionBubblesShownCount = 0;
let sessionBubblesInsertedCount = 0;
let sessionEventFired = false;

function track(name, props) {
  try {
    if (window.track) window.track(name, props || {});
  } catch (e) {
    /* analytics best-effort */
  }
}

function fireBubblesSessionSummary() {
  if (sessionEventFired || sessionBubblesShownCount === 0) return;
  sessionEventFired = true;
  track("quick_reply_bubbles_session", {
    bubbles_shown_count: sessionBubblesShownCount,
    bubbles_inserted_count: sessionBubblesInsertedCount,
  });
}
// pagehide is wired in initQuickReplies() (not at load) so a disabled feature
// registers no listeners at all.

function ensureStyles() {
  if (document.getElementById("qr-bubble-styles")) return;
  const style = document.createElement("style");
  style.id = "qr-bubble-styles";
  style.textContent = bubbleStyles;
  document.head.appendChild(style);
}

// Build the bubble DOM into `container`. Pure rendering: this does NOT emit
// quick_reply_bubbles_shown (the visibility-transition emit lives in
// insertQuickReplyBubbles), so settings-driven rebuilds don't inflate it.
function buildBubbles(container, replies, footer) {
  const picked = [...replies]
    .sort(() => 0.5 - Math.random())
    .slice(0, Math.min(5, replies.length));
  const shownCount = picked.length;
  sessionBubblesShownCount += shownCount;

  picked.forEach((text, idx) => {
    const span = document.createElement("span");
    span.textContent = text;
    span.className = "quick-reply-bubble";
    span.style.animationDelay = 0.1 * idx + "s";
    span.addEventListener("click", () => {
      const ed = footer.querySelector("div[contenteditable='true']");
      if (ed) {
        ed.focus();
        document.execCommand("insertText", false, text);
      }
      sessionBubblesInsertedCount++;
      track("quick_reply_inserted", { bubble_position: idx, bubbles_shown: shownCount });
    });
    container.appendChild(span);
  });
  return shownCount;
}

let bubblesVisible = false;
let qrInsertInFlight = false;

// Insert bubbles for the currently-open chat and emit one shown event for this
// visibility transition. Guarded so concurrent reconciles can't double-insert.
function insertQuickReplyBubbles() {
  if (qrInsertInFlight) return;
  const footer = document.querySelector("footer");
  if (!footer || document.getElementById("quick-reply-bubbles")) return;

  qrInsertInFlight = true;
  chrome.storage.local.get(["quickReplies"], (data) => {
    try {
      const target = document.querySelector("footer");
      if (!target || document.getElementById("quick-reply-bubbles")) return;
      const replies = Array.isArray(data.quickReplies) ? data.quickReplies : [];
      if (replies.length === 0) return;

      ensureStyles();
      const container = document.createElement("div");
      container.id = "quick-reply-bubbles";
      target.insertBefore(container, target.firstChild);
      const shownCount = buildBubbles(container, replies, target);

      // Visibility transition (not visible -> visible) == bubbles shown for a
      // freshly opened chat. Emit exactly once per transition.
      bubblesVisible = true;
      track("quick_reply_bubbles_shown", {
        count: shownCount,
        qr_count_total: replies.length,
      });
    } finally {
      qrInsertInFlight = false;
    }
  });
}

// Coalesce WhatsApp's mutation storm: each mutation only (maybe) arms a single
// timer; the actual reconcile runs at most once per DEBOUNCE_MS.
const DEBOUNCE_MS = 250;
let reconcileTimer = null;

function reconcile() {
  const footer = document.querySelector("footer");
  const existing = document.getElementById("quick-reply-bubbles");
  if (!footer) {
    // Chat closed; any leftover bubbles belong to the old footer. Reset the
    // visibility flag so re-opening a chat counts as a new show.
    if (existing) existing.remove();
    bubblesVisible = false;
    return;
  }
  if (existing) return; // already shown for this chat — nothing to do
  insertQuickReplyBubbles();
}

function scheduleReconcile() {
  if (reconcileTimer) return;
  reconcileTimer = setTimeout(() => {
    reconcileTimer = null;
    reconcile();
  }, DEBOUNCE_MS);
}

let qrObserver = null;

function observeDOMForQuickReplies() {
  // Scope to the stable app root rather than document.body. subtree is still
  // needed to see the footer mount deep in the tree, but per-mutation work is
  // now just scheduleReconcile()'s early-return check.
  const target = document.getElementById("app") || document.body;
  qrObserver = new MutationObserver(scheduleReconcile);
  qrObserver.observe(target, { childList: true, subtree: true });
  scheduleReconcile();
}

// Reacts to edits of the user's saved replies while the feature is ON. Named so
// teardown can remove it; only registered by initQuickReplies().
function onQuickRepliesContentChanged(changes, area) {
  if (area !== "local" || !changes.quickReplies) return;
  const replies = Array.isArray(changes.quickReplies.newValue)
    ? changes.quickReplies.newValue
    : [];
  const existing = document.getElementById("quick-reply-bubbles");
  if (replies.length === 0) {
    if (existing) existing.remove();
    bubblesVisible = false;
    return;
  }
  const footer = document.querySelector("footer");
  if (!footer) return;
  if (existing) {
    // Live settings edit: rebuild contents WITHOUT emitting a shown event.
    existing.innerHTML = "";
    buildBubbles(existing, replies, footer);
  } else {
    // Quick replies added while a chat is open — let reconcile insert + count
    // it as a show.
    scheduleReconcile();
  }
}

/* ── lazy activation ─────────────────────────────────────────────────────
 * The feature is opt-in (default OFF as of 1.1.18). When OFF, the ONLY cost on
 * a WhatsApp Web load is the single boolean read below plus one passive flag
 * watcher — no MutationObserver, no DOM queries, no timers, no per-reply
 * listeners. Everything expensive lives inside initQuickReplies(), which runs
 * only once the toggle is ON (live, no page reload needed).
 */
const QR_ENABLED_KEY = "quickRepliesEnabled";
let qrInitialized = false;

function initQuickReplies() {
  if (qrInitialized) return;
  qrInitialized = true;
  window.addEventListener("pagehide", fireBubblesSessionSummary);
  chrome.storage.onChanged.addListener(onQuickRepliesContentChanged);
  observeDOMForQuickReplies();
}

function teardownQuickReplies() {
  if (!qrInitialized) return;
  qrInitialized = false;
  // Flush the session summary for the run we're ending, then unwire everything.
  fireBubblesSessionSummary();
  if (qrObserver) {
    qrObserver.disconnect();
    qrObserver = null;
  }
  if (reconcileTimer) {
    clearTimeout(reconcileTimer);
    reconcileTimer = null;
  }
  window.removeEventListener("pagehide", fireBubblesSessionSummary);
  chrome.storage.onChanged.removeListener(onQuickRepliesContentChanged);
  // Actually remove injected DOM (teardown, not just hide).
  const existing = document.getElementById("quick-reply-bubbles");
  if (existing) existing.remove();
  const styles = document.getElementById("qr-bubble-styles");
  if (styles) styles.remove();
  bubblesVisible = false;
  // Allow a fresh session summary if the feature is turned back on this load.
  sessionEventFired = false;
}

// Bootstrap: one storage read decides whether to initialise.
chrome.storage.local.get([QR_ENABLED_KEY], (data) => {
  if (data[QR_ENABLED_KEY] === true) initQuickReplies();
});

// Passive flag watcher: activates/deactivates the feature live when the popup
// toggle flips. This fires only on a settings write — never on WhatsApp's DOM
// mutation path — so it is free during normal browsing.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[QR_ENABLED_KEY]) return;
  if (changes[QR_ENABLED_KEY].newValue === true) initQuickReplies();
  else teardownQuickReplies();
});
