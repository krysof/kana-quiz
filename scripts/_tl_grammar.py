"""Add multilanguage fields (scene_en, usage_en, note_en, scene_ja, usage_ja, note_ja,
scene_zh_TW, usage_zh_TW, note_zh_TW, labels_en/ja/zh_TW) to grammar_topics.json.

Keeps the existing Chinese originals (`scene`, `usage`, `note`) untouched so the
default zh-CN view still works without extra fallback logic.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOPIC_PATH = ROOT / "data" / "grammar_topics.json"

SCENE_EN = {
    "早上喝咖啡": "Drinking coffee in the morning",
    "在餐厅吃寿司": "Eating sushi at a restaurant",
    "每天早上6点起床": "Waking up at 6am every morning",
    "图书馆里看书": "Reading books at the library",
    "在卡拉 OK 唱歌": "Singing at karaoke",
    "和朋友见面": "Meeting a friend",
    "穿上新衣服": "Putting on new clothes",
    "坐电车回家": "Going home by train",
    "写信给妈妈": "Writing a letter to mom",
    "在海边游泳": "Swimming at the beach",
    "做作业/学习": "Doing homework / studying",
    "老师来教室": "The teacher comes to the classroom",
    "冲澡洗身体": "Taking a shower",
    "打开窗户透气": "Opening the window for air",
    "等公交车 10 分钟": "Waiting 10 min for the bus",
    "丢掉不要的东西": "Throwing away unwanted items",
    "从图书馆借书": "Borrowing a book from the library",
    "说明新项目内容": "Explaining a new project",
    "午夜睡觉前刷牙": "Brushing teeth before bed",
    "便利店买饮料": "Buying a drink at the convenience store",
    "给朋友展示照片": "Showing photos to a friend",
    "下公交车": "Getting off the bus",
    "我能说日语": "I can speak Japanese",
    "周末和家人玩耍": "Playing with family on weekends",
    "房间有一只猫": "There's a cat in the room",
    "桌子上有一本书": "There's a book on the desk",
    "打电话给客户": "Calling a customer",
    "学习新单词记住": "Memorizing new words",
    "跟老师报告结果": "Reporting results to the teacher",
    "看电影一部新片": "Watching a new movie",
}

SCENE_JA = {
    "早上喝咖啡": "朝にコーヒーを飲む",
    "在餐厅吃寿司": "レストランで寿司を食べる",
    "每天早上6点起床": "毎朝6時に起きる",
    "图书馆里看书": "図書館で本を読む",
    "在卡拉 OK 唱歌": "カラオケで歌う",
    "和朋友见面": "友達に会う",
    "穿上新衣服": "新しい服を着る",
    "坐电车回家": "電車で家へ帰る",
    "写信给妈妈": "母に手紙を書く",
    "在海边游泳": "海で泳ぐ",
    "做作业/学习": "宿題をする／勉強する",
    "老师来教室": "先生が教室に来る",
    "冲澡洗身体": "シャワーを浴びる",
    "打开窗户透气": "窓を開けて換気する",
    "等公交车 10 分钟": "バスを10分待つ",
    "丢掉不要的东西": "要らない物を捨てる",
    "从图书馆借书": "図書館で本を借りる",
    "说明新项目内容": "新しいプロジェクトを説明する",
    "午夜睡觉前刷牙": "寝る前に歯を磨く",
    "便利店买饮料": "コンビニで飲み物を買う",
    "给朋友展示照片": "友達に写真を見せる",
    "下公交车": "バスを降りる",
    "我能说日语": "日本語ができる",
    "周末和家人玩耍": "週末家族と遊ぶ",
    "房间有一只猫": "部屋に猫がいる",
    "桌子上有一本书": "机の上に本がある",
    "打电话给客户": "お客様に電話する",
    "学习新单词记住": "新しい単語を覚える",
    "跟老师报告结果": "先生に結果を報告する",
    "看电影一部新片": "映画（新作）を見る",
}

SCENE_ZH_TW = {
    "早上喝咖啡": "早上喝咖啡",
    "在餐厅吃寿司": "在餐廳吃壽司",
    "每天早上6点起床": "每天早上6點起床",
    "图书馆里看书": "圖書館裡看書",
    "在卡拉 OK 唱歌": "在卡拉 OK 唱歌",
    "和朋友见面": "和朋友見面",
    "穿上新衣服": "穿上新衣服",
    "坐电车回家": "坐電車回家",
    "写信给妈妈": "寫信給媽媽",
    "在海边游泳": "在海邊游泳",
    "做作业/学习": "做作業／學習",
    "老师来教室": "老師來教室",
    "冲澡洗身体": "沖澡洗身體",
    "打开窗户透气": "打開窗戶透氣",
    "等公交车 10 分钟": "等公車 10 分鐘",
    "丢掉不要的东西": "丟掉不要的東西",
    "从图书馆借书": "從圖書館借書",
    "说明新项目内容": "說明新專案內容",
    "午夜睡觉前刷牙": "午夜睡覺前刷牙",
    "便利店买饮料": "便利商店買飲料",
    "给朋友展示照片": "給朋友展示照片",
    "下公交车": "下公車",
    "我能说日语": "我能說日語",
    "周末和家人玩耍": "週末和家人玩耍",
    "房间有一只猫": "房間有一隻貓",
    "桌子上有一本书": "桌子上有一本書",
    "打电话给客户": "打電話給客戶",
    "学习新单词记住": "學習新單字記住",
    "跟老师报告结果": "跟老師報告結果",
    "看电影一部新片": "看電影（新片）",
}

USAGE_EN = {
    "早上喝咖啡": "Use のみます for liquids (water, tea, coffee, alcohol). Solid food uses たべます.",
    "在餐厅吃寿司": "たべます for solid food. Soup and medicine use のみます.",
    "每天早上6点起床": "おきます = wake up. Opposite: ねます (sleep). Despite ending in i-masu, it's Group II.",
    "图书馆里看书": "よみます = read (books, papers, letters). Watching something uses みます.",
    "在卡拉 OK 唱歌": "うたいます = to sing (歌を). Listen to music = ききます.",
    "和朋友见面": "あいます takes に: 友達に 会います (not と).",
    "穿上新衣服": "きます = to wear (upper body). Pants/shoes = はきます, hat = かぶります.",
    "坐电车回家": "かえります = return to origin/home/country. Going elsewhere = いきます.",
    "写信给妈妈": "かきます = write/draw (letters, essays, pictures).",
    "在海边游泳": "およぎます = to swim. Place uses で: 海で 泳ぎます.",
    "做作业/学习": "べんきょうします = to study (noun+します). Teaching is おしえます.",
    "老师来教室": "きます = to come (toward speaker). Going elsewhere = いきます.",
    "冲澡洗身体": "あびます = to shower (シャワーを〜). Bath = お風呂に はいります.",
    "打开窗户透气": "あけます = open (door/window). Turn on (light/device) = つけます.",
    "等公交车 10 分钟": "まちます = to wait. Takes を: バスを 待ちます.",
    "丢掉不要的东西": "すてます = to throw away. Accidentally drop = おとします.",
    "从图书馆借书": "かります = to borrow. Opposite: かします (lend), かえします (return).",
    "说明新项目内容": "せつめいします = explain (noun+します). Just talk = はなします.",
    "午夜睡觉前刷牙": "ねます = sleep / go to bed. Wake up = おきます.",
    "便利店买饮料": "かいます = to buy. Opposite: うります (sell).",
    "给朋友展示照片": "みせます = show to someone. Viewing yourself = みます. Takes に: 友達に 見せます.",
    "下公交车": "おります = get off (vehicle/floor). Get on = のります. Takes を: バスを 降ります.",
    "我能说日语": "できます = can do / completed. Takes が: 日本語が できます.",
    "周末和家人玩耍": "あそびます = play/hang out (leisure, not work).",
    "房间有一只猫": "います = exist (living: people, animals). Non-living = あります.",
    "桌子上有一本书": "あります = exist (non-living). Living = います.",
    "打电话给客户": "かけます = make a phone call (電話を〜). Answer = でます.",
    "学习新单词记住": "おぼえます = memorize/remember. Forget = わすれます.",
    "跟老师报告结果": "ほうこくします = report (noun+します). Simply telling = いいます.",
    "看电影一部新片": "みます = watch (images/scenery/shows). Reading text = よみます.",
}

USAGE_JA = {
    "早上喝咖啡": "飲み物は のみます、固体は たべます。",
    "在餐厅吃寿司": "固体の食べ物には たべます、液体は のみます。",
    "每天早上6点起床": "おきます（起きる）は II 類例外。反対語：ねます。",
    "图书馆里看书": "よみます＝本・新聞を読む。見るだけは みます。",
    "在卡拉 OK 唱歌": "歌は うたいます、音楽は ききます。",
    "和朋友见面": "「〜に 会います」助詞は に（×と）。",
    "穿上新衣服": "上半身：きます。ズボン・靴：はきます。帽子：かぶります。",
    "坐电车回家": "元の場所に戻る＝かえります。別の場所へ＝いきます。",
    "写信给妈妈": "字・手紙・絵を書く＝かきます。",
    "在海边游泳": "場所には で：海で 泳ぎます。",
    "做作业/学习": "勉強＝べんきょうします（名詞+します）。教えるは おしえます。",
    "老师来教室": "話者の方へ来る＝きます。離れる方向は いきます。",
    "冲澡洗身体": "シャワーは あびます、湯船は お風呂に はいります。",
    "打开窗户透气": "ドア・窓は あけます。電気・機械は つけます。",
    "等公交车 10 分钟": "「〜を 待ちます」助詞は を。",
    "丢掉不要的东西": "すてます＝捨てる、うっかり落とすは おとします。",
    "从图书馆借书": "借りる＝かります。貸すは かします、返すは かえします。",
    "说明新项目内容": "説明＝せつめいします（名詞+します）。ただ話すは はなします。",
    "午夜睡觉前刷牙": "ねます＝寝る。起きるは おきます。",
    "便利店买饮料": "買う＝かいます。売るは うります。",
    "给朋友展示照片": "相手に見せる＝みせます。自分が見るは みます。",
    "下公交车": "降りる＝おります。乗るは のります。「バスを」。",
    "我能说日语": "能力／完了＝できます。「〜が できます」。",
    "周末和家人玩耍": "あそびます＝遊ぶ・余暇。",
    "房间有一只猫": "生物＝います、無生物＝あります。",
    "桌子上有一本书": "無生物＝あります、生物＝います。",
    "打电话给客户": "電話を かけます／電話に でます。",
    "学习新单词记住": "覚える＝おぼえます、忘れるは わすれます。",
    "跟老师报告结果": "報告＝ほうこくします（名詞+します）。",
    "看电影一部新片": "映像・景色・展示＝みます。文字を読むは よみます。",
}

USAGE_ZH_TW = {
    "早上喝咖啡": "のみます 用於喝液體（水・お茶・コーヒー・お酒）。固體是 たべます。",
    "在餐厅吃寿司": "たべます 用於固體食物。湯・藥等液體用 のみます。",
    "每天早上6点起床": "おきます 起床。相對詞：ねます 睡覺。雖然 i-masu 卻屬 II 組。",
    "图书馆里看书": "よみます 專指用眼睛讀（書/報/信）。單純看畫面用 みます。",
    "在卡拉 OK 唱歌": "うたいます 唱歌（歌を〜）。聽音樂用 ききます。",
    "和朋友见面": "あいます 接 に 助詞：友達に 会います。不是 と。",
    "穿上新衣服": "きます 專用於上身衣物（シャツ・コート）。褲/鞋用 はきます；帽子 かぶります。",
    "坐电车回家": "かえります 回（原處/家/國）。去其他地方用 いきます。",
    "写信给妈妈": "かきます 寫字/寫信/寫文章。畫畫也用它（絵を かきます）。",
    "在海边游泳": "およぎます 游泳。接 で 表示地點：海で 泳ぎます。",
    "做作业/学习": "べんきょうします 學習（名詞+します）。教別人是 おしえます。",
    "老师来教室": "きます 來。對方從遠處移動到說話人這裡用它。去別處是 いきます。",
    "冲澡洗身体": "あびます 專指沖澡（シャワーを〜）。泡澡是 はいります（お風呂に）。",
    "打开窗户透气": "あけます 開（關著的門/窗/蓋子）。開燈/電器用 つけます。",
    "等公交车 10 分钟": "まちます 等人或事。接 を：バスを 待ちます。",
    "丢掉不要的东西": "すてます 丟棄（不要的東西/垃圾）。不慎掉落是 おとします。",
    "从图书馆借书": "かります 借入（從別人那裡拿來使用）。相對：かします 借出給別人；かえします 歸還。",
    "说明新项目内容": "せつめいします 說明（名詞+します）。單純說話用 はなします。",
    "午夜睡觉前刷牙": "ねます 睡覺/躺下。起床是 おきます。",
    "便利店买饮料": "かいます 買（用錢換取）。對應 うります 賣。",
    "给朋友展示照片": "みせます 給人看（讓對方看）。自己看是 みます。接 に：友達に 見せます。",
    "下公交车": "おります 下（車/樓）。上車是 のります。接 を：バスを 降ります。",
    "我能说日语": "できます 會/能做（表示能力），同時也表示某事完成。接 が：日本語が できます。",
    "周末和家人玩耍": "あそびます 玩耍/遊玩（不是正事）。小孩玩耍、大人休閒都用。",
    "房间有一只猫": "います 有/在（生物：人、動物）。非生物是 あります。",
    "桌子上有一本书": "あります 有/在（非生物）。生物用 います。",
    "打电话给客户": "かけます 打電話（電話を〜）。接電話是 でます。",
    "学习新单词记住": "おぼえます 記住。忘記是 わすれます。",
    "跟老师报告结果": "ほうこくします 報告（名詞+します）。單純告知用 いいます。",
    "看电影一部新片": "みます 看（影像/景色/展示）。閱讀文字用 よみます。",
}

NOTE_EN = {
    "穿上新衣服": "II-group exception",
    "做作业/学习": "III-group compound",
    "冲澡洗身体": "II-group exception",
    "从图书馆借书": "II-group exception",
    "下公交车": "II-group exception",
    "我能说日语": "II-group exception",
    "房间有一只猫": "II-group exception (use います for living things)",
    "看电影一部新片": "II-group exception",
}

NOTE_JA = {
    "穿上新衣服": "II グループ例外",
    "做作业/学习": "III グループ（複合動詞）",
    "冲澡洗身体": "II グループ例外",
    "从图书馆借书": "II グループ例外",
    "下公交车": "II グループ例外",
    "我能说日语": "II グループ例外",
    "房间有一只猫": "II グループ例外（生物は います）",
    "看电影一部新片": "II グループ例外",
}

NOTE_ZH_TW = {
    "穿上新衣服": "II 組例外",
    "做作业/学习": "III 組複合動詞",
    "冲澡洗身体": "II 組例外",
    "从图书馆借书": "II 組例外",
    "下公交车": "II 組例外",
    "我能说日语": "II 組例外",
    "房间有一只猫": "II 組例外（生物用 います）",
    "看电影一部新片": "II 組例外",
}


def main() -> None:
    data = json.loads(TOPIC_PATH.read_text(encoding="utf-8"))
    topic = data[0]
    p = topic["practice"]

    p["hint_zh_TW"] = "根據中文場景選最合適的日語動詞（答題後會告訴你它屬於哪一組）"
    p["hint_ja"] = "場面に合う動詞を選んでください（答えた後、どのグループか分かります）"
    p["hint_en"] = "Pick the best verb for the scene (after answering you'll see its group)"

    p["labels_en"] = ["Group I (godan)", "Group II (ichidan)", "Group III (irregular)"]
    p["labels_ja"] = ["I グループ（五段）", "II グループ（一段）", "III グループ（不規則）"]
    p["labels_zh_TW"] = ["I 組（五段）", "II 組（一段）", "III 組（不規則）"]

    for it in p.get("items", []):
        sc = it.get("scene", "")
        if sc in SCENE_EN:
            it["scene_en"] = SCENE_EN[sc]
        if sc in SCENE_JA:
            it["scene_ja"] = SCENE_JA[sc]
        if sc in SCENE_ZH_TW:
            it["scene_zh_TW"] = SCENE_ZH_TW[sc]
        if sc in USAGE_EN:
            it["usage_en"] = USAGE_EN[sc]
        if sc in USAGE_JA:
            it["usage_ja"] = USAGE_JA[sc]
        if sc in USAGE_ZH_TW:
            it["usage_zh_TW"] = USAGE_ZH_TW[sc]
        if sc in NOTE_EN:
            it["note_en"] = NOTE_EN[sc]
        if sc in NOTE_JA:
            it["note_ja"] = NOTE_JA[sc]
        if sc in NOTE_ZH_TW:
            it["note_zh_TW"] = NOTE_ZH_TW[sc]

    TOPIC_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"items: {len(p.get('items', []))}")
    sample = p["items"][0]
    print(f"sample scene_en: {sample.get('scene_en')}")
    print(f"sample usage_en: {sample.get('usage_en')}")


if __name__ == "__main__":
    main()
