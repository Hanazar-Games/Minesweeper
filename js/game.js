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
    let speedrunStreak = 0;
    let currentSeed = null;
    let chordCount = 0;
    let usedUndo = false;
    let usedFlags = false;
    let usedHint = false;
    let usedPowerup = false;
    // 生存模式状态
    let survivalLevel = 0;
    let lives = 3;
    let maxLives = 3;
    let combo = 0;
    let maxCombo = 0;
    let survivalScore = 0;
    let freezeUntil = 0;
    // 战役模式状态
    let campaignLevelId = null;

    const difficulties = {
        beginner: { width: 9, height: 9, mines: 10 },
        intermediate: { width: 16, height: 16, mines: 40 },
        expert: { width: 30, height: 16, mines: 99 },
        master: { width: 40, height: 20, mines: 180 },
        giant: { width: 50, height: 30, mines: 350 },
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
        // 对称模式
        if (challengeMode === 'symmetry') {
            board.symmetryMode = 'point';
        }
        gameState = 'idle';
        time = 0;
        clicks = 0;
        history = [];
        chordCount = 0;
        usedUndo = false;
        usedFlags = false;
        usedHint = false;
        usedPowerup = false;
        combo = 0;
        maxCombo = 0;
        freezeUntil = 0;
        campaignLevelId = null;
        // 统一重置所有模式专属状态，防止模式间污染
        survivalLevel = 0;
        lives = 3;
        maxLives = 3;
        survivalScore = 0;

        if (challenge === 'blind') {
            challengeData.revealsLeft = 5;
        }
        if (challenge !== 'speedrun') {
            speedrunStreak = 0;
        }
        // 生存模式初始化
        if (challenge === 'survival') {
            survivalLevel = 0;
            lives = 3;
            maxLives = 3;
            survivalScore = 0;
        }
        // 禅意模式：不显示计时器压力
        if (challenge === 'zen') {
            challengeData.noTimer = true;
        }
        // 连击大师：2分钟限时
        if (challenge === 'combo-rush') {
            challengeData.timeLimit = 120;
            challengeData.comboRushScore = 0;
        }
        // 无撤销挑战
        if (challenge === 'no-undo') {
            challengeData.noUndo = true;
        }
        // 无尽模式初始化
        if (challenge === 'endless') {
            if (typeof Endless !== 'undefined') {
                Endless.init();
                var ec = Endless.getBoardConfig();
                width = ec.width;
                height = ec.height;
                mines = ec.mines;
            }
        }

        // 初始化道具
        if (typeof Powerups !== 'undefined') {
            Powerups.initGame();
        }

        Replay.start();
        stopTimer();
        updateUI();
    }

    // 时间冻结事件监听
    document.addEventListener('freezeTime', function(e) {
        freezeUntil = Date.now() + e.detail.duration * 1000;
        // 调整 startTime 以补偿冻结期间
        var elapsedBeforeFreeze = time * 1000;
        // 冻结结束后，timer interval 会继续，但 time 不会增加
    });

    function startTimer() {
        if (timerInterval) return;
        var startTime = Date.now() - time * 1000;
        var lastCheck = Date.now();
        timerInterval = setInterval(function() {
            var now = Date.now();
            // 时间冻结检查：跳过冻结期间
            if (freezeUntil > 0 && now < freezeUntil) {
                // 调整 startTime，使 time 在冻结期间不增加
                startTime = now - time * 1000;
                lastCheck = now;
                return;
            }
            // 冻结刚结束，重置 freezeUntil
            if (freezeUntil > 0 && now >= freezeUntil) {
                startTime = now - time * 1000;
                freezeUntil = 0;
            }
            time = Math.floor((now - startTime) / 1000);
            updateTimerDisplay();

            // 每秒检查一次（避免100ms间隔内重复触发）
            if (now - lastCheck >= 1000) {
                lastCheck = now;
                if (challengeMode === 'time-attack' && time >= 60) {
                    lose();
                }
                // 限时挑战
                if (challengeData.timeLimit && time >= challengeData.timeLimit) {
                    lose();
                }
                // 倒计时滴答音效
                if (challengeData.timeLimit && time >= challengeData.timeLimit - 10 && time < challengeData.timeLimit) {
                    AudioManager.playTick();
                }
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
        if (el) {
            var t = String(time);
            while (t.length < 3) t = '0' + t;
            el.textContent = t;
        }
    }

    function updateUI() {
        const detail = {
            board,
            time,
            clicks,
            state: gameState,
            difficulty,
            challengeMode,
            canUndo: history.length > 0,
            seed: currentSeed,
            survivalLevel,
            lives,
            maxLives,
            combo,
            maxCombo,
            survivalScore,
            campaignLevelId
        };
        if (challengeMode === 'endless' && typeof Endless !== 'undefined') {
            detail.endlessState = Endless.getState();
        }
        const ev = new CustomEvent('gameUpdate', { detail: detail });
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
        if (challengeData.noUndo) return; // 无撤销挑战
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

        // 无尽模式：第一次点击设置重生点
        if (challengeMode === 'endless' && typeof Endless !== 'undefined') {
            if (Endless.getState().spawnX < 0) {
                Endless.setSpawn(x, y);
            }
        }

        saveState();
        clicks++;
        Replay.record('reveal', x, y);

        const result = board.reveal(x, y);
        if (result.changed) {
            // 盲扫挑战：递减 revealsLeft
            if (challengeMode === 'blind' && challengeData.revealsLeft > 0) {
                challengeData.revealsLeft--;
            }
            if (result.hitMine) {
                // 无尽模式：扣血而不是直接输
                if (challengeMode === 'endless' && typeof Endless !== 'undefined') {
                    var hp = Endless.takeDamage(1);
                    AudioManager.playLose();
                    if (history.length > 0) {
                        var prev = history.pop();
                        board = prev.board;
                        time = prev.time;
                        clicks = prev.clicks;
                        gameState = prev.state;
                    }
                    updateUI();
                    if (hp <= 0) {
                        lose();
                    }
                }
                // 盾牌保护
                else if (typeof Powerups !== 'undefined' && Powerups.hasShield()) {
                    Powerups.consumeShield();
                    var scell = board.getCell(x, y);
                    if (scell) {
                        scell.isMine = false;
                        var idx = -1;
                        for (var i = 0; i < board.mines.length; i++) {
                            if (board.mines[i].x === x && board.mines[i].y === y) {
                                idx = i; break;
                            }
                        }
                        if (idx >= 0) board.mines.splice(idx, 1);
                        board.mineCount--;
                        board.calculateNumbers();
                        board.calculateBV();
                        scell.isRevealed = true;
                        board.revealedCount++;
                        AudioManager.playReveal();
                        updateUI();
                        if (board.checkWin()) win();
                    }
                } else {
                    // 生存模式扣命
                    if (challengeMode === 'survival' && lives > 1) {
                        lives--;
                        combo = 0;
                        AudioManager.playLose();
                        if (history.length > 0) {
                            const prev = history.pop();
                            board = prev.board;
                            time = prev.time;
                            clicks = prev.clicks;
                        }
                        document.dispatchEvent(new CustomEvent('lifeLost', {
                            detail: { lives: lives, maxLives: maxLives }
                        }));
                        updateUI();
                    } else {
                        lose();
                    }
                }
            } else {
                // combo 计算：连续无错揭示
                combo++;
                if (combo > maxCombo) maxCombo = combo;
                // combo 里程碑音效
                if (combo === 5 || combo === 10 || combo === 20 || combo === 50) {
                    AudioManager.playCombo(combo);
                }
                if (challengeMode === 'endless' && typeof Endless !== 'undefined') {
                    Endless.addRevealed(result.revealed ? result.revealed.length : 1);
                    Endless.addScore(result.revealed ? result.revealed.length * 10 : 10);
                }
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
                // chord 触雷不应用盾牌（盾牌只保护直接 reveal）
                if (challengeMode === 'endless' && typeof Endless !== 'undefined') {
                    var hp = Endless.takeDamage(1);
                    AudioManager.playLose();
                    if (history.length > 0) {
                        var prev = history.pop();
                        board = prev.board;
                        time = prev.time;
                        clicks = prev.clicks;
                        gameState = prev.state;
                    }
                    updateUI();
                    if (hp <= 0) {
                        lose();
                    }
                } else if (challengeMode === 'survival' && lives > 1) {
                    lives--;
                    combo = 0;
                    AudioManager.playLose();
                    if (history.length > 0) {
                        var prev = history.pop();
                        board = prev.board;
                        time = prev.time;
                        clicks = prev.clicks;
                        gameState = prev.state;
                    }
                    document.dispatchEvent(new CustomEvent('lifeLost', {
                        detail: { lives: lives, maxLives: maxLives }
                    }));
                    updateUI();
                } else {
                    lose();
                }
            } else {
                combo++;
                if (combo > maxCombo) maxCombo = combo;
                if (combo === 5 || combo === 10 || combo === 20 || combo === 50) {
                    AudioManager.playCombo(combo);
                }
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
        if (challengeMode === 'no-flag') return; // 无标记挑战禁止标记
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
        
        // 无尽模式：跳过普通统计和排行榜，直接处理进阶
        if (challengeMode === 'endless' && typeof Endless !== 'undefined') {
            Achievements.check({
                won: true, time, clicks, efficiency, difficulty, challengeMode,
                noUndo: !usedUndo, noFlags: !usedFlags, chordCount,
                customSize: difficulty === 'custom',
                width: board ? board.width : null, height: board ? board.height : null
            });
            Replay.stop();
            Endless.nextLevel();
            AudioManager.playLevelUp();
            document.dispatchEvent(new CustomEvent('endlessAdvance', {
                detail: Endless.getState()
            }));
            setTimeout(function() {
                if (gameState === 'won') {
                    startEndlessLevel();
                }
            }, 2000);
            return;
        }
        
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
            var today = new Date();
            var todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            var lastDaily = Storage.get('last_daily');
            var dailyBest = Storage.get('daily_best');
            if (lastDaily !== todayKey || !dailyBest || time < dailyBest) {
                Storage.set('daily_best', time);
                Storage.set('last_daily', todayKey);
            }
        }

        // 每周挑战记录
        if (challengeMode === 'weekly') {
            var now2 = new Date();
            var weekStart = new Date(now2);
            weekStart.setDate(now2.getDate() - now2.getDay());
            var weekKey = weekStart.getFullYear() + '-' + String(weekStart.getMonth() + 1).padStart(2, '0') + '-' + String(weekStart.getDate()).padStart(2, '0');
            var lastWeekly = Storage.get('last_weekly');
            var weeklyBest = Storage.get('weekly_best');
            if (lastWeekly !== weekKey || !weeklyBest || time < weeklyBest) {
                Storage.set('weekly_best', time);
                Storage.set('last_weekly', weekKey);
            }
        }

        // 战役模式完成
        if (campaignLevelId && typeof Campaign !== 'undefined') {
            var stars = Campaign.completeLevel(campaignLevelId, time, clicks, board.bv, usedHint, usedUndo, usedPowerup);
            AudioManager.playLevelUp();
            document.dispatchEvent(new CustomEvent('campaignComplete', {
                detail: { levelId: campaignLevelId, stars: stars }
            }));
        }

        // 生存模式：进入下一关
        if (challengeMode === 'survival') {
            Achievements.check({
                won: true, time, clicks, efficiency, difficulty, challengeMode,
                noUndo: !usedUndo, noFlags: !usedFlags, chordCount,
                customSize: difficulty === 'custom',
                width: board ? board.width : null, height: board ? board.height : null
            });
            survivalLevel++;
            survivalScore += Math.max(1000 - time * 5, 100) + combo * 10;
            lives = Math.min(maxLives, lives + 1);
            AudioManager.playLevelUp();
            document.dispatchEvent(new CustomEvent('survivalAdvance', {
                detail: { level: survivalLevel, score: survivalScore, lives: lives }
            }));
            setTimeout(function() {
                if (gameState === 'won') {
                    startSurvivalLevel(survivalLevel);
                }
            }, 2000);
            return;
        }

        // 挑战模式统计
        if (challengeMode) {
            const key = normalizeChallengeKey(challengeMode);
            if (key === 'speedrun') {
                speedrunStreak++;
                Stats.recordChallenge(key, speedrunStreak);
                AudioManager.playStreakUp(speedrunStreak);
            } else if (key === 'fog' || key === 'survival' || key === 'symmetry' || key === 'zen' || key === 'giant' || key === 'comboRush' || key === 'noUndo') {
                Stats.recordChallenge(key, 1);
            } else if (key === 'noFlag' || key === 'blind' || key === 'timeAttack') {
                const current = Stats.getAll().challenges[key];
                const best = (current && current.best) || 0;
                Stats.recordChallenge(key, best + 1);
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

        // 限时模式超时音效
        if (challengeData.timeLimit && time >= challengeData.timeLimit) {
            AudioManager.playTimeout();
        } else {
            AudioManager.playLose();
        }

        // 无尽模式：跳过普通统计，使用特殊结算
        if (challengeMode === 'endless' && typeof Endless !== 'undefined') {
            var es = Endless.getState();
            showGameOver(false, time, board.bv, efficiency, false);
            Replay.stop();
            Achievements.check({
                won: false, time, clicks, efficiency, difficulty, challengeMode,
                noUndo: !usedUndo, noFlags: !usedFlags, chordCount,
                customSize: difficulty === 'custom',
                width: board ? board.width : null, height: board ? board.height : null
            });
            return;
        }

        Stats.recordGame(difficulty, false, time, clicks, board.bv, efficiency);
        Stats.recordCellsRevealed(board.revealedCount);

        showGameOver(false, time, board.bv, efficiency, false);
        Replay.stop();

        // 速通挑战连胜中断
        if (challengeMode && normalizeChallengeKey(challengeMode) === 'speedrun') {
            if (speedrunStreak > 0) AudioManager.playStreakReset();
            speedrunStreak = 0;
        }

        // 生存模式结束统计
        if (challengeMode === 'survival') {
            Stats.recordSurvival(survivalLevel, survivalScore, maxCombo);
        }

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
            width: board ? board.width : null,
            height: board ? board.height : null
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
        usedHint = true;
        
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
            currentSeed,
            symmetryMode: board ? board.symmetryMode : null,
            campaignLevelId,
            survivalLevel,
            lives,
            maxLives,
            combo,
            maxCombo,
            survivalScore,
            usedUndo,
            usedFlags,
            usedHint,
            usedPowerup,
            chordCount,
            speedrunStreak,
            endlessState: (challengeMode === 'endless' && typeof Endless !== 'undefined') ? Endless.getState() : null,
            history: history.map(function(h) {
                return {
                    board: h.board ? {
                        width: h.board.width,
                        height: h.board.height,
                        mineCount: h.board.mineCount,
                        cells: h.board.cells,
                        mines: h.board.mines,
                        firstClick: h.board.firstClick,
                        gameOver: h.board.gameOver,
                        revealedCount: h.board.revealedCount,
                        flaggedCount: h.board.flaggedCount,
                        questionCount: h.board.questionCount,
                        bv: h.board.bv
                    } : null,
                    time: h.time,
                    clicks: h.clicks,
                    state: h.state
                };
            }),
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
        currentSeed = data.currentSeed || null;
        campaignLevelId = data.campaignLevelId || null;
        survivalLevel = data.survivalLevel || 0;
        lives = data.lives || 3;
        maxLives = data.maxLives || 3;
        combo = data.combo || 0;
        maxCombo = data.maxCombo || 0;
        survivalScore = data.survivalScore || 0;
        usedUndo = data.usedUndo || false;
        usedFlags = data.usedFlags || false;
        usedHint = data.usedHint || false;
        usedPowerup = data.usedPowerup || false;
        chordCount = data.chordCount || 0;
        speedrunStreak = data.speedrunStreak || 0;

        // 恢复无尽模式状态
        if (challengeMode === 'endless' && data.endlessState && typeof Endless !== 'undefined') {
            Endless.loadState(data.endlessState);
        }

        const b = data.board;
        board = new MinesweeperBoard(b.width, b.height, b.mineCount, currentSeed);
        board.cells = b.cells;
        board.mines = b.mines;
        board.firstClick = b.firstClick;
        board.gameOver = b.gameOver;
        board.revealedCount = b.revealedCount;
        board.flaggedCount = b.flaggedCount;
        board.questionCount = b.questionCount;
        board.bv = b.bv;
        board.symmetryMode = b.symmetryMode || null;

        // 恢复历史记录
        history = [];
        if (data.history && Array.isArray(data.history)) {
            data.history.forEach(function(h) {
                if (h.board) {
                    var hb = new MinesweeperBoard(h.board.width, h.board.height, h.board.mineCount, currentSeed);
                    hb.cells = h.board.cells;
                    hb.mines = h.board.mines;
                    hb.firstClick = h.board.firstClick;
                    hb.gameOver = h.board.gameOver;
                    hb.revealedCount = h.board.revealedCount;
                    hb.flaggedCount = h.board.flaggedCount;
                    hb.questionCount = h.board.questionCount;
                    hb.bv = h.board.bv;
                    history.push({ board: hb, time: h.time, clicks: h.clicks, state: h.state });
                }
            });
        }

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
            seed: currentSeed,
            survivalLevel,
            lives,
            maxLives,
            combo,
            maxCombo,
            survivalScore,
            campaignLevelId,
            endlessState: (challengeMode === 'endless' && typeof Endless !== 'undefined') ? Endless.getState() : null
        };
    }

    function getSeed() {
        return currentSeed;
    }

    function normalizeChallengeKey(mode) {
        var map = {
            'speedrun': 'speedrun',
            'no-flag': 'noFlag',
            'blind': 'blind',
            'time-attack': 'timeAttack',
            'fog': 'fog',
            'survival': 'survival',
            'symmetry': 'symmetry',
            'zen': 'zen',
            'giant': 'giant',
            'combo-rush': 'comboRush',
            'no-undo': 'noUndo'
        };
        return map[mode] || mode;
    }

    // 战役关卡开始
    function startCampaignLevel(levelId) {
        if (typeof Campaign === 'undefined') return false;
        var level = Campaign.getLevel(levelId);
        if (!level) return false;
        campaignLevelId = levelId;
        difficulty = 'custom';
        challengeMode = level.type === 'time' ? 'time-attack' : (level.type === 'blind' ? 'blind' : (level.type === 'fog' ? 'fog' : null));
        challengeData = {};
        if (level.timeLimit) challengeData.timeLimit = level.timeLimit;
        if (level.type === 'blind') challengeData.revealsLeft = 5;
        currentSeed = level.seed;
        board = new MinesweeperBoard(level.width, level.height, level.mines, level.seed);
        if (level.type === 'noguess') {
            Settings.set('noGuess', true);
        } else {
            Settings.set('noGuess', false);
        }
        gameState = 'idle';
        time = 0;
        clicks = 0;
        history = [];
        chordCount = 0;
        usedUndo = false;
        usedFlags = false;
        usedHint = false;
        usedPowerup = false;
        combo = 0;
        maxCombo = 0;
        freezeUntil = 0;
        if (typeof Powerups !== 'undefined') Powerups.initGame();
        Replay.start();
        stopTimer();
        updateUI();
        return true;
    }

    // 生存模式关卡开始
    function startSurvivalLevel(level) {
        survivalLevel = level;
        var baseMines = 40 + level * 2;
        var w = 16, h = 16;
        currentSeed = Math.floor(Math.random() * 1000000000);
        board = new MinesweeperBoard(w, h, Math.min(baseMines, w * h - 1), currentSeed);
        difficulty = 'intermediate';
        challengeMode = 'survival';
        challengeData = {};
        gameState = 'idle';
        time = 0;
        clicks = 0;
        history = [];
        chordCount = 0;
        usedUndo = false;
        usedFlags = false;
        usedHint = false;
        usedPowerup = false;
        combo = 0;
        freezeUntil = 0;
        if (typeof Powerups !== 'undefined') Powerups.initGame();
        Replay.start();
        stopTimer();
        updateUI();
    }

    function startEndlessLevel() {
        if (typeof Endless === 'undefined') return;
        var ec = Endless.getBoardConfig();
        currentSeed = Math.floor(Math.random() * 1000000000);
        board = new MinesweeperBoard(ec.width, ec.height, ec.mines, currentSeed);
        difficulty = 'intermediate';
        challengeMode = 'endless';
        challengeData = {};
        gameState = 'idle';
        time = 0;
        clicks = 0;
        history = [];
        chordCount = 0;
        usedUndo = false;
        usedFlags = false;
        usedHint = false;
        usedPowerup = false;
        combo = 0;
        freezeUntil = 0;
        if (typeof Powerups !== 'undefined') Powerups.initGame();
        Replay.start();
        stopTimer();
        updateUI();
    }

    function usePowerup(id) {
        if (gameState !== 'playing' && gameState !== 'idle') return false;
        if (typeof Powerups === 'undefined') return false;
        var result = Powerups.use(id, board);
        if (result) {
            usedPowerup = true;
            updateUI();
        }
        return result;
    }

    function startWithSeed(diff, seed) {
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
        startWithSeed,
        startCampaignLevel,
        startSurvivalLevel,
        startEndlessLevel,
        usePowerup,
        get survivalLevel() { return survivalLevel; },
        get lives() { return lives; },
        get maxLives() { return maxLives; },
        get combo() { return combo; },
        get maxCombo() { return maxCombo; },
        get survivalScore() { return survivalScore; }
    };
})();
