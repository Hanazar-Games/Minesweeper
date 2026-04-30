/**
 * 影子挑战模块 (Shadow Challenge)
 * 与历史记录在同一棋盘竞速，影子实时播放历史 replay
 */

const ShadowRace = (function() {
    var active = false;
    var shadowEntry = null;
    var shadowReplay = [];
    var shadowBoard = null;
    var shadowHistory = [];
    var shadowStartTime = 0;
    var shadowCompleted = false;
    var animationId = null;
    var nextActionIndex = 0;
    var playerStartTime = 0;
    var paused = false;

    /**
     * 从历史记录设置影子挑战
     */
    function setup(entryId) {
        var entry = BattleLog.getById(entryId);
        if (!entry) {
            console.warn('ShadowRace: entry not found', entryId);
            return false;
        }
        if (entry.seed === null || entry.seed === undefined) {
            console.warn('ShadowRace: entry has no seed', entryId);
            return false;
        }
        if (!entry.replay || entry.replay.length === 0) {
            console.warn('ShadowRace: entry has no replay', entryId);
            return false;
        }
        if (!entry.width || !entry.height || !entry.mineCount) {
            console.warn('ShadowRace: entry has invalid board dimensions', entryId);
            return false;
        }

        shadowEntry = entry;
        shadowReplay = entry.replay.slice();
        active = true;
        nextActionIndex = 0;
        shadowCompleted = false;
        shadowHistory = [];

        // 创建影子棋盘（相同种子确保相同雷分布）
        shadowBoard = new MinesweeperBoard(entry.width, entry.height, entry.mineCount, entry.seed);

        return true;
    }

    /**
     * 开始影子播放
     */
    function start() {
        if (!active || !shadowEntry) return;
        playerStartTime = Date.now();
        shadowStartTime = Date.now();
        nextActionIndex = 0;
        shadowCompleted = false;
        paused = false;
        tick();
    }

    function pause() {
        if (!active || paused) return;
        paused = true;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }

    function resume() {
        if (!active || !paused) return;
        paused = false;
        tick();
    }

    /**
     * 每帧检查并执行到期的影子动作
     */
    function tick() {
        if (!active || paused) return;

        var elapsed = Date.now() - shadowStartTime;
        var progressed = false;

        // 执行所有到期的动作（恢复后会立即追赶暂停期间积压的动作）
        while (nextActionIndex < shadowReplay.length &&
               shadowReplay[nextActionIndex].time <= elapsed) {
            executeShadowAction(shadowReplay[nextActionIndex]);
            nextActionIndex++;
            progressed = true;
        }

        // 派发进度更新事件
        if (progressed || elapsed % 1000 < 50) {
            document.dispatchEvent(new CustomEvent('shadowProgress', {
                detail: {
                    progress: calculateProgress(),
                    shadowTime: elapsed / 1000,
                    playerTime: (Date.now() - playerStartTime) / 1000,
                    completed: shadowCompleted
                }
            }));
        }

        // 检查影子是否完成
        if (!shadowCompleted && shadowBoard && shadowBoard.checkWin()) {
            shadowCompleted = true;
            document.dispatchEvent(new CustomEvent('shadowCompleted', {
                detail: {
                    time: shadowEntry.time || 0,
                    progress: 100
                }
            }));
        }

        // 所有动作已执行且未完成 → 停止（异常数据保护）
        if (nextActionIndex >= shadowReplay.length && !shadowCompleted) {
            return;
        }

        // 继续动画
        if (active && !paused) {
            animationId = requestAnimationFrame(tick);
        }
    }

    /**
     * 在影子棋盘上执行单个动作
     */
    function executeShadowAction(action) {
        if (!shadowBoard) return;

        var type = action.action;
        var x = action.x;
        var y = action.y;

        // undo 动作：从历史栈恢复状态
        if (type === 'undo') {
            if (shadowHistory.length > 0) {
                var prev = shadowHistory.pop();
                shadowBoard = prev.board;
            }
            document.dispatchEvent(new CustomEvent('shadowAction', {
                detail: { action: 'undo', x: x, y: y, progress: calculateProgress() }
            }));
            return;
        }

        // 保存当前状态（用于后续 undo）
        shadowHistory.push({
            board: shadowBoard.clone()
        });
        // 限制历史栈大小，防止极端情况内存泄漏
        if (shadowHistory.length > 200) {
            shadowHistory.shift();
        }

        var result = null;
        var cellChanged = false;

        if (type === 'reveal') {
            result = shadowBoard.reveal(x, y);
            cellChanged = result && (result.changed || result.revealed);
        } else if (type === 'flag' || type === 'unflag') {
            var useQuestion = (typeof Settings !== 'undefined') ? Settings.get('question') : false;
            result = shadowBoard.toggleFlag(x, y, useQuestion);
            cellChanged = result && result.changed;
        } else if (type === 'chord') {
            result = shadowBoard.chord(x, y);
            cellChanged = result && (result.changed || result.revealed);
        }

        if (cellChanged || type === 'undo') {
            document.dispatchEvent(new CustomEvent('shadowAction', {
                detail: {
                    action: type,
                    x: x,
                    y: y,
                    result: result,
                    progress: calculateProgress()
                }
            }));
        }
    }

    /**
     * 计算影子进度（已揭示安全格百分比）
     */
    function calculateProgress() {
        if (!shadowBoard) return 0;
        var totalSafe = shadowBoard.width * shadowBoard.height - shadowBoard.mineCount;
        if (totalSafe <= 0) return 0;
        return Math.min(100, Math.round((shadowBoard.revealedCount / totalSafe) * 100));
    }

    /**
     * 停止影子挑战
     */
    function stop() {
        active = false;
        paused = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        shadowEntry = null;
        shadowReplay = [];
        shadowBoard = null;
        shadowHistory = [];
    }

    /**
     * 玩家完成时调用，返回竞速结果
     */
    function onPlayerEnd(won, playerTime) {
        if (!active) return null;

        var shadowTime = shadowCompleted ? (shadowEntry.time || 0) : null;
        var result = {
            won: won,
            playerTime: playerTime,
            shadowTime: shadowTime,
            shadowCompleted: shadowCompleted,
            playerWon: won,
            shadowWon: shadowCompleted,
            entry: shadowEntry
        };

        // 判定胜负
        if (won && shadowCompleted) {
            if (playerTime < shadowTime) {
                result.beatShadow = true;
                result.timeDiff = shadowTime - playerTime;
            } else if (playerTime > shadowTime) {
                result.beatShadow = false;
                result.timeDiff = playerTime - shadowTime;
            } else {
                result.beatShadow = false;
                result.timeDiff = 0;
                result.draw = true;
            }
        } else if (won && !shadowCompleted) {
            result.beatShadow = true;
            result.timeDiff = null;
        } else if (!won && shadowCompleted) {
            result.beatShadow = false;
            result.timeDiff = null;
        } else {
            // 双方都未完成（玩家输了但影子也没完成）
            result.beatShadow = false;
            result.timeDiff = null;
        }

        return result;
    }

    function getState() {
        return {
            active: active,
            completed: shadowCompleted,
            progress: calculateProgress(),
            playerTime: active && playerStartTime > 0 ? (Date.now() - playerStartTime) / 1000 : 0,
            shadowTime: active && shadowStartTime > 0 ? (Date.now() - shadowStartTime) / 1000 : 0,
            entry: shadowEntry
        };
    }

    function isActive() { return active; }
    function getEntry() { return shadowEntry; }

    return {
        setup: setup,
        start: start,
        pause: pause,
        resume: resume,
        stop: stop,
        getState: getState,
        isActive: isActive,
        getEntry: getEntry,
        onPlayerEnd: onPlayerEnd
    };
})();
