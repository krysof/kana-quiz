"""Add multilingual variants to data/grammar_topics.json.

Adds:
  topic.title / subtitle: +_zh_TW, +_ja, +_en
  section.text (intro/heading/rule/note): +_zh_TW, +_ja, +_en
  section.items (steps): +items_zh_TW, +items_ja, +items_en
  verb_list item.cn: +cn_zh_TW, +cn_ja, +cn_en
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILE = ROOT / "data" / "grammar_topics.json"

# Topic-level translations keyed by title (zh-CN)
TOPIC = {
    "动词分组（グループ）": {
        "title_zh_TW": "動詞分組（グループ）",
        "title_ja": "動詞のグループ分類",
        "title_en": "Verb Groups",
        "subtitle_zh_TW": "日語動詞三大類 I・II・III",
        "subtitle_ja": "日本語動詞の三分類 I・II・III",
        "subtitle_en": "The three Japanese verb groups: I / II / III",
    },
}

# Section text translations, keyed by zh-CN text
SEC_TEXT = {
    "日语动词根据「ます」前的假名属于哪一段（い段・え段）分为三组，是所有动词变形的基础。": {
        "zh_TW": "日語動詞根據「ます」前的假名屬於哪一段（い段・え段）分為三組，是所有動詞變形的基礎。",
        "ja": "日本語の動詞は「ます」の直前の音がどの段（い段・え段）かで三つのグループに分かれ、すべての活用の基礎になります。",
        "en": "Japanese verbs split into three groups based on the kana before ます (い-row vs. え-row). This is the foundation for every conjugation.",
    },
    "I グループ（五段动词）": {
        "zh_TW": "I グループ（五段動詞）",
        "ja": "I グループ（五段動詞）",
        "en": "Group I (Godan verbs)",
    },
    "ます前是 <b>い段</b> 的音（き・し・ち・に・ひ・み・り・ぎ・び・ぴ 等）": {
        "zh_TW": "ます前是 <b>い段</b> 的音（き・し・ち・に・ひ・み・り・ぎ・び・ぴ 等）",
        "ja": "ます の前が <b>い段</b> の音（き・し・ち・に・ひ・み・り・ぎ・び・ぴ など）",
        "en": "Before ます is an <b>i-row</b> kana (き・し・ち・に・ひ・み・り・ぎ・び・ぴ etc.)",
    },
    "II グループ（一段动词）": {
        "zh_TW": "II グループ（一段動詞）",
        "ja": "II グループ（一段動詞）",
        "en": "Group II (Ichidan verbs)",
    },
    "ます前是 <b>え段</b>（e-masu）": {
        "zh_TW": "ます前是 <b>え段</b>（e-masu）",
        "ja": "ます の前が <b>え段</b>（e-masu）",
        "en": "Before ます is an <b>e-row</b> kana (e-masu)",
    },
    "⚠️ 例外：ます前是 <b>い段</b> 但属于 II 组（i-masu 但是一段动词）": {
        "zh_TW": "⚠️ 例外：ます前是 <b>い段</b> 但屬於 II 組（i-masu 但是一段動詞）",
        "ja": "⚠️ 例外：ます の前が <b>い段</b> でも II グループ（i-masu でも一段動詞）",
        "en": "⚠️ Exception: ends in い-row but still Group II (i-masu yet ichidan)",
    },
    "这些词最容易混淆，必须单独记忆。": {
        "zh_TW": "這些詞最容易混淆，必須單獨記憶。",
        "ja": "これらは最も紛らわしく、個別に覚える必要があります。",
        "en": "These are the easiest to confuse — memorize them individually.",
    },
    "III グループ（不规则动词）": {
        "zh_TW": "III グループ（不規則動詞）",
        "ja": "III グループ（不規則動詞）",
        "en": "Group III (Irregular verbs)",
    },
    "只有 <b>来ます</b> 和 <b>します</b> 两个，以及「名词+します」的复合动词。": {
        "zh_TW": "只有 <b>来ます</b> 和 <b>します</b> 兩個，以及「名詞+します」的複合動詞。",
        "ja": "<b>来ます</b> と <b>します</b> の二つ、および「名詞+します」の複合動詞のみ。",
        "en": "Only <b>来ます</b> and <b>します</b>, plus 'noun + します' compound verbs.",
    },
    "快速判断方法": {
        "zh_TW": "快速判斷方法",
        "ja": "素早く見分けるコツ",
        "en": "Quick identification steps",
    },
}

# Steps items (list of strings → translations)
STEPS_ITEMS = {
    "看 <b>ます</b> 前面一个字是什么段：": {
        "zh_TW": "看 <b>ます</b> 前面一個字是什麼段：",
        "ja": "<b>ます</b> の直前の音が何段か見る：",
        "en": "Check which row the kana right before <b>ます</b> belongs to:",
    },
    "① <b>え段</b>（たべ・ね・で...）→ <b>II 组</b>": {
        "zh_TW": "① <b>え段</b>（たべ・ね・で...）→ <b>II 組</b>",
        "ja": "① <b>え段</b>（たべ・ね・で…）→ <b>II グループ</b>",
        "en": "① <b>e-row</b> (たべ / ね / で …) → <b>Group II</b>",
    },
    "② <b>い段</b> 且不是 III 组 → 通常是 <b>I 组</b>": {
        "zh_TW": "② <b>い段</b> 且不是 III 組 → 通常是 <b>I 組</b>",
        "ja": "② <b>い段</b> で III でなければ → たいてい <b>I グループ</b>",
        "en": "② <b>i-row</b> and not Group III → usually <b>Group I</b>",
    },
    "③ 但 み/い/あび/かり/おき/き/おり/でき 这些 i-masu 是 <b>II 组例外</b>": {
        "zh_TW": "③ 但 み/い/あび/かり/おき/き/おり/でき 這些 i-masu 是 <b>II 組例外</b>",
        "ja": "③ ただし み／い／あび／かり／おき／き／おり／でき などの i-masu は <b>II グループ例外</b>",
        "en": "③ But み / い / あび / かり / おき / き / おり / でき (i-masu) → <b>Group II exceptions</b>",
    },
    "④ <b>します・きます</b> → <b>III 组</b>": {
        "zh_TW": "④ <b>します・きます</b> → <b>III 組</b>",
        "ja": "④ <b>します・きます</b> → <b>III グループ</b>",
        "en": "④ <b>します / きます</b> → <b>Group III</b>",
    },
}

# Verb meanings: zh-CN → (zh_TW, ja, en)
VERB_CN = {
    "见面": ("見面", "会う", "meet"),
    "买": ("買", "買う", "buy"),
    "等": ("等", "待つ", "wait"),
    "站立": ("站立", "立つ", "stand"),
    "拿/取": ("拿/取", "取る", "take"),
    "回": ("回", "帰る", "return"),
    "呼叫": ("呼叫", "呼ぶ", "call"),
    "玩": ("玩", "遊ぶ", "play"),
    "读": ("讀", "読む", "read"),
    "喝": ("喝", "飲む", "drink"),
    "写": ("寫", "書く", "write"),
    "去": ("去", "行く", "go"),
    "赶快": ("趕快", "急ぐ", "hurry"),
    "游泳": ("游泳", "泳ぐ", "swim"),
    "说话": ("說話", "話す", "speak"),
    "推/按": ("推/按", "押す", "push"),
    "吃": ("吃", "食べる", "eat"),
    "睡": ("睡", "寝る", "sleep"),
    "出/出发": ("出/出發", "出る", "go out / leave"),
    "打开/安装": ("打開/安裝", "つける", "turn on / attach"),
    "开（门窗）": ("開（門窗）", "開ける", "open (door/window)"),
    "调查/查": ("調查/查", "調べる", "look up / investigate"),
    "丢弃": ("丟棄", "捨てる", "throw away"),
    "给...看": ("給…看", "見せる", "show"),
    "看": ("看", "見る", "watch"),
    "在（生物）": ("在（生物）", "いる", "be (animate)"),
    "冲（澡）": ("沖（澡）", "浴びる", "shower"),
    "借入": ("借入", "借りる", "borrow"),
    "起床": ("起床", "起きる", "wake up"),
    "穿（上衣）": ("穿（上衣）", "着る", "wear (upper body)"),
    "下（车）": ("下（車）", "降りる", "get off"),
    "会/能": ("會/能", "できる", "can do"),
    "来（来る）": ("來（来る）", "来る", "come"),
    "做（する）": ("做（する）", "する", "do"),
    "学习": ("學習", "勉強する", "study"),
    "说明": ("說明", "説明する", "explain"),
}


def apply_topic(topic):
    patches = TOPIC.get(topic.get("title"))
    if patches:
        for k, v in patches.items():
            topic.setdefault(k, v)


def apply_section(sec):
    t = sec.get("type")
    if t in ("intro", "heading", "rule", "note"):
        txt = sec.get("text")
        tr = SEC_TEXT.get(txt)
        if tr:
            sec.setdefault("text_zh_TW", tr["zh_TW"])
            sec.setdefault("text_ja", tr["ja"])
            sec.setdefault("text_en", tr["en"])
        elif txt:
            # Unmapped — print so we can add later
            print(f"[unmapped section text] {txt!r}")
    elif t == "steps":
        items = sec.get("items") or []
        tw, ja, en = [], [], []
        for s in items:
            tr = STEPS_ITEMS.get(s)
            if tr:
                tw.append(tr["zh_TW"]); ja.append(tr["ja"]); en.append(tr["en"])
            else:
                print(f"[unmapped step item] {s!r}")
                tw.append(s); ja.append(s); en.append(s)
        sec.setdefault("items_zh_TW", tw)
        sec.setdefault("items_ja", ja)
        sec.setdefault("items_en", en)
    elif t == "verb_list":
        for v in sec.get("items") or []:
            cn = v.get("cn")
            tr = VERB_CN.get(cn)
            if tr:
                v.setdefault("cn_zh_TW", tr[0])
                v.setdefault("cn_ja", tr[1])
                v.setdefault("cn_en", tr[2])
            elif cn:
                print(f"[unmapped verb cn] {cn!r}")


def main():
    data = json.loads(FILE.read_text(encoding="utf-8"))
    for topic in data:
        apply_topic(topic)
        for sec in topic.get("sections") or []:
            apply_section(sec)
    FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {FILE}")


if __name__ == "__main__":
    main()
