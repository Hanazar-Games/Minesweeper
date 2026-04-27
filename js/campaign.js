/**
 * 战役模式模块
 * 15关线性关卡，带解锁、星级评价和进度保存
 */

const Campaign = (function() {
    const LEVEL_COUNT = 15;

    // 关卡数据：每关固定种子确保可复现
    const levels = [
        { id: 1,  name: '初试锋芒', width: 8,  height: 8,  mines: 10, seed: 10001, type: 'classic', timeTarget: 30,  desc: '经典 8×8，10 颗地雷' },
        { id: 2,  name: '稳扎稳打', width: 9,  height: 9,  mines: 10, seed: 10002, type: 'classic', timeTarget: 45,  desc: '标准初级难度' },
        { id: 3,  name: '步步为营', width: 12, height: 12, mines: 20, seed: 10003, type: 'classic', timeTarget: 90,  desc: '12×12，需要更多策略' },
        { id: 4,  name: '渐入佳境', width: 14, height: 14, mines: 30, seed: 10004, type: 'classic', timeTarget: 120, desc: '14×14，中等难度' },
        { id: 5,  name: '中级试炼', width: 16, height: 16, mines: 40, seed: 10005, type: 'classic', timeTarget: 180, desc: '标准中级难度' },
        { id: 6,  name: '争分夺秒', width: 10, height: 10, mines: 15, seed: 10006, type: 'time',    timeTarget: 60,  timeLimit: 60,  desc: '限时 60 秒完成' },
        { id: 7,  name: '安全地带', width: 12, height: 12, mines: 25, seed: 10007, type: 'noguess', timeTarget: 90,  desc: '无猜模式，首次点击 3×3 安全' },
        { id: 8,  name: '迷雾重重', width: 14, height: 14, mines: 35, seed: 10008, type: 'fog',     timeTarget: 150, desc: '迷雾模式，视野受限' },
        { id: 9,  name: '记忆大师', width: 16, height: 16, mines: 45, seed: 10009, type: 'blind',   timeTarget: 180, desc: '盲扫模式，仅 5 次揭示可见' },
        { id: 10, name: '极限挑战', width: 18, height: 18, mines: 50, seed: 10010, type: 'time',    timeTarget: 200, timeLimit: 120, desc: '更大版面，限时 120 秒' },
        { id: 11, name: '无猜进阶', width: 20, height: 20, mines: 60, seed: 10011, type: 'noguess', timeTarget: 240, desc: '20×20 无猜模式' },
        { id: 12, name: '深渊迷雾', width: 22, height: 22, mines: 75, seed: 10012, type: 'fog',     timeTarget: 300, desc: '22×22 迷雾模式' },
        { id: 13, name: '生死时速', width: 24, height: 24, mines: 90, seed: 10013, type: 'time',    timeTarget: 350, timeLimit: 180, desc: '24×24，限时 180 秒' },
        { id: 14, name: '暗夜潜行', width: 26, height: 26, mines: 110, seed: 10014, type: 'blind',  timeTarget: 400, desc: '26×26 盲扫模式' },
        { id: 15, name: '终极考验', width: 30, height: 16, mines: 99, seed: 10015, type: 'classic', timeTarget: 300, desc: '标准高级难度——终极挑战！' },
    ];

    // 默认进度
    function getDefaultProgress() {
        var progress = {};
        for (var i = 1; i <= LEVEL_COUNT; i++) {
            progress[i] = { unlocked: i === 1, stars: 0, bestTime: null, completed: false };
        }
        return progress;
    }

    var progress = getDefaultProgress();

    function load() {
        try {
            var saved = Storage.get('campaign_progress');
            if (saved) {
                progress = deepMerge(getDefaultProgress(), saved);
            }
        } catch (e) {}
    }

    function save() {
        try {
            Storage.set('campaign_progress', progress);
        } catch (e) {}
    }

    function deepMerge(target, source) {
        for (var key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                target[key] = deepMerge(target[key] || {}, source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    }

    function getLevel(id) {
        return levels[id - 1] || null;
    }

    function getProgress(id) {
        return progress[id] || { unlocked: false, stars: 0, bestTime: null, completed: false };
    }

    function isUnlocked(id) {
        return id === 1 || (progress[id] && progress[id].unlocked);
    }

    // 计算星级 (0-3)
    // star1: 在时间目标内完成
    // star2: 效率 >= 50% (3BV / clicks >= 0.5)
    // star3: 未使用提示、撤销、道具
    function calculateStars(levelId, time, clicks, bv, usedHint, usedUndo, usedPowerup) {
        var level = getLevel(levelId);
        if (!level) return 0;
        var stars = 0;
        if (time <= level.timeTarget) stars++;
        if (clicks > 0 && (bv / clicks) >= 0.5) stars++;
        if (!usedHint && !usedUndo && !usedPowerup) stars++;
        return stars;
    }

    // 完成关卡
    function completeLevel(id, time, clicks, bv, usedHint, usedUndo, usedPowerup) {
        var p = progress[id];
        if (!p) return 0;
        p.completed = true;
        if (p.bestTime === null || time < p.bestTime) {
            p.bestTime = time;
        }
        var newStars = calculateStars(id, time, clicks, bv, usedHint, usedUndo, usedPowerup);
        if (newStars > p.stars) {
            p.stars = newStars;
        }
        // 解锁下一关
        if (id < LEVEL_COUNT) {
            progress[id + 1].unlocked = true;
        }
        save();
        return p.stars;
    }

    function getTotalStars() {
        var total = 0;
        for (var i = 1; i <= LEVEL_COUNT; i++) {
            total += (progress[i] && progress[i].stars) || 0;
        }
        return total;
    }

    function getMaxStars() {
        return LEVEL_COUNT * 3;
    }

    function resetProgress() {
        progress = getDefaultProgress();
        save();
    }

    // 生成关卡统计数据
    function getStats() {
        var completed = 0;
        var totalStars = 0;
        for (var i = 1; i <= LEVEL_COUNT; i++) {
            if (progress[i] && progress[i].completed) completed++;
            totalStars += (progress[i] && progress[i].stars) || 0;
        }
        return { completed: completed, totalStars: totalStars, maxStars: LEVEL_COUNT * 3 };
    }

    load();

    return {
        levels: levels,
        LEVEL_COUNT: LEVEL_COUNT,
        getLevel: getLevel,
        getProgress: getProgress,
        isUnlocked: isUnlocked,
        calculateStars: calculateStars,
        completeLevel: completeLevel,
        getTotalStars: getTotalStars,
        getMaxStars: getMaxStars,
        resetProgress: resetProgress,
        getStats: getStats,
        load: load,
        save: save
    };
})();
