/**
 * 新手教程模块
 * 交互式步骤引导 + 实战练习
 */

const Tutorial = (function() {
    let currentStep = 0;
    let practiceBoard = null;
    let practiceCells = [];
    let practiceState = 'idle';
    let expectedAction = null; // 期望玩家执行的操作

    const steps = [
        {
            id: 'welcome',
            title: '欢迎来到扫雷！',
            icon: '👋',
            content: `
                <p>扫雷是一款经典的逻辑推理游戏。你的目标是<strong>找出所有隐藏的雷</strong>，同时不踩到它们。</p>
                <div class="tutorial-highlight">
                    <div class="tut-demo-grid small">
                        <div class="tut-cell revealed">1</div>
                        <div class="tut-cell mine">💣</div>
                        <div class="tut-cell revealed">1</div>
                        <div class="tut-cell revealed">1</div>
                        <div class="tut-cell revealed">2</div>
                        <div class="tut-cell revealed">1</div>
                        <div class="tut-cell hidden"></div>
                        <div class="tut-cell revealed">1</div>
                        <div class="tut-cell hidden"></div>
                    </div>
                    <p class="tut-caption">💡 数字 = 周围8格中雷的数量</p>
                </div>
                <p>完成教程后，你将掌握扫雷的基本技巧，足以挑战初级难度！</p>
            `
        },
        {
            id: 'controls',
            title: '基本操作',
            icon: '🖱️',
            content: `
                <div class="tutorial-cards">
                    <div class="tut-card">
                        <div class="tut-card-icon">🖱️左键</div>
                        <p>揭开一个格子</p>
                        <div class="tut-card-demo">
                            <div class="tut-cell hidden">?</div>
                            <span>→</span>
                            <div class="tut-cell revealed">2</div>
                        </div>
                    </div>
                    <div class="tut-card">
                        <div class="tut-card-icon">🖱️右键</div>
                        <p>标记/取消标记为雷</p>
                        <div class="tut-card-demo">
                            <div class="tut-cell hidden">?</div>
                            <span>→</span>
                            <div class="tut-cell flagged">🚩</div>
                        </div>
                    </div>
                    <div class="tut-card">
                        <div class="tut-card-icon">🖱️中键/双击</div>
                        <p>快速揭开周围格子</p>
                        <div class="tut-card-demo">
                            <div class="tut-cell revealed">2</div>
                            <span>→</span>
                            <div class="tut-cell revealed">✨</div>
                        </div>
                    </div>
                </div>
                <p class="tutorial-tip">💡 <strong>提示：</strong>第一次点击永远不会是雷！</p>
            `
        },
        {
            id: 'numbers',
            title: '理解数字',
            icon: '🔢',
            content: `
                <p>格子中的数字告诉你<strong>周围8个方向</strong>上有多少颗雷。</p>
                <div class="tutorial-highlight">
                    <div class="tut-number-demo">
                        <div class="tut-num-row">
                            <div class="tut-cell hidden"></div>
                            <div class="tut-cell hidden"></div>
                            <div class="tut-cell hidden"></div>
                        </div>
                        <div class="tut-num-row">
                            <div class="tut-cell hidden"></div>
                            <div class="tut-cell revealed num-2" style="position:relative;">2
                                <div class="tut-arrow up"></div>
                                <div class="tut-arrow down"></div>
                                <div class="tut-arrow left"></div>
                                <div class="tut-arrow right"></div>
                                <div class="tut-arrow up-left"></div>
                                <div class="tut-arrow up-right"></div>
                                <div class="tut-arrow down-left"></div>
                                <div class="tut-arrow down-right"></div>
                            </div>
                            <div class="tut-cell mine">💣</div>
                        </div>
                        <div class="tut-num-row">
                            <div class="tut-cell mine">💣</div>
                            <div class="tut-cell hidden"></div>
                            <div class="tut-cell hidden"></div>
                        </div>
                    </div>
                    <p class="tut-caption">数字2周围正好有2颗雷 💣💣</p>
                </div>
                <div class="tutorial-examples">
                    <h4>常见模式：</h4>
                    <div class="tut-pattern">
                        <div class="tut-pattern-grid">
                            <div class="tut-cell revealed">1</div>
                            <div class="tut-cell revealed">1</div>
                            <div class="tut-cell revealed">1</div>
                            <div class="tut-cell hidden" style="border:2px solid var(--danger)"></div>
                            <div class="tut-cell hidden" style="border:2px solid var(--danger)"></div>
                            <div class="tut-cell hidden" style="border:2px solid var(--danger)"></div>
                        </div>
                        <p>三个1排成一列 → 下面三个都是雷！</p>
                    </div>
                </div>
            `
        },
        {
            id: 'chord',
            title: '快速揭开（Chord）',
            icon: '⚡',
            content: `
                <p>当你在一个数字周围标记了<strong>相应数量的雷</strong>时，可以快速揭开剩余格子！</p>
                <div class="tutorial-highlight">
                    <div class="tut-chord-demo">
                        <div class="tut-chord-before">
                            <p>标记前：</p>
                            <div class="tut-demo-grid">
                                <div class="tut-cell flagged">🚩</div>
                                <div class="tut-cell revealed num-2">2</div>
                                <div class="tut-cell hidden"></div>
                                <div class="tut-cell hidden"></div>
                                <div class="tut-cell hidden"></div>
                                <div class="tut-cell hidden"></div>
                            </div>
                        </div>
                        <div class="tut-chord-arrow">➡️ 中键/双击</div>
                        <div class="tut-chord-after">
                            <p>标记后：</p>
                            <div class="tut-demo-grid">
                                <div class="tut-cell flagged">🚩</div>
                                <div class="tut-cell revealed num-2">2</div>
                                <div class="tut-cell revealed">1</div>
                                <div class="tut-cell revealed"></div>
                                <div class="tut-cell revealed"></div>
                                <div class="tut-cell revealed"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <p class="tutorial-tip">💡 这个功能是提速的关键，熟练后通关速度能提升数倍！</p>
            `
        },
        {
            id: 'practice',
            title: '实战练习',
            icon: '🎯',
            content: `
                <p>下面是一个专门设计的练习板，<strong>没有运气成分</strong>，纯靠逻辑就能解开。</p>
                <p class="tutorial-task" id="tutorial-task-text">请点击左上角的格子开始游戏！</p>
                <div class="tutorial-practice-board" id="tutorial-practice-board"></div>
                <div class="tutorial-practice-hint" id="practice-hint"></div>
            `,
            isPractice: true
        },
        {
            id: 'finish',
            title: '恭喜完成教程！',
            icon: '🎉',
            content: `
                <p>你已经掌握了扫雷的基本技巧！</p>
                <div class="tutorial-summary">
                    <div class="tut-check">
                        <span>✅</span> 左键揭开格子
                    </div>
                    <div class="tut-check">
                        <span>✅</span> 右键标记雷
                    </div>
                    <div class="tut-check">
                        <span>✅</span> 理解数字含义
                    </div>
                    <div class="tut-check">
                        <span>✅</span> 使用快速揭开
                    </div>
                </div>
                <p>现在就去挑战真正的扫雷吧！建议从<strong>初级</strong>开始。</p>
                <div class="tut-recommend">
                    <button class="menu-btn" id="tutorial-start-game" style="margin-top:1rem;">
                        <span class="btn-icon">▶️</span>
                        <span class="btn-text">开始初级游戏</span>
                    </button>
                </div>
            `
        }
    ];

    // 练习板的预设布局 (6x6, 6颗雷)
    const practiceLayout = [
        [0, 0, 0, 0, 1, 1],
        [0, 0, 0, 0, 1, 9],
        [1, 1, 1, 0, 1, 1],
        [1, 9, 1, 0, 0, 0],
        [1, 1, 1, 0, 1, 1],
        [0, 0, 0, 0, 1, 9]
    ];

    function init() {
        var nextBtn = document.getElementById('tutorial-next');
        var prevBtn = document.getElementById('tutorial-prev');
        var finishBtn = document.getElementById('tutorial-finish');
        if (nextBtn) nextBtn.addEventListener('click', nextStep);
        if (prevBtn) prevBtn.addEventListener('click', prevStep);
        if (finishBtn) finishBtn.addEventListener('click', finishTutorial);
    }

    function start() {
        currentStep = 0;
        renderStep();
    }

    function renderStep() {
        const step = steps[currentStep];
        const container = document.getElementById('tutorial-content');
        const progress = document.getElementById('tutorial-progress');
        const prevBtn = document.getElementById('tutorial-prev');
        const nextBtn = document.getElementById('tutorial-next');
        const finishBtn = document.getElementById('tutorial-finish');

        progress.style.width = ((currentStep + 1) / steps.length * 100) + '%';
        
        container.innerHTML = `
            <div class="tutorial-step-header">
                <div class="tutorial-step-icon">${step.icon}</div>
                <h3>${step.title}</h3>
            </div>
            <div class="tutorial-step-body">
                ${step.content}
            </div>
        `;

        prevBtn.disabled = currentStep === 0;
        
        if (currentStep === steps.length - 1) {
            nextBtn.classList.add('hidden');
            finishBtn.classList.remove('hidden');
            finishBtn.classList.add('primary');
            
            const startBtn = document.getElementById('tutorial-start-game');
            if (startBtn) {
                startBtn.addEventListener('click', () => {
                    AudioManager.playClick();
                    Game.start('beginner');
                    UI.showScreen('game-screen');
                });
            }
        } else {
            nextBtn.classList.remove('hidden');
            finishBtn.classList.add('hidden');
            finishBtn.classList.remove('primary');
        }

        // 如果是练习步骤，初始化练习板
        if (step.isPractice) {
            initPracticeBoard();
        }
    }

    function nextStep() {
        AudioManager.playClick();
        if (currentStep < steps.length - 1) {
            currentStep++;
            renderStep();
        }
    }

    function prevStep() {
        AudioManager.playClick();
        if (currentStep > 0) {
            currentStep--;
            renderStep();
        }
    }

    function finishTutorial() {
        AudioManager.playWin();
        UI.showScreen('main-menu');
    }

    function initPracticeBoard() {
        practiceBoard = new MinesweeperBoard(6, 6, 6);
        
        // 手动设置练习板
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
                practiceBoard.cells[y][x].isMine = practiceLayout[y][x] === 9;
            }
        }
        practiceBoard.mines = [];
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
                if (practiceLayout[y][x] === 9) {
                    practiceBoard.mines.push({ x, y });
                }
            }
        }
        practiceBoard.calculateNumbers();
        practiceBoard.firstClick = false;
        practiceState = 'idle';
        expectedAction = { type: 'reveal', x: 0, y: 0 };

        renderPracticeBoard();
        updatePracticeHint();
    }

    function renderPracticeBoard() {
        const container = document.getElementById('tutorial-practice-board');
        if (!container) return;
        
        container.innerHTML = '';
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(6, 36px)';
        container.style.gap = '2px';
        container.style.justifyContent = 'center';
        container.style.marginTop = '1rem';

        practiceCells = [];
        for (let y = 0; y < 6; y++) {
            const row = [];
            for (let x = 0; x < 6; x++) {
                const cell = document.createElement('div');
                cell.className = 'tut-practice-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.style.width = '36px';
                cell.style.height = '36px';
                cell.style.background = 'var(--bg-lighter)';
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                cell.style.justifyContent = 'center';
                cell.style.borderRadius = '4px';
                cell.style.cursor = 'pointer';
                cell.style.fontWeight = 'bold';
                cell.style.fontSize = '0.9rem';
                cell.style.transition = 'all 0.15s';
                cell.style.userSelect = 'none';
                
                cell.addEventListener('mousedown', handlePracticeMouseDown);
                cell.addEventListener('contextmenu', e => e.preventDefault());
                
                container.appendChild(cell);
                row.push(cell);
            }
            practiceCells.push(row);
        }
        
        updatePracticeDisplay();
    }

    function updatePracticeDisplay() {
        if (!practiceBoard) return;
        
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
                const cell = practiceBoard.cells[y][x];
                const el = practiceCells[y][x];
                
                el.style.background = '';
                el.style.border = '';
                el.textContent = '';
                el.className = 'tut-practice-cell';
                
                if (cell.isRevealed) {
                    el.style.background = 'var(--bg)';
                    if (cell.isMine) {
                        el.textContent = '💣';
                        el.style.background = 'var(--danger)';
                    } else if (cell.number > 0) {
                        el.classList.add('num-' + cell.number);
                        el.textContent = cell.number;
                    }
                } else if (cell.isFlagged) {
                    el.textContent = '🚩';
                    el.style.background = 'var(--warning)';
                }
            }
        }

        // 高亮期望操作
        if (expectedAction && practiceState !== 'won' && practiceState !== 'lost') {
            const { x, y } = expectedAction;
            const el = practiceCells[y][x];
            if (el && !practiceBoard.cells[y][x].isRevealed && !practiceBoard.cells[y][x].isFlagged) {
                el.style.boxShadow = '0 0 0 3px var(--secondary), 0 0 15px var(--secondary)';
                el.style.animation = 'pulse 1.5s infinite';
            }
        }
    }

    function handlePracticeMouseDown(e) {
        e.preventDefault();
        const x = parseInt(e.target.dataset.x);
        const y = parseInt(e.target.dataset.y);
        if (isNaN(x) || isNaN(y) || !practiceBoard) return;

        if (e.button === 0) {
            // 左键揭开
            const result = practiceBoard.reveal(x, y);
            if (result.changed && !result.hitMine) {
                AudioManager.playReveal();
                checkPracticeProgress();
            } else if (result.hitMine) {
                AudioManager.playLose();
                practiceState = 'lost';
                practiceBoard.revealAll();
                document.getElementById('tutorial-task-text').innerHTML = 
                    '<span style="color:var(--danger)">💥 你踩到雷了！没关系，再试一次吧。</span>';
                setTimeout(() => {
                    initPracticeBoard();
                    document.getElementById('tutorial-task-text').textContent = '请点击左上角的格子开始游戏！';
                }, 1500);
            }
        } else if (e.button === 2) {
            // 右键标记
            AudioManager.playClick();
            const cell = practiceBoard.cells[y][x];
            if (cell.isFlagged) {
                cell.isFlagged = false;
                practiceBoard.flaggedCount--;
            } else if (!cell.isRevealed) {
                cell.isFlagged = true;
                practiceBoard.flaggedCount++;
            }
            checkPracticeProgress();
        }
        
        updatePracticeDisplay();
        updatePracticeHint();
    }

    function checkPracticeProgress() {
        if (practiceBoard.checkWin()) {
            practiceState = 'won';
            AudioManager.playWin();
            document.getElementById('tutorial-task-text').innerHTML = 
                '<span style="color:var(--secondary)">🎉 太棒了！你成功完成了练习！</span>';
            expectedAction = null;
            return;
        }

        // 根据当前状态决定下一步期望操作
        determineNextExpectedAction();
    }

    function determineNextExpectedAction() {
        // 简单的引导逻辑：找第一个未揭开且安全的格子提示
        // 或者找应该被标记的雷
        
        // 先检查是否有明显的雷需要标记
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
                const cell = practiceBoard.cells[y][x];
                if (!cell.isRevealed || cell.number === 0) continue;
                
                let hidden = [];
                let flags = 0;
                practiceBoard.forEachNeighbor(x, y, (nx, ny) => {
                    const n = practiceBoard.cells[ny][nx];
                    if (n.isFlagged) flags++;
                    else if (!n.isRevealed) hidden.push({ x: nx, y: ny });
                });
                
                // 如果隐藏数 == 剩余雷数，且还有未标记的雷
                if (hidden.length > 0 && hidden.length === cell.number - flags) {
                    const unflagged = hidden.filter(({ x, y }) => !practiceBoard.cells[y][x].isFlagged);
                    if (unflagged.length > 0) {
                        expectedAction = { type: 'flag', x: unflagged[0].x, y: unflagged[0].y };
                        return;
                    }
                }
                
                // 如果已经标够了，还有安全的可以揭开
                if (flags === cell.number && hidden.length > 0) {
                    expectedAction = { type: 'reveal', x: hidden[0].x, y: hidden[0].y };
                    return;
                }
            }
        }
        
        // 否则找任意一个安全的未揭开格子
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
                const cell = practiceBoard.cells[y][x];
                if (!cell.isRevealed && !cell.isMine && !cell.isFlagged) {
                    expectedAction = { type: 'reveal', x, y };
                    return;
                }
            }
        }
        
        expectedAction = null;
    }

    function updatePracticeHint() {
        const hintEl = document.getElementById('practice-hint');
        if (!hintEl || !expectedAction) return;
        
        const { x, y, type } = expectedAction;
        if (type === 'reveal') {
            hintEl.textContent = `💡 提示：尝试揭开 (${x+1},${y+1}) 位置的格子`;
        } else if (type === 'flag') {
            hintEl.textContent = `💡 提示：请右键标记 (${x+1},${y+1}) 位置的格子`;
        }
        hintEl.style.color = 'var(--secondary)';
        hintEl.style.marginTop = '0.75rem';
        hintEl.style.fontSize = '0.9rem';
    }

    return {
        init,
        start
    };
})();
