/**
 * AI 求解器 / 概率提示模块
 * 基于约束传播和概率计算
 */

const Solver = (function() {
    /**
     * 对指定board进行分析，返回每个未揭开格子的概率信息
     */
    function analyze(board) {
        const probs = [];
        const certainSafe = [];
        const certainMine = [];

        // 构建约束系统：每个已揭开数字格产生一个约束
        // constraint = { cells: [未揭开邻居], mineCount: 剩余雷数 }
        const constraints = [];

        for (let y = 0; y < board.height; y++) {
            for (let x = 0; x < board.width; x++) {
                const cell = board.cells[y][x];
                if (!cell.isRevealed || cell.number === 0) continue;

                let hidden = [];
                let flags = 0;
                board.forEachNeighbor(x, y, (nx, ny) => {
                    const n = board.cells[ny][nx];
                    if (n.isFlagged) flags++;
                    else if (!n.isRevealed) hidden.push({ x: nx, y: ny });
                });

                if (hidden.length > 0) {
                    constraints.push({
                        cells: hidden,
                        mineCount: cell.number - flags
                    });
                }
            }
        }

        // 收集所有未揭开的边界格子
        const frontier = new Set();
        constraints.forEach(c => {
            c.cells.forEach(p => frontier.add(`${p.x},${p.y}`));
        });

        // 简单约束求解：如果某约束的隐藏数 == 剩余雷数，则全是雷
        // 如果某约束的剩余雷数 == 0，则全是安全
        let changed = true;
        const safeSet = new Set();
        const mineSet = new Set();

        while (changed) {
            changed = false;
            constraints.forEach(c => {
                const unknown = c.cells.filter(p => !safeSet.has(`${p.x},${p.y}`) && !mineSet.has(`${p.x},${p.y}`));
                const remaining = c.mineCount - c.cells.filter(p => mineSet.has(`${p.x},${p.y}`)).length;

                if (remaining === 0 && unknown.length > 0) {
                    unknown.forEach(p => safeSet.add(`${p.x},${p.y}`));
                    changed = true;
                } else if (remaining === unknown.length && unknown.length > 0) {
                    unknown.forEach(p => mineSet.add(`${p.x},${p.y}`));
                    changed = true;
                }
            });
        }

        safeSet.forEach(k => {
            const [x, y] = k.split(',').map(Number);
            certainSafe.push({ x, y });
        });
        mineSet.forEach(k => {
            const [x, y] = k.split(',').map(Number);
            certainMine.push({ x, y });
        });

        // 概率估计：对边界格子使用组合计数
        const frontierList = Array.from(frontier).map(k => {
            const [x, y] = k.split(',').map(Number);
            return { x, y };
        });

        // 简化的概率估计：对每个边界格子，统计包含它的约束中剩余雷数/未知格子的最小比值
        const probMap = {};
        frontierList.forEach(p => {
            const key = `${p.x},${p.y}`;
            if (safeSet.has(key) || mineSet.has(key)) return;

            let minProb = 1;
            constraints.forEach(c => {
                if (!c.cells.some(q => q.x === p.x && q.y === p.y)) return;
                const unknownInC = c.cells.filter(q => !safeSet.has(`${q.x},${q.y}`) && !mineSet.has(`${q.x},${q.y}`));
                const remaining = c.mineCount - c.cells.filter(q => mineSet.has(`${q.x},${q.y}`)).length;
                if (unknownInC.length > 0) {
                    const p = remaining / unknownInC.length;
                    if (p < minProb) minProb = p;
                }
            });
            probMap[key] = Math.round(minProb * 100);
        });

        // 非边界格子的概率
        let nonFrontierCount = 0;
        for (let y = 0; y < board.height; y++) {
            for (let x = 0; x < board.width; x++) {
                const cell = board.cells[y][x];
                if (!cell.isRevealed && !cell.isFlagged && !frontier.has(`${x},${y}`)) {
                    nonFrontierCount++;
                }
            }
        }

        const remainingMines = board.mineCount - board.flaggedCount - mineSet.size;
        const unknownNonFrontier = nonFrontierCount;
        let nonFrontierProb = 0;
        if (unknownNonFrontier > 0 && remainingMines > 0) {
            nonFrontierProb = Math.min(1, remainingMines / unknownNonFrontier);
        }

        return {
            certainSafe,
            certainMine,
            probMap,
            nonFrontierProb: Math.round(nonFrontierProb * 100),
            frontierCount: frontierList.length,
            nonFrontierCount: unknownNonFrontier,
            remainingMines
        };
    }

    /**
     * 获取最佳提示：优先返回确定安全的格子，其次是概率最低的格子
     */
    function getHint(board) {
        const result = analyze(board);

        if (result.certainSafe.length > 0) {
            return {
                x: result.certainSafe[0].x,
                y: result.certainSafe[0].y,
                type: 'safe',
                probability: 0,
                reason: '逻辑推导：周围数字约束表明此格安全'
            };
        }

        if (result.certainMine.length > 0) {
            return {
                x: result.certainMine[0].x,
                y: result.certainMine[0].y,
                type: 'mine',
                probability: 100,
                reason: '逻辑推导：周围数字约束表明此格是雷，请标记它'
            };
        }

        // 找概率最低的边界格子
        let bestKey = null;
        let bestProb = 101;
        Object.entries(result.probMap).forEach(([key, prob]) => {
            if (prob < bestProb) {
                bestProb = prob;
                bestKey = key;
            }
        });

        if (bestKey) {
            const [x, y] = bestKey.split(',').map(Number);
            return {
                x, y,
                type: 'probable_safe',
                probability: bestProb,
                reason: `概率分析：此格有雷的概率约为 ${bestProb}%`
            };
        }

        // 非边界格子
        if (result.nonFrontierCount > 0) {
            // 找一个非边界格子
            for (let y = 0; y < board.height; y++) {
                for (let x = 0; x < board.width; x++) {
                    const cell = board.cells[y][x];
                    const isFrontier = result.frontierCount > 0; // simplified
                    if (!cell.isRevealed && !cell.isFlagged) {
                        return {
                            x, y,
                            type: 'guess',
                            probability: result.nonFrontierProb,
                            reason: `猜测：非边界区域， estimated ${result.nonFrontierProb}% 概率有雷`
                        };
                    }
                }
            }
        }

        return null;
    }

    /**
     * 自动标记所有确定是雷的格子
     */
    function autoFlag(board) {
        const result = analyze(board);
        return result.certainMine;
    }

    return {
        analyze,
        getHint,
        autoFlag
    };
})();
