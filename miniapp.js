// Мини-апп: те же сессии, логика и тексты, что у чата. Всё через window.APP (появляется в app.js).
window.MINI = (function () {
  const A = () => window.APP;
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  let locked = false;

  const nextQ = (s) => A().C.QUESTIONS.find((q) => !s.answers[q.id]);
  const paragraphs = (text, cls = "m-p") => (text || "").split("\n\n").filter(Boolean).map((p) => el("p", cls, p));

  function screen() { const b = $("mini-body"); b.textContent = ""; b.scrollTop = 0; return b; }
  function main(label, fn) {
    const b = $("mini-main");
    if (!label) { b.hidden = true; b.onclick = null; return; }
    b.hidden = false; b.textContent = label;
    b.onclick = () => { if (locked) return; A().tap(); fn(); };
  }
  function ghost(label, fn) {
    const b = el("button", "m-ghost", label); b.type = "button";
    b.addEventListener("click", () => { if (locked) return; A().tap(); fn(); });
    return b;
  }
  function ticks(done) {
    const t = el("div", "m-ticks");
    for (let i = 0; i < 15; i++) t.append(el("i", i < done ? "done" : i === done ? "now" : ""));
    return t;
  }
  function head(eyebrow, title) {
    const h = el("div"); h.append(el("p", "m-eyebrow", eyebrow), el("h2", "m-h1", title)); return h;
  }

  // ---------- главный экран, 8.4 ----------
  function show() {
    const { C, T, active, lastDone } = A();
    const a = active(), d = lastDone(), b = screen();
    if (a) {
      const n = Object.keys(a.answers).length;
      b.append(head("Диагностика", "Продолжим?"), el("p", "m-lead", T("RECOVERY_RESUME_PROMPT", a, { answered: n })), ticks(n),
        ghost(C.BUTTON.BTN_RESTART, confirmRestart));
      return main(C.BUTTON.BTN_RESUME, () => { A().event("diagnostic_resumed", "miniapp"); question(a); });
    }
    if (d) {
      b.append(head("С возвращением", title(d)), el("p", "m-lead", T("START_RETURNING_USER")), ghost(C.BUTTON.BTN_NEW_DIAGNOSTIC, confirmRestart));
      return main(C.BUTTON.BTN_LAST_RESULT, () => result(d));
    }
    const list = el("ul", "m-spheres");
    C.SPHERES.forEach((s) => { const li = el("li"); li.append(el("span", "", s.name), el("span", "", "3 вопроса")); list.append(li); });
    b.append(head("Диагностика", "Путь к себе"), el("p", "m-lead", T("START_WELCOME")), el("p", "m-p", T("START_VALUE")), list, el("p", "m-muted", T("INTRO_RULES")));
    main(C.BUTTON.BTN_START, () => begin());
  }

  function confirmRestart() {                                            // 9.15, 9.16
    const { C, T } = A(); const b = screen();
    b.append(head("Пройти заново", "Начать с начала?"), el("p", "m-lead", T("RECOVERY_RESTART_CONFIRM")), ghost(C.BUTTON.BTN_CANCEL_RESTART, show));
    main(C.BUTTON.BTN_CONFIRM_RESTART, () => {
      const a = A().active(); const parent = a || A().lastDone();
      if (a) { a.status = "restarted"; A().save(); }
      begin(parent);
    });
  }

  function begin(parent) {
    const { active, newSession, event } = A();
    if (active()) return question(active());                             // 7.5: одна активная сессия
    const s = newSession(parent);
    event(parent ? "diagnostic_restarted" : "diagnostic_started", "miniapp");
    question(s);
  }

  // ---------- вопрос ----------
  function question(s) {
    const { C, T, sphere, save, event, renderPanel } = A();
    const q = nextQ(s);
    if (!q) return analyzing(s);
    const n = C.QUESTIONS.indexOf(q), sp = sphere(q.sphere);
    const b = screen(); main(null);
    // Сфера тихой строкой над вопросом, без отдельных экранов (Антон и Александр, 15.09).
    const about = (T(`BLOCK_${sp.key}_INTRO`) || "").split("\n")[1] || "";
    const label = el("span", "m-sphere"); label.append(el("b", "", sp.name));
    if (about) label.append(document.createTextNode(" · " + about.charAt(0).toLowerCase() + about.slice(1).replace(/\.$/, "")));
    const meta = el("div", "m-qmeta"); meta.append(label, el("span", "m-count", `${n + 1} из 15`));
    b.append(ticks(n), meta, el("h3", "m-q", q.text));
    const opts = el("div", "m-opts");
    q.options.forEach(([code, text]) => {
      const o = el("button", "m-opt", text); o.type = "button";
      o.addEventListener("click", () => {
        if (locked) { event("duplicate_callback", "miniapp"); return; }           // 9.4
        if (s.status !== "in_progress" || (nextQ(s) || {}).id !== q.id) return show(); // 9.5
        locked = true; o.classList.add("picked");
        s.answers[q.id] = code; s.last_activity_at = new Date().toISOString(); save(); A().tap();
        event("question_answered", q.id);
        if (C.QUESTIONS.filter((x) => x.sphere === q.sphere).every((x) => s.answers[x.id])) event("block_completed", sp.name);
        renderPanel();
        setTimeout(() => { locked = false; question(s); }, 220);
      });
      opts.append(o);
    });
    b.append(opts, el("p", "m-muted", "Ответ сохраняется сразу, можно закрыть и вернуться."));
  }

  function analyzing(s) {
    const { T, save, computeResult } = A();
    const b = screen(); main(null);
    const w = el("div", "m-wait"); w.append(el("div", "m-pulse"), el("p", "m-lead", T("PROCESS_ANALYZING")));
    b.append(w);
    s.status = "calculating"; save(); locked = true;
    setTimeout(() => { locked = false; computeResult(s) ? result(s) : question(s); }, 1100);
  }

  // ---------- результат одним экраном ----------
  function title(s) {
    return A().T(s.result.result_title_id, s).replace(/^Главная точка роста:\s*/, "");
  }

  function result(s) {
    const { C, S, T, sphere, STATUS_TITLE, event, toast } = A();
    const r = s.result, b = screen();
    event("result_opened", "miniapp");
    b.append(head(r.scenario_type === "all_strong" ? "Результат" : "Главная точка роста", title(s)));

    const code = r.scenario_type === "single" ? r.main_sphere : r.scenario_type === "pair" ? r.main_pair.split("_")[0] : null;
    const sc = code && r.scores.find((x) => x.code === code);
    if (sc) {
      const big = el("div", "m-big");
      big.append(el("b", "", sc.percent + "%"), el("span", `chip ${sc.status}`, STATUS_TITLE(sc.status)));
      b.append(big);
    }
    b.append(el("p", "m-lead", T(r.short_id, s)));

    const personal = el("section", "m-sec"); personal.append(el("h3", "", "Персональный разбор"));
    const mainText = T(r.main_analysis_id, s);
    personal.append(...paragraphs(mainText || T("FALLBACK_RESULT")));
    if (r.secondary_analysis_id) personal.append(...paragraphs(T(r.secondary_analysis_id, s)));
    if (r.context_scenario_id) personal.append(el("p", "m-note", T(r.context_scenario_id, s)));
    b.append(personal);

    const ov = el("section", "m-sec"); ov.append(el("h3", "", "Общая картина"));
    const bars = el("div", "m-bars");
    C.SPHERES.forEach((sp, i) => {                                         // порядок методики, не сортируем
      const x = r.scores.find((y) => y.code === sp.code);
      const row = el("div"), l = el("div", "m-bar-l"), track = el("div", "m-track"), fill = el("div", `m-fill ${x.status}`);
      l.append(el("span", "", sp.name), el("span", "", x.percent + "%"));
      fill.style.width = x.percent + "%"; track.append(fill);
      const t = el("div", "m-bar-t"); t.textContent = `${STATUS_TITLE(x.status)}, ${T(r.overview_text_ids[i], s) || ""}`;
      row.append(l, track, t); bars.append(row);
    });
    ov.append(bars); b.append(ov);
    event("overview_opened", "miniapp");

    const why = el("section", "m-sec"); why.append(el("h3", "", "Почему это связано"), ...paragraphs(T("BRIDGE_SYSTEM_EXPLANATION", s)));
    const prog = el("section", "m-sec");
    prog.append(el("h3", "", "Путь к себе"), el("p", "m-p", T("PROGRAM_TRANSITION", s)), el("p", "m-p", T("PROGRAM_OFFER_TEXT", s)));
    b.append(why, prog);
    event("offer_viewed", "miniapp");

    const contact = () => { event("contact_clicked", "miniapp"); toast("Здесь откроется чат с Антоном (contact_url)"); };
    const url = (S.settings.program_url || "").trim();
    if (/^https:\/\/\S+\.\S+/.test(url)) {
      b.append(ghost(C.BUTTON.BTN_CONTACT, contact));
      main(C.BUTTON.BTN_PROGRAM_OPEN, () => { event("program_link_clicked", url); toast("Здесь откроется " + url); });
    } else {                                                               // 9.19
      event("error_link", "miniapp");
      prog.append(el("p", "m-note", T("ERROR_LINK")));
      main(C.BUTTON.BTN_CONTACT, contact);
    }
    b.append(ghost(C.BUTTON.BTN_NEW_DIAGNOSTIC, confirmRestart));
    A().renderPanel();
  }

  return { show };
})();
