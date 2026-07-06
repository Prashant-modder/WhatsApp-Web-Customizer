/* analytics.js — MV3 background analytics with resilient flushing.
 *
 * Task 6 (analytics resilience): a 7-day export showed analytics_flush_failed
 * fired 214x across 48 users (~10% of the base): 204 network_error, 9 http
 * 407 (corporate proxy auth), and 133 of these were batch_size:1 — the queue
 * was retrying single events forever against a blocked endpoint (ad-blockers
 * commonly block PostHog), burning cycles and losing ~10% of analytics.
 *
 * This rewrite keeps the public API, storage keys, capture format, alarm, and
 * message/lifecycle wiring identical, and adds:
 *   - exponential backoff with jitter between flush attempts,
 *   - a circuit breaker that pauses flushing after N consecutive failures,
 *   - a per-event retry cap so no event is retried forever (dropped events are
 *     counted in aggregate via analytics_events_dropped, no PII),
 *   - hard back-off on clearly-blocked endpoints (407/403),
 *   - a bounded queue (unchanged 200 cap), with the resilience layer routing
 *     its own best-effort events through the same queue so it can't create a
 *     second retry storm.
 *
 * Flush state (consecutive failures, next-attempt time, circuit-open-until) is
 * persisted, because the MV3 service worker is torn down between alarm wake-ups
 * and in-memory state would otherwise reset on every tick.
 */
