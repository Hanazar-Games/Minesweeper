/**
 * 扫雷雷区逻辑模块
 * 负责生成雷区、计算数字、3BV等
 */

class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }

    next() {
        this.seed = (this.seed * 16807 + 0) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }
}

class MinesweeperBoard {
    constructor(width, height, mineCount, seed = null) {
        this.width = width;
        this.height = height;
        this.mineCount = mineCount;
        this.seed = seed;
        this.rng = seed !== null ? new SeededRandom(seed) : null;
        this.cells = [];
        this.mines = [];
        this.firstClick = true;
        this.gameOver = false;
        this.revealedCount = 0;
        this.flaggedCount = 0;
        this.questionCount = 0;
        this.bv = 0;
        this.init();
    }

    init() {
        this.cells = [];
        for (let y = 0; y < this.height; y++) {
            const row = [];
            for (let x = 0; x < this.width; x++) {
                row.push({
                    x, y,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    isQuestion: false,
                    number: 0,
                    visited: false
                });
            }
            this.cells.push(row);
        }
    }

    random() {
        if (this.rng) {
            return this.rng.next();
        }
        return Math.random();
    }

    generateMines(safeX, safeY, safeRadius = 0) {
        const positions = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let isSafe = (x === safeX && y === safeY);
                if (!isSafe && safeRadius > 0) {
                    const dx = Math.abs(x - safeX);
                    const dy = Math.abs(y - safeY);
                    if (dx <= safeRadius && dy <= safeRadius) {
                        isSafe = true;
                    }
                }
                if (!isSafe) {
                    positions.push({ x, y });
                }
            }
        }

        if (positions.length < this.mineCount) {
            this.mineCount = positions.length;
        }

        // Fisher-Yates 洗牌（使用种子随机数）
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }

        this.mines = positions.slice(0, this.mineCount);
        this.mines.forEach(({ x, y }) => {
            this.cells[y][x].isMine = true;
        });

        this.calculateNumbers();
        this.calculateBV();
    }

    calculateNumbers() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells[y][x].isMine) continue;
                let count = 0;
                this.forEachNeighbor(x, y, (nx, ny) => {
                    if (this.cells[ny][nx].isMine) count++;
                });
                this.cells[y][x].number = count;
            }
        }
    }

    calculateBV() {
        // 3BV = Bechtel's Board Benchmark Value
        // 即所有需要点击的次数，空白连通区域算1
        let bv = 0;
        const visited = Array(this.height).fill(null).map(() => Array(this.width).fill(false));

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (visited[y][x] || this.cells[y][x].isMine) continue;
                
                if (this.cells[y][x].number === 0) {
                    // 空白区域，BFS
                    bv++;
                    const queue = [{ x, y }];
                    visited[y][x] = true;
                    while (queue.length > 0) {
                        const { x: cx, y: cy } = queue.shift();
                        this.forEachNeighbor(cx, cy, (nx, ny) => {
                            if (!visited[ny][nx] && !this.cells[ny][nx].isMine) {
                                visited[ny][nx] = true;
                                if (this.cells[ny][nx].number === 0) {
                                    queue.push({ x: nx, y: ny });
                                }
                            }
                        });
                    }
                } else {
                    // 单独的数字格
                    bv++;
                    visited[y][x] = true;
                }
            }
        }
        this.bv = bv;
    }

    forEachNeighbor(x, y, callback) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                    callback(nx, ny);
                }
            }
        }
    }

    reveal(x, y) {
        const cell = this.cells[y][x];
        if (cell.isRevealed || cell.isFlagged || this.gameOver) {
            return { changed: false };
        }

        if (this.firstClick) {
            const noGuess = Settings.get('noGuess');
            this.generateMines(x, y, noGuess ? 1 : 0);
            this.firstClick = false;
        }

        if (cell.isMine) {
            cell.isRevealed = true;
            return { changed: true, hitMine: true };
        }

        const revealed = [];
        if (cell.number === 0) {
            this.floodReveal(x, y, revealed);
        } else {
            cell.isRevealed = true;
            this.revealedCount++;
            revealed.push({ x, y });
        }

        return { changed: true, revealed, hitMine: false };
    }

    floodReveal(x, y, revealed) {
        const queue = [{ x, y }];
        const visited = new Set();
        visited.add(`${x},${y}`);

        while (queue.length > 0) {
            const { x: cx, y: cy } = queue.shift();
            const cell = this.cells[cy][cx];
            
            if (cell.isRevealed || cell.isFlagged || cell.isMine) continue;
            
            cell.isRevealed = true;
            this.revealedCount++;
            revealed.push({ x: cx, y: cy });

            if (cell.number === 0) {
                this.forEachNeighbor(cx, cy, (nx, ny) => {
                    const key = `${nx},${ny}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        queue.push({ x: nx, y: ny });
                    }
                });
            }
        }
    }

    chord(x, y) {
        const cell = this.cells[y][x];
        if (!cell.isRevealed || cell.number === 0 || this.gameOver) {
            return { changed: false };
        }

        let flagCount = 0;
        this.forEachNeighbor(x, y, (nx, ny) => {
            if (this.cells[ny][nx].isFlagged) flagCount++;
        });

        if (flagCount !== cell.number) {
            return { changed: false };
        }

        const revealed = [];
        let hitMine = false;
        this.forEachNeighbor(x, y, (nx, ny) => {
            const ncell = this.cells[ny][nx];
            if (!ncell.isRevealed && !ncell.isFlagged) {
                if (ncell.isMine) {
                    ncell.isRevealed = true;
                    hitMine = true;
                } else if (ncell.number === 0) {
                    this.floodReveal(nx, ny, revealed);
                } else {
                    ncell.isRevealed = true;
                    this.revealedCount++;
                    revealed.push({ x: nx, y: ny });
                }
            }
        });

        return { changed: revealed.length > 0 || hitMine, revealed, hitMine };
    }

    toggleFlag(x, y, useQuestion = false) {
        const cell = this.cells[y][x];
        if (cell.isRevealed || this.gameOver) {
            return { changed: false };
        }

        if (cell.isFlagged) {
            if (useQuestion) {
                cell.isFlagged = false;
                cell.isQuestion = true;
                this.flaggedCount--;
                this.questionCount++;
                return { changed: true, action: 'question' };
            } else {
                cell.isFlagged = false;
                this.flaggedCount--;
                return { changed: true, action: 'unflag' };
            }
        } else if (cell.isQuestion) {
            cell.isQuestion = false;
            this.questionCount--;
            return { changed: true, action: 'clear' };
        } else {
            cell.isFlagged = true;
            this.flaggedCount++;
            return { changed: true, action: 'flag' };
        }
    }

    checkWin() {
        const total = this.width * this.height;
        return this.revealedCount === total - this.mineCount;
    }

    revealAll() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.cells[y][x].isRevealed = true;
            }
        }
        this.gameOver = true;
    }

    getCell(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
        return this.cells[y][x];
    }

    clone() {
        const b = new MinesweeperBoard(this.width, this.height, this.mineCount);
        b.firstClick = this.firstClick;
        b.gameOver = this.gameOver;
        b.revealedCount = this.revealedCount;
        b.flaggedCount = this.flaggedCount;
        b.questionCount = this.questionCount;
        b.bv = this.bv;
        b.mines = this.mines.map(m => ({ ...m }));
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                b.cells[y][x] = { ...this.cells[y][x] };
            }
        }
        return b;
    }

    // 找出一个安全的格子用于提示
    findSafeMove() {
        // 优先找0格
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.cells[y][x];
                if (!cell.isRevealed && !cell.isFlagged && !cell.isMine && cell.number === 0) {
                    return { x, y, reason: 'zero' };
                }
            }
        }
        // 然后找任何未揭开的非雷格
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.cells[y][x];
                if (!cell.isRevealed && !cell.isFlagged && !cell.isMine) {
                    return { x, y, reason: 'safe' };
                }
            }
        }
        return null;
    }

    autoFlag() {
        const flagged = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.cells[y][x];
                if (!cell.isRevealed || cell.number === 0) continue;

                let hidden = [];
                let flags = 0;
                this.forEachNeighbor(x, y, (nx, ny) => {
                    const n = this.cells[ny][nx];
                    if (n.isFlagged) flags++;
                    else if (!n.isRevealed) hidden.push({ x: nx, y: ny });
                });

                // 如果隐藏格数 == 剩余雷数，全部标雷
                if (hidden.length > 0 && hidden.length === cell.number - flags) {
                    hidden.forEach(({ x: hx, y: hy }) => {
                        if (!this.cells[hy][hx].isFlagged) {
                            this.cells[hy][hx].isFlagged = true;
                            this.flaggedCount++;
                            flagged.push({ x: hx, y: hy });
                        }
                    });
                }
            }
        }
        return flagged;
    }
}
