#!/usr/bin/env python3
"""Generate a supplemental furigana dictionary from local JLPT data.

The app already knows readings for kana/kanji word cards and for JLPT
kanji-reading / orthography targets.  This script fills the remaining gap:
ordinary kanji words that appear inside JLPT sentences/options, including
inflected grammar sentences such as "忘れない" or "貯めています".

Requires pykakasi (already available in the dev environment).
"""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

from pykakasi import kakasi


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUT = DATA / "furigana_extra.json"

KANJI_RE = re.compile(r"[\u4e00-\u9fff々]")
JP_RE = re.compile(r"[\u3040-\u30ff\u4e00-\u9fff々]")
KANA_ANY_RE = re.compile(r"[\u3040-\u30ff]")
KANA_RE = re.compile(r"^[\u3040-\u30ffー]+$")

# pykakasi sometimes groups a following particle with the preceding word
# (e.g. "彼は" -> "かれは").  Keep verb/adjective inflection tails, but trim
# obvious particles so the ruby stays on the kanji word itself.
TRAILING_PARTICLES = set("はがをにへでともやかの")

# Hand corrections / higher-priority common expressions that are frequently
# misread when split into single kanji by automatic conversion.
MANUAL = {
    "お金": "おかね",
    "今日": "きょう",
    "明日": "あした",
    "昨日": "きのう",
    "一人": "ひとり",
    "二人": "ふたり",
    "大人": "おとな",
    "上手": "じょうず",
    "下手": "へた",
    "部屋": "へや",
    "紅葉": "こうよう",
    # Single-kanji verb stems seen before grammar blanks.  Automatic conversion
    # tends to read these as on-yomi when the following inflection is hidden.
    "着": "き",
    "来": "く",
    "見": "み",
    "出": "で",
    "忘": "わす",
}


def has_kanji(s: str) -> bool:
    return bool(KANJI_RE.search(s or ""))


def is_japanese_text(s: str) -> bool:
    return bool(JP_RE.search(s or ""))


def hira_for(s: str) -> str:
    return s.translate(str.maketrans({
        "ァ": "ぁ", "ア": "あ", "ィ": "ぃ", "イ": "い", "ゥ": "ぅ", "ウ": "う",
        "ェ": "ぇ", "エ": "え", "ォ": "ぉ", "オ": "お", "カ": "か", "ガ": "が",
        "キ": "き", "ギ": "ぎ", "ク": "く", "グ": "ぐ", "ケ": "け", "ゲ": "げ",
        "コ": "こ", "ゴ": "ご", "サ": "さ", "ザ": "ざ", "シ": "し", "ジ": "じ",
        "ス": "す", "ズ": "ず", "セ": "せ", "ゼ": "ぜ", "ソ": "そ", "ゾ": "ぞ",
        "タ": "た", "ダ": "だ", "チ": "ち", "ヂ": "ぢ", "ッ": "っ", "ツ": "つ",
        "ヅ": "づ", "テ": "て", "デ": "で", "ト": "と", "ド": "ど", "ナ": "な",
        "ニ": "に", "ヌ": "ぬ", "ネ": "ね", "ノ": "の", "ハ": "は", "バ": "ば",
        "パ": "ぱ", "ヒ": "ひ", "ビ": "び", "ピ": "ぴ", "フ": "ふ", "ブ": "ぶ",
        "プ": "ぷ", "ヘ": "へ", "ベ": "べ", "ペ": "ぺ", "ホ": "ほ", "ボ": "ぼ",
        "ポ": "ぽ", "マ": "ま", "ミ": "み", "ム": "む", "メ": "め", "モ": "も",
        "ャ": "ゃ", "ヤ": "や", "ュ": "ゅ", "ユ": "ゆ", "ョ": "ょ", "ヨ": "よ",
        "ラ": "ら", "リ": "り", "ル": "る", "レ": "れ", "ロ": "ろ", "ヮ": "ゎ",
        "ワ": "わ", "ヰ": "ゐ", "ヱ": "ゑ", "ヲ": "を", "ン": "ん", "ヴ": "ゔ",
    }))


