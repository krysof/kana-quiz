import {
  loadSettings, saveSettings, resetSettings,
  loadStats, saveStats, resetDaily, resetAllStats
} from "./core/storage.js?v=2.1";

import { speakJP, warmupTTS } from "./core/tts.js?v=2.1";
import { playCorrect, playWrong, unlockAudio } from "./core/audio.js?v=2.1";

import {
  newQuestion, recordResult, startSession,
  normalizeRomaji, pct
} from "./core/quiz.js?v=2.1";

import { t, getLang, setLang, applyI18nDOM } from "./core/i18n.js?v=2.1";

const $ = (id) => document.getElementById(id);

const ui = {
  // Screens
  moduleScreen: $("moduleScreen"),
  settingsScreen: $("settingsScreen"),
  quizScreen: $("quizScreen"),

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
let db = { kana: [], words: [], kanji: [], n2Questions: [], jlptBanks: {}, meanings: {} };
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

// N2 category display names
const N2_CAT_NAMES = {
  kanji_reading: "漢字読み",
  orthography: "表記",
  context_vocab: "文脈規定",
  paraphrase: "言い換え",
  usage: "用法",
  grammar: "文法",
};

// Build readable sentence for N2 question (fill blanks with correct answer)
function n2ReadableSentence(nq) {
  if (!nq) return "";
  // For usage questions (no sentence), read the correct option
  if (nq.cat === "usage") return nq.options[nq.answer] || "";
  let s = nq.sentence || "";
  const correct = nq.options[nq.answer] || "";
  // Replace blank markers with correct answer for TTS
  s = s.replace(/[（(][\s　_＿]+[)）]/g, correct);
  s = s.replace(/＿+/g, correct);
  s = s.replace(/_{2,}/g, correct);
  // For orthography: replace hiragana target with correct kanji
  if (nq.cat === "orthography" && nq.target && correct) {
    s = s.replace(nq.target, correct);
  }
  return s;
}

// Get meaning for an item based on current language
function getMeaning(item) {
  if (!item.meaning) return "";
  const lang = getLang();
  if (lang === "zh-CN") return item.meaning;
  const map = db.meanings[lang];
  if (map && map[item.rm]) return map[item.rm];
  return item.meaning;
}

// ==================== Module Selection ====================

function selectModule(mod) {
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
  screen.classList.remove("hide");
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

function pickN2Question() {
  const cats = new Set(settings.n2Cats?.length ? settings.n2Cats : ["kanji_reading", "orthography", "context_vocab", "grammar"]);
  const level = settings.jlptLevel || "n2";
  const bank = db.jlptBanks[level] || db.n2Questions || [];
  const pool = bank.filter(q => cats.has(q.cat) && !n2AnsweredIds.has(`${level}_${q.id}`));

  // If all questions answered, reset
  if (!pool.length) {
    n2AnsweredIds.clear();
    const resetPool = bank.filter(q => cats.has(q.cat));
    if (!resetPool.length) return null;
    return resetPool[Math.floor(Math.random() * resetPool.length)];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

function renderN2Question() {
  const nq = current.n2Q;
  ui.meaning.textContent = "";
  ui.meaning.onclick = null;
  ui.result.textContent = "";

  // Category tag
  const catName = N2_CAT_NAMES[nq.cat] || nq.cat;
  const hint = t(N2_CAT_HINT[nq.cat] || "n2_q_context");

  // Build question HTML
  let sentenceHtml = "";
  if (nq.target && nq.sentence.includes(nq.target)) {
    sentenceHtml = nq.sentence.replace(
      nq.target,
      `<span class="n2-target">${nq.target}</span>`
    );
  } else {
    sentenceHtml = nq.sentence;
  }

  ui.q.innerHTML = `<span class="n2-cat-tag">${catName}</span><div class="n2-hint">${hint}</div><div class="n2-sentence">${sentenceHtml}</div>`;

  // Build options
  const isUsage = nq.cat === "usage";
  ui.opts.innerHTML = "";
  nq.options.forEach((opt, idx) => {
    const div = document.createElement("div");
    div.className = isUsage ? "opt opt-sentence" : "opt";
    div.innerHTML = isUsage
      ? `<div class="jp">${opt}</div>`
      : `<div class="jp">${idx + 1}. ${opt}</div>`;
    // Capture nq in closure to avoid current.n2Q drift
    div.onclick = () => answerN2Choice(idx, nq);
    ui.opts.appendChild(div);
  });

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

  // Read the sentence aloud
  setTimeout(() => speakJP(n2ReadableSentence(nq)), 300);

  // Build result message
  const expl = nq.explanation ? `<div class="n2-expl">${nq.explanation}</div>` : "";
  if (ok) {
    ui.result.innerHTML = `✅ ${t("result_correct")}<b>${correctText}</b>${expl}`;
  } else {
    ui.result.innerHTML = `❌ ${t("result_wrong")}<b>${correctText}</b>${expl}`;
  }

  // Record stats
  const fakeCorrect = { type: "n2", rm: `n2_${nq.id}`, hira: `n2_${nq.id}` };
  const r = recordResult(stats, { correct: fakeCorrect }, ok);
  saveStats(stats);
  updateDashboard();

  if (r.finished) {
    stopTimer();
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    ui.result.innerHTML += ` <b>（${t("finish_done")}${formatTime(elapsed)}${t("finish_acc")}${pct(stats.session.ok, stats.session.done)}）</b>`;
    ui.btnNew.textContent = t("btn_finish");
  }
}

// ==================== Standard Question Rendering ====================

function renderQuestion() {
  if (!current) {
    ui.q.textContent = t("ready");
    return;
  }

  // N2 exam mode
  if (current.mode === "n2_exam") {
    renderN2Question();
    return;
  }

  const it = current.correct;
  const kana = getKana(it);
  const meaning = getMeaning(it);

  const shouldHide = ui.hideMeaning.checked;
  if (current.mode === "rm_mean" || current.mode === "kanji_mean") {
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

  if (current.mode === "rm_mean") {
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

  if (current.mode === "rm_mean") {
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

  // N2 exam mode
  if (currentModule === "n2") {
    const nq = pickN2Question();
    if (!nq) {
      ui.q.textContent = "No questions available";
      return;
    }
    current = { mode: "n2_exam", n2Q: nq, correct: { type: "n2", rm: `n2_${nq.id}`, hira: `n2_${nq.id}` } };
    answered = false;
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

  if (current.mode === "rm_mean" || current.mode === "mean_rm") {
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
    ui.result.innerHTML += ` <b>（${t("finish_done")}${formatTime(elapsed)}${t("finish_acc")}${pct(stats.session.ok, stats.session.done)}）</b>`;
    ui.btnNew.textContent = t("btn_finish");
  }
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
    ui.result.innerHTML += ` <b>（${t("finish_done")}${formatTime(elapsed)}${t("finish_acc")}${pct(stats.session.ok, stats.session.done)}）</b>`;
    ui.btnNew.textContent = t("btn_finish");
  }
}

function showAnswer() {
  if (!current) return;
  if (current.mode === "n2_exam") {
    answered = true;
    const nq = current.n2Q;
    const correctText = nq.options[nq.answer];
    ui.result.innerHTML = `${t("result_answer")}<b>${correctText}</b>`;
    n2AnsweredIds.add(`${settings.jlptLevel || "n2"}_${nq.id}`);
    return;
  }
  answered = true;
  const kana = getKana(current.correct);
  const meaning = getMeaning(current.correct);
  ui.result.innerHTML = `${t("result_answer")}<b>${current.correct.rm}</b> = <b>${kana}</b>${meaning ? `（${meaning}）` : ""}`;
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

  // Settings change listeners
  ui.modeChecksKana.addEventListener("change", readSettingsFromUIAndSave);
  ui.modeChecksWord.addEventListener("change", readSettingsFromUIAndSave);
  ui.modeChecksKanji.addEventListener("change", readSettingsFromUIAndSave);
  ui.n2CatChecks.addEventListener("change", readSettingsFromUIAndSave);
  ui.jlptLevelChecks.addEventListener("change", () => {
    readSettingsFromUIAndSave();
    n2AnsweredIds.clear();
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
    if (current.mode === "n2_exam") {
      speakJP(n2ReadableSentence(current.n2Q));
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
    if (current.mode === "n2_exam") {
      speakJP(n2ReadableSentence(current.n2Q));
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
    db.kanji = await loadJSON("./data/kanji_words.json");

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

    // Load N1, N3, N4, N5 banks (4 files per level)
    const loadLevel = async (lvl) => {
      const files = await Promise.all([
        loadJSON(`./data/${lvl}_q_reading.json`).catch(() => []),
        loadJSON(`./data/${lvl}_q_ortho_context.json`).catch(() => []),
        loadJSON(`./data/${lvl}_q_context_para.json`).catch(() => []),
        loadJSON(`./data/${lvl}_q_usage_grammar.json`).catch(() => []),
        loadJSON(`./data/${lvl}_q_grammar.json`).catch(() => []),
        loadJSON(`./data/${lvl}_q_fill.json`).catch(() => []),
      ]);
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
      loadJSON("./data/meanings_zh_TW.json?v=2.1").catch(() => ({})),
      loadJSON("./data/meanings_ja.json?v=2.1").catch(() => ({})),
      loadJSON("./data/meanings_en.json?v=2.1").catch(() => ({})),
    ]);
    db.meanings = { "zh-TW": zhTW, ja, en };
  } catch (e) {
    console.error(e);
    alert(t("data_error"));
  }
}

init();
