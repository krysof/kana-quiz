import {
  loadSettings, saveSettings, resetSettings,
  loadStats, saveStats, resetDaily, resetAllStats
} from "./core/storage.js?v=1.2";

import { speakJP, warmupTTS } from "./core/tts.js?v=1.2";
import { playCorrect, playWrong, unlockAudio } from "./core/audio.js?v=1.2";

import {
  newQuestion, recordResult, startSession,
  normalizeRomaji, pct
} from "./core/quiz.js?v=1.2";

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
let db = { kana: [], words: [] };
let current = null;
let answered = false; // 是否已答题

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

function applySettingsToUI() {
  setChecked(ui.contentChecks, settings.content);
  setChecked(ui.modeChecks, settings.modes);
  setChecked(ui.kanaSetChecks, settings.kanaSets);
  ui.kanaMode.value = settings.kanaMode || "hira";
  ui.sessionSize.value = settings.sessionSize ?? 20;
  ui.hideMeaning.checked = settings.hideMeaning || false;
}

function readSettingsFromUIAndSave() {
  settings.content = getChecked(ui.contentChecks);
  settings.modes = getChecked(ui.modeChecks);

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
  // Start screen stats
  if (ui.d_total_start) ui.d_total_start.textContent = stats.daily.total;
  if (ui.d_ok_start) ui.d_ok_start.textContent = stats.daily.ok;
  if (ui.d_ng_start) ui.d_ng_start.textContent = stats.daily.ng;
  if (ui.d_rounds_start) ui.d_rounds_start.textContent = stats.daily.rounds || 0;

  // Quiz screen round
  if (ui.s_round) ui.s_round.textContent = `第${stats.session.round || 1}轮`;

  // Quiz screen stats
  ui.s_done.textContent = stats.session.done;
  ui.s_size.textContent = stats.session.size;
  ui.s_ok.textContent = stats.session.ok;
  ui.s_ng.textContent = stats.session.ng;
  ui.streak.textContent = stats.daily.streak;

  // Accuracy
  ui.s_acc_display.textContent = pct(stats.session.ok, stats.session.done);

  // Progress bar
  const progress = stats.session.size > 0 ? (stats.session.done / stats.session.size) * 100 : 0;
  ui.progressFill.style.width = `${progress}%`;

  // Hidden stats for compatibility
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
  ui.inputWrap.classList.toggle("hide", !isInput);
  ui.opts.classList.toggle("hide", isInput);

  if (isInput) {
    ui.inp.value = "";
    ui.inp.placeholder = (mode === "rm_in")
      ? "输入假名"
      : "输入罗马音";
    setTimeout(() => ui.inp.focus?.(), 0);
  }
}

