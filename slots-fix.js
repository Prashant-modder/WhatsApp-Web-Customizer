(function () {
  const map = { chatview: "wc-slot-chat", sidenav: "wc-slot-side" };
  const ok = v => typeof v === "string" && v.startsWith("data:");
  function sync(s) {
    for (const k in map) document.documentElement.classList.toggle(map[k], ok(s[k]));
  }
  chrome.storage.local.get(Object.keys(map), sync);
  chrome.storage.onChanged.addListener((c, area) => {
    if (area !== "local") return;
    chrome.storage.local.get(Object.keys(map), sync);
  });
})();