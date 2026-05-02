/**
 * 道具系统模块
 * 4 种道具：探测器、安全盾牌、时间冻结、提示增强
 */

const Powerups = (function() {
    // 道具定义
    var POWERUPS = {
        scanner: {
            id: 'scanner',
            name: '炸弹探测器',
            icon: '🔍',
            desc: '自动标记周围 1 个地雷',
            defaultCount: 3,
            key: '1'
        },
        shield: {
            id: 'shield',
            name: '安全盾牌',
            icon: '🛡️',
            desc: '下一次踩雷不会输',
            defaultCount: 1,
            key: '2'
        },
        freeze: {
            id: 'freeze',
            name: '时间冻结',
            icon: '⏱️',
            desc: '暂停计时 10 秒',
            defaultCount: 2,
            key: '3'
        },
        heatmap: {
            id: 'heatmap',
            name: '风险热力图',
            icon: '💡',
            desc: '显示概率热力图（高/中/低风险颜色）',
            defaultCount: 2,
            key: '4'
        }
    };

    // 当前游戏内道具数量
    var inventory = {};
    var activeShield = false;
    var freezeActive = false;
    var heatmapActive = false;

    function initGame() {
        var enabled = Settings.get('powerupsEnabled');
        if (enabled === false) {
            inventory = {};
        } else {
            inventory = {
                scanner: POWERUPS.scanner.defaultCount,
                shield: POWERUPS.shield.defaultCount,
                freeze: POWERUPS.freeze.defaultCount,
                heatmap: POWERUPS.heatmap.defaultCount
            };
        }
        activeShield = false;
        freezeActive = false;
        heatmapActive = false;
    }

    function getCount(id) {
        return inventory[id] || 0;
    }

    function hasShield() {
        return activeShield;
    }

    function consumeShield() {
        activeShield = false;
    }

    function isHeatmapActive() {
        return heatmapActive;
    }

    function deactivateHeatmap() {
        heatmapActive = false;
    }

    function use(id, board) {
        if (!inventory[id] || inventory[id] <= 0) return false;
        if (!board) return false;

        var success = false;
        switch (id) {
            case 'scanner':
                success = useScanner(board);
                break;
            case 'shield':
                success = useShield();
                break;
            case 'freeze':
                success = useFreeze();
                break;
            case 'heatmap':
                success = useHeatmap(board);
                break;
        }

        if (success) {
            inventory[id]--;
            if (typeof AudioManager !== 'undefined') AudioManager.playPowerUp();
            // 记录统计
            if (typeof Stats !== 'undefined') {
                Stats.recordPowerupUsed(id);
            }
            // 通知UI更新
            document.dispatchEvent(new CustomEvent('powerupUsed', {
                detail: { id: id, remaining: inventory[id] }
            }));
        }
        return success;
    }

    // 探测器：自动标记周围一个未标记的地雷
    function useScanner(board) {
        if (!board || !board.cells) return false;
        for (var y = 0; y < board.height; y++) {
            for (var x = 0; x < board.width; x++) {
                var cell = board.cells[y][x];
                if (cell.isRevealed && cell.number > 0) {
                    // 找到该数字周围未标记的地雷
                    var unflaggedMines = [];
                    board.forEachNeighbor(x, y, function(nx, ny) {
                        var n = board.cells[ny][nx];
                        if (n.isMine && !n.isFlagged && !n.isRevealed) {
                            unflaggedMines.push({ x: nx, y: ny });
                        }
                    });
                    if (unflaggedMines.length > 0) {
                        var target = unflaggedMines[0];
                        board.toggleFlag(target.x, target.y, false);
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // 安全盾牌：激活后下一次踩雷不会输
    function useShield() {
        if (activeShield) return false;
        activeShield = true;
        return true;
    }

    // 时间冻结：暂停计时 10 秒
    function useFreeze() {
        if (freezeActive) return false;
        freezeActive = true;
        // 通知 Game 暂停计时
        document.dispatchEvent(new CustomEvent('freezeTime', { detail: { duration: 10 } }));
        setTimeout(function() {
            freezeActive = false;
        }, 10000);
        return true;
    }

    // 风险热力图：激活概率显示
    function useHeatmap(board) {
        heatmapActive = true;
        return true;
    }

    // 计算概率热力图数据
    function getHeatmapData(board) {
        if (!board || !heatmapActive) return null;
        var result = Solver.analyze(board);
        if (!result || !result.probMap) return null;
        return result.probMap;
    }

    function getAll() {
        return {
            inventory: Object.assign({}, inventory),
            activeShield: activeShield,
            freezeActive: freezeActive,
            heatmapActive: heatmapActive
        };
    }

    return {
        POWERUPS: POWERUPS,
        initGame: initGame,
        getCount: getCount,
        use: use,
        hasShield: hasShield,
        consumeShield: consumeShield,
        isHeatmapActive: isHeatmapActive,
        deactivateHeatmap: deactivateHeatmap,
        getHeatmapData: getHeatmapData,
        getAll: getAll
    };
})();
