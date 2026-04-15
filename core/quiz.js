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
  const wantSets = (settings.kanaSets?.length ? settings.kanaSets : ["seion"]);
  const setAllow = new Set(wantSets);

  const kana = db.kana
    .filter(x => setAllow.has(x.set || "seion"))
    .map(x => ({ ...x, type:"kana" }));

  const word = db.words.map(x => ({ ...x, type:"word" }));
  const kanji = (db.kanji || []).map(x => ({ ...x, type:"kanji" }));
  const n2 = (db.n2 || []).map(x => ({ ...x, type:"n2" }));
  return { kana, word, kanji, n2, all:[...kana, ...word, ...kanji, ...n2] };
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

export function newQuestion(db, settings, stats){
  const pools = buildPools(db, settings);
  const wantKana = settings.content.includes("kana");
  const wantWord = settings.content.includes("word");
  const wantKanji = settings.content.includes("kanji");
  const wantN2 = settings.content.includes("n2");
  const wantWrongBoost = settings.wrongFirst === true;

  // Decide source pool
  let sourcePool;
  const candidates = [];
  if (wantKana && pools.kana.length) candidates.push(pools.kana);
  if (wantWord && pools.word.length) candidates.push(pools.word);
  if (wantKanji && pools.kanji.length) candidates.push(pools.kanji);
  if (wantN2 && pools.n2.length) candidates.push(pools.n2);

  if (candidates.length > 0) {
    sourcePool = candidates[Math.floor(Math.random() * candidates.length)];
  } else {
    sourcePool = pools.all;
  }

  // Build weighted pool (wrong-first boost)
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

  // Pool availability
  const hasKana = pools.kana.length > 0 && wantKana;
  const hasWord = pools.word.length > 0 && wantWord;
  const hasKanji = pools.kanji.length > 0 && wantKanji;
  const hasN2 = pools.n2.length > 0 && wantN2;
  const hasKanjiLike = hasKanji || hasN2;

  // Auto-adapt mode to available pools
  if (kanjiModes.includes(mode) && !hasKanjiLike) {
    mode = hasWord ? pickOne(wordModes) : "jp_mc";
  }
  if (wordModes.includes(mode) && !hasWord && !hasKanjiLike) {
    mode = "jp_mc";
  }
  // mean_rm can also work with kanjiLike items
  if (mode === "mean_rm" && !hasWord && hasKanjiLike) {
    mode = pickOne(kanjiModes);
  }
  if (kanaModes.includes(mode) && !hasKana && !hasWord && hasKanjiLike) {
    mode = pickOne(kanjiModes);
  }

  // Force correct pool for mode
  let finalWeighted = weighted;
  if (wordModes.includes(mode)) {
    finalWeighted = weighted.filter(x => x.type === "word");
    if (!finalWeighted.length) finalWeighted = pools.word.length ? pools.word : weighted;
  }

  if (kanjiModes.includes(mode)) {
    finalWeighted = weighted.filter(x => x.type === "kanji" || x.type === "n2");
    if (!finalWeighted.length) {
      const kanjiLikePool = [...pools.kanji, ...pools.n2];
      finalWeighted = kanjiLikePool.length ? kanjiLikePool : weighted;
    }
  }

  const correct = pickOne(finalWeighted);

  const q = { mode, correct };

  // Combined kanji-like pool for distractors
  const kanjiLikePool = [...pools.kanji, ...pools.n2];

  // === Choice generation ===

  if (mode === "rm_mc" || mode === "jp_mc") {
    const allPool = [...pools.kana, ...pools.word];
    const pool2 = allPool.filter(x => x.rm !== correct.rm);

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

  if (mode === "kanji_read") {
    const pool2 = kanjiLikePool.filter(x => x.rm !== correct.rm && x.hira !== correct.hira);
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
      const tier = scored.filter(x => x.score >= minScore && !used.has(x.item.hira));
      const picks = shuffle(tier).slice(0, 3 - wrongs.length);
      for (const p of picks) {
        wrongs.push(p.item);
        used.add(p.item.hira);
      }
    }

    const choices = shuffle([correct, ...wrongs]);
    q.choices = choices;
    q.correctIndex = choices.findIndex(x => x.rm === correct.rm);
  }

  if (mode === "read_kanji") {
    const pool2 = kanjiLikePool.filter(x => x.rm !== correct.rm && x.kanji !== correct.kanji);
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
      const tier = scored.filter(x => x.score >= minScore && !used.has(x.item.kanji));
      const picks = shuffle(tier).slice(0, 3 - wrongs.length);
      for (const p of picks) {
        wrongs.push(p.item);
        used.add(p.item.kanji);
      }
    }

    const choices = shuffle([correct, ...wrongs]);
    q.choices = choices;
    q.correctIndex = choices.findIndex(x => x.rm === correct.rm);
  }

  if (mode === "kanji_mean") {
    const pool2 = kanjiLikePool.filter(x => x.rm !== correct.rm && x.meaning !== correct.meaning);
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
      const tier = scored.filter(x => x.score >= minScore && !used.has(x.item.meaning));
      const picks = shuffle(tier).slice(0, 3 - wrongs.length);
      for (const p of picks) {
        wrongs.push(p.item);
        used.add(p.item.meaning);
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
    stats.daily.rounds = stats.session.round;
    return { finished:true };
  }
  return { finished:false };
}
