function isUsableSrc(e) {
  return "string" == typeof e && e.startsWith("data:");
}

const WC_CSS = '\n/* ── Chat list rows (light mode default) ── */\n#pane-side [role="row"] > div {\n    background: rgba(255, 255, 255, 0.6);\n    border-radius: 10px;\n    transition: background 0.15s ease;\n}\n#pane-side [role="row"]:hover > div {\n    background: rgba(0, 0, 0, 0.05);\n}\n#pane-side [aria-selected="true"] > div {\n    background: rgba(0, 0, 0, 0.08) !important;\n}\n#pane-side span[title] {\n    color: #111b21 !important;\n    font-weight: 500 !important;\n}\n#pane-side span[dir="auto"] {\n    color: rgba(17, 27, 33, 0.65) !important;\n    font-weight: 400 !important;\n}\n\n/* ── Dark-mode overrides (original look preserved) ── */\nbody.dark #pane-side [role="row"] > div {\n    background: rgba(0, 0, 0, 0.25);\n}\nbody.dark #pane-side [role="row"]:hover > div {\n    background: rgba(255, 255, 255, 0.1);\n}\nbody.dark #pane-side [aria-selected="true"] > div {\n    background: rgba(255, 255, 255, 0.2) !important;\n}\nbody.dark #pane-side span[title] {\n    color: #ffffff !important;\n}\nbody.dark #pane-side span[dir="auto"] {\n    color: rgba(255, 255, 255, 0.8) !important;\n}\n\n/* Chat-view header text — only force white in dark mode. Replaces the\n   former unconditional inline assignment that left the contact name\n   invisible against the native light header. */\nbody.dark div#main > header {\n    color: #ffffff !important;\n}\n';

const SLOT_KEYS = ["welcome", "chatview", "sidenav", "navside"];
const S = { welcome: null, chatview: null, sidenav: null, navside: null, welcomePos: "top", welcomeHide: true };
const applied = new WeakMap();

function loadSlots(cb) {
  chrome.storage.local.get([...SLOT_KEYS, "welcomePos", "welcomeHide"], (r) => {
    for (const k of SLOT_KEYS) S[k] = isUsableSrc(r[k]) ? r[k] : null;
    S.welcomePos = ["top", "center", "bottom", "off"].includes(r.welcomePos) ? r.welcomePos : "top";
    S.welcomeHide = r.welcomeHide !== false;
    cb && cb();
  });
}

function setBg(el, src, extra) {
  if (!el) return;
  if (!src) {
    if (applied.has(el)) {
      el.style.removeProperty("background-image");
      el.style.removeProperty("background-size");
      el.style.removeProperty("background-position");
      applied.delete(el);
    }
    return;
  }
  if (applied.get(el) === src) return;
  applied.set(el, src);
  // inline !important beats the theme sheet's !important rules
  el.style.setProperty("background-image", `url("${src}")`, "important");
  el.style.setProperty("background-size", "cover", "important");
  el.style.setProperty("background-position", "center", "important");
  if (extra) Object.assign(el.style, extra);
}

let welcomeSection = null;
function findWelcomeSection() {
  if (welcomeSection && welcomeSection.isConnected && welcomeSection.offsetWidth) return welcomeSection;
  welcomeSection = null;
  for (const s of document.querySelectorAll("section")) {
    if (s.closest("#side, #main")) continue;
    if (s.offsetWidth >= innerWidth * 0.3 && s.offsetHeight >= innerHeight * 0.5) {
      welcomeSection = s;
      return s;
    }
  }
  return null;
}

function placeWrap(wrap, pos) {
  wrap.style.top = wrap.style.bottom = wrap.style.transform = "";
  if (pos === "bottom") wrap.style.bottom = "28px";
  else if (pos === "center") {
    wrap.style.top = "50%";
    wrap.style.transform = "translateY(-50%)";
  } else wrap.style.top = "28px";
}

