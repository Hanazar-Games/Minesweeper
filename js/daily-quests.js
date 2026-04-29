/**
 * 每日任务系统
 * 每天生成3个随机任务，完成后奖励道具
 */

const DailyQuests = (function() {
    const QUEST_TYPES = [
        { id: 'win_any', name: '完成对局', desc: '完成{target}局任意难度的扫雷', check: 'win', needs: 'count' },
        { id: 'win_beginner', name: '初级挑战', desc: '完成{target}局初级难度', check: 'win', needs: 'difficulty', diff: 'beginner' },
        { id: 'win_intermediate', name: '中级挑战', desc: '完成{target}局中级难度', check: 'win', needs: 'difficulty', diff: 'intermediate' },
        { id: 'win_expert', name: '高级挑战', desc: '完成{target}局高级难度', check: 'win', needs: 'difficulty', diff: 'expert' },
        { id: 'win_challenge', name: '挑战模式', desc: '完成{target}局任意挑战模式', check: 'win', needs: 'challenge' },
        { id: 'win_fast', name: '速通大师', desc: '在{target}秒内完成1局任意难度', check: 'win_fast', needs: 'time' },
        { id: 'no_undo_win', name: '一气呵成', desc: '不使用撤销完成{target}局', check: 'win', needs: 'no_undo' },
        { id: 'use_hint', name: '寻求提示', desc: '使用{target}次智能提示', check: 'hint', needs: 'count' },
        { id: 'use_powerup', name: '道具专家', desc: '使用{target}次任意道具', check: 'powerup', needs: 'count' },
        { id: 'flag_mines', name: '标记高手', desc: '累计标记{target}个地雷', check: 'flag', needs: 'count' },
        { id: 'reveal_cells', name: '探索者', desc: '累计揭示{target}个格子', check: 'reveal', needs: 'count' },
        { id: 'achieve_combo', name: '连击大师', desc: '单局内达成{target}连击', check: 'combo', needs: 'value' },
        { id: 'win_endless', name: '无尽勇者', desc: '在无尽模式中达到第{target}层', check: 'endless_level', needs: 'level' },
        { id: 'play_puzzle', name: '谜题工坊', desc: '完成{target}个自定义谜题', check: 'win', needs: 'puzzle' },
        { id: 'campaign_star', name: '战役推进', desc: '在战役模式中获得{target}颗星', check: 'campaign_stars', needs: 'count' }
    ];

    var currentTasks = [];
    var currentDateKey = '';
    var streak = 0;
    var lastCompleteDate = '';

    function getTodayKey() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function load() {
        var saved = Storage.get('daily_quests');
        var today = getTodayKey();
        if (saved && saved.date === today) {
            currentTasks = saved.tasks || [];
            streak = saved.streak || 0;
            lastCompleteDate = saved.lastCompleteDate || '';
        } else {
            // 检查昨天是否完成，更新 streak
            var yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            var yKey = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
            if (saved && saved.lastCompleteDate === yKey && saved.tasks && saved.tasks.every(function(t) { return t.completed; })) {
                streak = (saved.streak || 0) + 1;
            } else if (saved && saved.date !== today) {
                // 昨天没完成，重置 streak
                streak = 0;
            }
            generateTasks();
        }
        currentDateKey = today;
        save();
    }

    function save() {
        Storage.set('daily_quests', {
            date: currentDateKey,
            tasks: currentTasks,
            streak: streak,
            lastCompleteDate: lastCompleteDate
        });
    }

    function generateTasks() {
        currentTasks = [];
        var pool = QUEST_TYPES.slice();
        // Fisher-Yates shuffle
        for (var i = pool.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = pool[i];
            pool[i] = pool[j];
            pool[j] = tmp;
        }
        // 取前3个
        for (var k = 0; k < 3 && k < pool.length; k++) {
            var qt = pool[k];
            var target = getTargetForType(qt.id);
            currentTasks.push({
                type: qt.id,
                name: qt.name,
                desc: qt.desc.replace('{target}', target),
                target: target,
                progress: 0,
                completed: false,
                claimed: false
            });
        }
    }

    function getTargetForType(typeId) {
        var targets = {
            win_any: 2,
            win_beginner: 2,
            win_intermediate: 1,
            win_expert: 1,
            win_challenge: 1,
            win_fast: 60,
            no_undo_win: 1,
            use_hint: 3,
            use_powerup: 2,
            flag_mines: 10,
            reveal_cells: 50,
            achieve_combo: 10,
            win_endless: 3,
            play_puzzle: 2,
            campaign_star: 3
        };
        var base = targets[typeId] || 1;
        // streak 加成：目标稍微提高，但奖励更好
        if (streak > 3) base = Math.ceil(base * 1.2);
        return base;
    }

    function checkEvent(eventType, data) {
        var changed = false;
        for (var i = 0; i < currentTasks.length; i++) {
            var task = currentTasks[i];
            if (task.completed) continue;
            var qt = QUEST_TYPES.find(function(q) { return q.id === task.type; });
            if (!qt || qt.check !== eventType) continue;

            var matched = false;
            if (qt.needs === 'count') {
                task.progress++;
                matched = task.progress >= task.target;
            } else if (qt.needs === 'difficulty' && data && data.difficulty === qt.diff) {
                task.progress++;
                matched = task.progress >= task.target;
            } else if (qt.needs === 'challenge' && data && data.challengeMode) {
                task.progress++;
                matched = task.progress >= task.target;
            } else if (qt.needs === 'time' && data && data.won && data.time <= task.target) {
                task.progress = task.target;
                matched = true;
            } else if (qt.needs === 'no_undo' && data && data.won && !data.usedUndo) {
                task.progress++;
                matched = task.progress >= task.target;
            } else if (qt.needs === 'value' && data && data.value >= task.target) {
                task.progress = data.value;
                matched = true;
            } else if (qt.needs === 'level' && data && data.level >= task.target) {
                task.progress = data.level;
                matched = true;
            } else if (qt.needs === 'puzzle' && data && data.challengeMode === 'puzzle' && data.won) {
                task.progress++;
                matched = task.progress >= task.target;
            } else if (qt.needs === 'count' && eventType === 'campaign_stars' && data) {
                task.progress += data.stars || 0;
                matched = task.progress >= task.target;
            }

            if (matched && !task.completed) {
                task.completed = true;
                task.progress = task.target;
                changed = true;
                document.dispatchEvent(new CustomEvent('questComplete', { detail: { task: task } }));
            }
        }
        if (changed) {
            checkAllCompleted();
            save();
        }
    }

    function checkAllCompleted() {
        var allDone = currentTasks.every(function(t) { return t.completed; });
        if (allDone && currentDateKey !== lastCompleteDate) {
            lastCompleteDate = currentDateKey;
            document.dispatchEvent(new CustomEvent('allQuestsComplete', {
                detail: { streak: streak, rewards: getAllRewards() }
            }));
        }
    }

    function getAllRewards() {
        var rewards = [];
        currentTasks.forEach(function(t) {
            if (t.completed && !t.claimed) {
                t.claimed = true;
                rewards.push(claimReward(t));
            }
        });
        save();
        return rewards;
    }

    function claimReward(task) {
        var baseReward = { scanner: 1, shield: 0, freeze: 1, heatmap: 0 };
        // streak 加成
        var multiplier = 1 + Math.min(3, streak) * 0.5;
        var reward = {};
        for (var key in baseReward) {
            reward[key] = Math.floor(baseReward[key] * multiplier);
        }
        // 保底至少给1个 scanner
        if (reward.scanner === 0) reward.scanner = 1;
        return reward;
    }

    function getTasks() {
        return currentTasks.slice();
    }

    function getStreak() {
        return streak;
    }

    function hasUnclaimed() {
        return currentTasks.some(function(t) { return t.completed && !t.claimed; });
    }

    function getProgress() {
        var total = currentTasks.length;
        var done = currentTasks.filter(function(t) { return t.completed; }).length;
        return { total: total, done: done, hasUnclaimed: hasUnclaimed() };
    }

    function reset() {
        streak = 0;
        lastCompleteDate = '';
        generateTasks();
        save();
    }

    // 初始化时加载
    load();

    return {
        load: load,
        checkEvent: checkEvent,
        getTasks: getTasks,
        getStreak: getStreak,
        hasUnclaimed: hasUnclaimed,
        getProgress: getProgress,
        getAllRewards: getAllRewards,
        reset: reset
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DailyQuests;
}
