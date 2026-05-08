# 超级扫雷 - 更新日志

## v1.11.0 (2026-04-29)

### 新功能：禅意模式 (Zen Mode)
一个全新的放松型扫雷变体，与快节奏的雷暴突袭、高压力的锦标赛形成互补。

**核心机制：**
- **无失败惩罚**：踩到雷不结束游戏，而是扣除专注度（10点/次）
- **专注度系统**：初始 100 点，归零时冥想结束；每揭开 10 格安全区域恢复 1 点
- **无限撤销**：随时撤销任何操作
- **使用提示消耗专注度**：5 点/次
- **无计时压力**：纯粹享受逻辑推理

**禅意花园：**
- 每次完成冥想，根据失误数种下不同的花：
  - 🪷 莲花：零失误
  - 🌸 樱花：1–2 失误
  - 🌼 菊花：3–5 失误
  - 🌾 蒲公英：6+ 失误
- 花园记录每朵花的日期、用时和效率
- 累计冥想时长和完成次数统计

**技术实现：**
- 新增 `js/zen-mode.js` 核心模块（状态机、专注度、花园持久化）
- `js/game.js` 集成：zen 分支的 reveal/chord/win/lose/hint/undo 全链路
- `js/ui.js`：zen-screen、zen HUD、zen 退出确认
- `js/achievements.js`：4 个禅意相关成就
- `css/style.css`：完整的 zen 样式体系

## v1.11.2 (2026-04-29)

### Bug 修复（禅意模式第二轮审查：10 处修复）
- **提示失败仍扣除专注度**：`onHint()` 在 `Solver.getHint()` 之前调用，solver 返回 null 时玩家白白损失专注度。改为仅在提示成功后才扣除
- **firstSafe 早期返回跳过 focus 检查**：`firstSafe` 免费提示不扣专注度，但 focus 归零检查被跳过。已将 focus 检查逻辑重构，firstSafe 保持免费，普通提示成功后才扣专注度
- **暂停菜单保存按钮对 Zen 静默失败**：Zen 模式 `save()` 返回 `false` 但 UI 无反馈。添加 `禅意模式不支持手动保存` 提示
- **暂停时间计入 `sessionTime`**：`ZenMode` 无 pause/resume 钩子，暂停期间时间被计入冥想时长。新增 `ZenMode.pause()`/`resume()`（调整 `startTime` 补偿）并在 `Game.pause()`/`resume()` 中联动
- **踩雷音效太刺耳**：Zen 模式下每次踩雷播放 `playLose()`（刺耳下降音效）。改为 `playHint()`（柔和提示音）
- **Zen 失败显示太 harsh**：`lose()` 触发通用 `gameOver` 覆盖层，显示 😵 + "游戏结束"。`showGameOver()` 现已传递 `challengeMode`，UI 对 Zen 模式显示 🍂 + "冥想结束"
- **Zen 胜利显示太 harsh**：通用覆盖层显示 😎 + "胜利"。Zen 模式改为 🌸 + "冥想完成"
- **累计冥想显示 "0 分钟"**：59 秒显示为 0 分钟。改为 "< 1 分钟"
- **花园卡片显示 `time` 而非 `sessionTime`**：`time` 是游戏内部计时器（Zen 模式下不更新），`sessionTime` 是真实冥想时长。改为显示 `sessionTime`
- **花园渲染防御性加固**：`innerHTML` 拼接存在 XSS 风险（虽然 localStorage 同源）。改用 `textContent` + `DocumentFragment` 安全构建 DOM

## v1.11.1 (2026-04-29)

