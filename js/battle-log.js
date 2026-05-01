/**
 * 战后分析 & 作战日志模块 (Battle Log & Post-Game Analysis)
 * 记录每局详细数据，生成战术分析报告
 */

const BattleLog = (function() {
    const STORAGE_KEY = 'battle_log';
    const MAX_ENTRIES = 50;

    let entries = [];

    function load() {
        try {
            var saved = Storage.get(STORAGE_KEY);
            if (saved && Array.isArray(saved)) {
                entries = saved;
            }
        } catch (e) {
            entries = [];
        }
    }

    function save() {
        try {
            Storage.set(STORAGE_KEY, entries);
        } catch (e) {}
    }

    /**
     * 记录一局游戏的完整战后数据
     * @param {Object} data - 游戏结束时的完整状态
     */
    function record(data) {
        if (!data || !data.board) return;

        var board = data.board;
        var now = Date.now();

        // 计算旗帜准确度
        var flagStats = analyzeFlags(board);

        // 计算点击时间线分析
        var clickAnalysis = analyzeClicks(data.replay || [], data.time, board);

        // 计算 wasted clicks（点击了已揭示的格子、重复点击等）
        var wastedClicks = estimateWastedClicks(data, board);

        // 构建最终棋盘快照（仅存储必要状态，不存完整 cells 避免过大）
        // 对于超大棋盘（>625格），省略 revealed 数组以节省存储空间
        var totalCells = board.width * board.height;
        var storeRevealed = totalCells <= 625;
        var boardSnapshot = {
            width: board.width,
            height: board.height,
            mineCount: board.mineCount,
            mines: board.mines.map(function(m) { return {x: m.x, y: m.y}; }),
            flagged: [],
            misFlagged: []
        };
        if (storeRevealed) boardSnapshot.revealed = [];

        for (var y = 0; y < board.height; y++) {
            for (var x = 0; x < board.width; x++) {
                var cell = board.cells[y][x];
                if (storeRevealed && cell.isRevealed && !cell.isMine) boardSnapshot.revealed.push({ x: x, y: y });
                if (cell.isFlagged) {
                    boardSnapshot.flagged.push({ x: x, y: y });
                    if (!cell.isMine) boardSnapshot.misFlagged.push({ x: x, y: y });
                }
            }
        }

        var entry = {
            id: now + '_' + Math.floor(Math.random() * 1000),
            playedAt: new Date(now).toISOString(),
            difficulty: data.difficulty || 'custom',
            challengeMode: data.challengeMode || null,
            seed: (data.seed === null || data.seed === undefined) ? null : data.seed,
            width: board.width,
            height: board.height,
            mineCount: board.mineCount,
            won: data.won,
            time: data.time || 0,
            clicks: data.clicks || 0,
            chordCount: data.chordCount || 0,
            undoCount: data.undoCount || 0,
            usedHint: data.usedHint || false,
            usedFlags: data.usedFlags || false,
            usedPowerup: data.usedPowerup || false,
            noGuess: (typeof Settings !== 'undefined') ? !!Settings.get('noGuess') : false,
            question: (typeof Settings !== 'undefined') ? !!Settings.get('question') : false,
            bv: board.bv || 0,
            efficiency: data.efficiency || 0,
            flagStats: flagStats,
            clickAnalysis: clickAnalysis,
            wastedClicks: wastedClicks,
            boardSnapshot: boardSnapshot,
            replay: data.replay || []
        };

        entries.unshift(entry);
        if (entries.length > MAX_ENTRIES) {
            entries = entries.slice(0, MAX_ENTRIES);
        }
        save();
        return entry;
    }

    /**
     * 分析旗帜准确度
     */
    function analyzeFlags(board) {
        var correct = 0;
        var incorrect = 0;
        var missed = 0;

        if (!board || !board.cells) return { correct: 0, incorrect: 0, missed: 0, accuracy: 0 };

        for (var y = 0; y < board.height; y++) {
            for (var x = 0; x < board.width; x++) {
                var cell = board.cells[y][x];
                if (cell.isFlagged) {
                    if (cell.isMine) correct++;
                    else incorrect++;
                }
                if (cell.isMine && !cell.isFlagged && cell.isRevealed) {
                    missed++;
                }
            }
        }

        var total = correct + incorrect;
        return {
            correct: correct,
            incorrect: incorrect,
            missed: missed,
            total: total,
            accuracy: total > 0 ? Math.round((correct / total) * 100) : 0
        };
    }

    /**
     * 分析点击行为
     */
    function analyzeClicks(replay, totalTime, board) {
        if (!replay || replay.length === 0) {
            return { peakCps: 0, avgCps: 0, firstClickDelay: 0, timeline: [] };
        }

        var actions = replay.slice();
        var totalActions = actions.length;
        var avgCps = totalTime > 0 ? (totalActions / totalTime) : 0;

        // 计算峰值 CPS（滑动窗口 3 秒）
        var peakCps = 0;
        for (var i = 0; i < actions.length; i++) {
            var windowStart = actions[i].time;
            var count = 0;
            for (var j = i; j < actions.length && actions[j].time < windowStart + 3000; j++) {
                count++;
            }
            var cps = count / 3;
            if (cps > peakCps) peakCps = cps;
        }

        // 首次点击延迟
        var firstClickDelay = actions.length > 0 ? actions[0].time : 0;

        // 时间线分桶（每 10 秒一个区间）
        var buckets = [];
        var bucketSize = Math.max(10, Math.ceil(totalTime / 10));
        for (var t = 0; t <= totalTime; t += bucketSize) {
            var count = 0;
            for (var k = 0; k < actions.length; k++) {
                if (actions[k].time >= t * 1000 && actions[k].time < (t + bucketSize) * 1000) {
                    count++;
                }
            }
            buckets.push({ start: t, count: count });
        }

        return {
            peakCps: Math.round(peakCps * 10) / 10,
            avgCps: Math.round(avgCps * 10) / 10,
            firstClickDelay: Math.round(firstClickDelay / 100) / 10,
            timeline: buckets,
            totalActions: totalActions
        };
    }

    /**
     * 估算浪费点击数
     * 包括：undo、点击已揭示格子、过度标记等
     */
    function estimateWastedClicks(data, board) {
        var wasted = 0;
        // undo 次数视为浪费
        wasted += data.undoCount || 0;
        // 错误标记
        if (board && board.cells) {
            for (var y = 0; y < board.height; y++) {
                for (var x = 0; x < board.width; x++) {
                    var cell = board.cells[y][x];
                    if (cell.isFlagged && !cell.isMine) wasted++;
                }
            }
        }
        return wasted;
    }

    /**
     * 对单条记录进行深度分析，返回可视化所需数据
     */
    function analyze(entry) {
        if (!entry) return null;

        // 兼容旧数据：为可能缺失的字段提供默认值
        var clickAnalysis = entry.clickAnalysis || { peakCps: 0, avgCps: 0, firstClickDelay: 0, timeline: [], totalActions: 0 };
        var flagStats = entry.flagStats || { correct: 0, incorrect: 0, missed: 0, total: 0, accuracy: 0 };
        var wastedClicks = entry.wastedClicks || 0;

        var analysis = {
            // 效率评级
            efficiencyGrade: gradeEfficiency(entry.efficiency),
            // 时间评级
            timeGrade: gradeTime(entry.difficulty, entry.time, entry.won),
            // 旗帜评级
            flagGrade: gradeFlags(flagStats),
            // 速度评级
            speedGrade: gradeSpeed(clickAnalysis.peakCps),
            // 综合评级
            overallGrade: '',
            // 关键指标
            keyMetrics: []
        };

        // 综合评级取平均
        var grades = [analysis.efficiencyGrade, analysis.timeGrade, analysis.flagGrade, analysis.speedGrade];
        var scoreMap = { S: 5, A: 4, B: 3, C: 2, D: 1, F: 0 };
        var totalScore = 0;
        var validCount = 0;
        for (var i = 0; i < grades.length; i++) {
            if (grades[i] && scoreMap[grades[i]] !== undefined) {
                totalScore += scoreMap[grades[i]];
                validCount++;
            }
        }
        var avgScore = validCount > 0 ? totalScore / validCount : 0;
        var gradeArr = ['F', 'D', 'C', 'B', 'A', 'S'];
        analysis.overallGrade = gradeArr[Math.round(avgScore)] || 'C';

        // 关键指标卡片
        analysis.keyMetrics = [
            { label: '效率', value: entry.efficiency + '%', grade: analysis.efficiencyGrade },
            { label: '时间', value: entry.time + 's', grade: analysis.timeGrade },
            { label: '旗帜准确度', value: (flagStats.accuracy || 0) + '%', grade: analysis.flagGrade },
            { label: '峰值手速', value: (clickAnalysis.peakCps || 0) + '/s', grade: analysis.speedGrade },
            { label: '3BV', value: String(entry.bv || 0), grade: '' },
            { label: '浪费操作', value: String(wastedClicks), grade: wastedClicks === 0 ? 'S' : (wastedClicks <= 3 ? 'A' : 'C') }
        ];

        // 生成评语
        analysis.commentary = generateCommentary(entry, analysis);

        return analysis;
    }

    function gradeEfficiency(eff) {
        if (eff >= 95) return 'S';
        if (eff >= 85) return 'A';
        if (eff >= 70) return 'B';
        if (eff >= 50) return 'C';
        if (eff >= 30) return 'D';
        return 'F';
    }

    function gradeTime(diff, time, won) {
        if (!won) return 'F';
        var targets = { beginner: 60, intermediate: 180, expert: 300, master: 600, giant: 900 };
        var target = targets[diff] || 300;
        if (time <= target * 0.3) return 'S';
        if (time <= target * 0.5) return 'A';
        if (time <= target) return 'B';
        if (time <= target * 1.5) return 'C';
        if (time <= target * 2) return 'D';
        return 'F';
    }

    function gradeFlags(stats) {
        if (!stats || stats.total === 0) return 'B';
        var acc = stats.accuracy;
        if (acc >= 98) return 'S';
        if (acc >= 90) return 'A';
        if (acc >= 75) return 'B';
        if (acc >= 50) return 'C';
        if (acc >= 25) return 'D';
        return 'F';
    }

    function gradeSpeed(cps) {
        if (cps >= 5) return 'S';
        if (cps >= 3) return 'A';
        if (cps >= 2) return 'B';
        if (cps >= 1) return 'C';
        if (cps >= 0.5) return 'D';
        return 'F';
    }

    function generateCommentary(entry, analysis) {
        var comments = [];

        if (entry.won) {
            comments.push('🎉 恭喜获胜！');
            if (analysis.overallGrade === 'S') comments.push('这局表现堪称完美！');
            else if (analysis.overallGrade === 'A') comments.push('非常出色的表现！');
        } else {
            comments.push('💥 游戏结束，再接再厉！');
        }

        if (entry.efficiency >= 90) {
            comments.push('你的操作极其高效，几乎没有任何多余点击。');
        } else if (entry.efficiency >= 70) {
            comments.push('效率良好，还有提升空间。');
        } else if (entry.won) {
            comments.push('虽然获胜了，但尝试减少不必要的点击来提高效率。');
        }

        var fa = (entry.flagStats && entry.flagStats.accuracy) || 0;
        var ft = (entry.flagStats && entry.flagStats.total) || 0;
        if (fa < 80 && ft > 0) {
            comments.push('旗帜准确度有待提高，多利用数字推理来确认雷的位置。');
        }

        var peakCps = (entry.clickAnalysis && entry.clickAnalysis.peakCps) || 0;
        if (peakCps >= 4) {
            comments.push('手速惊人！保持冷静的同时维持高速操作。');
        }

        var wc = entry.wastedClicks || 0;
        if (wc === 0 && entry.won) {
            comments.push('零浪费操作！非常干净的解法。');
        }

        if (entry.usedHint) {
            comments.push('使用了提示功能，独立思考仍是提升的最佳途径。');
        }

        var uc = entry.undoCount || 0;
        if (uc > 5) {
            comments.push('较多撤销操作，试着在点击前多观察几秒。');
        }

        return comments;
    }

    function getList(limit) {
        if (limit) return entries.slice(0, limit);
        return entries.slice();
    }

    function getById(id) {
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].id === id) return entries[i];
        }
        return null;
    }

    function deleteById(id) {
        entries = entries.filter(function(e) { return e.id !== id; });
        save();
    }

    function clear() {
        entries = [];
        save();
    }

    /**
     * 获取趋势数据（用于图表）
     */
    function getTrends() {
        var recent = entries.slice(0, 20).reverse();
        return {
            efficiency: recent.map(function(e) { return { date: e.playedAt, value: e.efficiency, won: e.won }; }),
            time: recent.map(function(e) { return { date: e.playedAt, value: e.time, won: e.won, diff: e.difficulty }; }),
            winRate: calculateWinRateTrend(recent)
        };
    }

    function calculateWinRateTrend(list) {
        var result = [];
        var wins = 0;
        var total = 0;
        for (var i = 0; i < list.length; i++) {
            total++;
            if (list[i].won) wins++;
            result.push({
                index: i + 1,
                winRate: Math.round((wins / total) * 100)
            });
        }
        return result;
    }

    /**
     * 获取同难度下的最佳记录对比
     */
    function getBestForDifficulty(difficulty) {
        var best = null;
        for (var i = 0; i < entries.length; i++) {
            var e = entries[i];
            if (e.difficulty !== difficulty || !e.won) continue;
            if (!best || e.time < best.time) best = e;
        }
        return best;
    }

    /**
     * 生成雷区热图数据
     * @param {string} difficulty - 'all' | 'beginner' | 'intermediate' | 'expert'
     * @param {string} type - 'clicks' | 'wins' | 'danger'
     * @returns {Object} { grid: number[20][20], maxValue: number, totalRecords: number, insights: string[] }
     */
    function generateHeatmapData(difficulty, type) {
        var grid = [];
        for (var y = 0; y < 20; y++) {
            var row = [];
            for (var x = 0; x < 20; x++) row.push(0);
            grid.push(row);
        }

        var totalRecords = 0;
        var totalActions = 0;
        var cornerHits = 0;
        var edgeHits = 0;
        var centerHits = 0;

        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            if (!entry || !entry.replay) continue;
            if (difficulty !== 'all' && entry.difficulty !== difficulty) continue;

            var w = entry.width || 9;
            var h = entry.height || 9;
            var replay = entry.replay;
            totalRecords++;

            if (type === 'clicks') {
                for (var j = 0; j < replay.length; j++) {
                    var a = replay[j];
                    if (a.action === 'reveal' || a.action === 'flag' || a.action === 'chord') {
                        var gx = Math.min(19, Math.floor((a.x || 0) / w * 20));
                        var gy = Math.min(19, Math.floor((a.y || 0) / h * 20));
                        grid[gy][gx]++;
                        totalActions++;
                        if (gx <= 2 && gy <= 2) cornerHits++;
                        else if (gx >= 8 && gx <= 11 && gy >= 8 && gy <= 11) centerHits++;
                        else edgeHits++;
                    }
                }
            } else if (type === 'wins' && entry.won) {
                for (var k = 0; k < replay.length; k++) {
                    var b = replay[k];
                    if (b.action === 'reveal') {
                        var gxw = Math.min(19, Math.floor((b.x || 0) / w * 20));
                        var gyw = Math.min(19, Math.floor((b.y || 0) / h * 20));
                        grid[gyw][gxw]++;
                    }
                }
            } else if (type === 'danger' && !entry.won) {
                // 找出最后一个 reveal 动作（踩雷位置）
                var lastReveal = null;
                for (var m = replay.length - 1; m >= 0; m--) {
                    if (replay[m].action === 'reveal') {
                        lastReveal = replay[m];
                        break;
                    }
                }
                if (lastReveal) {
                    var gxd = Math.min(19, Math.floor((lastReveal.x || 0) / w * 20));
                    var gyd = Math.min(19, Math.floor((lastReveal.y || 0) / h * 20));
                    grid[gyd][gxd]++;
                }
            }
        }

        // 计算最大值
        var maxValue = 0;
        for (var r = 0; r < 20; r++) {
            for (var c = 0; c < 20; c++) {
                if (grid[r][c] > maxValue) maxValue = grid[r][c];
            }
        }

        // 生成洞察
        var insights = [];
        if (totalRecords === 0) {
            insights.push('暂无该难度下的记录，完成一局后即可生成热图。');
        } else if (maxValue === 0) {
            insights.push('该筛选条件下暂无有效数据。');
        } else {
            if (type === 'clicks') {
                var totalH = cornerHits + edgeHits + centerHits;
                if (totalH > 0) {
                    var cornerPct = Math.round((cornerHits / totalH) * 100);
                    var centerPct = Math.round((centerHits / totalH) * 100);
                    if (cornerPct > 25) {
                        insights.push('你倾向于从角落开始探索，这是经典的高效开局策略。');
                    } else if (centerPct > 30) {
                        insights.push('你更喜欢从中心区域开始，这可以获得更多的数字信息。');
                    } else {
                        insights.push('你的开局位置分布比较均衡。');
                    }
                }
                insights.push('共分析了 ' + totalRecords + ' 局，' + totalActions + ' 次操作。');
            } else if (type === 'wins') {
                insights.push('基于 ' + totalRecords + ' 场胜利的数据分析。');
                insights.push('绿色越深，表示你在该区域胜率越高。');
            } else if (type === 'danger') {
                insights.push('基于 ' + totalRecords + ' 场失败的数据分析。');
                insights.push('红色越深，表示你在该区域越容易踩雷。');
            }
        }

        return {
            grid: grid,
            maxValue: maxValue,
            totalRecords: totalRecords,
            insights: insights
        };
    }

    load();

    return {
        record: record,
        analyze: analyze,
        getList: getList,
        getById: getById,
        deleteById: deleteById,
        clear: clear,
        getTrends: getTrends,
        getBestForDifficulty: getBestForDifficulty,
        generateHeatmapData: generateHeatmapData
    };
})();
