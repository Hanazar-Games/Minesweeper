/**
 * 禅意模式模块 (Zen Mode)
 * 无压力扫雷体验：踩雷不结束，专注度归零才失败
 * 每次完成在禅意花园种下一朵花
 */

const ZenMode = (function() {
    'use strict';

    // ============ 配置 ============
    var FOCUS_MAX = 100;
    var FOCUS_PENALTY_MISTAKE = 10;   // 踩雷扣除
    var FOCUS_PENALTY_HINT = 5;       // 使用提示扣除
    var FOCUS_REWARD_REVEAL = 1;      // 每揭开 10 格奖励
    var REVEAL_THRESHOLD = 10;        // 奖励阈值

    // ============ 状态 ============
    var state = 'idle'; // idle, playing, completed
    var focus = FOCUS_MAX;
    var mistakes = 0;
    var hintsUsed = 0;
    var revealsSinceLastReward = 0;   // 自上次奖励以来揭开的格子数
    var startTime = 0;
    var sessionTime = 0;              // 本次冥想时长（秒）
    var totalMeditationTime = 0;      // 累计冥想时长（秒）
    var totalCompletions = 0;
    var garden = [];                  // 花园花朵数组
    var pausedAt = 0;                 // 暂停时的时间戳（毫秒）

    // ============ 持久化 ============
    function load() {
        var saved = Storage.get('zen_mode_data');
        if (saved && typeof saved === 'object') {
            if (typeof saved.totalMeditationTime === 'number' && isFinite(saved.totalMeditationTime) && saved.totalMeditationTime >= 0) {
                totalMeditationTime = saved.totalMeditationTime;
            }
            if (typeof saved.totalCompletions === 'number' && isFinite(saved.totalCompletions) && saved.totalCompletions >= 0) {
                totalCompletions = saved.totalCompletions;
            }
            if (Array.isArray(saved.garden)) {
                garden = saved.garden.filter(function(f) {
                    return f && typeof f.type === 'string' && typeof f.timestamp === 'number' && isFinite(f.timestamp) && f.timestamp > 0;
                });
            }
        }
    }

    function save() {
        try {
            Storage.set('zen_mode_data', {
                totalMeditationTime: totalMeditationTime,
                totalCompletions: totalCompletions,
                garden: garden
            });
        } catch (e) {
            console.warn('[ZenMode] Failed to save:', e);
        }
    }

    // ============ 花朵类型 ============
    function getFlowerType(mistakeCount) {
        var mc = Math.max(0, mistakeCount);
        if (mc === 0) return { type: 'lotus', icon: '🪷', name: '莲花', desc: '零失误的完美冥想' };
        if (mc <= 2) return { type: 'sakura', icon: '🌸', name: '樱花', desc: '偶有波澜的宁静' };
        if (mc <= 5) return { type: 'chrysanthemum', icon: '🌼', name: '菊花', desc: '历经风雨的从容' };
        return { type: 'dandelion', icon: '🌾', name: '蒲公英', desc: '随性而为的自在' };
    }

    // ============ 核心逻辑 ============
    function start() {
        if (state === 'playing') {
            stop(); // 先结束当前会话，累加时间
        }
        state = 'playing';
        focus = FOCUS_MAX;
        mistakes = 0;
        hintsUsed = 0;
        revealsSinceLastReward = 0;
        startTime = Date.now();
        sessionTime = 0;
    }

    function stop() {
        if (state === 'playing') {
            sessionTime = Math.floor((Date.now() - startTime) / 1000);
            totalMeditationTime += sessionTime;
            save();
        }
        state = 'idle';
        pausedAt = 0;
    }

    function pause() {
        if (state === 'playing' && pausedAt === 0) {
            pausedAt = Date.now();
        }
    }

    function resume() {
        if (state === 'playing' && pausedAt !== 0) {
            startTime += (Date.now() - pausedAt);
            pausedAt = 0;
        }
    }

    function onMistake() {
        if (state !== 'playing') return;
        mistakes++;
        focus = Math.max(0, focus - FOCUS_PENALTY_MISTAKE);
        document.dispatchEvent(new CustomEvent('zenMistake', {
            detail: { focus: focus, mistakes: mistakes }
        }));
    }

    function onHint() {
        if (state !== 'playing') return;
        hintsUsed++;
        focus = Math.max(0, focus - FOCUS_PENALTY_HINT);
        document.dispatchEvent(new CustomEvent('zenHintUsed', {
            detail: { focus: focus, hintsUsed: hintsUsed }
        }));
    }

    function onReveal(count) {
        if (state !== 'playing') return;
        var c = (typeof count === 'number') ? count : 1;
        if (c <= 0) return;
        revealsSinceLastReward += c;
        if (revealsSinceLastReward >= REVEAL_THRESHOLD) {
            var rewards = Math.floor(revealsSinceLastReward / REVEAL_THRESHOLD);
            focus = Math.min(FOCUS_MAX, focus + rewards * FOCUS_REWARD_REVEAL);
            revealsSinceLastReward = revealsSinceLastReward % REVEAL_THRESHOLD;
            document.dispatchEvent(new CustomEvent('zenFocusReward', {
                detail: { focus: focus }
            }));
        }
    }

    function onComplete(time, clicks, bv, efficiency, usedUndo, usedFlags) {
        if (state !== 'playing') return;
        state = 'completed';
        sessionTime = Math.floor((Date.now() - startTime) / 1000);
        totalMeditationTime += sessionTime;
        totalCompletions++;

        var flower = getFlowerType(mistakes);
        garden.push({
            type: flower.type,
            icon: flower.icon,
            name: flower.name,
            desc: flower.desc,
            mistakes: mistakes,
            hintsUsed: hintsUsed,
            sessionTime: sessionTime,
            time: time,
            efficiency: efficiency,
            timestamp: Date.now()
        });

        // 限制花园大小，保留最近 200 朵
        if (garden.length > 200) {
            garden = garden.slice(garden.length - 200);
        }

        save();

        document.dispatchEvent(new CustomEvent('zenComplete', {
            detail: {
                focus: focus,
                mistakes: mistakes,
                hintsUsed: hintsUsed,
                time: time,
                sessionTime: sessionTime,
                flower: flower,
                totalCompletions: totalCompletions
            }
        }));
    }

    function resetGarden() {
        garden = [];
        totalMeditationTime = 0;
        totalCompletions = 0;
        save();
    }

    // ============ 公开 API ============
    function init() {
        load();
    }

    return {
        init: init,
        start: start,
        stop: stop,
        pause: pause,
        resume: resume,
        onMistake: onMistake,
        onHint: onHint,
        onReveal: onReveal,
        onComplete: onComplete,
        getState: function() {
            return {
                state: state,
                focus: focus,
                mistakes: mistakes,
                hintsUsed: hintsUsed,
                sessionTime: state === 'playing' ? Math.floor((Date.now() - startTime) / 1000) : sessionTime
            };
        },
        getGarden: function() { return garden.slice(); },
        getStats: function() {
            return {
                totalMeditationTime: totalMeditationTime,
                totalCompletions: totalCompletions,
                gardenSize: garden.length
            };
        },
        getFlowerType: getFlowerType,
        resetGarden: resetGarden,
        FOCUS_MAX: FOCUS_MAX
    };
})();