### Bug 修复（禅意模式第一轮审查：16 处修复）
- **游戏结束覆盖层与禅意完成界面冲突**：`win()` 调用 `showGameOver()` 导致通用胜利弹窗覆盖禅意完成界面。Zen 模式下跳过 `showGameOver()` 和普通统计/排行榜
- **`#zen-garden-back` 按钮导致 JS 崩溃**：`class="back-btn"` 无 `data-back` 属性，`bindNavigationEvents()` 调用 `showScreen(undefined)` 崩溃。改为 `class="secondary-btn"`
- **提示专注度归零不结束游戏**：`hint()` 调用 `ZenMode.onHint()` 后不检查专注度，玩家可无限使用提示直到归零仍继续。已补全 `focus <= 0` → `lose()` 检查
- **chord 踩雷免费揭示邻居**：Zen 模式下 chord 踩雷不恢复棋盘，所有安全邻居永久揭示。已在 `reveal()`/`chord()` zen 分支添加 `history.pop()` 恢复
- **Zen 退出确认被绕过**：暂停菜单退出时 `gameState='paused'`，`showScreen()` 只检查 `'playing'`。改为检查 `'playing' || 'paused'`
- **timer 闪烁**：`startTimer()` 在 Zen 模式下仍每 100ms 更新 `#timer`，与 `renderBoard()` 的 `'∞'` 显示冲突。`updateTimerDisplay()` 仅在 `!challengeData.noTimer` 时执行
- **`ZenMode.start()` 重复调用丢失时间**：无 guard，覆盖 `startTime` 不累积。添加 `if (state === 'playing') stop();`
- **`onReveal(0)` 被计为 1**：`count || 1` 将 0 计为 1。改为显式 `typeof count === 'number'` 检查
- **Garden 无大小限制**：`garden` 数组无限增长，`renderZenGarden()` 线性渲染导致性能下降。限制保留最近 200 朵
- **`load()` 接受 `Infinity`**：数值验证未排除 `Infinity`。添加 `isFinite()` 检查
- **`getFlowerType()` 负数输入**：无防御，负数返回樱花。添加 `Math.max(0, mistakeCount)`
- **`onComplete()` 保存数据不完整**：缺少 `hintsUsed` 和 `sessionTime`。已补充
- **Zen 屏幕子元素可见性不重置**：从花园返回主菜单再进入，直接显示花园。`showScreen('zen-screen')` 中显式重置子面板
- **CSS border 不一致**：`.zen-hud` 用 `border-bottom`，其他 HUD 用 `border-top`。已统一
- **`Game.getState()` 缺少 `zenState`**：外部调用者无法获取 zen 状态。已补充
- **`renderZenScreen()` 冗余调用**：`zenComplete` 事件处理器显式调用，但 `showScreen()` 已触发。已移除

## v1.10.6 (2026-04-29)

### Bug 修复（第十轮深度审查：跨模块资源泄漏 / 防御性加固）
- **Game 计时器泄漏**：`Championship.stop()` 未停止 `Game` 的 `timerInterval`，用户从锦标赛导航退出后 Game 计时器继续运行。暴露 `Game.stopTimer()` API 并在 `Championship.stop()` 中调用
- **Replay 调用无 guard**：`game.js` 中 18 处 `Replay.*` 调用无任何 `typeof` 检查，`replay.js` 在 `game.js` 之后加载。新增 `replay()` helper 函数统一安全调用
- **Achievements 调用无 guard**：`game.js` 中 5 处、`ui.js` 中 2 处 `Achievements.*` 调用无 `typeof` 检查。新增 `checkAchievements()` helper 并补全 guard
- **`Championship.load()` 数据验证缺失**：`bestTime` 可接受 `NaN`（`typeof NaN === 'number'`），`bestStars` 无范围限制。添加 `isNaN` 检查和 `0–3` 范围约束
- **timerInterval 在 phase-transition 期间不清除**：阶段完成后 interval 继续运行造成资源浪费。在 `onPhaseComplete()` 中清除、在 `advanceToNextPhase()` 中恢复
- **`bindChampionshipEvents()` 可重复绑定**：缺乏去重保护，若 `UI.init()` 被意外多次调用会导致事件监听器堆叠。添加 `_bound` 标志

## v1.10.5 (2026-04-29)

### Bug 修复（第九轮深度审查：缺失函数 / 防御性加固）
- **`Championship` 模块 `pause()`/`resume()` 函数完全缺失**：v1.10.3 计划中新增，但实际代码从未定义，导致严格模式下模块加载抛出 `ReferenceError`，且 `Game.pause()`/`resume()` 调用时抛出 `TypeError`。补全两个函数的实现
- **`tick()` 缺少 `pausedAt !== 0` 检查**：暂停期间总计时器仍会累加。已补充检查
- **`stop()` 中 `pausedAt` 未重置**：防御性补充重置
- **`stop()` 无条件调用 `Game.clearSaved()` 误删存档**：改为通过 `localStorage` 读取 `saved_game` 并判断 `challengeMode === 'championship'` 后才清除，避免误删其他模式存档
- **`challengeMode` 在锦标赛结束后未重置**：`Game.win()`/`lose()` 的锦标赛分支 `return` 前未清理，造成 stale state。已在 `return` 前重置为 `null`
- **所有 `Championship.*` 调用点缺乏 method guard**：20 处调用加固为 `typeof Championship !== 'undefined' && typeof Championship.method === 'function'`，防止模块加载失败或方法缺失时崩溃
- **`championshipTick` 事件缺少 UI 监听器**：阶段介绍界面总用时不会实时更新。已添加监听器更新 `phase-intro-total`

