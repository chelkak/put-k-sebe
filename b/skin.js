// Вариант Б: три кадра одной сцены (ночь, рассвет, день) перетекают друг в друга по ходу теста.
// Темп по замечанию Жоры: день приходит только к 15-му ответу, вместе с результатом.
window.SKIN = (function () {
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  // Доли кадров на ключевых шагах. Между ними значения считаются плавно.
  const KEYS = [
    { s: 0,  night: 1.00, dawn: 0.00, day: 0.00, haze: 0.16, glow: 0.05 },
    { s: 2,  night: 0.88, dawn: 0.12, day: 0.00, haze: 0.22, glow: 0.18 },
    { s: 4,  night: 0.55, dawn: 0.45, day: 0.00, haze: 0.30, glow: 0.34 },
    { s: 6,  night: 0.15, dawn: 0.85, day: 0.10, haze: 0.36, glow: 0.52 },
    { s: 8,  night: 0.00, dawn: 0.95, day: 0.45, haze: 0.34, glow: 0.7 },
    { s: 10, night: 0.00, dawn: 0.60, day: 0.85, haze: 0.28, glow: 0.85 },
    { s: 12, night: 0.00, dawn: 0.25, day: 1.00, haze: 0.22, glow: 1 },
    { s: 15, night: 0.00, dawn: 0.00, day: 1.00, haze: 0.14, glow: 1 }
  ];
  const mix = (a, b, t) => a + (b - a) * t;

  function light(step) {
    const s = Math.max(0, Math.min(15, step));
    let i = 0; while (i < KEYS.length - 2 && s > KEYS[i + 1].s) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = (s - a.s) / (b.s - a.s);
    const out = {};
    for (const k of ["night", "dawn", "day", "haze", "glow"]) out[k] = mix(a[k], b[k], t);
    // В начале камера стоит у пары (сильное приближение), к концу отъезжает к горе.
    // Так пара с каждым ответом становится дальше и мельче, а долина раскрывается.
    const k = s / 15;
    // Кадр растёт от нижнего края, поэтому пара всё время держится над карточкой.
    // К концу приближение спадает, пара уходит вдаль, гора раскрывается.
    out.cam = mix(1.5, 1.1, k * k * (3 - 2 * k));    // спокойнее: сцена это фон, а не главный герой
    // Кадр поднимается от тропы к небу: к 9–12 вопросу в видимую часть входит вершина с восходящим солнцем
    out.posY = mix(76, 34, k * k * (3 - 2 * k));
    return out;
  }

  let scene = null;
  function ensureScene() {
    if (scene && document.body.contains(scene)) return scene;
    scene = el("div", "b-scene");
    scene.innerHTML =
      '<div class="b-layer b-night"></div>' +
      '<div class="b-layer b-dawn"></div>' +
      '<div class="b-layer b-day"></div>' +
      '<div class="b-glow"></div>' +
      '<div class="b-haze"></div>';
    // Рассвет и день подгружаем после старта, чтобы первый экран открывался быстро
    const later = [[".b-dawn", "assets/scene-rassvet.png"], [".b-day", "assets/scene-den.png"]];
    setTimeout(() => later.forEach(([sel, src]) => {
      const img = new Image();
      img.onload = () => { const n = scene.querySelector(sel); if (n) n.style.backgroundImage = `url("${src}")`; };
      img.src = src;
    }), 1200);
    return scene;
  }

  function apply(step, isResult) {
    const box = document.getElementById("mini");
    const s = ensureScene();
    if (s.parentNode !== box) box.prepend(s);
    box.classList.toggle("b-result", !!isResult);
    const L = light(step), set = (k, v) => box.style.setProperty(k, v);
    set("--night", L.night.toFixed(3));
    set("--dawn", L.dawn.toFixed(3));
    set("--day", L.day.toFixed(3));
    set("--haze", L.haze.toFixed(2));
    set("--cam", L.cam.toFixed(3));
    set("--pos-y", L.posY.toFixed(1) + "%");
    set("--glow", L.glow.toFixed(3));
    set("--k", (step / 15).toFixed(3));
    // Вспышка света в момент ответа: шаг становится заметным
    if (step > 0) {
      s.classList.remove("is-pulse");
      void s.offsetWidth;
      s.classList.add("is-pulse");
      clearTimeout(apply._t);
      apply._t = setTimeout(() => s.classList.remove("is-pulse"), 800);
    }
    // чем светлее сцена, тем плотнее карточка: текст должен читаться и на рассвете
    set("--card", `rgba(14, 12, 10, ${(0.8 + 0.12 * (step / 15)).toFixed(2)})`);
  }

  function progress(done) {
    apply(done);
    sceneLogo("mark");                                   // на вопросах логотип живёт водяным знаком в углу
    const t = el("div", "m-ticks");
    for (let i = 0; i < 15; i++) t.append(el("i", i < done ? "done" : i === done ? "now" : ""));
    return t;
  }

  // Логотип Антона кладём в слой сцены: там режим screen убирает чёрный фон и остаётся одно золото.
  // На тёмной сцене чёрный фон логотипа исчезает в режиме screen. На светлом кадре результата он вылезет
  // квадратом, поэтому там логотип прячем до файла с настоящей прозрачностью.
  const LOGO_READY = true;
  // mode: "big" на старте и результате, "mark" водяным знаком в углу на вопросах, "none" спрятать.
  function sceneLogo(mode, fallbackHost) {
    if (!LOGO_READY) return;
    const s = ensureScene();
    let img = s.querySelector(".b-logo");
    if (mode === "none") { if (img) img.style.opacity = "0"; return; }
    if (!img) {
      img = el("img", "b-logo");
      img.src = "assets/logo.png";                                    // с прозрачным фоном, ложится на любой кадр
      img.alt = "Путь к себе";
      img.decoding = "async";
      img.onerror = () => { img.remove(); if (fallbackHost) fallbackHost.append(el("h2", "m-h1", "Путь к себе")); };
      s.append(img);
    }
    img.classList.toggle("is-mark", mode === "mark");
    img.style.opacity = "";
  }

  // Вызывается на всех входных экранах: продолжить, с возвращением, подтверждение перезапуска.
  function enter() {
    apply(0);
    sceneLogo("big");
  }

  function hero() {
    apply(0);
    const h = el("div", "b-hero");
    h.append(el("p", "m-eyebrow", "Диагностика"));
    sceneLogo("big", h);
    return h;
  }

  function result() {
    apply(15, true);
    sceneLogo("big");         // с прозрачным фоном логотип уместен и на светлом кадре результата
  }

  return { enter, hero, progress, result };
})();
