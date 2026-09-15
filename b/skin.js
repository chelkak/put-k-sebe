// Вариант Б: путь к Питусираю. Сцена рисуется кодом, слои Жоры потом займут её место.
// Свет ведёт от темноты к восходу, полный диск солнца только на 15-м ответе.
window.SKIN = (function () {
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  // Ключевые состояния света. Между ними значения считаются плавно.
  const KEYS = [
    { s: 0,  top: "#05070D", mid: "#0A0C14", bot: "#12100D", glow: 0.06, stars: 1,    sunY: 150, sunOp: 0,    haze: 0.22 },
    { s: 5,  top: "#070A16", mid: "#141527", bot: "#1B1712", glow: 0.20, stars: 0.75, sunY: 132, sunOp: 0,    haze: 0.30 },
    { s: 11, top: "#122238", mid: "#3C3350", bot: "#4A3520", glow: 0.55, stars: 0.15, sunY: 92, sunOp: 0,    haze: 0.42 },
    { s: 14, top: "#2A4E7A", mid: "#8A6A5A", bot: "#7A4B22", glow: 0.85, stars: 0,    sunY: 34,  sunOp: 0.85, haze: 0.44 },
    { s: 15, top: "#4C84BE", mid: "#D9A96A", bot: "#9A6A2E", glow: 1,    stars: 0,    sunY: 4,   sunOp: 1,    haze: 0.34 }
  ];
  KEYS[2].top = "#122238";

  const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const mixHex = (a, b, t) => "#" + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => a + (b - a) * t;

  function light(step) {
    const s = Math.max(0, Math.min(15, step));
    let i = 0; while (i < KEYS.length - 2 && s > KEYS[i + 1].s) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = (s - a.s) / (b.s - a.s);
    return {
      top: mixHex(a.top, b.top, t), mid: mixHex(a.mid, b.mid, t), bot: mixHex(a.bot, b.bot, t),
      glow: mix(a.glow, b.glow, t), stars: mix(a.stars, b.stars, t),
      sunY: mix(a.sunY, b.sunY, t), sunOp: mix(a.sunOp, b.sunOp, t), haze: mix(a.haze, b.haze, t),
      cam: mix(1.2, 1, s / 15),          // камера отъезжает
      figY: mix(0, -96, s / 15),         // двое уходят по тропе вперёд
      figS: mix(1, 0.5, s / 15)          // и становятся меньше
    };
  }

  const stars = Array.from({ length: 46 }, (_, i) => {
    const x = (i * 97 % 380) + 5, y = (i * 53 % 230) + 8, r = i % 7 === 0 ? 1.5 : 1;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#F6EFDF" opacity="${0.35 + (i % 5) * 0.12}"/>`;
  }).join("");

  // Двое идут за руку, силуэтом со спины. Слева мужчина, справа женщина в длинной одежде.
  const FIGURES = `
    <g class="b-figures">
      <g fill="#120E0A">
        <circle cx="186" cy="474" r="4.6"/>
        <path d="M181 480 h10 l3 20 -4 1 -2 21 h-4 l-1-14 -2 14 h-4 l-2-22 -4-1z"/>
        <circle cx="205" cy="476" r="4.4"/>
        <path d="M200 482 h10 l4 18 -3 1 -3 24 h-10 l-3-24 -3-1z"/>
        <path d="M193 492 q6 3 11 0" stroke="#120E0A" stroke-width="2" fill="none"/>
      </g>
    </g>`;

  let scene = null;
  function ensureScene() {
    if (scene && document.body.contains(scene)) return scene;
    scene = el("div", "b-scene");
    scene.innerHTML = `
      <svg viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="b-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--sky-top)"/>
            <stop offset="0.55" stop-color="var(--sky-mid)"/>
            <stop offset="1" stop-color="var(--sky-bot)"/>
          </linearGradient>
          <radialGradient id="b-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stop-color="#FFD98A" stop-opacity="0.95"/>
            <stop offset="0.45" stop-color="#E5A13F" stop-opacity="0.35"/>
            <stop offset="1" stop-color="#E5A13F" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="b-sunfill" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stop-color="#FFF4D2"/><stop offset="1" stop-color="#F6C25A"/>
          </radialGradient>
          <clipPath id="b-behind"><rect x="0" y="0" width="390" height="470"/></clipPath>
        </defs>

        <rect width="390" height="760" fill="url(#b-sky)"/>
        <g class="b-sky-stars" style="opacity: var(--stars)">${stars}</g>

        <g clip-path="url(#b-behind)">
          <ellipse cx="243" cy="352" rx="200" ry="120" fill="url(#b-glow)" style="opacity: var(--glow)"/>
          <g class="b-sun-g" style="transform: translateY(var(--sun-y)); opacity: var(--sun-op)">
            <circle cx="243" cy="336" r="34" fill="url(#b-sunfill)"/>
          </g>
        </g>

        <!-- Питусирай: двуглавая вершина со снегом -->
        <g class="b-layer b-far">
          <path d="M60 470 L150 330 L186 362 L243 262 L300 352 L330 330 L390 470 Z" fill="#20222E"/>
          <path d="M243 262 L268 302 L252 306 L236 322 L222 304 Z" fill="#E9E6DE" opacity="0.9"/>
          <path d="M150 330 L168 356 L158 358 L146 348 Z" fill="#E9E6DE" opacity="0.6"/>
        </g>

        <g class="b-layer b-mid">
          <path d="M0 470 L70 402 L130 438 L196 392 L262 440 L330 404 L390 452 L390 520 L0 520 Z" fill="#1A1C22"/>
        </g>

        <g class="b-haze" style="opacity: var(--haze)">
          <ellipse class="b-haze-1" cx="150" cy="474" rx="220" ry="26" fill="#CFC6B4" opacity="0.5"/>
          <ellipse class="b-haze-2" cx="270" cy="496" rx="180" ry="18" fill="#CFC6B4" opacity="0.35"/>
        </g>

        <!-- Передний план: склон и рыжая тропа, по ней идут двое -->
        <g class="b-layer b-near">
          <path d="M0 520 C90 500 150 512 210 498 C280 482 330 500 390 486 L390 760 L0 760 Z" fill="#171310"/>
          <path d="M196 496 C186 540 150 600 120 760 L214 760 C206 600 210 540 214 496 Z" fill="#3B2A1B"/>
          <path d="M200 500 C192 545 164 600 140 760" stroke="#553C25" stroke-width="2" fill="none" opacity="0.8"/>
        </g>
        ${FIGURES}
      </svg>`;
    return scene;
  }

  function apply(step) {
    const box = document.getElementById("mini");
    const s = ensureScene();
    if (s.parentNode !== box) box.prepend(s);
    const L = light(step);
    const set = (k, v) => box.style.setProperty(k, v);
    set("--sky-top", L.top); set("--sky-mid", L.mid); set("--sky-bot", L.bot);
    set("--glow", L.glow.toFixed(2)); set("--stars", L.stars.toFixed(2));
    set("--sun-y", L.sunY.toFixed(1) + "px"); set("--sun-op", L.sunOp.toFixed(2));
    set("--haze", L.haze.toFixed(2));
    const far = s.querySelector(".b-far"), mid = s.querySelector(".b-mid"), near = s.querySelector(".b-near"), fig = s.querySelector(".b-figures");
    // Разная скорость слоёв это и есть отъезд камеры
    if (far) far.style.transform = `scale(${(1 + (L.cam - 1) * 0.3).toFixed(3)})`;
    if (mid) mid.style.transform = `scale(${(1 + (L.cam - 1) * 0.6).toFixed(3)})`;
    if (near) near.style.transform = `scale(${L.cam.toFixed(3)})`;
    if (fig) fig.style.transform = `translateY(${L.figY.toFixed(1)}px) scale(${L.figS.toFixed(3)})`;
  }

  function progress(done) {
    apply(done);
    const t = el("div", "m-ticks");
    for (let i = 0; i < 15; i++) t.append(el("i", i < done ? "done" : i === done ? "now" : ""));
    return t;
  }

  function hero() {
    apply(0);
    const h = el("div");
    h.append(el("p", "m-eyebrow", "Диагностика"), el("h2", "m-h1", "Путь к себе"));
    return h;
  }

  function result() { apply(15); }

  return { hero, progress, result };
})();