## v1.10.4 (2026-04-29)

### Bug 修复（第八轮深度审查：暂停状态残留）
- **`pausedAt` 在重新开始/进入下一阶段时未重置**：玩家在暂停后点击"重新开始"或"下一阶段"，`pausedAt` 保留旧值，导致 `tick()` 永久 return，总计时器冻结。在 `start()` 和 `advanceToNextPhase()` 中补全 `pausedAt = 0`

## v1.10.3 (2026-04-29)

### Bug 修复（第七轮深度审查：状态一致性/暂停/存档）
- **showScreen 退出确认在切换到 game-screen 时触发**：从阶段介绍点击"开始"进入游戏时仍弹出确认框。添加 `name !== 'game-screen'` 和 `ended`/`victory` 状态自动清理
- **大师阶段尺寸与 game.js 不一致**：锦标赛 master 为 30×20，但 `difficulties.master` 为 40×20，实际棋盘更大。统一为 40×20
- **锦标赛暂停时总计时器不暂停**：`Game.pause()` 只停止游戏计时，锦标赛总计时继续累积。新增 `Championship.pause()`/`resume()` 并在 `Game.pause()`/`resume()` 中联动调用
- **锦标赛手动存档绕过保护**：暂停菜单"保存"按钮直接调用 `Game.save()`，无锦标赛检查。添加阻止提示
- **Game.loadSaved() 未拒绝锦标赛存档**：恢复后 `Championship` 状态为 idle 但 `Game` 为 championship，流程断裂。添加检查并清除

## v1.10.2 (2026-04-29)

### Bug 修复（第六轮深度审查：状态残留/竞态/UI）
- **showScreen 锦标赛退出确认在内部流程触发**：`Championship.state='playing'` 会在阶段介绍/过渡时错误触发确认框。添加 `name !== 'championship-screen'` 和 `phase-transition` 状态检查
- **锦标赛结束后返回主菜单状态未重置**：结束/胜利返回按钮未调用 `Championship.stop()`，下次进入显示残留画面。已补全
- **Game.challengeMode 残留**：`Championship.stop()` 未清理 `Game` 模块状态。添加 `Game.clearSaved()` 调用
- **锦标赛游戏被错误保存**：`beforeunload` 会保存锦标赛进度，但锦标赛状态无法恢复。添加锦标赛模式跳过保存
- **布雷大师 nextBtn 重复绑定**：每次提交正确都 `addEventListener` 新监听器，导致内存泄漏。改为 `onclick`
- **暂停 Overlay 重新开始取消后 UI 异常**：先隐藏 overlay 再弹确认，取消后 overlay 已消失但游戏仍暂停。改为先确认再隐藏
- **Championship.start() 缺少状态保护**：快速双击导致重复调用。添加 `if (state !== 'idle')` 清理
- **.phase-intro-badge 硬编码白色**：`color: white` 破坏主题一致性。改为 `var(--bg)`
- **load() 忽略 null bestTime**：`reset()` 后 `bestTime=null`，`typeof null==='object'` 使条件失败。添加 `=== null` 检查

## v1.10.1 (2026-04-29)

