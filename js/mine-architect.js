/**
 * 布雷大师模块 (Mine Architect)
 * 反向扫雷玩法：根据数字提示在棋盘上放置正确数量的雷
 */

const MineArchitect = (function() {
    'use strict';

    // ============ 关卡数据 ============
    var LEVELS = [
        {
            id: 1,
            name: '初试锋芒',
            desc: '三个 1 指向同一个角落，那里藏着什么？',
            width: 3,
            height: 3,
            mineCount: 1,
            revealed: [
                {x: 0, y: 1, num: 1},
                {x: 1, y: 0, num: 1},
                {x: 1, y: 1, num: 1}
            ]
        },
        {
            id: 2,
            name: '双重威胁',
            desc: '对角线上的数字在暗示着什么？',
            width: 3,
            height: 3,
            mineCount: 2,
            revealed: [
                {x: 0, y: 2, num: 1},
                {x: 1, y: 1, num: 2},
                {x: 2, y: 0, num: 1}
            ]
        },
        {
            id: 3,
            name: '角落与中心',
            desc: '角落的数字和中心的数字共同编织了一张逻辑网。',
            width: 4,
            height: 4,
            mineCount: 2,
            revealed: [
                {x: 0, y: 1, num: 1},
                {x: 1, y: 0, num: 1},
                {x: 1, y: 1, num: 2},
                {x: 1, y: 2, num: 1},
                {x: 2, y: 1, num: 1}
            ]
        },
        {
            id: 4,
            name: '三足鼎立',
            desc: '三个角落各藏着一个秘密。',
            width: 4,
            height: 4,
            mineCount: 3,
            revealed: [
                {x: 0, y: 1, num: 1},
                {x: 0, y: 2, num: 1},
                {x: 1, y: 0, num: 1},
                {x: 1, y: 1, num: 1},
                {x: 1, y: 3, num: 1},
                {x: 3, y: 1, num: 1}
            ]
        },
        {
            id: 5,
            name: '四方封锁',
            desc: '四个角落都被封锁，每一个数字都是关键线索。',
            width: 4,
            height: 4,
            mineCount: 4,
            revealed: [
                {x: 0, y: 1, num: 1},
                {x: 0, y: 2, num: 1},
                {x: 1, y: 0, num: 1},
                {x: 1, y: 1, num: 1},
                {x: 1, y: 3, num: 1},
                {x: 2, y: 0, num: 1},
                {x: 2, y: 3, num: 1},
                {x: 3, y: 1, num: 1},
                {x: 3, y: 2, num: 1}
            ]
        },
        {
            id: 6,
            name: '迷雾森林',
            desc: '5×5 的迷雾中隐藏着 4 个陷阱，小心推理每一步。',
            width: 5,
            height: 5,
            mineCount: 4,
            revealed: [
                {x: 0, y: 0, num: 0},
                {x: 0, y: 1, num: 1},
                {x: 1, y: 0, num: 0},
                {x: 1, y: 1, num: 1},
                {x: 2, y: 0, num: 0},
                {x: 2, y: 1, num: 1},
                {x: 2, y: 2, num: 3},
                {x: 3, y: 0, num: 0},
                {x: 3, y: 1, num: 0},
                {x: 3, y: 2, num: 1},
                {x: 4, y: 0, num: 0},
                {x: 4, y: 1, num: 0},
                {x: 4, y: 2, num: 1}
            ]
        },
        {
            id: 7,
            name: '深海迷宫',
            desc: '数字像灯塔一样指引方向，但只有最冷静的人才能找到出口。',
            width: 5,
            height: 5,
            mineCount: 5,
            revealed: [
                {x: 2, y: 0, num: 1},
                {x: 3, y: 0, num: 0},
                {x: 4, y: 0, num: 0},
                {x: 2, y: 1, num: 1},
                {x: 3, y: 1, num: 0},
                {x: 4, y: 1, num: 0},
                {x: 2, y: 2, num: 1},
                {x: 3, y: 2, num: 2},
                {x: 4, y: 2, num: 2}
            ]
        },
        {
            id: 8,
            name: '荒漠遗迹',
            desc: '6×6 的古老遗迹中埋藏着 6 个秘密，历史的线索散落在沙砾之间。',
            width: 6,
            height: 6,
            mineCount: 6,
            revealed: [
                {x: 1, y: 1, num: 2},
                {x: 2, y: 1, num: 1},
                {x: 3, y: 1, num: 2},
                {x: 1, y: 3, num: 2},
                {x: 2, y: 3, num: 3},
                {x: 3, y: 3, num: 2},
                {x: 4, y: 4, num: 2},
                {x: 2, y: 0, num: 0},
                {x: 0, y: 2, num: 0},
                {x: 4, y: 2, num: 0},
                {x: 5, y: 3, num: 0}
            ]
        },
        {
            id: 9,
            name: '火山核心',
            desc: '炽热的岩浆在地下流动，7 个危险的喷发点等待被发现。',
            width: 6,
            height: 6,
            mineCount: 7,
            revealed: [
                {x: 0, y: 1, num: 1},
                {x: 0, y: 2, num: 0},
                {x: 0, y: 3, num: 1},
                {x: 1, y: 1, num: 1},
                {x: 1, y: 2, num: 0},
                {x: 1, y: 3, num: 2},
                {x: 2, y: 0, num: 1},
                {x: 2, y: 1, num: 1},
                {x: 2, y: 2, num: 0},
                {x: 2, y: 3, num: 2},
                {x: 3, y: 0, num: 0},
                {x: 3, y: 1, num: 0},
                {x: 3, y: 2, num: 0},
                {x: 3, y: 3, num: 1},
                {x: 4, y: 0, num: 1},
                {x: 4, y: 1, num: 2},
                {x: 4, y: 2, num: 2},
                {x: 4, y: 3, num: 2}
            ]
        },
        {
            id: 10,
            name: '终极核心',
            desc: '最后的挑战。8 个隐藏在深处的秘密，只有真正的布雷大师才能解开。',
            width: 6,
            height: 6,
            mineCount: 8,
            revealed: [
                {x: 0, y: 2, num: 1},
                {x: 0, y: 3, num: 0},
                {x: 0, y: 4, num: 0},
                {x: 0, y: 5, num: 0},
                {x: 1, y: 2, num: 2},
                {x: 1, y: 3, num: 1},
                {x: 1, y: 4, num: 0},
                {x: 1, y: 5, num: 0},
                {x: 2, y: 3, num: 1},
                {x: 2, y: 4, num: 0},
                {x: 2, y: 5, num: 0},
                {x: 3, y: 3, num: 2},
                {x: 3, y: 4, num: 1},
                {x: 3, y: 5, num: 1}
            ]
        }
    ];

    // ============ 状态 ============
    var progress = {};

    function ensureProgress() {
        for (var i = 0; i < LEVELS.length; i++) {
            var id = LEVELS[i].id;
            if (!progress[id]) {
                progress[id] = { unlocked: id === 1, completed: false, bestTime: null, stars: 0 };
            }
        }
    }

    function loadProgress() {
        var saved = Storage.get('architect_progress');
        if (saved) {
            try {
                var data = saved;
                // 兼容旧数据（双重 JSON.stringify）
                if (typeof saved === 'string') {
                    data = JSON.parse(saved);
                }
                if (data && typeof data === 'object') {
                    progress = data;
                }
            } catch (e) {
                console.warn('[MineArchitect] Failed to load progress:', e);
            }
        }
        ensureProgress();
    }

    function saveProgress() {
        try {
            Storage.set('architect_progress', progress);
        } catch (e) {
            console.warn('[MineArchitect] Failed to save progress:', e);
        }
    }

    // ============ 核心逻辑 ============

    function countMinesAround(x, y, mines) {
        var count = 0;
        for (var dy = -1; dy <= 1; dy++) {
            for (var dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                var nx = x + dx, ny = y + dy;
                for (var i = 0; i < mines.length; i++) {
                    if (mines[i].x === nx && mines[i].y === ny) {
                        count++;
                        break;
                    }
                }
            }
        }
        return count;
    }

    function validateAnswer(level, playerMines) {
        if (playerMines.length !== level.mineCount) {
            return { correct: false, reason: '需要放置 ' + level.mineCount + ' 颗雷，当前 ' + playerMines.length + ' 颗' };
        }

        for (var i = 0; i < level.revealed.length; i++) {
            var r = level.revealed[i];
            var actual = countMinesAround(r.x, r.y, playerMines);
            if (r.num !== actual) {
                return { correct: false, x: r.x, y: r.y, expected: r.num, actual: actual };
            }
        }

        return { correct: true };
    }

    function getStars(timeMs) {
        var seconds = timeMs / 1000;
        if (seconds <= 30) return 3;
        if (seconds <= 90) return 2;
        return 1;
    }

    function tryUnlockNext(currentId) {
        for (var i = 0; i < LEVELS.length - 1; i++) {
            if (LEVELS[i].id === currentId) {
                var nextId = LEVELS[i + 1].id;
                if (progress[nextId] && !progress[nextId].unlocked) {
                    progress[nextId].unlocked = true;
                }
                break;
            }
        }
    }

    // ============ 公开 API ============

    function init() {
        loadProgress();
    }

    function getLevels() {
        return LEVELS.map(function(lvl) {
            var p = progress[lvl.id];
            return {
                id: lvl.id,
                name: lvl.name,
                desc: lvl.desc,
                width: lvl.width,
                height: lvl.height,
                mineCount: lvl.mineCount,
                unlocked: p ? p.unlocked : false,
                completed: p ? p.completed : false,
                stars: p ? p.stars : 0
            };
        });
    }

    function getLevel(id) {
        for (var i = 0; i < LEVELS.length; i++) {
            if (LEVELS[i].id === id) {
                var p = progress[id];
                var lvl = LEVELS[i];
                return {
                    data: {
                        id: lvl.id,
                        name: lvl.name,
                        desc: lvl.desc,
                        width: lvl.width,
                        height: lvl.height,
                        mineCount: lvl.mineCount,
                        revealed: lvl.revealed.map(function(r) { return {x: r.x, y: r.y, num: r.num}; })
                    },
                    unlocked: p ? p.unlocked : false,
                    completed: p ? p.completed : false,
                    bestTime: p ? p.bestTime : null,
                    stars: p ? p.stars : 0
                };
            }
        }
        return null;
    }

    function submitAnswer(levelId, playerMines, timeMs) {
        var level = null;
        for (var i = 0; i < LEVELS.length; i++) {
            if (LEVELS[i].id === levelId) {
                level = LEVELS[i];
                break;
            }
        }
        if (!level) return { correct: false, reason: '关卡不存在' };

        var result = validateAnswer(level, playerMines);
        if (result.correct) {
            var p = progress[levelId];
            p.completed = true;
            if (p.bestTime === null || timeMs < p.bestTime) {
                p.bestTime = timeMs;
            }
            var stars = getStars(timeMs);
            if (stars > p.stars) p.stars = stars;

            tryUnlockNext(levelId);
            saveProgress();

            // 触发成就检查
            if (typeof Achievements !== 'undefined' && Achievements.check) {
                try {
                    Achievements.check({ architect: true, levelId: levelId, stars: stars });
                } catch (e) {}
            }
        }

        return result;
    }

    function reset() {
        progress = {};
        ensureProgress();
        saveProgress();
    }

    init();

    return {
        init: init,
        getLevels: getLevels,
        getLevel: getLevel,
        submitAnswer: submitAnswer,
        reset: reset
    };
})();