!(function () {
  "use strict";

  var API_KEY = "phc_D7eF9i6oXNgCTRHZ9VPHJNs5AaBudskFF36har3UYyPW";
  var HOST = "https://eu.i.posthog.com";
  var DISTINCT_ID_KEY = "analytics_distinct_id";
  var QUEUE_KEY = "analytics_queue";
  var FLUSH_STATE_KEY = "analytics_flush_state"; // additive, migration-safe
  var OVERFLOW_KEY = "analytics_overflow_dropped"; // pending cap-overflow drop count
  var CONFIG_KEY = "analytics_config"; // optional runtime overrides (e.g. circuitThreshold)

  // Resilience tuning.
  var QUEUE_CAP = 200; // max queued events (unchanged)
  var BATCH_SIZE = 50; // events per POST (unchanged)
  var MAX_ATTEMPTS = 8; // per-event retry cap before it is dropped
  var BACKOFF_BASE_MS = 1000;
  var BACKOFF_CAP_MS = 5 * 60 * 1000; // ~5 min ceiling
  var CIRCUIT_THRESHOLD = 5; // consecutive failures before opening
  var CIRCUIT_COOLDOWN_MS = 10 * 60 * 1000; // pause flushing while open
  var SELF_TELEMETRY_CAP = 10; // resilience-layer events kept per SW lifetime

  function newId() {
    return crypto.randomUUID();
  }

  /* ── distinct id ─────────────────────────────────────────────────────── */

  var distinctIdPromise = null;
  function getOrCreateUserId() {
    if (distinctIdPromise) return distinctIdPromise;
    distinctIdPromise = (async () => {
      var existing = (await chrome.storage.local.get(DISTINCT_ID_KEY))[DISTINCT_ID_KEY];
      if (existing) return existing;
      var id = newId();
      await chrome.storage.local.set({ [DISTINCT_ID_KEY]: id });
      return id;
    })().catch((err) => {
      distinctIdPromise = null;
      throw err;
    });
    return distinctIdPromise;
  }
  var getDistinctId = getOrCreateUserId;

  /* ── uninstall tracking ──────────────────────────────────────────────── */

  async function setupUninstallTracking() {
    try {
      if (!chrome.runtime || typeof chrome.runtime.setUninstallURL !== "function") return;
      var id = await getOrCreateUserId();
      var url = new URL("https://olivierluethy.github.io/WhatsApp-Web-Pages/uninstall.html");
      url.searchParams.set("entry.1444409856", id);
      await chrome.runtime.setUninstallURL(url.toString());
    } catch (err) {
      console.warn("[analytics] setupUninstallTracking failed:", err && err.message);
    }
  }

  /* ── queue helpers ───────────────────────────────────────────────────── */

  async function getQueue() {
    var data = await chrome.storage.local.get(QUEUE_KEY);
    return Array.isArray(data[QUEUE_KEY]) ? data[QUEUE_KEY] : [];
  }
  async function setQueue(queue) {
    await chrome.storage.local.set({ [QUEUE_KEY]: queue });
  }

  async function getFlushState() {
    var data = await chrome.storage.local.get(FLUSH_STATE_KEY);
    var s = data[FLUSH_STATE_KEY];
    return {
      fails: Number((s && s.fails) || 0),
      nextAt: Number((s && s.nextAt) || 0),
      openUntil: Number((s && s.openUntil) || 0),
    };
  }
  async function setFlushState(state) {
    await chrome.storage.local.set({ [FLUSH_STATE_KEY]: state });
  }

  // Circuit-breaker threshold: N consecutive failures before the breaker opens.
  // Defaults to CIRCUIT_THRESHOLD, overridable at runtime without a redeploy via
  // chrome.storage.local[CONFIG_KEY] = { circuitThreshold: <positive int> }.
  async function getCircuitThreshold() {
    try {
      var cfg = (await chrome.storage.local.get(CONFIG_KEY))[CONFIG_KEY];
      var n = cfg && Number(cfg.circuitThreshold);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : CIRCUIT_THRESHOLD;
    } catch (err) {
      return CIRCUIT_THRESHOLD;
    }
  }

  // Accumulate cap-overflow losses in a persisted counter instead of emitting an
  // event here — capture() is the overflow site, so emitting would recurse
  // through the same queue during the very outage that is causing the overflow.
  // onFlushSuccess() reports the aggregate once the pipe is healthy again.
  async function bumpOverflowDropped(n) {
    try {
      var cur = Number((await chrome.storage.local.get(OVERFLOW_KEY))[OVERFLOW_KEY] || 0);
      await chrome.storage.local.set({ [OVERFLOW_KEY]: cur + n });
    } catch (err) {
      /* best-effort */
    }
  }

  // Build the queued record. `_a` (attempts) is a top-level bookkeeping field
  // that is never sent to PostHog (the batch mapper only reads
  // event/properties/timestamp/distinct_id).
  async function capture(event, props) {
    props = props || {};
    var id = await getOrCreateUserId();
    var manifest = chrome.runtime.getManifest();
    var record = {
      event: event,
      properties: {
        ...props,
        distinct_id: id,
        $insert_id: newId(),
        $lib: "chrome-extension",
        extension_version: manifest.version,
        browser_language: typeof navigator !== "undefined" ? navigator.language : undefined,
      },
      timestamp: new Date().toISOString(),
    };
    var queue = await getQueue();
    queue.push(record);
    if (queue.length > QUEUE_CAP) {
      var overflow = queue.length - QUEUE_CAP;
      queue.splice(0, overflow); // enforce the cap by dropping the oldest
      await bumpOverflowDropped(overflow); // surfaced as analytics_events_dropped on next healthy flush
    }
    await setQueue(queue);
  }

  // Best-effort enqueue for the resilience layer's own events. Never throws,
  // and (crucially) only enqueues — it does NOT bypass the breaker with its own
  // fetch, so it cannot create a second retry storm.
  async function enqueueInternal(event, props) {
    try {
      await capture(event, props);
    } catch (err) {
      /* best-effort */
    }
  }

  function toPosthog(rec) {
    return {
      event: rec.event,
      properties: rec.properties,
      timestamp: rec.timestamp,
      distinct_id: rec.properties.distinct_id,
    };
  }

  function classifyError(err) {
    var msg = err && err.message ? String(err.message) : "";
    if (/^PostHog returned/i.test(msg)) return "http_error";
    if (/network|fetch|TypeError|Failed to fetch/i.test(msg)) return "network_error";
    return "unknown";
  }

  function computeBackoff(fails, hardBlocked) {
    if (hardBlocked) return BACKOFF_CAP_MS; // endpoint blocked — back off hard
    var ms = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * Math.pow(2, Math.max(0, fails - 1)));
    // Equal-jitter: half fixed + half random, to de-sync many clients.
    var jittered = ms / 2 + Math.random() * (ms / 2);
    return Math.max(BACKOFF_BASE_MS, Math.round(jittered));
  }

  /* ── self-telemetry pipe (resilience-layer events) ───────────────────────
   * The resilience layer's OWN events (analytics_flush_failed,
   * analytics_circuit_opened, and failure-path analytics_events_dropped) must
   * NOT ride the main queue. If they did, an endpoint outage would feed itself:
   * every failed flush would append a flush_failed event, which keeps the queue
   * non-empty, which triggers another flush, which fails and appends again —
   * amplifying the very failure storm we're trying to measure (and evicting
   * real user events at the 200-cap). A 14-day export showing 2,001
   * analytics_flush_failed (5.2% of all events) is the signature of that loop.
   *
   * Instead these events ride a dedicated, in-memory, bounded pipe:
   *   - in-memory (best-effort; lost on SW teardown — fine for diagnostics),
   *   - bounded to SELF_TELEMETRY_CAP events per service-worker lifetime,
   *   - recursion-gated: flushSelfTelemetry() NEVER reports its own failures,
   *     so a delivery storm here cannot amplify itself.
   * Overflowed reports are counted and surfaced as `dropped_failure_reports`
   * on the next successful self-telemetry batch.
   */
  var selfTelemetryQueue = [];
  var selfTelemetryDropped = 0; // reports lost to the cap since the last success
  var selfTelemetryInFlight = false;

  async function reportFlushFailure(event, props) {
    try {
      var id = await getOrCreateUserId();
      if (selfTelemetryQueue.length >= SELF_TELEMETRY_CAP) {
        selfTelemetryDropped++; // surfaced as dropped_failure_reports later
        return;
      }
      var manifest = chrome.runtime.getManifest();
      selfTelemetryQueue.push({
        event: event,
        properties: {
          ...props,
          distinct_id: id,
          $insert_id: newId(),
          $lib: "chrome-extension",
          extension_version: manifest.version,
        },
        timestamp: new Date().toISOString(),
      });
      await flushSelfTelemetry();
    } catch (err) {
      /* best-effort — self-telemetry must never throw into the flush path */
    }
  }

  async function flushSelfTelemetry() {
    // Recursion gate: this path calls neither onFlushFailure nor
    // reportFlushFailure. On ANY error it drops silently, so it cannot amplify.
    if (selfTelemetryInFlight || selfTelemetryQueue.length === 0) return;
    selfTelemetryInFlight = true;
    var batch = selfTelemetryQueue.slice(0, SELF_TELEMETRY_CAP);
    if (selfTelemetryDropped > 0)
      batch[batch.length - 1].properties.dropped_failure_reports = selfTelemetryDropped;
    var payload = { api_key: API_KEY, batch: batch.map(toPosthog) };
    try {
      var resp = await fetch(`${HOST}/batch/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      if (resp.ok) {
        selfTelemetryQueue = selfTelemetryQueue.slice(batch.length);
        selfTelemetryDropped = 0;
      }
      // On !resp.ok leave the queue for the next failure episode — but do NOT
      // report (recursion gate). The cap bounds unbounded growth.
    } catch (err) {
      /* drop silently — recursion gate */
    } finally {
      selfTelemetryInFlight = false;
    }
  }

  /* ── flush ───────────────────────────────────────────────────────────── */

  async function onFlushSuccess(sentBatch) {
    // Re-read the queue (capture may have appended — or trimmed the head via the
    // overflow cap — while the POST was in flight) and remove exactly the events
    // we delivered, matched by $insert_id. This is robust to head-trimming that a
    // blind head-slice would misalign, and cannot drop events captured mid-flight.
    var sentIds = new Set(
      sentBatch.map((r) => r && r.properties && r.properties.$insert_id).filter(Boolean),
    );
    var queue = await getQueue();
    var remaining = queue.filter((ev) => !sentIds.has(ev.properties && ev.properties.$insert_id));
    await setQueue(remaining);
    await setFlushState({ fails: 0, nextAt: 0, openUntil: 0 });

    // Now that a flush has landed, report any queue-overflow losses as a single
    // aggregated event (count only, no PII) — parity with the retry-cap drop path.
    try {
      var over = Number((await chrome.storage.local.get(OVERFLOW_KEY))[OVERFLOW_KEY] || 0);
      if (over > 0) {
        await chrome.storage.local.set({ [OVERFLOW_KEY]: 0 });
        await enqueueInternal("analytics_events_dropped", {
          count: over,
          reason: "queue_overflow",
        });
      }
    } catch (err) {
      /* best-effort */
    }
  }

  async function onFlushFailure(err, status, batchLen) {
    // 1. Per-event retry cap: bump attempts on the events we just tried (the
    //    head of the queue) and drop any that have exhausted MAX_ATTEMPTS.
    var queue = await getQueue();
    for (var k = 0; k < batchLen && k < queue.length; k++) {
      queue[k]._a = (queue[k]._a || 0) + 1;
    }
    var survivors = queue.filter((ev) => (ev._a || 0) < MAX_ATTEMPTS);
    var dropped = queue.length - survivors.length;
    await setQueue(survivors);

    // 2. Backoff + circuit-breaker state.
    var prev = await getFlushState();
    var fails = prev.fails + 1;
    var hardBlocked = status === 407 || status === 403;
    var next = {
      fails: fails,
      nextAt: Date.now() + computeBackoff(fails, hardBlocked),
      openUntil: prev.openUntil,
    };
    var threshold = await getCircuitThreshold();
    var openedNow = false;
    if (fails >= threshold) {
      next.openUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
      openedNow = fails === threshold; // emit once per failure episode
    }
    await setFlushState(next);

    console.warn("[analytics] flush failed, backing off:", err && err.message, "fails=" + fails);

    // The three notices below ride the dedicated self-telemetry pipe, NOT the
    // main queue — see reportFlushFailure(). This is what stops a failure storm
    // from feeding itself.

    // 3. Aggregated drop count (count only, no PII).
    var failReason = classifyError(err);
    if (dropped > 0)
      await reportFlushFailure("analytics_events_dropped", {
        count: dropped,
        reason: "max_attempts_exceeded",
        batch_size: batchLen,
        queue_depth: survivors.length,
      });

    // 4. Best-effort circuit-open notice.
    if (openedNow) {
      await reportFlushFailure("analytics_circuit_opened", {
        consecutive_failures: fails,
        endpoint_status: typeof status === "number" ? status : null,
        hard_blocked: hardBlocked,
      });
    }

    // 5. One bounded failure report per attempt. Attempts are rate-limited by
    //    backoff/circuit, and the pipe is capped, so this volume stays low.
    var cls = failReason;
    await reportFlushFailure("analytics_flush_failed", {
      status: cls, // DEPRECATED, mirrors error_class (pre-existing key)
      error_class: cls, // canonical enum
      reason: cls, // explicit diagnostic field
      error_name: err && err.name ? String(err.name) : null, // JS error class, e.g. "TypeError"
      endpoint_status: typeof status === "number" ? status : null, // HTTP status (a.k.a. http_status)
      batch_size: batchLen,
      queue_depth: survivors.length,
    });
  }

  // Half-open the breaker at the start of a new browser session: clear the
  // open/backoff windows so the very next flush() probes the endpoint, but KEEP
  // the failure count. A probe that fails immediately re-opens the circuit
  // (fails is still >= threshold); a probe that succeeds fully resets it. This
  // stops a circuit that opened in a prior session from staying hard-blocked.
  async function halfOpenForNewSession() {
    try {
      var s = await getFlushState();
      if (s.openUntil || s.nextAt) {
        await setFlushState({ fails: s.fails, nextAt: 0, openUntil: 0 });
      }
    } catch (err) {
      /* best-effort */
    }
  }

  async function flush() {
    var now = Date.now();
    var state = await getFlushState();
    // Circuit open → skip entirely until the cool-down elapses.
    if (state.openUntil && now < state.openUntil) return;
    // Inside a backoff window → skip this tick.
    if (state.nextAt && now < state.nextAt) return;

    var queue = await getQueue();
    if (queue.length === 0) return;

    var batch = queue.slice(0, BATCH_SIZE);
    var payload = { api_key: API_KEY, batch: batch.map(toPosthog) };
    var status = null;
    try {
      var resp = await fetch(`${HOST}/batch/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      if (!resp.ok) {
        status = resp.status;
        throw new Error(`PostHog returned ${resp.status}`);
      }
      await onFlushSuccess(batch);
    } catch (err) {
      await onFlushFailure(err, status, batch.length);
    }
  }

  /* ── lifecycle ───────────────────────────────────────────────────────── */

  function initAnalytics() {
    chrome.alarms.create("analytics_flush", { periodInMinutes: 0.5 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === "analytics_flush") flush();
    });

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (!msg || typeof msg.type !== "string") return;
      if (msg.type === "analytics:capture") {
        capture(msg.event, msg.properties).then(() => sendResponse({ ok: true }));
        return true;
      }
      if (msg.type === "analytics:getDistinctId") {
        getDistinctId().then((v) => sendResponse({ value: v }));
        return true;
      }
      if (msg.type === "analytics:flush") {
        flush().then(() => sendResponse({ ok: true }));
        return true;
      }
    });

    chrome.runtime.onInstalled.addListener(async (details) => {
      var version = chrome.runtime.getManifest().version;
      if (details.reason === "install") {
        await capture("extension_installed", { version: version });
      } else if (details.reason === "update" && details.previousVersion && details.previousVersion !== version) {
        await capture("extension_updated", {
          from: details.previousVersion,
          to: version,
          previous_version: details.previousVersion,
          version: version,
        });
      }
      await setupUninstallTracking();
      await halfOpenForNewSession();
      await flush();
    });

    chrome.runtime.onStartup.addListener(async () => {
      await capture("extension_started", { version: chrome.runtime.getManifest().version });
      await setupUninstallTracking();
      await halfOpenForNewSession();
      await flush();
    });
  }

  self.analytics = {
    initAnalytics: initAnalytics,
    capture: capture,
    trackEvent: capture,
    flush: flush,
    getDistinctId: getDistinctId,
    getOrCreateUserId: getOrCreateUserId,
    setupUninstallTracking: setupUninstallTracking,
  };
})();
