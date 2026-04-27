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
        updateContinueButton();
        updateAchievementBadge();
    }

    function showScreen(name) {
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
        }
    }

    function bindMenuEvents() {
        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                AudioManager.playClick();
                const action = btn.dataset.action;
                switch (action) {
                    case 'play':
                        showScreen('difficulty-screen');
                        break;
                    case 'daily':
                        startDailyChallenge();
                        break;
                    case 'continue':
                        if (Game.loadSaved()) {
                            showScreen('game-screen');
                        }
                        break;
                    case 'challenge':
                        showScreen('challenge-screen');
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
                AudioManager.playClick();
                const diff = card.dataset.diff;
                if (diff === 'custom') {
                    const w = document.getElementById('custom-width').value;
                    const h = document.getElementById('custom-height').value;
                    const m = document.getElementById('custom-mines').value;
                    Game.start('custom', { width: w, height: h, mines: m });
                } else {
                    Game.start(diff);
                }
                showScreen('game-screen');
            });
        });
    }

    function updateDifficultyBests() {
        const stats = Stats.getAll();
        ['beginner', 'intermediate', 'expert', 'master'].forEach(diff => {
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
            AudioManager.playClick();
            const state = Game.getState();
            Game.start(state.difficulty);
        });

        document.getElementById('menu-btn').addEventListener('click', () => {
            AudioManager.playClick();
            Game.pause();
            document.getElementById('pause-overlay').classList.remove('hidden');
        });

        document.getElementById('pause-btn').addEventListener('click', () => {
            AudioManager.playClick();
            Game.pause();
            document.getElementById('pause-overlay').classList.remove('hidden');
        });

        document.getElementById('undo-btn').addEventListener('click', () => {
            AudioManager.playClick();
            Game.undo();
        });

        document.getElementById('hint-btn').addEventListener('click', () => {
            AudioManager.playClick();
            showHint();
        });

        document.getElementById('auto-flag-btn').addEventListener('click', () => {
            AudioManager.playClick();
            Game.autoFlag();
        });

        // 道具按钮
        var powerupBtns = document.querySelectorAll('.powerup-slot');
        powerupBtns.forEach(function(btn, i) {
            btn.addEventListener('click', function() {
                var keys = ['scanner', 'shield', 'freeze', 'heatmap'];
                var key = keys[i];
                if (key) {
                    AudioManager.playClick();
                    Game.usePowerup(key);
                }
            });
        });

        document.getElementById('save-btn').addEventListener('click', () => {
            AudioManager.playClick();
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
            }
        }

        // 更新信息栏
        document.getElementById('mine-count').textContent = 
            Math.max(0, board.mineCount - board.flaggedCount);
        document.getElementById('timer').textContent = padStart(String(detail.time), 3, '0');
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
        const progress = ((board.revealedCount / (total - board.mineCount)) * 100);
        document.getElementById('progress-fill').style.width = progress + '%';

        // 难度标签
        const diffNames = {
            beginner: '初级',
            intermediate: '中级',
            expert: '高级',
            master: '大师',
            custom: '自定义'
        };
        document.getElementById('difficulty-label').textContent = 
            diffNames[detail.difficulty] || detail.difficulty;

        // 种子显示
        const seedEl = document.getElementById('seed-display');
        if (seedEl && detail.seed) {
            seedEl.textContent = '种子: ' + detail.seed;
            seedEl.style.fontSize = '0.75rem';
            seedEl.style.opacity = '0.6';
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
            AudioManager.playReveal();
            Game.reveal(x, y);
        } else if (e.button === 2) {
            // 右键
            AudioManager.playClick();
            Game.flag(x, y);
        } else if (e.button === 1) {
            // 中键 = chord
            if (Settings.get('chord')) {
                AudioManager.playChord();
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
        if (!Settings.get('longPress')) return;
        const x = parseInt(e.target.dataset.x);
        const y = parseInt(e.target.dataset.y);
        if (isNaN(x) || isNaN(y)) return;

        longPressTimer = setTimeout(() => {
            e.preventDefault();
            AudioManager.playClick();
            Game.flag(x, y);
            longPressTimer = null;
        }, 500);
    }

    function handleTouchEnd(e) {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
            // 如果不是长按，当作左键点击
            const x = parseInt(e.target.dataset.x);
            const y = parseInt(e.target.dataset.y);
            if (!isNaN(x) && !isNaN(y)) {
                AudioManager.playReveal();
                Game.reveal(x, y);
            }
        }
    }

    function bindOverlayEvents() {
        document.getElementById('resume-btn').addEventListener('click', () => {
            AudioManager.playClick();
            document.getElementById('pause-overlay').classList.add('hidden');
            Game.resume();
        });

        document.getElementById('restart-pause-btn').addEventListener('click', () => {
            AudioManager.playClick();
            document.getElementById('pause-overlay').classList.add('hidden');
            const state = Game.getState();
            Game.start(state.difficulty);
        });

        document.getElementById('quit-btn').addEventListener('click', () => {
            AudioManager.playClick();
            document.getElementById('pause-overlay').classList.add('hidden');
            Game.pause();
            showScreen('main-menu');
        });

        document.getElementById('play-again-btn').addEventListener('click', () => {
            AudioManager.playClick();
            document.getElementById('gameover-overlay').classList.add('hidden');
            const state = Game.getState();
            Game.start(state.difficulty);
        });

        document.getElementById('go-menu-btn').addEventListener('click', () => {
            AudioManager.playClick();
            document.getElementById('gameover-overlay').classList.add('hidden');
            showScreen('main-menu');
        });

        document.getElementById('share-seed-btn').addEventListener('click', () => {
            AudioManager.playClick();
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
            AudioManager.playClick();
            document.getElementById('gameover-overlay').classList.add('hidden');
            const state = Game.getState();
            Game.start(state.difficulty, null, null, state.seed);
        });

        document.getElementById('hint-ok-btn').addEventListener('click', () => {
            AudioManager.playClick();
            document.getElementById('hint-overlay').classList.add('hidden');
        });

        var modeInfoOk = document.getElementById('mode-info-ok-btn');
        if (modeInfoOk) {
            modeInfoOk.addEventListener('click', function() {
                AudioManager.playClick();
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
                            AudioManager.playReveal();
                            Game.reveal(focusX, focusY);
                        }
                        return;
                    case 'f':
                    case 'F':
                        e.preventDefault();
                        if (focusVisible) {
                            AudioManager.playClick();
                            Game.flag(focusX, focusY);
                        }
                        return;
                    case 'c':
                    case 'C':
                        e.preventDefault();
                        if (focusVisible) {
                            AudioManager.playChord();
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
                    if (soundToggle) {
                        soundToggle.checked = !soundToggle.checked;
                        Settings.set('sound', soundToggle.checked);
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
                AudioManager.playClick();
                const target = btn.dataset.back;
                showScreen(target);
            });
        });
    }

    function bindSettingsEvents() {
        // 旧版主题按钮（兼容游戏内可能存在的元素）
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                AudioManager.playClick();
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                Settings.set('theme', btn.dataset.theme);
            });
        });

        // 设置标签页导航
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                AudioManager.playClick();
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
                AudioManager.playClick();
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyStylePreset(btn.dataset.preset);
            });
        });

        // 模式选择
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                AudioManager.playClick();
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
                AudioManager.playClick();
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
                AudioManager.playClick();
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
                AudioManager.playClick();
                const type = btn.dataset.preview;
                if (type === 'click') AudioManager.playClick();
                else if (type === 'success') AudioManager.playWin();
                else if (type === 'error') AudioManager.playLose();
                else if (type === 'flag') AudioManager.playFlag();
            });
        });

        // 恢复默认按钮
        (function(el) { if (el) el.addEventListener('click', function() {
            AudioManager.playClick();
            Settings.set('sfxVolume', 70);
            Settings.set('sfxStyle', 'classic');
            loadSettingsUI();
        }); })(document.getElementById('reset-sfx-default'));
        (function(el) { if (el) el.addEventListener('click', function() {
            AudioManager.playClick();
            Settings.set('musicVolume', 30);
            Settings.set('musicTempo', 100);
            Settings.set('musicStyle', 'orchestral');
            loadSettingsUI();
        }); })(document.getElementById('reset-music-default'));
        (function(el) { if (el) el.addEventListener('click', function() {
            AudioManager.playClick();
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
            AudioManager.playClick();
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
            AudioManager.playClick();
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
            AudioManager.playClick();
            showHintOverlay('样式预设已保存！');
        }); })(document.getElementById('save-style-preset'));
        (function(el) { if (el) el.addEventListener('click', function() {
            AudioManager.playClick();
            Settings.reset();
            loadSettingsUI();
            showHintOverlay('样式已恢复默认');
        }); })(document.getElementById('reset-style-default'));

        // 恢复全部默认
        (function(el) { if (el) el.addEventListener('click', function() {
            AudioManager.playClick();
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
                    AudioManager.playClick();
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
                AudioManager.playClick();
                document.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.stats-panel').forEach(p => p.classList.remove('active'));
                document.getElementById('stats-' + tab.dataset.tab).classList.add('active');
            });
        });

        document.getElementById('reset-stats-btn').addEventListener('click', () => {
            AudioManager.playClick();
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
            expert: '高级', master: '大师', custom: '自定义'
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
            expert: '高级', master: '大师', custom: '自定义'
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
                AudioManager.playClick();
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderLeaderboard(btn.dataset.filter);
            });
        });
    }

    function bindChallengeEvents() {
        document.querySelectorAll('.challenge-play').forEach(btn => {
            btn.addEventListener('click', () => {
                AudioManager.playClick();
                const item = btn.closest('.challenge-item');
                const challenge = item.dataset.challenge;
                
                let diff = 'intermediate';
                if (challenge === 'time-attack') diff = 'expert';
                if (challenge === 'blind') diff = 'beginner';
                if (challenge === 'fog') diff = 'intermediate';
                if (challenge === 'survival') diff = 'intermediate';
                
                Game.start(diff, null, challenge);
                showScreen('game-screen');
                var infoMap = {
                    'speedrun': { name: '竞速挑战', desc: '尽可能快地完成中级难度，连胜会被记录！' },
                    'no-flag': { name: '无标记挑战', desc: '全程不能使用旗帜，考验你的记忆力！' },
                    'blind': { name: '盲扫挑战', desc: '仅前5次揭示可见数字，之后全凭记忆！' },
                    'time-attack': { name: '限时挑战', desc: '60秒内完成高级难度，与时间赛跑！' },
                    'fog': { name: '迷雾挑战', desc: '视野受限，只有已揭示区域周围可见！' },
                    'survival': { name: '生存挑战', desc: '连续解关，3条命，难度逐关递增！' }
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
        AudioManager.playClick();
        // 根据日期生成固定种子
        const today = new Date();
        const dateStr = today.getFullYear() + '' + (today.getMonth() + 1) + '' + today.getDate();
        let seed = 0;
        for (let i = 0; i < dateStr.length; i++) {
            seed = (seed * 31 + dateStr.charCodeAt(i)) % 1000000000;
        }
        
        // 每日挑战固定为中级难度
        Game.start('intermediate', null, 'daily', seed);
        showScreen('game-screen');
        
        // 检查今日是否已完成
        const lastDaily = Storage.get('last_daily');
        const todayKey = dateStr;
        if (lastDaily === todayKey) {
            const dailyBest = Storage.get('daily_best');
            if (dailyBest) {
                setTimeout(() => {
                    showHintOverlay(`今日最佳时间: ${dailyBest}秒`);
                }, 500);
            }
        }
    }

    function bindAchievementsEvents() {
        document.querySelectorAll('.ach-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                AudioManager.playClick();
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
                    if (p >= 0.7) el.classList.add('heat-high');
                    else if (p >= 0.3) el.classList.add('heat-mid');
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
                    AudioManager.playClick();
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
                AudioManager.playClick();
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

        if (livesEl) {
            livesEl.textContent = '❤️'.repeat(detail.lives || 0) + '🖤'.repeat((detail.maxLives || 3) - (detail.lives || 0));
            livesEl.style.display = detail.challengeMode === 'survival' ? 'inline' : 'none';
        }
        if (comboEl) {
            comboEl.textContent = 'Combo: ' + (detail.combo || 0);
            comboEl.style.display = (detail.combo > 0 && detail.challengeMode === 'survival') ? 'inline' : 'none';
        }
        if (scoreEl) {
            scoreEl.textContent = 'Score: ' + (detail.survivalScore || 0);
            scoreEl.style.display = detail.challengeMode === 'survival' ? 'inline' : 'none';
        }
        if (levelEl) {
            levelEl.textContent = 'Lv.' + ((detail.survivalLevel || 0) + 1);
            levelEl.style.display = detail.challengeMode === 'survival' ? 'inline' : 'none';
        }
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

    return {
        init,
        showScreen,
        updateContinueButton,
        updateAchievementBadge
    };
})();
