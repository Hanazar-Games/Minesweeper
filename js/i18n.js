/**
 * 国际化 (i18n) 模块
 * 简单的字典替换系统
 */

const I18n = (function() {
    const dict = {
        zh: {
            app_name: '超级扫雷',
            menu_play: '开始游戏',
            menu_continue: '继续游戏',
            menu_challenge: '挑战模式',
            menu_stats: '统计数据',
            menu_leaderboard: '排行榜',
            menu_settings: '设置',
            menu_tutorial: '新手教程',
            menu_help: '游戏帮助',
            diff_beginner: '初级',
            diff_intermediate: '中级',
            diff_expert: '高级',
            diff_master: '大师',
            diff_custom: '自定义',
            game_mines: '雷',
            game_time: '时间',
            game_clicks: '点击',
            btn_undo: '撤销',
            btn_hint: '提示',
            btn_autoflag: '自动',
            btn_pause: '暂停',
            btn_save: '保存',
            gameover_win: '胜利！',
            gameover_lose: '游戏结束',
            gameover_time: '用时',
            gameover_3bv: '3BV',
            gameover_eff: '效率',
            btn_play_again: '再玩一次',
            btn_main_menu: '主菜单',
            settings_title: '项目设置',
            tab_style: '样式',
            tab_language: '语言',
            tab_audio: '音频',
            tab_animation: '动画',
            tab_performance: '性能',
            tab_shortcuts: '快捷键',
            tab_other: '其他',
            tab_about: '关于',
            about_version: '版本',
            about_github: 'GitHub 仓库',
            about_feedback: '反馈问题',
            about_discuss: '讨论交流',
            achievement_unlocked: '解锁成就',
        },
        en: {
            app_name: 'Super Minesweeper',
            menu_play: 'Play',
            menu_continue: 'Continue',
            menu_challenge: 'Challenges',
            menu_stats: 'Statistics',
            menu_leaderboard: 'Leaderboard',
            menu_settings: 'Settings',
            menu_tutorial: 'Tutorial',
            menu_help: 'Help',
            diff_beginner: 'Beginner',
            diff_intermediate: 'Intermediate',
            diff_expert: 'Expert',
            diff_master: 'Master',
            diff_custom: 'Custom',
            game_mines: 'Mines',
            game_time: 'Time',
            game_clicks: 'Clicks',
            btn_undo: 'Undo',
            btn_hint: 'Hint',
            btn_autoflag: 'Auto',
            btn_pause: 'Pause',
            btn_save: 'Save',
            gameover_win: 'Victory!',
            gameover_lose: 'Game Over',
            gameover_time: 'Time',
            gameover_3bv: '3BV',
            gameover_eff: 'Efficiency',
            btn_play_again: 'Play Again',
            btn_main_menu: 'Main Menu',
            settings_title: 'Settings',
            tab_style: 'Style',
            tab_language: 'Language',
            tab_audio: 'Audio',
            tab_animation: 'Animation',
            tab_performance: 'Performance',
            tab_shortcuts: 'Shortcuts',
            tab_other: 'Other',
            tab_about: 'About',
            about_version: 'Version',
            about_github: 'GitHub',
            about_feedback: 'Feedback',
            about_discuss: 'Discuss',
            achievement_unlocked: 'Achievement Unlocked',
        },
        ja: {
            app_name: 'スーパー minesweeper',
            menu_play: 'プレイ',
            menu_continue: '続き',
            menu_challenge: 'チャレンジ',
            menu_stats: '統計',
            menu_leaderboard: 'ランキング',
            menu_settings: '設定',
            menu_tutorial: 'チュートリアル',
            menu_help: 'ヘルプ',
            diff_beginner: '初級',
            diff_intermediate: '中級',
            diff_expert: '上級',
            diff_master: 'マスター',
            diff_custom: 'カスタム',
            game_mines: '地雷',
            game_time: '時間',
            game_clicks: 'クリック',
            btn_undo: '元に戻す',
            btn_hint: 'ヒント',
            btn_autoflag: '自動',
            btn_pause: '一時停止',
            btn_save: '保存',
            gameover_win: '勝利！',
            gameover_lose: 'ゲームオーバー',
            gameover_time: '時間',
            gameover_3bv: '3BV',
            gameover_eff: '効率',
            btn_play_again: 'もう一度',
            btn_main_menu: 'メインメニュー',
            settings_title: '設定',
            tab_style: 'スタイル',
            tab_language: '言語',
            tab_audio: 'オーディオ',
            tab_animation: 'アニメーション',
            tab_performance: 'パフォーマンス',
            tab_shortcuts: 'ショートカット',
            tab_other: 'その他',
            tab_about: 'について',
            about_version: 'バージョン',
            about_github: 'GitHub',
            about_feedback: 'フィードバック',
            about_discuss: 'ディスカッション',
            achievement_unlocked: '実績解除',
        }
    };

    let currentLang = 'zh';

    function setLanguage(lang) {
        if (dict[lang]) {
            currentLang = lang;
            apply();
        }
    }

    function t(key, fallback) {
        const d = dict[currentLang] || dict.zh;
        return d[key] !== undefined ? d[key] : (fallback || key);
    }

    function apply() {
        // 更新所有带有 data-i18n 属性的元素
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            const text = t(key);
            if (text !== key) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = text;
                } else {
                    // 保留 emoji 前缀
                    const emojiMatch = el.textContent.match(/^[\u{1F300}-\u{1F9FF}]\s*/u);
                    el.textContent = (emojiMatch ? emojiMatch[0] : '') + text;
                }
            }
        });
    }

    function getCurrentLang() {
        return currentLang;
    }

    return {
        setLanguage,
        t,
        apply,
        getCurrentLang
    };
})();
