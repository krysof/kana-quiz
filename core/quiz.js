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
  return { kana, word, all:[...kana, ...word] };
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
  const wantWrongBoost = settings.content.includes("wrong");

  // 决定本次出题类型：kana 或 word
  let sourcePool;
  if (wantKana && wantWord && pools.kana.length && pools.word.length) {
    // 两者都选时，kana 至少占 50%（保证足够练习）
    const pickKana = Math.random() < 0.5;
    sourcePool = pickKana ? pools.kana : pools.word;
  } else if (wantKana && pools.kana.length) {
    sourcePool = pools.kana;
  } else if (wantWord && pools.word.length) {
    sourcePool = pools.word;
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

  const mode = chooseMode(settings);
  const correct = pickOne(weighted);

  const q = { mode, correct };

  // 选择题需要干扰项，优先选字数相同的
  if (mode === "rm_mc" || mode === "jp_mc") {
    const allPool = [...pools.kana, ...pools.word];
    const pool2 = allPool.filter(x => x.rm !== correct.rm);

    // 按字数分组选择干扰项
    const correctLen = correct.hira.length;
    const sameLen = pool2.filter(x => x.hira.length === correctLen);
    const similarLen = pool2.filter(x => {
      const diff = Math.abs(x.hira.length - correctLen);
      return diff === 1; // 只差1个字
    });
    const otherLen = pool2.filter(x => {
      const diff = Math.abs(x.hira.length - correctLen);
      return diff > 1;
    });

    // 优先相同字数 → 相差1字 → 其他
    let wrongs = shuffle(sameLen).slice(0, 3);
    if (wrongs.length < 3) {
      const need = 3 - wrongs.length;
      wrongs = wrongs.concat(shuffle(similarLen).slice(0, need));
    }
    if (wrongs.length < 3) {
      const need = 3 - wrongs.length;
      wrongs = wrongs.concat(shuffle(otherLen).slice(0, need));
    }

    const choices = shuffle([correct, ...wrongs]);
    q.choices = choices;
    q.correctIndex = choices.findIndex(x => x.rm === correct.rm);
  }
  return q;
}

export function startSession(stats, size){
  stats.session = { active:true, size, done:0, ok:0, ng:0 };
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
    return { finished:true };
  }
  return { finished:false };
}
