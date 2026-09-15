// Оболочка мини-аппа внутри Telegram. Даёт miniapp.js тот же window.APP, что и прототип,
// только без чата и кухни. Данные пока в памяти телефона (localStorage), сервер подключим позже.
(function () {
  const tg = window.Telegram && window.Telegram.WebApp;
  const C = window.CONTENT, L = window.LOGIC;
  const SKIN = document.documentElement.dataset.skin || "base";          // base, a или b: у каждого своя память
  const KEY = SKIN === "base" ? "pks_tg_v1" : "pks_tg_v1_" + SKIN;
  const fresh = () => ({ user: { first_name: "" }, settings: { program_url: "https://example.getcourse.ru/put-k-sebe", mode: "mini" }, sessions: [], events: [] });

  // Ссылки владельца (system_settings в ТЗ). Берутся отсюда при каждом запуске, чтобы замена доходила до всех.
  const PROGRAM_URL = "https://putksebe-system.ru/sam_zero";
  const CONTACT_URL = "https://t.me/anton_kostin_opora";

  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { S = fresh(); }
  S.settings.program_url = PROGRAM_URL;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  function applyTheme() {
    document.documentElement.dataset.theme = tg && tg.colorScheme === "dark" ? "dark" : "light";
    if (!tg) return;
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim();
    try { tg.setHeaderColor(bg); tg.setBackgroundColor(bg); } catch (e) {}
  }
  if (tg) {
    tg.ready(); tg.expand();
    const u = tg.initDataUnsafe && tg.initDataUnsafe.user;
    if (u && u.first_name) S.user.first_name = u.first_name;
    tg.onEvent("themeChanged", applyTheme);
  }
  applyTheme();

  const active = () => S.sessions.find((s) => s.status === "in_progress");
  const lastDone = () => [...S.sessions].reverse().find((s) => s.status === "completed");
  const sphere = (code) => C.SPHERES.find((x) => x.code === code);
  const STATUS_TITLE = (st) => C.TEXT[`STATUS_${st}_TITLE`];

  function event(name, detail) {
    S.events.push({ name, detail: detail || "", at: new Date().toISOString() });
    S.events = S.events.slice(-60); save();
  }

  function newSession(parent) {
    const s = { id: "s" + Date.now().toString(36), status: "in_progress", answers: {}, introShown: {},
      started_at: new Date().toISOString(), restart_parent_id: parent ? parent.id : null,
      algorithm_version: L.ALGORITHM_VERSION, content_version: "1.0-draft", source: (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) || "direct", mode: "mini", taps: 1 };
    S.sessions.push(s); save(); return s;
  }

  function vars(s, extra) {
    const v = { first_name: S.user.first_name, program_url: S.settings.program_url, ...extra };
    const r = s && s.result;
    if (r) {
      const pick = r.scenario_type === "single" ? [r.main_sphere] : r.scenario_type === "pair" ? r.main_pair.split("_") : [];
      const sc = r.scores.find((x) => x.code === pick[0]);
      v.main_sphere = pick.length ? pick.map((c) => sphere(c).name).join(" + ") : r.scenario_type === "all_strong" ? "удержание баланса" : "вся система";
      if (sc) { v.main_percent = sc.percent + "%"; v.sphere_status = STATUS_TITLE(sc.status); }
      if (r.secondary_sphere) v.secondary_sphere = sphere(r.secondary_sphere).name;
    }
    return v;
  }

  function T(id, s, extra) {
    const raw = C.TEXT[id];
    if (raw == null || raw === "") { event("content_missing", id); return null; }
    return L.render(raw, vars(s, extra), (name) => event("variable_missing", `${id}: {${name}}`));
  }

  function computeResult(s) {
    const calc = L.calculate(s.answers, C);
    if (!calc.ok) { s.status = "in_progress"; save(); event("error_incomplete", calc.missing || calc.invalid); return false; }
    s.result = { ...calc.result, scores: calc.scores.map(({ code, raw, percent, status, rank }) => ({ code, raw, percent, status, rank })),
      trace: calc.trace, generated_at: new Date().toISOString(), content_version: s.content_version };
    s.status = "completed"; s.completed_at = s.result.generated_at; save();
    event("diagnostic_completed", s.result.scenario_type);
    try { tg && tg.HapticFeedback.notificationOccurred("success"); } catch (e) {}
    return true;
  }

  let timer;
  function toast(text) {
    const t = document.getElementById("toast"); t.textContent = text; t.hidden = false;
    clearTimeout(timer); timer = setTimeout(() => (t.hidden = true), 2600);
  }

  function openTelegram(url) {
    try { if (tg && tg.openTelegramLink) return tg.openTelegramLink(url); } catch (e) {}
    window.open(url, "_blank");
  }
  function openLink(url) {
    try { if (tg && tg.openLink) return tg.openLink(url); } catch (e) {}
    window.open(url, "_blank");
  }

  window.APP = { get S() { return S; }, C, L, save, event, active, lastDone, newSession, computeResult, T, sphere, STATUS_TITLE,
    renderPanel() {}, toast, tap() {}, contactUrl: CONTACT_URL, openTelegram, openLink };

  // Пункт в меню «⋯» Telegram. Подпись («Настройки») задаёт сам Telegram, внутри наше меню.
  try {
    if (tg && tg.isVersionAtLeast && tg.isVersionAtLeast("7.0") && tg.SettingsButton) {
      tg.SettingsButton.onClick(() => window.MINI.menu());
      tg.SettingsButton.show();
    }
  } catch (e) {}

  event("bot_started", "telegram");
  window.MINI.show();
})();
