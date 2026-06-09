/* fonts-presets.js
 *
 * Font twin of themes-presets.js. Loaded in the content script, the popup, and
 * the manager page (fonts.html). Defines the built-in font presets plus the
 * shared helpers that every surface reuses:
 *   - WA_FONT_PRESETS              built-in, non-deletable fonts
 *   - WA_FONT_FALLBACK             the CSS fallback appended after every family
 *   - WA_SAFE_FONT_ID_FOR_ANALYTICS analytics-safe id (never leaks user text)
 *   - WA_INJECT_FONT_FACE          make a font renderable in a given document
 *   - WA_MIGRATE_FONT_STORAGE      one-time migration of the legacy `fontStyle`
 *
 * A font entry mirrors a theme; theme.vars -> font.font:
 *   {
 *     id, name, author, source: "preset" | "custom",
 *     font: { family, type: "google" | "url" | "file", src, format }
 *   }
 */
(function () {
  const FALLBACK = "sans-serif";

  // The families that used to live in the popup's <select id="fontSelector">.
  // Order preserved; the duplicate "Indie Flower" entry is dropped.
  const PRESET_FAMILIES = [
    "Pacifico",
    "Lobster",
    "Dancing Script",
    "Roboto",
    "Open Sans",
    "Montserrat",
    "Press Start 2P",
    "Indie Flower",
    "Oswald",
    "Raleway",
    "Lora",
    "Merriweather",
    "PT Sans",
    "PT Serif",
    "Playfair Display",
    "Quicksand",
    "Ubuntu",
    "Fira Sans",
    "Noto Sans",
    "Raleway Dots",
    "Bebas Neue",
    "Arvo",
    "Cabin",
    "Amatic SC",
    "Caveat",
    "Satisfy",
    "Patua One",
    "Fredoka One",
    "Shadows Into Light",
    "Kalam",
  ];

  function slug(name) {
    return String(name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  const PRESETS = PRESET_FAMILIES.map((family) => ({
    id: "preset-" + slug(family),
    name: family,
    author: "",
    source: "preset",
    font: { family: family, type: "google", src: "" },
  }));

  // Map a file extension / format hint to the CSS @font-face format() token.
  function formatToken(hint) {
    switch (String(hint || "").toLowerCase().replace(/^\./, "")) {
      case "woff2":
        return "woff2";
      case "woff":
        return "woff";
      case "ttf":
      case "truetype":
        return "truetype";
      case "otf":
      case "opentype":
        return "opentype";
      default:
        return "";
    }
  }

  // Build the href for a Google Fonts family (spaces become "+").
  function googleHref(family) {
    return (
      "https://fonts.googleapis.com/css2?family=" +
      encodeURIComponent(family).replace(/%20/g, "+") +
      "&display=swap"
    );
  }

  // Make `entry`'s font usable inside `doc` (popup, manager, or the WA page).
  // Idempotent per family so rendering many cards doesn't pile up <link>/<style>.
  function injectFontFace(doc, entry) {
    if (!doc || !entry || !entry.font) return;
    const f = entry.font;
    const family = f.family;
    if (!family) return;
    const key = slug(family) || "font";

    if (f.type === "google") {
      const id = "wa-gfont-" + key;
      if (doc.getElementById(id)) return;
      const link = doc.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = googleHref(family);
      (doc.head || doc.documentElement).appendChild(link);
      return;
    }

    // url / file: an @font-face pointing at the remote URL or embedded data URL.
    // Keyed by entry id (not family) so two custom fonts that happen to share a
    // family name still each get their own @font-face injected.
    if (!f.src) return;
    const id = "wa-fontface-" + (entry.id || key);
    if (doc.getElementById(id)) return;
    const style = doc.createElement("style");
    style.id = id;
    const fmt = formatToken(f.format);
    const fmtClause = fmt ? " format('" + fmt + "')" : "";
    style.textContent =
      "@font-face { font-family: '" +
      family.replace(/['\\]/g, "") +
      "'; src: url('" +
      f.src +
      "')" +
      fmtClause +
      "; font-display: swap; }";
    (doc.head || doc.documentElement).appendChild(style);
  }

  // Analytics-safe id. Never emit font names, URLs, or filenames in events
  // (see memory feedback_analytics_pii) — always route ids through this.
  function safeFontId(entry) {
    if (!entry || typeof entry.id !== "string") return "unknown";
    const id = entry.id;
    if (id.startsWith("preset-")) return id;
    if (/^custom-[0-9a-z]{6,}-[0-9a-z]{4,}$/.test(id)) return id;
    return "custom-legacy";
  }

  // One-time migration: an existing `fontStyle` (a "+"-joined Google family
  // string) becomes a `fonts:active` preset id, then the legacy key is dropped.
  function migrateFontStorage() {
    try {
      chrome.storage.local.get(["fontStyle", "fonts:active"], (data) => {
        const legacy = data && data.fontStyle;
        if (!legacy) return;
        const updates = {};
        if (!(data["fonts:active"] && data["fonts:active"].id)) {
          const family = String(legacy).replace(/\+/g, " ").trim().toLowerCase();
          const match = PRESETS.find(
            (p) => p.font.family.toLowerCase() === family
          );
          if (match) updates["fonts:active"] = { id: match.id };
        }
        chrome.storage.local.remove("fontStyle");
        if (Object.keys(updates).length) chrome.storage.local.set(updates);
      });
    } catch (e) {
      /* storage unavailable — nothing to migrate */
    }
  }

  globalThis.WA_FONT_PRESETS = PRESETS;
  globalThis.WA_FONT_FALLBACK = FALLBACK;
  globalThis.WA_FONT_FORMAT_TOKEN = formatToken;
  globalThis.WA_FONT_GOOGLE_HREF = googleHref;
  globalThis.WA_INJECT_FONT_FACE = injectFontFace;
  globalThis.WA_SAFE_FONT_ID_FOR_ANALYTICS = safeFontId;
  globalThis.WA_MIGRATE_FONT_STORAGE = migrateFontStorage;
})();
