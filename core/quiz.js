const ROMAJI_ALIAS = { si:"shi", ti:"chi", tu:"tsu", hu:"fu", nn:"n" };

export function normalizeRomaji(s){
  const t = s.trim().toLowerCase();
  return ROMAJI_ALIAS[t] || t;
}

export function pct(ok, total){
  if (!total) return "0%";
  return `${Math.round((ok/total)*100)}%`;
}

export function idOf(item){
  return `${item.type}:${item.rm}:${item.hira}`;
}

export function buildPools(db, settings){
  // ✅ 50音按集合过滤：seion / dakuon / handakuon
  const wantSets = (settings.kanaSets?.length ? settings.kanaSets : ["seion"]);
  const setAllow = new Set(wantSets);

  const kana = db.kana
    .filter(x => setAllow.has(x.set || "seion"))
    .map(x => ({ ...x, type:"kana" }));

  const word = db.words.map(x => ({ ...x, type:"word" }));
  const kanji = (db.kanji || []).map(x => ({ ...x, type:"kanji" }));
  return { kana, word, kanji, all:[...kana, ...word, ...kanji] };
}

function pickOne(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr){
  const a = arr.slice();
  for (let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

export function chooseMode(settings){
  const ms = settings.modes?.length ? settings.modes : ["rm_mc","jp_mc"];
  return pickOne(ms);
}

export function makeWeightedPool(pools, settings, stats){
  const wantWrongBoost = settings.content.includes("wrong");
  const wantKana = settings.content.includes("kana");
  const wantWord = settings.content.includes("word");

  let base = [];
  if (wantKana) base = base.concat(pools.kana);
  if (wantWord) base = base.concat(pools.word);
  if (!base.length) base = pools.all;

  const weighted = [];
  for (const it of base){
    const w = stats.wrong[idOf(it)] || 0;

    // 保底一次：所有题都有机会出现
    weighted.push(it);

    // 错题权重：勾“错题优先”更强
    if (w > 0){
      const extra = wantWrongBoost ? Math.min(12, w * 3) : Math.min(4, w);
      for (let i=0;i<extra;i++) weighted.push(it);
    }
  }
  return weighted;
}

export function newQuestion(db, settings, stats){
  const pools = buildPools(db, settings);
  const wantKana = settings.content.includes("kana");
  const wantWord = settings.content.includes("word");
  const wantKanji = settings.content.includes("kanji");
  const wantWrongBoost = settings.content.includes("wrong");

  // 决定本次出题类型：kana / word / kanji
  let sourcePool;
  const candidates = [];
  if (wantKana && pools.kana.length) candidates.push(pools.kana);
  if (wantWord && pools.word.length) candidates.push(pools.word);
  if (wantKanji && pools.kanji.length) candidates.push(pools.kanji);

  if (candidates.length > 0) {
    sourcePool = candidates[Math.floor(Math.random() * candidates.length)];
  } else {
    sourcePool = pools.all;
  }

  // 构建加权池（错题优先）
  const weighted = [];
  for (const it of sourcePool) {
    const w = stats.wrong[idOf(it)] || 0;
    weighted.push(it);
    if (w > 0) {
      const extra = wantWrongBoost ? Math.min(12, w * 3) : Math.min(4, w);
      for (let i = 0; i < extra; i++) weighted.push(it);
    }
  }

  if (!weighted.length) return null;

  const kanjiModes = ["kanji_read", "read_kanji", "kanji_mean"];
  const wordModes = ["rm_mean", "mean_rm"];
  const kanaModes = ["rm_mc", "jp_mc", "rm_in", "jp_in"];

  let mode = chooseMode(settings);

  // 题型与内容池不匹配时自动适配
  const hasKana = pools.kana.length > 0 && wantKana;
  const hasWord = pools.word.length > 0 && wantWord;
  const hasKanji = pools.kanji.length > 0 && wantKanji;

  // kanji 题型需要 kanji 池
  if (kanjiModes.includes(mode) && !hasKanji) {
    mode = hasWord ? pickOne(wordModes) : "jp_mc";
  }
  // word 题型需要 word 池
  if (wordModes.includes(mode) && !hasWord) {
    mode = hasKanji ? pickOne(kanjiModes) : "jp_mc";
  }
  // kana 题型遇到纯 kanji 内容时，切换到 kanji 题型
  if (kanaModes.includes(mode) && !hasKana && !hasWord && hasKanji) {
    mode = pickOne(kanjiModes);
  }

  // rm_mean / mean_rm 强制从 word 池选题
  let finalWeighted = weighted;
  if (wordModes.includes(mode)) {
    finalWeighted = weighted.filter(x => x.type === "word");
    if (!finalWeighted.length) finalWeighted = pools.word.length ? pools.word : weighted;
  }

  // kanji 模式强制从 kanji 池选题
  if (kanjiModes.includes(mode)) {
    finalWeighted = weighted.filter(x => x.type === "kanji");
    if (!finalWeighted.length) finalWeighted = pools.kanji.length ? pools.kanji : weighted;
  }

  const correct = pickOne(finalWeighted);

  const q = { mode, correct };

  // 选择题需要干扰项
  if (mode === "rm_mc" || mode === "jp_mc") {
    const allPool = [...pools.kana, ...pools.word];
    const pool2 = allPool.filter(x => x.rm !== correct.rm);

    const correctLen = correct.hira.length;
    const correctFirst = correct.hira[0]; // 第一个假名

    // 评分函数：越高越好
    const score = (x) => {
      let s = 0;
      const lenDiff = Math.abs(x.hira.length - correctLen);
      // 字数相同 +10，相差1 +5
      if (lenDiff === 0) s += 10;
      else if (lenDiff === 1) s += 5;
      // 首字相同 +8（让选项更有迷惑性）
      if (x.hira[0] === correctFirst) s += 8;
      return s;
    };

    const scored = pool2.map(x => ({ item: x, score: score(x) }));
    scored.sort((a, b) => b.score - a.score);

    const wrongs = [];
    const used = new Set();
    const tiers = [18, 13, 10, 5, 0];
    for (const minScore of tiers) {
      if (wrongs.length >= 3) break;
      const tier = scored.filter(x => x.score >= minScore && !used.has(x.item.rm));
      const picks = shuffle(tier).slice(0, 3 - wrongs.length);
      for (const p of picks) {
        wrongs.push(p.item);
        used.add(p.item.rm);
      }
    }

    const choices = shuffle([correct, ...wrongs]);
    q.choices = choices;
    q.correctIndex = choices.findIndex(x => x.rm === correct.rm);
  }

  // 词义选择题：读音→选意思
  if (mode === "rm_mean") {
    const pool2 = pools.word.filter(x => x.rm !== correct.rm);
    const correctMeanLen = (correct.meaning || "").length;

    const score = (x) => {
      let s = 0;
      const lenDiff = Math.abs((x.meaning || "").length - correctMeanLen);
      if (lenDiff === 0) s += 10;
      else if (lenDiff === 1) s += 5;
      return s;
    };

    const scored = pool2.map(x => ({ item: x, score: score(x) }));
    scored.sort((a, b) => b.score - a.score);

    const wrongs = [];
    const used = new Set();
    const tiers = [10, 5, 0];
    for (const minScore of tiers) {
      if (wrongs.length >= 3) break;
      const tier = scored.filter(x => x.score >= minScore && !used.has(x.item.rm));
      const picks = shuffle(tier).slice(0, 3 - wrongs.length);
      for (const p of picks) {
        wrongs.push(p.item);
        used.add(p.item.rm);
      }
    }

    const choices = shuffle([correct, ...wrongs]);
    q.choices = choices;
    q.correctIndex = choices.findIndex(x => x.rm === correct.rm);
  }

  // 词义选择题：意思→选读音
  if (mode === "mean_rm") {
    const pool2 = pools.word.filter(x => x.rm !== correct.rm);
    const correctLen = correct.hira.length;
    const correctFirst = correct.hira[0];

    const score = (x) => {
      let s = 0;
      const lenDiff = Math.abs(x.hira.length - correctLen);
      if (lenDiff === 0) s += 10;
      else if (lenDiff === 1) s += 5;
      if (x.hira[0] === correctFirst) s += 8;
      return s;
    };

    const scored = pool2.map(x => ({ item: x, score: score(x) }));
    scored.sort((a, b) => b.score - a.score);

    const wrongs = [];
    const used = new Set();
    const tiers = [18, 13, 10, 5, 0];
    for (const minScore of tiers) {
      if (wrongs.length >= 3) break;
      const tier = scored.filter(x => x.score >= minScore && !used.has(x.item.rm));
      const picks = shuffle(tier).slice(0, 3 - wrongs.length);
      for (const p of picks) {
        wrongs.push(p.item);
        used.add(p.item.rm);
      }
    }

    const choices = shuffle([correct, ...wrongs]);
    q.choices = choices;
    q.correctIndex = choices.findIndex(x => x.rm === correct.rm);
  }

  // 汉字→选读音
  if (mode === "kanji_read") {
    const pool2 = pools.kanji.filter(x => x.rm !== correct.rm);
    const correctLen = correct.hira.length;
    const correctFirst = correct.hira[0];

    const score = (x) => {
      let s = 0;
      const lenDiff = Math.abs(x.hira.length - correctLen);
      if (lenDiff === 0) s += 10;
      else if (lenDiff === 1) s += 5;
      if (x.hira[0] === correctFirst) s += 8;
      return s;
    };

    const scored = pool2.map(x => ({ item: x, score: score(x) }));
    scored.sort((a, b) => b.score - a.score);

    const wrongs = [];
    const used = new Set();
    const tiers = [18, 13, 10, 5, 0];
    for (const minScore of tiers) {
      if (wrongs.length >= 3) break;
      const tier = scored.filter(x => x.score >= minScore && !used.has(x.item.rm));
      const picks = shuffle(tier).slice(0, 3 - wrongs.length);
      for (const p of picks) {
        wrongs.push(p.item);
        used.add(p.item.rm);
      }
    }

    const choices = shuffle([correct, ...wrongs]);
    q.choices = choices;
    q.correctIndex = choices.findIndex(x => x.rm === correct.rm);
  }

  // 读音→选汉字
  if (mode === "read_kanji") {
    const pool2 = pools.kanji.filter(x => x.rm !== correct.rm);
    const correctKanjiLen = correct.kanji.length;

    const score = (x) => {
      let s = 0;
      const lenDiff = Math.abs(x.kanji.length - correctKanjiLen);
      if (lenDiff === 0) s += 10;
      else if (lenDiff === 1) s += 5;
      return s;
    };

    const scored = pool2.map(x => ({ item: x, score: score(x) }));
    scored.sort((a, b) => b.score - a.score);

    const wrongs = [];
    const used = new Set();
    const tiers = [10, 5, 0];
    for (const minScore of tiers) {
      if (wrongs.length >= 3) break;
      const tier = scored.filter(x => x.score >= minScore && !used.has(x.item.rm));
      const picks = shuffle(tier).slice(0, 3 - wrongs.length);
      for (const p of picks) {
        wrongs.push(p.item);
        used.add(p.item.rm);
      }
    }

    const choices = shuffle([correct, ...wrongs]);
    q.choices = choices;
    q.correctIndex = choices.findIndex(x => x.rm === correct.rm);
  }

  // 汉字→选意思
  if (mode === "kanji_mean") {
    const pool2 = pools.kanji.filter(x => x.rm !== correct.rm);
    const correctMeanLen = (correct.meaning || "").length;

    const score = (x) => {
      let s = 0;
      const lenDiff = Math.abs((x.meaning || "").length - correctMeanLen);
      if (lenDiff === 0) s += 10;
      else if (lenDiff === 1) s += 5;
      return s;
    };

    const scored = pool2.map(x => ({ item: x, score: score(x) }));
    scored.sort((a, b) => b.score - a.score);

    const wrongs = [];
    const used = new Set();
    const tiers = [10, 5, 0];
    for (const minScore of tiers) {
      if (wrongs.length >= 3) break;
      const tier = scored.filter(x => x.score >= minScore && !used.has(x.item.rm));
      const picks = shuffle(tier).slice(0, 3 - wrongs.length);
      for (const p of picks) {
        wrongs.push(p.item);
        used.add(p.item.rm);
      }
    }

    const choices = shuffle([correct, ...wrongs]);
    q.choices = choices;
    q.correctIndex = choices.findIndex(x => x.rm === correct.rm);
  }

  return q;
}

export function startSession(stats, size){
  const round = (stats.daily.rounds || 0) + 1;
  stats.session = { active:true, size, done:0, ok:0, ng:0, round };
}

export function recordResult(stats, q, ok){
  stats.daily.total++;
  if (ok){ stats.daily.ok++; stats.daily.streak++; }
  else { stats.daily.ng++; stats.daily.streak=0; }

  if (stats.session.active){
    stats.session.done++;
    if (ok) stats.session.ok++;
    else stats.session.ng++;
  }

  if (!ok){
    const id = idOf(q.correct);
    stats.wrong[id] = (stats.wrong[id]||0) + 1;
  }

  if (stats.session.active && stats.session.done >= stats.session.size){
    stats.session.active = false;
    stats.daily.rounds = stats.session.round; // 完成时更新轮次
    return { finished:true };
  }
  return { finished:false };
}
