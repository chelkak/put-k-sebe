// Логика диагностики по ТЗ, разделы 2, 4, 5. Никакого интерфейса, только расчёт.
window.LOGIC = (function () {
  const ALGORITHM_VERSION = "1.0-proto";
  const POINTS = { A: 4, B: 3, C: 2, D: 1 };                                   // 2.2
  const PERCENT = { 12: 100, 11: 92, 10: 83, 9: 75, 8: 67, 7: 58, 6: 50, 5: 42, 4: 33, 3: 25 }; // 2.4, только таблица
  const STATUS = { STRONG: "STRONG", IMPROVE: "IMPROVE", ATTENTION: "ATTENTION" };
  // 4.12. Решение прототипа: «высокая» = Сильная сторона, «слабая» = Требует внимания. Порядок = приоритет.
  const CONTEXTS = [
    ["CONTEXT_DISC_HIGH_ENERGY_LOW", "D", "E"],
    ["CONTEXT_DISC_HIGH_PSY_LOW", "D", "P"],
    ["CONTEXT_RESP_HIGH_LIFE_LOW", "R", "L"],
    ["CONTEXT_ENERGY_HIGH_DISC_LOW", "E", "D"],
    ["CONTEXT_LIFE_HIGH_RESP_LOW", "L", "R"]
  ];

  const statusOf = (raw) => (raw >= 10 ? STATUS.STRONG : raw >= 7 ? STATUS.IMPROVE : STATUS.ATTENTION); // 2.5

  function validate(answers, content) {                                         // 5.4
    for (const q of content.QUESTIONS) {
      if (!answers[q.id]) return { ok: false, missing: q.id };
      // hasOwnProperty, а не in: через in проходили служебные имена вроде toString,
      // и расчёт падал на подложенном вручную ответе
      if (!Object.prototype.hasOwnProperty.call(POINTS, answers[q.id])) return { ok: false, invalid: q.id };
    }
    return { ok: true };
  }

  function scoresFor(answers, content) {                                        // 2.3
    const list = content.SPHERES.map((s) => {
      const qs = content.QUESTIONS.filter((q) => q.sphere === s.code);
      const answered = qs.filter((q) => answers[q.id]);
      const raw = answered.reduce((sum, q) => sum + POINTS[answers[q.id]], 0);
      const done = answered.length === 3;
      return { ...s, answered: answered.length, raw, percent: done ? PERCENT[raw] : null, status: done ? statusOf(raw) : null };
    });
    const order = [...list].sort((a, b) => a.raw - b.raw || content.SPHERES.indexOf(a) - content.SPHERES.indexOf(b));
    order.forEach((s, i) => (s.rank = i + 1));
    return list;
  }

  function calculate(answers, content) {
    const check = validate(answers, content);
    if (!check.ok) return { ok: false, ...check };
    const scores = scoresFor(answers, content);
    const trace = [];
    const by = (code) => scores.find((s) => s.code === code);
    const r = { scenario_type: null, main_sphere: null, main_pair: null, secondary_sphere: null,
      system_scenario_id: null, context_scenario_id: null, result_title_id: null, short_id: null,
      main_analysis_id: null, secondary_analysis_id: null };

    trace.push("Баллы: " + scores.map((s) => `${s.code}=${s.raw}`).join(", "));

    if (scores.every((s) => s.status === STATUS.STRONG)) {                     // 5.5
      trace.push("Все пять сфер 10–12 баллов → сценарий «все сильные»");
      Object.assign(r, { scenario_type: "all_strong", system_scenario_id: "SYS_ALL_STRONG",
        result_title_id: "RESULT_TITLE_ALL_STRONG", short_id: "RESULT_ALL_STRONG_SHORT", main_analysis_id: "SYS_ALL_STRONG" });
    } else if (scores.every((s) => s.status === STATUS.ATTENTION)) {
      // Решение прототипа: ТЗ 4.10 и 5.6 ставят SYS_ALL_WEAK выше, чем поиск минимумов, а псевдокод 5.3 до него не доходит.
      trace.push("Все пять сфер 3–6 баллов → SYS_ALL_WEAK (спорное место ТЗ, ставим выше минимумов)");
      Object.assign(r, { scenario_type: "system", system_scenario_id: "SYS_ALL_WEAK",
        result_title_id: "RESULT_TITLE_SYSTEM", short_id: "RESULT_SYSTEM_SHORT", main_analysis_id: "SYS_ALL_WEAK" });
    } else {
      const min = Math.min(...scores.map((s) => s.raw));                         // 4.4
      const mins = scores.filter((s) => s.raw === min);
      trace.push(`Минимум ${min}, у сфер: ${mins.map((s) => s.name).join(", ")}`);
      if (mins.length >= 3) {                                                   // 4.10
        const id = mins.length === 5 ? "SYS_ALL_EQUAL" : mins.length === 4 ? "SYS_FOUR_MIN" : "SYS_THREE_MIN";
        trace.push(`${mins.length} одинаковых минимума → системный ${id}`);
        Object.assign(r, { scenario_type: "system", system_scenario_id: id,
          result_title_id: "RESULT_TITLE_SYSTEM", short_id: "RESULT_SYSTEM_SHORT", main_analysis_id: id });
      } else if (mins.length === 2) {                                           // 4.8, ключ в порядке R E P D L
        r.scenario_type = "pair";
        r.main_pair = mins.map((s) => s.code).join("_");
        r.main_analysis_id = `PAIR_${mins[0].key}_${mins[1].key}`;
        Object.assign(r, { result_title_id: "RESULT_TITLE_PAIR", short_id: "RESULT_PAIR_SHORT" });
        trace.push(`Два минимума → парный ${r.main_analysis_id}, дополнительная сфера не ищется`);
      } else {                                                                  // 4.6
        const main = mins[0];
        Object.assign(r, { scenario_type: "single", main_sphere: main.code,
          result_title_id: `RESULT_TITLE_${main.key}`, short_id: "RESULT_MAIN_SHORT", main_analysis_id: `ANALYSIS_MAIN_${main.key}` });
        trace.push(`Один минимум → главная сфера ${main.name}`);
        const rest = scores.filter((s) => s !== main);                          // 5.8
        const next = Math.min(...rest.map((s) => s.raw));
        const cands = rest.filter((s) => s.raw === next);
        if (next - main.raw > 1) trace.push(`Следующая сфера дальше чем на 1 балл → без дополнительной`);
        else if (cands.length > 1) trace.push(`Кандидатов в дополнительную ${cands.length} → не выбираем (правило 4.7)`);
        else if (cands[0].status === STATUS.STRONG) trace.push(`Кандидат в сильной зоне → без дополнительной`);
        else {
          r.secondary_sphere = cands[0].code;
          r.secondary_analysis_id = `ANALYSIS_SECONDARY_${cands[0].key}`;
          trace.push(`Разница 1 балл → дополнительная сфера ${cands[0].name}`);
        }
      }
    }

    if (r.scenario_type !== "all_strong") {                                     // 5.9, не больше одного
      const hit = CONTEXTS.find(([, hi, lo]) => by(hi).status === STATUS.STRONG && by(lo).status === STATUS.ATTENTION);
      if (hit) { r.context_scenario_id = hit[0]; trace.push(`Контекст: ${hit[0]}`); }
      else trace.push("Контекстных сочетаний нет");
    }

    const shortStatus = { STRONG: "STRONG", IMPROVE: "IMPROVE", ATTENTION: "ATTENTION" };
    r.overview_text_ids = scores.map((s) => `OVERVIEW_${s.key}_${shortStatus[s.status]}`);
    r.bridge_id = "BRIDGE_SYSTEM_EXPLANATION";
    r.offer_id = "PROGRAM_OFFER_TEXT";
    r.algorithm_version = ALGORITHM_VERSION;
    return { ok: true, scores, result: r, trace };
  }

  // Подстановка переменных, 6.20 и 9.10: сырые {скобки} наружу не выходят.
  function render(text, vars, onMissing) {
    return String(text).replace(/\{(\w+)\}/g, (_, name) => {
      if (vars[name] != null && vars[name] !== "") return vars[name];
      onMissing && onMissing(name);
      return name === "first_name" ? "друг" : "";
    });
  }

  // 9.17: делим по абзацам, никогда не обрезаем.
  function split(text, limit = 4096) {
    if (text.length <= limit) return [text];
    const parts = []; let cur = "";
    for (const p of text.split("\n\n")) {
      if (cur && (cur + "\n\n" + p).length > limit) { parts.push(cur); cur = p; }
      else cur = cur ? cur + "\n\n" + p : p;
    }
    if (cur) parts.push(cur);
    return parts;
  }

  // Для кнопок-пресетов: какие ответы дают нужный балл сферы.
  const CODES_FOR = { 12: "AAA", 11: "AAB", 10: "ABB", 9: "BBB", 8: "BBC", 7: "BCC", 6: "CCC", 5: "CCD", 4: "CDD", 3: "DDD" };
  function answersFor(raws, content) {
    const out = {};
    content.SPHERES.forEach((s) => {
      const codes = CODES_FOR[raws[s.code]];
      content.QUESTIONS.filter((q) => q.sphere === s.code).forEach((q, i) => (out[q.id] = codes[i]));
    });
    return out;
  }

  return { ALGORITHM_VERSION, POINTS, PERCENT, STATUS, statusOf, validate, scoresFor, calculate, render, split, answersFor };
})();
