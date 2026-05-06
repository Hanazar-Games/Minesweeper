/**
 * 扫雷锦标赛模块 (Mine Championship)
 * 连续挑战初级→中级→高级→大师四个标准难度
 * 每个阶段必须一次通过，失败即整场结束
 * 最终成绩基于总用时评级
 */

const Championship = (function() {
    'use strict';

    // ============ 阶段配置 ============
    var PHASES = [
        { id: 'beginner',     name: '初级',     width: 9,  height: 9,  mines: 10,  desc: '9×9 · 10雷 — 热身阶段' },
        { id: 'intermediate', name: '中级',     width: 16, height: 16, mines: 40,  desc: '16×16 · 40雷 — 渐入佳境' },
        { id: 'expert',       name: '高级',     width: 30, height: 16, mines: 99,  desc: '30×16 · 99雷 — 真正的考验' },
        { id: 'master',       name: '大师',     width: 30, height: 20, mines: 180, desc: '30×20 · 180雷 — 终极挑战' }
    ];

    // ============ 状态 ============
    var state = 'idle'; // idle, playing, phase-transition, ended, victory
    var currentPhaseIdx = 0;
    var phaseTimes = []; // 每个阶段的用时（秒）
    var totalTime = 0;   // 总用时（秒）
    var startTime = 0;
    var timerInterval = null;
    var bestTime = null; // 最佳总用时（秒）
    var bestStars = 0;

    // ============ 持久化 ============

    function load() {
        var saved = Storage.get('championship_records');
        if (saved && typeof saved === 'object') {
            if (typeof saved.bestTime === 'number') bestTime = saved.bestTime;
            if (typeof saved.bestStars === 'number') bestStars = saved.bestStars;
        }
    }

    function save() {
        try {
            Storage.set('championship_records', { bestTime: bestTime, bestStars: bestStars });
        } catch (e) {
            console.warn('[Championship] Failed to save records:', e);
        }
    }

    // ============ 核心逻辑 ============

    function getStars(totalSeconds) {
        if (totalSeconds <= 480) return 3; // ≤8分钟
        if (totalSeconds <= 900) return 2; // ≤15分钟
        return 1;
    }

    function start() {
        state = 'playing';
        currentPhaseIdx = 0;
        phaseTimes = [];
        totalTime = 0;
        startTime = Date.now();
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        timerInterval = setInterval(tick, 1000);
        startPhase(0);
    }

    function startPhase(idx) {
        currentPhaseIdx = idx;
        var phase = PHASES[idx];
        if (!phase) return;
        // 通知 UI 显示阶段介绍
        document.dispatchEvent(new CustomEvent('championshipPhaseStart', {
            detail: { phaseIdx: idx, phase: phase, totalTime: totalTime }
        }));
    }

    function tick() {
        if (state !== 'playing') return;
        totalTime = Math.floor((Date.now() - startTime) / 1000);
        document.dispatchEvent(new CustomEvent('championshipTick', {
            detail: { totalTime: totalTime }
        }));
    }

    function onPhaseComplete(phaseTime, clicks, bv, efficiency) {
        if (state !== 'playing') return;
        phaseTimes.push(phaseTime);

        var phase = PHASES[currentPhaseIdx];

        // 成就检查
        if (typeof Achievements !== 'undefined' && Achievements.check) {
            try {
                Achievements.check({
                    championshipPhase: true,
                    phaseIdx: currentPhaseIdx,
                    phaseName: phase.name,
                    phaseTime: phaseTime
                });
            } catch (e) {}
        }

        if (currentPhaseIdx >= PHASES.length - 1) {
            // 所有阶段完成，锦标赛胜利
            onVictory();
        } else {
            // 进入下一阶段
            state = 'phase-transition';
            document.dispatchEvent(new CustomEvent('championshipPhaseComplete', {
                detail: {
                    phaseIdx: currentPhaseIdx,
                    phase: phase,
                    phaseTime: phaseTime,
                    totalTime: totalTime,
                    nextPhase: PHASES[currentPhaseIdx + 1]
                }
            }));
        }
    }

    function onPhaseFail(phaseTime, clicks, bv, efficiency) {
        if (state !== 'playing' && state !== 'phase-transition') return;
        state = 'ended';
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

        document.dispatchEvent(new CustomEvent('championshipEnd', {
            detail: {
                victory: false,
                reachedPhase: currentPhaseIdx,
                phaseName: PHASES[currentPhaseIdx].name,
                phaseTimes: phaseTimes.slice(),
                totalTime: totalTime
            }
        }));
    }

    function onVictory() {
        state = 'victory';
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

        var stars = getStars(totalTime);
        var isNewRecord = false;
        if (bestTime === null || totalTime < bestTime) {
            bestTime = totalTime;
            isNewRecord = true;
        }
        if (stars > bestStars) {
            bestStars = stars;
        }
        save();

        // 成就检查
        if (typeof Achievements !== 'undefined' && Achievements.check) {
            try {
                Achievements.check({
                    championshipVictory: true,
                    totalTime: totalTime,
                    stars: stars,
                    phaseTimes: phaseTimes.slice()
                });
            } catch (e) {}
        }

        document.dispatchEvent(new CustomEvent('championshipVictory', {
            detail: {
                totalTime: totalTime,
                phaseTimes: phaseTimes.slice(),
                stars: stars,
                bestTime: bestTime,
                isNewRecord: isNewRecord
            }
        }));
    }

    function advanceToNextPhase() {
        if (state !== 'phase-transition') return;
        state = 'playing';
        startPhase(currentPhaseIdx + 1);
    }

    function stop() {
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        state = 'idle';
        currentPhaseIdx = 0;
    }

    // ============ 公开 API ============

    function init() {
        load();
    }

    return {
        init: init,
        start: start,
        stop: stop,
        onPhaseComplete: onPhaseComplete,
        onPhaseFail: onPhaseFail,
        advanceToNextPhase: advanceToNextPhase,
        getState: function() {
            return {
                state: state,
                currentPhaseIdx: currentPhaseIdx,
                phaseTimes: phaseTimes.slice(),
                totalTime: totalTime,
                bestTime: bestTime,
                bestStars: bestStars,
                currentPhase: PHASES[currentPhaseIdx] || null,
                phases: PHASES.map(function(p) { return { id: p.id, name: p.name, desc: p.desc }; })
            };
        },
        getStars: getStars,
        getPhases: function() { return PHASES; },
        reset: function() {
            bestTime = null;
            bestStars = 0;
            save();
        }
    };
})();
