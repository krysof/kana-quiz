let voices = [];
let voicesLoaded = false;
let ttsReady = false;

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

export function speakJP(text) {
  if (!("speechSynthesis" in window)) return;
  if (!text) return;

  // 取消之前的语音
  speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);

  // 查找日语语音
  const vs = speechSynthesis.getVoices();
  const ja = vs.find(v => (v.lang || "").toLowerCase().startsWith("ja"));
  if (ja) u.voice = ja;
  u.lang = ja?.lang || "ja-JP";
  u.rate = 0.9;

  speechSynthesis.speak(u);
}
