// Run: node tools/check-paths.js
// Verifies every file the extension refers to actually exists.
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
let bad = 0;
const fail = (msg) => { bad++; console.error("MISSING:", msg); };
const exists = (p) => fs.existsSync(path.join(root, p));
const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => {
  const p = path.posix.join(d, e.name);
  return e.isDirectory() ? (["node_modules", ".git"].includes(e.name) ? [] : walk(p)) : [p];
});

// manifest
const m = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const mp = [m.action?.default_popup, m.background?.service_worker, m.options_ui?.page,
  ...Object.values(m.icons || {}), ...m.content_scripts.flatMap((c) => [...(c.js || []), ...(c.css || [])])];
mp.filter(Boolean).forEach((p) => exists(p) || fail("manifest -> " + p));
m.web_accessible_resources.flatMap((w) => w.resources).forEach((p) => {
  if (p.includes("*")) { // glob: check the directory part exists
    const base = p.split("*")[0].replace(/\/$/, "");
    exists(base) || fail("manifest glob -> " + p);
  } else exists(p) || fail("manifest war -> " + p);
});

// html: relative src/href
walk("src").filter((f) => f.endsWith(".html")).forEach((f) => {
  const s = fs.readFileSync(path.join(root, f), "utf8");
  for (const [, v] of s.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    if (/^(https?:|data:|#|mailto:|\/)/.test(v)) continue;
    const t = path.posix.normalize(path.posix.join(path.posix.dirname(f), v.split("#")[0]));
    exists(t) || fail(`${f} -> ${v}`);
  }
});

// js: getURL("...") / importScripts("...") with literal paths
walk("src").filter((f) => f.endsWith(".js")).forEach((f) => {
  const s = fs.readFileSync(path.join(root, f), "utf8");
  for (const [, v] of s.matchAll(/getURL\(\s*["']([^"'$]+)["']\s*\)/g)) exists(v) || fail(`${f} getURL -> ${v}`);
  for (const [, v] of s.matchAll(/importScripts\(\s*["']([^"']+)["']\s*\)/g)) {
    const t = path.posix.join(path.posix.dirname(f), v); exists(t) || fail(`${f} importScripts -> ${v}`);
  }
  for (const [, v] of s.matchAll(/["'](assets\/backgrounds\/animated\/[^"'$]+)["']/g)) exists(v) || fail(`${f} -> ${v}`);
});

console.log(bad ? `${bad} problem(s)` : "All paths OK");
process.exit(bad ? 1 : 0);
