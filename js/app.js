/**
 * 超级扫雷 - 应用入口
 * Super Minesweeper - Application Entry
 */

(function() {
    'use strict';

    // 安全地隐藏启动画面
    function hideSplash() {
        try {
            // 取消紧急后备定时器
            if (window.__splashTimeout) {
                clearTimeout(window.__splashTimeout);
                window.__splashTimeout = null;
            }
            var splash = document.getElementById('splash-screen');
            if (splash) {
                splash.classList.add('hidden');
            }
        } catch (e) {
            console.error('Hide splash failed:', e);
        }
    }

    function showMainMenu() {
        try {
            if (typeof UI !== 'undefined' && UI.showScreen) {
                UI.showScreen('main-menu');
            } else {
                // 如果 UI 模块不可用，手动显示
                document.querySelectorAll('.screen').forEach(function(s) {
                    s.classList.add('hidden');
                });
                var menu = document.getElementById('main-menu');
                if (menu) menu.classList.remove('hidden');
            }
        } catch (e) {
            console.error('Show main menu failed:', e);
        }
    }

    // 启动流程
    function boot() {
        console.log('[Boot] Starting...');

        try {
            console.log('[Boot] Loading settings...');
            if (typeof Settings !== 'undefined') {
                Settings.load();
                console.log('[Boot] Settings loaded');
            }

            console.log('[Boot] Setting language...');
            if (typeof I18n !== 'undefined' && typeof Settings !== 'undefined') {
                var lang = Settings.get('language') || 'zh';
                I18n.setLanguage(lang);
            }

            console.log('[Boot] Loading stats...');
            if (typeof Stats !== 'undefined') {
                Stats.getAll();
            }

            console.log('[Boot] Loading achievements...');
            if (typeof Achievements !== 'undefined') {
                Achievements.load();
            }

            console.log('[Boot] Initializing championship...');
            if (typeof Championship !== 'undefined' && Championship.init) {
                Championship.init();
            }

            console.log('[Boot] Initializing UI...');
            if (typeof UI !== 'undefined' && UI.init) {
                UI.init();
                console.log('[Boot] UI initialized');
            }

            console.log('[Boot] Initializing tutorial...');
            if (typeof Tutorial !== 'undefined' && Tutorial.init) {
                Tutorial.init();
            }

            console.log('[Boot] Checking daily challenge...');
            checkDailyChallenge();
        } catch (err) {
            console.error('[Boot] Error during boot:', err);
        }

        // 无论如何，1.8秒后隐藏启动画面
        setTimeout(function() {
            console.log('[Boot] Hiding splash...');
            hideSplash();
            showMainMenu();
            console.log('[Boot] Boot complete');
        }, 1800);
    }

    // 页面加载完成后启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    // 页面卸载前保存
    window.addEventListener('beforeunload', function() {
        try {
            if (typeof Game !== 'undefined') {
                var state = Game.getState();
                if (state && (state.gameState === 'playing' || state.gameState === 'paused')) {
                    Game.save();
                }
            }
        } catch (e) {}
    });

    // 防止右键菜单（在游戏界面）
    document.addEventListener('contextmenu', function(e) {
        if (e.target && e.target.closest && e.target.closest('#game-board')) {
            e.preventDefault();
        }
    });

    // 防止拖拽
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
    });

    function checkDailyChallenge() {
        try {
            var today = new Date();
            var todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            var lastDaily = Storage.get('last_daily');
            var badge = document.getElementById('daily-badge');
            if (badge) {
                badge.classList.toggle('hidden', lastDaily === todayKey);
            }
            var weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            var weekKey = weekStart.getFullYear() + '-' + String(weekStart.getMonth() + 1).padStart(2, '0') + '-' + String(weekStart.getDate()).padStart(2, '0');
            var lastWeekly = Storage.get('last_weekly');
            var wbadge = document.getElementById('weekly-badge');
            if (wbadge) {
                wbadge.classList.toggle('hidden', lastWeekly === weekKey);
            }
        } catch (e) {}
    }

    if (typeof console !== 'undefined' && console.log) {
        console.log('%c💣 超级扫雷 v1.0', 'font-size:20px;font-weight:bold;color:#3b82f6;');
        console.log('%c按 F 全屏 | M 静音 | P 暂停 | H 提示 | Ctrl+Z 撤销', 'color:#94a3b8;');
    }
})();
