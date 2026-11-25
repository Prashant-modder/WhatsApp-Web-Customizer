# Project structure

```
manifest.json
assets/
  backgrounds/animated/   animated background pages + thumbnails
  data/images.json        predefined image list
  icon/                   extension icons
  vendor/bootstrap/       popup/page styling
docs/                     analytics + release notes
src/
  background/             service worker (background.js, analytics.js)
  shared/                 loaded by content, popup and pages (track, presets, name validation)
  content/                injected into web.whatsapp.com
    core/                 changeContent, content, dynamic-features, first-run, review prompt
    themes/               themes-content.js + themes-overrides.css
    fonts/                fonts-content.js
    backgrounds/          animated backgrounds
    features/             chat list resize, hover preview, privacy blur
    slots/                slots-fix.js/.css (slot images over themes)
  popup/                  toolbar popup (popup.html + its scripts)
  pages/                  full-tab pages: options, themes, fonts, images, uninstall
tools/check-paths.js      verifies every referenced file exists
```

Content script load order is defined in `manifest.json` and matters: the
`*-presets.js` files define globals the `*-content.js` files read.

After moving or renaming a file, run `node tools/check-paths.js`.
