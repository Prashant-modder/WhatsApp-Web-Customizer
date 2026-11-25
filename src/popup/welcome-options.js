(function () {
  const pos = document.getElementById("welcomePos");
  const hide = document.getElementById("welcomeHide");
  if (!pos || !hide) return;
  const POS = ["top", "center", "bottom", "off"];
  chrome.storage.local.get(["welcomePos", "welcomeHide"], (r) => {
    pos.value = POS.includes(r.welcomePos) ? r.welcomePos : "top";
    hide.checked = r.welcomeHide !== false;
  });
  pos.addEventListener("change", () => chrome.storage.local.set({ welcomePos: pos.value }));
  hide.addEventListener("change", () => chrome.storage.local.set({ welcomeHide: hide.checked }));
})();