def normalize_entries(orig: str, hira: str) -> list[tuple[str, str]]:
    orig = (orig or "").strip()
    hira = hira_for((hira or "").strip())
    if not orig or not hira or not has_kanji(orig):
        return []
    if not KANA_RE.match(hira):
        return []

    out: list[tuple[str, str]] = [(orig, hira)]

    # Trim one trailing particle if pykakasi attached it to a kanji word.
    # Keep the exact chunk too; it is needed for verb stems such as 下がって
    # where "下が" is not a particle attachment.  The app prefers longer
    # matches, so exact inflected chunks prevent ambiguous single-kanji
    # readings from taking over.
    if len(orig) >= 2 and orig[-1] in TRAILING_PARTICLES and hira.endswith(orig[-1]):
        trimmed_orig = orig[:-1]
        trimmed_hira = hira[:-1]
        if has_kanji(trimmed_orig) and trimmed_hira:
            out.append((trimmed_orig, trimmed_hira))

    # Also handle "漢字から/まで/より" style chunks conservatively.
    for particle in ("から", "まで", "より"):
        if orig.endswith(particle) and hira.endswith(particle) and has_kanji(orig[:-len(particle)]):
            out.append((orig[:-len(particle)], hira[:-len(particle)]))
            break

    return [(o, h) for o, h in out if o and h and has_kanji(o)]


def collect_strings(obj):
    """Yield Japanese strings from question-like JSON structures."""
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key in {
                "sentence", "target", "question", "jp",
            }:
                if isinstance(value, str) and is_japanese_text(value):
                    yield value
            elif key.endswith("_ja") or key in {"title_ja", "subtitle_ja", "text_ja", "rule_ja", "note_ja"}:
                if isinstance(value, str) and is_japanese_text(value):
                    yield value
            elif key in {"title", "subtitle", "text", "rule", "note"}:
                # These defaults are Simplified Chinese in grammar_topics.json.
                # Only treat them as Japanese when they actually contain kana.
                if isinstance(value, str) and KANA_ANY_RE.search(value):
                    yield value
            elif key == "options" and isinstance(value, list):
                for item in value:
                    if isinstance(item, str) and is_japanese_text(item):
                        yield item
                    elif isinstance(item, dict):
                        yield from collect_strings(item)
            elif key in {"verbs", "steps", "sections", "practice", "items"}:
                yield from collect_strings(value)
    elif isinstance(obj, list):
        for item in obj:
            yield from collect_strings(item)


def source_files() -> list[Path]:
    files = []
    files.extend(DATA.glob("n[1-5]_q*.json"))
    files.append(DATA / "grammar_topics.json")
    return sorted({p for p in files if p.exists() and not p.name.startswith(("exp_", "tl_"))})


def main() -> None:
    kk = kakasi()
    readings: dict[str, Counter[str]] = defaultdict(Counter)

    for kanji, reading in MANUAL.items():
        readings[kanji][reading] += 1_000_000

    for path in source_files():
        data = json.loads(path.read_text(encoding="utf-8"))
        for text in collect_strings(data):
            for chunk in kk.convert(text):
                for surface, reading in normalize_entries(chunk.get("orig", ""), chunk.get("hira", "")):
                    readings[surface][reading] += 1

    # Pick the most frequent reading for duplicate surfaces.  Manual entries
    # have huge weights so they win over automatic readings.
    result = {
        surface: counter.most_common(1)[0][0]
        for surface, counter in readings.items()
        if surface and counter
    }
    result = dict(sorted(result.items(), key=lambda kv: (-len(kv[0]), kv[0])))

    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)} with {len(result)} entries")


if __name__ == "__main__":
    main()
