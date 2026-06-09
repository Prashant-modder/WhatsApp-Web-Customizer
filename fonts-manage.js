/* fonts-manage.js
 *
 * Font twin of themes-manage.js. Powers fonts.html: uploading font files,
 * loading a font from a URL, creating/editing fonts, the Custom/Presets grids,
 * import validation + per-issue reporting, export, and the editor modal.
 *
 * Font entry: { id, name, author, source, font: { family, type, src, format, fallback } }
 *   type: "google" (loaded from Google Fonts by family name)
 *       | "url"    (referenced by a direct font URL)
 *       | "file"   (embedded as a data: URL @font-face)
 */
(function () {
  "use strict";

  const ACTIVE_KEY = "fonts:active";
  const CUSTOM_KEY = "fonts:custom";
  const SUBTAB_KEY = "fonts_manager_active_subtab";
  const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB per font file
  const FONT_EXTS = ["woff2", "woff", "ttf", "otf"];
  const DEFAULT_FALLBACK = "sans-serif";

  let customs = []; // current custom fonts
  let activeId = null; // active font id
  let toastTimer = null;

  function track(name, props) {
    try {
      if (window.track) props ? window.track(name, props) : window.track(name);
    } catch (e) {
      /* best-effort */
    }
  }

  /* ── small UI helpers ──────────────────────────────────────────────── */

  function toast(message, type) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.className = "toast visible " + (type === "error" ? "error" : "success");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("visible"), 2500);
  }

  function setStatus(id, message, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.className = "status-line " + (type || "info");
  }

  /* ── storage ───────────────────────────────────────────────────────── */

  function loadCustoms() {
    return new Promise((resolve) => {
      chrome.storage.local.get([ACTIVE_KEY, CUSTOM_KEY], (data) => {
        customs = Array.isArray(data[CUSTOM_KEY]) ? data[CUSTOM_KEY] : [];
        activeId = (data[ACTIVE_KEY] && data[ACTIVE_KEY].id) || null;
        resolve();
      });
    });
  }

  function saveCustoms() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [CUSTOM_KEY]: customs }, resolve);
    });
  }

  function setActive(id) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [ACTIVE_KEY]: { id: id } }, resolve);
    });
  }

  function genId() {
    return (
      "custom-" +
      Math.random().toString(36).slice(2, 10).padEnd(8, "0") +
      "-" +
      Date.now().toString(36)
    );
  }

  // Insert or replace a custom font, normalising its shape.
  async function upsert(entry) {
    const font = entry.font || {};
    const clean = {
      id:
        typeof entry.id === "string" && entry.id.startsWith("custom-")
          ? entry.id
          : genId(),
      name: String(entry.name).trim().slice(0, 80),
      author:
        typeof entry.author === "string" ? entry.author.trim().slice(0, 80) : "",
      source: "custom",
      font: {
        family: String(font.family).trim().slice(0, 120),
        type: font.type,
        src: typeof font.src === "string" ? font.src : "",
        format: typeof font.format === "string" ? font.format : "",
        fallback:
          typeof font.fallback === "string" && font.fallback
            ? font.fallback
            : DEFAULT_FALLBACK,
      },
    };
    const idx = customs.findIndex((f) => f.id === clean.id);
    if (idx >= 0) customs[idx] = clean;
    else customs.push(clean);
    await saveCustoms();
    return clean;
  }

  /* ── validation (for JSON-definition import) ───────────────────────── */

  function validate(obj) {
    const errors = [];
    const warnings = [];
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      errors.push({
        code: "not_object",
        message:
          "This file isn't a font definition. Expected a JSON object with `name` and `font`.",
      });
      return { errors, warnings };
    }
    if (!(typeof obj.name === "string" && obj.name.trim())) {
      errors.push({
        code: "missing_name",
        message: 'Missing or empty `name`. Add `"name": "My Font"`.',
      });
    }
    const font = obj.font;
    if (!font || typeof font !== "object" || Array.isArray(font)) {
      errors.push({
        code: "missing_font",
        message:
          "Missing the `font` object. Add e.g. `\"font\": { \"family\": \"Roboto\", \"type\": \"google\" }`.",
      });
      return { errors, warnings };
    }
    if (!(typeof font.family === "string" && font.family.trim())) {
      errors.push({
        code: "missing_family",
        message: "`font.family` must be a non-empty string (the CSS font-family).",
      });
    }
    const type = font.type;
    if (type !== "google" && type !== "url" && type !== "file") {
      errors.push({
        code: "invalid_font_type",
        message: "`font.type` must be one of `google`, `url`, or `file`.",
      });
    } else if (type === "url" || type === "file") {
      if (!(typeof font.src === "string" && font.src.trim())) {
        errors.push({
          code: "missing_src",
          message:
            "`font.src` is required for `url`/`file` fonts (the URL or data: URL).",
        });
      }
    }
    return { errors, warnings };
  }

  /* ── import: per-issue list ────────────────────────────────────────── */

  let issues = [];
  function clearIssues() {
    issues = [];
    renderIssues();
  }
  function addIssue(issue) {
    issues.push(issue);
    renderIssues();
  }
  function renderIssues() {
    const box = document.getElementById("import-issues");
    if (!box) return;
    box.innerHTML = "";
    issues.forEach((it) => {
      const wrap = document.createElement("div");
      wrap.className = "import-issue " + it.severity;
      if (it.file) {
        const f = document.createElement("div");
        f.className = "import-issue-file";
        f.textContent = it.file;
        wrap.appendChild(f);
      }
      const title = document.createElement("div");
      title.className = "import-issue-title";
      title.textContent = it.title;
      wrap.appendChild(title);
      if (it.hint) {
        const h = document.createElement("div");
        h.className = "import-issue-hint";
        h.textContent = it.hint;
        wrap.appendChild(h);
      }
      box.appendChild(wrap);
    });
  }

  function reportRejected(codes, method, fileSize) {
    track("font_import_rejected", {
      reason: codes[0] || "other",
      method: method,
      error_codes: codes,
      error_count: codes.length,
      file_size_bytes: typeof fileSize === "number" ? fileSize : null,
    });
  }

  /* ── file helpers ──────────────────────────────────────────────────── */

  function readAsText(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error || new Error("Read failed."));
      r.readAsText(file);
    });
  }

  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error || new Error("Read failed."));
      r.readAsDataURL(file);
    });
  }

  function extOf(name) {
    const m = /\.([a-z0-9]+)$/i.exec(String(name || ""));
    return m ? m[1].toLowerCase() : "";
  }

  function baseName(name) {
    return String(name || "")
      .replace(/^.*[\\/]/, "")
      .replace(/\.[a-z0-9]+$/i, "");
  }

  // Turn "My-Cool_Font.woff2" → "My Cool Font".
  function familyFromName(name) {
    const base = baseName(name).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
    return base || "Custom Font";
  }

  function familyFromUrl(url) {
    try {
      const u = new URL(url);
      const last = u.pathname.split("/").filter(Boolean).pop() || "";
      return familyFromName(last) || "URL Font";
    } catch (e) {
      return "URL Font";
    }
  }

  /* ── import from file(s): font binaries and/or JSON definitions ─────── */

  async function importFiles(fileList, method) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    clearIssues();
    let added = 0;
    let failed = 0;

    for (const file of files) {
      const ext = extOf(file.name);
      const isJson = ext === "json" || /json/.test(file.type || "");

      if (isJson) {
        // A font-definition JSON (single or array) — same path as theme import.
        let text, parsed;
        try {
          text = await readAsText(file);
        } catch (e) {
          failed++;
          reportRejected(["parse_error"], method, file.size);
          addIssue({ severity: "error", file: file.name, title: "Couldn't read the file." });
          continue;
        }
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          failed++;
          reportRejected(["parse_error"], method, file.size);
          addIssue({
            severity: "error",
            file: file.name,
            title: "This file isn't valid JSON.",
            hint: "Open it in a text editor and check for missing commas or quotes.",
          });
          continue;
        }
        const list = Array.isArray(parsed) ? parsed : [parsed];
        for (let i = 0; i < list.length; i++) {
          const label = list.length > 1 ? `${file.name} (item ${i + 1})` : file.name;
          const { errors } = validate(list[i]);
          if (errors.length) {
            failed++;
            reportRejected(errors.map((e) => e.code), method, file.size);
            errors.forEach((e) =>
              addIssue({ severity: "error", file: label, title: e.message })
            );
          } else {
            try {
              await upsert(list[i]);
              added++;
            } catch (e) {
              failed++;
              reportRejected(["storage_error"], method, file.size);
              addIssue({
                severity: "error",
                file: label,
                title: "Couldn't save the font.",
                hint: "Storage may be full — delete a custom font and try again.",
              });
            }
          }
        }
        continue;
      }

      // A real font file → embed as a data: URL @font-face.
      if (FONT_EXTS.indexOf(ext) === -1) {
        failed++;
        reportRejected(["unsupported_type"], method, file.size);
        addIssue({
          severity: "error",
          file: file.name,
          title: "Unsupported file type.",
          hint: "Upload a .woff2, .woff, .ttf, or .otf font file (or a font-definition .json).",
        });
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        failed++;
        reportRejected(["too_large"], method, file.size);
        addIssue({
          severity: "error",
          file: file.name,
          title: "File is larger than 5 MB.",
          hint: "Most web fonts are well under 1 MB — try a .woff2 build of this font.",
        });
        continue;
      }
      let dataUrl;
      try {
        dataUrl = await readAsDataURL(file);
      } catch (e) {
        failed++;
        reportRejected(["parse_error"], method, file.size);
        addIssue({ severity: "error", file: file.name, title: "Couldn't read the file." });
        continue;
      }
      try {
        const family = familyFromName(file.name);
        await upsert({
          name: family,
          source: "custom",
          font: { family: family, type: "file", src: dataUrl, format: ext },
        });
        added++;
      } catch (e) {
        failed++;
        reportRejected(["storage_error"], method, file.size);
        addIssue({
          severity: "error",
          file: file.name,
          title: "Couldn't save the font.",
          hint: "Storage may be full — delete a custom font and try again.",
        });
      }
    }

    if (added > 0 || failed > 0) {
      track("font_imported", { method: method, added_count: added, failed_count: failed });
    }
    if (added > 0) {
      setStatus(
        "upload-status",
        `Added ${added} font${added === 1 ? "" : "s"}` + (failed ? `, ${failed} failed` : "") + ".",
        failed ? "error" : "success"
      );
      toast(`Added ${added} font${added === 1 ? "" : "s"}.`, "success");
      renderAll();
    } else if (failed > 0) {
      setStatus("upload-status", "Couldn't add — see issues below.", "error");
      toast("Import failed. See details below.", "error");
    }
  }

  /* ── load from URL ─────────────────────────────────────────────────── */

  async function importFromUrl(url, displayName) {
    if (!url) {
      reportRejected(["empty_url"], "url");
      setStatus("url-status", "Enter a URL first.", "error");
      return;
    }
    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      reportRejected(["invalid_url"], "url");
      setStatus("url-status", "That doesn't look like a valid URL.", "error");
      return;
    }
    const ext = extOf(parsed.pathname);
    const family = (displayName && displayName.trim()) || familyFromUrl(url);
    try {
      await upsert({
        name: family,
        source: "custom",
        font: {
          family: family,
          type: "url",
          src: url,
          format: FONT_EXTS.indexOf(ext) >= 0 ? ext : "",
        },
      });
      track("font_imported", { method: "url", added_count: 1, failed_count: 0 });
      setStatus("url-status", "Added.", "success");
      toast(`Added "${family}".`, "success");
      renderAll();
    } catch (e) {
      reportRejected(["storage_error"], "url");
      setStatus("url-status", "Couldn't save — storage may be full.", "error");
    }
  }

  /* ── export ────────────────────────────────────────────────────────── */

  function definitionOf(entry) {
    const out = { name: entry.name, author: entry.author || "", font: {} };
    out.font.family = entry.font.family;
    out.font.type = entry.font.type;
    if (entry.font.src) out.font.src = entry.font.src;
    if (entry.font.format) out.font.format = entry.font.format;
    if (entry.font.fallback) out.font.fallback = entry.font.fallback;
    return out;
  }

  function download(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportAll() {
    if (!customs.length) {
      toast("No custom fonts to export.", "error");
      return;
    }
    download("custom-fonts.json", customs.map(definitionOf));
    track("font_exported", { mode: "all", count: customs.length });
    toast(`Exported ${customs.length} font${customs.length === 1 ? "" : "s"}.`, "success");
  }

  /* ── card rendering ────────────────────────────────────────────────── */

  function buildSwatch(entry) {
    const fallback = (entry.font && entry.font.fallback) || DEFAULT_FALLBACK;
    if (globalThis.WA_INJECT_FONT_FACE) globalThis.WA_INJECT_FONT_FACE(document, entry);
    const sample = document.createElement("div");
    sample.className = "font-sample";
    sample.textContent = "Ag";
    if (entry.font && entry.font.family) {
      sample.style.fontFamily =
        "'" + String(entry.font.family).replace(/['\\]/g, "") + "', " + fallback;
    }
    return sample;
  }

  function renderCard(entry) {
    const card = document.createElement("div");
    card.className = "theme-card" + (entry.id === activeId ? " active" : "");
    card.dataset.id = entry.id;

    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.appendChild(buildSwatch(entry));

    const meta = document.createElement("div");
    meta.className = "meta";
    const metaText = document.createElement("div");
    const name = document.createElement("div");
    name.className = "meta-name";
    name.textContent = entry.name;
    metaText.appendChild(name);
    if (entry.author) {
      const author = document.createElement("div");
      author.className = "meta-author";
      author.textContent = "by " + entry.author;
      metaText.appendChild(author);
    }
    const badge = document.createElement("span");
    badge.className = "badge " + (entry.source === "preset" ? "preset" : "custom");
    badge.textContent = entry.source === "preset" ? "Preset" : "Custom";
    meta.appendChild(metaText);
    meta.appendChild(badge);

    const actions = document.createElement("div");
    actions.className = "actions";

    const dup = document.createElement("button");
    dup.className = "dup";
    dup.title = "Duplicate as custom";
    dup.textContent = "⎘";
    dup.addEventListener("click", (e) => {
      e.stopPropagation();
      openEditor({
        mode: "create",
        source: entry.source === "preset" ? "duplicate_preset" : "duplicate_custom",
        seedFrom: entry,
      });
    });
    actions.appendChild(dup);

    if (entry.source === "custom") {
      const edit = document.createElement("button");
      edit.className = "edit";
      edit.title = "Edit this font";
      edit.textContent = "✎";
      edit.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditor({ mode: "edit", source: "font_manager", editingId: entry.id });
      });
      actions.appendChild(edit);

      const exp = document.createElement("button");
      exp.className = "export";
      exp.title = "Export this font";
      exp.textContent = "↓";
      exp.addEventListener("click", (e) => {
        e.stopPropagation();
        download(
          (entry.name || entry.id).replace(/[^a-z0-9-_]+/gi, "_") + ".json",
          definitionOf(entry)
        );
        track("font_exported", { mode: "single", count: 1 });
      });
      actions.appendChild(exp);

      const del = document.createElement("button");
      del.className = "delete";
      del.title = "Delete this font";
      del.textContent = "✕";
      del.addEventListener("click", async (e) => {
        e.stopPropagation();
        const safeId = globalThis.WA_SAFE_FONT_ID_FOR_ANALYTICS(entry);
        if (!confirm(`Delete "${entry.name}"?`)) {
          track("custom_font_delete_cancelled", { font_id: safeId });
          return;
        }
        const wasActive = activeId === entry.id;
        customs = customs.filter((f) => f.id !== entry.id);
        await saveCustoms();
        if (wasActive) {
          await new Promise((res) => chrome.storage.local.remove(ACTIVE_KEY, res));
        }
        track("font_deleted", { font_id: safeId, was_active: wasActive });
        toast("Font deleted.", "success");
        renderAll();
      });
      actions.appendChild(del);
    }

    card.appendChild(swatch);
    card.appendChild(meta);
    if (actions.childNodes.length) card.appendChild(actions);

    card.addEventListener("click", async () => {
      await setActive(entry.id);
      activeId = entry.id;
      track("font_applied", {
        font_id: globalThis.WA_SAFE_FONT_ID_FOR_ANALYTICS(entry),
        source: entry.source === "preset" ? "preset" : "custom",
        from_page: "manage",
      });
      toast(`Applied "${entry.name}".`, "success");
      renderAll();
    });
    return card;
  }

  function renderAll() {
    const presetsGrid = document.getElementById("presets-grid");
    const customsGrid = document.getElementById("customs-grid");
    const count = document.getElementById("custom-count");
    const empty = document.getElementById("fm-empty");
    const exportAllBtn = document.getElementById("export-all-btn");
    const subtabCount = document.getElementById("fm-customs-count");
    if (!presetsGrid || !customsGrid) return;

    const presets = Array.isArray(globalThis.WA_FONT_PRESETS)
      ? globalThis.WA_FONT_PRESETS
      : [];
    presetsGrid.innerHTML = "";
    presets.forEach((f) => presetsGrid.appendChild(renderCard(f)));

    customsGrid.innerHTML = "";
    if (customs.length === 0) {
      customsGrid.style.display = "none";
      if (empty) empty.style.display = "";
      if (exportAllBtn) exportAllBtn.disabled = true;
    } else {
      customsGrid.style.display = "";
      if (empty) empty.style.display = "none";
      if (exportAllBtn) exportAllBtn.disabled = false;
      customs.forEach((f) => customsGrid.appendChild(renderCard(f)));
    }
    if (count) count.textContent = customs.length ? `${customs.length} font${customs.length === 1 ? "" : "s"}` : "";
    if (subtabCount) {
      if (customs.length > 0) {
        subtabCount.hidden = false;
        subtabCount.textContent = `(${customs.length})`;
      } else {
        subtabCount.hidden = true;
        subtabCount.textContent = "";
      }
    }
  }

  /* ── sub-tabs ──────────────────────────────────────────────────────── */

  const SUBTAB_TO_PANE = { custom: "fm-customs", presets: "fm-presets" };
  function paneToSubtab(pane) {
    return Object.keys(SUBTAB_TO_PANE).find((k) => SUBTAB_TO_PANE[k] === pane) || "custom";
  }

  function switchSubtab(paneId, fireEvent) {
    const tabs = document.querySelectorAll("[data-fm-subtab]");
    if (!tabs.length) return;
    let from = null;
    tabs.forEach((t) => {
      const isActive = t.dataset.fmSubtab === paneId;
      if (t.classList.contains("active")) from = t.dataset.fmSubtab;
      t.classList.toggle("active", isActive);
      t.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    document.querySelectorAll(".bg-subpane").forEach((p) => (p.hidden = p.id !== paneId));
    chrome.storage.local.set({ [SUBTAB_KEY]: paneToSubtab(paneId) });
    if (fireEvent && from && from !== paneId) {
      track("font_manager_subtab_changed", {
        from_subtab: paneToSubtab(from),
        to_subtab: paneToSubtab(paneId),
        custom_font_count: customs.length,
      });
    }
  }

  /* ── editor ────────────────────────────────────────────────────────── */

  let editorState = null;

  function sourceLabel(type) {
    if (type === "file") return "Uploaded file (embedded)";
    if (type === "url") return "Loaded from URL";
    return "Google Fonts";
  }

  function refreshPreview() {
    if (!editorState) return;
    const preview = document.getElementById("editor-preview");
    const d = editorState.draft;
    const family = (d.family || "").trim();
    const fallback = d.fallback || DEFAULT_FALLBACK;

    // Make the family loadable in this page before previewing it.
    if (family) {
      if (d.type === "google") {
        const id = "wa-gfont-" + family.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        if (!document.getElementById(id) && globalThis.WA_FONT_GOOGLE_HREF) {
          const link = document.createElement("link");
          link.id = id;
          link.rel = "stylesheet";
          link.href = globalThis.WA_FONT_GOOGLE_HREF(family);
          document.head.appendChild(link);
        }
      } else if (d.src) {
        // Rewrite a single dedicated @font-face so renames take effect live.
        let style = document.getElementById("wa-editor-face");
        if (!style) {
          style = document.createElement("style");
          style.id = "wa-editor-face";
          document.head.appendChild(style);
        }
        const fmt =
          globalThis.WA_FONT_FORMAT_TOKEN && globalThis.WA_FONT_FORMAT_TOKEN(d.format);
        const fmtClause = fmt ? " format('" + fmt + "')" : "";
        style.textContent =
          "@font-face { font-family: '" +
          family.replace(/['\\]/g, "") +
          "'; src: url('" +
          d.src +
          "')" +
          fmtClause +
          "; font-display: swap; }";
      }
    }
    preview.style.fontFamily = family
      ? "'" + family.replace(/['\\]/g, "") + "', " + fallback
      : fallback;
  }

  function fillEditor() {
    if (!editorState) return;
    const d = editorState.draft;
    const nameInput = document.getElementById("editor-name");
    const counter = document.getElementById("editor-name-counter");
    const familyInput = document.getElementById("editor-family");
    const familyHint = document.getElementById("editor-family-hint");
    const sourceInfo = document.getElementById("editor-source-info");
    const fallbackSel = document.getElementById("editor-fallback");

    nameInput.value = d.name;
    counter.textContent = `${d.name.length} / 40`;
    document.getElementById("editor-name-error").textContent = "";
    nameInput.classList.remove("error");
    document.getElementById("editor-footer-status").textContent = "";
    document.getElementById("editor-notice").style.display = "none";

    familyInput.value = d.family;
    fallbackSel.value = d.fallback || DEFAULT_FALLBACK;

    if (d.type === "google") {
      familyHint.style.display = "";
      sourceInfo.style.display = "none";
    } else {
      familyHint.style.display = "none";
      sourceInfo.style.display = "";
      sourceInfo.innerHTML = "";
      const strong = document.createElement("strong");
      strong.textContent = sourceLabel(d.type) + ". ";
      sourceInfo.appendChild(strong);
      sourceInfo.appendChild(
        document.createTextNode(
          d.type === "url"
            ? d.src
            : "The font is stored inside the extension. Rename it or change its fallback here."
        )
      );
    }
    refreshPreview();
  }

  function openEditor(opts) {
    const mode = opts.mode === "edit" ? "edit" : "create";
    const source = opts.source || "font_manager";
    let seed = null;
    if (mode === "edit" && opts.editingId) {
      seed = customs.find((f) => f.id === opts.editingId) || null;
      if (!seed) {
        toast("Font not found.", "error");
        return;
      }
    } else if (opts.seedFrom) {
      seed = opts.seedFrom;
    }

    const draftName =
      mode === "edit"
        ? seed
          ? seed.name
          : ""
        : seed && (source === "duplicate_preset" || source === "duplicate_custom")
        ? `${seed.name} (copy)`
        : "";

    const seedFont = (seed && seed.font) || {};
    editorState = {
      mode: mode,
      source: source,
      editingId: mode === "edit" && seed ? seed.id : null,
      draft: {
        name: draftName,
        family: seedFont.family || "",
        type: seedFont.type || "google",
        src: seedFont.src || "",
        format: seedFont.format || "",
        fallback: seedFont.fallback || DEFAULT_FALLBACK,
      },
      dirty: false,
    };

    document.getElementById("editor-title").textContent =
      mode === "edit" ? "Edit Font" : "Create Font";
    track("font_creator_opened", {
      mode: mode,
      source: source,
      font_id: editorState.editingId,
    });
    fillEditor();
    document.getElementById("editor-backdrop").classList.add("visible");
    setTimeout(() => {
      const n = document.getElementById("editor-name");
      if (n) n.focus();
    }, 0);
  }

  function closeEditor(opts) {
    if (!editorState) return;
    const mode = editorState.mode;
    const dirty = editorState.dirty;
    const skip = opts && opts.skipEvent;
    editorState = null;
    document.getElementById("editor-backdrop").classList.remove("visible");
    if (!skip) track("font_creator_closed", { mode: mode, had_unsaved_changes: !!dirty });
  }

  async function saveEditor() {
    if (!editorState) return;
    const nameInput = document.getElementById("editor-name");
    const nameError = document.getElementById("editor-name-error");
    const familyInput = document.getElementById("editor-family");
    const footer = document.getElementById("editor-footer-status");
    nameError.textContent = "";
    nameInput.classList.remove("error");
    footer.textContent = "";

    const name = (editorState.draft.name || "").trim();
    if (!name) {
      nameInput.classList.add("error");
      nameError.textContent = "Name is required.";
      return;
    }
    if (name.length > 40) {
      nameInput.classList.add("error");
      nameError.textContent = "Name must be 40 characters or fewer.";
      return;
    }
    const family = (editorState.draft.family || "").trim();
    if (!family) {
      familyInput.classList.add("error");
      footer.textContent =
        editorState.draft.type === "google"
          ? "Enter the Google Font's family name."
          : "A font family name is required.";
      return;
    }

    // Duplicate-name guard (mirrors the theme editor).
    const dupe = customs.find(
      (f) =>
        f.id !== editorState.editingId &&
        (f.name || "").trim().toLowerCase() === name.toLowerCase()
    );
    let overwrote = false;
    let id = editorState.editingId;
    if (dupe) {
      if (
        !confirm(
          `A font named "${dupe.name}" already exists.\n\nOK to overwrite it, or Cancel to choose a different name.`
        )
      ) {
        nameInput.classList.add("error");
        nameError.textContent = "Another font already uses this name.";
        nameInput.focus();
        return;
      }
      overwrote = true;
      id = dupe.id;
    }

    const d = editorState.draft;
    const entry = {
      id: id || undefined,
      name: name,
      author: "",
      source: "custom",
      font: {
        family: family,
        type: d.type,
        src: d.type === "google" ? "" : d.src,
        format: d.type === "google" ? "" : d.format,
        fallback: d.fallback || DEFAULT_FALLBACK,
      },
    };

    let saved;
    try {
      saved = await upsert(entry);
    } catch (e) {
      const msg = (e && (e.message || String(e))) || "";
      const quota = /quota|exceed/i.test(msg);
      footer.textContent = quota
        ? "Storage is full. Delete some fonts and try again."
        : "Save failed. Please try again.";
      return;
    }

    track("custom_font_saved", {
      mode: editorState.mode,
      font_id: globalThis.WA_SAFE_FONT_ID_FOR_ANALYTICS(saved),
      name_length: name.length,
      source: editorState.source,
      font_type: d.type,
      overwrote_existing: overwrote,
    });
    toast(editorState.mode === "edit" ? "Font updated." : "Font created.", "success");
    closeEditor({ skipEvent: true });
    renderAll();
  }

  /* ── schema docs ───────────────────────────────────────────────────── */

  function populateSchemaDocs() {
    const el = document.getElementById("schema-docs-body");
    if (!el) return;
    el.innerHTML = "";
    const p = document.createElement("p");
    p.textContent =
      "There are three ways to add a font: upload a font file (.woff2/.woff/.ttf/.otf), load one from a direct URL, or create one from a Google Font by name. You can also drop a font-definition .json exported from here.";
    el.appendChild(p);

    const table = document.createElement("table");
    table.innerHTML =
      "<thead><tr><th>Field</th><th>Required?</th><th>What it is</th></tr></thead>" +
      "<tbody>" +
      "<tr><td><code>name</code></td><td>Yes</td><td>What appears in the font picker (up to 80 chars).</td></tr>" +
      "<tr><td><code>font.family</code></td><td>Yes</td><td>The CSS font-family. For a Google Font, its exact name.</td></tr>" +
      "<tr><td><code>font.type</code></td><td>Yes</td><td>One of <code>google</code>, <code>url</code>, or <code>file</code>.</td></tr>" +
      "<tr><td><code>font.src</code></td><td>url/file</td><td>The font URL, or a <code>data:</code> URL for an embedded file.</td></tr>" +
      "<tr><td><code>font.fallback</code></td><td>No</td><td><code>sans-serif</code> (default), <code>serif</code>, or <code>monospace</code>.</td></tr>" +
      "</tbody>";
    el.appendChild(table);

    const ex = document.createElement("pre");
    ex.textContent = JSON.stringify(
      { name: "My Font", font: { family: "Roboto", type: "google" } },
      null,
      2
    );
    el.appendChild(ex);
  }

  /* ── wiring ────────────────────────────────────────────────────────── */

  document.addEventListener("DOMContentLoaded", async () => {
    if (globalThis.WA_MIGRATE_FONT_STORAGE) globalThis.WA_MIGRATE_FONT_STORAGE();
    await loadCustoms();
    renderAll();
    populateSchemaDocs();

    // Restore last sub-tab.
    chrome.storage.local.get([SUBTAB_KEY], (data) => {
      const sub = data[SUBTAB_KEY];
      switchSubtab(SUBTAB_TO_PANE[sub === "presets" ? "presets" : "custom"], false);
    });
    document.querySelectorAll("[data-fm-subtab]").forEach((t) => {
      t.addEventListener("click", () => switchSubtab(t.dataset.fmSubtab, true));
    });

    // Empty-state buttons.
    const emptyCreate = document.getElementById("fm-empty-create");
    if (emptyCreate)
      emptyCreate.addEventListener("click", () =>
        openEditor({ mode: "create", source: "font_manager" })
      );
    const emptyImport = document.getElementById("fm-empty-import");
    if (emptyImport)
      emptyImport.addEventListener("click", () => {
        const dz = document.getElementById("drop-zone");
        if (dz) {
          dz.scrollIntoView({ behavior: "smooth", block: "center" });
          dz.focus();
        }
      });

    // Template download.
    const template = document.getElementById("download-template-btn");
    if (template)
      template.addEventListener("click", () => {
        download("font-template.json", {
          name: "My Font",
          author: "",
          font: { family: "Roboto", type: "google", fallback: "sans-serif" },
        });
        track("font_template_downloaded", { source: "import_dialog" });
        toast("Template downloaded.", "success");
      });

    // Drop zone + file picker.
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("file-input");
    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fileInput.click();
      }
    });
    ["dragenter", "dragover"].forEach((evt) =>
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
      })
    );
    ["dragleave", "drop"].forEach((evt) =>
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
      })
    );
    dropZone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length) importFiles(dt.files, "drop");
    });
    fileInput.addEventListener("change", (e) => importFiles(e.target.files, "file_picker"));

    // Load from URL.
    const urlInput = document.getElementById("url-input");
    const urlName = document.getElementById("url-name");
    const urlBtn = document.getElementById("url-add-btn");
    const doUrl = () => importFromUrl((urlInput.value || "").trim(), urlName.value || "");
    urlBtn.addEventListener("click", doUrl);
    urlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doUrl();
    });

    // Export all + header create.
    const exportAllBtn = document.getElementById("export-all-btn");
    if (exportAllBtn) exportAllBtn.addEventListener("click", exportAll);
    const createBtn = document.getElementById("create-font-btn");
    if (createBtn)
      createBtn.addEventListener("click", () =>
        openEditor({ mode: "create", source: "font_manager" })
      );

    // Editor controls.
    const backdrop = document.getElementById("editor-backdrop");
    document.getElementById("editor-close").addEventListener("click", () => closeEditor());
    document.getElementById("editor-cancel").addEventListener("click", () => closeEditor());
    document.getElementById("editor-save").addEventListener("click", () => saveEditor());
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeEditor();
    });
    document.addEventListener("keydown", (e) => {
      if (editorState && e.key === "Escape") {
        e.preventDefault();
        closeEditor();
      }
    });

    const nameInput = document.getElementById("editor-name");
    const counter = document.getElementById("editor-name-counter");
    nameInput.addEventListener("input", () => {
      if (!editorState) return;
      editorState.draft.name = nameInput.value;
      editorState.dirty = true;
      counter.textContent = `${nameInput.value.length} / 40`;
      const err = document.getElementById("editor-name-error");
      if (err.textContent) {
        err.textContent = "";
        nameInput.classList.remove("error");
      }
    });

    const familyInput = document.getElementById("editor-family");
    familyInput.addEventListener("input", () => {
      if (!editorState) return;
      editorState.draft.family = familyInput.value;
      editorState.dirty = true;
      familyInput.classList.remove("error");
      refreshPreview();
    });

    const fallbackSel = document.getElementById("editor-fallback");
    fallbackSel.addEventListener("change", () => {
      if (!editorState) return;
      editorState.draft.fallback = fallbackSel.value;
      editorState.dirty = true;
      refreshPreview();
    });

    // Deep-link from the popup's "+ Create".
    if (window.location.hash === "#create") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
      openEditor({ mode: "create", source: "font_manager" });
    }

    // Live-refresh when fonts change elsewhere (popup, another tab).
    chrome.storage.onChanged.addListener(async (changes, area) => {
      if (area === "local" && (changes[ACTIVE_KEY] || changes[CUSTOM_KEY])) {
        await loadCustoms();
        renderAll();
      }
    });
  });
})();