function applyWelcomeText(section, pos) {
  let wrap = document.getElementById("custom-welcome-wrap");
  if (pos === "off") {
    wrap && wrap.remove();
    return;
  }
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "custom-welcome-wrap";
    Object.assign(wrap.style, {
      position: "absolute",
      left: "0",
      right: "0",
      display: "flex",
      justifyContent: "center",
      pointerEvents: "none",
      zIndex: "10",
    });
    const pill = document.createElement("div");
    Object.assign(pill.style, {
      padding: "14px 28px",
      borderRadius: "18px",
      background: "rgba(0, 0, 0, 0.5)",
      backdropFilter: "blur(8px)",
      textAlign: "center",
      maxWidth: "90%",
    });
    const mk = (tag, id, text, size, weight, color, mt) => {
      const el = document.createElement(tag);
      el.id = id;
      el.textContent = text;
      el.style.setProperty("color", color, "important");
      Object.assign(el.style, {
        fontSize: size,
        fontWeight: weight,
        textShadow: "0 2px 10px rgba(0,0,0,0.8)",
        margin: "0",
        marginTop: mt,
      });
      return el;
    };
    pill.appendChild(mk("h1", "custom-welcome-title", "Welcome To WhatsApp Web", "clamp(22px, 3vw, 38px)", "700", "#ffffff", "0"));
    pill.appendChild(mk("h2", "custom-welcome-subtitle", "Thanks for using WhatsApp Web Customizer!", "clamp(14px, 1.6vw, 20px)", "400", "rgba(255,255,255,0.92)", "6px"));
    wrap.appendChild(pill);
    section.appendChild(wrap);
  }
  if (wrap.dataset.pos !== pos) {
    wrap.dataset.pos = pos;
    placeWrap(wrap, pos);
  }
}

function ensureWelcomeStyle() {
  if (document.getElementById("wa-welcome-style")) return;
  const st = document.createElement("style");
  st.id = "wa-welcome-style";
  st.textContent =
    'section[data-wc-hide="1"] > *:not(#custom-welcome-wrap) { display: none !important; }';
  document.head.appendChild(st);
}

function applyAll() {
  const side = document.getElementById("pane-side");
  const main = document.getElementById("main");
  const two = document.querySelector('div[tabindex="-1"][class^="two"]');
  const grid = document.querySelector('div[role="grid"]');
  const navHeader = document.querySelector("header[tabindex='0']");

  setBg(navHeader, S.navside);

  if ((side || grid) && (main || two)) {
    let st = document.getElementById("wa-chat-style");
    if (!st) {
      st = document.createElement("style");
      st.id = "wa-chat-style";
      document.head.appendChild(st);
    }
    if (st.__wcCss !== WC_CSS) {
      st.__wcCss = WC_CSS;
      st.innerHTML = WC_CSS;
    }

    setBg(side, S.sidenav);

    if (main && S.chatview) {
      const dark = document.querySelector(
        "[data-asset-chat-background-dark], [data-asset-chat-background-light]",
      );
      if (dark && dark.style.backgroundImage !== "none") dark.style.backgroundImage = "none";
    }
    setBg(main, S.chatview);
  }

  if (S.welcome) {
    const section = findWelcomeSection();
    if (section) {
      ensureWelcomeStyle();
      setBg(section, S.welcome, { backgroundRepeat: "no-repeat", position: "relative" });
      section.dataset.wcHide = S.welcomeHide ? "1" : "0";
      applyWelcomeText(section, S.welcomePos);
    }
  } else {
    const w = document.getElementById("custom-welcome-wrap");
    w && w.remove();
    if (welcomeSection) welcomeSection.dataset.wcHide = "0";
  }

  const hdr = document.querySelector("div#main > header");
  if (hdr && hdr.dataset.wcH !== "1") {
    hdr.dataset.wcH = "1";
    hdr.style.background = "none";
  }
}

let wcStarted = false;
function customThemes() {
  if (wcStarted) return;
  wcStarted = true;
  let timer = null;
  const schedule = () => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      applyAll();
    }, 250);
  };
  loadSlots(applyAll);
  chrome.storage.onChanged.addListener((c, area) => {
    if (area === "local") loadSlots(applyAll);
  });
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
customThemes();
