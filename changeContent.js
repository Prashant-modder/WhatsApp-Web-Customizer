function isUsableSrc(e) {
  return "string" == typeof e && e.startsWith("data:");
}

const WC_CSS = '\n/* ── Chat list rows (light mode default) ── */\n#pane-side [role="row"] > div {\n    background: rgba(255, 255, 255, 0.6);\n    border-radius: 10px;\n    transition: background 0.15s ease;\n}\n#pane-side [role="row"]:hover > div {\n    background: rgba(0, 0, 0, 0.05);\n}\n#pane-side [aria-selected="true"] > div {\n    background: rgba(0, 0, 0, 0.08) !important;\n}\n#pane-side span[title] {\n    color: #111b21 !important;\n    font-weight: 500 !important;\n}\n#pane-side span[dir="auto"] {\n    color: rgba(17, 27, 33, 0.65) !important;\n    font-weight: 400 !important;\n}\n\n/* ── Dark-mode overrides (original look preserved) ── */\nbody.dark #pane-side [role="row"] > div {\n    background: rgba(0, 0, 0, 0.25);\n}\nbody.dark #pane-side [role="row"]:hover > div {\n    background: rgba(255, 255, 255, 0.1);\n}\nbody.dark #pane-side [aria-selected="true"] > div {\n    background: rgba(255, 255, 255, 0.2) !important;\n}\nbody.dark #pane-side span[title] {\n    color: #ffffff !important;\n}\nbody.dark #pane-side span[dir="auto"] {\n    color: rgba(255, 255, 255, 0.8) !important;\n}\n\n/* Chat-view header text — only force white in dark mode. Replaces the\n   former unconditional inline assignment that left the contact name\n   invisible against the native light header. */\nbody.dark div#main > header {\n    color: #ffffff !important;\n}\n';

const S = { welcome: null, chatview: null, sidenav: null, navside: null };
const applied = new WeakMap();

function loadSlots(cb) {
  chrome.storage.local.get(["welcome", "chatview", "sidenav", "navside"], (r) => {
    for (const k in S) S[k] = isUsableSrc(r[k]) ? r[k] : null;
    cb && cb();
  });
}

function setBg(el, src, extra) {
  if (!el) return;
  if (!src) {
    if (applied.has(el)) {
      el.style.backgroundImage = "";
      el.style.backgroundSize = "";
      el.style.backgroundPosition = "";
      applied.delete(el);
    }
    return;
  }
  if (applied.get(el) === src) return;
  applied.set(el, src);
  el.style.backgroundImage = `url("${src}")`;
  el.style.backgroundSize = "cover";
  el.style.backgroundPosition = "center";
  if (extra) Object.assign(el.style, extra);
}

let welcomeSection = null;
function findWelcomeSection() {
  if (welcomeSection && welcomeSection.isConnected) return welcomeSection;
  welcomeSection = null;
  for (const s of document.querySelectorAll("section")) {
    for (const d of s.children) {
      if (
        d.tagName === "DIV" &&
        d.classList.length === 1 &&
        d.children.length === 3 &&
        Array.from(d.children).every((c) => c.tagName === "BUTTON")
      ) {
        welcomeSection = s;
        return s;
      }
    }
  }
  return null;
}

function addWelcomeText(section) {
  if (document.getElementById("custom-welcome-title")) return;
  const h1 = document.createElement("h1");
  h1.id = "custom-welcome-title";
  h1.textContent = "Welcome To WhatsApp Web";
  Object.assign(h1.style, {
    color: "white",
    fontSize: "36px",
    fontWeight: "bold",
    textShadow: "2px 2px 8px rgba(0,0,0,0.7)",
    zIndex: "10",
    margin: "0",
  });
  section.appendChild(h1);
  const h2 = document.createElement("h2");
  h2.id = "custom-welcome-subtitle";
  h2.textContent = "Thanks for using WhatsApp Web Customizer!";
  Object.assign(h2.style, {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: "20px",
    fontWeight: "400",
    textShadow: "1px 1px 5px rgba(0,0,0,0.7)",
    zIndex: "10",
    marginTop: "10px",
  });
  section.appendChild(h2);
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

    if (S.welcome) {
      const section = findWelcomeSection();
      if (section) {
        setBg(section, S.welcome, {
          backgroundRepeat: "no-repeat",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        });
        addWelcomeText(section);
      }
    }
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