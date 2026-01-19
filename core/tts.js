export function speakJP(text){
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  const vs = speechSynthesis.getVoices();
  const ja = vs.find(v => (v.lang||"").toLowerCase().startsWith("ja"));
  if (ja) u.voice = ja;
  u.lang = ja?.lang || "ja-JP";
  u.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
