# Release Notes

## First-run activation: analytics reliability, onboarding, preview redesign, background fixes

**Goal:** cut first-run churn. PostHog showed a ~12-minute median time-to-uninstall —
an activation problem, not a retention one. Four fixes, analytics first so the rest
is measurable.

### Task 1 — Analytics flush hardening (`5594d39`)

The resilient pipeline (storage-backed queue, `chrome.alarms`, exponential backoff
+ jitter, circuit breaker, per-event retry cap) already existed. This closed the
remaining gaps:

- Drain flushed events by `$insert_id` so a queue-cap trim mid-flight can't drop
  unsent events (the old blind head-slice could).
- Emit a single aggregated `analytics_events_dropped{reason:"queue_overflow"}` on
  cap overflow instead of silently discarding the oldest events.
- Make the circuit-breaker threshold runtime-configurable via
  `chrome.storage.local.analytics_config.circuitThreshold` (default 5).

### Task 4 — First-run theme picker (`8fffe94`)

A one-time "Pick your look" overlay on the first popup open after a fresh install
(4 strong Edelstein presets, one tap applies live). Gated on a dedicated
`onboarding_pending` flag — separate from the in-page hint's `first_run_pending`
so the two first-run surfaces can't race over one flag. New funnel events:
`onboarding_shown`, `onboarding_theme_selected`, `onboarding_dismissed`.

### Task 2 — Preview → apply redesign (`61a6c01`)

Root cause of the preview→apply cliff was hover-preview plus a `mouseleave`
discard, which logged a discard on every mouse-out (hence the 0-second median).
New model:

- Click / Enter / Space = persistent select-to-preview (not instant apply).
- A shared sticky Apply bar (`preview-bar.js`) commits or reverts every pending
  preview and survives popup tab switches.
- `theme_preview_discarded` / `font_preview_discarded` re-instrumented with a
  `trigger`: `explicit_cancel` | `replaced_by_other` | `applied_elsewhere`.
  Popup close reverts the live preview but is no longer logged as a discard.
- `themes.js` was de-minified so the rewrite is reviewable; all other behaviour
  (subtabs, custom-theme migration, reset semantics, manager buttons) preserved.

### Task 3 — Background slot failures (`f300b56`)

- Oversized images are downscaled + re-encoded (cap 1920px / ~2MB) before storing.
  Strictly best-effort: SVG/small/non-image inputs pass through, the re-encode is
  adopted only if genuinely smaller, and any decode/canvas error returns the
  original — so it can only help, never add a failure.
- `background_slot_set_failed` now carries `file_size_bytes` (previously only on
  success); `background_slot_set` gains `optimized` / `original_size_bytes`.
- Note: the manifest has `unlimitedStorage`, so a pure quota failure is unlikely —
  the added failure-side size telemetry is there to confirm the real cause (likely
  `cors_or_network` from URL image adds) in the next data pull.

### Verification

80 harness assertions against the real code with mocked `chrome`/DOM, all green
(analytics 15, onboarding 21, preview redesign 34, image optimize 10). Browser-level
checks — network kill / service-worker suspend, live preview UX, oversized upload,
fresh-install picker — remain to be run manually.

### What to watch in the next PostHog pull

- `analytics_flush_failed` → near zero
- `onboarding_shown → onboarding_theme_selected` funnel visible and populated
- preview → apply conversion climbing from 38%, with a clean `trigger` breakdown
- `background_slot_set_failed` → near zero, every remaining one carrying a specific
  `reason` and size
- median time-to-uninstall rising above ~12 minutes
