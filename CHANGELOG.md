# 超级扫雷 - 更新日志

## v1.5.0 (2026-04-29)

### 新增功能
- **📜 作战日志 & 战后分析（Battle Log & Post-Game Analysis）**
  全新战后复盘系统，记录每局完整数据并生成战术评级报告：
  - **历史记录**：卡片式列表展示最近50局，显示胜负/难度/时间/效率/综合评级(S~F)
  - **趋势分析**：效率趋势柱状图（最近20局，绿色=胜利/红色=失败）+ 累积胜率走势图
  - **战后详情**：综合评级圆环、6项关键指标（效率/时间/旗帜准确度/峰值手速/3BV/浪费操作）、AI战术评语、棋盘复盘、操作统计
  - **棋盘复盘**：显示地雷分布、正确标记、错误标记、踩雷点；大棋盘自动省略已揭示格子以节省存储
  - **单条管理**：支持删除单条记录或一键清空全部日志
  - **游戏结束直达**：胜利/失败弹窗新增"📜 战后分析"按钮，一键查看刚刚结束的对局分析

### 技术实现
- `battle-log.js` 独立模块：记录/评级/趋势分析/复盘快照，localStorage 持久化（键：`minesweeper_battle_log`），上限50条
- `game.js` 新增 `undoCount` 计数器：追踪每局撤销次数，参与战后分析评级
- `ui.js` 新增 `renderBattleLogList`/`renderBattleLogTrends`/`renderBattleAnalysis`/`resetBattleLogTabs`/`bindBattleLogEvents`
- `index.html` 新增 `#battle-log-screen`（双标签页：历史记录+趋势分析）和 `#battle-analysis-screen`（动态详情页）
- `css/style.css` 新增约320行作战日志专属样式，完全基于 CSS 变量，适配全部5种主题+11种强调色

### Bug 修复（v1.5.0 集成深度检查）
- **数据兼容性**：旧存档/早期记录缺少 `clickAnalysis`/`flagStats`/`wastedClicks`/`undoCount` 等字段时不再崩溃，全部字段安全降级为默认值
- **唯一ID**：`Date.now()` 改为 `Date.now() + '_' + Math.random()`，消除同一毫秒内重复ID导致 `deleteById` 误删多条记录的风险
- **标签页状态**：从战后分析返回作战日志时自动重置到"历史记录"标签，避免列表渲染到不可见面板
- **选择器限定**：`.bl-tab`/`.bl-panel` 事件绑定限定在 `#battle-log-screen` 内，防止与其他模块冲突
- **移动端复盘居中**：`transform-origin: left top` → `center top`，缩放后视觉居中
- **主题兼容**：`#view-analysis-btn:hover` 硬编码绿色 `#059669` 改为 `filter: brightness(0.9)`，跟随当前主题色
- **趋势图溢出**：`.trend-graph` 添加 `overflow-x: auto`，窄屏下标签过多时可横向滚动
- **冗余渲染**：删除战后分析"删除记录"后多余的 `renderBattleLogList()` 调用（`showScreen` 已自动触发）
- **字符串拼接安全**：`entry.time`/`entry.efficiency`/`entry.width`/`entry.height`/`entry.mineCount` 全部添加 `|| 0` 保护，防止旧数据显示 `"undefined"`

---

## v1.4.1 (2026-04-27)

### Bug 修复（v1.4.0 全局深度检查）
- **🧩 谜题工坊关键修复**
  - `getCellNumber` 添加边界检查，防止越界坐标影响边缘数字计算
  - `toggleMine` 忽略越界坐标，防止脏数据流入
  - `randomPuzzle` 修复 `density=0` 被误判为 falsy 的问题
  - `createPlayableBoard` 过滤越界雷，确保 `mines` 与 `cells` 一致
  - `loadFromData` 过滤越界雷坐标，防止恶意分享码注入
  - CSS 补充缺失变量 `--cell-hidden`/`--cell-hover`/`--cell-revealed`/`--text-secondary`
  - 编辑器数字颜色改为 CSS 类（`.puzzle-num-1~8`），适配深色/浅色主题
  - 添加完整触摸事件支持（touchstart/touchend/touchcancel + 长按标记）
  - Puzzle 模式下表情按钮/再玩一次/相同地图正确重玩同一谜题
  - 隐藏 puzzle 模式的种子显示（种子为 null 无意义）
  - 编辑器面板添加 `overflow: auto`，防止 16×16 在移动端撑破容器
  - 编辑器操作音效：格子点击、验证通过/失败、分享码复制

- **🎵 音频系统修复**
  - `playTone` ADSR 添加最小值保护（0.001s），防止 `attack=0 && decay=0` 时 `exponentialRampToValueAtTime` 崩溃
  - `startMusic` 开头调用 `stopMusic()`，防止重复调用导致音频节点内存泄漏
  - M 键静音现在同时切换 SFX 和 Music（此前仅静音 SFX）
  - 设置面板修改音乐风格后实时重启 BGM

---

## v1.4.0 (2026-04-27)

### 新增功能
- **🧩 谜题工坊（Puzzle Workshop）**  
  全新创意系统，允许玩家创建、分享和游玩自定义扫雷谜题：
  - **自由编辑器**：5×5 至 16×16 任意尺寸，左键放置/移除地雷，实时显示周围数字
  - **随机生成**：一键生成随机谜题（可调密度）
  - **可解性验证**：自动检测是否存在安全起点（0格）以及所有安全区域是否连通
  - **分享码系统**：紧凑的 Base64 位图编码（例如 `SMAYiAAAAAAAAgAAAAgA`），支持复制粘贴
  - **收藏夹**：自动保存最近 20 个游玩的谜题，支持一键重玩/删除
  - **游玩方式**：通过分享码加载他人谜题，或直接从编辑器试玩自己的创作

### 技术实现
- `puzzle.js` 独立模块：位图编码/解码、BFS 连通性验证、`createPlayableBoard()` 生成可直接游戏的 `MinesweeperBoard`
- `game.js` 新增 `startPuzzle()` 接口：跳过首次点击生成地雷逻辑，直接使用预设雷区
- 分享码格式：`SM` + URL-safe Base64，1 字节版本 + 1 字节尺寸 + 位图数据（最大 16×16 仅需 48 字符）

---

## v1.3.0 (2026-04-27)

### 新增功能
- **♾️ 无尽模式**  
