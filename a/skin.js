// Вариант А «как видит Антон». Эмблема нарисована заглушкой по мотивам логотипа, заменим на его файл.
window.SKIN = (function () {
  const rays = Array.from({ length: 17 }, (_, i) => {
    const a = (-170 + i * 10) * Math.PI / 180, r = i % 2 ? 34 : 46;
    return `<line x1="60" y1="46" x2="${(60 + Math.cos(a) * r).toFixed(1)}" y2="${(46 + Math.sin(a) * r).toFixed(1)}"/>`;
  }).join("");

  const EMBLEM = `<svg class="a-emblem" viewBox="0 0 120 120" aria-hidden="true">
    <defs>
      <linearGradient id="a-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6DE9A"/><stop offset=".5" stop-color="#D9A441"/><stop offset="1" stop-color="#8E5F1A"/></linearGradient>
      <radialGradient id="a-sun" cx="60" cy="46" r="38" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFE9AE" stop-opacity=".95"/><stop offset="1" stop-color="#D9A441" stop-opacity="0"/></radialGradient>
      <clipPath id="a-c"><circle cx="60" cy="60" r="53"/></clipPath>
    </defs>
    <circle cx="60" cy="60" r="56" fill="none" stroke="url(#a-g)" stroke-width="1.6"/>
    <g clip-path="url(#a-c)">
      <circle cx="60" cy="46" r="38" fill="url(#a-sun)"/>
      <g stroke="#F3D48A" stroke-width=".6" opacity=".7">${rays}</g>
      <path d="M-2 90 L20 72 L32 79 L48 60 L60 46 L72 61 L86 73 L98 66 L122 86 L122 122 L-2 122Z" fill="#1A130A" stroke="url(#a-g)" stroke-width=".9"/>
      <path d="M8 104 L30 88 L44 94 L62 80 L80 92 L96 86 L122 102 L122 122 L-2 122Z" fill="#110C06" opacity=".9"/>
      <path d="M42 122 C50 108 78 104 68 92 C60 84 70 78 62 68 C58 63 61 56 60 50" fill="none" stroke="url(#a-g)" stroke-width="4.5" stroke-linecap="round"/>
    </g>
  </svg>`;

  function hero() {
    const h = document.createElement("div");
    h.className = "a-hero";
    h.innerHTML = `${EMBLEM}<h2 class="m-h1">Путь к себе</h2><div class="a-rule"></div><p class="a-tag">Стань автором своей жизни</p>`;
    return h;
  }

  function result(b) {
    const s = document.createElement("div");
    s.className = "a-sign";
    s.innerHTML = `<div class="a-rule"></div><p class="a-tag">Стань автором своей жизни</p>`;
    b.append(s);
  }

  return { hero, result };
})();