### Bug 修复（v1.10.0 锦标赛深度审查）
- **showScreen 退出确认错误触发**：`Game.gameState='won'` 会在阶段完成/过渡/胜利时错误触发确认框。改为检查 `Championship.state === 'playing'`，只拦截真正的中途退出
- **暂停菜单重新开始破坏公平性**：锦标赛阶段中点击"重新开始"仅重置 `Game` 状态，锦标赛计时器继续运行。改为弹出确认并从头开始整个锦标赛
- **Championship.stop() 未完全清理**：遗漏 `phaseTimes`/`totalTime`/`startTime`，导致脏数据残留。已补全
- **锦标赛路径遗漏 Replay/BattleLog**：`win()`/`lose()` 提前 `return` 跳过了 `Replay.stop()` 和 `recordBattleLog()`。已在锦标赛分支中补全
- **HTML 星级规则 emoji 颠倒**：`⭐ ≤8分钟:3星` 等 emoji 数量与星级数相反，已修正
- **HTML 总用时重复"秒"字**：`formatChampTime()` 返回值已含"秒"，与硬编码"秒"叠加显示为"5秒秒"。已移除硬编码
- **CSS `--success` 未定义**：`.phase-complete-content h3` 使用未定义变量。改为 `var(--secondary)`
- **CSS `.rule-item` 样式缺失**：HTML 中使用的类无对应样式。已补充基础 padding
- **onPhaseFail 允许 phase-transition 状态**：`phase-transition` 下不可能触发失败，但防御性代码开了不该开的门。改为仅允许 `playing`
- **currentPhaseIdx 初始值语义误导**：初始 `0` 使 `getState()` 在 idle 时返回"初级"为当前阶段。改为 `-1` 并添加状态检查
- **championshipAdvance 死事件**：`game.js` 中 dispatch 无人监听的事件。已移除
- **renderChampionshipStart 可能覆盖进行中画面**：`showScreen` 调用时会执行 `renderChampionshipStart()`，可能覆盖阶段介绍/完成画面。添加 `state !== 'idle'` 守卫
- **phaseStartBtn 内部缺少 null 检查**：`getElementById('championship-phase-intro')` 未做空保护。已补全

## v1.10.0 (2026-04-29)

### 新功能
- **扫雷锦标赛 (Mine Championship)**：连续挑战四个标准难度的极限赛事
  - 四阶段连闯：初级(9×9,10雷) → 中级(16×16,40雷) → 高级(30×16,99雷) → 大师(30×20,180雷)
  - 中途不可失败，失败即整场结束
  - 总用时评级：≤8分钟3⭐ / ≤15分钟2⭐ / 完成1⭐
  - 历史最佳记录持久化
  - 阶段过渡动画与胜利/失败专属界面
  - 3项专属成就：锦标赛新秀、锦标赛冠军、闪电锦标赛
  - 1项博物馆展品：锦标赛的荣光
  - 完全集成 `Game` 模块的 `challengeMode` 机制，复用现有扫雷核心逻辑
  - `showScreen` 退出确认保护，防止意外丢失进度

## v1.9.4 (2026-04-29)

### Bug 修复（第四轮深度审查：UI/UX/竞态/数据安全）
- **布雷大师提交正确后反馈面板被隐藏**：`submit` 回调中的 `renderArchitectLevels()` 会隐藏 `architect-game` 容器，导致"回答正确"反馈和"下一关"按钮不可见。改为仅在"返回选关"时调用 `renderArchitectLevels()`
- **布雷大师 showScreen 缺少退出确认**：`showScreen()` 离开 architect 屏幕时直接清理状态，玩家可能意外丢失进度。添加与 Thunder Rush 一致的 `confirm()` 确认对话框
- **布雷大师锁定关卡 shake 不重触发**：连续快速点击锁定关卡时动画不重新播放。添加 `void card.offsetWidth` 强制重绘
- **布雷大师棋盘缺少右键支持**：右键点击显示浏览器上下文菜单。添加 `contextmenu` 事件监听器，阻止默认菜单并将右键视为 toggle 雷标记
- **布雷大师移动端触摸目标偏小**：`--architect-cell: 42px` 低于 WCAG 推荐 44px。增大到 44px
- **布雷大师 `getLevel()` 返回原始引用**：外部代码可能意外修改关卡数据。返回 `data` 属性的深拷贝
- **雷暴突袭 `endGame()` 遗漏 `transitionTimeout` 清理**：踩雷后时间池在 900ms 过渡期间耗尽时，悬空定时器残留。在 `endGame()` 中添加 `clearTimeout(transitionTimeout)`
- **雷暴突袭 `nextPuzzle()` 缺少 `clearTimeout`**：防御性编程疏漏。添加 `clearTimeout(transitionTimeout)`
- **博物馆 `Stats.getAll()` null 崩溃**：`Stats.getAll()` 返回 null 时条件函数抛出 TypeError（被静默捕获）。添加 `|| {}` 兜底
- **博物馆 `ThunderRush.getStats()` null 崩溃**：`getStats()` 返回 null 时 `(trs.totalSolved || 0)` 抛出 TypeError。添加 `trs &&` 短路保护
- **博物馆 `PatternDojo.getProgress()` null 崩溃**：`getProgress()` 返回 null 时 `progress[patterns[i].id]` 抛出 TypeError。添加 `!progress` 检查

