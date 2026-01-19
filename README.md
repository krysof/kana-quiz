# 50音训练

一个简洁的日语假名和词汇练习工具，支持手机和桌面浏览器。

**在线体验**: https://krysof.github.io/kana-quiz/

## 功能特点

### 练习内容
- **50音假名**: 清音、浊音、半浊音、拗音（共107个）
- **日常词汇**: 200+常用单词，涵盖问候、数字、时间、颜色、动物、食物、动词、形容词等
- **错题优先**: 可选开启，答错的题目会更频繁出现

### 题型模式
- **罗马音→选假名**: 看罗马音，选择对应的假名
- **假名→选罗马音**: 看假名，选择对应的罗马音
- **罗马音输入**: 看罗马音，手动输入假名
- **假名输入**: 看假名，手动输入罗马音

### 显示模式
- 平假名 / 片假名 切换

### 智能选项
- 干扰项优先选择字数相同、首字相同的选项，避免一眼看出答案

### 音效与语音
- 正确: 叮叮双音
- 错误: 低音提示
- 答题后自动播放正确答案的日语发音（TTS）

### 统计功能
- 实时计时器
- 正确率百分比
- 连续正确数（streak）
- 今日统计：总题数、正确数、错误数、完成轮次
- 当前轮次显示
- 本次练习进度条

### 其他
- 隐藏中文释义选项（点击可查看）
- 完成一轮后自动返回标题画面
- 必须答题后才能进入下一题
- 数据本地存储（localStorage）
- 响应式设计，支持手机浏览

## 部署

### GitHub Pages
1. 新建 GitHub 仓库，上传本项目全部文件
2. Settings → Pages
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)
3. 访问: `https://<用户名>.github.io/<仓库名>/`

### 本地运行
需要通过 HTTP 服务器访问（ES Modules 不支持 file:// 协议）：

```bash
# Python
python -m http.server 8080

# Node.js
npx serve .
```

然后访问 http://localhost:8080

## 文件结构

```
├── index.html          # 主页面
├── app.js              # 主逻辑
├── style.css           # 样式
├── core/
│   ├── quiz.js         # 出题逻辑
│   ├── storage.js      # 本地存储
│   ├── tts.js          # 语音合成
│   └── audio.js        # 音效
└── data/
    ├── kana.json       # 假名数据（107个）
    └── words.json      # 词汇数据（200+个）
```

## 更新说明

修改代码后，需要更新版本号以清除浏览器缓存：

1. `index.html` 中的 `style.css?v=x.x` 和 `app.js?v=x.x`
2. `app.js` 中所有 import 语句的 `?v=x.x`

例如：`?v=1.2` → `?v=1.3`

## 技术栈

- 原生 JavaScript (ES Modules)
- Web Speech API (TTS)
- Web Audio API (音效)
- localStorage (数据持久化)
- CSS Grid / Flexbox (响应式布局)
