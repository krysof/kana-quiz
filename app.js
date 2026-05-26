import {
  loadSettings, saveSettings, resetSettings,
  loadStats, saveStats, resetDaily, resetAllStats
} from "./core/storage.js?v=2026-05-26.3";

import { speakJP, warmupTTS } from "./core/tts.js?v=2026-05-26.3";
import { playCorrect, playWrong, unlockAudio } from "./core/audio.js?v=2026-05-26.3";

import {
  newQuestion, recordResult, startSession,
  normalizeRomaji, pct
} from "./core/quiz.js?v=2026-05-26.3";

import { t, getLang, setLang, applyI18nDOM } from "./core/i18n.js?v=2026-05-26.3";

const $ = (id) => document.getElementById(id);

const ui = {
  // Screens
  moduleScreen: $("moduleScreen"),
  settingsScreen: $("settingsScreen"),
  quizScreen: $("quizScreen"),
  grammarScreen: $("grammarScreen"),
  grammarTopicScreen: $("grammarTopicScreen"),

  // Grammar
  grammarTopics: $("grammarTopics"),
  grammarContent: $("grammarContent"),
  grammarTopicTitle: $("grammarTopicTitle"),
  btnGrammarBack: $("btnGrammarBack"),
  btnGrammarTopicBack: $("btnGrammarTopicBack"),
  btnGrammarPractice: $("btnGrammarPractice"),
  grammarPracticeScreen: $("grammarPracticeScreen"),
  btnGrammarPracticeBack: $("btnGrammarPracticeBack"),
  gpHint: $("gpHint"),
  gpQ: $("gpQ"),
  gpOpts: $("gpOpts"),
  gpResult: $("gpResult"),
  btnGpNext: $("btnGpNext"),
  btnGpSubmit: $("btnGpSubmit"),
  gpProgressFill: $("gpProgressFill"),
  gpDone: $("gpDone"),
  gpTotal: $("gpTotal"),
  gpOk: $("gpOk"),
  gpNg: $("gpNg"),

  // Settings header
  settingsTitle: $("settingsTitle"),
  btnBackToModules: $("btnBackToModules"),

  // Per-module settings sections
  settingsKana: $("settingsKana"),
  settingsWord: $("settingsWord"),
  settingsKanji: $("settingsKanji"),
  settingsN2: $("settingsN2"),

  // Quiz elements
  q: $("q"),
  meaning: $("meaning"),
  opts: $("opts"),
  inputWrap: $("inputWrap"),
  inp: $("inp"),
  result: $("result"),

  // Mode checks per module
  modeChecksKana: $("modeChecksKana"),
  modeChecksWord: $("modeChecksWord"),
  modeChecksKanji: $("modeChecksKanji"),
  modeChecks: $("modeChecks"),

  // N2 category checks
  n2CatChecks: $("n2CatChecks"),
  jlptLevelChecks: $("jlptLevelChecks"),
  jlptModeChecks: $("jlptModeChecks"),
  btnResetJlptProgress: $("btnResetJlptProgress"),

  // Kana-specific
  kanaSetChecks: $("kanaSetChecks"),

  // Common settings
  kanaMode: $("kanaMode"),
  sessionSize: $("sessionSize"),
  hideMeaning: $("hideMeaning"),
  wrongFirst: $("wrongFirst"),

  // Buttons
  btnNew: $("btnNew"),
  btnSpeak: $("btnSpeak"),
  btnCheck: $("btnCheck"),
  btnShow: $("btnShow"),
  btnStartSession: $("btnStartSession"),
  btnBack: $("btnBack"),
  btnResetSettings: $("btnResetSettings"),
  btnResetDay: $("btnResetDay"),
  btnRefreshApp: $("btnRefreshApp"),
  btnResetAllStats: $("btnResetAllStats"),

  // Stats - Quiz screen
  s_done: $("s_done"),
  s_size: $("s_size"),
  s_ok: $("s_ok"),
  s_ng: $("s_ng"),
  streak: $("streak"),
  progressFill: $("progressFill"),
  timer: $("timer"),
  s_acc_display: $("s_acc_display"),

  // Stats - Module screen
  d_total_start: $("d_total_start"),
  d_ok_start: $("d_ok_start"),
  d_ng_start: $("d_ng_start"),
  d_rounds_start: $("d_rounds_start"),

  // Stats - Quiz screen round
  s_round: $("s_round"),

  // Hidden stats (for compatibility)
  d_total: $("d_total"),
  d_ok: $("d_ok"),
  d_ng: $("d_ng"),
  d_acc: $("d_acc"),
  s_acc: $("s_acc"),
  tips: $("tips"),
};

let settings = loadSettings();
let stats = loadStats();
let db = { kana: [], words: [], wordRelations: [], kanji: [], n2Questions: [], jlptBanks: {}, meanings: {} };
let current = null;
let answered = false;
let currentModule = settings.module || "kana";

// N2 session tracking: avoid repeating questions
let n2AnsweredIds = new Set();

// Timer
let timerInterval = null;
let sessionStartTime = null;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function startTimer() {
  sessionStartTime = Date.now();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    ui.timer.textContent = formatTime(elapsed);
  }, 1000);
  ui.timer.textContent = "0:00";
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function getChecked(container) {
  return [...container.querySelectorAll('input[type="checkbox"]:checked')].map(x => x.value);
}

function setChecked(container, values) {
  const set = new Set(values);
  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = set.has(cb.value);
  });
}

function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// Module title i18n keys
const MODULE_TITLE_KEYS = {
  kana: "mod_kana",
  word: "mod_word",
  kanji: "mod_kanji",
  n2: "mod_n2",
};

// N2 category hint i18n keys
const N2_CAT_HINT = {
  kanji_reading: "n2_q_reading",
  orthography: "n2_q_ortho",
  context_vocab: "n2_q_context",
  paraphrase: "n2_q_para",
  usage: "n2_q_usage",
  grammar: "n2_q_grammar",
};

// N2 category display name i18n keys
const N2_CAT_NAME_KEYS = {
  kanji_reading: "n2_kanji_reading",
  orthography: "n2_orthography",
  context_vocab: "n2_context_vocab",
  paraphrase: "n2_paraphrase",
  usage: "n2_usage",
  grammar: "n2_grammar",
};

const JLPT_CAT_ORDER = ["kanji_reading", "orthography", "context_vocab", "paraphrase", "usage", "grammar"];
const WORD_RELATION_MODES = ["word_synonym", "word_near", "word_antonym"];

function isWordRelationMode(mode) {
  return WORD_RELATION_MODES.includes(mode);
}

// Build readable sentence for N2 question.
// mode="speak": censor the blank with "B" beep so speaking doesn't leak the answer.
//               Only inserts "B" when the sentence actually has a blank marker.
// mode="full":  fill in the correct answer (used in post-answer display).
function n2ReadableSentence(nq, mode = "speak") {
  if (!nq) return "";
  if (nq.cat === "usage") {
    return mode === "full" ? (nq.options[nq.answer] || "") : "";
  }
  let s = nq.sentence || "";
  const correct = nq.options[nq.answer] || "";
  const blankRe = /[（(][\s　_＿]+[)）]|＿+|_{2,}/g;
  const hasBlank = blankRe.test(s);
  blankRe.lastIndex = 0;
  if (hasBlank) {
    // Blank sentence: replace with B (speak) or correct answer (full)
    const filler = mode === "full" ? correct : "B";
    s = s.replace(blankRe, filler);
  } else if (mode === "full" && nq.cat === "orthography" && nq.target && correct) {
    // Orthography: hiragana target -> kanji only in full mode.
    // In speak mode leave as-is so the reading comes out naturally.
    s = s.replace(nq.target, correct);
  }
  return s;
}

