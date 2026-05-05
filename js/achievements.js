/**
 * 成就系统模块
 * 成就追踪、解锁判定、弹窗通知
 */

const Achievements = (function() {
    const ACHIEVEMENTS = [
        // 初次体验
        { id: 'first_blood', name: '初次试炼', desc: '完成第一局游戏', icon: '🎯', category: 'beginner', condition: (s) => s.totalGames >= 1 },
        { id: 'first_win', name: '首战告捷', desc: '赢得第一局胜利', icon: '🏆', category: 'beginner', condition: (s) => s.wins >= 1 },
        { id: 'speed_demon', name: '闪电手', desc: '60秒内完成初级', icon: '⚡', category: 'beginner', condition: (s, g) => g.won && g.time <= 60 && g.difficulty === 'beginner' },
        { id: 'no_mistake', name: '完美主义', desc: '不使用撤销完成一局', icon: '✨', category: 'beginner', condition: (s, g) => g.won && g.noUndo },
        { id: 'flag_master', name: '标雷专家', desc: '累计放置100个旗帜', icon: '🚩', category: 'beginner', condition: (s) => s.flagsPlaced >= 100 },

        // 初级挑战
        { id: 'beginner_10', name: '初出茅庐', desc: '初级难度胜利10次', icon: '🌱', category: 'beginner', condition: (s) => ((s.byDifficulty.beginner && s.byDifficulty.beginner.wins) || 0) >= 10 },
        { id: 'beginner_50', name: '初级老手', desc: '初级难度胜利50次', icon: '🌿', category: 'beginner', condition: (s) => ((s.byDifficulty.beginner && s.byDifficulty.beginner.wins) || 0) >= 50 },
        { id: 'beginner_speed', name: '风驰电掣', desc: '初级30秒内完成', icon: '🔥', category: 'beginner', condition: (s, g) => g.won && g.time <= 30 && g.difficulty === 'beginner' },
        { id: 'beginner_eff', name: '效率之王', desc: '初级效率达到90%', icon: '📈', category: 'beginner', condition: (s, g) => g.won && g.efficiency >= 90 && g.difficulty === 'beginner' },

        // 中级挑战
        { id: 'intermediate_first', name: '踏入中级', desc: '首次完成中级难度', icon: '🎋', category: 'intermediate', condition: (s, g) => g.won && g.difficulty === 'intermediate' },
        { id: 'intermediate_10', name: '中级熟手', desc: '中级难度胜利10次', icon: '🎍', category: 'intermediate', condition: (s) => ((s.byDifficulty.intermediate && s.byDifficulty.intermediate.wins) || 0) >= 10 },
        { id: 'intermediate_speed', name: '中级闪电', desc: '中级120秒内完成', icon: '💨', category: 'intermediate', condition: (s, g) => g.won && g.time <= 120 && g.difficulty === 'intermediate' },

        // 高级挑战
        { id: 'expert_first', name: '勇闯高级', desc: '首次完成高级难度', icon: '🔥', category: 'expert', condition: (s, g) => g.won && g.difficulty === 'expert' },
        { id: 'expert_10', name: '高级专家', desc: '高级难度胜利10次', icon: '💀', category: 'expert', condition: (s) => ((s.byDifficulty.expert && s.byDifficulty.expert.wins) || 0) >= 10 },
        { id: 'expert_speed', name: '高级神速', desc: '高级180秒内完成', icon: '⚡', category: 'expert', condition: (s, g) => g.won && g.time <= 180 && g.difficulty === 'expert' },

        // 大师挑战
        { id: 'master_first', name: '大师降临', desc: '首次完成大师难度', icon: '👑', category: 'master', condition: (s, g) => g.won && g.difficulty === 'master' },

        // 连胜与统计
        { id: 'streak_3', name: '三连冠', desc: '连胜3局', icon: '🔥', category: 'streak', condition: (s) => s.currentStreak >= 3 },
        { id: 'streak_5', name: '五连绝世', desc: '连胜5局', icon: '🌟', category: 'streak', condition: (s) => s.currentStreak >= 5 },
        { id: 'streak_10', name: '十连胜', desc: '连胜10局', icon: '👑', category: 'streak', condition: (s) => s.currentStreak >= 10 },
        { id: 'streak_best_10', name: '巅峰记录', desc: '最佳连胜达到10', icon: '🏅', category: 'streak', condition: (s) => s.bestStreak >= 10 },
        { id: 'total_100', name: '百战老兵', desc: '累计游戏100局', icon: '💯', category: 'stats', condition: (s) => s.totalGames >= 100 },
        { id: 'total_500', name: '千锤百炼', desc: '累计游戏500局', icon: '🔨', category: 'stats', condition: (s) => s.totalGames >= 500 },
        { id: 'revealed_10k', name: '开疆拓土', desc: '累计揭开10000格', icon: '🌍', category: 'stats', condition: (s) => s.cellsRevealed >= 10000 },

        // 技巧类
        { id: 'no_flag_win', name: '裸眼识雷', desc: '不使用标记完成一局', icon: '👁️', category: 'skill', condition: (s, g) => g.won && g.noFlags },
        { id: 'chord_master', name: 'Chord大师', desc: '一局使用10次快速揭开', icon: '🎹', category: 'skill', condition: (s, g) => g.won && g.chordCount >= 10 },
        { id: 'efficiency_95', name: '登峰造极', desc: '单局效率达到95%', icon: '📊', category: 'skill', condition: (s, g) => g.won && g.efficiency >= 95 },
        { id: 'one_click', name: '一击即中', desc: '只用1次点击获胜（3BV=1）', icon: '🎯', category: 'skill', condition: (s, g) => g.won && g.clicks <= 1 },

        // 模式道馆
        { id: 'pattern_beginner', name: '道馆入门', desc: '完成第一个模式训练', icon: '🥋', category: 'skill', condition: (s) => typeof PatternDojo !== 'undefined' && Object.values(PatternDojo.getProgress()).some(p => p && p.completed > 0) },
        { id: 'pattern_bronze', name: '铜牌训练师', desc: '获得第一个铜牌评级', icon: '🥉', category: 'skill', condition: (s) => typeof PatternDojo !== 'undefined' && Object.values(PatternDojo.getProgress()).some(p => p && p.rating === 'bronze') },
        { id: 'pattern_silver', name: '银牌训练师', desc: '获得第一个银牌评级', icon: '🥈', category: 'skill', condition: (s) => typeof PatternDojo !== 'undefined' && Object.values(PatternDojo.getProgress()).some(p => p && p.rating === 'silver') },
        { id: 'pattern_gold', name: '金牌训练师', desc: '获得第一个金牌评级', icon: '🥇', category: 'skill', condition: (s) => typeof PatternDojo !== 'undefined' && Object.values(PatternDojo.getProgress()).some(p => p && p.rating === 'gold') },

        // 挑战模式
        { id: 'daily_first', name: '每日打卡', desc: '完成第一次每日挑战', icon: '📅', category: 'challenge', condition: (s, g) => g.challengeMode === 'daily' && g.won },
        { id: 'speedrun_3', name: '速通三连', desc: '速通模式连胜3局', icon: '🏃', category: 'challenge', condition: (s) => ((s.challenges.speedrun && s.challenges.speedrun.best) || 0) >= 3 },
        { id: 'blind_win', name: '盲扫达人', desc: '完成盲扫挑战', icon: '🕶️', category: 'challenge', condition: (s) => ((s.challenges.blind && s.challenges.blind.best) || 0) >= 1 },
        { id: 'time_attack_win', name: '限时冲刺', desc: '完成限时冲刺挑战', icon: '⏰', category: 'challenge', condition: (s) => ((s.challenges.timeAttack && s.challenges.timeAttack.best) || 0) >= 1 },
        { id: 'fog_win', name: '迷雾行者', desc: '完成迷雾挑战', icon: '🌫️', category: 'challenge', condition: (s) => ((s.challenges.fog && s.challenges.fog.best) || 0) >= 1 },
        { id: 'survival_win', name: '生存专家', desc: '完成生存挑战', icon: '❤️', category: 'challenge', condition: (s) => ((s.challenges.survival && s.challenges.survival.best) || 0) >= 1 },
        { id: 'symmetry_win', name: '对称大师', desc: '完成对称挑战', icon: '🔷', category: 'challenge', condition: (s) => ((s.challenges.symmetry && s.challenges.symmetry.best) || 0) >= 1 },
        { id: 'zen_win', name: '心如止水', desc: '完成禅意挑战', icon: '🧘', category: 'challenge', condition: (s) => ((s.challenges.zen && s.challenges.zen.best) || 0) >= 1 },
        { id: 'giant_win', name: '巨兽猎人', desc: '完成巨型挑战', icon: '🦕', category: 'challenge', condition: (s) => ((s.challenges.giant && s.challenges.giant.best) || 0) >= 1 },
        { id: 'combo_rush_win', name: '连击风暴', desc: '完成连击大师挑战', icon: '⚡', category: 'challenge', condition: (s) => ((s.challenges.comboRush && s.challenges.comboRush.best) || 0) >= 1 },
        { id: 'no_undo_win', name: '一往无前', desc: '完成无撤销挑战', icon: '🔒', category: 'challenge', condition: (s) => ((s.challenges.noUndo && s.challenges.noUndo.best) || 0) >= 1 },

        // 战役模式
        { id: 'campaign_first', name: '战役启程', desc: '完成战役第一关', icon: '🗺️', category: 'challenge', condition: (s) => (s.campaign && s.campaign.levelsCompleted) >= 1 },
        { id: 'campaign_half', name: '半途而废', desc: '完成战役第8关', icon: '🏔️', category: 'challenge', condition: (s) => (s.campaign && s.campaign.levelsCompleted) >= 8 },
        { id: 'campaign_clear', name: '战役通关', desc: '完成全部15关战役', icon: '👑', category: 'challenge', condition: (s) => (s.campaign && s.campaign.levelsCompleted) >= 15 },
        { id: 'campaign_perfect', name: '完美战役', desc: '获得战役全部45颗星', icon: '⭐', category: 'challenge', condition: (s) => (s.campaign && s.campaign.totalStars) >= 45 },

        // 雷暴突袭
        { id: 'thunder_first', name: '雷暴初体验', desc: '首次游玩雷暴突袭', icon: '⚡', category: 'challenge', condition: (s, g) => g && g.thunderRush === true },
        { id: 'thunder_5', name: '闪电快手', desc: '雷暴突袭完成5题', icon: '⚡', category: 'challenge', condition: (s, g) => g && g.thunderRush === true && (g.solved || 0) >= 5 },
        { id: 'thunder_10', name: '雷暴行者', desc: '雷暴突袭完成10题', icon: '⛈️', category: 'challenge', condition: (s, g) => g && g.thunderRush === true && (g.solved || 0) >= 10 },
        { id: 'thunder_20', name: '雷霆万钧', desc: '雷暴突袭完成20题', icon: '🌩️', category: 'challenge', condition: (s, g) => g && g.thunderRush === true && (g.solved || 0) >= 20 },
        { id: 'thunder_streak_5', name: '连击风暴', desc: '雷暴突袭达到5连击', icon: '🔥', category: 'challenge', condition: (s, g) => g && g.thunderRush === true && (g.streak || 0) >= 5 },
        { id: 'thunder_score_1000', name: '千分大师', desc: '雷暴突袭得分超过1000', icon: '💯', category: 'challenge', condition: (s, g) => g && g.thunderRush === true && (g.score || 0) >= 1000 },

        // 生存模式
        { id: 'survival_3', name: '生存者', desc: '生存模式达到第3关', icon: '🛡️', category: 'challenge', condition: (s) => (s.survival && s.survival.bestLevel) >= 3 },
        { id: 'survival_10', name: '绝地求生', desc: '生存模式达到第10关', icon: '🔥', category: 'challenge', condition: (s) => (s.survival && s.survival.bestLevel) >= 10 },
        { id: 'survival_combo', name: '连击大师', desc: '生存模式单次达到20连击', icon: '⚡', category: 'challenge', condition: (s, g) => g.won && g.challengeMode === 'survival' && g.maxCombo >= 20 },

        // 道具使用
        { id: 'powerup_first', name: '道具新手', desc: '首次使用道具', icon: '🧪', category: 'skill', condition: (s) => (s.powerups && (s.powerups.scannerUsed + s.powerups.shieldUsed + s.powerups.freezeUsed + s.powerups.heatmapUsed)) >= 1 },
        { id: 'shield_save', name: '死里逃生', desc: '使用盾牌避免一次死亡', icon: '🛡️', category: 'skill', condition: (s) => (s.powerups && s.powerups.shieldUsed) >= 1 },

        // 星际博物馆
        { id: 'museum_first', name: '考古学家', desc: '解锁博物馆第一个展品', icon: '🌌', category: 'special', condition: (s) => typeof Museum !== 'undefined' && Museum.getProgress().unlocked >= 1 },
        { id: 'museum_half', name: '星际探险家', desc: '解锁博物馆一半展品', icon: '🚀', category: 'special', condition: (s) => typeof Museum !== 'undefined' && Museum.getProgress().unlocked >= 7 },
        { id: 'museum_all', name: '宇宙收藏家', desc: '解锁博物馆全部展品', icon: '👑', category: 'special', condition: (s) => typeof Museum !== 'undefined' && Museum.getProgress().unlocked >= 15 },

        // 特殊
        { id: 'custom_max', name: '极限挑战', desc: '在50x30的自定义地图上获胜', icon: '🗺️', category: 'special', condition: (s, g) => g.won && g.customSize && g.width >= 50 && g.height >= 30 },
        { id: 'night_owl', name: '夜猫子', desc: '在凌晨0-5点完成一局', icon: '🌙', category: 'special', condition: (s, g) => { const h = new Date().getHours(); return g.won && h >= 0 && h < 5; } },
        { id: 'lucky_day', name: '幸运日', desc: '在周五13号完成一局', icon: '🍀', category: 'special', condition: (s, g) => { const d = new Date(); return g.won && d.getDay() === 5 && d.getDate() === 13; } },
        { id: 'all_difficulties', name: '全能选手', desc: '在所有预设难度都取得过胜利', icon: '🎖️', category: 'special', condition: (s) => {
            const d = s.byDifficulty;
            return ((d.beginner && d.beginner.wins) || 0) > 0 && ((d.intermediate && d.intermediate.wins) || 0) > 0 && ((d.expert && d.expert.wins) || 0) > 0 && ((d.master && d.master.wins) || 0) > 0;
        }},
    ];

    let unlocked = new Set();

    function load() {
        const saved = Storage.get('achievements');
        if (saved && Array.isArray(saved)) {
            unlocked = new Set(saved);
        }
    }

    function save() {
        Storage.set('achievements', Array.from(unlocked));
    }

    function check(gameData) {
        const stats = Stats.getAll();
        const newlyUnlocked = [];

        ACHIEVEMENTS.forEach(ach => {
            if (unlocked.has(ach.id)) return;
            try {
                if (ach.condition(stats, gameData)) {
                    unlocked.add(ach.id);
                    newlyUnlocked.push(ach);
                }
            } catch (e) {}
        });

        if (newlyUnlocked.length > 0) {
            save();
            newlyUnlocked.forEach((ach, i) => {
                setTimeout(() => showUnlock(ach), i * 800);
            });
        }

        return newlyUnlocked;
    }

    function showUnlock(ach) {
        if (typeof AudioManager !== 'undefined') AudioManager.playWin();
        const container = document.getElementById('achievement-toasts') || document.body;
        const toast = document.createElement('div');
        toast.className = 'achievement-toast';
        toast.innerHTML = `
            <div class="ach-toast-icon">${ach.icon}</div>
            <div class="ach-toast-info">
                <div class="ach-toast-title">🏆 解锁成就</div>
                <div class="ach-toast-name">${ach.name}</div>
                <div class="ach-toast-desc">${ach.desc}</div>
            </div>
        `;
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    }

    function getAll() {
        return ACHIEVEMENTS.map(ach => ({
            ...ach,
            unlocked: unlocked.has(ach.id)
        }));
    }

    function getProgress() {
        return { total: ACHIEVEMENTS.length, unlocked: unlocked.size };
    }

    function reset() {
        unlocked.clear();
        save();
    }

    load();

    return {
        check,
        getAll,
        getProgress,
        reset,
        load
    };
})();
