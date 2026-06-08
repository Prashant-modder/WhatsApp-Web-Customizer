!function(){const a=/^custom-[0-9a-z]{6,}-[0-9a-z]{4,}$/;
globalThis.WA_THEME_PRESETS=[
  {
    "id": "preset-rubin",
    "name": "Rubin",
    "source": "preset",
    "vars": {
      "--wc-link": "rgba(255, 209, 102, 1)",
      "--wc-accent": "rgba(255, 138, 128, 0.9)",
      "--wc-text": "rgba(255, 240, 241, 1)",
      "--wc-receipt": "rgba(120, 230, 210, 1)",
      "--wc-bubble-in": "rgba(94, 14, 28, 0.82)",
      "--wc-bubble-out": "rgba(176, 42, 58, 0.82)",
      "--wc-load-main": "linear-gradient(45deg, rgba(70, 10, 18, 0.88), rgba(54, 8, 14, 0.88), rgba(70, 10, 18, 0.88))",
      "--wc-load-side": "linear-gradient(45deg, rgba(70, 10, 18, 0.88), rgba(54, 8, 14, 0.88))",
      "--wc-load-item": "linear-gradient(45deg, rgba(86, 12, 22, 0.82), rgba(72, 10, 18, 0.82))",
      "--wc-load-item-rev": "linear-gradient(45deg, rgba(72, 10, 18, 0.82), rgba(86, 12, 22, 0.82))",
      "--wc-load-item-up": "linear-gradient(to top, rgba(86, 12, 22, 0.82), rgba(72, 10, 18, 0.82))",
      "--wc-bg-base": "rgba(120, 18, 30, 0.55)",
      "--wc-bg-up": "linear-gradient(to top, rgba(134, 22, 36, 0.52), rgba(96, 14, 28, 0.52))",
      "--wc-bg-down": "linear-gradient(to bottom, rgba(134, 22, 36, 0.52), rgba(96, 14, 28, 0.52))",
      "--wc-bg-diag": "linear-gradient(45deg, rgba(134, 22, 36, 0.52), rgba(96, 14, 28, 0.52))",
      "--wc-bg-diag-alt": "linear-gradient(45deg, rgba(96, 14, 28, 0.52), rgba(134, 22, 36, 0.52))",
      "--wc-scroll": "rgba(168, 60, 72, 0.5)"
    }
  },
  {
    "id": "preset-saphir",
    "name": "Saphir",
    "source": "preset",
    "vars": {
      "--wc-link": "rgba(255, 206, 84, 1)",
      "--wc-accent": "rgba(86, 226, 214, 0.9)",
      "--wc-text": "rgba(232, 240, 255, 1)",
      "--wc-receipt": "rgba(86, 226, 214, 1)",
      "--wc-bubble-in": "rgba(16, 52, 96, 0.82)",
      "--wc-bubble-out": "rgba(44, 92, 190, 0.82)",
      "--wc-load-main": "linear-gradient(45deg, rgba(14, 30, 70, 0.88), rgba(10, 22, 54, 0.88), rgba(14, 30, 70, 0.88))",
      "--wc-load-side": "linear-gradient(45deg, rgba(14, 30, 70, 0.88), rgba(10, 22, 54, 0.88))",
      "--wc-load-item": "linear-gradient(45deg, rgba(18, 36, 82, 0.82), rgba(12, 28, 66, 0.82))",
      "--wc-load-item-rev": "linear-gradient(45deg, rgba(12, 28, 66, 0.82), rgba(18, 36, 82, 0.82))",
      "--wc-load-item-up": "linear-gradient(to top, rgba(18, 36, 82, 0.82), rgba(12, 28, 66, 0.82))",
      "--wc-bg-base": "rgba(20, 42, 92, 0.82)",
      "--wc-bg-up": "linear-gradient(to top, rgba(26, 52, 108, 0.8), rgba(16, 38, 86, 0.8))",
      "--wc-bg-down": "linear-gradient(to bottom, rgba(26, 52, 108, 0.8), rgba(16, 38, 86, 0.8))",
      "--wc-bg-diag": "linear-gradient(45deg, rgba(26, 52, 108, 0.8), rgba(16, 38, 86, 0.8))",
      "--wc-bg-diag-alt": "linear-gradient(45deg, rgba(16, 38, 86, 0.8), rgba(26, 52, 108, 0.8))",
      "--wc-scroll": "rgba(60, 110, 210, 0.5)"
    }
  },
  {
    "id": "preset-smaragd",
    "name": "Smaragd",
    "source": "preset",
    "vars": {
      "--wc-link": "rgba(244, 236, 180, 1)",
      "--wc-accent": "rgba(255, 176, 64, 0.9)",
      "--wc-text": "rgba(234, 248, 232, 1)",
      "--wc-receipt": "rgba(80, 240, 160, 1)",
      "--wc-bubble-in": "rgba(20, 58, 46, 0.82)",
      "--wc-bubble-out": "rgba(34, 134, 92, 0.82)",
      "--wc-load-main": "linear-gradient(45deg, rgba(10, 46, 32, 0.88), rgba(7, 36, 26, 0.88), rgba(10, 46, 32, 0.88))",
      "--wc-load-side": "linear-gradient(45deg, rgba(10, 46, 32, 0.88), rgba(7, 36, 26, 0.88))",
      "--wc-load-item": "linear-gradient(45deg, rgba(12, 52, 36, 0.82), rgba(9, 42, 30, 0.82))",
      "--wc-load-item-rev": "linear-gradient(45deg, rgba(9, 42, 30, 0.82), rgba(12, 52, 36, 0.82))",
      "--wc-load-item-up": "linear-gradient(to top, rgba(12, 52, 36, 0.82), rgba(9, 42, 30, 0.82))",
      "--wc-bg-base": "rgba(18, 78, 56, 0.62)",
      "--wc-bg-up": "linear-gradient(to top, rgba(22, 86, 62, 0.6), rgba(14, 66, 48, 0.6))",
      "--wc-bg-down": "linear-gradient(to bottom, rgba(22, 86, 62, 0.6), rgba(14, 66, 48, 0.6))",
      "--wc-bg-diag": "linear-gradient(45deg, rgba(22, 86, 62, 0.6), rgba(14, 66, 48, 0.6))",
      "--wc-bg-diag-alt": "linear-gradient(45deg, rgba(14, 66, 48, 0.6), rgba(22, 86, 62, 0.6))",
      "--wc-scroll": "rgba(40, 200, 130, 0.5)"
    }
  },
  {
    "id": "preset-obsidian",
    "name": "Obsidian",
    "source": "preset",
    "vars": {
      "--wc-link": "rgba(255, 196, 120, 1)",
      "--wc-accent": "rgba(232, 86, 70, 0.9)",
      "--wc-text": "rgba(245, 245, 248, 1)",
      "--wc-receipt": "rgba(96, 210, 235, 1)",
      "--wc-bubble-in": "rgba(34, 34, 38, 0.88)",
      "--wc-bubble-out": "rgba(140, 36, 42, 0.88)",
      "--wc-load-main": "linear-gradient(45deg, rgba(16, 16, 19, 1), rgba(9, 9, 12, 1), rgba(16, 16, 19, 1))",
      "--wc-load-side": "linear-gradient(45deg, rgba(16, 16, 19, 1), rgba(9, 9, 12, 1))",
      "--wc-load-item": "linear-gradient(45deg, rgba(30, 30, 35, 0.85), rgba(22, 22, 26, 0.85))",
      "--wc-load-item-rev": "linear-gradient(45deg, rgba(22, 22, 26, 0.85), rgba(30, 30, 35, 0.85))",
      "--wc-load-item-up": "linear-gradient(to top, rgba(30, 30, 35, 0.85), rgba(22, 22, 26, 0.85))",
      "--wc-bg-base": "rgba(14, 14, 16, 1)",
      "--wc-bg-up": "linear-gradient(to top, rgba(18, 18, 22, 1), rgba(10, 10, 13, 1))",
      "--wc-bg-down": "linear-gradient(to bottom, rgba(18, 18, 22, 1), rgba(10, 10, 13, 1))",
      "--wc-bg-diag": "linear-gradient(45deg, rgba(18, 18, 22, 1), rgba(10, 10, 13, 1))",
      "--wc-bg-diag-alt": "linear-gradient(45deg, rgba(10, 10, 13, 1), rgba(18, 18, 22, 1))",
      "--wc-scroll": "rgba(26, 26, 30, 0.85)"
    }
  },
  {
    "id": "preset-haematit",
    "name": "Hämatit",
    "source": "preset",
    "vars": {
      "--wc-link": "rgba(64, 214, 240, 1)",
      "--wc-accent": "rgba(64, 214, 240, 0.85)",
      "--wc-text": "rgba(238, 242, 246, 1)",
      "--wc-receipt": "rgba(64, 214, 240, 1)",
      "--wc-bubble-in": "rgba(54, 60, 68, 0.88)",
      "--wc-bubble-out": "rgba(38, 88, 118, 0.85)",
      "--wc-load-main": "linear-gradient(45deg, rgba(24, 26, 30, 1), rgba(16, 18, 21, 1), rgba(24, 26, 30, 1))",
      "--wc-load-side": "linear-gradient(45deg, rgba(24, 26, 30, 1), rgba(16, 18, 21, 1))",
      "--wc-load-item": "linear-gradient(45deg, rgba(28, 40, 46, 0.8), rgba(22, 32, 38, 0.8))",
      "--wc-load-item-rev": "linear-gradient(45deg, rgba(22, 32, 38, 0.8), rgba(28, 40, 46, 0.8))",
      "--wc-load-item-up": "linear-gradient(to top, rgba(28, 40, 46, 0.8), rgba(22, 32, 38, 0.8))",
      "--wc-bg-base": "rgba(26, 28, 32, 1)",
      "--wc-bg-up": "linear-gradient(to top, rgba(30, 33, 38, 1), rgba(18, 20, 24, 1))",
      "--wc-bg-down": "linear-gradient(to bottom, rgba(30, 33, 38, 1), rgba(18, 20, 24, 1))",
      "--wc-bg-diag": "linear-gradient(45deg, rgba(30, 33, 38, 1), rgba(18, 20, 24, 1))",
      "--wc-bg-diag-alt": "linear-gradient(45deg, rgba(18, 20, 24, 1), rgba(30, 33, 38, 1))",
      "--wc-scroll": "rgba(40, 44, 50, 0.8)"
    }
  },
  {
    "id": "preset-amethyst",
    "name": "Amethyst",
    "source": "preset",
    "vars": {
      "--wc-link": "rgba(120, 240, 130, 1)",
      "--wc-accent": "rgba(255, 176, 80, 0.9)",
      "--wc-text": "rgba(244, 240, 252, 1)",
      "--wc-receipt": "rgba(120, 240, 130, 1)",
      "--wc-bubble-in": "rgba(70, 28, 110, 0.82)",
      "--wc-bubble-out": "rgba(126, 58, 196, 0.82)",
      "--wc-load-main": "linear-gradient(45deg, rgba(48, 20, 76, 0.88), rgba(38, 16, 60, 0.88), rgba(48, 20, 76, 0.88))",
      "--wc-load-side": "linear-gradient(45deg, rgba(48, 20, 76, 0.88), rgba(38, 16, 60, 0.88))",
      "--wc-load-item": "linear-gradient(45deg, rgba(56, 24, 86, 0.82), rgba(46, 18, 72, 0.82))",
      "--wc-load-item-rev": "linear-gradient(45deg, rgba(46, 18, 72, 0.82), rgba(56, 24, 86, 0.82))",
      "--wc-load-item-up": "linear-gradient(to top, rgba(56, 24, 86, 0.82), rgba(46, 18, 72, 0.82))",
      "--wc-bg-base": "rgba(74, 36, 116, 0.62)",
      "--wc-bg-up": "linear-gradient(to top, rgba(82, 42, 128, 0.6), rgba(64, 30, 104, 0.6))",
      "--wc-bg-down": "linear-gradient(to bottom, rgba(82, 42, 128, 0.6), rgba(64, 30, 104, 0.6))",
      "--wc-bg-diag": "linear-gradient(45deg, rgba(82, 42, 128, 0.6), rgba(64, 30, 104, 0.6))",
      "--wc-bg-diag-alt": "linear-gradient(45deg, rgba(64, 30, 104, 0.6), rgba(82, 42, 128, 0.6))",
      "--wc-scroll": "rgba(150, 70, 220, 0.5)"
    }
  },
  {
    "id": "preset-turmalin",
    "name": "Turmalin",
    "source": "preset",
    "vars": {
      "--wc-link": "rgba(190, 242, 100, 1)",
      "--wc-accent": "rgba(255, 110, 178, 0.9)",
      "--wc-text": "rgba(248, 244, 248, 1)",
      "--wc-receipt": "rgba(255, 110, 178, 1)",
      "--wc-bubble-in": "rgba(40, 16, 32, 0.85)",
      "--wc-bubble-out": "rgba(214, 51, 132, 0.85)",
      "--wc-load-main": "linear-gradient(45deg, rgba(12, 6, 14, 1), rgba(7, 4, 9, 1), rgba(12, 6, 14, 1))",
      "--wc-load-side": "linear-gradient(45deg, rgba(12, 6, 14, 1), rgba(7, 4, 9, 1))",
      "--wc-load-item": "linear-gradient(45deg, rgba(26, 12, 24, 0.85), rgba(18, 8, 18, 0.85))",
      "--wc-load-item-rev": "linear-gradient(45deg, rgba(18, 8, 18, 0.85), rgba(26, 12, 24, 0.85))",
      "--wc-load-item-up": "linear-gradient(to top, rgba(26, 12, 24, 0.85), rgba(18, 8, 18, 0.85))",
      "--wc-bg-base": "rgba(8, 6, 10, 1)",
      "--wc-bg-up": "linear-gradient(to top, rgba(14, 8, 16, 1), rgba(6, 4, 9, 1))",
      "--wc-bg-down": "linear-gradient(to bottom, rgba(14, 8, 16, 1), rgba(6, 4, 9, 1))",
      "--wc-bg-diag": "linear-gradient(45deg, rgba(14, 8, 16, 1), rgba(6, 4, 9, 1))",
      "--wc-bg-diag-alt": "linear-gradient(45deg, rgba(6, 4, 9, 1), rgba(14, 8, 16, 1))",
      "--wc-scroll": "rgba(30, 14, 28, 0.85)"
    }
  },
  {
    "id": "preset-aquamarin",
    "name": "Aquamarin",
    "source": "preset",
    "vars": {
      "--wc-link": "rgba(30, 86, 122, 1)",
      "--wc-accent": "rgba(46, 118, 150, 0.95)",
      "--wc-text": "rgba(248, 252, 254, 1)",
      "--wc-receipt": "rgba(130, 214, 232, 1)",
      "--wc-bubble-in": "rgba(64, 118, 150, 0.82)",
      "--wc-bubble-out": "rgba(150, 196, 214, 0.82)",
      "--wc-load-main": "linear-gradient(45deg, rgba(58, 92, 118, 0.85), rgba(44, 76, 100, 0.85), rgba(58, 92, 118, 0.85))",
      "--wc-load-side": "linear-gradient(45deg, rgba(58, 92, 118, 0.85), rgba(44, 76, 100, 0.85))",
      "--wc-load-item": "linear-gradient(45deg, rgba(70, 104, 130, 0.82), rgba(56, 90, 114, 0.82))",
      "--wc-load-item-rev": "linear-gradient(45deg, rgba(56, 90, 114, 0.82), rgba(70, 104, 130, 0.82))",
      "--wc-load-item-up": "linear-gradient(to top, rgba(70, 104, 130, 0.82), rgba(56, 90, 114, 0.82))",
      "--wc-bg-base": "rgba(96, 132, 156, 0.8)",
      "--wc-bg-up": "linear-gradient(to top, rgba(108, 144, 168, 0.78), rgba(84, 120, 146, 0.78))",
      "--wc-bg-down": "linear-gradient(to bottom, rgba(108, 144, 168, 0.78), rgba(84, 120, 146, 0.78))",
      "--wc-bg-diag": "linear-gradient(45deg, rgba(108, 144, 168, 0.78), rgba(84, 120, 146, 0.78))",
      "--wc-bg-diag-alt": "linear-gradient(45deg, rgba(84, 120, 146, 0.78), rgba(108, 144, 168, 0.78))",
      "--wc-scroll": "rgba(110, 150, 176, 0.55)"
    }
  },
  {
    "id": "preset-serpentin",
    "name": "Serpentin",
    "source": "preset",
    "vars": {
      "--wc-link": "rgba(64, 224, 208, 0.95)",
      "--wc-accent": "rgba(244, 168, 64, 0.9)",
      "--wc-text": "rgba(238, 248, 246, 1)",
      "--wc-receipt": "rgba(64, 224, 208, 1)",
      "--wc-bubble-in": "rgba(24, 52, 52, 0.86)",
      "--wc-bubble-out": "rgba(40, 96, 92, 0.86)",
      "--wc-load-main": "linear-gradient(45deg, rgba(10, 26, 25, 0.85), rgba(7, 19, 18, 0.85), rgba(10, 26, 25, 0.85))",
      "--wc-load-side": "linear-gradient(45deg, rgba(10, 26, 25, 0.85), rgba(7, 19, 18, 0.85))",
      "--wc-load-item": "linear-gradient(45deg, rgba(16, 34, 38, 0.8), rgba(12, 28, 32, 0.8))",
      "--wc-load-item-rev": "linear-gradient(45deg, rgba(12, 28, 32, 0.8), rgba(16, 34, 38, 0.8))",
      "--wc-load-item-up": "linear-gradient(to top, rgba(16, 34, 38, 0.8), rgba(12, 28, 32, 0.8))",
      "--wc-bg-base": "rgba(8, 30, 28, 0.78)",
      "--wc-bg-up": "linear-gradient(to top, rgba(12, 36, 34, 0.76), rgba(6, 24, 23, 0.76))",
      "--wc-bg-down": "linear-gradient(to bottom, rgba(12, 36, 34, 0.76), rgba(6, 24, 23, 0.76))",
      "--wc-bg-diag": "linear-gradient(45deg, rgba(12, 36, 34, 0.76), rgba(6, 24, 23, 0.76))",
      "--wc-bg-diag-alt": "linear-gradient(45deg, rgba(6, 24, 23, 0.76), rgba(12, 36, 34, 0.76))",
      "--wc-scroll": "rgba(60, 120, 114, 0.55)"
    }
  },
  {
    "id": "preset-bernstein",
    "name": "Bernstein",
    "source": "preset",
    "vars": {
      "--wc-link": "rgba(255, 224, 168, 0.95)",
      "--wc-accent": "rgba(250, 214, 120, 0.9)",
      "--wc-text": "rgba(252, 248, 240, 1)",
      "--wc-receipt": "rgba(64, 224, 232, 1)",
      "--wc-bubble-in": "rgba(104, 74, 50, 0.82)",
      "--wc-bubble-out": "rgba(168, 104, 44, 0.82)",
      "--wc-load-main": "linear-gradient(45deg, rgba(78, 52, 32, 0.87), rgba(62, 42, 26, 0.87), rgba(78, 52, 32, 0.87))",
      "--wc-load-side": "linear-gradient(45deg, rgba(78, 52, 32, 0.87), rgba(62, 42, 26, 0.87))",
      "--wc-load-item": "linear-gradient(45deg, rgba(120, 80, 46, 0.82), rgba(108, 72, 42, 0.82))",
      "--wc-load-item-rev": "linear-gradient(45deg, rgba(108, 72, 42, 0.82), rgba(120, 80, 46, 0.82))",
      "--wc-load-item-up": "linear-gradient(to top, rgba(120, 80, 46, 0.82), rgba(108, 72, 42, 0.82))",
      "--wc-bg-base": "rgba(120, 78, 44, 0.82)",
      "--wc-bg-up": "linear-gradient(to top, rgba(132, 88, 50, 0.8), rgba(108, 70, 40, 0.8))",
      "--wc-bg-down": "linear-gradient(to bottom, rgba(132, 88, 50, 0.8), rgba(108, 70, 40, 0.8))",
      "--wc-bg-diag": "linear-gradient(45deg, rgba(132, 88, 50, 0.8), rgba(108, 70, 40, 0.8))",
      "--wc-bg-diag-alt": "linear-gradient(45deg, rgba(108, 70, 40, 0.8), rgba(132, 88, 50, 0.8))",
      "--wc-scroll": "rgba(232, 206, 170, 0.55)"
    }
  },
  {
    "id": "preset-granat",
    "name": "Granat",
    "source": "preset",
    "vars": {
      "--wc-link": "rgba(244, 216, 140, 1)",
      "--wc-accent": "rgba(196, 48, 56, 0.9)",
      "--wc-text": "rgba(244, 242, 244, 1)",
      "--wc-receipt": "rgba(196, 48, 56, 1)",
      "--wc-bubble-in": "rgba(52, 50, 54, 0.85)",
      "--wc-bubble-out": "rgba(110, 24, 32, 0.85)",
      "--wc-load-main": "linear-gradient(45deg, rgba(50, 48, 52, 1), rgba(42, 40, 44, 1), rgba(50, 48, 52, 1))",
      "--wc-load-side": "linear-gradient(45deg, rgba(50, 48, 52, 1), rgba(42, 40, 44, 1))",
      "--wc-load-item": "linear-gradient(45deg, rgba(60, 58, 62, 0.9), rgba(52, 50, 54, 0.9))",
      "--wc-load-item-rev": "linear-gradient(45deg, rgba(52, 50, 54, 0.9), rgba(60, 58, 62, 0.9))",
      "--wc-load-item-up": "linear-gradient(to top, rgba(60, 58, 62, 0.9), rgba(52, 50, 54, 0.9))",
      "--wc-bg-base": "rgba(66, 64, 68, 1)",
      "--wc-bg-up": "linear-gradient(to top, rgba(70, 68, 72, 1), rgba(58, 56, 60, 1))",
      "--wc-bg-down": "linear-gradient(to bottom, rgba(70, 68, 72, 1), rgba(58, 56, 60, 1))",
      "--wc-bg-diag": "linear-gradient(45deg, rgba(70, 68, 72, 1), rgba(58, 56, 60, 1))",
      "--wc-bg-diag-alt": "linear-gradient(45deg, rgba(58, 56, 60, 1), rgba(70, 68, 72, 1))",
      "--wc-scroll": "rgba(96, 92, 98, 0.8)"
    }
  },
  {
    "id": "preset-sugilit",
    "name": "Sugilit",
    "source": "preset",
    "vars": {
      "--wc-link": "rgba(255, 222, 120, 1)",
      "--wc-accent": "rgba(255, 92, 168, 0.9)",
      "--wc-text": "rgba(250, 240, 248, 1)",
      "--wc-receipt": "rgba(255, 92, 168, 1)",
      "--wc-bubble-in": "rgba(104, 28, 96, 0.82)",
      "--wc-bubble-out": "rgba(214, 44, 130, 0.82)",
      "--wc-load-main": "linear-gradient(45deg, rgba(64, 16, 72, 0.88), rgba(50, 12, 58, 0.88), rgba(64, 16, 72, 0.88))",
      "--wc-load-side": "linear-gradient(45deg, rgba(64, 16, 72, 0.88), rgba(50, 12, 58, 0.88))",
      "--wc-load-item": "linear-gradient(45deg, rgba(72, 20, 80, 0.82), rgba(58, 16, 66, 0.82))",
      "--wc-load-item-rev": "linear-gradient(45deg, rgba(58, 16, 66, 0.82), rgba(72, 20, 80, 0.82))",
      "--wc-load-item-up": "linear-gradient(to top, rgba(72, 20, 80, 0.82), rgba(58, 16, 66, 0.82))",
      "--wc-bg-base": "rgba(92, 24, 104, 0.92)",
      "--wc-bg-up": "linear-gradient(to top, rgba(100, 28, 112, 0.88), rgba(78, 20, 90, 0.88))",
      "--wc-bg-down": "linear-gradient(to bottom, rgba(100, 28, 112, 0.88), rgba(78, 20, 90, 0.88))",
      "--wc-bg-diag": "linear-gradient(45deg, rgba(100, 28, 112, 0.88), rgba(78, 20, 90, 0.88))",
      "--wc-bg-diag-alt": "linear-gradient(45deg, rgba(78, 20, 90, 0.88), rgba(100, 28, 112, 0.88))",
      "--wc-scroll": "rgba(150, 40, 140, 0.6)"
    }
  },
  {
    "id": "preset-luke-warm",
    "name": "Luke Warm",
    "source": "preset",
    "vars": {
      "--wc-link": "rgba(242, 218, 166, 1)",
      "--wc-accent": "rgba(234, 133, 133, 1)",
      "--wc-text": "rgba(255, 255, 255, 1)",
      "--wc-receipt": "rgba(38, 217, 253, 1)",
      "--wc-bubble-in": "rgba(145, 39, 141, 0.54)",
      "--wc-bubble-out": "rgba(140, 43, 105, 0.52)",
      "--wc-bg-base": "rgba(89, 15, 163, 0.57)",
      "--wc-scroll": "rgba(242, 242, 242, 0.33)",
      "--wc-bg-up": "linear-gradient(to top, rgba(89, 15, 163, 0), rgba(89, 15, 163, 0.81))",
      "--wc-bg-down": "linear-gradient(to bottom, rgba(89, 15, 163, 0), rgba(89, 15, 163, 0.81))",
      "--wc-bg-diag": "linear-gradient(45deg, rgba(89, 15, 163, 0), rgba(89, 15, 163, 0.81))",
      "--wc-bg-diag-alt": "linear-gradient(45deg, rgba(89, 15, 163, 0), rgba(89, 15, 163, 0.81))",
      "--wc-load-main": "linear-gradient(45deg, rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0))",
      "--wc-load-side": "linear-gradient(45deg, rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0))",
      "--wc-load-item": "linear-gradient(45deg, rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0))",
      "--wc-load-item-rev": "linear-gradient(45deg, rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0))",
      "--wc-load-item-up": "linear-gradient(to top, rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0))"
    },
    "meta": {
      "editorVersion": "v2",
      "colors": {
        "--wc-link": {
          "color": "rgb(242, 218, 166)",
          "opacity": 1
        },
        "--wc-accent": {
          "color": "rgb(234, 133, 133)",
          "opacity": 1
        },
        "--wc-text": {
          "color": "rgb(255, 255, 255)",
          "opacity": 1
        },
        "--wc-receipt": {
          "color": "rgb(38, 217, 253)",
          "opacity": 1
        },
        "--wc-bubble-in": {
          "color": "rgb(145, 39, 141)",
          "opacity": 0.54
        },
        "--wc-bubble-out": {
          "color": "rgb(140, 43, 105)",
          "opacity": 0.52
        },
        "--wc-bg-base": {
          "color": "rgb(89, 15, 163)",
          "opacity": 0.57
        },
        "--wc-scroll": {
          "color": "rgb(242, 242, 242)",
          "opacity": 0.33
        }
      },
      "gradients": {
        "--wc-bg-up": {
          "color": "rgb(89, 15, 163)",
          "opacity": 0.81,
          "solid": false,
          "reverse": true
        },
        "--wc-bg-down": {
          "color": "rgb(89, 15, 163)",
          "opacity": 0.81,
          "solid": false,
          "reverse": true
        },
        "--wc-bg-diag": {
          "color": "rgb(89, 15, 163)",
          "opacity": 0.81,
          "solid": false,
          "reverse": true
        },
        "--wc-bg-diag-alt": {
          "color": "rgb(89, 15, 163)",
          "opacity": 0.81,
          "solid": false,
          "reverse": true
        },
        "--wc-load-main": {
          "color": "rgb(0, 0, 0)",
          "opacity": 0.65,
          "solid": false,
          "reverse": false
        },
        "--wc-load-side": {
          "color": "rgb(0, 0, 0)",
          "opacity": 0.65,
          "solid": false,
          "reverse": false
        },
        "--wc-load-item": {
          "color": "rgb(0, 0, 0)",
          "opacity": 0.65,
          "solid": false,
          "reverse": false
        },
        "--wc-load-item-rev": {
          "color": "rgb(0, 0, 0)",
          "opacity": 0.65,
          "solid": false,
          "reverse": false
        },
        "--wc-load-item-up": {
          "color": "rgb(0, 0, 0)",
          "opacity": 0.65,
          "solid": false,
          "reverse": false
        }
      },
      "colorGroupings": {
        "mainBgUnified": true,
        "waitUnified": true
      }
    }
  }
];
globalThis.WA_THEME_VAR_KEYS=["--wc-link","--wc-accent","--wc-text","--wc-receipt","--wc-bubble-in","--wc-bubble-out","--wc-load-main","--wc-load-side","--wc-load-item","--wc-load-item-rev","--wc-load-item-up","--wc-bg-base","--wc-bg-up","--wc-bg-down","--wc-bg-diag","--wc-bg-diag-alt","--wc-scroll"];
globalThis.WA_THEME_KEY_LABELS={
  "--wc-link": "Hyperlink text",
  "--wc-accent": "Important text",
  "--wc-text": "Compose-box text",
  "--wc-receipt": "Read-receipt accent",
  "--wc-bubble-in": "Incoming bubble",
  "--wc-bubble-out": "Outgoing bubble",
  "--wc-bg-base": "Main background (base)",
  "--wc-scroll": "Scrollbar track",
  "--wc-bg-up": "Main bg — up",
  "--wc-bg-down": "Main bg — down",
  "--wc-bg-diag": "Main bg — diagonal",
  "--wc-bg-diag-alt": "Main bg — diagonal (alt.)",
  "--wc-load-main": "Loading screen (large)",
  "--wc-load-side": "Loading screen (side)",
  "--wc-load-item": "Loading chat items",
  "--wc-load-item-rev": "Loading chat items (alt.)",
  "--wc-load-item-up": "Loading chat items (up)"
};
globalThis.WA_SAFE_THEME_ID_FOR_ANALYTICS=function(r){if(!r||"string"!=typeof r.id)return"unknown";const t=r.id;return t.startsWith("preset-")||a.test(t)?t:"custom-legacy"};
// ---- legacy theme-variable migration (old WhatsApp-derived names -> --wc-* namespace) ----
// The ONLY place the 17 old key strings still appear, by design: a fixed lookup table.
// Non-destructive (returns copies), idempotent (new keys aren't in the table, so they pass
// through unchanged), unknown keys passed through verbatim, values kept 1:1.
const WA_VAR_MIGRATION={"--hyperlink-text":"--wc-link","--important-text":"--wc-accent","--writing-text":"--wc-text","--read-by":"--wc-receipt","--message-incoming":"--wc-bubble-in","--message-outgoing":"--wc-bubble-out","--main-bg-constant":"--wc-bg-base","--main-bg-to-top":"--wc-bg-up","--main-bg-to-bottom":"--wc-bg-down","--main-bg-to-positive-angle":"--wc-bg-diag","--main-bg-to-negative-angle":"--wc-bg-diag-alt","--scrollbar-track-color":"--wc-scroll","--wait-color-big":"--wc-load-main","--wait-color-side":"--wc-load-side","--wait-side-chat-items":"--wc-load-item","--wait-side-chat-items-reverse":"--wc-load-item-rev","--wait-side-chat-items-to-top":"--wc-load-item-up"};
const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function migrateThemeVars(obj){if(!obj||"object"!=typeof obj||Array.isArray(obj))return obj;const out={};for(const k in obj)if(hasOwn(obj,k)&&!hasOwn(WA_VAR_MIGRATION,k))out[k]=obj[k];for(const k in obj)if(hasOwn(obj,k)&&hasOwn(WA_VAR_MIGRATION,k)){const nk=WA_VAR_MIGRATION[k];hasOwn(out,nk)||(out[nk]=obj[k]);}return out;}
function migrateTheme(theme){if(!theme||"object"!=typeof theme||Array.isArray(theme))return theme;const out={};for(const k in theme)if(hasOwn(theme,k))out[k]=theme[k];if(out.vars)out.vars=migrateThemeVars(out.vars);if(out.meta&&"object"==typeof out.meta&&!Array.isArray(out.meta)){const m={};for(const k in out.meta)if(hasOwn(out.meta,k))m[k]=out.meta[k];if(m.colors)m.colors=migrateThemeVars(m.colors);if(m.gradients)m.gradients=migrateThemeVars(m.gradients);out.meta=m;}return out;}
function migrateCustomStorage(done){const FLAG="themes:migrated-wc:v1",CUSTOM="themes:custom";try{if(!(globalThis.chrome&&chrome.storage&&chrome.storage.local))return void(done&&done(!1));chrome.storage.local.get([FLAG,CUSTOM],function(r){if(r&&r[FLAG])return void(done&&done(!1));const list=Array.isArray(r&&r[CUSTOM])?r[CUSTOM]:[],patch={};patch[CUSTOM]=list.map(migrateTheme),patch[FLAG]=!0,chrome.storage.local.set(patch,function(){done&&done(!0)});});}catch(e){done&&done(!1);}}
globalThis.WA_MIGRATE_THEME_VARS=migrateThemeVars;
globalThis.WA_MIGRATE_THEME=migrateTheme;
globalThis.WA_MIGRATE_CUSTOM_STORAGE=migrateCustomStorage;
}();