function pickN2Field(nq, key) {
  if (!nq) return "";
  const lang = getLang().replace("-", "_");
  return nq[`${key}_${lang}`] || nq[key] || "";
}

function n2OriginalText(nq, correctText = "") {
  if (!nq) return "";
  if (nq.sentence) return nq.sentence;
  if (nq.cat === "usage") return correctText || nq.options?.[nq.answer] || "";
  return "";
}

function buildN2DetailsHTML(nq, correctText, prefixKey = "result_answer") {
  const original = n2OriginalText(nq, correctText);
  const translation = pickN2Field(nq, "translation");
  const explanation = pickN2Field(nq, "explanation");
  const tl = translation
    ? `<div class="n2-translation">${original ? `${t("n2_original")}${original}<br>` : ""}${t("n2_translation")}${translation}</div>`
    : "";
  const expl = explanation ? `<div class="n2-expl">${explanation}</div>` : "";
  return `${t(prefixKey)}<b>${correctText}</b>${tl}${expl}`;
}

// Get meaning for an item based on current language
function getMeaning(item) {
  if (!item.meaning) return "";
  const lang = getLang();
  if (lang === "zh-CN") return item.meaning;
  const inline = item[`meaning_${lang.replace("-", "_")}`];
  if (inline) return inline;
  const map = db.meanings[lang];
  if (map && map[item.rm]) return map[item.rm];
  return item.meaning;
}

// ==================== Module Selection ====================

function selectModule(mod) {
  // Grammar is a browse-only module, not a quiz
  if (mod === "grammar") {
    showScreen(ui.grammarScreen);
    return;
  }

  currentModule = mod;
  settings.module = mod;
  saveSettings(settings);

  // Update title
  ui.settingsTitle.setAttribute("data-i18n", MODULE_TITLE_KEYS[mod]);
  ui.settingsTitle.textContent = t(MODULE_TITLE_KEYS[mod]);

  // Show/hide per-module settings
  ui.settingsKana.classList.toggle("hide", mod !== "kana");
  ui.settingsWord.classList.toggle("hide", mod !== "word");
  ui.settingsKanji.classList.toggle("hide", mod !== "kanji");
  ui.settingsN2.classList.toggle("hide", mod !== "n2");

  applySettingsToUI();
  showScreen(ui.settingsScreen);
}

function applySettingsToUI() {
  setChecked(ui.modeChecksKana, settings.modesKana);
  setChecked(ui.modeChecksWord, settings.modesWord);
  setChecked(ui.modeChecksKanji, settings.modesKanji);
  setChecked(ui.n2CatChecks, settings.n2Cats);
  setChecked(ui.kanaSetChecks, settings.kanaSets);
  // Set JLPT level radio
  const lvl = settings.jlptLevel || "n2";
  ui.jlptLevelChecks.querySelectorAll('input[type="radio"]').forEach(r => {
    r.checked = (r.value === lvl);
  });
  const mode = settings.jlptMode || "quiz";
  ui.jlptModeChecks?.querySelectorAll('input[type="radio"]').forEach(r => {
    r.checked = (r.value === mode);
  });
  ui.kanaMode.value = settings.kanaMode || "hira";
  ui.sessionSize.value = settings.sessionSize ?? 20;
  ui.hideMeaning.checked = settings.hideMeaning || false;
  ui.wrongFirst.checked = settings.wrongFirst || false;
}

function readSettingsFromUIAndSave() {
  settings.modesKana = getChecked(ui.modeChecksKana);
  settings.modesWord = getChecked(ui.modeChecksWord);
  settings.modesKanji = getChecked(ui.modeChecksKanji);
  settings.n2Cats = getChecked(ui.n2CatChecks);
  // Read JLPT level
  const selectedLevel = ui.jlptLevelChecks.querySelector('input[type="radio"]:checked');
  settings.jlptLevel = selectedLevel ? selectedLevel.value : (settings.jlptLevel || "n2");
  const selectedJlptMode = ui.jlptModeChecks?.querySelector('input[type="radio"]:checked');
  settings.jlptMode = selectedJlptMode ? selectedJlptMode.value : (settings.jlptMode || "quiz");

  const sets = getChecked(ui.kanaSetChecks);
  settings.kanaSets = sets.length ? sets : ["seion"];
  if (!sets.length) setChecked(ui.kanaSetChecks, settings.kanaSets);

  settings.kanaMode = ui.kanaMode.value;
  settings.sessionSize = clampInt(ui.sessionSize.value, 5, 200, 20);
  ui.sessionSize.value = settings.sessionSize;
  settings.hideMeaning = ui.hideMeaning.checked;
  settings.wrongFirst = ui.wrongFirst.checked;

  // Set content and modes based on current module
  settings.module = currentModule;
  settings.content = [currentModule];
  switch (currentModule) {
    case "kana":
      settings.modes = settings.modesKana.length ? settings.modesKana : ["rm_mc", "jp_mc"];
      break;
    case "word":
      settings.modes = settings.modesWord.length ? settings.modesWord : ["rm_mc", "jp_mc"];
      break;
    case "kanji":
      settings.modes = settings.modesKanji.length ? settings.modesKanji : ["kanji_read", "read_kanji"];
      break;
    case "n2":
      settings.modes = ["n2_exam"];
      break;
  }

  saveSettings(settings);
}

function getKana(item) {
  return (settings.kanaMode === "kata") ? (item.kata || item.hira) : item.hira;
}

function updateDashboard() {
  if (ui.d_total_start) ui.d_total_start.textContent = stats.daily.total;
  if (ui.d_ok_start) ui.d_ok_start.textContent = stats.daily.ok;
  if (ui.d_ng_start) ui.d_ng_start.textContent = stats.daily.ng;
  if (ui.d_rounds_start) ui.d_rounds_start.textContent = stats.daily.rounds || 0;

  if (ui.s_round) ui.s_round.textContent = `${t("round_prefix")}${stats.session.round || 1}${t("round_suffix")}`;

  ui.s_done.textContent = stats.session.done;
  ui.s_size.textContent = stats.session.size;
  ui.s_ok.textContent = stats.session.ok;
  ui.s_ng.textContent = stats.session.ng;
  ui.streak.textContent = stats.daily.streak;

  ui.s_acc_display.textContent = pct(stats.session.ok, stats.session.done);

  const progress = stats.session.size > 0 ? (stats.session.done / stats.session.size) * 100 : 0;
  ui.progressFill.style.width = `${progress}%`;

  if (ui.d_total) ui.d_total.textContent = stats.daily.total;
  if (ui.d_ok) ui.d_ok.textContent = stats.daily.ok;
  if (ui.d_ng) ui.d_ng.textContent = stats.daily.ng;
  if (ui.d_acc) ui.d_acc.textContent = pct(stats.daily.ok, stats.daily.total);
  if (ui.s_acc) ui.s_acc.textContent = pct(stats.session.ok, stats.session.done);
}

function showScreen(screen) {
  ui.moduleScreen.classList.add("hide");
  ui.settingsScreen.classList.add("hide");
  ui.quizScreen.classList.add("hide");
  if (ui.grammarScreen) ui.grammarScreen.classList.add("hide");
  if (ui.grammarTopicScreen) ui.grammarTopicScreen.classList.add("hide");
  if (ui.grammarPracticeScreen) ui.grammarPracticeScreen.classList.add("hide");
  screen.classList.remove("hide");
}

// ==================== Grammar Module ====================

let grammarTopics = [];
let currentGrammarTopic = null;
let gpState = null;

