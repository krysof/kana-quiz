"""Rule-based explanation generator for JLPT questions.

For each question, emit a short Chinese explanation based on category:
- kanji_reading: 「<target>」读作「<correct>」。其他选项为干扰项。
- orthography : 「<target>」的汉字是「<correct>」。其他不是标准写法。
- context_vocab: 句中空白处应填「<correct>」。其他选项不符合上下文。
- paraphrase  : 「<target>」的近义表达是「<correct>」。
- usage       : 「<target>」的正确用法是「<正确句>」。其他句子用法有误。
- grammar     : 空白处应填「<correct>」，此语法点最符合句意。

Writes data/exp_<name>.json files with {id: explanation}.
"""
import json
import glob
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

# Helpers ---------------------------------------------------------------------

def _strip_quotes(s: str) -> str:
    return s.replace("「", "").replace("」", "").replace('"', "")


def reading_expl(q: dict) -> str:
    target = q.get("target", "")
    correct = q["options"][q["answer"]]
    return f"「{target}」读作「{correct}」。注意与其他干扰读音的区分。"


def orthography_expl(q: dict) -> str:
    target = q.get("target", "")
    correct = q["options"][q["answer"]]
    wrongs = [o for i, o in enumerate(q["options"]) if i != q["answer"]]
    wrongs_s = "、".join(f"「{w}」" for w in wrongs[:3])
    return f"「{target}」的汉字写法是「{correct}」。{wrongs_s}不是标准的汉字表记。"


def context_vocab_expl(q: dict) -> str:
    correct = q["options"][q["answer"]]
    wrongs = [o for i, o in enumerate(q["options"]) if i != q["answer"]]
    wrongs_s = "、".join(f"「{w}」" for w in wrongs[:3])
    return f"根据句意，空白处应填「{correct}」。{wrongs_s}在此语境下不自然。"


def paraphrase_expl(q: dict) -> str:
    target = q.get("target", "")
    correct = q["options"][q["answer"]]
    if target:
        return f"「{target}」的近义表达是「{correct}」，两者意思最接近。"
    return f"与原句意最接近的表达是「{correct}」。"


def usage_expl(q: dict) -> str:
    target = q.get("target", "")
    correct_sent = q["options"][q["answer"]]
    # Trim long sentences
    if len(correct_sent) > 30:
        correct_sent = correct_sent[:28] + "…"
    return f"「{target}」的正确用法见句 {q['answer']+1}「{correct_sent}」。其他句子与该词的语义或搭配不符。"


def grammar_expl(q: dict) -> str:
    correct = q["options"][q["answer"]]
    wrongs = [o for i, o in enumerate(q["options"]) if i != q["answer"]]
    wrongs_s = "、".join(f"「{w}」" for w in wrongs[:3])
    return f"空白处应填「{correct}」，此语法点最符合句意。{wrongs_s}在此语境下语法或含义不对。"


GENERATORS = {
    "kanji_reading": reading_expl,
    "orthography": orthography_expl,
    "context_vocab": context_vocab_expl,
    "paraphrase": paraphrase_expl,
    "usage": usage_expl,
    "grammar": grammar_expl,
}


def main() -> None:
    files = sorted(DATA.glob("n*_q_*.json"))
    total = 0
    for f in files:
        # Skip exp_ files (produced by us) — pattern already filters
        questions = json.loads(f.read_text(encoding="utf-8"))
        out = {}
        for q in questions:
            cat = q.get("cat", "")
            gen = GENERATORS.get(cat)
            if not gen:
                continue
            try:
                out[str(q["id"])] = gen(q)
            except Exception as e:
                print(f"skip {f.name} id={q.get('id')}: {e}")
        exp_path = DATA / f"exp_{f.name}"
        exp_path.write_text(
            json.dumps(out, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"{f.name}: {len(out)}/{len(questions)} explanations")
        total += len(out)
    print(f"\nTotal: {total}")


if __name__ == "__main__":
    main()