## v1.9.0 (2026-04-29)

### 新功能
- **星际博物馆 (Galaxy Museum)**：15 座星际遗迹展品收集系统
  - 展品涵盖扫雷历史、数学原理、玩法技巧等知识
  - 通过达成各种游戏条件解锁（胜利次数、最佳时间、模式通关等）
  - 与 Pattern Dojo、Thunder Rush、战役模式等全部子系统联动
  - 精美的卡片式展厅 + 详情页，支持响应式布局
  - 3 项专属成就：考古学家、星际探险家、宇宙收藏家

## v1.8.1 (2026-04-29)

### Bug 修复（Thunder Rush 深度审查）
- **重复踩雷扣时间**：`handleCellClick()` 新增 `hitCells` 重复检查，已踩中的雷格不可再次点击，防止连续扣时间
- **thunderLoop 后台泄漏**：`showScreen()` 离开 Thunder Rush 时，除 `stopGame()` 外同步清理 `thunderGameActive`、`thunderLoopId` 和 `thunderLongPressTimer`，彻底终止 UI 轮询
- **移动端触摸默认行为**：`touchstart`/`touchend`/`touchcancel` 的 `passive` 从 `true` 改为 `false`，并添加 `e.preventDefault()`，阻止浏览器长按弹出菜单/选择文本
- **长按定时器泄漏**：`showThunderRushStart()` / `showThunderRushOver()` / `startThunderRush()` 均增加 `thunderLongPressTimer` 清理，杜绝所有定时器残留
- **旧 thunderLoopId 残留**：`startThunderRush()` 开头强制清理可能存在的旧 `thunderLoopId`，防止多个轮询并行

## v1.8.0 (2026-04-29)

### 新功能
- **模式训练道馆 (Pattern Dojo)**：10种经典扫雷推理模式训练模块，每种5道训练题，含解锁/评级/成就集成
- **雷暴突袭 (Thunder Rush)**：快节奏连续微型扫雷挑战模式
  - 5×5微型棋盘，时间池机制（初始60秒）
  - 连击倍率系统（1.2× ~ 3.0×）
  - 难度递增（3雷 → 8雷）
  - 完整统计持久化与成就集成
  - 移动端触摸长按标记支持

### Bug 修复
- **Pattern Dojo 评级降级**：`recordResult()` 中评级计算改为只升级不降级，保留玩家已获得的高评级
- **Thunder Rush 踩雷无视觉反馈**：新增 `hitCells` 状态，踩雷后格子显示红色高亮与💣图标
- **Thunder Rush 移动端无法标记**：添加 `touchstart`/`touchend`/`touchcancel` 长按事件委托（500ms阈值），与主游戏保持一致
- **Thunder Rush 按钮样式缺失**：`btn primary`/`btn secondary` 改为项目中实际存在的 `.primary-btn`/`.secondary-btn`，并补充 `.thunder-btn-large` 样式

## v1.6.2 (2026-04-29)

