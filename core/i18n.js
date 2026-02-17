const LANGS = {
  "zh-CN": {
    // Header
    title: "50音训练",
    subtitle: "练习假名和日常短词",
    // Content labels
    content_label: "内容（可多选）",
    content_kana: "50音",
    content_word: "日常短词",
    content_kanji: "汉字短词",
    content_wrong: "错题优先",
    // Group titles
    group_kana_title: "50音设置",
    group_word_title: "日常短词设置",
    group_kanji_title: "汉字短词设置",
    // Labels
    mode_type: "题型",
    set_label: "集合",
    kana_mode_label: "假名模式",
    session_size_label: "本次题数",
    other_options: "其他选项",
    // Kana modes
    kana_hira: "平假名",
    kana_kata: "片假名",
    // Mode names
    mode_rm_mc: "罗马音→选假名",
    mode_jp_mc: "假名→选罗马音",
    mode_rm_in: "罗马音输入",
    mode_jp_in: "假名输入",
    mode_rm_mean: "读音→选意思",
    mode_mean_rm: "意思→选读音",
    mode_kanji_read: "汉字→选读音",
    mode_read_kanji: "读音→选汉字",
    mode_kanji_mean: "汉字→选意思",
    // Sets
    set_seion: "清音",
    set_dakuon: "浊音",
    set_handakuon: "半浊音",
    set_yoon: "拗音",
    // Buttons
    start_btn: "开始练习",
    hide_meaning: "隐藏中文释义",
    reset_settings: "复位设置",
    reset_today: "重置今日",
    clear_all: "清空全部",
    // Start stats
    today_label: "今日：",
    today_unit: " 题",
    correct_label: "正确：",
    wrong_label: "错误：",
    done_label: "完成：",
    rounds_unit: " 轮",
    // Quiz screen
    round_prefix: "第",
    round_suffix: "轮",
    btn_back: "退出",
    btn_next: "下一题",
    btn_speak: "播放发音",
    btn_check: "提交",
    btn_show: "显示答案",
    btn_finish: "结束",
    // Question templates
    q_what_meaning: " 是什么意思？",
    q_how_read_meaning: "」怎么读？",
    q_how_read_meaning_pre: "「",
    q_how_read: " 怎么读？",
    q_kanji_of: " 的汉字是？",
    q_kana_of: " 的假名是？",
    q_writing_of: " 的写法是？",
    // Input
    input_kana: "输入假名",
    input_romaji: "输入罗马音",
    input_placeholder: "输入答案",
    // Results
    result_correct: "正确：",
    result_wrong: "错了。正确：",
    result_wrong2: "不对。正确：",
    result_answer: "答案：",
    meaning_label: "释义：",
    meaning_hidden: "释义：***",
    // Alerts
    alert_reset_settings: "已复位设置",
    alert_reset_today: "已重置今日统计",
    alert_clear_all: "已清空全部数据",
    confirm_clear_all: "确定清空全部统计和错题记录？",
    please_answer: "请先答题！",
    please_input: "请输入答案",
    ready: "准备开始...",
    // Finish
    finish_done: "完成！用时 ",
    finish_acc: "，正确率 ",
    // Data error
    data_error: "加载数据失败，请确保通过 HTTP 服务器访问（如 GitHub Pages 或本地服务器）",
  },
  "zh-TW": {
    title: "50音訓練",
    subtitle: "練習假名和日常短詞",
    content_label: "內容（可多選）",
    content_kana: "50音",
    content_word: "日常短詞",
    content_kanji: "漢字短詞",
    content_wrong: "錯題優先",
    group_kana_title: "50音設置",
    group_word_title: "日常短詞設置",
    group_kanji_title: "漢字短詞設置",
    mode_type: "題型",
    set_label: "集合",
    kana_mode_label: "假名模式",
    session_size_label: "本次題數",
    other_options: "其他選項",
    kana_hira: "平假名",
    kana_kata: "片假名",
    mode_rm_mc: "羅馬音→選假名",
    mode_jp_mc: "假名→選羅馬音",
    mode_rm_in: "羅馬音輸入",
    mode_jp_in: "假名輸入",
    mode_rm_mean: "讀音→選意思",
    mode_mean_rm: "意思→選讀音",
    mode_kanji_read: "漢字→選讀音",
    mode_read_kanji: "讀音→選漢字",
    mode_kanji_mean: "漢字→選意思",
    set_seion: "清音",
    set_dakuon: "濁音",
    set_handakuon: "半濁音",
    set_yoon: "拗音",
    start_btn: "開始練習",
    hide_meaning: "隱藏中文釋義",
    reset_settings: "復位設置",
    reset_today: "重置今日",
    clear_all: "清空全部",
    today_label: "今日：",
    today_unit: " 題",
    correct_label: "正確：",
    wrong_label: "錯誤：",
    done_label: "完成：",
    rounds_unit: " 輪",
    round_prefix: "第",
    round_suffix: "輪",
    btn_back: "退出",
    btn_next: "下一題",
    btn_speak: "播放發音",
    btn_check: "提交",
    btn_show: "顯示答案",
    btn_finish: "結束",
    q_what_meaning: " 是什麼意思？",
    q_how_read_meaning: "」怎麼讀？",
    q_how_read_meaning_pre: "「",
    q_how_read: " 怎麼讀？",
    q_kanji_of: " 的漢字是？",
    q_kana_of: " 的假名是？",
    q_writing_of: " 的寫法是？",
    input_kana: "輸入假名",
    input_romaji: "輸入羅馬音",
    input_placeholder: "輸入答案",
    result_correct: "正確：",
    result_wrong: "錯了。正確：",
    result_wrong2: "不對。正確：",
    result_answer: "答案：",
    meaning_label: "釋義：",
    meaning_hidden: "釋義：***",
    alert_reset_settings: "已復位設置",
    alert_reset_today: "已重置今日統計",
    alert_clear_all: "已清空全部數據",
    confirm_clear_all: "確定清空全部統計和錯題記錄？",
    please_answer: "請先答題！",
    please_input: "請輸入答案",
    ready: "準備開始...",
    finish_done: "完成！用時 ",
    finish_acc: "，正確率 ",
    data_error: "載入資料失敗，請確保透過 HTTP 伺服器存取（如 GitHub Pages 或本地伺服器）",
  },
  ja: {
    title: "50音トレーニング",
    subtitle: "仮名と日常単語を練習",
    content_label: "内容（複数選択可）",
    content_kana: "50音",
    content_word: "日常単語",
    content_kanji: "漢字単語",
    content_wrong: "間違い優先",
    group_kana_title: "50音設定",
    group_word_title: "日常単語設定",
    group_kanji_title: "漢字単語設定",
    mode_type: "問題タイプ",
    set_label: "セット",
    kana_mode_label: "仮名モード",
    session_size_label: "問題数",
    other_options: "その他",
    kana_hira: "ひらがな",
    kana_kata: "カタカナ",
    mode_rm_mc: "ローマ字→仮名選択",
    mode_jp_mc: "仮名→ローマ字選択",
    mode_rm_in: "ローマ字入力",
    mode_jp_in: "仮名入力",
    mode_rm_mean: "読み→意味選択",
    mode_mean_rm: "意味→読み選択",
    mode_kanji_read: "漢字→読み選択",
    mode_read_kanji: "読み→漢字選択",
    mode_kanji_mean: "漢字→意味選択",
    set_seion: "清音",
    set_dakuon: "濁音",
    set_handakuon: "半濁音",
    set_yoon: "拗音",
    start_btn: "練習開始",
    hide_meaning: "意味を隠す",
    reset_settings: "設定リセット",
    reset_today: "今日リセット",
    clear_all: "全消去",
    today_label: "今日：",
    today_unit: " 問",
    correct_label: "正解：",
    wrong_label: "不正解：",
    done_label: "完了：",
    rounds_unit: " 回",
    round_prefix: "第",
    round_suffix: "回",
    btn_back: "戻る",
    btn_next: "次へ",
    btn_speak: "発音再生",
    btn_check: "送信",
    btn_show: "答えを見る",
    btn_finish: "終了",
    q_what_meaning: " はどういう意味？",
    q_how_read_meaning: "」の読みは？",
    q_how_read_meaning_pre: "「",
    q_how_read: " の読みは？",
    q_kanji_of: " の漢字は？",
    q_kana_of: " の仮名は？",
    q_writing_of: " の書き方は？",
    input_kana: "仮名を入力",
    input_romaji: "ローマ字を入力",
    input_placeholder: "答えを入力",
    result_correct: "正解：",
    result_wrong: "不正解。正解：",
    result_wrong2: "違います。正解：",
    result_answer: "答え：",
    meaning_label: "意味：",
    meaning_hidden: "意味：***",
    alert_reset_settings: "設定をリセットしました",
    alert_reset_today: "今日の統計をリセットしました",
    alert_clear_all: "全データを消去しました",
    confirm_clear_all: "全ての統計と間違い記録を消去しますか？",
    please_answer: "先に答えてください！",
    please_input: "答えを入力してください",
    ready: "準備中...",
    finish_done: "完了！所要時間 ",
    finish_acc: "、正解率 ",
    data_error: "データの読み込みに失敗しました。HTTPサーバー経由でアクセスしてください",
  },
  en: {
    title: "Kana Trainer",
    subtitle: "Practice kana and daily words",
    content_label: "Content (multi-select)",
    content_kana: "50 Kana",
    content_word: "Daily Words",
    content_kanji: "Kanji Words",
    content_wrong: "Wrong First",
    group_kana_title: "Kana Settings",
    group_word_title: "Daily Words Settings",
    group_kanji_title: "Kanji Words Settings",
    mode_type: "Mode",
    set_label: "Set",
    kana_mode_label: "Kana Mode",
    session_size_label: "Questions",
    other_options: "Options",
    kana_hira: "Hiragana",
    kana_kata: "Katakana",
    mode_rm_mc: "Romaji → Kana",
    mode_jp_mc: "Kana → Romaji",
    mode_rm_in: "Romaji Input",
    mode_jp_in: "Kana Input",
    mode_rm_mean: "Reading → Meaning",
    mode_mean_rm: "Meaning → Reading",
    mode_kanji_read: "Kanji → Reading",
    mode_read_kanji: "Reading → Kanji",
    mode_kanji_mean: "Kanji → Meaning",
    set_seion: "Seion",
    set_dakuon: "Dakuon",
    set_handakuon: "Handakuon",
    set_yoon: "Yōon",
    start_btn: "Start Practice",
    hide_meaning: "Hide Meanings",
    reset_settings: "Reset Settings",
    reset_today: "Reset Today",
    clear_all: "Clear All",
    today_label: "Today: ",
    today_unit: " Q",
    correct_label: "Correct: ",
    wrong_label: "Wrong: ",
    done_label: "Done: ",
    rounds_unit: " rounds",
    round_prefix: "Round ",
    round_suffix: "",
    btn_back: "Exit",
    btn_next: "Next",
    btn_speak: "Play Audio",
    btn_check: "Submit",
    btn_show: "Show Answer",
    btn_finish: "Finish",
    q_what_meaning: " — what does it mean?",
    q_how_read_meaning: "\" — how to read?",
    q_how_read_meaning_pre: "\"",
    q_how_read: " — how to read?",
    q_kanji_of: " — which kanji?",
    q_kana_of: " — which kana?",
    q_writing_of: " — how to write?",
    input_kana: "Type kana",
    input_romaji: "Type romaji",
    input_placeholder: "Type answer",
    result_correct: "Correct: ",
    result_wrong: "Wrong. Answer: ",
    result_wrong2: "Wrong. Answer: ",
    result_answer: "Answer: ",
    meaning_label: "Meaning: ",
    meaning_hidden: "Meaning: ***",
    alert_reset_settings: "Settings reset",
    alert_reset_today: "Today's stats reset",
    alert_clear_all: "All data cleared",
    confirm_clear_all: "Clear all stats and wrong records?",
    please_answer: "Please answer first!",
    please_input: "Please type an answer",
    ready: "Ready...",
    finish_done: "Done! Time: ",
    finish_acc: ", Accuracy: ",
    data_error: "Failed to load data. Please access via HTTP server (e.g. GitHub Pages or local server)",
  },
};

const LANG_KEY = "kana_quiz_lang";
let currentLang = localStorage.getItem(LANG_KEY) || "zh-CN";

export function t(key, ...params) {
  const dict = LANGS[currentLang] || LANGS["zh-CN"];
  let s = dict[key] ?? LANGS["zh-CN"][key] ?? key;
  params.forEach((p, i) => {
    s = s.replace(`{${i}}`, p);
  });
  return s;
}

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (!LANGS[lang]) return;
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  applyI18nDOM();
}

export function applyI18nDOM() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (el.tagName === "OPTION") {
      el.textContent = t(key);
    } else if (el.tagName === "INPUT" && el.type === "checkbox") {
      // checkbox label: set parent text node
    } else if (el.tagName === "LABEL") {
      // preserve checkbox inside label
      const cb = el.querySelector("input");
      if (cb) {
        const txt = t(key);
        el.textContent = "";
        el.appendChild(cb);
        el.append(" " + txt);
      } else {
        el.textContent = t(key);
      }
    } else {
      el.textContent = t(key);
    }
  });
  // Update page title
  document.title = t("title");
  // Update lang switcher active state
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
  });
}
