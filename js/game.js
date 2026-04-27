/**
 * 游戏主逻辑模块
 */

const Game = (function() {
    let board = null;
    let difficulty = 'beginner';
    let timerInterval = null;
    let time = 0;
    let clicks = 0;
    let gameState = 'idle'; // idle, playing, paused, won, lost
    let history = []; // 用于撤销
    let challengeMode = null;
    let challengeData = {};
    let currentSeed = null;
    let chordCount = 0;
    let usedUndo = false;
    let usedFlags = false;

    const difficulties = {
        beginner: { width: 9, height: 9, mines: 10 },
        intermediate: { width: 16, height: 16, mines: 40 },
        expert: { width: 30, height: 16, mines: 99 },
        master: { width: 40, height: 20, mines: 180 },
    };

    function start(diff, custom = null, challenge = null, seed = null) {
        difficulty = diff;
        challengeMode = challenge;
        challengeData = {};
        
        let width, height, mines;
        if (diff === 'custom' && custom) {
            width = Math.max(5, Math.min(50, parseInt(custom.width) || 20));
            height = Math.max(5, Math.min(30, parseInt(custom.height) || 15));
            mines = Math.max(1, Math.min(width * height - 1, parseInt(custom.mines) || 50));
        } else {
            const d = difficulties[diff] || difficulties.beginner;
            width = d.width;
            height = d.height;
            mines = d.mines;
        }

        currentSeed = seed !== null ? seed : Math.floor(Math.random() * 1000000000);
        board = new MinesweeperBoard(width, height, mines, currentSeed);
        gameState = 'idle';
        time = 0;
        clicks = 0;
        history = [];
        chordCount = 0;
        usedUndo = false;
        usedFlags = false;

        if (challenge === 'blind') {
            challengeData.revealsLeft = 5;
        }

        Replay.start();
        stopTimer();
        updateUI();
    }

    function startTimer() {
        if (timerInterval) return;
        const startTime = Date.now() - time * 1000;
        timerInterval = setInterval(() => {
            time = Math.floor((Date.now() - startTime) / 1000);
            updateTimerDisplay();

            if (challengeMode === 'time-attack' && time >= 60) {
                lose();
            }
        }, 100);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function updateTimerDisplay() {
        const el = document.getElementById('timer');
        if (el) el.textContent = String(time).padStart(3, '0');
    }

    function updateUI() {
        const ev = new CustomEvent('gameUpdate', {
            detail: {
                board,
                time,
                clicks,
                state: gameState,
                difficulty,
                challengeMode
            }
        });
        document.dispatchEvent(ev);
    }

    function saveState() {
        if (history.length > 20) history.shift();
        history.push({
            board: board.clone(),
            time,
            clicks,
            state: gameState
        });
    }

    function undo() {
        if (history.length === 0) return;
        usedUndo = true;
        const prev = history.pop();
        board = prev.board;
        time = prev.time;
        clicks = prev.clicks;
        gameState = prev.state;
        Replay.record('undo', -1, -1);
        updateUI();
    }

    function reveal(x, y) {
        if (gameState === 'won' || gameState === 'lost') return;
        if (gameState === 'paused') return;

        if (gameState === 'idle') {
            gameState = 'playing';
            startTimer();
        }

        const cell = board.getCell(x, y);
        if (!cell || cell.isRevealed || cell.isFlagged) return;

        saveState();
        clicks++;
        Replay.record('reveal', x, y);

        const result = board.reveal(x, y);
        if (result.changed) {
            if (result.hitMine) {
                lose();
            } else {
                if (board.checkWin()) {
                    win();
                }
            }
        }

        updateUI();
    }

    function chord(x, y) {
        if (gameState !== 'playing') return;
        const cell = board.getCell(x, y);
        if (!cell || !cell.isRevealed) return;

        saveState();
        clicks++;
        chordCount++;
        Replay.record('chord', x, y);

        const result = board.chord(x, y);
        if (result.changed) {
            if (result.hitMine) {
                lose();
            } else {
                if (board.checkWin()) {
                    win();
                }
            }
        }

        updateUI();
    }

    function flag(x, y) {
        if (gameState === 'won' || gameState === 'lost') return;
        if (gameState === 'paused') return;
        if (gameState === 'idle') {
            gameState = 'playing';
            startTimer();
        }

        const useQuestion = Settings.get('question');
        const result = board.toggleFlag(x, y, useQuestion);
        if (result.changed) {
            Replay.record('flag', x, y);
            if (result.action === 'flag') {
                usedFlags = true;
                AudioManager.playFlag();
                Stats.recordFlagsPlaced(1);
            } else if (result.action === 'unflag') {
                AudioManager.playUnflag();
            }
        }
        updateUI();
    }

    function win() {
        gameState = 'won';
        stopTimer();
        board.revealAll();
        
        const efficiency = clicks > 0 ? Math.round((board.bv / clicks) * 100) : 0;
        
        Stats.recordGame(difficulty, true, time, clicks, board.bv, efficiency);
        Stats.recordCellsRevealed(board.revealedCount);
        
        if (difficulty !== 'custom') {
            const entry = {
                player: '玩家',
                time,
                efficiency,
                date: new Date().toISOString()
            };
            const isNewRecord = Stats.Leaderboard.add(difficulty, entry);
            showGameOver(true, time, board.bv, efficiency, isNewRecord);
        } else {
            showGameOver(true, time, board.bv, efficiency, false);
        }

        // 每日挑战记录
        if (challengeMode === 'daily') {
            const today = new Date();
            const todayKey = today.getFullYear() + '' + (today.getMonth() + 1) + '' + today.getDate();
            const lastDaily = Storage.get('last_daily');
            const dailyBest = Storage.get('daily_best');
            
            if (lastDaily !== todayKey || !dailyBest || time < dailyBest) {
                Storage.set('daily_best', time);
                Storage.set('last_daily', todayKey);
            }
        }

        AudioManager.playWin();
        createParticles();
        Replay.stop();
        Achievements.check({
            won: true,
            time,
            clicks,
            efficiency,
            difficulty,
            challengeMode,
            noUndo: !usedUndo,
            noFlags: !usedFlags,
            chordCount,
            customSize: difficulty === 'custom',
            width: board ? board.width : null,
            height: board ? board.height : null
        });
        // 通知UI更新成就徽章
        document.dispatchEvent(new CustomEvent('achievementCheck'));
    }

    function lose() {
        gameState = 'lost';
        stopTimer();
        board.revealAll();

        const efficiency = clicks > 0 ? Math.round((board.bv / clicks) * 100) : 0;
        Stats.recordGame(difficulty, false, time, clicks, board.bv, efficiency);
        Stats.recordCellsRevealed(board.revealedCount);

        showGameOver(false, time, board.bv, efficiency, false);
        AudioManager.playLose();
        Replay.stop();
        Achievements.check({
            won: false,
            time,
            clicks,
            efficiency,
            difficulty,
            challengeMode,
            noUndo: !usedUndo,
            noFlags: !usedFlags,
            chordCount,
            customSize: difficulty === 'custom',
            width: board?.width,
            height: board?.height
        });
    }

    function showGameOver(won, t, bv, eff, isNewRecord) {
        setTimeout(() => {
            const ev = new CustomEvent('gameOver', {
                detail: { won, time: t, bv, efficiency: eff, isNewRecord }
            });
            document.dispatchEvent(ev);
        }, 300);
    }

    function createParticles() {
        const container = document.getElementById('particles');
        if (!container || !Settings.get('particles')) return;
        
        const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];
        for (let i = 0; i < 50; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = Math.random() * 100 + 'vw';
            p.style.top = '-10px';
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            p.style.width = (4 + Math.random() * 8) + 'px';
            p.style.height = p.style.width;
            p.style.animationDuration = (0.8 + Math.random() * 1.5) + 's';
            p.style.animationDelay = Math.random() * 0.5 + 's';
            container.appendChild(p);
            setTimeout(() => p.remove(), 2500);
        }
    }

    function pause() {
        if (gameState === 'playing') {
            gameState = 'paused';
            stopTimer();
            updateUI();
        }
    }

    function resume() {
        if (gameState === 'paused') {
            gameState = 'playing';
            startTimer();
            updateUI();
        }
    }

    function hint() {
        if (gameState !== 'playing' && gameState !== 'idle') return;
        
        if (board.firstClick && Settings.get('firstSafe')) {
            const corners = [
                { x: 0, y: 0 },
                { x: board.width - 1, y: 0 },
                { x: 0, y: board.height - 1 },
                { x: board.width - 1, y: board.height - 1 }
            ];
            const corner = corners[Math.floor(Math.random() * corners.length)];
            return { x: corner.x, y: corner.y, type: 'safe', reason: 'corner', probability: 0 };
        }

        // 使用 AI 求解器获取最佳提示
        const solverResult = Solver.getHint(board);
        if (solverResult) {
            AudioManager.playHint();
        }
        return solverResult;
    }

    function autoFlag() {
        if (gameState !== 'playing') return [];
        saveState();
        const flagged = board.autoFlag();
        if (flagged.length > 0) {
            AudioManager.playFlag();
            Stats.recordFlagsPlaced(flagged.length);
        }
        updateUI();
        return flagged;
    }

    function save() {
        if (!board || gameState === 'won' || gameState === 'lost') return false;
        const data = {
            board: {
                width: board.width,
                height: board.height,
                mineCount: board.mineCount,
                cells: board.cells,
                mines: board.mines,
                firstClick: board.firstClick,
                gameOver: board.gameOver,
                revealedCount: board.revealedCount,
                flaggedCount: board.flaggedCount,
                questionCount: board.questionCount,
                bv: board.bv
            },
            difficulty,
            time,
            clicks,
            gameState,
            challengeMode,
            challengeData,
            savedAt: Date.now()
        };
        Storage.set('saved_game', data);
        return true;
    }

    function loadSaved() {
        const data = Storage.get('saved_game');
        if (!data) return false;

        difficulty = data.difficulty;
        time = data.time || 0;
        clicks = data.clicks || 0;
        gameState = data.gameState;
        challengeMode = data.challengeMode || null;
        challengeData = data.challengeData || {};

        const b = data.board;
        board = new MinesweeperBoard(b.width, b.height, b.mineCount);
        board.cells = b.cells;
        board.mines = b.mines;
        board.firstClick = b.firstClick;
        board.gameOver = b.gameOver;
        board.revealedCount = b.revealedCount;
        board.flaggedCount = b.flaggedCount;
        board.questionCount = b.questionCount;
        board.bv = b.bv;

        history = [];
        if (gameState === 'playing') {
            startTimer();
        }
        updateUI();
        return true;
    }

    function hasSaved() {
        return !!Storage.get('saved_game');
    }

    function clearSaved() {
        Storage.remove('saved_game');
    }

    function getState() {
        return {
            board,
            difficulty,
            time,
            clicks,
            gameState,
            challengeMode,
            canUndo: history.length > 0,
            seed: currentSeed
        };
    }

    function getSeed() {
        return currentSeed;
    }

    function startWithSeed(diff, seed) {
        const d = difficulties[diff] || difficulties.beginner;
        Game.start(diff, null, null, seed);
    }

    return {
        start,
        reveal,
        chord,
        flag,
        undo,
        pause,
        resume,
        hint,
        autoFlag,
        save,
        loadSaved,
        hasSaved,
        clearSaved,
        getState,
        get difficulties() { return difficulties; },
        getSeed,
        startWithSeed
    };
})();
