/**
 * 模式训练道馆 (Pattern Dojo)
 * 交互式扫雷推理模式训练模块
 * 帮助玩家掌握从基础到高级的经典扫雷推理模式
 */

const PatternDojo = (function() {
    const STORAGE_KEY = 'pattern_dojo';
    const MAX_TRAINING_PER_PATTERN = 5;

    // ==================== 模式数据 ====================
    // 每种模式包含：id, name, level, description, explanation,
    // exampleBoard(5x5显示状态), exampleMines(雷位置),
    // trainingBoards(训练题数组)
    //
    // 棋盘编码：-1 = 未揭示(玩家可点击), 0-8 = 已揭示数字

    var PATTERNS = [
        {
            id: 'corner-1',
            name: '角落数字1',
            level: 1,
            description: '当角落的数字是1，且周围只有1个未揭开的格子时，那个格子一定是雷。',
            explanation: '数字1表示周围恰好有1颗雷。如果它已经在角落，周围只有3个格子，其中2个已揭示为空，那么唯一的未揭格必定是雷。',
            exampleBoard: [
                [-1, -1, -1],
                [-1,  1,  0],
                [-1,  0,  0]
            ],
            exampleMines: [{x: 0, y: 0}],
            trainingBoards: [
                {
                    grid: [
                        [-1, -1, -1],
                        [-1,  1,  0],
                        [-1,  0,  0]
                    ],
                    mines: [{x: 0, y: 0}],
                    explanation: '角落的1周围只有(0,0)这一个未揭格，所以(0,0)一定是雷。'
                },
                {
                    grid: [
                        [-1, -1, -1],
                        [ 0,  1, -1],
                        [ 0,  0, -1]
                    ],
                    mines: [{x: 2, y: 0}],
                    explanation: '右上角的1，周围未揭格只有(2,0)，必定是雷。'
                },
                {
                    grid: [
                        [ 0,  0, -1],
                        [ 0,  1, -1],
                        [-1, -1, -1]
                    ],
                    mines: [{x: 2, y: 2}],
                    explanation: '右下角的1，周围未揭格只有(2,2)，必定是雷。'
                },
                {
                    grid: [
                        [-1,  0,  0],
                        [-1,  1,  0],
                        [-1, -1, -1]
                    ],
                    mines: [{x: 0, y: 2}],
                    explanation: '左下角的1，周围未揭格只有(0,2)，必定是雷。'
                },
                {
                    grid: [
                        [-1, -1, -1, -1],
                        [-1,  1,  0,  0],
                        [-1,  0,  0,  0],
                        [-1,  0,  0,  0]
                    ],
                    mines: [{x: 0, y: 0}],
                    explanation: '角落1的推论：当角落数字为1且只有一个未揭邻居时，那个邻居一定是雷。'
                }
            ]
        },
        {
            id: 'edge-equals',
            name: '边缘等于未揭数',
            level: 1,
            description: '当一个数字等于周围未揭开格子的数量时，所有未揭开的格子都是雷。',
            explanation: '数字表示周围有多少颗雷。如果数字 = 未揭邻居数，说明每个未揭邻居都是雷。',
            exampleBoard: [
                [-1, -1, -1],
                [ 0,  3, -1],
                [ 0,  2, -1]
            ],
            exampleMines: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}],
            trainingBoards: [
                {
                    grid: [
                        [-1, -1, -1],
                        [ 0,  3, -1],
                        [ 0,  2, -1]
                    ],
                    mines: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}],
                    explanation: '数字3周围恰好有3个未揭格(0,0)(1,0)(2,0)，所以它们全是雷。'
                },
                {
                    grid: [
                        [ 0,  0,  0],
                        [-1,  2, -1],
                        [-1, -1, -1]
                    ],
                    mines: [{x: 0, y: 1}, {x: 0, y: 2}],
                    explanation: '数字2周围恰好有2个未揭格，都是雷。'
                },
                {
                    grid: [
                        [-1, -1, -1, -1],
                        [ 0,  4,  2,  0],
                        [ 0,  2,  0,  0]
                    ],
                    mines: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}],
                    explanation: '数字4周围恰好有4个未揭格，全是雷。'
                },
                {
                    grid: [
                        [ 0, -1, -1],
                        [ 0,  1, -1],
                        [ 0,  0, -1]
                    ],
                    mines: [{x: 1, y: 0}, {x: 2, y: 0}],
                    explanation: '数字1周围只有1个未揭格？不，仔细看，1的未揭邻居是(1,0)(2,0)(2,1)，共3个。这不是等于关系，需要找其他数字。'
                },
                {
                    grid: [
                        [-1, -1],
                        [ 2, -1],
                        [ 0,  0]
                    ],
                    mines: [{x: 0, y: 0}, {x: 1, y: 0}],
                    explanation: '数字2周围恰好有2个未揭格(0,0)(1,0)，都是雷。'
                }
            ]
        },
        {
            id: 'zero-safe',
            name: '0的全安全',
            level: 1,
            description: '数字0表示周围没有任何雷，所以周围所有未揭开的格子都可以安全揭开。',
            explanation: '0是最安全的数字，它告诉玩家周围8个格子全部安全。利用0可以快速打开大片区域。',
            exampleBoard: [
                [-1, -1, -1],
                [-1,  0, -1],
                [-1, -1, -1]
            ],
            exampleMines: [],
            trainingBoards: [
                {
                    grid: [
                        [-1, -1, -1],
                        [-1,  0, -1],
                        [-1, -1, -1]
                    ],
                    mines: [],
                    safe: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 0, y: 1}, {x: 2, y: 1}, {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}],
                    explanation: '0周围的8个格子全部安全，可以全部揭开。'
                },
                {
                    grid: [
                        [ 0, -1, -1, -1],
                        [-1, -1, -1, -1],
                        [-1, -1, -1, -1]
                    ],
                    mines: [],
                    safe: [{x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}],
                    explanation: '边缘的0表示周围5个未揭格全部安全。'
                },
                {
                    grid: [
                        [-1, -1],
                        [-1,  0]
                    ],
                    mines: [],
                    safe: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}],
                    explanation: '角落的0表示周围3个未揭格全部安全。'
                },
                {
                    grid: [
                        [-1, -1, -1, -1, -1],
                        [-1,  0,  0,  0, -1],
                        [-1, -1, -1, -1, -1]
                    ],
                    mines: [],
                    safe: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}, {x: 4, y: 0}, {x: 0, y: 1}, {x: 4, y: 1}, {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}, {x: 3, y: 2}, {x: 4, y: 2}],
                    explanation: '连续的0可以快速打开更大的区域。'
                },
                {
                    grid: [
                        [-1, -1, -1],
                        [-1,  0, -1],
                        [-1, -1, -1],
                        [-1,  1, -1]
                    ],
                    mines: [{x: 0, y: 3}, {x: 2, y: 3}],
                    safe: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 0, y: 1}, {x: 2, y: 1}, {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}],
                    explanation: '先利用0打开周围安全格，然后可以看到1的未揭邻居只剩2个，帮助后续推理。'
                }
            ]
        },
        {
            id: 'subtract-safe',
            name: '减法安全',
            level: 2,
            description: '当数字减去已标记的雷数等于0时，剩余未揭开的格子全部安全。',
            explanation: '数字表示周围有多少颗雷。如果已经标记了一些雷，剩余未揭格数 = 数字 - 已标记数 = 0，说明剩余未揭格都不是雷。',
            exampleBoard: [
                [-1, -1, -1],
                [ 1,  2, -1],
                [-1, -1, -1]
            ],
            exampleMines: [{x: 0, y: 0}],
            trainingBoards: [
                {
                    grid: [
                        [-1, -1, -1],
                        [ 1,  2, -1],
                        [-1, -1, -1]
                    ],
                    mines: [{x: 0, y: 0}],
                    explanation: '数字2周围有3个未揭格。如果(0,0)已标记为雷，剩余2个未揭格都不是雷。'
                },
                {
                    grid: [
                        [-1,  2, -1],
                        [-1, -1, -1],
                        [-1,  1, -1]
                    ],
                    mines: [{x: 0, y: 0}],
                    explanation: '数字2周围4个未揭格。标记1个雷后，其余3个都安全。'
                },
                {
                    grid: [
                        [ 1, -1, -1],
                        [-1, -1, -1],
                        [-1, -1, -1]
                    ],
                    mines: [{x: 0, y: 0}],
                    explanation: '数字1周围3个未揭格。标记1个雷后，其余都安全。'
                },
                {
                    grid: [
                        [-1, -1, -1, -1],
                        [-1,  3,  1, -1],
                        [-1, -1, -1, -1]
                    ],
                    mines: [{x: 1, y: 0}, {x: 1, y: 2}],
                    explanation: '数字3周围5个未揭格。标记2个雷后，其余3个都安全。'
                },
                {
                    grid: [
                        [-1, -1, -1],
                        [ 2,  2, -1],
                        [-1, -1, -1]
                    ],
                    mines: [{x: 0, y: 0}, {x: 2, y: 0}],
                    explanation: '左边数字2周围3个未揭格。标记2个雷后，(1,2)安全。'
                }
            ]
        },
        {
            id: 'pattern-121',
            name: '1-2-1 模式',
            level: 2,
            description: '经典边沿模式：1-2-1 排列时，中间2的正上方（或正下方）是雷。',
            explanation: '在边沿处，当三个相邻数字呈1-2-1排列时，中间2的正上方（如果是上沿）或正下方（如果是下沿）必定是雷。因为2的约束迫使中间必须是雷。',
            exampleBoard: [
                [-1, -1, -1],
                [ 1,  2,  1],
                [ 0,  0,  0]
            ],
            exampleMines: [{x: 1, y: 0}],
            trainingBoards: [
                {
                    grid: [
                        [-1, -1, -1],
                        [ 1,  2,  1],
                        [ 0,  0,  0]
                    ],
                    mines: [{x: 1, y: 0}],
                    explanation: '1-2-1经典模式：中间2的正上方(1,0)必定是雷。'
                },
                {
                    grid: [
                        [ 0,  0,  0],
                        [ 1,  2,  1],
                        [-1, -1, -1]
                    ],
                    mines: [{x: 1, y: 2}],
                    explanation: '下沿的1-2-1模式：中间2的正下方(1,2)必定是雷。'
                },
                {
                    grid: [
                        [-1,  1,  2,  1, -1],
                        [-1,  0,  0,  0, -1]
                    ],
                    mines: [{x: 2, y: 0}],
                    explanation: '横向1-2-1模式：中间2的正上方是雷。'
                },
                {
                    grid: [
                        [-1, -1, -1],
                        [ 1,  2,  1],
                        [ 0, -1,  0]
                    ],
                    mines: [{x: 1, y: 0}],
                    explanation: '即使有额外未揭格，1-2-1模式依然成立：(1,0)是雷。'
                },
                {
                    grid: [
                        [-1, -1, -1, -1, -1],
                        [ 1,  2,  1,  2,  1],
                        [ 0,  0,  0,  0,  0]
                    ],
                    mines: [{x: 1, y: 0}, {x: 3, y: 0}],
                    explanation: '双1-2-1模式：两个中间2的正上方都是雷。'
                }
            ]
        },
        {
            id: 'pattern-1221',
            name: '1-2-2-1 模式',
            level: 2,
            description: '经典边沿模式：1-2-2-1 排列时，中间两个2的正上方（或正下方）都是雷。',
            explanation: '在边沿处，当四个相邻数字呈1-2-2-1排列时，两个中间2的正上方（或正下方）都是雷。',
            exampleBoard: [
                [-1, -1, -1, -1],
                [ 1,  2,  2,  1],
                [ 0,  0,  0,  0]
            ],
            exampleMines: [{x: 1, y: 0}, {x: 2, y: 0}],
            trainingBoards: [
                {
                    grid: [
                        [-1, -1, -1, -1],
                        [ 1,  2,  2,  1],
                        [ 0,  0,  0,  0]
                    ],
                    mines: [{x: 1, y: 0}, {x: 2, y: 0}],
                    explanation: '1-2-2-1经典模式：两个中间2的正上方(1,0)和(2,0)都是雷。'
                },
                {
                    grid: [
                        [ 0,  0,  0,  0],
                        [ 1,  2,  2,  1],
                        [-1, -1, -1, -1]
                    ],
                    mines: [{x: 1, y: 2}, {x: 2, y: 2}],
                    explanation: '下沿的1-2-2-1模式：两个中间2的正下方是雷。'
                },
                {
                    grid: [
                        [-1,  1,  2,  2,  1, -1],
                        [-1,  0,  0,  0,  0, -1]
                    ],
                    mines: [{x: 2, y: 0}, {x: 3, y: 0}],
                    explanation: '横向1-2-2-1模式：两个中间2的正上方是雷。'
                },
                {
                    grid: [
                        [-1, -1, -1, -1],
                        [ 1,  2,  2,  1],
                        [ 0, -1, -1,  0]
                    ],
                    mines: [{x: 1, y: 0}, {x: 2, y: 0}],
                    explanation: '即使有额外未揭格，1-2-2-1模式依然成立。'
                },
                {
                    grid: [
                        [-1, -1, -1, -1, -1, -1],
                        [ 1,  2,  2,  1,  2,  1],
                        [ 0,  0,  0,  0,  0,  0]
                    ],
                    mines: [{x: 1, y: 0}, {x: 2, y: 0}, {x: 4, y: 0}],
                    explanation: '混合模式：1-2-2-1和1-2-1同时出现。'
                }
            ]
        },
        {
            id: 'corner-2',
            name: '角落数字2',
            level: 2,
            description: '当角落的数字是2，且周围恰好有2个未揭开的格子时，这两个格子都是雷。',
            explanation: '角落的2周围只有3个格子。如果其中1个已揭示为空，剩余2个未揭格必定都是雷。',
            exampleBoard: [
                [-1, -1, -1],
                [-1,  2,  0],
                [-1,  0,  0]
            ],
            exampleMines: [{x: 0, y: 0}, {x: 0, y: 1}],
            trainingBoards: [
                {
                    grid: [
                        [-1, -1, -1],
                        [-1,  2,  0],
                        [-1,  0,  0]
                    ],
                    mines: [{x: 0, y: 0}, {x: 0, y: 1}],
                    explanation: '角落的2周围未揭格只有(0,0)和(0,1)，两个都是雷。'
                },
                {
                    grid: [
                        [-1, -1, -1],
                        [ 0,  2, -1],
                        [ 0,  0, -1]
                    ],
                    mines: [{x: 2, y: 0}, {x: 2, y: 1}],
                    explanation: '右上角的2，周围未揭格(2,0)(2,1)都是雷。'
                },
                {
                    grid: [
                        [ 0,  0, -1],
                        [ 0,  2, -1],
                        [-1, -1, -1]
                    ],
                    mines: [{x: 2, y: 1}, {x: 2, y: 2}],
                    explanation: '右下角的2，周围未揭格(2,1)(2,2)都是雷。'
                },
                {
                    grid: [
                        [-1,  0,  0],
                        [-1,  2,  0],
                        [-1, -1, -1]
                    ],
                    mines: [{x: 0, y: 1}, {x: 0, y: 2}],
                    explanation: '左下角的2，周围未揭格(0,1)(0,2)都是雷。'
                },
                {
                    grid: [
                        [-1, -1, -1],
                        [-1,  2,  0],
                        [-1,  1,  0]
                    ],
                    mines: [{x: 0, y: 0}, {x: 0, y: 1}],
                    explanation: '角落2旁边还有数字1，不影响2的推论：(0,0)(0,1)都是雷。'
                }
            ]
        },
        {
            id: 'overlap',
            name: '重叠约束',
            level: 3,
            description: '两个数字共享一些未揭格子时，可以用减法得到新结论。',
            explanation: '当两个数字共享部分未揭格时，较大的数字减去较小的数字，差值就是非共享区域的雷数。',
            exampleBoard: [
                [-1, -1, -1, -1],
                [ 1,  2, -1, -1],
                [-1, -1, -1, -1]
            ],
            exampleMines: [{x: 0, y: 0}],
            trainingBoards: [
                {
                    grid: [
                        [-1, -1, -1, -1],
                        [ 1,  2, -1, -1],
                        [-1, -1, -1, -1]
                    ],
                    mines: [{x: 0, y: 0}],
                    explanation: '数字1和2共享(0,0)。2-1=1，说明2独有的未揭格中有1个雷。但这里2的未揭格只有(0,0)，所以(0,0)是雷。'
                },
                {
                    grid: [
                        [-1, -1, -1],
                        [ 2,  3, -1],
                        [-1, -1, -1]
                    ],
                    mines: [{x: 0, y: 0}, {x: 1, y: 0}],
                    explanation: '数字2和3共享多个格子。3-2=1，说明3独有的区域有1个雷。结合其他信息可以推断更多。'
                },
                {
                    grid: [
                        [ 1,  2, -1],
                        [-1, -1, -1],
                        [-1, -1, -1]
                    ],
                    mines: [{x: 2, y: 0}],
                    explanation: '数字1和2共享(0,0)。2-1=1，2独有的(1,0)(2,0)中有1个雷。由于(1,0)周围有1约束... 实际上这里(2,0)是雷。'
                },
                {
                    grid: [
                        [-1, -1, -1, -1],
                        [ 1,  2,  2, -1],
                        [-1, -1, -1, -1]
                    ],
                    mines: [{x: 0, y: 0}, {x: 3, y: 0}],
                    explanation: '三个数字1-2-2。通过重叠约束分析可以推断(0,0)和(3,0)是雷。'
                },
                {
                    grid: [
                        [-1, -1, -1],
                        [ 2,  3,  2],
                        [-1, -1, -1]
                    ],
                    mines: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}],
                    explanation: '2-3-2模式：中间3周围3个未揭格，上方3个都是雷。'
                }
            ]
        },
        {
            id: 'diagonal',
            name: '对角推理',
            level: 3,
            description: '利用对角线方向的数字进行间接推理。',
            explanation: '有时直接相邻的数字不够，需要通过对角线方向的数字来推断某个格子的状态。',
            exampleBoard: [
                [-1, -1, -1],
                [-1,  1, -1],
                [-1, -1,  1]
            ],
            exampleMines: [{x: 0, y: 0}],
            trainingBoards: [
                {
                    grid: [
                        [-1, -1, -1],
                        [-1,  1, -1],
                        [-1, -1,  1]
                    ],
                    mines: [{x: 0, y: 0}],
                    explanation: '两个1对角排列，共享左上角(0,0)。两个1的约束都指向(0,0)，所以(0,0)是雷。'
                },
                {
                    grid: [
                        [ 1, -1, -1],
                        [-1, -1, -1],
                        [-1, -1,  1]
                    ],
                    mines: [{x: 0, y: 0}],
                    explanation: '对角1和1，(0,0)同时是两个1的邻居，必定是雷。'
                },
                {
                    grid: [
                        [-1, -1,  1],
                        [-1,  2, -1],
                        [ 1, -1, -1]
                    ],
                    mines: [{x: 0, y: 0}, {x: 2, y: 2}],
                    explanation: '对角2和1，通过交叉约束可以推断(0,0)和(2,2)是雷。'
                },
                {
                    grid: [
                        [ 1, -1, -1],
                        [-1,  2, -1],
                        [-1, -1,  1]
                    ],
                    mines: [{x: 0, y: 0}, {x: 2, y: 2}],
                    explanation: '三个数字呈对角线排列，通过逐步推理可确定雷的位置。'
                },
                {
                    grid: [
                        [-1,  1, -1],
                        [ 1, -1,  1],
                        [-1,  1, -1]
                    ],
                    mines: [{x: 0, y: 0}, {x: 2, y: 0}, {x: 0, y: 2}, {x: 2, y: 2}],
                    explanation: '四个1围成菱形，四个角都是雷。'
                }
            ]
        },
        {
            id: 'probability',
            name: '概率判断',
            level: 3,
            description: '当无法确定时，选择概率最低的格子进行猜测。',
            explanation: '有时没有任何确定的推论，必须通过概率计算选择最安全的下一步。通常选择周围数字较小、未揭格较多的区域。',
            exampleBoard: [
                [-1, -1, -1],
                [-1,  1, -1],
                [-1, -1, -1]
            ],
            exampleMines: [{x: 0, y: 0}],
            trainingBoards: [
                {
                    grid: [
                        [-1, -1, -1],
                        [-1,  1, -1],
                        [-1, -1, -1]
                    ],
                    mines: [{x: 0, y: 0}],
                    explanation: '只有一个1，周围8个未揭格。每个格子有1/8=12.5%的概率是雷。此时任何选择都是猜测。'
                },
                {
                    grid: [
                        [ 1, -1,  1],
                        [-1, -1, -1],
                        [ 1, -1,  1]
                    ],
                    mines: [{x: 1, y: 1}],
                    explanation: '四个角落都是1，中间未揭格。每个1周围有3个未揭格，中间格(1,1)同时被4个1共享，概率最高。'
                },
                {
                    grid: [
                        [-1, -1, -1, -1],
                        [-1,  2,  2, -1],
                        [-1, -1, -1, -1]
                    ],
                    mines: [{x: 1, y: 0}, {x: 2, y: 0}],
                    explanation: '两个2在中间，上方两个未揭格最可能是雷（概率接近100%），其他区域概率较低。'
                },
                {
                    grid: [
                        [-1, -1, -1],
                        [ 1, -1,  1],
                        [-1, -1, -1]
                    ],
                    mines: [{x: 0, y: 0}],
                    explanation: '两个1分别位于左右。中间列的格子被更多数字覆盖，概率计算更复杂。'
                },
                {
                    grid: [
                        [-1, -1, -1, -1, -1],
                        [-1,  1,  2,  1, -1],
                        [-1, -1, -1, -1, -1]
                    ],
                    mines: [{x: 2, y: 0}],
                    explanation: '1-2-1模式上方中间格(2,0)有很高概率是雷，其他格子概率较低。'
                }
            ]
        }
    ];

    // ==================== 进度管理 ====================

    var progress = {};

    function loadProgress() {
        try {
            var saved = Storage.get(STORAGE_KEY);
            if (saved && typeof saved === 'object') {
                progress = saved;
            }
        } catch (e) {
            progress = {};
        }
        ensureProgressInit();
    }

    function saveProgress() {
        try {
            Storage.set(STORAGE_KEY, progress);
        } catch (e) {}
    }

    function ensureProgressInit() {
        // 默认解锁第一个模式
        if (!progress['corner-1']) {
            progress['corner-1'] = { unlocked: true, completed: 0, correct: 0, bestTime: null, rating: 'none' };
        }
        // 其他模式默认未解锁
        for (var i = 0; i < PATTERNS.length; i++) {
            var pid = PATTERNS[i].id;
            if (!progress[pid]) {
                progress[pid] = { unlocked: false, completed: 0, correct: 0, bestTime: null, rating: 'none' };
            }
        }
    }

    // ==================== 公共 API ====================

    function getPatterns() {
        return PATTERNS.slice();
    }

    function getPattern(id) {
        for (var i = 0; i < PATTERNS.length; i++) {
            if (PATTERNS[i].id === id) return PATTERNS[i];
        }
        return null;
    }

    function getProgress(id) {
        if (id) return progress[id] || null;
        return Object.assign({}, progress);
    }

    function isUnlocked(id) {
        var p = progress[id];
        return p && p.unlocked;
    }

    function getTrainingBoard(patternId, index) {
        var pattern = getPattern(patternId);
        if (!pattern || !pattern.trainingBoards || index >= pattern.trainingBoards.length) return null;
        return pattern.trainingBoards[index];
    }

    function checkAnswer(patternId, boardIndex, selectedMines) {
        var board = getTrainingBoard(patternId, boardIndex);
        if (!board) return { correct: false, reason: '题目不存在' };

        var expected = board.mines.slice().sort(function(a, b) { return a.x - b.x || a.y - b.y; });
        var actual = selectedMines.slice().sort(function(a, b) { return a.x - b.x || a.y - b.y; });

        if (expected.length !== actual.length) {
            return { correct: false, reason: '标记的雷数量不对。应标记 ' + expected.length + ' 个，你标记了 ' + actual.length + ' 个。', expected: expected };
        }

        for (var i = 0; i < expected.length; i++) {
            if (expected[i].x !== actual[i].x || expected[i].y !== actual[i].y) {
                return { correct: false, reason: '标记位置有误。正确答案已高亮显示。', expected: expected };
            }
        }

        return { correct: true, expected: expected };
    }

    function recordResult(patternId, isCorrect, timeMs) {
        var p = progress[patternId];
        if (!p) return;

        p.completed++;
        if (isCorrect) p.correct++;

        if (isCorrect && (p.bestTime === null || timeMs < p.bestTime)) {
            p.bestTime = timeMs;
        }

        // 评级计算
        var accuracy = p.completed > 0 ? (p.correct / p.completed) : 0;
        if (p.completed >= 5) {
            if (accuracy >= 0.9 && p.bestTime !== null && p.bestTime < 10000) {
                p.rating = 'gold';
            } else if (accuracy >= 0.8) {
                p.rating = 'silver';
            } else if (accuracy >= 0.6) {
                p.rating = 'bronze';
            } else {
                p.rating = 'none';
            }
        } else if (p.completed >= 3 && accuracy >= 0.6) {
            p.rating = 'bronze';
        }

        // 解锁下一个模式
        tryUnlockNext(patternId);

        saveProgress();
    }

    function tryUnlockNext(currentId) {
        var p = progress[currentId];
        if (!p) return;

        var accuracy = p.completed > 0 ? (p.correct / p.completed) : 0;
        if (p.completed >= 5 && accuracy >= 0.6) {
            for (var i = 0; i < PATTERNS.length - 1; i++) {
                if (PATTERNS[i].id === currentId) {
                    var nextId = PATTERNS[i + 1].id;
                    if (progress[nextId] && !progress[nextId].unlocked) {
                        progress[nextId].unlocked = true;
                        // 派发解锁事件
                        document.dispatchEvent(new CustomEvent('patternUnlocked', {
                            detail: { patternId: nextId }
                        }));
                    }
                    break;
                }
            }
        }
    }

    function resetProgress() {
        progress = {};
        ensureProgressInit();
        saveProgress();
    }

    // ==================== 初始化 ====================

    loadProgress();

    return {
        getPatterns: getPatterns,
        getPattern: getPattern,
        getProgress: getProgress,
        isUnlocked: isUnlocked,
        getTrainingBoard: getTrainingBoard,
        checkAnswer: checkAnswer,
        recordResult: recordResult,
        resetProgress: resetProgress
    };
})();
