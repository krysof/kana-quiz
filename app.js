import {
  loadSettings, saveSettings, resetSettings,
  loadStats, saveStats, resetDaily, resetAllStats
} from "./core/storage.js?v=1.5";

import { speakJP, warmupTTS } from "./core/tts.js?v=1.5";
import { playCorrect, playWrong, unlockAudio } from "./core/audio.js?v=1.5";

import {
  newQuestion, recordResult, startSession,
  normalizeRomaji, pct
} from "./core/quiz.js?v=1.5";

import { t, getLang, setLang, applyI18nDOM } from "./core/i18n.js?v=1.5";

const $ = (id) => document.getElementById(id);

const ui = {
  // Screens
  startScreen: $("startScreen"),
  quizScreen: $("quizScreen"),

  // Quiz elements
  q: $("q"),
  meaning: $("meaning"),
  opts: $("opts"),
  inputWrap: $("inputWrap"),
  inp: $("inp"),
  result: $("result"),

  // Settings
  contentChecks: $("contentChecks"),
  modeChecks: $("modeChecks"),
  modeChecksKana: $("modeChecksKana"),
  modeChecksWord: $("modeChecksWord"),
  modeChecksKanji: $("modeChecksKanji"),
  groupKana: $("groupKana"),
  groupWord: $("groupWord"),
  groupKanji: $("groupKanji"),
  kanaSetChecks: $("kanaSetChecks"),
  kanaMode: $("kanaMode"),
  sessionSize: $("sessionSize"),
  hideMeaning: $("hideMeaning"),

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

  // Stats - Start screen
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
let db = { kana: [], words: [], kanji: [], meanings: {} };
let current = null;
let answered = false;

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

// Get meaning for an item based on current language
function getMeaning(item) {
  if (!item.meaning) return "";
  const lang = getLang();
  if (lang === "zh-CN") return item.meaning;
  const map = db.meanings[lang];
  if (map && map[item.rm]) return map[item.rm];
  return item.meaning; // fallback to zh-CN
}

function applySettingsToUI() {
  setChecked(ui.contentChecks, settings.content);
  setChecked(ui.modeChecksKana, settings.modes);
  setChecked(ui.modeChecksWord, settings.modes);
  setChecked(ui.modeChecksKanji, settings.modes);
  setChecked(ui.kanaSetChecks, settings.kanaSets);
  ui.kanaMode.value = settings.kanaMode || "hira";
  ui.sessionSize.value = settings.sessionSize ?? 20;
  ui.hideMeaning.checked = settings.hideMeaning || false;
  updateGroupVisibility();
}

function updateGroupVisibility() {
  const content = getChecked(ui.contentChecks);
  const toggle = (group, enabled) => {
    group.classList.toggle("group-disabled", !enabled);
    group.querySelectorAll("input, select").forEach(el => el.disabled = !enabled);
  };
  toggle(ui.groupKana, content.includes("kana"));
  toggle(ui.groupWord, content.includes("word"));
  toggle(ui.groupKanji, content.includes("kanji"));

  // Auto-select default modes when content group enabled but no modes selected
  if (content.includes("word")) {
    const wordModes = getChecked(ui.modeChecksWord);
    if (wordModes.length === 0) {
      setChecked(ui.modeChecksWord, ["rm_mc", "jp_mc"]);
    }
  }
  if (content.includes("kanji")) {
    const kanjiModes = getChecked(ui.modeChecksKanji);
    if (kanjiModes.length === 0) {
      setChecked(ui.modeChecksKanji, ["kanji_read", "read_kanji"]);
    }
  }
}

function readSettingsFromUIAndSave() {
  settings.content = getChecked(ui.contentChecks);
  updateGroupVisibility();

  const modesKana = getChecked(ui.modeChecksKana);
  const modesWord = getChecked(ui.modeChecksWord);
  const modesKanji = getChecked(ui.modeChecksKanji);
  settings.modes = [...new Set([...modesKana, ...modesWord, ...modesKanji])];

  const sets = getChecked(ui.kanaSetChecks);
  settings.kanaSets = sets.length ? sets : ["seion"];
  if (!sets.length) setChecked(ui.kanaSetChecks, settings.kanaSets);

  settings.kanaMode = ui.kanaMode.value;
  settings.sessionSize = clampInt(ui.sessionSize.value, 5, 200, 20);
  ui.sessionSize.value = settings.sessionSize;
  settings.hideMeaning = ui.hideMeaning.checked;

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
  ui.startScreen.classList.add("hide");
  ui.quizScreen.classList.add("hide");
  screen.classList.remove("hide");
}

function setUIForMode(mode) {
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

function renderQuestion() {
  if (!current) {
    ui.q.textContent = t("ready");
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
      div.onclick = () => {
        answerChoice(idx);
      };
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
    backToStart();
    return;
  }

  readSettingsFromUIAndSave();

  if (!stats.session.active) {
    stats.session.size = settings.sessionSize;
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
  startSession(stats, settings.sessionSize);
  saveStats(stats);
  updateDashboard();
  showScreen(ui.quizScreen);
  startTimer();
  ui.btnNew.textContent = t("btn_next");
  answered = true;
  nextQuestion();
}

function backToStart() {
  stopTimer();
  showScreen(ui.startScreen);
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
  updateDashboard();
  if (current) renderQuestion();
}

function wire() {
  ui.contentChecks.addEventListener("change", readSettingsFromUIAndSave);
  ui.modeChecksKana.addEventListener("change", readSettingsFromUIAndSave);
  ui.modeChecksWord.addEventListener("change", readSettingsFromUIAndSave);
  ui.modeChecksKanji.addEventListener("change", readSettingsFromUIAndSave);
  ui.kanaSetChecks.addEventListener("change", readSettingsFromUIAndSave);
  ui.kanaMode.addEventListener("change", () => { readSettingsFromUIAndSave(); if (current) renderQuestion(); });
  ui.sessionSize.addEventListener("change", readSettingsFromUIAndSave);
  ui.sessionSize.addEventListener("blur", readSettingsFromUIAndSave);
  ui.hideMeaning.addEventListener("change", readSettingsFromUIAndSave);

  ui.btnNew.onclick = nextQuestion;
  ui.btnSpeak.onclick = () => current && speakJP(getKana(current.correct));
  ui.btnStartSession.onclick = startOrRestartSession;
  ui.btnBack.onclick = backToStart;

  ui.btnCheck.onclick = checkInput;
  ui.btnShow.onclick = showAnswer;

  ui.inp.addEventListener("keydown", (e) => { if (e.key === "Enter") checkInput(); });
  ui.q.addEventListener("click", () => current && speakJP(getKana(current.correct)));

  ui.btnResetSettings.onclick = () => {
    settings = resetSettings();
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

    // Load translation meaning files
    const [zhTW, ja, en] = await Promise.all([
      loadJSON("./data/meanings_zh_TW.json?v=1.5").catch(() => ({})),
      loadJSON("./data/meanings_ja.json?v=1.5").catch(() => ({})),
      loadJSON("./data/meanings_en.json?v=1.5").catch(() => ({})),
    ]);
    db.meanings = { "zh-TW": zhTW, ja, en };
  } catch (e) {
    console.error(e);
    alert(t("data_error"));
  }
}

init();
