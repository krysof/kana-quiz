export const STORAGE_KEY = "kana_quiz_settings_v2";
export const STATS_KEY   = "kana_quiz_stats_v2";

export const DEFAULT_SETTINGS = {
  content: ["kana","word"],
  modes: ["rm_mc","jp_mc"],
  kanaMode: "hira",
  sessionSize: 20,
  kanaSets: ["seion"], // ✅ 默认只清音
  hideMeaning: false // 是否隐藏中文释义
};

export function loadSettings(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(DEFAULT_SETTINGS);
  try{
    const s = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_SETTINGS),
      ...s,
      content: Array.isArray(s.content) ? s.content : DEFAULT_SETTINGS.content,
      modes: Array.isArray(s.modes) ? s.modes : DEFAULT_SETTINGS.modes,
      kanaSets: Array.isArray(s.kanaSets) ? s.kanaSets : DEFAULT_SETTINGS.kanaSets,
      kanaMode: (s.kanaMode === "kata") ? "kata" : "hira",
      sessionSize: Number.isFinite(+s.sessionSize) ? +s.sessionSize : DEFAULT_SETTINGS.sessionSize,
      hideMeaning: s.hideMeaning === true,
    };
  }catch{
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(settings){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resetSettings(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
  return structuredClone(DEFAULT_SETTINGS);
}

function todayKey(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

export function loadStats(){
  const raw = localStorage.getItem(STATS_KEY);
  const fresh = {
    day: todayKey(),
    daily: { total:0, ok:0, ng:0, streak:0, rounds:0 },
    session: { active:false, size:20, done:0, ok:0, ng:0, round:0 },
    wrong: {} // id -> count
  };
  if (!raw) return fresh;
  try{
    const st = JSON.parse(raw);
    if (st.day !== todayKey()){
      st.day = todayKey();
      st.daily = { total:0, ok:0, ng:0, streak:0, rounds:0 };
    }
    st.daily ||= fresh.daily;
    st.daily.rounds ??= 0;
    st.session ||= fresh.session;
    st.session.round ??= 0;
    st.wrong ||= {};
    return st;
  }catch{
    return fresh;
  }
}

export function saveStats(stats){
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function resetDaily(stats){
  stats.day = todayKey();
  stats.daily = { total:0, ok:0, ng:0, streak:0, rounds:0 };
  saveStats(stats);
}

export function resetAllStats(){
  localStorage.removeItem(STATS_KEY);
}
