/**
 * 雷暴突袭模块 (Thunder Rush)
 * 快节奏连续微型扫雷挑战模式
 * 
 * 核心机制：
 * - 5×5 微型棋盘，标准扫雷规则
 * - 时间池机制：初始 60 秒，完成奖励时间，踩雷扣时间
 * - 连击倍率：连续正确完成获得分数加成（1.0× ~ 3.0×）
 * - 难度递增：题数越多，雷数越多
 * - 首次点击保护：确保开局安全
 */

const ThunderRush = (function() {
    'use strict';

    // ============ 配置 ============
    var CONFIG = {
        boardWidth: 5,
        boardHeight: 5,
        baseTime: 60,
        minePenalty: 20,
        baseScore: 100,
        maxHistory: 10
    };

    /**
     * 根据题号获取当前难度配置
     */
    function getLevel(puzzleNum) {
        if (puzzleNum <= 3) return { mines: 3, reward: 15, name: '入门' };
        if (puzzleNum <= 6) return { mines: 4, reward: 13, name: '简单' };
        if (puzzleNum <= 10) return { mines: 5, reward: 11, name: '中等' };
        if (puzzleNum <= 15) return { mines: 6, reward: 9, name: '困难' };
        if (puzzleNum <= 20) return { mines: 7, reward: 7, name: '专家' };
        return { mines: 8, reward: 5, name: '大师' };
    }

    // ============ 状态 ============
    var gameState = 'idle'; // idle, playing, ended
    var currentBoard = null;
    var firstClick = true;
    var timePool = 0;
    var score = 0;
    var streak = 0;
    var maxStreak = 0;
    var puzzleCount = 0;
    var solvedCount = 0;
    var timerInterval = null;
    var puzzleStartTime = 0;
    var hitMineThisPuzzle = false;
    var hitCells = [];

    // 持久化统计
    var stats = {
        bestScore: 0,
        bestStreak: 0,
        totalGames: 0,
        totalSolved: 0,
        history: []
    };

    // ============ 棋盘操作工具函数 ============

    /**
     * 生成随机棋盘，确保 (safeX, safeY) 位置不是雷
     */
    function generateBoard(mineCount, safeX, safeY) {
        var mines = [];
        var available = [];
        for (var y = 0; y < CONFIG.boardHeight; y++) {
            for (var x = 0; x < CONFIG.boardWidth; x++) {
                if (x === safeX && y === safeY) continue;
                available.push({ x: x, y: y });
            }
        }
        // Fisher-Yates 洗牌
        for (var i = available.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = available[i];
            available[i] = available[j];
            available[j] = tmp;
        }
        var count = Math.min(mineCount, available.length);
        for (var i = 0; i < count; i++) {
            mines.push({ x: available[i].x, y: available[i].y });
        }
        return {
            mines: mines,
            revealed: [],
            flagged: [],
            width: CONFIG.boardWidth,
            height: CONFIG.boardHeight
        };
    }

    function hasMine(board, x, y) {
        if (!board || x < 0 || x >= board.width || y < 0 || y >= board.height) return false;
        for (var i = 0; i < board.mines.length; i++) {
            if (board.mines[i].x === x && board.mines[i].y === y) return true;
        }
        return false;
    }

    function isRevealed(board, x, y) {
        if (!board) return false;
        for (var i = 0; i < board.revealed.length; i++) {
            if (board.revealed[i].x === x && board.revealed[i].y === y) return true;
        }
        return false;
    }

    function isFlagged(board, x, y) {
        if (!board) return false;
        for (var i = 0; i < board.flagged.length; i++) {
            if (board.flagged[i].x === x && board.flagged[i].y === y) return true;
        }
        return false;
    }

    function getNumber(board, x, y) {
        if (hasMine(board, x, y)) return -1;
        var count = 0;
        for (var dy = -1; dy <= 1; dy++) {
            for (var dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                if (hasMine(board, x + dx, y + dy)) count++;
            }
        }
        return count;
    }

    /**
     * 连锁揭示格子。返回 'safe'（安全）、'mine'（踩雷）或 null（已揭示/越界）
     */
    function revealCell(board, x, y) {
        if (x < 0 || x >= board.width || y < 0 || y >= board.height) return null;
        if (isRevealed(board, x, y) || isFlagged(board, x, y)) return null;
        if (hasMine(board, x, y)) return 'mine';

        board.revealed.push({ x: x, y: y });
        var num = getNumber(board, x, y);
        if (num === 0) {
            for (var dy = -1; dy <= 1; dy++) {
                for (var dx = -1; dx <= 1; dx++) {
                    revealCell(board, x + dx, y + dy);
                }
            }
        }
        return 'safe';
    }

    function toggleFlag(board, x, y) {
        if (!board || isRevealed(board, x, y)) return null;
        var idx = -1;
        for (var i = 0; i < board.flagged.length; i++) {
            if (board.flagged[i].x === x && board.flagged[i].y === y) {
                idx = i;
                break;
            }
        }
        if (idx >= 0) {
            board.flagged.splice(idx, 1);
            return false;
        } else {
            board.flagged.push({ x: x, y: y });
            return true;
        }
    }

    /**
     * 检查是否所有安全格都已被揭示
     */
    function isComplete(board) {
        if (!board) return false;
        for (var y = 0; y < board.height; y++) {
            for (var x = 0; x < board.width; x++) {
                if (!hasMine(board, x, y) && !isRevealed(board, x, y)) {
                    return false;
                }
            }
        }
        return true;
    }

    // ============ 游戏流程 ============

    function init() {
        loadStats();
    }

    function startGame() {
        gameState = 'playing';
        timePool = CONFIG.baseTime;
        score = 0;
        streak = 0;
        maxStreak = 0;
        puzzleCount = 0;
        solvedCount = 0;
        firstClick = true;
        hitMineThisPuzzle = false;

        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        timerInterval = setInterval(tick, 100);

        nextPuzzle();

        if (typeof AudioManager !== 'undefined') AudioManager.playLevelUp();
    }

    function nextPuzzle() {
        puzzleCount++;
        firstClick = true;
        hitMineThisPuzzle = false;
        hitCells = [];
        var level = getLevel(puzzleCount);
        currentBoard = {
            mines: [],
            revealed: [],
            flagged: [],
            width: CONFIG.boardWidth,
            height: CONFIG.boardHeight,
            mineCount: level.mines,
            reward: level.reward,
            levelName: level.name
        };
        puzzleStartTime = Date.now();
    }

    /**
     * 处理格子点击。返回 true 表示棋盘状态发生了改变。
     */
    function handleCellClick(x, y, isRightClick) {
        if (gameState !== 'playing' || !currentBoard) return false;

        if (firstClick) {
            if (isRightClick) return false; // 首次点击前不允许标记
            firstClick = false;
            currentBoard = generateBoard(currentBoard.mineCount, x, y);
            revealCell(currentBoard, x, y);
            if (typeof AudioManager !== 'undefined') AudioManager.playReveal();
            return true;
        }

        if (isRightClick) {
            var added = toggleFlag(currentBoard, x, y);
            if (added === null) return false;
            if (typeof AudioManager !== 'undefined') {
                if (added) AudioManager.playFlag();
                else AudioManager.playUnflag();
            }
            return true;
        }

        if (isRevealed(currentBoard, x, y) || isFlagged(currentBoard, x, y)) return false;

        var result = revealCell(currentBoard, x, y);
        if (result === 'mine') {
            hitMineThisPuzzle = true;
            hitCells.push({ x: x, y: y });
            timePool -= CONFIG.minePenalty;
            streak = 0;
            if (typeof AudioManager !== 'undefined') AudioManager.playLose();
            if (timePool <= 0) {
                timePool = 0;
                endGame();
                return true;
            }
            setTimeout(function() {
                if (gameState === 'playing') nextPuzzle();
            }, 900);
            return true;
        } else if (result === 'safe') {
            if (typeof AudioManager !== 'undefined') AudioManager.playReveal();
            if (isComplete(currentBoard)) {
                onPuzzleComplete();
            }
            return true;
        }
        return false;
    }

    function onPuzzleComplete() {
        solvedCount++;
        streak++;
        if (streak > maxStreak) maxStreak = streak;

        var timeUsed = (Date.now() - puzzleStartTime) / 1000;
        var timeBonus = Math.max(0, Math.floor((8 - timeUsed) * 15));
        var multiplier = streak >= 5 ? 3.0 : streak >= 4 ? 2.0 : streak >= 3 ? 1.5 : streak >= 2 ? 1.2 : 1.0;
        var puzzleScore = Math.floor((CONFIG.baseScore + timeBonus) * multiplier);
        score += puzzleScore;

        timePool += currentBoard.reward;

        if (typeof AudioManager !== 'undefined') {
            if (streak >= 5) AudioManager.playStreakUp();
            else AudioManager.playWin();
        }

        setTimeout(function() {
            if (gameState === 'playing') nextPuzzle();
        }, 1000);
    }

    function tick() {
        if (gameState !== 'playing') return;
        timePool -= 0.1;
        if (timePool <= 0) {
            timePool = 0;
            endGame();
        }
    }

    function endGame() {
        if (gameState !== 'playing') return;
        gameState = 'ended';
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        stats.totalGames++;
        stats.totalSolved += solvedCount;
        if (score > stats.bestScore) stats.bestScore = score;
        if (maxStreak > stats.bestStreak) stats.bestStreak = maxStreak;

        stats.history.push({
            date: new Date().toISOString(),
            score: score,
            streak: maxStreak,
            solved: solvedCount
        });
        if (stats.history.length > CONFIG.maxHistory) {
            stats.history.shift();
        }

        saveStats();

        // 触发成就检查
        if (typeof Achievements !== 'undefined' && Achievements.check) {
            try {
                Achievements.check({
                    thunderRush: true,
                    score: score,
                    streak: maxStreak,
                    solved: solvedCount
                });
            } catch (e) {
                console.warn('[ThunderRush] Achievement check failed:', e);
            }
        }

        if (typeof AudioManager !== 'undefined') AudioManager.playTimeout();
    }

    function stopGame() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        gameState = 'idle';
        currentBoard = null;
    }

    // ============ 持久化 ============

    function loadStats() {
        var saved = Storage.get('thunder_rush_stats');
        if (saved) {
            try {
                var parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') {
                    stats.bestScore = parsed.bestScore || 0;
                    stats.bestStreak = parsed.bestStreak || 0;
                    stats.totalGames = parsed.totalGames || 0;
                    stats.totalSolved = parsed.totalSolved || 0;
                    stats.history = Array.isArray(parsed.history) ? parsed.history : [];
                }
            } catch (e) {
                console.warn('[ThunderRush] Failed to load stats:', e);
            }
        }
    }

    function saveStats() {
        try {
            Storage.set('thunder_rush_stats', JSON.stringify(stats));
        } catch (e) {
            console.warn('[ThunderRush] Failed to save stats:', e);
        }
    }

    // ============ 公开 API ============

    return {
        init: init,
        startGame: startGame,
        stopGame: stopGame,
        handleCellClick: handleCellClick,
        getState: function() {
            return {
                gameState: gameState,
                board: currentBoard,
                timePool: timePool,
                score: score,
                streak: streak,
                maxStreak: maxStreak,
                puzzleCount: puzzleCount,
                solvedCount: solvedCount,
                firstClick: firstClick,
                hitMine: hitMineThisPuzzle,
                hitCells: hitCells.slice()
            };
        },
        getStats: function() {
            return {
                bestScore: stats.bestScore,
                bestStreak: stats.bestStreak,
                totalGames: stats.totalGames,
                totalSolved: stats.totalSolved,
                history: stats.history.slice()
            };
        },
        getConfig: function() {
            return CONFIG;
        }
    };
})();
