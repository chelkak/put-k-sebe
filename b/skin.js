// Вариант Б: три кадра одной сцены (ночь, рассвет, день) перетекают друг в друга по ходу теста.
// Темп по замечанию Жоры: день приходит только к 15-му ответу, вместе с результатом.
window.SKIN = (function () {
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  // Доли кадров на ключевых шагах. Между ними значения считаются плавно.
  const KEYS = [
    { s: 0,  night: 1.00, dawn: 0.00, day: 0.00, haze: 0.16 },
    { s: 4,  night: 0.92, dawn: 0.08, day: 0.00, haze: 0.22 },
    { s: 8,  night: 0.45, dawn: 0.55, day: 0.00, haze: 0.34 },
    { s: 11, night: 0.10, dawn: 0.90, day: 0.00, haze: 0.38 },
    { s: 13, night: 0.00, dawn: 1.00, day: 0.18, haze: 0.30 },
    { s: 15, night: 0.00, dawn: 0.35, day: 1.00, haze: 0.18 }
  ];
  const mix = (a, b, t) => a + (b - a) * t;

  function light(step) {
    const s = Math.max(0, Math.min(15, step));
    let i = 0; while (i < KEYS.length - 2 && s > KEYS[i + 1].s) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = (s - a.s) / (b.s - a.s);
    const out = {};
    for (const k of ["night", "dawn", "day", "haze"]) out[k] = mix(a[k], b[k], t);
    // В начале камера стоит у пары (сильное приближение), к концу отъезжает к горе.
    // Так пара с каждым ответом становится дальше и мельче, а долина раскрывается.
    const k = s / 15;
    // Кадр растёт от нижнего края, поэтому пара всё время держится над карточкой.
    // К концу приближение спадает, пара уходит вдаль, гора раскрывается.
    out.cam = mix(1.55, 1.2, k * k * (3 - 2 * k));   // спокойнее: сцена это фон, а не главный герой
    out.posY = mix(72, 58, k);
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
    // чем светлее сцена, тем плотнее карточка: текст должен читаться и на рассвете
    set("--card", `rgba(14, 12, 10, ${(0.66 + 0.2 * (step / 15)).toFixed(2)})`);
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

  function result() { apply(15, true); }

  return { hero, progress, result };
})();
