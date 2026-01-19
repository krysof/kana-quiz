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
  const pool = makeWeightedPool(pools, settings, stats);
  if (!pool.length) return null;

  const mode = chooseMode(settings);
  const correct = pickOne(pool);

  const q = { mode, correct };

  if (mode==="rm_mc" || mode==="jp_mc"){
    const pool2 = pool.filter(x=>x.rm !== correct.rm);
    const wrongs = shuffle(pool2).slice(0,3);
    const choices = shuffle([correct, ...wrongs]);
    q.choices = choices;
    q.correctIndex = choices.findIndex(x=>x.rm === correct.rm);
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
