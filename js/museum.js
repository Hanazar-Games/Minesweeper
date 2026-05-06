/**
 * 扫雷星际博物馆 (Galaxy Museum)
 * 玩家通过达成各种条件解锁星际遗迹展品
 * 每个展品包含扫雷相关的知识、历史与趣闻
 */

const Museum = (function() {
    'use strict';

    // ============ 展品数据 ============
    var EXHIBITS = [
        {
            id: 'origin',
            name: '扫雷的起源',
            icon: '💣',
            desc: '扫雷的雏形可追溯至 1960 年代的大型主机。1992 年，微软将其作为 Windows 3.1 的内置游戏发布，从此这枚"小炸弹"走进了千家万户的电脑屏幕。',
            condition: function(s) { return (s.totalGames || 0) >= 1; }
        },
        {
            id: 'first_win',
            name: '首战告捷',
            icon: '🏆',
            desc: '赢得第一局游戏是每位扫雷玩家的重要里程碑。从第一次点击到最终胜利，你已经迈出了成为大师的第一步。',
            condition: function(s) { return (s.wins || 0) >= 1; }
        },
        {
            id: 'math_101',
            name: '数字的奥秘',
            icon: '🔢',
            desc: '棋盘上的每个数字都是一个逻辑约束条件——它精确地告诉你周围 8 个格子中恰好有多少颗雷。解开这些约束，就是扫雷的核心乐趣。',
            condition: function(s) { return (s.cellsRevealed || 0) >= 100; }
        },
        {
            id: 'flag_master',
            name: '标雷专家',
            icon: '🚩',
            desc: '旗帜不仅是标记工具，更是推理的锚点。熟练使用旗帜可以大幅提升解谜效率，是区分新手与老手的关键技能。',
            condition: function(s) { return (s.flagsPlaced || 0) >= 100; }
        },
        {
            id: 'speed_demon',
            name: '闪电手',
            icon: '⚡',
            desc: '初级难度 60 秒内完成！快速而准确的手指移动，证明你已经将基础的点击技巧练成了肌肉记忆。',
            condition: function(s) {
                var d = s.byDifficulty;
                return d && d.beginner && d.beginner.bestTime !== null && d.beginner.bestTime <= 60;
            }
        },
        {
            id: 'streak_5',
            name: '连胜传说',
            icon: '🔥',
            desc: '连胜 5 局，运气与实力的完美结合。每一次连胜背后，都是无数次冷静判断的积累。',
            condition: function(s) { return (s.bestStreak || 0) >= 5; }
        },
        {
            id: 'all_diffs',
            name: '全能选手',
            icon: '🎖️',
            desc: '在初级、中级、高级、大师四个难度都取得过胜利。无论雷区多大多密，你都能从容应对。',
            condition: function(s) {
                var d = s.byDifficulty;
                return d && ((d.beginner && d.beginner.wins) || 0) > 0
                    && ((d.intermediate && d.intermediate.wins) || 0) > 0
                    && ((d.expert && d.expert.wins) || 0) > 0
                    && ((d.master && d.master.wins) || 0) > 0;
            }
        },
        {
            id: 'campaign_clear',
            name: '战役英雄',
            icon: '🗺️',
            desc: '完成全部 15 关战役模式。你的战术规划能力和临场应变能力已经通过了最严峻的考验。',
            condition: function(s) {
                return (s.campaign && s.campaign.levelsCompleted || 0) >= 15;
            }
        },
        {
            id: 'pattern_master',
            name: '模式大师',
            icon: '🥋',
            desc: '完成模式训练道馆的全部 10 种模式训练。经典的 1-2-1、角落技巧等推理模式已成为你的本能反应。',
            condition: function() {
                if (typeof PatternDojo === 'undefined') return false;
                var progress = PatternDojo.getProgress();
                var patterns = PatternDojo.getPatterns();
                if (!patterns || !progress) return false;
                var completed = 0;
                for (var i = 0; i < patterns.length; i++) {
                    var p = progress[patterns[i].id];
                    if (p && p.completed > 0) completed++;
                }
                return completed >= patterns.length;
            }
        },
        {
            id: 'thunder_rush',
            name: '雷暴征服者',
            icon: '⛈️',
            desc: '在雷暴突袭模式中累计完成 20 题。极限时间压力下的冷静判断，是你最强大的武器。',
            condition: function() {
                if (typeof ThunderRush === 'undefined') return false;
                var trs = ThunderRush.getStats();
                return (trs && trs.totalSolved || 0) >= 20;
            }
        },
        {
            id: 'hundred_games',
            name: '百战老兵',
            icon: '💯',
            desc: '累计完成 100 局游戏。无数次的点击、标记、揭开，铸就了这身百战不殆的技艺。',
            condition: function(s) { return (s.totalGames || 0) >= 100; }
        },
        {
            id: 'expert_speed',
            name: '专家神速',
            icon: '🚀',
            desc: '高级难度 180 秒内完成！面对 30×16 格、99 颗雷的庞大地图，你依然游刃有余。',
            condition: function(s) {
                var d = s.byDifficulty;
                return d && d.expert && d.expert.bestTime !== null && d.expert.bestTime <= 180;
            }
        },
        {
            id: 'endless_10',
            name: '无尽深渊',
            icon: '♾️',
            desc: '在无尽模式中达到第 10 关。每一关都比前一关更凶险，而你依然屹立不倒。',
            condition: function(s) {
                return (s.survival && s.survival.bestLevel || 0) >= 10;
            }
        },
        {
            id: 'powerup_user',
            name: '道具大师',
            icon: '🧪',
            desc: '累计使用过扫描仪、护盾、冰冻、热图全部四种道具。善用工具，方能事半功倍。',
            condition: function(s) {
                var p = s.powerups;
                return p && (p.scannerUsed || 0) >= 1 && (p.shieldUsed || 0) >= 1
                    && (p.freezeUsed || 0) >= 1 && (p.heatmapUsed || 0) >= 1;
            }
        },
        {
            id: 'legend',
            name: '扫雷传说',
            icon: '👑',
            desc: '解锁了博物馆中所有其他遗迹。你的名字将被铭刻在扫雷宇宙的星空之中，成为后人仰望的传说。',
            condition: function(s, unlockedCount) {
                return unlockedCount >= 14;
            }
        }
    ];

    // ============ 状态 ============
    var unlocked = new Set();
    var lastCheckedCount = 0;

    // ============ 核心函数 ============

    function load() {
        var saved = Storage.get('museum_unlocked');
        if (saved && Array.isArray(saved)) {
            unlocked = new Set(saved);
        }
    }

    function save() {
        Storage.set('museum_unlocked', Array.from(unlocked));
    }

    function checkUnlocks() {
        var stats = Stats.getAll() || {};
        var newlyUnlocked = [];

        for (var i = 0; i < EXHIBITS.length; i++) {
            var ex = EXHIBITS[i];
            if (unlocked.has(ex.id)) continue;
            try {
                // 使用实时 unlocked.size，避免 legend 等依赖解锁数量的条件延迟触发
                if (ex.condition(stats, unlocked.size)) {
                    unlocked.add(ex.id);
                    newlyUnlocked.push(ex);
                }
            } catch (e) {
                // 忽略条件检查中的错误，防止一个展品崩溃影响其他
            }
        }

        if (newlyUnlocked.length > 0) {
            save();
            lastCheckedCount = unlocked.size;
        }

        return newlyUnlocked;
    }

    function isUnlocked(id) {
        return unlocked.has(id);
    }

    function getExhibits() {
        return EXHIBITS.map(function(ex) {
            return {
                id: ex.id,
                name: ex.name,
                icon: ex.icon,
                desc: ex.desc,
                unlocked: unlocked.has(ex.id)
            };
        });
    }

    function getProgress() {
        return {
            total: EXHIBITS.length,
            unlocked: unlocked.size
        };
    }

    function getExhibit(id) {
        for (var i = 0; i < EXHIBITS.length; i++) {
            if (EXHIBITS[i].id === id) {
                return {
                    id: EXHIBITS[i].id,
                    name: EXHIBITS[i].name,
                    icon: EXHIBITS[i].icon,
                    desc: EXHIBITS[i].desc,
                    unlocked: unlocked.has(EXHIBITS[i].id)
                };
            }
        }
        return null;
    }

    function reset() {
        unlocked.clear();
        save();
    }

    // ============ 初始化 ============
    load();
    lastCheckedCount = unlocked.size;

    return {
        checkUnlocks: checkUnlocks,
        isUnlocked: isUnlocked,
        getExhibits: getExhibits,
        getExhibit: getExhibit,
        getProgress: getProgress,
        reset: reset
    };
})();