function renderQuestion() {
  if (!current) {
    ui.q.textContent = "准备开始...";
    return;
  }
  const it = current.correct;
  const kana = getKana(it);

  // 处理释义显示（直接从UI读取最新状态）
  const shouldHide = ui.hideMeaning.checked;
  if (it.type === "word" && it.meaning) {
    if (shouldHide) {
      ui.meaning.textContent = "释义：***";
      ui.meaning.style.cursor = "pointer";
      ui.meaning.onclick = () => {
        ui.meaning.textContent = `释义：${it.meaning}`;
        ui.meaning.style.cursor = "default";
        ui.meaning.onclick = null;
      };
    } else {
      ui.meaning.textContent = `释义：${it.meaning}`;
      ui.meaning.style.cursor = "default";
      ui.meaning.onclick = null;
    }
  } else {
    ui.meaning.textContent = "";
    ui.meaning.onclick = null;
  }
  ui.result.textContent = "";

  if (current.mode === "rm_mc" || current.mode === "rm_in") {
    ui.q.innerHTML = `<b>${it.rm}</b> 的${it.type === "word" ? "写法" : "假名"}是？`;
  } else {
    ui.q.innerHTML = `<span class="big">${kana}</span> 怎么读？`;
  }

  if (current.mode === "rm_mc" || current.mode === "jp_mc") {
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
  // 必须先答题才能下一题（除非是第一题）
  if (current && !answered) {
    ui.result.textContent = "请先答题！";
    return;
  }

  // 如果 session 已完成，返回开始界面
  if (!stats.session.active && stats.session.done >= stats.session.size && stats.session.done > 0) {
    backToStart();
    return;
  }

  readSettingsFromUIAndSave();

  if (!stats.session.active) {
    stats.session.size = settings.sessionSize;
  }

  current = newQuestion(db, settings, stats);
  answered = false; // 重置答题状态
  renderQuestion();
  saveStats(stats);
  updateDashboard();
}

function answerChoice(idx) {
  if (answered) return; // 已答过，忽略
  answered = true;

  const ok = idx === current.correctIndex;
  const kana = getKana(current.correct);

  if (ok) playCorrect();
  else playWrong();

  // 音效后播放读音
  setTimeout(() => speakJP(kana), 300);

  ui.result.innerHTML = ok
    ? `✅ 正确：<b>${current.correct.rm}</b> = <b>${kana}</b>`
    : `❌ 错了。正确：<b>${current.correct.rm}</b> = <b>${kana}</b>`;

  const r = recordResult(stats, current, ok);
  saveStats(stats);
  updateDashboard();

  if (r.finished) {
    stopTimer();
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    ui.result.innerHTML += ` <b>（完成！用时 ${formatTime(elapsed)}，正确率 ${pct(stats.session.ok, stats.session.done)}）</b>`;
    ui.btnNew.textContent = "结束";
  }
}

function checkInput() {
  if (!current) return;
  if (answered) return; // 已答过，忽略

  const ans = ui.inp.value.trim();
  if (!ans) { ui.result.textContent = "请输入答案"; return; }

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

  // 音效后播放读音
  setTimeout(() => speakJP(kana), 300);

  ui.result.innerHTML = ok
    ? `✅ 正确：<b>${current.correct.rm}</b> = <b>${kana}</b>`
    : `❌ 不对。正确：<b>${current.correct.rm}</b> = <b>${kana}</b>`;

  const r = recordResult(stats, current, ok);
  saveStats(stats);
  updateDashboard();

  if (r.finished) {
    stopTimer();
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    ui.result.innerHTML += ` <b>（完成！用时 ${formatTime(elapsed)}，正确率 ${pct(stats.session.ok, stats.session.done)}）</b>`;
    ui.btnNew.textContent = "结束";
  }
}

function showAnswer() {
  if (!current) return;
  answered = true; // 看答案也算答过
  const kana = getKana(current.correct);
  ui.result.innerHTML = `答案：<b>${current.correct.rm}</b> = <b>${kana}</b>${current.correct.meaning ? `（${current.correct.meaning}）` : ""}`;
  speakJP(kana);
}

function startOrRestartSession() {
  unlockAudio(); // 解锁音频（需要用户交互）
  warmupTTS(); // 预热TTS
  readSettingsFromUIAndSave();
  startSession(stats, settings.sessionSize);
  saveStats(stats);
  updateDashboard();
  showScreen(ui.quizScreen);
  startTimer();
  ui.btnNew.textContent = "下一题"; // 重置按钮文字
  answered = true; // 允许第一题直接开始
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

function wire() {
  // Settings change
  ui.contentChecks.addEventListener("change", readSettingsFromUIAndSave);
  ui.modeChecks.addEventListener("change", readSettingsFromUIAndSave);
  ui.kanaSetChecks.addEventListener("change", readSettingsFromUIAndSave);
  ui.kanaMode.addEventListener("change", () => { readSettingsFromUIAndSave(); if (current) renderQuestion(); });
  ui.sessionSize.addEventListener("change", readSettingsFromUIAndSave);
  ui.sessionSize.addEventListener("blur", readSettingsFromUIAndSave);
  ui.hideMeaning.addEventListener("change", readSettingsFromUIAndSave);

  // Quiz actions
  ui.btnNew.onclick = nextQuestion;
  ui.btnSpeak.onclick = () => current && speakJP(getKana(current.correct));
  ui.btnStartSession.onclick = startOrRestartSession;
  ui.btnBack.onclick = backToStart;

  ui.btnCheck.onclick = checkInput;
  ui.btnShow.onclick = showAnswer;

  ui.inp.addEventListener("keydown", (e) => { if (e.key === "Enter") checkInput(); });
  ui.q.addEventListener("click", () => current && speakJP(getKana(current.correct)));

  // Reset buttons
  ui.btnResetSettings.onclick = () => {
    settings = resetSettings();
    applySettingsToUI();
    alert("已复位设置");
  };

  ui.btnResetDay.onclick = () => {
    resetDaily(stats);
    stats = loadStats();
    updateDashboard();
    alert("已重置今日统计");
  };

  ui.btnResetAllStats.onclick = () => {
    if (confirm("确定清空全部统计和错题记录？")) {
      resetAllStats();
      stats = loadStats();
      updateDashboard();
      alert("已清空全部数据");
    }
  };
}

async function init() {
  applySettingsToUI();
  updateDashboard();
  wire();

  try {
    db.kana = await loadJSON("./data/kana.json");
    db.words = await loadJSON("./data/words.json");
  } catch (e) {
    console.error(e);
    alert("加载数据失败，请确保通过 HTTP 服务器访问（如 GitHub Pages 或本地服务器）");
  }
}

init();
