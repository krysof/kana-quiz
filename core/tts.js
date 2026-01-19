let voices = [];
let voicesLoaded = false;

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
