/**
 * 设置管理模块
 */

const Settings = (function() {
    const defaults = {
        // 样式
        theme: 'classic',
        colorMode: 'dark',
        contrast: 100,
        accentColor: 'ocean',
        fontFamily: '',
        preset: 'default',
        // 语言
        language: 'zh',
        // 音频
        sound: true,
        music: false,
        volume: 50,
        masterVolume: 80,
        sfxVolume: 70,
        sfxStyle: 'classic',
        musicVolume: 30,
        musicStyle: 'orchestral',
        musicTempo: 100,
        adsrAttack: 5,
        adsrDecay: 50,
        adsrRelease: 30,
        musicReverb: 20,
        // 动画
        animations: true,
        animSpeed: 100,
        animFade: true,
        animHover: true,
        animPage: true,
        animModal: true,
        particles: true,
        animReveal: true,
        // 性能
        reducedMotion: false,
        noBlur: false,
        noParticles: false,
        lowRes: false,
        noWebAudio: false,
        // 游戏
        firstSafe: true,
        chord: true,
        question: false,
        show3BV: true,
        noGuess: false,
        lrChord: true,
        longPress: false,
        // 其他
        tooltips: true,
        confirmDestructive: true,
        smoothScroll: true,
    };

    let settings = Object.assign({}, defaults);

    function load() {
        const saved = Storage.get('settings');
        if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
            settings = Object.assign({}, defaults, saved);
        }
        apply();
    }

    function save() {
        Storage.set('settings', settings);
    }

    function get(key) {
        return settings[key];
    }

    function set(key, value) {
        settings[key] = value;
        save();
        apply();
    }

    function apply() {
        try {
            // 主题
            const mode = settings.colorMode || 'dark';
            if (mode === 'auto') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'classic');
            } else if (mode === 'light') {
                document.documentElement.setAttribute('data-theme', 'classic');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
            }

            // 对比度
            const contrast = typeof settings.contrast === 'number' ? settings.contrast : 100;
            document.documentElement.style.filter = 'contrast(' + contrast + '%)';

            // 强调色
            const accentColors = {
                ocean: '#3b82f6', emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
                wisteria: '#8b5cf6', graphite: '#64748b', crimson: '#dc2626',
                lake: '#06b6d4', gilded: '#d97706', sky: '#0ea5e9'
            };
            const c = accentColors[settings.accentColor] || accentColors.ocean;
            document.documentElement.style.setProperty('--primary', c);
            document.documentElement.style.setProperty('--primary-dark', c);

            // 字体
            if (settings.fontFamily) {
                document.body.style.fontFamily = settings.fontFamily + ", 'Noto Sans SC', sans-serif";
            } else {
                document.body.style.fontFamily = "'Noto Sans SC', sans-serif";
            }
        } catch (e) {
            console.warn('Settings apply visual error:', e);
        }

        // 音频
        try {
            if (typeof AudioManager !== 'undefined') {
                AudioManager.setEnabled(settings.sound);
                AudioManager.setVolume((settings.volume || 50) / 100);
                AudioManager.setMasterVolume((settings.masterVolume || 80) / 100);
                AudioManager.setSfxVolume((settings.sfxVolume || 70) / 100);
                AudioManager.setMusicVolume((settings.musicVolume || 30) / 100);
                AudioManager.setSfxStyle(settings.sfxStyle || 'classic');
                AudioManager.setAdsr(settings.adsrAttack || 5, settings.adsrDecay || 50, settings.adsrRelease || 30);
                AudioManager.setMusicReverb((settings.musicReverb || 20) / 100);
                if (settings.music) {
                    AudioManager.setMusicEnabled(true);
                } else {
                    AudioManager.setMusicEnabled(false);
                }
            }
        } catch (e) {
            console.warn('Settings apply audio error:', e);
        }
    }

    function all() {
        return Object.assign({}, settings);
    }

    function reset() {
        settings = Object.assign({}, defaults);
        save();
        apply();
    }

    load();

    return {
        get,
        set,
        all,
        reset,
        load
    };
})();