// Pick a localized field on an object: obj.key_<lang> (zh_TW/ja/en) else obj.key.
function pickLocField(obj, key) {
  if (!obj) return "";
  const lang = getLang().replace("-", "_");
  return obj[`${key}_${lang}`] ?? obj[key] ?? "";
}

function renderGrammarTopics() {
  if (!ui.grammarTopics) return;
  ui.grammarTopics.innerHTML = "";
  grammarTopics.forEach((topic) => {
    const card = document.createElement("div");
    card.className = "grammar-topic-card";
    card.innerHTML = `
      <div class="grammar-topic-icon">${topic.emoji || "📘"}</div>
      <div class="grammar-topic-info">
        <div class="grammar-topic-title">${pickLocField(topic, "title")}</div>
        <div class="grammar-topic-sub">${pickLocField(topic, "subtitle")}</div>
      </div>
      <div class="grammar-topic-arrow">›</div>
    `;
    card.onclick = () => openGrammarTopic(topic);
    ui.grammarTopics.appendChild(card);
  });
}

function openGrammarTopic(topic) {
  currentGrammarTopic = topic;
  ui.grammarTopicTitle.textContent = pickLocField(topic, "title");
  // Show practice button only if topic has practice data
  if (ui.btnGrammarPractice) {
    ui.btnGrammarPractice.classList.toggle("hide", !topic.practice);
  }
  ui.grammarContent.innerHTML = "";
  const lang = getLang().replace("-", "_");
  (topic.sections || []).forEach((sec) => {
    const el = document.createElement("div");
    switch (sec.type) {
      case "intro":
        el.className = "g-intro";
        el.innerHTML = pickLocField(sec, "text");
        break;
      case "heading":
        el.className = "g-heading";
        el.innerHTML = pickLocField(sec, "text");
        break;
      case "rule":
        el.className = "g-rule";
        el.innerHTML = pickLocField(sec, "text");
        if (sec.color) el.style.borderLeftColor = sec.color;
        break;
      case "note":
        el.className = "g-note";
        el.innerHTML = pickLocField(sec, "text");
        break;
      case "verb_list":
        el.className = "g-verb-list";
        (sec.items || []).forEach((v) => {
          const item = document.createElement("div");
          item.className = "g-verb";
          item.innerHTML = `
            <span class="jp">${v.jp}</span>
            <span class="rm">${v.rm || ""}</span>
            <span class="cn">${pickLocField(v, "cn")}</span>
          `;
          item.onclick = () => speakJP(v.jp.replace(/[（(].*?[)）]/g, ""));
          el.appendChild(item);
        });
        break;
      case "steps":
        el.className = "g-steps";
        const stepsItems = sec[`items_${lang}`] || sec.items || [];
        stepsItems.forEach((s) => {
          const p = document.createElement("div");
          p.className = "step";
          p.innerHTML = s;
          el.appendChild(p);
        });
        break;
      default:
        return;
    }
    ui.grammarContent.appendChild(el);
  });
  showScreen(ui.grammarTopicScreen);
}

