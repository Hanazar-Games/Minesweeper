/**
 * UI 交互模块
 * 负责渲染游戏板和处理用户输入
 */

const UI = (function() {
    let currentScreen = 'splash';
    let cellElements = [];
    let isMouseDown = false;
    let mouseBtn = null;
    let longPressTimer = null;
    let hintCell = null;
    let focusX = 0;
    let focusY = 0;
    let focusVisible = false;

    function init() {
        bindMenuEvents();
        bindGameEvents();
        bindSettingsEvents();
        bindOverlayEvents();
        bindKeyboardEvents();
        bindNavigationEvents();
        bindStatsEvents();
        bindLeaderboardEvents();
        bindChallengeEvents();
        bindDifficultyEvents();
        bindAchievementsEvents();
        bindCampaignEvents();
        bindPuzzleEvents();
        bindQuestEvents();
        bindBattleLogEvents();
        bindShadowRaceEvents();
        bindPatternDojoEvents();
        bindThunderRushEvents();
        bindMuseumEvents();
        bindArchitectEvents();
        updateContinueButton();
        updateAchievementBadge();
        updateQuestBadge();
    }

    function showScreen(name) {
        // 离开布雷大师时清理状态
        if (currentScreen === 'architect' && name !== 'architect-screen') {
            architectCurrentLevel = null;
            architectPlayerMines = [];
            architectGameCompleted = false;
            architectStartTime = 0;
        }

        // 如果正在雷暴突袭游戏中，确认是否退出
        if (currentScreen === 'thunder-rush' && typeof ThunderRush !== 'undefined') {
            var trState = ThunderRush.getState();
            if (trState.gameState === 'playing') {
                if (!confirm('雷暴突袭正在进行中，确定要退出吗？')) return;
                ThunderRush.stopGame();
                thunderGameActive = false;
                if (thunderLoopId) {
                    clearTimeout(thunderLoopId);
                    thunderLoopId = null;
                }
                if (thunderLongPressTimer) {
                    clearTimeout(thunderLongPressTimer);
                    thunderLongPressTimer = null;
                }
            }
        }

        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(name).classList.remove('hidden');
        currentScreen = name.replace('-screen', '');
        
        if (name === 'stats-screen') {
            renderStats();
        } else if (name === 'leaderboard-screen') {
            renderLeaderboard('beginner');
        } else if (name === 'difficulty-screen') {
            updateDifficultyBests();
        } else if (name === 'campaign-screen') {
            renderCampaign();
        } else if (name === 'battle-log-screen') {
            resetBattleLogTabs();
            renderBattleLogList();
            renderBattleLogTrends();
            renderHeatmap();
        } else if (name === 'pattern-dojo-screen') {
            renderDojoGallery();
        } else if (name === 'thunder-rush-screen') {
            showThunderRushStart();
        } else if (name === 'museum-screen') {
            renderMuseum();
        } else if (name === 'architect-screen') {
            renderArchitectLevels();
        } else if (name === 'game-screen') {
            // 进入游戏时重置影子竞速结果面板
            var srResultEl = document.getElementById('shadow-race-result');
            if (srResultEl) {
                srResultEl.classList.add('hidden');
                srResultEl.innerHTML = '';
            }
        }
    }

    function bindMenuEvents() {
        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                const action = btn.dataset.action;
                switch (action) {
                    case 'play':
                        // 默认经典初级扫雷
                        Game.start('beginner');
                        showScreen('game-screen');
                        break;
                    case 'daily':
                        startDailyChallenge();
                        break;
                    case 'weekly':
                        startWeeklyChallenge();
                        break;
                    case 'continue':
                        if (Game.loadSaved()) {
                            showScreen('game-screen');
                        }
                        break;
                    case 'endless':
                        Game.start('intermediate', null, 'endless');
                        showScreen('game-screen');
                        break;
                    case 'difficulty':
                        showScreen('difficulty-screen');
                        break;
                    case 'puzzle':
                        showScreen('puzzle-screen');
                        initPuzzleEditor();
                        break;
                    case 'daily-quests':
                        showScreen('daily-quests-screen');
                        renderDailyQuests();
                        break;
                    case 'challenge':
                        showScreen('challenge-screen');
                        break;
                    case 'pattern-dojo':
                        showScreen('pattern-dojo-screen');
                        break;
                    case 'thunder-rush':
                        showScreen('thunder-rush-screen');
                        break;
                    case 'museum':
                        showScreen('museum-screen');
                        break;
                    case 'architect':
                        showScreen('architect-screen');
                        break;
                    case 'campaign':
                        showScreen('campaign-screen');
                        break;
                    case 'stats':
                        showScreen('stats-screen');
                        break;
                    case 'leaderboard':
                        showScreen('leaderboard-screen');
                        break;
                    case 'settings':
                        loadSettingsUI();
                        showScreen('settings-screen');
                        break;
                    case 'tutorial':
                        Tutorial.start();
                        showScreen('tutorial-screen');
                        break;
                    case 'achievements':
                        renderAchievements('all');
                        showScreen('achievements-screen');
                        break;
                    case 'battle-log':
                        showScreen('battle-log-screen');
                        break;
                    case 'help':
                        showScreen('help-screen');
                        break;
                }
            });
        });
    }

    function bindDifficultyEvents() {
        document.querySelectorAll('.difficulty-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT') return;
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                const diff = card.dataset.diff;
                if (diff === 'custom') {
                    var w = parseInt(document.getElementById('custom-width').value) || 20;
                    var h = parseInt(document.getElementById('custom-height').value) || 15;
                    var m = parseInt(document.getElementById('custom-mines').value) || 50;
                    var pct = parseInt(document.getElementById('custom-percent').value) || 15;
                    // 如果用户调整了百分比滑块，按百分比计算雷数
                    if (document.getElementById('custom-percent').dataset.changed) {
                        m = Math.max(1, Math.min(w * h - 1, Math.round(w * h * pct / 100)));
                    }
                    Game.start('custom', { width: w, height: h, mines: m });
                } else {
                    Game.start(diff);
                }
                showScreen('game-screen');
            });
        });

        // 百分比滑块联动
        var percentSlider = document.getElementById('custom-percent');
        var percentValue = document.getElementById('custom-percent-value');
        if (percentSlider && percentValue) {
            percentSlider.addEventListener('input', function() {
                percentSlider.dataset.changed = 'true';
                percentValue.textContent = percentSlider.value + '%';
                var w = parseInt(document.getElementById('custom-width').value) || 20;
                var h = parseInt(document.getElementById('custom-height').value) || 15;
                var m = Math.round(w * h * parseInt(percentSlider.value) / 100);
                document.getElementById('custom-mines').value = Math.max(1, Math.min(w * h - 1, m));
            });
        }
    }

    function updateDifficultyBests() {
        const stats = Stats.getAll();
        ['beginner', 'intermediate', 'expert', 'master', 'giant'].forEach(diff => {
            const el = document.getElementById('best-' + diff);
            if (el) {
                const d = stats.byDifficulty[diff];
                el.textContent = d && d.bestTime !== null ? d.bestTime + 's' : '--';
            }
        });
    }

    function bindGameEvents() {
        document.addEventListener('gameUpdate', (e) => {
            renderBoard(e.detail);
        });

        document.getElementById('face-btn').addEventListener('click', () => {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            const state = Game.getState();
            if (state.challengeMode === 'puzzle' && Game.replayPuzzle) {
                Game.replayPuzzle();
            } else {
                Game.start(state.difficulty, null, state.challengeMode, state.seed);
            }
        });

        document.getElementById('menu-btn').addEventListener('click', () => {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            Game.pause();
            document.getElementById('pause-overlay').classList.remove('hidden');
        });

        document.getElementById('pause-btn').addEventListener('click', () => {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            Game.pause();
            document.getElementById('pause-overlay').classList.remove('hidden');
        });

        document.getElementById('undo-btn').addEventListener('click', () => {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            Game.undo();
        });

        document.getElementById('hint-btn').addEventListener('click', () => {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            showHint();
        });

        document.getElementById('auto-flag-btn').addEventListener('click', () => {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            Game.autoFlag();
        });

        // 道具按钮
        var powerupBtns = document.querySelectorAll('.powerup-slot');
        powerupBtns.forEach(function(btn, i) {
            btn.addEventListener('click', function() {
                var keys = ['scanner', 'shield', 'freeze', 'heatmap'];
                var key = keys[i];
                if (key) {
                    if (typeof AudioManager !== "undefined") AudioManager.playClick();
                    Game.usePowerup(key);
                }
            });
        });

        document.getElementById('save-btn').addEventListener('click', () => {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            if (Game.save()) {
                showHintOverlay('游戏已保存！');
                updateContinueButton();
            }
        });
    }

    function renderBoard(detail) {
        const board = detail.board;
        const container = document.getElementById('game-board');
        if (!container || !board) return;

        // 如果尺寸变了或者首次渲染，重建 DOM
        if (cellElements.length !== board.height || 
            (cellElements[0] && cellElements[0].length !== board.width)) {
            buildBoardDOM(board);
        }

        // 更新单元格状态
        for (let y = 0; y < board.height; y++) {
            for (let x = 0; x < board.width; x++) {
                const cell = board.cells[y][x];
                const el = cellElements[y][x];
                updateCellElement(el, cell, board.gameOver);
                // 已揭示的格子清除影子标记，避免视觉残留
                if (cell.isRevealed) {
                    el.classList.remove('shadow-flagged');
                }
            }
        }

        // 更新信息栏
        document.getElementById('mine-count').textContent = 
            Math.max(0, board.mineCount - board.flaggedCount);
        var timerEl = document.getElementById('timer');
        if (timerEl) {
            if (detail.challengeMode === 'zen') {
                timerEl.textContent = '∞';
            } else {
                timerEl.textContent = padStart(String(detail.time), 3, '0');
            }
        }
        document.getElementById('click-count').textContent = detail.clicks;
        document.getElementById('undo-btn').disabled = !detail.canUndo;

        // 表情
        const faceBtn = document.getElementById('face-btn');
        if (detail.state === 'won') faceBtn.textContent = '😎';
        else if (detail.state === 'lost') faceBtn.textContent = '😵';
        else if (detail.state === 'paused') faceBtn.textContent = '😴';
        else faceBtn.textContent = '🙂';

        // 进度条
        const total = board.width * board.height;
        const safeCells = total - board.mineCount;
        const progress = safeCells > 0 ? ((board.revealedCount / safeCells) * 100) : 0;
        document.getElementById('progress-fill').style.width = Math.min(100, Math.max(0, progress)) + '%';

        // 影子进度
        var shadowBar = document.getElementById('shadow-progress-bar');
        if (shadowBar) {
            if (typeof ShadowRace !== 'undefined' && ShadowRace.isActive()) {
                shadowBar.classList.remove('hidden');
                var srState = ShadowRace.getState();
                document.getElementById('shadow-progress-fill').style.width = srState.progress + '%';
                document.getElementById('shadow-progress-text').textContent = srState.progress + '%';
            } else {
                shadowBar.classList.add('hidden');
            }
        }

        // 难度标签
        const diffNames = {
            beginner: '初级',
            intermediate: '中级',
            expert: '高级',
            master: '大师',
            giant: '巨型',
            custom: '自定义',
            puzzle: '谜题'
        };
        document.getElementById('difficulty-label').textContent = 
            diffNames[detail.difficulty] || detail.difficulty;

        // 种子显示
        const seedEl = document.getElementById('seed-display');
        if (seedEl) {
            if (detail.challengeMode === 'puzzle') {
                seedEl.textContent = '';
            } else if (detail.seed !== null && detail.seed !== undefined) {
                seedEl.textContent = '种子: ' + detail.seed;
                seedEl.style.fontSize = '0.75rem';
                seedEl.style.opacity = '0.6';
            }
        }

        // 3BV 和效率
        if (Settings.get('show3BV')) {
            document.getElementById('3bv-display').textContent = '3BV: ' + board.bv;
            const eff = detail.clicks > 0 ? Math.round((board.bv / detail.clicks) * 100) : 0;
            document.getElementById('efficiency').textContent = '效率: ' + eff + '%';
        } else {
            document.getElementById('3bv-display').textContent = '';
            document.getElementById('efficiency').textContent = '';
        }

        // 生存模式 HUD
        updateSurvivalHUD(detail);

        // 无尽模式 HUD
        updateEndlessHUD(detail);

        // 道具栏更新
        updatePowerupHUD();

        // 迷雾模式遮罩
        updateFogOverlay(board);

        // 热力图覆盖
        if (typeof Powerups !== 'undefined' && Powerups.isHeatmapActive()) {
            updateHeatmapOverlay(board);
        } else {
            clearHeatmapOverlay();
        }
    }

    function buildBoardDOM(board) {
        const container = document.getElementById('game-board');
        container.innerHTML = '';
        container.style.gridTemplateColumns = `repeat(${board.width}, var(--cell-size))`;
        
        cellElements = [];
        focusX = 0;
        focusY = 0;
        focusVisible = false;
        
        for (let y = 0; y < board.height; y++) {
            const row = [];
            for (let x = 0; x < board.width; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                // 鼠标事件
                cell.addEventListener('mousedown', handleCellMouseDown);
                cell.addEventListener('mouseup', handleCellMouseUp);
                cell.addEventListener('mouseleave', handleCellMouseLeave);
                cell.addEventListener('contextmenu', e => e.preventDefault());
                cell.addEventListener('mouseenter', handleCellMouseEnter);
                
                // 触摸事件（长按标记）
                cell.addEventListener('touchstart', handleTouchStart, { passive: false });
                cell.addEventListener('touchend', handleTouchEnd, { passive: false });
                cell.addEventListener('touchcancel', handleTouchCancel, { passive: false });

                container.appendChild(cell);
                row.push(cell);
            }
            cellElements.push(row);
        }
    }

    function handleCellMouseEnter(e) {
        focusVisible = false;
        updateFocusHighlight();
    }

    function setFocus(x, y) {
        if (!cellElements.length || !cellElements[0]) return;
        const board = Game.getState().board;
        if (!board) return;
        focusX = Math.max(0, Math.min(board.width - 1, x));
        focusY = Math.max(0, Math.min(board.height - 1, y));
        focusVisible = true;
        updateFocusHighlight();
    }

    function updateFocusHighlight() {
        cellElements.forEach(row => {
            row.forEach(el => el.classList.remove('focused'));
        });
        if (focusVisible && cellElements[focusY] && cellElements[focusY][focusX]) {
            cellElements[focusY][focusX].classList.add('focused');
        }
    }

    function updateCellElement(el, cell, gameOver) {
        el.className = 'cell';
        el.textContent = '';
        
        if (cell.isRevealed) {
            el.classList.add('revealed');
            if (cell.isMine) {
                el.classList.add('mine');
                el.textContent = '💣';
            } else if (cell.number > 0) {
                el.classList.add('num-' + cell.number);
                el.textContent = cell.number;
            }
        } else {
            if (cell.isFlagged) {
                el.classList.add('flagged');
                el.textContent = '🚩';
            } else if (cell.isQuestion) {
                el.classList.add('question');
                el.textContent = '?';
            }
        }
    }

    function handleCellMouseDown(e) {
        e.preventDefault();
        const x = parseInt(e.target.dataset.x);
        const y = parseInt(e.target.dataset.y);
        if (isNaN(x) || isNaN(y)) return;

        isMouseDown = true;
        mouseBtn = e.button;

        if (e.button === 0) {
            // 左键
            if (typeof AudioManager !== "undefined") AudioManager.playReveal();
            Game.reveal(x, y);
        } else if (e.button === 2) {
            // 右键
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            Game.flag(x, y);
        } else if (e.button === 1) {
            // 中键 = chord
            if (Settings.get('chord')) {
                if (typeof AudioManager !== "undefined") AudioManager.playChord();
                Game.chord(x, y);
            }
        }
    }

    function handleCellMouseUp(e) {
        isMouseDown = false;
        mouseBtn = null;
    }

    function handleCellMouseLeave(e) {
        isMouseDown = false;
    }

    function handleTouchStart(e) {
        e.preventDefault();
        if (!Settings.get('longPress')) return;
        const x = parseInt(e.target.dataset.x);
        const y = parseInt(e.target.dataset.y);
        if (isNaN(x) || isNaN(y)) return;

        if (longPressTimer) {
            clearTimeout(longPressTimer);
        }
        longPressTimer = setTimeout(() => {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            Game.flag(x, y);
            longPressTimer = null;
        }, 500);
    }

    function handleTouchEnd(e) {
        e.preventDefault();
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
            // 如果不是长按，当作左键点击
            const x = parseInt(e.target.dataset.x);
            const y = parseInt(e.target.dataset.y);
            if (!isNaN(x) && !isNaN(y)) {
                if (typeof AudioManager !== "undefined") AudioManager.playReveal();
                Game.reveal(x, y);
            }
        }
    }

    function handleTouchCancel(e) {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }

    function bindOverlayEvents() {
        document.getElementById('resume-btn').addEventListener('click', () => {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            document.getElementById('pause-overlay').classList.add('hidden');
            Game.resume();
        });

        document.getElementById('restart-pause-btn').addEventListener('click', () => {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            document.getElementById('pause-overlay').classList.add('hidden');
            const state = Game.getState();
            Game.start(state.difficulty, null, state.challengeMode, state.seed);
        });

        document.getElementById('quit-btn').addEventListener('click', () => {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            document.getElementById('pause-overlay').classList.add('hidden');
            if (typeof ShadowRace !== 'undefined') ShadowRace.stop();
            Game.pause();
            showScreen('main-menu');
        });

        document.getElementById('play-again-btn').addEventListener('click', () => {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            document.getElementById('gameover-overlay').classList.add('hidden');
            var shadowEntryId = (typeof ShadowRace !== 'undefined' && ShadowRace.getEntry()) ? ShadowRace.getEntry().id : null;
            const state = Game.getState();
            if (state.challengeMode === 'puzzle' && Game.replayPuzzle) {
                Game.replayPuzzle();
            } else {
                Game.start(state.difficulty, null, state.challengeMode, state.seed);
            }
            if (shadowEntryId && typeof ShadowRace !== 'undefined' && ShadowRace.setup(shadowEntryId)) {
                setTimeout(function() { ShadowRace.start(); }, 500);
            }
        });

        document.getElementById('go-menu-btn').addEventListener('click', () => {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            document.getElementById('gameover-overlay').classList.add('hidden');
            if (typeof ShadowRace !== 'undefined') ShadowRace.stop();
            showScreen('main-menu');
        });

        document.getElementById('view-analysis-btn').addEventListener('click', () => {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            if (typeof BattleLog === 'undefined') {
                showHintOverlay('战后分析模块未加载');
                return;
            }
            var list = BattleLog.getList(1);
            if (list.length > 0) {
                document.getElementById('gameover-overlay').classList.add('hidden');
                renderBattleAnalysis(list[0].id);
                showScreen('battle-analysis-screen');
            } else {
                showHintOverlay('暂无战后分析数据，请先完成一局游戏。');
            }
        });

        document.getElementById('share-seed-btn').addEventListener('click', () => {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            const seed = Game.getSeed();
            const state = Game.getState();
            const diff = state.difficulty;
            const text = `超级扫雷 ${diff} 难度 - 种子: ${seed}`;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => {
                    showHintOverlay('地图种子已复制到剪贴板！');
                }).catch(() => {
                    showHintOverlay(text);
                });
            } else {
                showHintOverlay(text);
            }
        });

        document.getElementById('replay-same-btn').addEventListener('click', () => {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            document.getElementById('gameover-overlay').classList.add('hidden');
            var shadowEntryId = (typeof ShadowRace !== 'undefined' && ShadowRace.getEntry()) ? ShadowRace.getEntry().id : null;
            const state = Game.getState();
            if (state.challengeMode === 'puzzle' && Game.replayPuzzle) {
                Game.replayPuzzle();
            } else {
                Game.start(state.difficulty, null, state.challengeMode, state.seed);
            }
            if (shadowEntryId && typeof ShadowRace !== 'undefined' && ShadowRace.setup(shadowEntryId)) {
                setTimeout(function() { ShadowRace.start(); }, 500);
            }
        });

        document.getElementById('hint-ok-btn').addEventListener('click', () => {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            document.getElementById('hint-overlay').classList.add('hidden');
        });

        var modeInfoOk = document.getElementById('mode-info-ok-btn');
        if (modeInfoOk) {
            modeInfoOk.addEventListener('click', function() {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                document.getElementById('mode-info-overlay').classList.add('hidden');
            });
        }
    }

    function bindKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // Z 撤销
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                Game.undo();
                return;
            }

            const state = Game.getState();
            const inGame = currentScreen === 'game' && state.gameState !== 'won' && state.gameState !== 'lost';

            // 方向键导航（游戏内）
            if (inGame) {
                switch (e.key) {
                    case 'ArrowUp':
                    case 'w':
                    case 'W':
                        e.preventDefault();
                        setFocus(focusX, focusY - 1);
                        return;
                    case 'ArrowDown':
                    case 's':
                    case 'S':
                        e.preventDefault();
                        setFocus(focusX, focusY + 1);
                        return;
                    case 'ArrowLeft':
                    case 'a':
                    case 'A':
                        e.preventDefault();
                        setFocus(focusX - 1, focusY);
                        return;
                    case 'ArrowRight':
                    case 'd':
                    case 'D':
                        e.preventDefault();
                        setFocus(focusX + 1, focusY);
                        return;
                    case ' ':
                    case 'Enter':
                        e.preventDefault();
                        if (focusVisible) {
                            if (typeof AudioManager !== "undefined") AudioManager.playReveal();
                            Game.reveal(focusX, focusY);
                        }
                        return;
                    case 'f':
                    case 'F':
                        e.preventDefault();
                        if (focusVisible) {
                            if (typeof AudioManager !== "undefined") AudioManager.playClick();
                            Game.flag(focusX, focusY);
                        }
                        return;
                    case 'c':
                    case 'C':
                        e.preventDefault();
                        if (focusVisible) {
                            if (typeof AudioManager !== "undefined") AudioManager.playChord();
                            Game.chord(focusX, focusY);
                        }
                        return;
                }
            }

            switch (e.key.toLowerCase()) {
                case 'p':
                    const gs = state.gameState;
                    if (gs === 'playing') {
                        Game.pause();
                        document.getElementById('pause-overlay').classList.remove('hidden');
                    } else if (gs === 'paused') {
                        document.getElementById('pause-overlay').classList.add('hidden');
                        Game.resume();
                    }
                    break;
                case 'h':
                    showHint();
                    break;
                case 'f':
                    if (!e.ctrlKey && !e.metaKey && !inGame) {
                        toggleFullscreen();
                    }
                    break;
                case 'm':
                    const soundToggle = document.getElementById('setting-sound');
                    const musicToggle = document.getElementById('setting-music');
                    if (soundToggle) {
                        soundToggle.checked = !soundToggle.checked;
                        Settings.set('sound', soundToggle.checked);
                    }
                    if (musicToggle) {
                        musicToggle.checked = !musicToggle.checked;
                        Settings.set('music', musicToggle.checked);
                    }
                    if (typeof AudioManager !== 'undefined') {
                        if (typeof AudioManager !== "undefined") AudioManager.setEnabled(soundToggle ? soundToggle.checked : true);
                        if (typeof AudioManager !== "undefined") AudioManager.setMusicEnabled(musicToggle ? musicToggle.checked : true);
                    }
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                    if (inGame) {
                        var keys = ['scanner', 'shield', 'freeze', 'heatmap'];
                        var idx = parseInt(e.key) - 1;
                        if (keys[idx]) {
                            e.preventDefault();
                            Game.usePowerup(keys[idx]);
                        }
                    }
                    break;
                case 'escape':
                    if (currentScreen === 'game') {
                        Game.pause();
                        document.getElementById('pause-overlay').classList.remove('hidden');
                    }
                    break;
            }
        });
    }

    function bindNavigationEvents() {
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                const target = btn.dataset.back;
                showScreen(target);
            });
        });
    }

    function bindSettingsEvents() {
        // 旧版主题按钮（兼容游戏内可能存在的元素）
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                Settings.set('theme', btn.dataset.theme);
            });
        });

        // 设置标签页导航
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                const target = tab.dataset.settingsTab;
                document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
                const panel = document.getElementById('settings-' + target);
                if (panel) panel.classList.add('active');
            });
        });

        // 样式预设
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyStylePreset(btn.dataset.preset);
            });
        });

        // 模式选择
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                Settings.set('colorMode', btn.dataset.mode);
                applyColorMode(btn.dataset.mode);
            });
        });

        // 对比度
        const contrastSlider = document.getElementById('setting-contrast');
        if (contrastSlider) {
            contrastSlider.addEventListener('input', () => {
                const val = contrastSlider.value;
                document.getElementById('contrast-value').textContent = val + '%';
                Settings.set('contrast', parseInt(val));
                document.documentElement.style.filter = 'contrast(' + val + '%)';
            });
        }

        // 配色
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                Settings.set('accentColor', btn.dataset.color);
                applyAccentColor(btn.dataset.color);
            });
        });

        // 字体
        const fontSelect = document.getElementById('setting-font');
        if (fontSelect) {
            fontSelect.addEventListener('change', () => {
                Settings.set('fontFamily', fontSelect.value);
                applyFont(fontSelect.value);
            });
        }

        // 语言
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                Settings.set('language', btn.dataset.lang);
            });
        });

        // 主音量
        const masterVol = document.getElementById('setting-master-volume');
        if (masterVol) {
            masterVol.addEventListener('input', () => {
                const val = masterVol.value;
                document.getElementById('master-volume-value').textContent = val + '%';
                Settings.set('masterVolume', parseInt(val));
            });
        }

        // 音效开关
        bindToggle('setting-sound', 'sound');
        // 音乐开关
        bindToggle('setting-music', 'music');
        // 音效风格
        const sfxStyle = document.getElementById('setting-sfx-style');
        if (sfxStyle) sfxStyle.addEventListener('change', () => Settings.set('sfxStyle', sfxStyle.value));
        // 音效音量
        const sfxVol = document.getElementById('setting-sfx-volume');
        if (sfxVol) {
            sfxVol.addEventListener('input', () => {
                document.getElementById('sfx-volume-value').textContent = sfxVol.value + '%';
                Settings.set('sfxVolume', parseInt(sfxVol.value));
            });
        }
        // 音乐风格
        const musicStyle = document.getElementById('setting-music-style');
        if (musicStyle) musicStyle.addEventListener('change', () => Settings.set('musicStyle', musicStyle.value));
        // 音乐音量
        const musicVol = document.getElementById('setting-music-volume');
        if (musicVol) {
            musicVol.addEventListener('input', () => {
                document.getElementById('music-volume-value').textContent = musicVol.value + '%';
                Settings.set('musicVolume', parseInt(musicVol.value));
            });
        }
        // 音乐速度
        const musicTempo = document.getElementById('setting-music-tempo');
        if (musicTempo) {
            musicTempo.addEventListener('input', () => {
                document.getElementById('music-tempo-value').textContent = musicTempo.value + '%';
                Settings.set('musicTempo', parseInt(musicTempo.value));
            });
        }

        // 高级合成参数
        bindSlider('setting-adsr-attack', 'adsrAttack', 'adsr-attack-value', ' ms');
        bindSlider('setting-adsr-decay', 'adsrDecay', 'adsr-decay-value', ' ms');
        bindSlider('setting-adsr-release', 'adsrRelease', 'adsr-release-value', ' ms');
        bindSlider('setting-music-reverb', 'musicReverb', 'music-reverb-value', '%');

        // 试听按钮
        document.querySelectorAll('.preview-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                const type = btn.dataset.preview;
                if (type === 'click') { if (typeof AudioManager !== "undefined") AudioManager.playClick(); }
                else if (type === 'success') { if (typeof AudioManager !== "undefined") AudioManager.playWin(); }
                else if (type === 'error') { if (typeof AudioManager !== "undefined") AudioManager.playLose(); }
                else if (type === 'flag') { if (typeof AudioManager !== "undefined") AudioManager.playFlag(); }
            });
        });

        // 恢复默认按钮
        (function(el) { if (el) el.addEventListener('click', function() {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            Settings.set('sfxVolume', 70);
            Settings.set('sfxStyle', 'classic');
            loadSettingsUI();
        }); })(document.getElementById('reset-sfx-default'));
        (function(el) { if (el) el.addEventListener('click', function() {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            Settings.set('musicVolume', 30);
            Settings.set('musicTempo', 100);
            Settings.set('musicStyle', 'orchestral');
            loadSettingsUI();
        }); })(document.getElementById('reset-music-default'));
        (function(el) { if (el) el.addEventListener('click', function() {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            Settings.set('adsrAttack', 5);
            Settings.set('adsrDecay', 50);
            Settings.set('adsrRelease', 30);
            Settings.set('musicReverb', 20);
            loadSettingsUI();
        }); })(document.getElementById('reset-advanced-default'));

        // 动画
        bindToggle('setting-animations', 'animations');
        bindToggle('setting-anim-fade', 'animFade');
        bindToggle('setting-anim-hover', 'animHover');
        bindToggle('setting-anim-page', 'animPage');
        bindToggle('setting-anim-modal', 'animModal');
        bindToggle('setting-particles', 'particles');
        bindToggle('setting-anim-reveal', 'animReveal');

        const animSpeed = document.getElementById('setting-anim-speed');
        if (animSpeed) {
            animSpeed.addEventListener('input', () => {
                document.getElementById('anim-speed-value').textContent = animSpeed.value + '%';
                Settings.set('animSpeed', parseInt(animSpeed.value));
            });
        }

        (function(el) { if (el) el.addEventListener('click', function() {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            Settings.set('animations', true);
            Settings.set('animFade', true);
            Settings.set('animHover', true);
            Settings.set('animPage', true);
            Settings.set('animModal', true);
            Settings.set('particles', true);
            Settings.set('animReveal', true);
            Settings.set('animSpeed', 100);
            loadSettingsUI();
        }); })(document.getElementById('reset-anim-default'));

        // 性能
        bindToggle('setting-reduced-motion', 'reducedMotion');
        bindToggle('setting-no-blur', 'noBlur');
        bindToggle('setting-no-particles', 'noParticles');
        bindToggle('setting-low-res', 'lowRes');
        bindToggle('setting-no-webaudio', 'noWebAudio');

        (function(el) { if (el) el.addEventListener('click', function() {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            Settings.set('reducedMotion', false);
            Settings.set('noBlur', false);
            Settings.set('noParticles', false);
            Settings.set('lowRes', false);
            Settings.set('noWebAudio', false);
            loadSettingsUI();
        }); })(document.getElementById('reset-perf-default'));

        // 其他/游戏行为
        bindToggle('setting-first-safe', 'firstSafe');
        bindToggle('setting-chord', 'chord');
        bindToggle('setting-question', 'question');
        bindToggle('setting-3bv', 'show3BV');
        bindToggle('setting-no-guess', 'noGuess');
        bindToggle('setting-tooltips', 'tooltips');
        bindToggle('setting-confirm', 'confirmDestructive');
        bindToggle('setting-smooth-scroll', 'smoothScroll');

        // 样式操作
        (function(el) { if (el) el.addEventListener('click', function() {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            showHintOverlay('样式预设已保存！');
        }); })(document.getElementById('save-style-preset'));
        (function(el) { if (el) el.addEventListener('click', function() {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            Settings.reset();
            loadSettingsUI();
            showHintOverlay('样式已恢复默认');
        }); })(document.getElementById('reset-style-default'));

        // 恢复全部默认
        (function(el) { if (el) el.addEventListener('click', function() {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            if (confirm('确定要恢复全部默认设置吗？此操作不可恢复。')) {
                Settings.reset();
                loadSettingsUI();
                showHintOverlay('所有设置已恢复默认');
            }
        }); })(document.getElementById('reset-all-settings'));
    }

    function bindToggle(id, key) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                Settings.set(key, el.checked);
                if (key === 'sound' || key === 'music') {
                    if (typeof AudioManager !== "undefined") AudioManager.playClick();
                }
            });
        }
    }

    function bindSlider(id, key, valueId, suffix) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                const val = parseInt(el.value);
                const disp = document.getElementById(valueId);
                if (disp) disp.textContent = val + suffix;
                Settings.set(key, val);
            });
        }
    }

    function applyStylePreset(preset) {
        const presets = {
            default: { theme: 'classic', mode: 'dark', accent: 'ocean', font: '' },
            classic: { theme: 'classic', mode: 'light', accent: 'graphite', font: '' },
            minimal: { theme: 'dark', mode: 'dark', accent: 'graphite', font: 'monospace' }
        };
        const p = presets[preset];
        if (!p) return;
        Settings.set('theme', p.theme);
        Settings.set('colorMode', p.mode);
        Settings.set('accentColor', p.accent);
        Settings.set('fontFamily', p.font);
        applyColorMode(p.mode);
        applyAccentColor(p.accent);
        applyFont(p.font);
        loadSettingsUI();
    }

    function applyColorMode(mode) {
        if (mode === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'classic');
        } else if (mode === 'light') {
            document.documentElement.setAttribute('data-theme', 'classic');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }

    function applyAccentColor(color) {
        const colors = {
            ocean: '#3b82f6', emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
            wisteria: '#8b5cf6', graphite: '#64748b', crimson: '#dc2626',
            lake: '#06b6d4', gilded: '#d97706', sky: '#0ea5e9'
        };
        const c = colors[color] || colors.ocean;
        document.documentElement.style.setProperty('--primary', c);
        document.documentElement.style.setProperty('--primary-dark', c);
    }

    function applyFont(font) {
        if (font) {
            document.body.style.fontFamily = font + ", 'Noto Sans SC', sans-serif";
        } else {
            document.body.style.fontFamily = "'Noto Sans SC', sans-serif";
        }
    }

    function loadSettingsUI() {
        const s = Settings.all();

        // 旧版主题按钮兼容
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === s.theme);
        });

        // 样式预设
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.toggle('active', false);
        });

        // 模式
        const modeMap = { light: 'light', dark: 'dark', auto: 'auto' };
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === (s.colorMode || 'dark'));
        });

        // 对比度
        const contrastEl = document.getElementById('setting-contrast');
        if (contrastEl) {
            contrastEl.value = s.contrast || 100;
            const cv = document.getElementById('contrast-value');
            if (cv) cv.textContent = (s.contrast || 100) + '%';
        }

        // 配色
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === (s.accentColor || 'ocean'));
        });

        // 字体
        const fontEl = document.getElementById('setting-font');
        if (fontEl) fontEl.value = s.fontFamily || '';

        // 语言
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === (s.language || 'zh'));
        });

        // 音量
        const mv = document.getElementById('setting-master-volume');
        if (mv) {
            mv.value = s.masterVolume || 80;
            const mvv = document.getElementById('master-volume-value');
            if (mvv) mvv.textContent = (s.masterVolume || 80) + '%';
        }
        const volEl = document.getElementById('setting-volume');
        if (volEl) volEl.value = s.volume || 50;

        // 音效
        setToggle('setting-sound', s.sound);
        setToggle('setting-music', s.music);
        const sfxStyle = document.getElementById('setting-sfx-style');
        if (sfxStyle) sfxStyle.value = s.sfxStyle || 'classic';
        const sfxVol = document.getElementById('setting-sfx-volume');
        if (sfxVol) {
            sfxVol.value = s.sfxVolume || 70;
            const sv = document.getElementById('sfx-volume-value');
            if (sv) sv.textContent = (s.sfxVolume || 70) + '%';
        }
        const ms = document.getElementById('setting-music-style');
        if (ms) ms.value = s.musicStyle || 'orchestral';
        const muv = document.getElementById('setting-music-volume');
        if (muv) {
            muv.value = s.musicVolume || 30;
            const muvv = document.getElementById('music-volume-value');
            if (muvv) muvv.textContent = (s.musicVolume || 30) + '%';
        }
        const mt = document.getElementById('setting-music-tempo');
        if (mt) {
            mt.value = s.musicTempo || 100;
            const mtv = document.getElementById('music-tempo-value');
            if (mtv) mtv.textContent = (s.musicTempo || 100) + '%';
        }

        // 高级合成
        const aa = document.getElementById('setting-adsr-attack');
        if (aa) { aa.value = s.adsrAttack || 5; document.getElementById('adsr-attack-value').textContent = (s.adsrAttack || 5) + ' ms'; }
        const ad = document.getElementById('setting-adsr-decay');
        if (ad) { ad.value = s.adsrDecay || 50; document.getElementById('adsr-decay-value').textContent = (s.adsrDecay || 50) + ' ms'; }
        const ar = document.getElementById('setting-adsr-release');
        if (ar) { ar.value = s.adsrRelease || 30; document.getElementById('adsr-release-value').textContent = (s.adsrRelease || 30) + ' ms'; }
        const mr = document.getElementById('setting-music-reverb');
        if (mr) { mr.value = s.musicReverb || 20; document.getElementById('music-reverb-value').textContent = (s.musicReverb || 20) + '%'; }

        // 动画
        setToggle('setting-animations', s.animations);
        setToggle('setting-anim-fade', s.animFade !== false);
        setToggle('setting-anim-hover', s.animHover !== false);
        setToggle('setting-anim-page', s.animPage !== false);
        setToggle('setting-anim-modal', s.animModal !== false);
        setToggle('setting-particles', s.particles);
        setToggle('setting-anim-reveal', s.animReveal !== false);
        const asp = document.getElementById('setting-anim-speed');
        if (asp) {
            asp.value = s.animSpeed || 100;
            document.getElementById('anim-speed-value').textContent = (s.animSpeed || 100) + '%';
        }

        // 性能
        setToggle('setting-reduced-motion', s.reducedMotion);
        setToggle('setting-no-blur', s.noBlur);
        setToggle('setting-no-particles', s.noParticles);
        setToggle('setting-low-res', s.lowRes);
        setToggle('setting-no-webaudio', s.noWebAudio);

        // 其他/游戏
        setToggle('setting-first-safe', s.firstSafe);
        setToggle('setting-chord', s.chord);
        setToggle('setting-question', s.question);
        setToggle('setting-3bv', s.show3BV);
        setToggle('setting-no-guess', s.noGuess);
        setToggle('setting-tooltips', s.tooltips !== false);
        setToggle('setting-confirm', s.confirmDestructive !== false);
        setToggle('setting-smooth-scroll', s.smoothScroll !== false);
    }

    function setToggle(id, val) {
        const el = document.getElementById(id);
        if (el) el.checked = !!val;
    }
    function bindStatsEvents() {
        document.querySelectorAll('.stats-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                document.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.stats-panel').forEach(p => p.classList.remove('active'));
                document.getElementById('stats-' + tab.dataset.tab).classList.add('active');
            });
        });

        document.getElementById('reset-stats-btn').addEventListener('click', () => {
            if (typeof AudioManager !== "undefined") AudioManager.playClick();
            if (confirm('确定要重置所有统计数据吗？此操作不可恢复。')) {
                Stats.reset();
                renderStats();
            }
        });
    }

    function padStart(str, len, ch) {
        str = String(str);
        while (str.length < len) str = ch + str;
        return str;
    }

    function renderStats() {
        const s = Stats.getAll();
        var el;
        el = document.getElementById('stat-total-games'); if (el) el.textContent = s.totalGames;
        el = document.getElementById('stat-wins'); if (el) el.textContent = s.wins;
        el = document.getElementById('stat-win-rate'); if (el) el.textContent = Stats.getWinRate() + '%';
        el = document.getElementById('stat-current-streak'); if (el) el.textContent = s.currentStreak;
        el = document.getElementById('stat-best-streak'); if (el) el.textContent = s.bestStreak;
        el = document.getElementById('stat-total-time'); if (el) el.textContent = Math.floor(s.totalTime / 3600) + 'h';
        el = document.getElementById('stat-cells-revealed'); if (el) el.textContent = s.cellsRevealed.toLocaleString ? s.cellsRevealed.toLocaleString() : s.cellsRevealed;
        el = document.getElementById('stat-flags-placed'); if (el) el.textContent = s.flagsPlaced.toLocaleString ? s.flagsPlaced.toLocaleString() : s.flagsPlaced;

        // 按难度表格
        const tbody = document.getElementById('stats-diff-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        const diffNames = {
            beginner: '初级', intermediate: '中级', 
            expert: '高级', master: '大师', custom: '自定义', puzzle: '谜题'
        };
        Object.keys(s.byDifficulty).forEach(function(key) {
            var d = s.byDifficulty[key];
            const tr = document.createElement('tr');
            const avgTime = d.wins > 0 ? Math.round(d.totalTime / d.wins) + 's' : '--';
            tr.innerHTML = `
                <td>${diffNames[key] || key}</td>
                <td>${d.games}</td>
                <td>${d.wins}</td>
                <td>${d.games > 0 ? Math.round(d.wins/d.games*100) : 0}%</td>
                <td>${d.bestTime !== null ? d.bestTime + 's' : '--'}</td>
                <td>${avgTime}</td>
            `;
            tbody.appendChild(tr);
        });

        // 胜率趋势图
        renderWinTrend(s.history);
        // 难度分布图
        renderDiffPie(s.byDifficulty);
    }

    function renderWinTrend(history) {
        const container = document.getElementById('win-trend-graph');
        if (!container) return;
        container.innerHTML = '';
        const recent = history.slice(-10);
        if (recent.length === 0) {
            container.innerHTML = '<div class="text-center" style="color:var(--text-muted)">暂无数据</div>';
            return;
        }

        var maxTime = 1;
        for (var i = 0; i < recent.length; i++) {
            if (recent[i].time > maxTime) maxTime = recent[i].time;
        }
        recent.forEach(function(h, i) {
            const bar = document.createElement('div');
            bar.className = 'graph-bar';
            bar.style.height = (h.time / maxTime * 100) + '%';
            bar.style.background = h.won ? 'var(--secondary)' : 'var(--danger)';
            bar.dataset.label = '#' + (i + 1);
            container.appendChild(bar);
        });
    }

    function renderDiffPie(byDifficulty) {
        const container = document.getElementById('diff-pie-graph');
        if (!container) return;
        container.innerHTML = '';
        var total = 0;
        var keys = Object.keys(byDifficulty);
        for (var i = 0; i < keys.length; i++) {
            total += byDifficulty[keys[i]].games;
        }
        if (total === 0) {
            container.innerHTML = '<div class="text-center" style="color:var(--text-muted)">暂无数据</div>';
            return;
        }

        const colors = ['#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#f59e0b'];
        let currentAngle = 0;
        const diffNames = {
            beginner: '初级', intermediate: '中级', 
            expert: '高级', master: '大师', custom: '自定义', puzzle: '谜题'
        };

        const pie = document.createElement('div');
        pie.className = 'pie-chart';
        
        const legend = document.createElement('div');
        legend.style.marginTop = '1rem';
        legend.style.display = 'flex';
        legend.style.flexWrap = 'wrap';
        legend.style.gap = '0.5rem';
        legend.style.justifyContent = 'center';

        Object.keys(byDifficulty).forEach(function(key, i) {
            var d = byDifficulty[key];
            if (d.games === 0) return;
            var pct = (d.games / total * 100).toFixed(1);
            
            const item = document.createElement('span');
            item.style.fontSize = '0.8rem';
            item.style.color = 'var(--text-muted)';
            item.innerHTML = '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + colors[i] + ';margin-right:4px;"></span>' + (diffNames[key] || key) + ' ' + pct + '%';
            legend.appendChild(item);
        });

        // 简化饼图：用 conic-gradient
        var gradients = [];
        Object.keys(byDifficulty).forEach(function(key, i) {
            var d = byDifficulty[key];
            if (d.games === 0) return;
            var pct = d.games / total;
            var start = currentAngle;
            var end = currentAngle + pct * 360;
            gradients.push(colors[i] + ' ' + start + 'deg ' + end + 'deg');
            currentAngle = end;
        });
        pie.style.background = 'conic-gradient(' + gradients.join(', ') + ')';
        
        container.appendChild(pie);
        container.appendChild(legend);
    }

    function renderLeaderboard(difficulty) {
        const tbody = document.getElementById('leaderboard-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        const list = Stats.Leaderboard.get(difficulty);
        
        if (list.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="5" style="color:var(--text-muted)">暂无记录</td>';
            tbody.appendChild(tr);
            return;
        }

        list.forEach(function(entry, i) {
            const tr = document.createElement('tr');
            var date = '';
            try {
                date = new Date(entry.date).toLocaleDateString('zh-CN');
            } catch (e) { date = entry.date || ''; }
            tr.innerHTML = '<td>' + (i + 1) + '</td><td>' + entry.player + '</td><td>' + entry.time + 's</td><td>' + date + '</td><td>' + entry.efficiency + '%</td>';
            tbody.appendChild(tr);
        });
    }

    function bindLeaderboardEvents() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderLeaderboard(btn.dataset.filter);
            });
        });
    }

    function bindChallengeEvents() {
        document.querySelectorAll('.challenge-play').forEach(btn => {
            btn.addEventListener('click', () => {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                const item = btn.closest('.challenge-item');
                const challenge = item.dataset.challenge;
                
                let diff = 'intermediate';
                if (challenge === 'time-attack') diff = 'expert';
                if (challenge === 'blind') diff = 'beginner';
                if (challenge === 'fog') diff = 'intermediate';
                if (challenge === 'survival') diff = 'intermediate';
                if (challenge === 'symmetry') diff = 'intermediate';
                if (challenge === 'zen') diff = 'intermediate';
                if (challenge === 'giant') diff = 'giant';
                if (challenge === 'combo-rush') diff = 'intermediate';
                if (challenge === 'no-undo') diff = 'intermediate';
                
                Game.start(diff, null, challenge);
                showScreen('game-screen');
                var infoMap = {
                    'speedrun': { name: '竞速挑战', desc: '尽可能快地完成中级难度，连胜会被记录！' },
                    'no-flag': { name: '无标记挑战', desc: '全程不能使用旗帜，考验你的记忆力！' },
                    'blind': { name: '盲扫挑战', desc: '仅前5次揭示可见数字，之后全凭记忆！' },
                    'time-attack': { name: '限时挑战', desc: '60秒内完成高级难度，与时间赛跑！' },
                    'fog': { name: '迷雾挑战', desc: '视野受限，只有已揭示区域周围可见！' },
                    'survival': { name: '生存挑战', desc: '连续解关，3条命，难度逐关递增！' },
                    'symmetry': { name: '对称挑战', desc: '雷区呈中心对称分布，发现规律快速通关！' },
                    'zen': { name: '禅意挑战', desc: '无计时压力，纯粹享受解谜的乐趣！' },
                    'giant': { name: '巨型挑战', desc: '50×30 超大棋盘，350颗地雷的极限考验！' },
                    'combo-rush': { name: '连击大师', desc: '2分钟限时，追求最高连击数！' },
                    'no-undo': { name: '无撤销挑战', desc: '一旦点击就无法回头，考验你的每一步！' }
                };
                var info = infoMap[challenge];
                if (info) showModeInfo(info);
            });
        });

        // 更新挑战统计
        const stats = Stats.getAll();
        const c = stats.challenges;
        const elMap = {
            'challenge-speedrun-best': (c.speedrun && c.speedrun.best) || 0,
            'challenge-no-flag-best': (c.noFlag && c.noFlag.best) || 0,
            'challenge-blind-best': (c.blind && c.blind.best) || 0,
            'challenge-time-attack-best': (c.timeAttack && c.timeAttack.best) || 0,
            'challenge-fog-best': (c.fog && c.fog.best) || 0,
            'challenge-survival-best': (c.survival && c.survival.best) || 0,
            'challenge-symmetry-best': (c.symmetry && c.symmetry.best) || 0,
            'challenge-zen-best': (c.zen && c.zen.best) || 0,
            'challenge-giant-best': (c.giant && c.giant.best) || 0,
            'challenge-combo-rush-best': (c.comboRush && c.comboRush.best) || 0,
            'challenge-no-undo-best': (c.noUndo && c.noUndo.best) || 0,
        };
        Object.keys(elMap).forEach(function(id) {
            var val = elMap[id];
            var el = document.getElementById(id);
            if (el) el.textContent = val;
        });
    }

    function showHint() {
        const move = Game.hint();
        if (!move) {
            showHintOverlay('暂时没有找到明显安全的格子，试试其他位置！');
            return;
        }

        // 显示提示信息
        let msg = move.reason || '提示';
        if (move.probability !== undefined && move.probability > 0) {
            msg += ` (有雷概率: ${move.probability}%)`;
        }
        if (move.type === 'mine') {
            showHintOverlay(msg);
        }

        // 高亮提示的格子
        if (hintCell) {
            hintCell.classList.remove('hint');
        }
        const el = cellElements[move.y] && cellElements[move.y][move.x];
        if (el) {
            el.classList.add('hint');
            hintCell = el;
            setTimeout(() => {
                el.classList.remove('hint');
                if (hintCell === el) hintCell = null;
            }, 2000);
        }
    }

    function showHintOverlay(text) {
        document.getElementById('hint-text').textContent = text;
        document.getElementById('hint-overlay').classList.remove('hidden');
    }

    function updateContinueButton() {
        const btn = document.getElementById('continue-btn');
        if (btn) {
            btn.disabled = !Game.hasSaved();
        }
    }

    function startDailyChallenge() {
        if (typeof AudioManager !== "undefined") AudioManager.playClick();
        var today = new Date();
        var dateStr = today.getFullYear() + '' + (today.getMonth() + 1) + '' + today.getDate();
        var seed = 0;
        for (var i = 0; i < dateStr.length; i++) {
            seed = (seed * 31 + dateStr.charCodeAt(i)) % 1000000000;
        }
        Game.start('intermediate', null, 'daily', seed);
        showScreen('game-screen');
        var lastDaily = Storage.get('last_daily');
        if (lastDaily === dateStr) {
            var dailyBest = Storage.get('daily_best');
            if (dailyBest) {
                setTimeout(function() {
                    showHintOverlay('今日最佳时间: ' + dailyBest + '秒');
                }, 500);
            }
        }
    }

    function startWeeklyChallenge() {
        if (typeof AudioManager !== "undefined") AudioManager.playClick();
        var now = new Date();
        var weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        var dateStr = weekStart.getFullYear() + '' + (weekStart.getMonth() + 1) + '' + weekStart.getDate();
        var seed = 0;
        for (var i = 0; i < dateStr.length; i++) {
            seed = (seed * 31 + dateStr.charCodeAt(i)) % 1000000000;
        }
        Game.start('expert', null, 'weekly', seed);
        showScreen('game-screen');
        var lastWeekly = Storage.get('last_weekly');
        if (lastWeekly === dateStr) {
            var weeklyBest = Storage.get('weekly_best');
            if (weeklyBest) {
                setTimeout(function() {
                    showHintOverlay('本周最佳时间: ' + weeklyBest + '秒');
                }, 500);
            }
        }
    }

    function bindAchievementsEvents() {
        document.querySelectorAll('.ach-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                document.querySelectorAll('.ach-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderAchievements(btn.dataset.achFilter);
            });
        });
    }

    function renderAchievements(filter) {
        const grid = document.getElementById('achievements-grid');
        if (!grid) return;

        const all = Achievements.getAll();
        const filtered = filter === 'all' ? all : all.filter(a => a.category === filter);

        grid.innerHTML = '';
        filtered.forEach(ach => {
            const card = document.createElement('div');
            card.className = 'achievement-card' + (ach.unlocked ? ' unlocked' : '');
            card.innerHTML = `
                <div class="ach-card-icon">${ach.icon}</div>
                <div class="ach-card-info">
                    <div class="ach-card-name">${ach.name}</div>
                    <div class="ach-card-desc">${ach.desc}</div>
                    <div class="ach-card-category">${ach.category}</div>
                </div>
            `;
            grid.appendChild(card);
        });

        const progress = Achievements.getProgress();
        document.getElementById('ach-unlocked-count').textContent = progress.unlocked;
        document.getElementById('ach-total-count').textContent = progress.total;
        document.getElementById('ach-progress-fill').style.width = (progress.unlocked / progress.total * 100) + '%';
    }

    function updateAchievementBadge() {
        const badge = document.getElementById('achievement-badge');
        if (!badge) return;
        // 如果还有未解锁的成就，显示红点
        if (typeof Achievements !== 'undefined' && Achievements.getProgress) {
            const progress = Achievements.getProgress();
            badge.classList.toggle('hidden', progress.unlocked >= progress.total);
        }
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    }

    // 游戏结束事件
    document.addEventListener('achievementCheck', () => {
        updateAchievementBadge();
    });

    document.addEventListener('gameOver', (e) => {
        const d = e.detail;
        document.getElementById('gameover-icon').textContent = d.won ? '😎' : '😵';
        document.getElementById('gameover-title').textContent = d.won ? '胜利！' : '游戏结束';
        document.getElementById('go-time').textContent = d.time + 's';
        document.getElementById('go-3bv').textContent = d.bv;
        document.getElementById('go-eff').textContent = d.efficiency + '%';

        const recordEl = document.getElementById('new-record');
        if (recordEl) recordEl.classList.toggle('hidden', !d.isNewRecord);

        // 影子竞速结果由 shadowRaceEnd 事件单独渲染
        document.getElementById('gameover-overlay').classList.remove('hidden');
        updateAchievementBadge();
    });

    // 战役完成事件
    document.addEventListener('campaignComplete', function(e) {
        var d = e.detail;
        showHintOverlay('关卡完成！获得 ' + d.stars + ' 颗星⭐');
    });

    // 生存进阶事件
    document.addEventListener('survivalAdvance', function(e) {
        var d = e.detail;
        showHintOverlay('进入第 ' + (d.level + 1) + ' 关！生命: ' + '❤️'.repeat(d.lives));
    });

    // 无尽进阶事件
    document.addEventListener('endlessAdvance', function(e) {
        var d = e.detail;
        showHintOverlay('🎉 进入第 ' + d.level + ' 层！HP: ' + d.hp + '/' + d.maxHp);
    });

    // 扣命事件
    document.addEventListener('lifeLost', function(e) {
        var d = e.detail;
        showHintOverlay('💔 失去一条命！剩余: ' + '❤️'.repeat(d.lives));
    });

    // 时间冻结事件
    document.addEventListener('freezeTime', function(e) {
        showHintOverlay('⏱️ 时间冻结 10 秒！');
    });

    function updateHeatmapOverlay(board) {
        if (!board || !cellElements.length) return;
        var probs = Powerups.getHeatmapData(board);
        if (!probs) return;
        for (var y = 0; y < board.height; y++) {
            for (var x = 0; x < board.width; x++) {
                var el = cellElements[y] && cellElements[y][x];
                if (!el) continue;
                var cell = board.cells[y][x];
                if (cell.isRevealed || cell.isFlagged) continue;
                var key = x + ',' + y;
                var p = probs.get ? probs.get(key) : probs[key];
                if (p !== undefined) {
                    el.classList.remove('heat-low', 'heat-mid', 'heat-high');
                    if (p >= 70) el.classList.add('heat-high');
                    else if (p >= 30) el.classList.add('heat-mid');
                    else el.classList.add('heat-low');
                }
            }
        }
    }

    function clearHeatmapOverlay() {
        if (!cellElements.length) return;
        for (var y = 0; y < cellElements.length; y++) {
            for (var x = 0; x < cellElements[y].length; x++) {
                var el = cellElements[y][x];
                if (el) el.classList.remove('heat-low', 'heat-mid', 'heat-high');
            }
        }
    }

    // 道具使用事件
    document.addEventListener('powerupUsed', function(e) {
        var d = e.detail;
        updatePowerupHUD();
    });

    function renderCampaign() {
        var container = document.getElementById('campaign-map');
        if (!container) return;
        container.innerHTML = '';

        var stats = Campaign.getStats();
        var el = document.getElementById('campaign-stars');
        if (el) el.textContent = stats.totalStars + '/' + stats.maxStars;

        Campaign.levels.forEach(function(level) {
            var progress = Campaign.getProgress(level.id);
            var node = document.createElement('div');
            node.className = 'campaign-node';
            if (!progress.unlocked) node.classList.add('locked');
            if (progress.completed) node.classList.add('completed');

            var starsHtml = '';
            for (var i = 0; i < 3; i++) {
                starsHtml += i < progress.stars ? '⭐' : '☆';
            }

            node.innerHTML = `
                <div class="campaign-node-num">${level.id}</div>
                <div class="campaign-node-name">${level.name}</div>
                <div class="campaign-node-stars">${starsHtml}</div>
            `;

            if (progress.unlocked) {
                node.addEventListener('click', function() {
                    if (typeof AudioManager !== "undefined") AudioManager.playClick();
                    Game.startCampaignLevel(level.id);
                    showScreen('game-screen');
                    showModeInfo(level);
                });
            }

            container.appendChild(node);
        });
    }

    function bindCampaignEvents() {
        var resetBtn = document.getElementById('reset-campaign-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function() {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                if (confirm('确定要重置战役进度吗？所有关卡将重新锁定。')) {
                    Campaign.resetProgress();
                    renderCampaign();
                }
            });
        }
    }

    function showModeInfo(level) {
        var overlay = document.getElementById('mode-info-overlay');
        var title = document.getElementById('mode-info-title');
        var desc = document.getElementById('mode-info-desc');
        if (!overlay || !title || !desc) return;
        title.textContent = level.name;
        desc.textContent = level.desc || '';
        overlay.classList.remove('hidden');
    }

    function updatePowerupHUD() {
        if (typeof Powerups === 'undefined') return;
        var p = Powerups.getAll();
        var bar = document.getElementById('powerup-bar');
        if (!bar) return;
        var keys = ['scanner', 'shield', 'freeze', 'heatmap'];
        keys.forEach(function(key, i) {
            var slot = document.getElementById('powerup-slot-' + (i + 1));
            if (!slot) return;
            var count = Powerups.getCount(key);
            var info = Powerups.POWERUPS[key];
            slot.innerHTML = `
                <span class="powerup-icon">${info.icon}</span>
                <span class="powerup-count">${count}</span>
                <span class="powerup-key">${info.key}</span>
            `;
            slot.classList.toggle('empty', count <= 0);
        });
    }

    function updateSurvivalHUD(detail) {
        var livesEl = document.getElementById('survival-lives');
        var comboEl = document.getElementById('survival-combo');
        var scoreEl = document.getElementById('survival-score');
        var levelEl = document.getElementById('survival-level');
        var hud = document.getElementById('survival-hud');

        var isSurvival = detail.challengeMode === 'survival';
        if (hud) hud.style.display = isSurvival ? 'flex' : 'none';

        if (livesEl) {
            var l = Math.max(0, Math.min(detail.lives || 0, detail.maxLives || 3));
            var d = Math.max(0, (detail.maxLives || 3) - l);
            livesEl.textContent = '❤️'.repeat(l) + '🖤'.repeat(d);
        }
        if (comboEl) {
            comboEl.textContent = 'Combo: ' + (detail.combo || 0);
            comboEl.style.display = (detail.combo > 0 && isSurvival) ? 'inline' : 'none';
        }
        if (scoreEl) {
            scoreEl.textContent = 'Score: ' + (detail.survivalScore || 0);
        }
        if (levelEl) {
            levelEl.textContent = 'Lv.' + ((detail.survivalLevel || 0) + 1);
        }
    }

    function updateEndlessHUD(detail) {
        var hud = document.getElementById('endless-hud');
        var isEndless = detail.challengeMode === 'endless';
        if (hud) hud.style.display = isEndless ? 'flex' : 'none';

        if (!isEndless || !detail.endlessState) return;

        var state = detail.endlessState;
        var levelEl = document.getElementById('endless-level');
        var hpEl = document.getElementById('endless-hp');
        var hpBarEl = document.getElementById('endless-hp-bar');
        var scoreEl = document.getElementById('endless-score');

        if (levelEl) levelEl.textContent = 'Lv.' + state.level;
        if (hpEl) hpEl.textContent = 'HP: ' + state.hp + '/' + state.maxHp;
        if (hpBarEl) {
            var pct = state.maxHp > 0 ? (state.hp / state.maxHp * 100) : 0;
            hpBarEl.style.width = pct + '%';
            hpBarEl.className = 'hp-bar-fill' + (state.hp <= 3 ? ' hp-low' : state.hp <= state.maxHp * 0.5 ? ' hp-mid' : ' hp-high');
        }
        if (scoreEl) scoreEl.textContent = 'Score: ' + state.score;
    }

    function updateFogOverlay(board) {
        if (!board || !cellElements.length) return;
        var isFog = Game.getState().challengeMode === 'fog';
        for (var y = 0; y < board.height; y++) {
            for (var x = 0; x < board.width; x++) {
                var el = cellElements[y] && cellElements[y][x];
                if (!el) continue;
                var cell = board.cells[y][x];
                if (isFog && !cell.isRevealed) {
                    // 检查是否有已揭示的邻居
                    var hasRevealedNeighbor = false;
                    board.forEachNeighbor(x, y, function(nx, ny) {
                        if (board.cells[ny] && board.cells[ny][nx] && board.cells[ny][nx].isRevealed) {
                            hasRevealedNeighbor = true;
                        }
                    });
                    el.classList.toggle('fog', !hasRevealedNeighbor);
                } else {
                    el.classList.remove('fog');
                }
            }
        }
    }

    // ==================== 谜题工坊 ====================

    var puzzleEditorElements = [];

    function initPuzzleEditor() {
        if (typeof Puzzle === 'undefined') return;
        Puzzle.initEditor(9, 9);
        document.getElementById('puzzle-width').value = 9;
        document.getElementById('puzzle-height').value = 9;
        document.getElementById('puzzle-share-code').value = '';
        document.getElementById('puzzle-play-btn').disabled = true;
        document.getElementById('puzzle-valid-status').textContent = '';
        renderPuzzleEditor();
        loadSavedPuzzles();
    }

    function renderPuzzleEditor() {
        if (typeof Puzzle === 'undefined') return;
        var container = document.getElementById('puzzle-editor-board');
        if (!container) return;
        var state = Puzzle.getEditorState();
        var w = state.width;
        var h = state.height;
        container.innerHTML = '';
        container.style.gridTemplateColumns = 'repeat(' + w + ', 28px)';
        puzzleEditorElements = [];

        for (var y = 0; y < h; y++) {
            var row = [];
            for (var x = 0; x < w; x++) {
                var cell = document.createElement('div');
                cell.className = 'puzzle-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                updatePuzzleCell(cell, x, y);
                cell.addEventListener('mousedown', handlePuzzleCellMouseDown);
                cell.addEventListener('touchstart', handlePuzzleCellTouchStart, { passive: false });
                cell.addEventListener('touchend', handlePuzzleCellTouchEnd, { passive: false });
                cell.addEventListener('touchcancel', handlePuzzleCellTouchCancel, { passive: false });
                cell.addEventListener('contextmenu', function(e) { e.preventDefault(); });
                container.appendChild(cell);
                row.push(cell);
            }
            puzzleEditorElements.push(row);
        }
        document.getElementById('puzzle-mine-count').textContent = '地雷: ' + state.mineCount;
    }

    function updatePuzzleCell(el, x, y) {
        if (!el) return;
        var hasMine = Puzzle.hasMine(x, y);
        var num = hasMine ? -1 : Puzzle.getCellNumber(x, y);
        el.textContent = '';
        el.className = 'puzzle-cell';
        el.style.color = '';
        if (hasMine) {
            el.classList.add('mine');
            el.textContent = '💣';
        } else if (num > 0) {
            el.classList.add('number');
            el.classList.add('puzzle-num-' + num);
            el.textContent = num;
        }
    }

    function handlePuzzleCellMouseDown(e) {
        e.preventDefault();
        if (typeof Puzzle === 'undefined') return;
        var x = parseInt(e.target.dataset.x);
        var y = parseInt(e.target.dataset.y);
        if (isNaN(x) || isNaN(y)) return;
        if (typeof AudioManager !== "undefined") AudioManager.playClick();
        if (e.button === 0) {
            Puzzle.toggleMine(x, y);
        } else if (e.button === 2) {
            Puzzle.toggleRevealed(x, y);
        }
        updatePuzzleCell(e.target, x, y);
        // 更新相邻格子的数字显示
        var state = Puzzle.getEditorState();
        for (var dy = -1; dy <= 1; dy++) {
            for (var dx = -1; dx <= 1; dx++) {
                var nx = x + dx;
                var ny = y + dy;
                if (nx < 0 || nx >= state.width || ny < 0 || ny >= state.height) continue;
                if (puzzleEditorElements[ny] && puzzleEditorElements[ny][nx]) {
                    updatePuzzleCell(puzzleEditorElements[ny][nx], nx, ny);
                }
            }
        }
        document.getElementById('puzzle-mine-count').textContent = '地雷: ' + state.mineCount;
        document.getElementById('puzzle-valid-status').textContent = '';
        document.getElementById('puzzle-play-btn').disabled = true;
    }

    var puzzleLongPressTimer = null;
    var puzzleTouchStartX = -1;
    var puzzleTouchStartY = -1;

    function handlePuzzleCellTouchStart(e) {
        e.preventDefault();
        if (typeof Puzzle === 'undefined') return;
        var touch = e.changedTouches[0];
        var target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!target || !target.classList.contains('puzzle-cell')) return;
        var x = parseInt(target.dataset.x);
        var y = parseInt(target.dataset.y);
        if (isNaN(x) || isNaN(y)) return;
        puzzleTouchStartX = x;
        puzzleTouchStartY = y;
        puzzleLongPressTimer = setTimeout(function() {
            Puzzle.toggleRevealed(x, y);
            updatePuzzleCell(target, x, y);
            puzzleLongPressTimer = null;
        }, 500);
    }

    function handlePuzzleCellTouchEnd(e) {
        e.preventDefault();
        if (puzzleLongPressTimer) {
            clearTimeout(puzzleLongPressTimer);
            puzzleLongPressTimer = null;
            var touch = e.changedTouches[0];
            var target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (!target || !target.classList.contains('puzzle-cell')) return;
            var x = parseInt(target.dataset.x);
            var y = parseInt(target.dataset.y);
            if (isNaN(x) || isNaN(y)) return;
            if (x === puzzleTouchStartX && y === puzzleTouchStartY) {
                Puzzle.toggleMine(x, y);
                updatePuzzleCell(target, x, y);
                var state = Puzzle.getEditorState();
                for (var dy = -1; dy <= 1; dy++) {
                    for (var dx = -1; dx <= 1; dx++) {
                        var nx = x + dx;
                        var ny = y + dy;
                        if (nx < 0 || nx >= state.width || ny < 0 || ny >= state.height) continue;
                        if (puzzleEditorElements[ny] && puzzleEditorElements[ny][nx]) {
                            updatePuzzleCell(puzzleEditorElements[ny][nx], nx, ny);
                        }
                    }
                }
                document.getElementById('puzzle-mine-count').textContent = '地雷: ' + state.mineCount;
                document.getElementById('puzzle-valid-status').textContent = '';
                document.getElementById('puzzle-play-btn').disabled = true;
            }
        }
    }

    function handlePuzzleCellTouchCancel(e) {
        if (puzzleLongPressTimer) {
            clearTimeout(puzzleLongPressTimer);
            puzzleLongPressTimer = null;
        }
    }

    function bindPuzzleEvents() {
        var resizeBtn = document.getElementById('puzzle-resize-btn');
        if (resizeBtn) {
            resizeBtn.addEventListener('click', function() {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                var w = parseInt(document.getElementById('puzzle-width').value) || 9;
                var h = parseInt(document.getElementById('puzzle-height').value) || 9;
                Puzzle.setEditorSize(w, h);
                renderPuzzleEditor();
            });
        }

        var clearBtn = document.getElementById('puzzle-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                Puzzle.clearAll();
                renderPuzzleEditor();
            });
        }

        var randomBtn = document.getElementById('puzzle-random-btn');
        if (randomBtn) {
            randomBtn.addEventListener('click', function() {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                var w = parseInt(document.getElementById('puzzle-width').value) || 9;
                var h = parseInt(document.getElementById('puzzle-height').value) || 9;
                Puzzle.randomPuzzle(w, h, 0.15);
                renderPuzzleEditor();
            });
        }

        var testBtn = document.getElementById('puzzle-test-btn');
        if (testBtn) {
            testBtn.addEventListener('click', function() {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                var result = Puzzle.validatePuzzle();
                var statusEl = document.getElementById('puzzle-valid-status');
                if (result.valid) {
                    statusEl.textContent = '✅ ' + result.reason;
                    statusEl.style.color = '#22c55e';
                    document.getElementById('puzzle-play-btn').disabled = false;
                    if (typeof AudioManager !== "undefined") AudioManager.playWin();
                } else {
                    statusEl.textContent = '⚠️ ' + result.reason;
                    statusEl.style.color = '#ef4444';
                    document.getElementById('puzzle-play-btn').disabled = true;
                    if (typeof AudioManager !== "undefined") AudioManager.playLose();
                }
            });
        }

        var shareBtn = document.getElementById('puzzle-share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', function() {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                var code = Puzzle.encodePuzzle();
                var input = document.getElementById('puzzle-share-code');
                input.value = code;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(code).then(function() {
                        showHintOverlay('分享码已复制到剪贴板！');
                        if (typeof AudioManager !== "undefined") AudioManager.playPowerUp();
                    }).catch(function() {
                        showHintOverlay(code);
                    });
                } else {
                    showHintOverlay(code);
                }
            });
        }

        var playBtn = document.getElementById('puzzle-play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', function() {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                var result = Puzzle.validatePuzzle();
                if (!result.valid) {
                    showHintOverlay('谜题无效，请先通过测试');
                    return;
                }
                var board = Puzzle.createPlayableBoard();
                Game.startPuzzle(board, { code: Puzzle.encodePuzzle() });
                showScreen('game-screen');
            });
        }

        var loadBtn = document.getElementById('puzzle-load-btn');
        if (loadBtn) {
            loadBtn.addEventListener('click', function() {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                var code = document.getElementById('puzzle-input-code').value.trim();
                var data = Puzzle.decodePuzzle(code);
                if (!data) {
                    showHintOverlay('无效的分享码！');
                    return;
                }
                Puzzle.loadFromData(data);
                // 保存到收藏
                savePuzzleToCollection(code);
                var board = Puzzle.createPlayableBoard();
                Game.startPuzzle(board, { code: code });
                showScreen('game-screen');
            });
        }
    }

    function savePuzzleToCollection(code) {
        var list = Storage.get('puzzle_collection') || [];
        // 去重，放到最前面
        list = list.filter(function(c) { return c !== code; });
        list.unshift(code);
        if (list.length > 20) list = list.slice(0, 20);
        Storage.set('puzzle_collection', list);
        loadSavedPuzzles();
    }

    function loadSavedPuzzles() {
        var list = Storage.get('puzzle_collection') || [];
        var container = document.getElementById('puzzle-saved-list');
        if (!container) return;
        if (list.length === 0) {
            container.innerHTML = '<p class="puzzle-empty">暂无收藏的谜题</p>';
            return;
        }
        container.innerHTML = '';
        list.forEach(function(code, idx) {
            var data = Puzzle.decodePuzzle(code);
            var info = data ? (data.width + '×' + data.height + ' · ' + data.mines.length + '雷') : '无效谜题';
            var item = document.createElement('div');
            item.className = 'puzzle-saved-item';
            item.innerHTML = '<span class="puzzle-saved-info">' + info + '</span>' +
                '<button class="puzzle-saved-play" data-code="' + code + '">▶️</button>' +
                '<button class="puzzle-saved-delete" data-idx="' + idx + '">🗑️</button>';
            container.appendChild(item);
        });
        // 绑定事件
        container.querySelectorAll('.puzzle-saved-play').forEach(function(btn) {
            btn.addEventListener('click', function() {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                var c = btn.dataset.code;
                var d = Puzzle.decodePuzzle(c);
                if (d) {
                    Puzzle.loadFromData(d);
                    Game.startPuzzle(Puzzle.createPlayableBoard());
                    showScreen('game-screen');
                }
            });
        });
        container.querySelectorAll('.puzzle-saved-delete').forEach(function(btn) {
            btn.addEventListener('click', function() {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                var i = parseInt(btn.dataset.idx);
                var arr = Storage.get('puzzle_collection') || [];
                arr.splice(i, 1);
                Storage.set('puzzle_collection', arr);
                loadSavedPuzzles();
            });
        });
    }

    // ==================== 每日任务 ====================

    function updateQuestBadge() {
        var badge = document.getElementById('quest-badge');
        if (!badge) return;
        if (typeof DailyQuests !== 'undefined') {
            var prog = DailyQuests.getProgress();
            badge.classList.toggle('hidden', !prog.hasUnclaimed && prog.done < prog.total);
        }
    }

    function renderDailyQuests() {
        if (typeof DailyQuests === 'undefined') return;
        var tasks = DailyQuests.getTasks();
        var streak = DailyQuests.getStreak();
        var container = document.getElementById('quests-list');
        var progressEl = document.getElementById('quests-progress-fill');
        var streakEl = document.getElementById('quest-streak');
        var rewardsSection = document.getElementById('quests-rewards');
        if (!container) return;

        streakEl.textContent = streak;
        var total = tasks.length;
        var done = tasks.filter(function(t) { return t.completed; }).length;
        progressEl.style.width = total > 0 ? ((done / total) * 100) + '%' : '0%';

        container.innerHTML = '';
        tasks.forEach(function(task, idx) {
            var card = document.createElement('div');
            card.className = 'quest-card' + (task.completed ? ' completed' : '');
            var pct = task.target > 0 ? Math.min(100, Math.floor((task.progress / task.target) * 100)) : 0;
            card.innerHTML =
                '<div class="quest-header">' +
                    '<span class="quest-name">' + task.name + '</span>' +
                    '<span class="quest-status">' + (task.completed ? '✅ 完成' : task.progress + '/' + task.target) + '</span>' +
                '</div>' +
                '<div class="quest-desc">' + task.desc + '</div>' +
                '<div class="quest-bar"><div class="quest-bar-fill" style="width:' + pct + '%"></div></div>';
            container.appendChild(card);
        });

        var allDone = done >= total && total > 0;
        rewardsSection.style.display = allDone ? 'block' : 'none';
        if (allDone) {
            renderQuestRewards();
        }
    }

    function renderQuestRewards() {
        var list = document.getElementById('quests-reward-list');
        var btn = document.getElementById('quests-claim-btn');
        if (!list || !btn) return;
        var rewards = DailyQuests.getAllRewards();
        if (rewards.length === 0 || rewards.every(function(r) {
            return Object.keys(r).length === 0;
        })) {
            list.innerHTML = '<p>今日奖励已领取</p>';
            btn.disabled = true;
            btn.textContent = '已领取';
            return;
        }
        var html = '';
        rewards.forEach(function(r, i) {
            html += '<div class="quest-reward-item">任务 ' + (i + 1) + '：';
            var parts = [];
            if (r.scanner) parts.push('🔍 ×' + r.scanner);
            if (r.shield) parts.push('🛡️ ×' + r.shield);
            if (r.freeze) parts.push('⏱️ ×' + r.freeze);
            if (r.heatmap) parts.push('💡 ×' + r.heatmap);
            html += (parts.length > 0 ? parts.join(' ') : '无') + '</div>';
        });
        list.innerHTML = html;
        btn.disabled = false;
        btn.textContent = '领取奖励';
    }

    document.addEventListener('questComplete', function(e) {
        var task = e.detail.task;
        showHintOverlay('📋 任务完成：' + task.name);
        updateQuestBadge();
        if (typeof DailyQuests !== 'undefined') {
            var prog = DailyQuests.getProgress();
            if (prog.hasUnclaimed) {
                renderDailyQuests();
            }
        }
    });

    document.addEventListener('allQuestsComplete', function(e) {
        showHintOverlay('🔥 今日任务全部完成！连续 ' + e.detail.streak + ' 天！');
        updateQuestBadge();
        renderDailyQuests();
    });

    function bindQuestEvents() {
        var claimBtn = document.getElementById('quests-claim-btn');
        if (claimBtn) {
            claimBtn.addEventListener('click', function() {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                var rewards = DailyQuests.getAllRewards();
                if (typeof Powerups !== 'undefined') {
                    rewards.forEach(function(r) {
                        if (r.scanner) Powerups.addScanner(r.scanner);
                        if (r.shield) Powerups.addShield(r.shield);
                        if (r.freeze) Powerups.addFreeze(r.freeze);
                        if (r.heatmap) Powerups.addHeatmap(r.heatmap);
                    });
                }
                if (typeof AudioManager !== "undefined") AudioManager.playWin();
                showHintOverlay('🎁 奖励已领取！');
                renderQuestRewards();
                updateQuestBadge();
            });
        }
    }

    // ==================== 作战日志 ====================

    function resetBattleLogTabs() {
        var screen = document.getElementById('battle-log-screen');
        if (!screen) return;
        screen.querySelectorAll('.bl-tab').forEach(function(b) { b.classList.remove('active'); });
        var firstTab = screen.querySelector('.bl-tab');
        if (firstTab) firstTab.classList.add('active');
        screen.querySelectorAll('.bl-panel').forEach(function(p) { p.classList.remove('active'); });
        var firstPanel = screen.querySelector('.bl-panel');
        if (firstPanel) firstPanel.classList.add('active');
    }

    function bindBattleLogEvents() {
        if (typeof BattleLog === 'undefined') return;
        var screen = document.getElementById('battle-log-screen');
        if (!screen) return;
        var tabBtns = screen.querySelectorAll('.bl-tab');
        tabBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                var target = btn.dataset.blTab;
                tabBtns.forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                screen.querySelectorAll('.bl-panel').forEach(function(p) { p.classList.remove('active'); });
                var panel = document.getElementById('bl-panel-' + target);
                if (panel) panel.classList.add('active');
            });
        });

        var clearBtn = document.getElementById('clear-battle-log-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                if (confirm('确定要清空所有作战日志吗？此操作不可恢复。')) {
                    BattleLog.clear();
                    renderBattleLogList();
                    renderBattleLogTrends();
                    renderHeatmap();
                }
            });
        }

        bindHeatmapEvents();
    }

    // ==================== 雷区热图 ====================

    var currentHeatmapDiff = 'all';
    var currentHeatmapType = 'clicks';

    function renderHeatmap() {
        if (typeof BattleLog === 'undefined') return;
        var gridEl = document.getElementById('heatmap-grid');
        var legendEl = document.getElementById('heatmap-legend');
        var statsEl = document.getElementById('heatmap-stats');
        var insightsEl = document.getElementById('heatmap-insights');
        if (!gridEl || !legendEl || !statsEl || !insightsEl) return;

        // 同步按钮 active 状态与当前变量（防止离开再返回后不同步）
        var screen = document.getElementById('battle-log-screen');
        if (screen) {
            screen.querySelectorAll('.heatmap-filter-btn').forEach(function(b) {
                b.classList.toggle('active', b.dataset.hmDiff === currentHeatmapDiff);
            });
            screen.querySelectorAll('.heatmap-type-btn').forEach(function(b) {
                b.classList.toggle('active', b.dataset.hmType === currentHeatmapType);
            });
        }

        var data;
        try {
            data = BattleLog.generateHeatmapData(currentHeatmapDiff, currentHeatmapType);
        } catch (e) {
            console.warn('renderHeatmap failed:', e);
            gridEl.innerHTML = '<div class="bl-empty">热图渲染出错，请刷新重试。</div>';
            legendEl.innerHTML = '';
            statsEl.innerHTML = '';
            insightsEl.innerHTML = '';
            return;
        }

        // 渲染热图网格
        var gridHtml = '';
        if (data.totalRecords === 0) {
            gridHtml = '<div class="bl-empty">暂无数据，完成一局后即可生成热图。</div>';
        } else {
            gridHtml = '<div class="heatmap-grid">';
            for (var y = 0; y < 20; y++) {
                for (var x = 0; x < 20; x++) {
                    var val = data.grid[y][x];
                    var opacity, color;
                    if (currentHeatmapType === 'wins') {
                        // 胜率热图使用绝对百分比（0~100），更直观
                        opacity = 0.08 + (val / 100) * 0.92;
                        color = 'rgba(34, 197, 94, ' + opacity + ')';
                    } else {
                        var intensity = data.maxValue > 0 ? (val / data.maxValue) : 0;
                        opacity = 0.08 + intensity * 0.92;
                        if (currentHeatmapType === 'clicks') {
                            color = 'rgba(59, 130, 246, ' + opacity + ')';
                        } else {
                            color = 'rgba(239, 68, 68, ' + opacity + ')';
                        }
                    }
                    var titleText = (currentHeatmapType === 'wins') ? (val + '%') : val;
                    gridHtml += '<div class="heatmap-cell" style="background:' + color + '" title="' + titleText + '"></div>';
                }
            }
            gridHtml += '</div>';
        }
        gridEl.innerHTML = gridHtml;

        // 无数据时隐藏图例、统计和洞察
        if (data.totalRecords === 0) {
            legendEl.innerHTML = '';
            statsEl.innerHTML = '';
            insightsEl.innerHTML = '';
            return;
        }

        // 渲染图例
        var legendLabels = {
            clicks: ['低', '中', '高'],
            wins: ['低胜率', '中胜率', '高胜率'],
            danger: ['低风险', '中风险', '高风险']
        };
        var legendLabel = legendLabels[currentHeatmapType] || ['低', '中', '高'];
        legendEl.innerHTML =
            '<div class="heatmap-legend">' +
                '<span>' + legendLabel[0] + '</span>' +
                '<div class="heatmap-legend-bar" data-type="' + currentHeatmapType + '"></div>' +
                '<span>' + legendLabel[2] + '</span>' +
            '</div>';

        // 渲染统计
        var diffNames = { all: '全部', beginner: '初级', intermediate: '中级', expert: '高级' };
        var typeNames = { clicks: '点击热图', wins: '胜率热图', danger: '危险热图' };
        var peakLabel = (currentHeatmapType === 'wins') ? ('峰值: ' + data.maxValue + '%') : ('峰值: ' + data.maxValue);
        statsEl.innerHTML =
            '<div class="heatmap-stats">' +
                '<span>难度: ' + (diffNames[currentHeatmapDiff] || currentHeatmapDiff) + '</span>' +
                '<span>类型: ' + (typeNames[currentHeatmapType] || currentHeatmapType) + '</span>' +
                '<span>样本: ' + data.totalRecords + ' 局</span>' +
                '<span>' + peakLabel + '</span>' +
            '</div>';

        // 渲染洞察
        var insightsHtml = '';
        if (data.insights.length > 0) {
            insightsHtml = '<div class="heatmap-insights">';
            for (var i = 0; i < data.insights.length; i++) {
                insightsHtml += '<div class="heatmap-insight-item">💡 ' + data.insights[i] + '</div>';
            }
            insightsHtml += '</div>';
        }
        insightsEl.innerHTML = insightsHtml;
    }

    function bindHeatmapEvents() {
        var screen = document.getElementById('battle-log-screen');
        if (!screen) return;

        // 使用事件委托避免 cloneNode 导致的引用失效问题
        var filterGroup = screen.querySelector('.heatmap-filter-group');
        var typeGroup = screen.querySelector('.heatmap-type-group');

        if (filterGroup && !filterGroup.dataset.bound) {
            filterGroup.dataset.bound = '1';
            filterGroup.addEventListener('click', function(e) {
                var btn = e.target.closest('.heatmap-filter-btn');
                if (!btn) return;
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                currentHeatmapDiff = btn.dataset.hmDiff;
                filterGroup.querySelectorAll('.heatmap-filter-btn').forEach(function(b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                renderHeatmap();
            });
        }

        if (typeGroup && !typeGroup.dataset.bound) {
            typeGroup.dataset.bound = '1';
            typeGroup.addEventListener('click', function(e) {
                var btn = e.target.closest('.heatmap-type-btn');
                if (!btn) return;
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                currentHeatmapType = btn.dataset.hmType;
                typeGroup.querySelectorAll('.heatmap-type-btn').forEach(function(b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                renderHeatmap();
            });
        }
    }

    // ==================== 影子挑战 ====================

    function bindShadowRaceEvents() {
        if (typeof ShadowRace === 'undefined') return;

        // 影子动作：在棋盘上显示闪烁效果
        document.addEventListener('shadowAction', function(e) {
            var d = e.detail;
            if (d.action === 'undo') {
                clearAllShadowMarks();
            } else if (d.action === 'reveal') {
                flashShadowCell(d.x, d.y);
                if (d.result && d.result.revealed && Array.isArray(d.result.revealed)) {
                    d.result.revealed.forEach(function(cell) {
                        if (cell.x !== d.x || cell.y !== d.y) {
                            flashShadowCell(cell.x, cell.y);
                        }
                    });
                }
            } else if (d.action === 'chord') {
                flashShadowCell(d.x, d.y);
                if (d.result && d.result.revealed && Array.isArray(d.result.revealed)) {
                    d.result.revealed.forEach(function(cell) {
                        flashShadowCell(cell.x, cell.y);
                    });
                }
            } else if (d.action === 'flag') {
                markShadowCell(d.x, d.y, true);
            } else if (d.action === 'unflag' || d.action === 'question' || d.action === 'clear') {
                markShadowCell(d.x, d.y, false);
            }
        });

        // 影子进度更新
        document.addEventListener('shadowProgress', function(e) {
            var bar = document.getElementById('shadow-progress-bar');
            var fill = document.getElementById('shadow-progress-fill');
            var text = document.getElementById('shadow-progress-text');
            if (bar && fill && text) {
                bar.classList.remove('hidden');
                fill.style.width = e.detail.progress + '%';
                text.textContent = e.detail.progress + '%';
            }
        });

        // 影子完成
        document.addEventListener('shadowCompleted', function(e) {
            var bar = document.getElementById('shadow-progress-bar');
            var fill = document.getElementById('shadow-progress-fill');
            var text = document.getElementById('shadow-progress-text');
            if (bar && fill && text) {
                bar.classList.remove('hidden');
                fill.style.width = '100%';
                text.textContent = '完成!';
            }
        });

        // 影子竞速结束：渲染结果到游戏结束弹窗
        document.addEventListener('shadowRaceEnd', function(e) {
            renderShadowRaceResult(e.detail);
        });
    }

    function flashShadowCell(x, y) {
        if (!cellElements[y] || !cellElements[y][x]) return;
        var el = cellElements[y][x];
        el.classList.add('shadow-flash');
        setTimeout(function() {
            el.classList.remove('shadow-flash');
        }, 400);
    }

    function markShadowCell(x, y, flagged) {
        if (!cellElements[y] || !cellElements[y][x]) return;
        var el = cellElements[y][x];
        if (flagged) {
            el.classList.add('shadow-flagged');
        } else {
            el.classList.remove('shadow-flagged');
        }
    }

    function clearAllShadowMarks() {
        document.querySelectorAll('.cell.shadow-flagged').forEach(function(el) {
            el.classList.remove('shadow-flagged');
        });
    }

    function renderShadowRaceResult(result) {
        var container = document.getElementById('shadow-race-result');
        if (!container) return;

        var html = '<div class="sr-result-box">';
        if (result.draw) {
            html += '<div class="sr-result-title draw">⚖️ 平局！你与影子同时完成</div>';
        } else if (result.beatShadow) {
            html += '<div class="sr-result-title won">🎉 你超越了影子！</div>';
        } else {
            html += '<div class="sr-result-title lost">👻 影子领先完成</div>';
        }
        html += '<div class="sr-result-stats">';
        html += '<div class="sr-stat-row"><span>你的时间</span><span>' + (Math.round((result.playerTime || 0) * 10) / 10) + 's</span></div>';
        if (result.shadowTime !== null && result.shadowTime !== undefined) {
            html += '<div class="sr-stat-row"><span>影子时间</span><span>' + (Math.round(result.shadowTime * 10) / 10) + 's</span></div>';
            if (result.timeDiff !== null && result.timeDiff !== undefined) {
                html += '<div class="sr-stat-row"><span>差距</span><span>' + (Math.round(result.timeDiff * 10) / 10) + 's</span></div>';
            }
        } else {
            html += '<div class="sr-stat-row"><span>影子</span><span>未完成</span></div>';
        }
        html += '</div></div>';

        container.innerHTML = html;
        container.classList.remove('hidden');
    }

    function renderBattleLogList() {
        var container = document.getElementById('battle-log-list');
        if (!container) return;
        if (typeof BattleLog === 'undefined') {
            container.innerHTML = '<div class="bl-empty">模块加载失败</div>';
            return;
        }
        var list = BattleLog.getList();
        if (list.length === 0) {
            container.innerHTML = '<p class="bl-empty">暂无游戏记录，完成一局后即可查看详细分析。</p>';
            return;
        }

        container.innerHTML = '';
        var diffNames = {
            beginner: '初级', intermediate: '中级', expert: '高级',
            master: '大师', giant: '巨型', custom: '自定义', puzzle: '谜题'
        };

        list.forEach(function(entry) {
            var card = document.createElement('div');
            card.className = 'bl-card' + (entry.won ? ' won' : ' lost');

            var dateStr = '';
            try {
                dateStr = new Date(entry.playedAt).toLocaleString('zh-CN', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });
            } catch (e) { dateStr = entry.playedAt || ''; }

            var analysis = BattleLog.analyze(entry);
            var grade = analysis ? analysis.overallGrade : 'C';
            var gradeColor = {
                S: '#fbbf24', A: '#22c55e', B: '#3b82f6',
                C: '#94a3b8', D: '#f97316', F: '#ef4444'
            };

            var diffLabel = diffNames[entry.difficulty] || entry.difficulty || '自定义';
            var timeVal = (entry.time !== undefined && entry.time !== null) ? entry.time : 0;
            var effVal = (entry.efficiency !== undefined && entry.efficiency !== null) ? entry.efficiency : 0;
            var w = entry.width || 0;
            var h = entry.height || 0;
            var m = entry.mineCount || 0;

            var cardHtml =
                '<div class="bl-card-header">' +
                    '<span class="bl-card-result">' + (entry.won ? '🏆 胜利' : '💥 失败') + '</span>' +
                    '<span class="bl-card-grade" style="color:' + (gradeColor[grade] || '#94a3b8') + '">' + grade + '</span>' +
                '</div>' +
                '<div class="bl-card-body">' +
                    '<div class="bl-card-info">' +
                        '<span>' + diffLabel + '</span>' +
                        '<span>⏱️ ' + timeVal + 's</span>' +
                        '<span>📊 ' + effVal + '%</span>' +
                    '</div>' +
                    '<div class="bl-card-meta">' +
                        '<span>' + dateStr + '</span>' +
                        '<span>' + w + '×' + h + ' · ' + m + '雷</span>' +
                    '</div>' +
                '</div>';
            var canChallengeCard = entry.seed !== null && entry.seed !== undefined && entry.replay && entry.replay.length > 0;
            if (canChallengeCard) {
                cardHtml += '<div class="bl-card-actions">' +
                    '<button class="bl-card-btn challenge-btn">🏁 挑战影子</button>' +
                '</div>';
            }
            card.innerHTML = cardHtml;

            card.addEventListener('click', function(e) {
                if (e.target.classList.contains('challenge-btn')) return;
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                renderBattleAnalysis(entry.id);
                showScreen('battle-analysis-screen');
            });

            var challengeBtn = card.querySelector('.challenge-btn');
            if (challengeBtn && typeof ShadowRace !== 'undefined') {
                challengeBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (typeof AudioManager !== "undefined") AudioManager.playClick();
                    var custom = null;
                    if (entry.difficulty === 'custom') {
                        custom = { width: entry.width, height: entry.height, mines: entry.mineCount };
                    }
                    Game.start(entry.difficulty, custom, null, entry.seed);
                    showScreen('game-screen');
                    setTimeout(function() {
                        if (ShadowRace.setup(entry.id)) {
                            ShadowRace.start();
                        }
                    }, 500);
                });
            }

            container.appendChild(card);
        });
    }

    function renderBattleLogTrends() {
        if (typeof BattleLog === 'undefined') return;
        var trends = BattleLog.getTrends();

        // 效率趋势
        var effContainer = document.getElementById('bl-eff-trend');
        if (effContainer) {
            effContainer.innerHTML = '';
            var effData = trends.efficiency;
            if (effData.length === 0) {
                effContainer.innerHTML = '<div style="text-align:center;color:var(--text-muted)">暂无数据</div>';
            } else {
                var maxEff = 100;
                effData.forEach(function(d, i) {
                    var bar = document.createElement('div');
                    bar.className = 'trend-bar';
                    bar.style.height = Math.max(4, (d.value / maxEff) * 100) + '%';
                    bar.style.background = d.won ? 'var(--secondary)' : 'var(--danger)';
                    bar.dataset.label = '#' + (i + 1);
                    effContainer.appendChild(bar);
                });
            }
        }

        // 胜率趋势
        var winContainer = document.getElementById('bl-win-trend');
        if (winContainer) {
            winContainer.innerHTML = '';
            var winData = trends.winRate;
            if (winData.length === 0) {
                winContainer.innerHTML = '<div style="text-align:center;color:var(--text-muted)">暂无数据</div>';
            } else {
                winData.forEach(function(d, i) {
                    var bar = document.createElement('div');
                    bar.className = 'trend-bar';
                    bar.style.height = Math.max(4, d.winRate) + '%';
                    bar.style.background = 'var(--primary)';
                    bar.dataset.label = '#' + (i + 1);
                    winContainer.appendChild(bar);
                });
            }
        }
    }

    function renderBattleAnalysis(id) {
        var container = document.getElementById('battle-analysis-content');
        if (!container) return;
        if (typeof BattleLog === 'undefined') {
            container.innerHTML = '<p style="text-align:center;color:var(--text-muted)">模块加载失败</p>';
            return;
        }
        var entry = BattleLog.getById(id);
        if (!entry) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-muted)">记录不存在</p>';
            return;
        }

        var analysis = BattleLog.analyze(entry);
        var diffNames = {
            beginner: '初级', intermediate: '中级', expert: '高级',
            master: '大师', giant: '巨型', custom: '自定义', puzzle: '谜题'
        };

        var gradeColor = {
            S: '#fbbf24', A: '#22c55e', B: '#3b82f6',
            C: '#94a3b8', D: '#f97316', F: '#ef4444'
        };

        // 综合评级卡片
        var overallGrade = analysis.overallGrade;
        var overallColor = gradeColor[overallGrade] || '#94a3b8';

        var html = '<div class="ba-overview">';
        html += '<div class="ba-grade-circle" style="border-color:' + overallColor + ';color:' + overallColor + '">' +
            '<div class="ba-grade-letter">' + overallGrade + '</div>' +
            '<div class="ba-grade-label">综合评级</div>' +
        '</div>';
        var dateDisplay = '';
        try {
            dateDisplay = new Date(entry.playedAt).toLocaleString('zh-CN');
        } catch (e) {
            dateDisplay = entry.playedAt || '';
        }

        var wInfo = entry.width || 0;
        var hInfo = entry.height || 0;
        var mInfo = entry.mineCount || 0;

        html += '<div class="ba-overview-info">' +
            '<h3>' + (entry.won ? '🏆 胜利' : '💥 失败') + ' — ' + (diffNames[entry.difficulty] || entry.difficulty || '自定义') + '</h3>' +
            '<p>' + wInfo + '×' + hInfo + ' · ' + mInfo + '雷 · 种子: ' + ((entry.seed !== null && entry.seed !== undefined) ? entry.seed : '随机') + '</p>' +
            '<p>' + dateDisplay + '</p>' +
        '</div>';
        html += '</div>';

        // 关键指标网格
        html += '<div class="ba-metrics">';
        analysis.keyMetrics.forEach(function(m) {
            var color = m.grade ? (gradeColor[m.grade] || '') : '';
            html += '<div class="ba-metric-card">' +
                '<div class="ba-metric-value" style="color:' + (color || 'var(--primary)') + '">' + m.value + '</div>' +
                '<div class="ba-metric-label">' + m.label + '</div>' +
                (m.grade ? '<div class="ba-metric-grade" style="color:' + color + '">' + m.grade + '</div>' : '') +
            '</div>';
        });
        html += '</div>';

        // 评语
        if (analysis.commentary && analysis.commentary.length > 0) {
            html += '<div class="ba-commentary">';
            html += '<h4>💬 战术评语</h4>';
            analysis.commentary.forEach(function(c) {
                html += '<p>' + c + '</p>';
            });
            html += '</div>';
        }

        // 棋盘复盘（简化显示：显示地雷和错误标记）
        html += '<div class="ba-board-section">';
        html += '<h4>🗺️ 棋盘复盘</h4>';
        var snapshot = entry.boardSnapshot;
        var hasRevealedData = snapshot && snapshot.revealed;
        if (!hasRevealedData && snapshot && snapshot.mines) {
            html += '<p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.5rem;">棋盘过大，仅显示地雷与标记分布。</p>';
        }
        html += '<div class="ba-board-replay" style="grid-template-columns:repeat(' + entry.width + ',24px);">';
        if (snapshot && snapshot.mines) {
            var revealedSet = {};
            var flaggedSet = {};
            var misFlaggedSet = {};
            if (hasRevealedData) {
                snapshot.revealed.forEach(function(r) { revealedSet[r.x + ',' + r.y] = true; });
            }
            (snapshot.flagged || []).forEach(function(f) { flaggedSet[f.x + ',' + f.y] = true; });
            (snapshot.misFlagged || []).forEach(function(m) { misFlaggedSet[m.x + ',' + m.y] = true; });

            for (var y = 0; y < entry.height; y++) {
                for (var x = 0; x < entry.width; x++) {
                    var key = x + ',' + y;
                    var isMine = snapshot.mines.some(function(m) { return m.x === x && m.y === y; });
                    var cls = 'ba-cell';
                    var content = '';
                    if (hasRevealedData && revealedSet[key]) {
                        if (isMine) {
                            cls += ' mine-hit';
                            content = '💥';
                        } else {
                            cls += ' revealed';
                        }
                    } else if (flaggedSet[key]) {
                        if (misFlaggedSet[key]) {
                            cls += ' misflagged';
                            content = '❌';
                        } else {
                            cls += ' flagged';
                            content = '🚩';
                        }
                    } else if (isMine) {
                        cls += ' unrevealed-mine';
                        content = '💣';
                    } else {
                        cls += ' hidden';
                    }
                    html += '<div class="' + cls + '">' + content + '</div>';
                }
            }
        }
        html += '</div>';
        html += '<div class="ba-board-legend">' +
            '<span><span class="ba-legend-dot" style="background:#ef4444"></span> 地雷</span>' +
            '<span><span class="ba-legend-dot" style="background:#22c55e"></span> 正确标记</span>' +
            '<span><span class="ba-legend-dot" style="background:#f59e0b"></span> 错误标记</span>' +
        '</div>';
        html += '</div>';

        // 操作统计
        html += '<div class="ba-stats-detail">';
        html += '<h4>📈 操作详情</h4>';
        html += '<div class="ba-stat-rows">';
        html += '<div class="ba-stat-row"><span>总点击数</span><span>' + (entry.clicks || 0) + '</span></div>';
        html += '<div class="ba-stat-row"><span>Chord 次数</span><span>' + (entry.chordCount || 0) + '</span></div>';
        html += '<div class="ba-stat-row"><span>撤销次数</span><span>' + (entry.undoCount || 0) + '</span></div>';
        html += '<div class="ba-stat-row"><span>正确旗帜</span><span>' + ((entry.flagStats && entry.flagStats.correct) || 0) + '</span></div>';
        html += '<div class="ba-stat-row"><span>错误旗帜</span><span>' + ((entry.flagStats && entry.flagStats.incorrect) || 0) + '</span></div>';
        html += '<div class="ba-stat-row"><span>平均手速</span><span>' + ((entry.clickAnalysis && entry.clickAnalysis.avgCps) || 0) + '/s</span></div>';
        html += '<div class="ba-stat-row"><span>峰值手速</span><span>' + ((entry.clickAnalysis && entry.clickAnalysis.peakCps) || 0) + '/s</span></div>';
        html += '<div class="ba-stat-row"><span>首次点击延迟</span><span>' + ((entry.clickAnalysis && entry.clickAnalysis.firstClickDelay) || 0) + 's</span></div>';
        html += '</div>';
        html += '</div>';

        // 挑战按钮（需同时有种子和回放数据）
        var canChallenge = entry.seed !== null && entry.seed !== undefined && entry.replay && entry.replay.length > 0;
        if (typeof ShadowRace !== 'undefined' && canChallenge) {
            html += '<button class="overlay-btn" id="challenge-shadow-btn" style="margin-top:1rem;background:var(--secondary);color:white;">🏁 挑战此记录的影子</button>';
        }

        // 删除按钮
        html += '<button class="danger-btn" id="delete-battle-entry-btn" style="margin-top:1rem;">🗑️ 删除此记录</button>';

        container.innerHTML = html;

        var challengeBtn = document.getElementById('challenge-shadow-btn');
        if (challengeBtn) {
            challengeBtn.addEventListener('click', function() {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                var custom = null;
                if (entry.difficulty === 'custom') {
                    custom = { width: entry.width, height: entry.height, mines: entry.mineCount };
                }
                Game.start(entry.difficulty, custom, null, entry.seed);
                showScreen('game-screen');
                setTimeout(function() {
                    if (ShadowRace.setup(id)) {
                        ShadowRace.start();
                    }
                }, 500);
            });
        }

        var deleteBtn = document.getElementById('delete-battle-entry-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                if (typeof AudioManager !== "undefined") AudioManager.playClick();
                if (confirm('确定要删除这条记录吗？')) {
                    BattleLog.deleteById(id);
                    showScreen('battle-log-screen');
                }
            });
        }
    }

    // ==================== 模式训练道馆 ====================

    var dojoCurrentPattern = null;
    var dojoCurrentBoardIndex = 0;
    var dojoSelectedMines = [];
    var dojoTrainingStartTime = 0;
    var dojoTrainingTimer = null;
    var dojoTrainingActive = false;

    function renderDojoGallery() {
        if (typeof PatternDojo === 'undefined') return;
        var container = document.getElementById('dojo-gallery');
        if (!container) return;

        var patterns = PatternDojo.getPatterns();
        var progress = PatternDojo.getProgress();
        var html = '<div class="dojo-intro">💡 掌握经典推理模式，提升扫雷技巧。完成当前模式训练即可解锁下一模式。</div>';
        html += '<div class="dojo-cards">';

        for (var i = 0; i < patterns.length; i++) {
            var p = patterns[i];
            var prog = progress[p.id] || { unlocked: false, completed: 0, correct: 0, rating: 'none' };
            var isUnlocked = prog.unlocked;
            var ratingClass = prog.rating;
            var accuracy = prog.completed > 0 ? Math.round((prog.correct / prog.completed) * 100) : 0;
            var stars = ratingClass === 'gold' ? '⭐⭐⭐' : ratingClass === 'silver' ? '⭐⭐' : ratingClass === 'bronze' ? '⭐' : '';

            html += '<div class="dojo-card' + (isUnlocked ? '' : ' locked') + '" data-pattern="' + p.id + '">';
            html += '<div class="dojo-card-header">';
            html += '<span class="dojo-card-name">' + escapeHtml(p.name) + '</span>';
            html += '<span class="dojo-card-level">' + '⭐'.repeat(p.level) + '</span>';
            html += '</div>';
            html += '<div class="dojo-card-desc">' + escapeHtml(p.description) + '</div>';
            if (isUnlocked) {
                html += '<div class="dojo-card-stats">';
                html += '<span>完成: ' + prog.completed + '/' + p.trainingBoards.length + '</span>';
                html += '<span>准确率: ' + accuracy + '%</span>';
                html += '</div>';
                if (stars) html += '<div class="dojo-card-rating">' + stars + '</div>';
            } else {
                html += '<div class="dojo-card-locked">🔒 完成前一模式解锁</div>';
            }
            html += '</div>';
        }

        html += '</div>';
        container.innerHTML = html;

        // 绑定卡片点击
        container.querySelectorAll('.dojo-card').forEach(function(card) {
            card.addEventListener('click', function() {
                var pid = card.dataset.pattern;
                if (!pid) return;
                if (!PatternDojo.isUnlocked(pid)) {
                    showHintOverlay('请先完成前一模式的训练以解锁此模式。');
                    return;
                }
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                showDojoDetail(pid);
            });
        });
    }

    function showDojoDetail(patternId) {
        var pattern = PatternDojo.getPattern(patternId);
        if (!pattern) return;
        dojoCurrentPattern = patternId;

        document.getElementById('dojo-gallery').classList.add('hidden');
        document.getElementById('dojo-detail').classList.remove('hidden');
        document.getElementById('dojo-training').classList.add('hidden');

        document.getElementById('dojo-detail-title').textContent = pattern.name;
        document.getElementById('dojo-detail-level').textContent = '难度: ' + '⭐'.repeat(pattern.level);
        document.getElementById('dojo-detail-desc').textContent = pattern.description;
        document.getElementById('dojo-example-explanation').textContent = pattern.explanation;

        // 渲染示例棋盘
        renderDojoExampleBoard(pattern.exampleBoard, pattern.exampleMines);

        // 渲染进度
        var prog = PatternDojo.getProgress(patternId);
        var statsHtml = '';
        if (prog && prog.completed > 0) {
            var accuracy = Math.round((prog.correct / prog.completed) * 100);
            statsHtml += '<div class="dojo-stat-row"><span>已完成训练</span><span>' + prog.completed + ' 题</span></div>';
            statsHtml += '<div class="dojo-stat-row"><span>准确率</span><span>' + accuracy + '%</span></div>';
            if (prog.bestTime !== null) {
                statsHtml += '<div class="dojo-stat-row"><span>最佳用时</span><span>' + (prog.bestTime / 1000).toFixed(1) + 's</span></div>';
            }
            var ratingText = prog.rating === 'gold' ? '🥇 金牌' : prog.rating === 'silver' ? '🥈 银牌' : prog.rating === 'bronze' ? '🥉 铜牌' : '暂无评级';
            statsHtml += '<div class="dojo-stat-row"><span>评级</span><span>' + ratingText + '</span></div>';
        } else {
            statsHtml += '<div class="dojo-stat-empty">尚未开始训练，点击"开始训练"进入第一题。</div>';
        }
        document.getElementById('dojo-progress-stats').innerHTML = statsHtml;
    }

    function renderDojoExampleBoard(board, mines) {
        var container = document.getElementById('dojo-example-board');
        if (!container) return;
        var mineSet = {};
        for (var i = 0; i < mines.length; i++) {
            mineSet[mines[i].x + ',' + mines[i].y] = true;
        }
        var cols = board[0] ? board[0].length : 5;
        var rows = board.length;
        var html = '<div class="dojo-mini-board" style="grid-template-columns: repeat(' + cols + ', 32px); grid-template-rows: repeat(' + rows + ', 32px);">';
        for (var y = 0; y < rows; y++) {
            for (var x = 0; x < board[y].length; x++) {
                var val = board[y][x];
                var isMine = mineSet[x + ',' + y];
                var cellClass = 'dojo-mini-cell';
                if (val === -1) {
                    cellClass += isMine ? ' mine' : ' unrevealed';
                } else {
                    cellClass += ' revealed num-' + val;
                }
                var content = val === -1 ? (isMine ? '💣' : '') : (val === 0 ? '' : val);
                html += '<div class="' + cellClass + '">' + content + '</div>';
            }
        }
        html += '</div>';
        container.innerHTML = html;
    }

    function startDojoTraining() {
        if (!dojoCurrentPattern) return;
        var pattern = PatternDojo.getPattern(dojoCurrentPattern);
        if (!pattern) return;

        document.getElementById('dojo-detail').classList.add('hidden');
        document.getElementById('dojo-training').classList.remove('hidden');

        dojoCurrentBoardIndex = 0;
        dojoSelectedMines = [];
        loadDojoTrainingBoard();
    }

    function loadDojoTrainingBoard() {
        var pattern = PatternDojo.getPattern(dojoCurrentPattern);
        if (!pattern) return;
        var board = PatternDojo.getTrainingBoard(dojoCurrentPattern, dojoCurrentBoardIndex);
        if (!board) return;

        document.getElementById('dojo-training-title').textContent = pattern.name;
        document.getElementById('dojo-training-counter').textContent = (dojoCurrentBoardIndex + 1) + ' / ' + pattern.trainingBoards.length;
        var confirmBtn = document.getElementById('dojo-confirm-btn');
        if (confirmBtn) confirmBtn.classList.remove('hidden');
        var nextBtn = document.getElementById('dojo-next-btn');
        if (nextBtn) {
            nextBtn.classList.add('hidden');
            nextBtn.textContent = '➡️ 下一题';
        }
        document.getElementById('dojo-feedback').classList.add('hidden');
        document.getElementById('dojo-feedback').innerHTML = '';

        dojoSelectedMines = [];
        dojoTrainingStartTime = Date.now();
        dojoTrainingActive = true;
        startDojoTimer();

        renderDojoTrainingBoard(board.grid);
    }

    function startDojoTimer() {
        if (dojoTrainingTimer) clearInterval(dojoTrainingTimer);
        dojoTrainingTimer = setInterval(function() {
            if (!dojoTrainingActive) return;
            var elapsed = Date.now() - dojoTrainingStartTime;
            var el = document.getElementById('dojo-timer');
            if (el) el.textContent = (elapsed / 1000).toFixed(1) + 's';
        }, 100);
    }

    function stopDojoTimer() {
        if (dojoTrainingTimer) {
            clearInterval(dojoTrainingTimer);
            dojoTrainingTimer = null;
        }
        dojoTrainingActive = false;
    }

    function renderDojoTrainingBoard(grid) {
        var container = document.getElementById('dojo-board');
        if (!container) return;
        var cols = grid[0] ? grid[0].length : 5;
        var rows = grid.length;
        var html = '<div class="dojo-train-board" style="grid-template-columns: repeat(' + cols + ', 48px); grid-template-rows: repeat(' + rows + ', 48px);">';
        for (var y = 0; y < rows; y++) {
            for (var x = 0; x < grid[y].length; x++) {
                var val = grid[y][x];
                var cellClass = 'dojo-train-cell';
                var content = '';
                var clickable = false;
                if (val === -1) {
                    cellClass += ' unrevealed';
                    clickable = true;
                } else {
                    cellClass += ' revealed num-' + val;
                    content = val === 0 ? '' : val;
                }
                var dataAttr = clickable ? ' data-x="' + x + '" data-y="' + y + '"' : '';
                html += '<div class="' + cellClass + '"' + dataAttr + '>' + content + '</div>';
            }
        }
        html += '</div>';
        container.innerHTML = html;

        // 绑定点击
        container.querySelectorAll('.dojo-train-cell.unrevealed').forEach(function(cell) {
            cell.addEventListener('click', function() {
                if (!dojoTrainingActive) return;
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                var x = parseInt(cell.dataset.x);
                var y = parseInt(cell.dataset.y);
                toggleDojoMineSelection(x, y, cell);
            });
        });
    }

    function toggleDojoMineSelection(x, y, cellEl) {
        var idx = -1;
        for (var i = 0; i < dojoSelectedMines.length; i++) {
            if (dojoSelectedMines[i].x === x && dojoSelectedMines[i].y === y) {
                idx = i; break;
            }
        }
        if (idx >= 0) {
            dojoSelectedMines.splice(idx, 1);
            cellEl.classList.remove('marked-mine');
        } else {
            dojoSelectedMines.push({ x: x, y: y });
            cellEl.classList.add('marked-mine');
        }
    }

    function confirmDojoAnswer() {
        if (!dojoTrainingActive || !dojoCurrentPattern) return;
        stopDojoTimer();

        var result = PatternDojo.checkAnswer(dojoCurrentPattern, dojoCurrentBoardIndex, dojoSelectedMines);
        var timeMs = Date.now() - dojoTrainingStartTime;

        var feedbackEl = document.getElementById('dojo-feedback');
        if (feedbackEl) feedbackEl.classList.remove('hidden');

        if (result.correct) {
            if (typeof AudioManager !== 'undefined') AudioManager.playWin();
            if (feedbackEl) {
                feedbackEl.className = 'dojo-feedback correct';
                feedbackEl.innerHTML = '<div class="dojo-feedback-icon">✅</div><div class="dojo-feedback-text">正确！' + escapeHtml(result.explanation || '') + '</div>';
            }
            PatternDojo.recordResult(dojoCurrentPattern, true, timeMs);
        } else {
            if (typeof AudioManager !== 'undefined') AudioManager.playLose();
            if (feedbackEl) {
                feedbackEl.className = 'dojo-feedback wrong';
                feedbackEl.innerHTML = '<div class="dojo-feedback-icon">❌</div><div class="dojo-feedback-text">' + escapeHtml(result.reason || '') + '</div>';
            }
            PatternDojo.recordResult(dojoCurrentPattern, false, timeMs);

            // 高亮正确答案
            if (result.expected) {
                var boardEl = document.getElementById('dojo-board');
                if (boardEl) {
                    result.expected.forEach(function(m) {
                        var cell = boardEl.querySelector('.dojo-train-cell[data-x="' + m.x + '"][data-y="' + m.y + '"]');
                        if (cell) cell.classList.add('correct-mine');
                    });
                }
            }
        }

        var confirmBtn = document.getElementById('dojo-confirm-btn');
        if (confirmBtn) confirmBtn.classList.add('hidden');
        var nextBtn = document.getElementById('dojo-next-btn');
        var pattern = PatternDojo.getPattern(dojoCurrentPattern);
        if (nextBtn) {
            if (pattern && dojoCurrentBoardIndex < pattern.trainingBoards.length - 1) {
                nextBtn.classList.remove('hidden');
            } else {
                nextBtn.textContent = '🏠 返回图鉴';
                nextBtn.classList.remove('hidden');
            }
        }
    }

    function nextDojoBoard() {
        var pattern = PatternDojo.getPattern(dojoCurrentPattern);
        if (!pattern) return;
        if (dojoCurrentBoardIndex < pattern.trainingBoards.length - 1) {
            dojoCurrentBoardIndex++;
            if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            loadDojoTrainingBoard();
        } else {
            if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            document.getElementById('dojo-training').classList.add('hidden');
            document.getElementById('dojo-detail').classList.remove('hidden');
            // 刷新详情页的进度显示
            showDojoDetail(dojoCurrentPattern);
        }
    }

    function backToDojoGallery() {
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        dojoCurrentPattern = null;
        stopDojoTimer();
        document.getElementById('dojo-detail').classList.add('hidden');
        document.getElementById('dojo-training').classList.add('hidden');
        document.getElementById('dojo-gallery').classList.remove('hidden');
        renderDojoGallery();
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function bindPatternDojoEvents() {
        if (typeof PatternDojo === 'undefined') return;

        var detailBack = document.getElementById('dojo-detail-back');
        if (detailBack) {
            detailBack.addEventListener('click', backToDojoGallery);
        }

        var startBtn = document.getElementById('dojo-start-training');
        if (startBtn) {
            startBtn.addEventListener('click', function() {
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                startDojoTraining();
            });
        }

        var trainingBack = document.getElementById('dojo-training-back');
        if (trainingBack) {
            trainingBack.addEventListener('click', function() {
                if (dojoTrainingActive) {
                    if (!confirm('确定要退出训练吗？当前进度将不会保存。')) return;
                }
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                stopDojoTimer();
                document.getElementById('dojo-training').classList.add('hidden');
                document.getElementById('dojo-detail').classList.remove('hidden');
            });
        }

        var confirmBtn = document.getElementById('dojo-confirm-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                confirmDojoAnswer();
            });
        }

        var nextBtn = document.getElementById('dojo-next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', nextDojoBoard);
        }
    }

    // ============ 雷暴突袭 (Thunder Rush) ============

    var thunderLoopId = null;
    var thunderGameActive = false;
    var thunderLongPressTimer = null;

    function bindThunderRushEvents() {
        if (typeof ThunderRush === 'undefined') return;
        ThunderRush.init();

        var startBtn = document.getElementById('thunder-start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', function() {
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                startThunderRush();
            });
        }

        var giveupBtn = document.getElementById('thunder-giveup-btn');
        if (giveupBtn) {
            giveupBtn.addEventListener('click', function() {
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                if (confirm('确定要放弃当前挑战吗？')) {
                    ThunderRush.stopGame();
                    showThunderRushStart();
                }
            });
        }

        var restartBtn = document.getElementById('thunder-restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', function() {
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                startThunderRush();
            });
        }

        var backBtn = document.getElementById('thunder-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                showScreen('main-menu');
            });
        }

        // 棋盘事件委托
        var boardEl = document.getElementById('thunder-board');
        if (boardEl) {
            boardEl.addEventListener('click', function(e) {
                var cell = e.target.closest('.thunder-cell');
                if (!cell) return;
                var x = parseInt(cell.dataset.x);
                var y = parseInt(cell.dataset.y);
                if (isNaN(x) || isNaN(y)) return;
                var changed = ThunderRush.handleCellClick(x, y, false);
                if (changed) {
                    renderThunderRushBoard();
                    updateThunderHUD(ThunderRush.getState());
                }
            });

            boardEl.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                var cell = e.target.closest('.thunder-cell');
                if (!cell) return;
                var x = parseInt(cell.dataset.x);
                var y = parseInt(cell.dataset.y);
                if (isNaN(x) || isNaN(y)) return;
                var changed = ThunderRush.handleCellClick(x, y, true);
                if (changed) {
                    renderThunderRushBoard();
                    updateThunderHUD(ThunderRush.getState());
                }
            });

            // 移动端触摸长按标记
            boardEl.addEventListener('touchstart', function(e) {
                var cell = e.target.closest('.thunder-cell');
                if (!cell) return;
                var x = parseInt(cell.dataset.x);
                var y = parseInt(cell.dataset.y);
                if (isNaN(x) || isNaN(y)) return;

                var trState = ThunderRush.getState();
                if (trState.firstClick) return; // 首次点击前不允许标记

                e.preventDefault();
                if (thunderLongPressTimer) clearTimeout(thunderLongPressTimer);
                thunderLongPressTimer = setTimeout(function() {
                    thunderLongPressTimer = null;
                    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                    var changed = ThunderRush.handleCellClick(x, y, true);
                    if (changed) {
                        renderThunderRushBoard();
                        updateThunderHUD(ThunderRush.getState());
                    }
                }, 500);
            }, { passive: false });

            boardEl.addEventListener('touchend', function(e) {
                if (thunderLongPressTimer) {
                    clearTimeout(thunderLongPressTimer);
                    thunderLongPressTimer = null;
                    // 短按当作左键点击
                    var cell = e.target.closest('.thunder-cell');
                    if (!cell) return;
                    var x = parseInt(cell.dataset.x);
                    var y = parseInt(cell.dataset.y);
                    if (isNaN(x) || isNaN(y)) return;
                    var changed = ThunderRush.handleCellClick(x, y, false);
                    if (changed) {
                        renderThunderRushBoard();
                        updateThunderHUD(ThunderRush.getState());
                    }
                }
            }, { passive: false });

            boardEl.addEventListener('touchcancel', function(e) {
                if (thunderLongPressTimer) {
                    clearTimeout(thunderLongPressTimer);
                    thunderLongPressTimer = null;
                }
            }, { passive: false });
        }
    }

    function startThunderRush() {
        if (thunderLoopId) {
            clearTimeout(thunderLoopId);
            thunderLoopId = null;
        }
        if (thunderLongPressTimer) {
            clearTimeout(thunderLongPressTimer);
            thunderLongPressTimer = null;
        }
        ThunderRush.startGame();
        thunderGameActive = true;

        document.getElementById('thunder-start').classList.add('hidden');
        document.getElementById('thunder-over').classList.add('hidden');
        document.getElementById('thunder-game').classList.remove('hidden');

        renderThunderRushBoard();
        thunderLoop();
    }

    function showThunderRushStart() {
        thunderGameActive = false;
        if (thunderLoopId) {
            clearTimeout(thunderLoopId);
            thunderLoopId = null;
        }
        if (thunderLongPressTimer) {
            clearTimeout(thunderLongPressTimer);
            thunderLongPressTimer = null;
        }

        var stats = ThunderRush.getStats();
        document.getElementById('thunder-best-score').textContent = stats.bestScore;
        document.getElementById('thunder-best-streak').textContent = stats.bestStreak;

        document.getElementById('thunder-game').classList.add('hidden');
        document.getElementById('thunder-over').classList.add('hidden');
        document.getElementById('thunder-start').classList.remove('hidden');
    }

    function showThunderRushOver() {
        thunderGameActive = false;
        if (thunderLoopId) {
            clearTimeout(thunderLoopId);
            thunderLoopId = null;
        }
        if (thunderLongPressTimer) {
            clearTimeout(thunderLongPressTimer);
            thunderLongPressTimer = null;
        }

        var state = ThunderRush.getState();
        var stats = ThunderRush.getStats();

        document.getElementById('thunder-final-score').textContent = state.score;
        document.getElementById('thunder-final-solved').textContent = state.solvedCount;
        document.getElementById('thunder-final-streak').textContent = state.maxStreak;

        var newRecordEl = document.getElementById('thunder-new-record');
        if (state.score >= stats.bestScore && state.score > 0) {
            newRecordEl.classList.remove('hidden');
        } else {
            newRecordEl.classList.add('hidden');
        }

        document.getElementById('thunder-game').classList.add('hidden');
        document.getElementById('thunder-over').classList.remove('hidden');
    }

    function thunderLoop() {
        if (!thunderGameActive) return;

        var state = ThunderRush.getState();
        updateThunderHUD(state);

        if (state.gameState === 'ended') {
            showThunderRushOver();
            return;
        }

        thunderLoopId = setTimeout(thunderLoop, 100);
    }

    function updateThunderHUD(state) {
        var timerText = document.getElementById('thunder-timer-text');
        var timerBar = document.getElementById('thunder-timer-bar');
        var scoreEl = document.getElementById('thunder-score');
        var streakEl = document.getElementById('thunder-streak');
        var puzzleNumEl = document.getElementById('thunder-puzzle-num');
        var levelBadge = document.getElementById('thunder-level-badge');

        if (timerText) timerText.textContent = state.timePool.toFixed(1);
        if (timerBar) {
            var pct = Math.max(0, Math.min(100, (state.timePool / 60) * 100));
            timerBar.style.width = pct + '%';
            timerBar.classList.remove('warning', 'danger');
            if (pct < 15) timerBar.classList.add('danger');
            else if (pct < 35) timerBar.classList.add('warning');
        }
        if (scoreEl) scoreEl.textContent = state.score;
        if (streakEl) streakEl.textContent = state.streak;
        if (puzzleNumEl) puzzleNumEl.textContent = state.puzzleCount;
        if (levelBadge && state.board) levelBadge.textContent = state.board.levelName || '';
    }

    function renderThunderRushBoard() {
        var boardEl = document.getElementById('thunder-board');
        if (!boardEl) return;

        var state = ThunderRush.getState();
        var board = state.board;
        if (!board) return;

        var expectedCells = board.width * board.height;
        var existingCells = boardEl.querySelectorAll('.thunder-cell');

        if (existingCells.length !== expectedCells) {
            boardEl.innerHTML = '';
            boardEl.style.gridTemplateColumns = 'repeat(' + board.width + ', var(--thunder-cell, 56px))';
            for (var y = 0; y < board.height; y++) {
                for (var x = 0; x < board.width; x++) {
                    var cell = document.createElement('div');
                    cell.className = 'thunder-cell';
                    cell.dataset.x = x;
                    cell.dataset.y = y;
                    boardEl.appendChild(cell);
                }
            }
            existingCells = boardEl.querySelectorAll('.thunder-cell');
        }

        for (var y = 0; y < board.height; y++) {
            for (var x = 0; x < board.width; x++) {
                var idx = y * board.width + x;
                var cell = existingCells[idx];
                if (!cell) continue;

                var isRev = false;
                for (var i = 0; i < board.revealed.length; i++) {
                    if (board.revealed[i].x === x && board.revealed[i].y === y) {
                        isRev = true;
                        break;
                    }
                }

                var isFlag = false;
                for (var i = 0; i < board.flagged.length; i++) {
                    if (board.flagged[i].x === x && board.flagged[i].y === y) {
                        isFlag = true;
                        break;
                    }
                }

                var isMine = false;
                for (var i = 0; i < board.mines.length; i++) {
                    if (board.mines[i].x === x && board.mines[i].y === y) {
                        isMine = true;
                        break;
                    }
                }

                cell.className = 'thunder-cell';
                cell.textContent = '';

                if (isRev) {
                    cell.classList.add('revealed');
                    if (isMine) {
                        cell.classList.add('mine-hit');
                        cell.textContent = '💣';
                    } else {
                        var num = 0;
                        for (var dy = -1; dy <= 1; dy++) {
                            for (var dx = -1; dx <= 1; dx++) {
                                if (dx === 0 && dy === 0) continue;
                                var nx = x + dx;
                                var ny = y + dy;
                                var neighborMine = false;
                                for (var m = 0; m < board.mines.length; m++) {
                                    if (board.mines[m].x === nx && board.mines[m].y === ny) {
                                        neighborMine = true;
                                        break;
                                    }
                                }
                                if (neighborMine) num++;
                            }
                        }
                        if (num > 0) {
                            cell.textContent = num;
                            cell.classList.add('number-' + num);
                        }
                    }
                } else if (isFlag) {
                    cell.classList.add('flagged');
                    cell.textContent = '🚩';
                } else {
                    // 检查是否是刚踩中的雷（视觉反馈）
                    var isHit = false;
                    for (var i = 0; i < state.hitCells.length; i++) {
                        if (state.hitCells[i].x === x && state.hitCells[i].y === y) {
                            isHit = true;
                            break;
                        }
                    }
                    if (isHit) {
                        cell.classList.add('mine-hit');
                        cell.textContent = '💣';
                    }
                }
            }
        }
    }

    // ============ 星际博物馆 (Museum) ============

    function bindMuseumEvents() {
        if (typeof Museum === 'undefined') return;

        var gallery = document.getElementById('museum-gallery');
        if (gallery) {
            gallery.addEventListener('click', function(e) {
                var card = e.target.closest('.museum-card');
                if (!card) return;
                var id = card.dataset.id;
                if (!id) return;
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                showMuseumDetail(id);
            });
        }

        var detailBack = document.getElementById('museum-detail-back');
        if (detailBack) {
            detailBack.addEventListener('click', function() {
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                var detail = document.getElementById('museum-detail');
                var gallery = document.getElementById('museum-gallery');
                var progress = document.querySelector('.museum-progress');
                if (detail) detail.classList.add('hidden');
                if (gallery) gallery.classList.remove('hidden');
                if (progress) progress.classList.remove('hidden');
            });
        }
    }

    function renderMuseum() {
        if (typeof Museum === 'undefined') return;

        var newlyUnlocked = Museum.checkUnlocks();
        if (newlyUnlocked.length > 0 && typeof AudioManager !== 'undefined') {
            AudioManager.playWin();
        }

        updateMuseumProgress();

        var gallery = document.getElementById('museum-gallery');
        if (!gallery) return;

        var exhibits = Museum.getExhibits();
        gallery.innerHTML = '';

        for (var i = 0; i < exhibits.length; i++) {
            var ex = exhibits[i];
            var card = document.createElement('div');
            card.className = 'museum-card' + (ex.unlocked ? '' : ' locked');
            card.dataset.id = ex.id;

            var icon = document.createElement('div');
            icon.className = 'museum-card-icon';
            icon.textContent = ex.unlocked ? ex.icon : '🔒';

            var name = document.createElement('div');
            name.className = 'museum-card-name';
            name.textContent = ex.unlocked ? ex.name : '???';

            card.appendChild(icon);
            card.appendChild(name);
            gallery.appendChild(card);
        }

        var detail = document.getElementById('museum-detail');
        var gallery = document.getElementById('museum-gallery');
        var progress = document.querySelector('.museum-progress');
        if (detail) detail.classList.add('hidden');
        if (gallery) gallery.classList.remove('hidden');
        if (progress) progress.classList.remove('hidden');
    }

    function showMuseumDetail(id) {
        if (typeof Museum === 'undefined') return;

        var ex = Museum.getExhibit(id);
        if (!ex) return;

        var iconEl = document.getElementById('museum-detail-icon');
        var nameEl = document.getElementById('museum-detail-name');
        var descEl = document.getElementById('museum-detail-desc');
        var statusEl = document.getElementById('museum-detail-status');

        if (iconEl) iconEl.textContent = ex.unlocked ? ex.icon : '🔒';
        if (nameEl) nameEl.textContent = ex.unlocked ? ex.name : '未解锁的遗迹';
        if (descEl) descEl.textContent = ex.unlocked ? ex.desc : '完成特定挑战后，这座星际遗迹将向您敞开大门。继续探索扫雷宇宙吧！';
        if (statusEl) statusEl.textContent = ex.unlocked ? '✅ 已解锁' : '🔒 未解锁';

        var gallery = document.getElementById('museum-gallery');
        var progress = document.querySelector('.museum-progress');
        var detail = document.getElementById('museum-detail');
        if (gallery) gallery.classList.add('hidden');
        if (progress) progress.classList.add('hidden');
        if (detail) detail.classList.remove('hidden');
    }

    function updateMuseumProgress() {
        if (typeof Museum === 'undefined') return;
        var progress = Museum.getProgress();
        var fill = document.getElementById('museum-progress-fill');
        var text = document.getElementById('museum-progress-text');
        if (fill) {
            var pct = Math.max(0, Math.min(100, (progress.unlocked / progress.total) * 100));
            fill.style.width = pct + '%';
        }
        if (text) {
            text.textContent = progress.unlocked + ' / ' + progress.total;
        }
    }

    // ============ 布雷大师 (Mine Architect) ============

    var architectCurrentLevel = null;
    var architectPlayerMines = [];
    var architectStartTime = 0;
    var architectGameCompleted = false;

    function bindArchitectEvents() {
        if (typeof MineArchitect === 'undefined') return;

        var levelGrid = document.getElementById('architect-level-grid');
        if (levelGrid) {
            levelGrid.addEventListener('click', function(e) {
                var card = e.target.closest('.architect-level-card');
                if (!card) return;
                if (card.classList.contains('locked')) {
                    if (typeof AudioManager !== 'undefined') AudioManager.playLose();
                    card.style.animation = 'shake 0.3s ease';
                    setTimeout(function() { card.style.animation = ''; }, 300);
                    return;
                }
                var id = parseInt(card.dataset.id);
                if (isNaN(id)) return;
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                startArchitectGame(id);
            });
        }

        var gameBack = document.getElementById('architect-game-back');
        if (gameBack) {
            gameBack.addEventListener('click', function() {
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                var gameEl = document.getElementById('architect-game');
                var levelsEl = document.getElementById('architect-levels');
                if (gameEl) gameEl.classList.add('hidden');
                if (levelsEl) levelsEl.classList.remove('hidden');
                architectCurrentLevel = null;
                architectPlayerMines = [];
                architectGameCompleted = false;
                architectStartTime = 0;
            });
        }

        var boardEl = document.getElementById('architect-board');
        if (boardEl) {
            boardEl.addEventListener('click', function(e) {
                var cell = e.target.closest('.architect-cell');
                if (!cell) return;
                var x = parseInt(cell.dataset.x);
                var y = parseInt(cell.dataset.y);
                if (isNaN(x) || isNaN(y)) return;

                if (!architectCurrentLevel || architectGameCompleted) return;
                var levelData = architectCurrentLevel.data;

                // 不能点击 revealed 格子
                var isRevealed = false;
                for (var i = 0; i < levelData.revealed.length; i++) {
                    if (levelData.revealed[i].x === x && levelData.revealed[i].y === y) {
                        isRevealed = true;
                        break;
                    }
                }
                if (isRevealed) return;

                // 切换雷标记
                var idx = -1;
                for (var i = 0; i < architectPlayerMines.length; i++) {
                    if (architectPlayerMines[i].x === x && architectPlayerMines[i].y === y) {
                        idx = i;
                        break;
                    }
                }

                if (idx >= 0) {
                    architectPlayerMines.splice(idx, 1);
                    if (typeof AudioManager !== 'undefined') AudioManager.playUnflag();
                } else {
                    // 阻止过量放置
                    if (architectPlayerMines.length >= levelData.mineCount) {
                        var counterWrap = document.querySelector('.architect-mine-counter');
                        if (counterWrap) {
                            counterWrap.classList.remove('over-limit');
                            void counterWrap.offsetWidth; // 强制重绘，确保动画重新触发
                            counterWrap.classList.add('over-limit');
                            setTimeout(function() { counterWrap.classList.remove('over-limit'); }, 400);
                        }
                        return;
                    }
                    architectPlayerMines.push({x: x, y: y});
                    if (typeof AudioManager !== 'undefined') AudioManager.playFlag();
                }

                renderArchitectBoard();
                updateArchitectMineCounter();

                // 隐藏之前的反馈
                var feedback = document.getElementById('architect-feedback');
                if (feedback) feedback.classList.add('hidden');
            });
        }

        var resetBtn = document.getElementById('architect-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function() {
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                architectPlayerMines = [];
                renderArchitectBoard();
                updateArchitectMineCounter();
                var feedback = document.getElementById('architect-feedback');
                if (feedback) feedback.classList.add('hidden');
            });
        }

        var submitBtn = document.getElementById('architect-submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', function() {
                if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                if (!architectCurrentLevel || architectGameCompleted) return;
                var timeMs = Date.now() - architectStartTime;
                var result = MineArchitect.submitAnswer(architectCurrentLevel.data.id, architectPlayerMines, timeMs);
                showArchitectFeedback(result);
                if (result.correct) {
                    renderArchitectLevels();
                }
            });
        }
    }

    function renderArchitectLevels() {
        if (typeof MineArchitect === 'undefined') return;

        var grid = document.getElementById('architect-level-grid');
        if (!grid) return;

        var levels = MineArchitect.getLevels();
        grid.innerHTML = '';

        for (var i = 0; i < levels.length; i++) {
            var lvl = levels[i];
            var card = document.createElement('div');
            card.className = 'architect-level-card' + (lvl.unlocked ? '' : ' locked');
            card.dataset.id = lvl.id;

            var num = document.createElement('div');
            num.className = 'architect-level-num';
            num.textContent = lvl.id;

            var name = document.createElement('div');
            name.className = 'architect-level-name';
            name.textContent = lvl.unlocked ? lvl.name : '???';

            var info = document.createElement('div');
            info.className = 'architect-level-info';
            if (lvl.completed) {
                info.textContent = '⭐'.repeat(lvl.stars) + (lvl.stars < 3 ? '☆'.repeat(3 - lvl.stars) : '');
            } else if (lvl.unlocked) {
                info.textContent = lvl.width + '×' + lvl.height + ' · ' + lvl.mineCount + '雷';
            } else {
                info.textContent = '🔒 未解锁';
            }

            card.appendChild(num);
            card.appendChild(name);
            card.appendChild(info);
            grid.appendChild(card);
        }

        var levelsEl = document.getElementById('architect-levels');
        var gameEl = document.getElementById('architect-game');
        if (levelsEl) levelsEl.classList.remove('hidden');
        if (gameEl) gameEl.classList.add('hidden');
    }

    function startArchitectGame(id) {
        if (typeof MineArchitect === 'undefined') return;

        var level = MineArchitect.getLevel(id);
        if (!level || !level.unlocked) return;

        architectCurrentLevel = level;
        architectPlayerMines = [];
        architectStartTime = Date.now();
        architectGameCompleted = false;

        var title = document.getElementById('architect-game-title');
        if (title) title.textContent = level.data.name;

        var desc = document.getElementById('architect-game-desc');
        if (desc) desc.textContent = level.data.desc || '';

        // 恢复提交按钮和重置按钮，移除禁用状态
        var submitBtn = document.getElementById('architect-submit-btn');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '提交答案'; }
        var resetBtn = document.getElementById('architect-reset-btn');
        if (resetBtn) { resetBtn.disabled = false; }

        updateArchitectMineCounter();
        renderArchitectBoard();

        var feedback = document.getElementById('architect-feedback');
        if (feedback) feedback.classList.add('hidden');

        var levelsEl = document.getElementById('architect-levels');
        var gameEl = document.getElementById('architect-game');
        if (levelsEl) levelsEl.classList.add('hidden');
        if (gameEl) gameEl.classList.remove('hidden');

    }

    function renderArchitectBoard() {
        var boardEl = document.getElementById('architect-board');
        if (!boardEl || !architectCurrentLevel) return;

        var levelData = architectCurrentLevel.data;
        var w = levelData.width;
        var h = levelData.height;

        boardEl.innerHTML = '';
        boardEl.style.gridTemplateColumns = 'repeat(' + w + ', var(--architect-cell, 48px))';
        boardEl.style.gridTemplateRows = 'repeat(' + h + ', var(--architect-cell, 48px))';

        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var cell = document.createElement('div');
                cell.className = 'architect-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;

                // 检查是否是 revealed 格子
                var revealedNum = null;
                for (var i = 0; i < levelData.revealed.length; i++) {
                    if (levelData.revealed[i].x === x && levelData.revealed[i].y === y) {
                        revealedNum = levelData.revealed[i].num;
                        break;
                    }
                }

                if (revealedNum !== null) {
                    cell.classList.add('revealed');
                    if (revealedNum > 0) {
                        cell.textContent = revealedNum;
                        cell.classList.add('number-' + revealedNum);
                    }
                } else {
                    // 检查是否是玩家放置的雷
                    var isMine = false;
                    for (var i = 0; i < architectPlayerMines.length; i++) {
                        if (architectPlayerMines[i].x === x && architectPlayerMines[i].y === y) {
                            isMine = true;
                            break;
                        }
                    }
                    if (isMine) {
                        cell.classList.add('mined');
                        cell.textContent = '💣';
                    }
                    if (architectGameCompleted) {
                        cell.classList.add('disabled');
                    }
                }

                boardEl.appendChild(cell);
            }
        }
    }

    function updateArchitectMineCounter() {
        if (!architectCurrentLevel) return;
        var placed = document.getElementById('architect-placed');
        var target = document.getElementById('architect-target');
        if (placed) placed.textContent = architectPlayerMines.length;
        if (target) target.textContent = architectCurrentLevel.data.mineCount;
    }

    function showArchitectFeedback(result) {
        var feedback = document.getElementById('architect-feedback');
        if (!feedback) return;

        feedback.classList.remove('hidden');
        if (result.correct) {
            architectGameCompleted = true;
            feedback.className = 'architect-feedback correct';
            var nextId = architectCurrentLevel.data.id + 1;
            var hasNext = nextId <= 10;
            feedback.innerHTML = '<strong>🎉 回答正确！</strong><br>所有数字约束均满足。' +
                (hasNext ? '<br><button id="architect-next-btn" class="primary-btn architect-next-btn">下一关 →</button>' : '<br><em>全部关卡已完成！</em>');
            if (typeof AudioManager !== 'undefined') AudioManager.playWin();

            // 禁用提交按钮和重置按钮
            var submitBtn = document.getElementById('architect-submit-btn');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '已完成'; }
            var resetBtn = document.getElementById('architect-reset-btn');
            if (resetBtn) { resetBtn.disabled = true; }

            // 绑定下一关按钮
            if (hasNext) {
                setTimeout(function() {
                    var nextBtn = document.getElementById('architect-next-btn');
                    if (nextBtn) {
                        nextBtn.addEventListener('click', function() {
                            if (typeof AudioManager !== 'undefined') AudioManager.playClick();
                            startArchitectGame(nextId);
                        });
                    }
                }, 0);
            }
        } else {
            feedback.className = 'architect-feedback incorrect';
            if (result.reason) {
                feedback.innerHTML = '<strong>❌ 回答有误</strong><br>' + escapeHtml(result.reason);
            } else if (typeof result.x === 'number') {
                feedback.innerHTML = '<strong>❌ 数字不匹配</strong><br>位置 (' + result.x + ',' + result.y + ') 期望 ' + result.expected + ' 个雷，实际 ' + result.actual + ' 个。';
            } else {
                feedback.innerHTML = '<strong>❌ 回答有误</strong><br>请检查雷的分布。';
            }
            if (typeof AudioManager !== 'undefined') AudioManager.playLose();
        }
    }

    return {
        init,
        showScreen,
        updateContinueButton,
        updateAchievementBadge
    };
})();
