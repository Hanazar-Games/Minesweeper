/**
 * 统计和排行榜模块
 */

const Stats = (function() {
    const defaultStats = {
        totalGames: 0,
        wins: 0,
        currentStreak: 0,
        bestStreak: 0,
        totalTime: 0,
        cellsRevealed: 0,
        flagsPlaced: 0,
        history: [],
        byDifficulty: {
            beginner: { games: 0, wins: 0, bestTime: null, totalTime: 0 },
            intermediate: { games: 0, wins: 0, bestTime: null, totalTime: 0 },
            expert: { games: 0, wins: 0, bestTime: null, totalTime: 0 },
            master: { games: 0, wins: 0, bestTime: null, totalTime: 0 },
            custom: { games: 0, wins: 0, bestTime: null, totalTime: 0 },
        },
        challenges: {
            speedrun: { best: 0 },
            noFlag: { best: 0 },
            blind: { best: 0 },
            timeAttack: { best: 0 },
        }
    };

    let stats = { ...defaultStats };

    function load() {
        const saved = Storage.get('stats');
        if (saved) {
            stats = deepMerge({ ...defaultStats }, saved);
        }
    }

    function save() {
        Storage.set('stats', stats);
    }

    function deepMerge(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                target[key] = deepMerge(target[key] || {}, source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    }

    function recordGame(difficulty, won, time, clicks, bv, efficiency) {
        stats.totalGames++;
        stats.totalTime += time;
        
        if (won) {
            stats.wins++;
            stats.currentStreak++;
            if (stats.currentStreak > stats.bestStreak) {
                stats.bestStreak = stats.currentStreak;
            }
        } else {
            stats.currentStreak = 0;
        }

        const diffKey = difficulty || 'custom';
        if (!stats.byDifficulty[diffKey]) {
            stats.byDifficulty[diffKey] = { games: 0, wins: 0, bestTime: null, totalTime: 0 };
        }
        const d = stats.byDifficulty[diffKey];
        d.games++;
        d.totalTime += time;
        if (won) {
            d.wins++;
            if (d.bestTime === null || time < d.bestTime) {
                d.bestTime = time;
            }
        }

        stats.history.push({
            difficulty: diffKey,
            won,
            time,
            clicks,
            bv,
            efficiency,
            date: new Date().toISOString()
        });

        // 只保留最近 100 条
        if (stats.history.length > 100) {
            stats.history = stats.history.slice(-100);
        }

        save();
    }

    function recordCellsRevealed(count) {
        stats.cellsRevealed += count;
        save();
    }

    function recordFlagsPlaced(count) {
        stats.flagsPlaced += count;
        save();
    }

    function recordChallenge(type, value) {
        const c = stats.challenges[type];
        if (c) {
            if (value > c.best) {
                c.best = value;
                save();
                return true; // new record
            }
        }
        save();
        return false;
    }

    function getWinRate(difficulty) {
        if (difficulty) {
            const d = stats.byDifficulty[difficulty];
            if (!d || d.games === 0) return 0;
            return Math.round((d.wins / d.games) * 100);
        }
        if (stats.totalGames === 0) return 0;
        return Math.round((stats.wins / stats.totalGames) * 100);
    }

    function getAvgTime(difficulty) {
        const d = stats.byDifficulty[difficulty];
        if (!d || d.wins === 0) return null;
        return Math.round(d.totalTime / d.wins);
    }

    function getAll() {
        return JSON.parse(JSON.stringify(stats));
    }

    function reset() {
        stats = JSON.parse(JSON.stringify(defaultStats));
        save();
    }

    // 排行榜
    const Leaderboard = {
        get(difficulty, limit = 20) {
            const key = 'leaderboard_' + difficulty;
            return Storage.get(key, []).slice(0, limit);
        },

        add(difficulty, entry) {
            const key = 'leaderboard_' + difficulty;
            const list = Storage.get(key, []);
            entry.date = new Date().toISOString();
            list.push(entry);
            list.sort((a, b) => a.time - b.time);
            const trimmed = list.slice(0, 50);
            Storage.set(key, trimmed);
            
            // 返回是否进入前10
            const rank = trimmed.findIndex(e => 
                e.time === entry.time && 
                e.date === entry.date
            );
            return rank >= 0 && rank < 10;
        },

        clear(difficulty) {
            Storage.remove('leaderboard_' + difficulty);
        }
    };

    load();

    return {
        recordGame,
        recordCellsRevealed,
        recordFlagsPlaced,
        recordChallenge,
        getWinRate,
        getAvgTime,
        getAll,
        reset,
        Leaderboard
    };
})();
