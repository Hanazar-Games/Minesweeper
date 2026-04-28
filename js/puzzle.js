/**
 * 谜题工坊模块
 * 允许玩家创建、分享和游玩自定义扫雷谜题
 */

const Puzzle = (function() {
    // 当前编辑中的谜题
    let editorBoard = null;
    let editorWidth = 9;
    let editorHeight = 9;
    let editorMines = [];
    let editorRevealed = [];

    // 分享码前缀
    const CODE_PREFIX = 'SM';
    const CODE_VERSION = 1;

    function initEditor(w, h) {
        editorWidth = Math.max(5, Math.min(16, w || 9));
        editorHeight = Math.max(5, Math.min(16, h || 9));
        editorMines = [];
        editorRevealed = [];
        editorBoard = null;
    }

    function toggleMine(x, y) {
        if (x < 0 || x >= editorWidth || y < 0 || y >= editorHeight) return;
        var idx = findMineIndex(x, y);
        if (idx >= 0) {
            editorMines.splice(idx, 1);
        } else {
            editorMines.push({ x: x, y: y });
        }
    }

    function toggleRevealed(x, y) {
        var idx = findRevealedIndex(x, y);
        if (idx >= 0) {
            editorRevealed.splice(idx, 1);
        } else {
            editorRevealed.push({ x: x, y: y });
        }
    }

    function findMineIndex(x, y) {
        for (var i = 0; i < editorMines.length; i++) {
            if (editorMines[i].x === x && editorMines[i].y === y) return i;
        }
        return -1;
    }

    function findRevealedIndex(x, y) {
        for (var i = 0; i < editorRevealed.length; i++) {
            if (editorRevealed[i].x === x && editorRevealed[i].y === y) return i;
        }
        return -1;
    }

    function hasMine(x, y) {
        return findMineIndex(x, y) >= 0;
    }

    function isRevealed(x, y) {
        return findRevealedIndex(x, y) >= 0;
    }

    function getMineCount() {
        return editorMines.length;
    }

    function getCellNumber(x, y) {
        if (hasMine(x, y)) return -1;
        var count = 0;
        for (var dy = -1; dy <= 1; dy++) {
            for (var dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                var nx = x + dx;
                var ny = y + dy;
                if (nx < 0 || nx >= editorWidth || ny < 0 || ny >= editorHeight) continue;
                if (hasMine(nx, ny)) count++;
            }
        }
        return count;
    }

    function clearAll() {
        editorMines = [];
        editorRevealed = [];
    }

    function randomPuzzle(w, h, density) {
        editorWidth = Math.max(5, Math.min(16, w || 9));
        editorHeight = Math.max(5, Math.min(16, h || 9));
        editorMines = [];
        editorRevealed = [];
        var total = editorWidth * editorHeight;
        var d = typeof density === 'number' ? density : 0.15;
        var mineCount = Math.max(1, Math.min(total - 1, Math.floor(total * d)));
        var positions = [];
        for (var y = 0; y < editorHeight; y++) {
            for (var x = 0; x < editorWidth; x++) {
                positions.push({ x: x, y: y });
            }
        }
        // Fisher-Yates shuffle
        for (var i = positions.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = positions[i];
            positions[i] = positions[j];
            positions[j] = tmp;
        }
        for (var k = 0; k < mineCount; k++) {
            editorMines.push(positions[k]);
        }
    }

    // 编码分享码
    // 格式: SM{v}{w}{h}{bitmap_base64}
    // v = 版本号 (1 byte)
    // w = 宽度-1 (4 bits), h = 高度-1 (4 bits) => 合为 1 byte
    // bitmap = w*h bits, 1=mine, 0=empty
    function encodePuzzle() {
        var w = editorWidth;
        var h = editorHeight;
        var totalBits = w * h;
        var totalBytes = Math.ceil(totalBits / 8) + 2; // +2 for version + wh
        var bytes = new Uint8Array(totalBytes);
        bytes[0] = CODE_VERSION;
        bytes[1] = ((w - 1) << 4) | (h - 1);

        var bitIdx = 0;
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var byteIdx = 2 + Math.floor(bitIdx / 8);
                var bitPos = 7 - (bitIdx % 8);
                if (hasMine(x, y)) {
                    bytes[byteIdx] |= (1 << bitPos);
                }
                bitIdx++;
            }
        }

        // base64 encode
        var binary = '';
        for (var i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        var base64;
        if (typeof btoa !== 'undefined') {
            base64 = btoa(binary);
        } else {
            base64 = Buffer.from(bytes).toString('base64');
        }
        return CODE_PREFIX + base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    }

    function decodePuzzle(code) {
        if (!code || typeof code !== 'string') return null;
        code = code.trim();
        if (code.substring(0, CODE_PREFIX.length) !== CODE_PREFIX) return null;
        var base64 = code.substring(CODE_PREFIX.length)
            .replace(/-/g, '+').replace(/_/g, '/');
        // pad base64
        while (base64.length % 4 !== 0) base64 += '=';

        var bytes;
        if (typeof atob !== 'undefined') {
            var binary = atob(base64);
            bytes = new Uint8Array(binary.length);
            for (var i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
        } else {
            bytes = new Uint8Array(Buffer.from(base64, 'base64'));
        }

        if (bytes.length < 2) return null;
        var version = bytes[0];
        if (version !== CODE_VERSION) return null;
        var wh = bytes[1];
        var w = ((wh >> 4) & 0x0F) + 1;
        var h = (wh & 0x0F) + 1;
        var totalBits = w * h;
        var expectedBytes = Math.ceil(totalBits / 8) + 2;
        if (bytes.length < expectedBytes) return null;

        var mines = [];
        var bitIdx = 0;
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var byteIdx = 2 + Math.floor(bitIdx / 8);
                var bitPos = 7 - (bitIdx % 8);
                if ((bytes[byteIdx] >> bitPos) & 1) {
                    mines.push({ x: x, y: y });
                }
                bitIdx++;
            }
        }

        return {
            width: w,
            height: h,
            mines: mines
        };
    }

    // 验证谜题可解性（简化版）
    // 检查是否所有非雷格都连通（从某个空格可以 flood fill 到所有非雷格）
    // 且至少有一个 0 格作为起点
    function validatePuzzle() {
        var w = editorWidth;
        var h = editorHeight;
        if (editorMines.length === 0) return { valid: false, reason: '至少需要放置1个地雷' };
        if (editorMines.length >= w * h) return { valid: false, reason: '地雷数不能填满整个棋盘' };

        // 找第一个 0 格作为起点
        var startX = -1, startY = -1;
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                if (getCellNumber(x, y) === 0) {
                    startX = x;
                    startY = y;
                    break;
                }
            }
            if (startX >= 0) break;
        }
        if (startX < 0) return { valid: false, reason: '没有安全的起点（0格），玩家第一步就必须猜' };

        // BFS 检查连通性
        var visited = {};
        var queue = [{ x: startX, y: startY }];
        visited[startX + ',' + startY] = true;
        var visitedCount = 0;

        while (queue.length > 0) {
            var curr = queue.shift();
            visitedCount++;
            var num = getCellNumber(curr.x, curr.y);
            if (num === 0) {
                for (var dy = -1; dy <= 1; dy++) {
                    for (var dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        var nx = curr.x + dx;
                        var ny = curr.y + dy;
                        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                        if (hasMine(nx, ny)) continue;
                        var key = nx + ',' + ny;
                        if (!visited[key]) {
                            visited[key] = true;
                            queue.push({ x: nx, y: ny });
                        }
                    }
                }
            }
        }

        var safeCells = w * h - editorMines.length;
        if (visitedCount < safeCells) {
            return { valid: false, reason: '存在无法从起点到达的安全区域（谜题被分割）' };
        }

        return { valid: true, reason: '谜题有效！' };
    }

    // 根据当前编辑器状态创建一个可玩的 MinesweeperBoard
    function createPlayableBoard() {
        var w = editorWidth;
        var h = editorHeight;
        // 过滤越界雷
        var validMines = editorMines.filter(function(m) {
            return m.x >= 0 && m.x < w && m.y >= 0 && m.y < h;
        });
        var mineCount = validMines.length;
        // 使用固定种子 0，因为我们手动放置地雷
        var board = new MinesweeperBoard(w, h, mineCount, 0);
        // 清空自动生成的地雷，手动设置
        board.mines = [];
        for (var i = 0; i < validMines.length; i++) {
            var m = validMines[i];
            board.mines.push({ x: m.x, y: m.y });
            board.cells[m.y][m.x].isMine = true;
        }
        board.mineCount = mineCount;
        board.calculateNumbers();
        board.calculateBV();
        board.firstClick = false; // 谜题中地雷已预设好
        board.gameOver = false;
        board.revealedCount = 0;
        board.flaggedCount = 0;
        return board;
    }

    // 从解码后的数据加载到编辑器
    function loadFromData(data) {
        if (!data) return false;
        editorWidth = data.width;
        editorHeight = data.height;
        // 过滤越界雷
        editorMines = data.mines.filter(function(m) {
            return m.x >= 0 && m.x < editorWidth && m.y >= 0 && m.y < editorHeight;
        });
        editorRevealed = [];
        return true;
    }

    function getEditorState() {
        return {
            width: editorWidth,
            height: editorHeight,
            mines: editorMines.slice(),
            revealed: editorRevealed.slice(),
            mineCount: editorMines.length
        };
    }

    function setEditorSize(w, h) {
        editorWidth = Math.max(5, Math.min(16, w));
        editorHeight = Math.max(5, Math.min(16, h));
        // 移除超出边界的雷和揭示标记
        editorMines = editorMines.filter(function(m) {
            return m.x < editorWidth && m.y < editorHeight;
        });
        editorRevealed = editorRevealed.filter(function(r) {
            return r.x < editorWidth && r.y < editorHeight;
        });
    }

    return {
        initEditor: initEditor,
        toggleMine: toggleMine,
        toggleRevealed: toggleRevealed,
        hasMine: hasMine,
        isRevealed: isRevealed,
        getCellNumber: getCellNumber,
        getMineCount: getMineCount,
        clearAll: clearAll,
        randomPuzzle: randomPuzzle,
        encodePuzzle: encodePuzzle,
        decodePuzzle: decodePuzzle,
        validatePuzzle: validatePuzzle,
        createPlayableBoard: createPlayableBoard,
        loadFromData: loadFromData,
        getEditorState: getEditorState,
        setEditorSize: setEditorSize,
        CODE_PREFIX: CODE_PREFIX
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Puzzle;
}