### Bug 修复（v1.6.1 影子挑战核心逻辑深度检查）
- **seed=0 数据丢失**：`battle-log.js` 中 `data.seed || null` 将 `seed=0` 误判为无种子，改为显式 `null/undefined` 判断，确保种子 `0` 正确保存
- **挑战按钮时序崩溃**：作战日志卡片/分析页的 `setup()` 在 `Game.start()` 之前执行，`Game.start()` 内部的 `ShadowRace.stop()` 会清除刚设置的状态，导致影子挑战完全无法启动。改为先 `Game.start()` 再 `setup()`
- **noGuess/symmetry 雷分布不一致**：`shadow-race.js` 新增预生成地雷机制，使用历史记录保存的 `noGuess` 和对称模式设置，在第一个 `reveal` 动作前完成地雷生成，确保 undo 回退时不会回到无雷状态，且雷分布与原始记录完全一致
- **影子动作类型传递错误**：`shadowAction` 事件之前硬传递 `type='flag'`，导致 unflag/question/clear 全部被 UI 渲染为 flag。改为传递 `result.action`，UI 同步处理 `question`/`clear` 正确移除幽灵标记
- **shadowCompleted 后无限循环**：`tick()` 在影子完成后仍继续调度 `requestAnimationFrame`，造成无意义循环。添加 `shadowCompleted` 提前退出
- **种子显示一致性**：`renderBoard` 和战后分析详情中 `detail.seed` / `entry.seed` 为 `0` 时均正确显示 `0` 而非隐藏或显示"随机"
- **战后分析颜色去硬编码**：`.ba-cell.unrevealed-mine` 深红 `#7f1d1d` → `var(--danger)`，适配全部主题
- **竞速结果精度统一**：`playerTime` 显示增加 `Math.round(...*10)/10`，与 `shadowTime` / `timeDiff` 保持相同精度
- **平局样式补充**：`.sr-result-title.draw` 新增 `var(--primary)` 颜色，平局结果视觉更突出

---

## v1.6.1 (2026-04-29)

### Bug 修复（v1.6.0 影子挑战 UI/UX/SFX/BGM 深度检查）
- **相同地图按钮**：`replay-same-btn` / `play-again-btn` / `quit-btn` / `go-menu-btn` 在影子挑战模式下正确处理 ShadowRace 生命周期，避免状态丢失或残留
- **question 标记设置同步**：影子挑战的 flag/unflag 操作现在读取 `Settings.get('question')`，不再硬编码 `false`，与玩家当前设置保持一致
- **平局判定**：`onPlayerEnd` 新增 `draw` 标志，当玩家与影子时间完全相同时正确显示平局结果
- **主题颜色去硬编码**：`shadowFlash` 动画绿色 `rgba(52,211,153)` → `var(--secondary)`；进度条渐变 `#34d399` → `var(--primary)`，适配全部11种强调色
- **视觉反馈完整性**：`reveal` 和 `chord` 操作现在会闪烁所有实际被揭示的格子（包括 floodReveal 扩散的格子），不再只闪烁中心格
- **挑战按钮过滤**：作战日志卡片和战后分析详情页的挑战按钮仅在记录同时包含 `seed` + `replay` 时显示，避免旧数据/无效记录误点
- **数据验证强化**：`ShadowRace.setup()` 新增 `width/height/mineCount` 有效性检查，防止损坏记录导致棋盘创建异常
- **模式边界保护**：无尽模式/生存模式的胜利/失败结算流程补充 `ShadowRace.stop()`，彻底杜绝跨模式状态泄漏

---

## v1.6.0 (2026-04-29)

### 新增功能
- **🏁 影子挑战（Shadow Challenge）**
  与"过去的自己"在同一棋盘竞速的全新体验：
  - **入口**：作战日志卡片和战后分析详情页均新增"🏁 挑战影子"按钮
  - **相同棋盘**：使用历史记录的相同种子、尺寸、雷数生成完全一致的地雷分布
  - **实时幽灵**：影子的每次 reveal/flag/chord 以半透明闪烁/幽灵标记实时显示在玩家棋盘上
  - **进度追踪**：游戏内底部新增影子进度条，显示影子已揭示的安全格百分比
  - **公平竞速**：玩家暂停时影子同步暂停，恢复后影子追赶暂停期间积压的动作
  - **竞速结果**：游戏结束弹窗新增影子竞速结果面板，显示时间差距、胜负判定
  - **自定义支持**：自动识别并正确处理自定义尺寸棋盘的历史记录

### 技术实现
- `shadow-race.js` 独立模块：基于 `requestAnimationFrame` 的 replay 播放器，支持 undo 状态回退
- `game.js` 集成：启动/暂停/恢复/结束时自动管理影子生命周期
- `ui.js` 事件系统：`shadowAction`（闪烁效果）/`shadowProgress`（进度条）/`shadowCompleted`（完成通知）/`shadowRaceEnd`（结果渲染）
- 历史栈限制：影子 undo 历史上限200条，防止极端情况内存泄漏
- 异常保护：replay 耗尽但游戏未结束时自动停止，避免无限循环

---

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
