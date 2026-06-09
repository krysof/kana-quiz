let voices = [];
let voicesLoaded = false;
let ttsReady = false;

const EDGE_JA_VOICE_KEYWORDS = [
  // Edge / Microsoft online neural voices, when exposed by the browser
  "nanami",
  "keita",
  "online",
  "natural",
  "microsoft",
  "edge",
  // Windows / Microsoft Japanese fallback voices
  "haruka",
  "ichiro",
  "ayumi",
];

// 预加载语音
function loadVoices() {
  voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    voicesLoaded = true;
  }
}

if ("speechSynthesis" in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

// 预热 TTS（需要用户交互后调用）
export function warmupTTS() {
  if (!("speechSynthesis" in window)) return;
  if (ttsReady) return;

  // 先取消，再说一个空内容来预热
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance("");
  u.volume = 0;
  speechSynthesis.speak(u);
  ttsReady = true;
}

function getAvailableVoices() {
  if (!("speechSynthesis" in window)) return [];
  const vs = speechSynthesis.getVoices();
  if (vs.length) {
    voices = vs;
    voicesLoaded = true;
  }
  return voicesLoaded ? voices : vs;
}

function scoreJapaneseVoice(v) {
  const lang = (v.lang || "").toLowerCase();
  if (!lang.startsWith("ja")) return -1;

  const name = `${v.name || ""} ${v.voiceURI || ""}`.toLowerCase();
  let score = 10;

  // Prefer Edge/Microsoft Japanese voices if the browser exposes them.
  EDGE_JA_VOICE_KEYWORDS.forEach((kw, idx) => {
    if (name.includes(kw)) score += 100 - idx * 6;
  });

  if (v.localService === false) score += 8; // online voices usually sound more natural
  if (v.default) score += 2;
  return score;
}

function pickJapaneseVoice() {
  const vs = getAvailableVoices();
  return vs
    .map(v => ({ voice: v, score: scoreJapaneseVoice(v) }))
    .filter(x => x.score >= 0)
    .sort((a, b) => b.score - a.score)[0]?.voice || null;
}

export function speakJP(text) {
  if (!("speechSynthesis" in window)) return;
  if (!text) return;

  // 取消之前的语音
  speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);

  // 优先使用 Edge/Microsoft 日语语音；没有则回退任意日语语音
  const ja = pickJapaneseVoice();
  if (ja) u.voice = ja;
  u.lang = ja?.lang || "ja-JP";
  u.rate = ja && /online|natural|nanami|keita/i.test(`${ja.name} ${ja.voiceURI}`) ? 1.0 : 0.9;

  speechSynthesis.speak(u);
}