function shuffleArr(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startGrammarPractice() {
  if (!currentGrammarTopic || !currentGrammarTopic.practice) return;
  const p = currentGrammarTopic.practice;
  // Shuffle items; for scenario type also shuffle option order inside each item
  const rawItems = shuffleArr(p.items || []);
  let items = rawItems;
  if (p.type === "scenario") {
    items = rawItems.map((it) => {
      const opts = it.options || [];
      const order = shuffleArr(opts.map((_, i) => i));
      const newOpts = order.map((i) => opts[i]);
      const newAnswer = order.indexOf(it.answer);
      return { ...it, options: newOpts, answer: newAnswer };
    });
  }
  gpState = {
    practice: p,
    items,
    idx: 0,
    ok: 0,
    ng: 0,
    answered: false,
  };
  ui.gpTotal.textContent = gpState.items.length;
  ui.gpOk.textContent = 0;
  ui.gpNg.textContent = 0;
  ui.gpDone.textContent = 0;
  ui.gpProgressFill.style.width = "0%";
  showScreen(ui.grammarPracticeScreen);
  renderGpQuestion();
}

function renderGpQuestion() {
  const { practice: p, items, idx } = gpState;
  if (idx >= items.length) {
    // Summary
    const total = items.length;
    const rate = total ? Math.round((gpState.ok / total) * 100) : 0;
    const emoji = rate >= 90 ? "🏆" : rate >= 70 ? "🎉" : rate >= 50 ? "👍" : "💪";
    ui.gpHint.textContent = "";
    ui.gpQ.textContent = "";
    ui.gpOpts.innerHTML = "";
    ui.gpResult.innerHTML = `<div class="gp-summary"><div style="font-size:2.6rem;margin-bottom:6px">${emoji}</div><div class="big">${rate}%</div><div class="sub">${t("gp_summary_sub", total, gpState.ok, gpState.ng)}</div></div>`;
    ui.btnGpNext.textContent = t("gp_again");
    return;
  }
  const item = items[idx];
  const lang = getLang();
  // Prefer language-specific hint: p.hint_en / hint_zh_TW / hint_ja else p.hint
  const hintLocalized = p[`hint_${lang.replace("-","_")}`] || p.hint || p.question || "";
  ui.gpHint.textContent = hintLocalized;
  ui.gpResult.innerHTML = "";
  ui.btnGpNext.textContent = t("btn_next");
  ui.gpOpts.innerHTML = "";
  gpState.answered = false;
  gpState.selected = -1;

  // Reset action buttons: show Submit (disabled until selection), hide Next
  if (ui.btnGpSubmit) {
    ui.btnGpSubmit.classList.remove("hide");
    ui.btnGpSubmit.disabled = true;
    ui.btnGpSubmit.classList.remove("primary");
    ui.btnGpSubmit.textContent = t("gp_submit");
  }
  if (ui.btnGpNext) ui.btnGpNext.classList.add("hide");

  if (p.type === "scenario") {
    // Prefer localized scene, fall back to original zh-CN
    const sceneLocal = item[`scene_${lang.replace("-","_")}`] || item.scene;
    ui.gpQ.textContent = sceneLocal;
    (item.options || []).forEach((opt, i) => {
      const row = document.createElement("div");
      row.className = "gp-opt gp-opt-row";
      row.innerHTML = `
        <button class="gp-speak" type="button" aria-label="朗读">🔊</button>
        <span class="gp-opt-text">${opt.jp}</span>
      `;
      row.querySelector(".gp-speak").onclick = (e) => {
        e.stopPropagation();
        speakJP(opt.jp.replace(/[（(].*?[)）]/g, ""));
      };
      // Tap anywhere else on the row: select + preview audio (not submit)
      row.onclick = () => selectGpOption(i);
      ui.gpOpts.appendChild(row);
    });
  } else {
    // Classic classify type: show verb, pick group label
    ui.gpQ.textContent = item.q;
    (p.labels || []).forEach((label, i) => {
      const div = document.createElement("div");
      div.className = "gp-opt";
      div.textContent = label;
      div.onclick = () => selectGpOption(i);
      ui.gpOpts.appendChild(div);
    });
    // Auto-read the verb
    setTimeout(() => speakJP(item.q.replace(/[（(].*?[)）]/g, "")), 300);
  }
}

// Tap an option to highlight it + preview audio. Does NOT lock the answer.
function selectGpOption(idx) {
  if (!gpState || gpState.answered) return;
  gpState.selected = idx;
  const nodes = ui.gpOpts.querySelectorAll(".gp-opt");
  nodes.forEach((n, i) => n.classList.toggle("selected", i === idx));
  // Play audio for scenario type only (classify type already auto-reads the verb)
  const p = gpState.practice;
  if (p.type === "scenario") {
    const item = gpState.items[gpState.idx];
    const opt = item.options[idx];
    if (opt && opt.jp) speakJP(opt.jp.replace(/[（(].*?[)）]/g, ""));
  }
  // Enable submit
  if (ui.btnGpSubmit) {
    ui.btnGpSubmit.disabled = false;
    ui.btnGpSubmit.classList.add("primary");
  }
}

function submitGpAnswer() {
  if (!gpState || gpState.answered) return;
  if (gpState.selected < 0) return;
  answerGp(gpState.selected);
  // Switch action buttons: hide Submit, show Next
  if (ui.btnGpSubmit) ui.btnGpSubmit.classList.add("hide");
  if (ui.btnGpNext) ui.btnGpNext.classList.remove("hide");
}

function answerGp(idx, el) {
  if (gpState.answered) return;
  gpState.answered = true;
  const p = gpState.practice;
  const item = gpState.items[gpState.idx];
  const ok = idx === item.answer || idx === item.a; // support both new and old format
  const correctIdx = item.answer !== undefined ? item.answer : item.a;
  if (ok) { gpState.ok++; playCorrect(); } else { gpState.ng++; playWrong(); }

  // Mark options
  const nodes = ui.gpOpts.querySelectorAll(".gp-opt");
  nodes.forEach((n, i) => {
    n.setAttribute("disabled", "true");
    if (i === correctIdx) n.classList.add("correct");
    else if (i === idx) n.classList.add("wrong");
  });

  // Build feedback
  const lang2 = getLang();
  const pickLang = (obj, key) =>
    (obj && (obj[`${key}_${lang2.replace("-","_")}`] || obj[key])) || "";

  if (p.type === "scenario") {
    const correctOpt = item.options[correctIdx];
    const labelsArr = p[`labels_${lang2.replace("-","_")}`] || p.labels || [];
    const groupLabel = (labelsArr && correctOpt.g !== undefined) ? labelsArr[correctOpt.g] : "";
    const noteText = pickLang(item, "note");
    const usageText = pickLang(item, "usage");
    const note = noteText ? `<div class="gp-note">⚠️ ${noteText}</div>` : "";
    const usage = usageText ? `<div class="gp-usage">💡 ${usageText}</div>` : "";
    // Speak correct verb after answer
    setTimeout(() => speakJP(correctOpt.jp.replace(/[（(].*?[)）]/g, "")), 300);
    const head = ok
      ? `✅ ${t("gp_right")}<b>${correctOpt.jp}</b> · <span class="gp-tag">${groupLabel}</span>`
      : `❌ ${t("gp_answer")}<b>${correctOpt.jp}</b> · <span class="gp-tag">${groupLabel}</span>`;
    ui.gpResult.innerHTML = head + note + usage;
  } else {
    const correctLabel = p.labels[correctIdx];
    const cn = pickLang(item, "cn");
    ui.gpResult.innerHTML = ok
      ? `✅ ${t("gp_right")}<b>${item.q}</b> → <b>${correctLabel}</b>${cn ? `（${cn}）` : ""}`
      : `❌ ${t("gp_wrong")}<b>${item.q}</b> → <b>${correctLabel}</b>${cn ? `（${cn}）` : ""}`;
  }

  ui.gpOk.textContent = gpState.ok;
  ui.gpNg.textContent = gpState.ng;
  ui.gpDone.textContent = gpState.idx + 1;
  const prog = ((gpState.idx + 1) / gpState.items.length) * 100;
  ui.gpProgressFill.style.width = prog + "%";
}

function nextGp() {
  if (!gpState) return;
  if (!gpState.answered && gpState.idx < gpState.items.length) {
    // Require answering first
    ui.gpResult.textContent = t("please_answer");
    return;
  }
  if (gpState.idx >= gpState.items.length) {
    // Restart
    startGrammarPractice();
    return;
  }
  gpState.idx++;
  renderGpQuestion();
}

function setUIForMode(mode) {
  if (mode === "n2_exam") {
    ui.inputWrap.classList.add("hide");
    ui.opts.classList.remove("hide");
    return;
  }
  const isInput = (mode === "rm_in" || mode === "jp_in");
  const isChoice = !isInput;
  ui.inputWrap.classList.toggle("hide", !isInput);
  ui.opts.classList.toggle("hide", !isChoice);

  if (isInput) {
    ui.inp.value = "";
    ui.inp.placeholder = (mode === "rm_in")
      ? t("input_kana")
      : t("input_romaji");
    setTimeout(() => ui.inp.focus?.(), 0);
  }
}

// ==================== N2 Exam Question ====================

function getSelectedN2Cats() {
  const selected = settings.n2Cats?.length ? settings.n2Cats : ["kanji_reading", "orthography", "context_vocab", "grammar"];
  return JLPT_CAT_ORDER.filter((cat) => selected.includes(cat));
}

function makeJlptProgressKey(level, cats) {
  return `${level}:${cats.join(",")}`;
}

function makeJlptProgressOrderKey(level, cats, total) {
  return `${makeJlptProgressKey(level, cats)}:${total}`;
}

function shuffledIndexOrder(total) {
  const order = Array.from({ length: total }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function getProgressiveJlptOrder(level, cats, total) {
  settings.jlptProgressOrders ||= {};
  const key = makeJlptProgressOrderKey(level, cats, total);
  let order = settings.jlptProgressOrders[key];
  const valid = Array.isArray(order)
    && order.length === total
    && order.every((v) => Number.isInteger(v) && v >= 0 && v < total)
    && new Set(order).size === total;

  if (!valid) {
    order = shuffledIndexOrder(total);
    settings.jlptProgressOrders[key] = order;
    saveSettings(settings);
  }
  return order;
}

function getOrderedJlptPool(level, cats) {
  const bank = db.jlptBanks[level] || db.n2Questions || [];
  const catSet = new Set(cats);
  const catRank = new Map(JLPT_CAT_ORDER.map((cat, i) => [cat, i]));
  return bank
    .filter(q => catSet.has(q.cat))
    .slice()
    .sort((a, b) => {
      const ca = catRank.get(a.cat) ?? 999;
      const cb = catRank.get(b.cat) ?? 999;
      if (ca !== cb) return ca - cb;
      return (+a.id || 0) - (+b.id || 0);
    });
}

function pickProgressiveN2Question() {
  const level = settings.jlptLevel || "n2";
  const cats = getSelectedN2Cats();
  const pool = getOrderedJlptPool(level, cats);
  if (!pool.length) return null;

  settings.jlptProgress ||= {};
  const key = makeJlptProgressKey(level, cats);
  const orderKey = makeJlptProgressOrderKey(level, cats, pool.length);
  const order = getProgressiveJlptOrder(level, cats, pool.length);
  let idx = Number(settings.jlptProgress[key] || 0);
  if (!Number.isFinite(idx) || idx < 0 || idx >= order.length) idx = 0;

  const poolIndex = order[idx] ?? idx;
  const q = shuffleN2Question(pool[poolIndex]);
  q._progress = {
    key,
    orderKey,
    index: idx,
    total: pool.length,
    nextIndex: (idx + 1) % order.length,
  };
  return q;
}

function advanceProgressiveN2Question(nq) {
  if (!nq?._progress) return;
  settings.jlptProgress ||= {};
  settings.jlptProgress[nq._progress.key] = nq._progress.nextIndex;
  if (nq._progress.nextIndex === 0 && nq._progress.orderKey) {
    settings.jlptProgressOrders ||= {};
    delete settings.jlptProgressOrders[nq._progress.orderKey];
  }
  saveSettings(settings);
}

function pickN2Question() {
  const cats = new Set(getSelectedN2Cats());
  const level = settings.jlptLevel || "n2";
  const bank = db.jlptBanks[level] || db.n2Questions || [];
  const pool = bank.filter(q => cats.has(q.cat) && !n2AnsweredIds.has(`${level}_${q.id}`));

  // If all questions answered, reset
  if (!pool.length) {
    n2AnsweredIds.clear();
    const resetPool = bank.filter(q => cats.has(q.cat));
    if (!resetPool.length) return null;
    return shuffleN2Question(resetPool[Math.floor(Math.random() * resetPool.length)]);
  }

  return shuffleN2Question(pool[Math.floor(Math.random() * pool.length)]);
}

// Most JLPT banks were generated with answer=0. Shuffle options at pick time
// so the correct slot is randomized; remap answer index accordingly.
function shuffleN2Question(q) {
  if (!q || !Array.isArray(q.options) || typeof q.answer !== "number") return q;
  const idxs = q.options.map((_, i) => i);
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
  }
  return { ...q, options: idxs.map(i => q.options[i]), answer: idxs.indexOf(q.answer) };
}

function renderN2Question() {
  const nq = current.n2Q;
  const isStudy = current.mode === "n2_study" || current.mode === "n2_progressive";
  const isProgressive = current.mode === "n2_progressive";
  ui.meaning.textContent = "";
  ui.meaning.onclick = null;
  ui.result.textContent = "";

  // Category tag
  const catName = t(N2_CAT_NAME_KEYS[nq.cat] || "n2_context_vocab") || nq.cat;
  const hint = t(N2_CAT_HINT[nq.cat] || "n2_q_context");

  // Build question HTML with robust target underlining
  let sentenceHtml = nq.sentence || "";
  if (nq.target && sentenceHtml) {
    if (sentenceHtml.includes(nq.target)) {
      sentenceHtml = sentenceHtml.replace(
        nq.target,
        `<span class="n2-target">${nq.target}</span>`
      );
    } else {
      // Fallback: target may be dictionary form (eg 備える) but sentence has
      // an inflected form (eg 備えて). Match the kanji stem + trailing kana.
      const kanjiMatch = nq.target.match(/^([一-鿿]+)/);
      if (kanjiMatch) {
        const stem = kanjiMatch[1];
        const re = new RegExp(stem + "[぀-ゟ゠-ヿ]*");
        const m = sentenceHtml.match(re);
        if (m) {
          sentenceHtml = sentenceHtml.replace(
            m[0],
            `<span class="n2-target">${m[0]}</span>`
          );
        }
      }
    }
  }

  const progressBadge = isProgressive && nq._progress
    ? `<div class="n2-progress-badge">${t("jlpt_progress_badge", nq._progress.index + 1, nq._progress.total)}</div>`
    : "";
  ui.q.innerHTML = `<span class="n2-cat-tag">${catName}</span>${progressBadge}<div class="n2-hint">${hint}</div><div class="n2-sentence">${sentenceHtml}</div>`;

  // Build options
  const isUsage = nq.cat === "usage";
  ui.opts.innerHTML = "";
  nq.options.forEach((opt, idx) => {
    const div = document.createElement("div");
    div.className = isUsage ? "opt opt-sentence" : "opt";
    if (isStudy) {
      div.classList.add(idx === nq.answer ? "correct" : "disabled");
    }
    div.innerHTML = isUsage
      ? `<div class="jp">${opt}</div>`
      : `<div class="jp">${idx + 1}. ${opt}</div>`;
    // Capture nq in closure to avoid current.n2Q drift
    div.onclick = isStudy ? null : () => answerN2Choice(idx, nq);
    ui.opts.appendChild(div);
  });

  if (isStudy) {
    const correctText = nq.options[nq.answer];
    ui.result.innerHTML = `📘 ${buildN2DetailsHTML(nq, correctText, "jlpt_study_answer")}`;
  }

  setUIForMode("n2_exam");
}

function answerN2Choice(idx, boundNq) {
  if (answered) return;
  answered = true;

  // Prefer the nq captured at render time (defensive: avoid current.n2Q drift)
  const nq = boundNq || current.n2Q;
  const ok = idx === nq.answer;
  const correctText = nq.options[nq.answer];

  n2AnsweredIds.add(`${settings.jlptLevel || "n2"}_${nq.id}`);

  if (ok) playCorrect();
  else playWrong();

  // After answering, choose what to speak based on category.
  // - kanji_reading:  speak the target word (TTS reads it with its correct pronunciation)
  // - orthography:    speak the correct kanji answer (the word being written)
  // - others:         speak the full sentence with blanks filled in
  setTimeout(() => {
    let say = n2ReadableSentence(nq, "full");
    if (nq.cat === "kanji_reading" && nq.target) say = nq.target;
    else if (nq.cat === "orthography") say = correctText;
    speakJP(say);
  }, 300);

  if (ok) {
    ui.result.innerHTML = `✅ ${buildN2DetailsHTML(nq, correctText, "result_correct")}`;
  } else {
    ui.result.innerHTML = `❌ ${buildN2DetailsHTML(nq, correctText, "result_wrong")}`;
  }

  // Record stats
  const fakeCorrect = { type: "n2", rm: `n2_${nq.id}`, hira: `n2_${nq.id}` };
  const r = recordResult(stats, { correct: fakeCorrect }, ok);
  saveStats(stats);
  updateDashboard();

  if (r.finished) {
    stopTimer();
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    setTimeout(() => showSessionSummary(elapsed), 1200);
  }
}

// ==================== Standard Question Rendering ====================

function renderQuestion() {
  if (!current) {
    ui.q.textContent = t("ready");
    return;
  }

  // N2 exam mode
  if (current.mode === "n2_exam" || current.mode === "n2_study" || current.mode === "n2_progressive") {
    renderN2Question();
    return;
  }

  const it = current.correct;
  const kana = getKana(it);
  const meaning = getMeaning(it);
  const sourceMeaning = current.source ? getMeaning(current.source) : "";

  const shouldHide = ui.hideMeaning.checked;
  if (isWordRelationMode(current.mode)) {
    if (sourceMeaning) {
      if (shouldHide) {
        ui.meaning.textContent = t("meaning_hidden");
        ui.meaning.style.cursor = "pointer";
        ui.meaning.onclick = () => {
          ui.meaning.textContent = `${t("meaning_label")}${sourceMeaning}`;
          ui.meaning.style.cursor = "default";
          ui.meaning.onclick = null;
        };
      } else {
        ui.meaning.textContent = `${t("meaning_label")}${sourceMeaning}`;
        ui.meaning.style.cursor = "default";
        ui.meaning.onclick = null;
      }
    } else {
      ui.meaning.textContent = "";
      ui.meaning.onclick = null;
    }
  } else if (current.mode === "rm_mean" || current.mode === "kanji_mean") {
    ui.meaning.textContent = "";
    ui.meaning.onclick = null;
  } else if (current.mode === "mean_rm") {
    ui.meaning.textContent = "";
    ui.meaning.onclick = null;
  } else if (current.mode === "kanji_read" || current.mode === "read_kanji") {
    if (meaning) {
      if (shouldHide) {
        ui.meaning.textContent = t("meaning_hidden");
        ui.meaning.style.cursor = "pointer";
        ui.meaning.onclick = () => {
          ui.meaning.textContent = `${t("meaning_label")}${meaning}`;
          ui.meaning.style.cursor = "default";
          ui.meaning.onclick = null;
        };
      } else {
        ui.meaning.textContent = `${t("meaning_label")}${meaning}`;
        ui.meaning.style.cursor = "default";
        ui.meaning.onclick = null;
      }
    } else {
      ui.meaning.textContent = "";
      ui.meaning.onclick = null;
    }
  } else if (it.type === "word" && meaning) {
    if (shouldHide) {
      ui.meaning.textContent = t("meaning_hidden");
      ui.meaning.style.cursor = "pointer";
      ui.meaning.onclick = () => {
        ui.meaning.textContent = `${t("meaning_label")}${meaning}`;
        ui.meaning.style.cursor = "default";
        ui.meaning.onclick = null;
      };
    } else {
      ui.meaning.textContent = `${t("meaning_label")}${meaning}`;
      ui.meaning.style.cursor = "default";
      ui.meaning.onclick = null;
    }
  } else {
    ui.meaning.textContent = "";
    ui.meaning.onclick = null;
  }
  ui.result.textContent = "";

  if (isWordRelationMode(current.mode)) {
    const srcKana = getKana(current.source);
    ui.q.innerHTML = `<span class="big">${srcKana}</span>${t(`q_${current.mode}`)}`;
  } else if (current.mode === "rm_mean") {
    ui.q.innerHTML = `<span class="big">${kana}</span>${t("q_what_meaning")}`;
  } else if (current.mode === "mean_rm") {
    ui.q.innerHTML = `${t("q_how_read_meaning_pre")}${meaning}${t("q_how_read_meaning")}`;
  } else if (current.mode === "kanji_read") {
    ui.q.innerHTML = `<span class="big">${it.kanji}</span>${t("q_how_read")}`;
  } else if (current.mode === "read_kanji") {
    ui.q.innerHTML = `<span class="big">${kana}</span>${t("q_kanji_of")}`;
  } else if (current.mode === "kanji_mean") {
    ui.q.innerHTML = `<span class="big">${it.kanji}</span>${t("q_what_meaning")}`;
  } else if (current.mode === "rm_mc" || current.mode === "rm_in") {
    ui.q.innerHTML = `<b>${it.rm}</b>${it.type === "word" ? t("q_writing_of") : t("q_kana_of")}`;
  } else {
    ui.q.innerHTML = `<span class="big">${kana}</span>${t("q_how_read")}`;
  }

  if (isWordRelationMode(current.mode)) {
    ui.opts.innerHTML = "";
    current.choices.forEach((c, idx) => {
      const div = document.createElement("div");
      div.className = "opt";
      div.innerHTML = `<div class="jp">${getKana(c)}</div><div class="meaning-opt">${getMeaning(c)}</div>`;
      div.onclick = () => answerChoice(idx);
      ui.opts.appendChild(div);
    });
  } else if (current.mode === "rm_mean") {
    ui.opts.innerHTML = "";
    current.choices.forEach((c, idx) => {
      const div = document.createElement("div");
      div.className = "opt";
      div.innerHTML = `<div class="meaning-opt">${getMeaning(c)}</div>`;
      div.onclick = () => answerChoice(idx);
      ui.opts.appendChild(div);
    });
  } else if (current.mode === "mean_rm") {
    ui.opts.innerHTML = "";
    current.choices.forEach((c, idx) => {
      const div = document.createElement("div");
      div.className = "opt";
      div.innerHTML = `<div class="jp">${getKana(c)}</div>`;
      div.onclick = () => answerChoice(idx);
      ui.opts.appendChild(div);
    });
  } else if (current.mode === "kanji_read") {
    ui.opts.innerHTML = "";
    current.choices.forEach((c, idx) => {
      const div = document.createElement("div");
      div.className = "opt";
      div.innerHTML = `<div class="jp">${getKana(c)}</div>`;
      div.onclick = () => answerChoice(idx);
      ui.opts.appendChild(div);
    });
  } else if (current.mode === "read_kanji") {
    ui.opts.innerHTML = "";
    current.choices.forEach((c, idx) => {
      const div = document.createElement("div");
      div.className = "opt";
      div.innerHTML = `<div class="jp">${c.kanji}</div>`;
      div.onclick = () => answerChoice(idx);
      ui.opts.appendChild(div);
    });
  } else if (current.mode === "kanji_mean") {
    ui.opts.innerHTML = "";
    current.choices.forEach((c, idx) => {
      const div = document.createElement("div");
      div.className = "opt";
      div.innerHTML = `<div class="meaning-opt">${getMeaning(c)}</div>`;
      div.onclick = () => answerChoice(idx);
      ui.opts.appendChild(div);
    });
  } else if (current.mode === "rm_mc" || current.mode === "jp_mc") {
    ui.opts.innerHTML = "";
    current.choices.forEach((c, idx) => {
      const div = document.createElement("div");
      div.className = "opt";
      div.innerHTML = (current.mode === "rm_mc")
        ? `<div class="jp">${getKana(c)}</div>`
        : `<div class="rm">${c.rm}</div>`;
      div.onclick = () => answerChoice(idx);
      ui.opts.appendChild(div);
    });
  } else {
    ui.opts.innerHTML = "";
  }

  setUIForMode(current.mode);
}

function nextQuestion() {
  if (current && !answered) {
    ui.result.textContent = t("please_answer");
    return;
  }

  if (!stats.session.active && stats.session.done >= stats.session.size && stats.session.done > 0) {
    backToModules();
    return;
  }

  readSettingsFromUIAndSave();

  if (!stats.session.active) {
    stats.session.size = settings.sessionSize;
  }

  if (currentModule === "n2") {
    const isStudy = settings.jlptMode === "study" || settings.jlptMode === "progressive";
    const isProgressive = settings.jlptMode === "progressive";
    if (isStudy && stats.session.done >= stats.session.size && stats.session.done > 0) {
      stats.session.active = false;
      stats.daily.rounds = stats.session.round;
      saveStats(stats);
      updateDashboard();
      stopTimer();
      const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
      showStudySummary(elapsed);
      return;
    }

    const nq = isProgressive ? pickProgressiveN2Question() : pickN2Question();
    if (!nq) {
      ui.q.textContent = t("no_questions");
      return;
    }
    current = {
      mode: isProgressive ? "n2_progressive" : (isStudy ? "n2_study" : "n2_exam"),
      n2Q: nq,
      correct: { type: "n2", rm: `n2_${nq.id}`, hira: `n2_${nq.id}` }
    };
    answered = isStudy;
    if (isStudy && stats.session.active) {
      stats.session.done++;
      n2AnsweredIds.add(`${settings.jlptLevel || "n2"}_${nq.id}`);
      if (isProgressive) advanceProgressiveN2Question(nq);
    }
    renderQuestion();
    saveStats(stats);
    updateDashboard();
    return;
  }

  current = newQuestion(db, settings, stats);
  answered = false;
  renderQuestion();
  saveStats(stats);
  updateDashboard();
}

function answerChoice(idx) {
  if (answered) return;
  answered = true;

  const ok = idx === current.correctIndex;
  const kana = getKana(current.correct);
  const meaning = getMeaning(current.correct);

  if (ok) playCorrect();
  else playWrong();

  setTimeout(() => speakJP(kana), 300);

  if (isWordRelationMode(current.mode)) {
    const srcKana = getKana(current.source);
    const srcMeaning = getMeaning(current.source);
    ui.result.innerHTML = ok
      ? `✅ ${t("result_correct")}<b>${srcKana}</b> → <b>${kana}</b>（${meaning}）`
      : `❌ ${t("result_wrong")}<b>${srcKana}</b> → <b>${kana}</b>（${meaning}）`;
    if (srcMeaning) {
      ui.result.innerHTML += `<div class="n2-expl">${t(`rel_${current.relationKind}`)}：${srcMeaning} → ${meaning}</div>`;
    }
  } else if (current.mode === "rm_mean" || current.mode === "mean_rm") {
    ui.result.innerHTML = ok
      ? `✅ ${t("result_correct")}<b>${kana}</b> = <b>${meaning}</b>`
      : `❌ ${t("result_wrong")}<b>${kana}</b> = <b>${meaning}</b>`;
  } else if (current.mode === "kanji_read" || current.mode === "read_kanji" || current.mode === "kanji_mean") {
    ui.result.innerHTML = ok
      ? `✅ ${t("result_correct")}<b>${current.correct.kanji}</b>（${kana}）= <b>${meaning}</b>`
      : `❌ ${t("result_wrong")}<b>${current.correct.kanji}</b>（${kana}）= <b>${meaning}</b>`;
  } else {
    ui.result.innerHTML = ok
      ? `✅ ${t("result_correct")}<b>${current.correct.rm}</b> = <b>${kana}</b>`
      : `❌ ${t("result_wrong")}<b>${current.correct.rm}</b> = <b>${kana}</b>`;
  }

  const r = recordResult(stats, current, ok);
  saveStats(stats);
  updateDashboard();

  if (r.finished) {
    stopTimer();
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    // Show summary after a brief pause so user can see the last answer's result
    setTimeout(() => showSessionSummary(elapsed), 1200);
  }
}

function showSessionSummary(elapsed) {
  const total = stats.session.done;
  const ok = stats.session.ok;
  const ng = stats.session.ng;
  const accuracy = total ? Math.round((ok / total) * 100) : 0;
  const emoji = accuracy >= 90 ? "🏆" : accuracy >= 70 ? "🎉" : accuracy >= 50 ? "👍" : "💪";
  ui.q.innerHTML = `<div class="gp-summary" style="padding:32px 8px 8px"><div style="font-size:3rem;margin-bottom:8px">${emoji}</div><div class="big">${accuracy}%</div><div class="sub">${t("gp_summary_sub", total, ok, ng)}</div><div class="sub" style="margin-top:6px">${t("gp_summary_time")}${formatTime(elapsed)}</div></div>`;
  ui.meaning.textContent = "";
  ui.opts.innerHTML = "";
  ui.result.innerHTML = "";
  ui.inputWrap.classList.add("hide");
  ui.btnNew.textContent = t("btn_finish");
}

function showStudySummary(elapsed) {
  const total = stats.session.done;
  ui.q.innerHTML = `<div class="gp-summary" style="padding:32px 8px 8px"><div style="font-size:3rem;margin-bottom:8px">📘</div><div class="big">${total}</div><div class="sub">${t("jlpt_study_done", total)}</div><div class="sub" style="margin-top:6px">${t("gp_summary_time")}${formatTime(elapsed)}</div></div>`;
  ui.meaning.textContent = "";
  ui.opts.innerHTML = "";
  ui.result.innerHTML = "";
  ui.inputWrap.classList.add("hide");
  ui.btnNew.textContent = t("btn_finish");
}

function checkInput() {
  if (!current) return;
  if (answered) return;

  const ans = ui.inp.value.trim();
  if (!ans) { ui.result.textContent = t("please_input"); return; }

  answered = true;
  const kana = getKana(current.correct);
  let ok = false;

  if (current.mode === "rm_in") {
    ok = (ans === current.correct.hira) || (ans === current.correct.kata);
  } else if (current.mode === "jp_in") {
    ok = normalizeRomaji(ans) === current.correct.rm;
  }

  if (ok) playCorrect();
  else playWrong();

  setTimeout(() => speakJP(kana), 300);

  ui.result.innerHTML = ok
    ? `✅ ${t("result_correct")}<b>${current.correct.rm}</b> = <b>${kana}</b>`
    : `❌ ${t("result_wrong2")}<b>${current.correct.rm}</b> = <b>${kana}</b>`;

  const r = recordResult(stats, current, ok);
  saveStats(stats);
  updateDashboard();

  if (r.finished) {
    stopTimer();
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    setTimeout(() => showSessionSummary(elapsed), 1200);
  }
}

function showAnswer() {
  if (!current) return;
  if (current.mode === "n2_exam" || current.mode === "n2_study" || current.mode === "n2_progressive") {
    answered = true;
    const nq = current.n2Q;
    const correctText = nq.options[nq.answer];
    ui.result.innerHTML = buildN2DetailsHTML(nq, correctText);
    n2AnsweredIds.add(`${settings.jlptLevel || "n2"}_${nq.id}`);
    return;
  }
  answered = true;
  const kana = getKana(current.correct);
  const meaning = getMeaning(current.correct);
  if (isWordRelationMode(current.mode)) {
    const srcKana = getKana(current.source);
    ui.result.innerHTML = `${t("result_answer")}<b>${srcKana}</b> → <b>${kana}</b>${meaning ? `（${meaning}）` : ""}`;
  } else {
    ui.result.innerHTML = `${t("result_answer")}<b>${current.correct.rm}</b> = <b>${kana}</b>${meaning ? `（${meaning}）` : ""}`;
  }
  speakJP(kana);
}

function startOrRestartSession() {
  unlockAudio();
  warmupTTS();
  readSettingsFromUIAndSave();

  // Reset N2 tracking on new session
  if (currentModule === "n2") {
    n2AnsweredIds.clear();
  }

  startSession(stats, settings.sessionSize);
  saveStats(stats);
  updateDashboard();
  showScreen(ui.quizScreen);
  startTimer();
  ui.btnNew.textContent = t("btn_next");
  answered = true;
  nextQuestion();
}

function backToModules() {
  stopTimer();
  showScreen(ui.moduleScreen);
  updateDashboard();
}

async function refreshApp() {
  try {
    ui.btnRefreshApp.disabled = true;
    ui.btnRefreshApp.textContent = t("refreshing_app");

    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg?.update();
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch (e) {
    console.warn("refreshApp failed", e);
  } finally {
    location.reload();
  }
}

async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} load failed`);
  return await res.json();
}

function switchLang(lang) {
  setLang(lang);
  applyI18nDOM();
  if (!ui.settingsScreen.classList.contains("hide")) {
    ui.settingsTitle.textContent = t(MODULE_TITLE_KEYS[currentModule]);
  }
  updateDashboard();
  if (current) renderQuestion();
  // Re-render grammar screens if visible
  if (ui.grammarScreen && !ui.grammarScreen.classList.contains("hide")) {
    renderGrammarTopics();
  }
  if (ui.grammarTopicScreen && !ui.grammarTopicScreen.classList.contains("hide") && currentGrammarTopic) {
    openGrammarTopic(currentGrammarTopic);
  }
  if (ui.grammarPracticeScreen && !ui.grammarPracticeScreen.classList.contains("hide") && gpState) {
    renderGpQuestion();
  }
}

function wire() {
  // Module card clicks
  document.querySelectorAll(".module-card").forEach(card => {
    card.addEventListener("click", () => {
      selectModule(card.dataset.module);
    });
  });

  // Settings back button
  ui.btnBackToModules.onclick = () => {
    readSettingsFromUIAndSave();
    showScreen(ui.moduleScreen);
  };

  // Grammar back buttons
  if (ui.btnGrammarBack) {
    ui.btnGrammarBack.onclick = () => showScreen(ui.moduleScreen);
  }
  if (ui.btnGrammarTopicBack) {
    ui.btnGrammarTopicBack.onclick = () => showScreen(ui.grammarScreen);
  }
  if (ui.btnGrammarPractice) {
    ui.btnGrammarPractice.onclick = () => startGrammarPractice();
  }
  if (ui.btnGrammarPracticeBack) {
    ui.btnGrammarPracticeBack.onclick = () => showScreen(ui.grammarTopicScreen);
  }
  if (ui.btnGpNext) {
    ui.btnGpNext.onclick = () => nextGp();
  }
  if (ui.btnGpSubmit) {
    ui.btnGpSubmit.onclick = () => submitGpAnswer();
  }

  // Settings change listeners
  ui.modeChecksKana.addEventListener("change", readSettingsFromUIAndSave);
  ui.modeChecksWord.addEventListener("change", readSettingsFromUIAndSave);
  ui.modeChecksKanji.addEventListener("change", readSettingsFromUIAndSave);
  ui.n2CatChecks.addEventListener("change", readSettingsFromUIAndSave);
  ui.jlptLevelChecks.addEventListener("change", () => {
    readSettingsFromUIAndSave();
    n2AnsweredIds.clear();
  });
  ui.jlptModeChecks?.addEventListener("change", () => {
    readSettingsFromUIAndSave();
    n2AnsweredIds.clear();
  });
  ui.btnResetJlptProgress?.addEventListener("click", () => {
    settings.jlptProgress = {};
    settings.jlptProgressOrders = {};
    saveSettings(settings);
    n2AnsweredIds.clear();
    alert(t("alert_reset_jlpt_progress"));
  });
  ui.kanaSetChecks.addEventListener("change", readSettingsFromUIAndSave);
  ui.kanaMode.addEventListener("change", () => { readSettingsFromUIAndSave(); if (current) renderQuestion(); });
  ui.sessionSize.addEventListener("change", readSettingsFromUIAndSave);
  ui.sessionSize.addEventListener("blur", readSettingsFromUIAndSave);
  ui.hideMeaning.addEventListener("change", readSettingsFromUIAndSave);
  ui.wrongFirst.addEventListener("change", readSettingsFromUIAndSave);

  // Quiz buttons
  ui.btnNew.onclick = nextQuestion;
  ui.btnSpeak.onclick = () => {
    if (!current) return;
    if (current.mode === "n2_exam" || current.mode === "n2_study" || current.mode === "n2_progressive") {
      speakJP(n2ReadableSentence(current.n2Q, current.mode === "n2_exam" ? "speak" : "full"));
    } else if (isWordRelationMode(current.mode) && current.source) {
      speakJP(getKana(current.source));
    } else {
      speakJP(getKana(current.correct));
    }
  };
  ui.btnStartSession.onclick = startOrRestartSession;
  ui.btnBack.onclick = backToModules;

  ui.btnCheck.onclick = checkInput;
  ui.btnShow.onclick = showAnswer;

  ui.inp.addEventListener("keydown", (e) => { if (e.key === "Enter") checkInput(); });
  ui.q.addEventListener("click", () => {
    if (!current) return;
    if (current.mode === "n2_exam" || current.mode === "n2_study" || current.mode === "n2_progressive") {
      speakJP(n2ReadableSentence(current.n2Q, current.mode === "n2_exam" ? "speak" : "full"));
    } else if (isWordRelationMode(current.mode) && current.source) {
      speakJP(getKana(current.source));
    } else {
      speakJP(getKana(current.correct));
    }
  });

  // Module screen footer buttons
  ui.btnResetSettings.onclick = () => {
    settings = resetSettings();
    currentModule = "kana";
    applySettingsToUI();
    alert(t("alert_reset_settings"));
  };

  ui.btnResetDay.onclick = () => {
    resetDaily(stats);
    stats = loadStats();
    updateDashboard();
    alert(t("alert_reset_today"));
  };

  if (ui.btnRefreshApp) {
    ui.btnRefreshApp.onclick = refreshApp;
  }

  ui.btnResetAllStats.onclick = () => {
    if (confirm(t("confirm_clear_all"))) {
      resetAllStats();
      stats = loadStats();
      updateDashboard();
      alert(t("alert_clear_all"));
    }
  };

  // Language switcher
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => switchLang(btn.dataset.lang));
  });
}

async function init() {
  applyI18nDOM();
  applySettingsToUI();
  updateDashboard();
  wire();

  try {
    db.kana = await loadJSON("./data/kana.json");
    db.words = await loadJSON("./data/words.json");
    db.wordRelations = await loadJSON("./data/word_relations.json").catch(() => []);
    db.kanji = await loadJSON("./data/kanji_words.json");

    // Load grammar topics (browse-only module)
    grammarTopics = await loadJSON("./data/grammar_topics.json").catch(() => []);
    renderGrammarTopics();

    // Load N2 exam questions (all files merged)
    const n2Files = await Promise.all([
      loadJSON("./data/n2_q_reading.json").catch(() => []),
      loadJSON("./data/n2_q_vocab.json").catch(() => []),
      loadJSON("./data/n2_q_grammar.json").catch(() => []),
      loadJSON("./data/n2_q_reading_ext.json").catch(() => []),
      loadJSON("./data/n2_q_ortho_ext.json").catch(() => []),
      loadJSON("./data/n2_q_context_ext.json").catch(() => []),
      loadJSON("./data/n2_q_para_ext.json").catch(() => []),
      loadJSON("./data/n2_q_usage_ext.json").catch(() => []),
      loadJSON("./data/n2_q_grammar_ext1.json").catch(() => []),
      loadJSON("./data/n2_q_grammar_ext2.json").catch(() => []),
    ]);
    db.n2Questions = n2Files.flat();
    db.jlptBanks.n2 = db.n2Questions;

    // Load N1, N3, N4, N5 banks. Only request files that exist to avoid
    // noisy 404s in browser consoles and service-worker logs.
    const JLPT_LEVEL_FILES = {
      n1: ["n1_q_reading.json", "n1_q_ortho_context.json", "n1_q_context_para.json", "n1_q_usage_grammar.json", "n1_q_fill.json"],
      n3: ["n3_q_reading.json", "n3_q_ortho_context.json", "n3_q_context_para.json", "n3_q_usage_grammar.json", "n3_q_fill.json"],
      n4: ["n4_q_reading.json", "n4_q_ortho_context.json", "n4_q_context_para.json", "n4_q_usage_grammar.json", "n4_q_grammar.json"],
      n5: ["n5_q_reading.json", "n5_q_ortho_context.json", "n5_q_context_para.json", "n5_q_usage_grammar.json"],
    };

    const loadLevel = async (lvl) => {
      const files = await Promise.all(
        (JLPT_LEVEL_FILES[lvl] || []).map((fn) => loadJSON(`./data/${fn}`).catch(() => []))
      );
      return files.flat();
    };
    const [n1Bank, n3Bank, n4Bank, n5Bank] = await Promise.all([
      loadLevel("n1"), loadLevel("n3"), loadLevel("n4"), loadLevel("n5")
    ]);
    db.jlptBanks.n1 = n1Bank;
    db.jlptBanks.n3 = n3Bank;
    db.jlptBanks.n4 = n4Bank;
    db.jlptBanks.n5 = n5Bank;

    // Load version
    loadJSON("./data/version.json").then((v) => {
      const tag = document.getElementById("versionTag");
      if (tag && v && v.version) tag.textContent = "v " + v.version;
    }).catch(() => {});

    // Load translation meaning files
    const [zhTW, ja, en] = await Promise.all([
      loadJSON("./data/meanings_zh_TW.json?v=2026-05-26.3").catch(() => ({})),
      loadJSON("./data/meanings_ja.json?v=2026-05-26.3").catch(() => ({})),
      loadJSON("./data/meanings_en.json?v=2026-05-26.3").catch(() => ({})),
    ]);
    db.meanings = { "zh-TW": zhTW, ja, en };
  } catch (e) {
    console.error(e);
    alert(t("data_error"));
  }
}

init();
