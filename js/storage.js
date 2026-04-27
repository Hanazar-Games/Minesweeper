/**
 * 存储管理模块
 * 负责 localStorage 的读写和版本管理
 */

const Storage = (function() {
    const PREFIX = 'minesweeper_';
    const VERSION = 1;

    function getKey(key) {
        return PREFIX + key;
    }

    function get(key, defaultValue = null) {
        try {
            const raw = localStorage.getItem(getKey(key));
            if (raw === null) return defaultValue;
            const data = JSON.parse(raw);
            return data;
        } catch (e) {
            console.warn('Storage get error:', e);
            return defaultValue;
        }
    }

    function set(key, value) {
        try {
            localStorage.setItem(getKey(key), JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('Storage set error:', e);
            return false;
        }
    }

    function remove(key) {
        try {
            localStorage.removeItem(getKey(key));
            return true;
        } catch (e) {
            return false;
        }
    }

    function clear() {
        try {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(PREFIX)) {
                    keys.push(k);
                }
            }
            keys.forEach(k => localStorage.removeItem(k));
            return true;
        } catch (e) {
            return false;
        }
    }

    function init() {
        const storedVersion = get('_version', 0);
        if (storedVersion < VERSION) {
            // 迁移逻辑（未来版本使用）
            set('_version', VERSION);
        }
    }

    // 初始化
    init();

    return {
        get,
        set,
        remove,
        clear
    };
})();
