// Оболочка мини-аппа внутри Telegram. Даёт miniapp.js тот же window.APP, что и прототип,
// только без чата и кухни. Данные пока в памяти телефона (localStorage), сервер подключим позже.
(function () {
  const tg = window.Telegram && window.Telegram.WebApp;
  const C = window.CONTENT, L = window.LOGIC;
  const SKIN = document.documentElement.dataset.skin || "base";          // base, a или b: у каждого своя память
  const BASE_KEY = SKIN === "base" ? "pks_tg_v1" : "pks_tg_v1_" + SKIN;
  // К ключу добавляем номер аккаунта Telegram: на одном телефоне аккаунтов может быть несколько,
  // а хранилище у вебвью общее, и второй увидел бы диагностику первого.
  const UID = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) || 0;
  const KEY = UID ? BASE_KEY + "_u" + UID : BASE_KEY;
  const fresh = () => ({ user: { first_name: "" }, settings: { program_url: "https://example.getcourse.ru/put-k-sebe", mode: "mini" }, sessions: [], events: [] });

  // Ссылки владельца (system_settings в ТЗ). Берутся отсюда при каждом запуске, чтобы замена доходила до всех.
  const PROGRAM_URL = "https://putksebe-system.ru/sam_zero";
  const CONTACT_URL = "https://t.me/anton_kostin_opora";

  // Данные могли остаться от прежней версии или испортиться: чего нет, подставляем по умолчанию.
  // Раньше на таком запуске приложение падало и человек видел пустой экран.
  function load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!raw && UID) {                                   // первый запуск с именным ключом: переносим прежние ответы
      try { raw = JSON.parse(localStorage.getItem(BASE_KEY)); localStorage.removeItem(BASE_KEY); } catch (e) {}
    }
    const s = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : fresh();
    const f = fresh();
    if (!s.user || typeof s.user !== "object") s.user = f.user;
    if (!s.settings || typeof s.settings !== "object") s.settings = f.settings;
    if (!Array.isArray(s.sessions)) s.sessions = [];
    if (!Array.isArray(s.events)) s.events = [];
    return s;
  }
  const S = load();
  S.settings.program_url = PROGRAM_URL;

  let storageWarned = false;
  function save() {
    // Старые прохождения не копим без конца: иначе хранилище упрётся в лимит
    // и телефон молча перестанет сохранять новые ответы
    if (S.sessions.length > 8) S.sessions = S.sessions.slice(-8);
    try { localStorage.setItem(KEY, JSON.stringify(S)); return true; }
    catch (e) {
      // Память телефона переполнена или запрещена. Раньше мы молчали, а под вопросом обещали
      // «ответ сохраняется сразу»: человек мог потерять всё и не узнать об этом.
      if (!storageWarned) {
        storageWarned = true;
        setTimeout(() => toast("Телефон не даёт сохранить ответы. Лучше пройти до конца, не закрывая приложение."), 400);
      }
      return false;
    }
  }

  function applyTheme() {
    document.documentElement.dataset.theme = tg && tg.colorScheme === "dark" ? "dark" : "light";
    if (!tg) return;
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim();
    try { tg.setHeaderColor(bg); tg.setBackgroundColor(bg); } catch (e) {}
  }
  // Высота окна: Telegram меняет её при сворачивании и разворачивании мини-аппа.
  // Без пересчёта сцена остаётся прежней высоты и внизу появляется чёрная пустота.
  function syncHeight() {
    const h = (tg && (tg.viewportStableHeight || tg.viewportHeight)) || window.innerHeight;
    document.documentElement.style.setProperty("--app-h", Math.round(h) + "px");
  }
  window.addEventListener("resize", syncHeight);
  window.addEventListener("orientationchange", syncHeight);

  // Безопасные отступы отдаёт сам Telegram. На айфонах с островком и в полноэкранном режиме
  // верх экрана иначе уходит под его панель, а нижняя кнопка под системную полосу.
  function syncSafeArea() {
    const a = (tg && tg.safeAreaInset) || {}, b = (tg && tg.contentSafeAreaInset) || {};
    const st = document.documentElement.style;
    st.setProperty("--safe-top", Math.max(a.top || 0, b.top || 0) + "px");
    st.setProperty("--safe-bottom", Math.max(a.bottom || 0, b.bottom || 0) + "px");
  }

  if (tg) {
    tg.ready(); tg.expand();
    tg.onEvent("viewportChanged", syncHeight);
    // Свайп вниз внутри мини-аппа закрывал его прямо посреди теста: прокрутка результата
    // цеплялась за жест Telegram. Отключаем там, где Telegram это умеет (с версии 7.7).
    try { if (tg.isVersionAtLeast && tg.isVersionAtLeast("7.7") && tg.disableVerticalSwipes) tg.disableVerticalSwipes(); } catch (e) {}
    try { tg.onEvent("safeAreaChanged", syncSafeArea); tg.onEvent("contentSafeAreaChanged", syncSafeArea); } catch (e) {}
  }
  syncHeight();
  syncSafeArea();

  // Телефон заблокирован или мини-апп свёрнут: помечаем это, чтобы сцена ничего не анимировала.
  // Иначе вебвью продолжает рисовать в фоне и при возврате подвисает.
  function syncVisible() {
    // document.hidden ловит блокировку экрана, isActive это состояние мини-аппа внутри Telegram:
    // свёрнутый в шторку он формально видим, а рисовать там уже незачем
    const away = document.hidden || (tg && tg.isActive === false);
    document.documentElement.classList.toggle("is-hidden", !!away);
    if (away) return;
    syncHeight();
    // После разблокировки телефона Telegram иногда возвращает окно свёрнутым и с прежней высотой:
    // разворачиваем заново и пересчитываем высоту следующим кадром, когда размер уже настоящий.
    try { tg && tg.expand(); } catch (e) {}
    requestAnimationFrame(syncHeight);
  }
  document.addEventListener("visibilitychange", syncVisible);
  window.addEventListener("pageshow", syncVisible);
  // Telegram сам сообщает, что мини-апп ушёл на второй план: это надёжнее одного document.hidden
  if (tg && tg.onEvent) { try { tg.onEvent("activated", syncVisible); tg.onEvent("deactivated", syncVisible); } catch (e) {} }
  syncVisible();
  if (tg) {
    const u = tg.initDataUnsafe && tg.initDataUnsafe.user;
    if (u && u.first_name) S.user.first_name = u.first_name;
    tg.onEvent("themeChanged", applyTheme);
  }
  applyTheme();

  // «calculating» это та же незаконченная диагностика: телефон мог выгрузить приложение
  // в ту секунду, пока считался результат. Без этого все 15 ответов пропадали.
  const active = () => S.sessions.find((s) => s.status === "in_progress" || s.status === "calculating");
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
