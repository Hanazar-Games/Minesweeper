/**
 * 无尽模式模块
 * 关卡制：胜利后自动进入下一层，难度递增
 */

const Endless = (function() {
    let level = 1;
    let hp = 10;
    let maxHp = 10;
    let score = 0;
    let totalRevealed = 0;
    let spawnX = -1;
    let spawnY = -1;
    let highestLevel = 1;
    let maxHpReached = 10;

    function init() {
        level = 1;
        hp = 10;
        maxHp = 10;
        score = 0;
        totalRevealed = 0;
        spawnX = -1;
        spawnY = -1;
        highestLevel = 1;
        maxHpReached = 10;
    }

    function getBoardConfig() {
        var w = Math.min(30, 9 + Math.floor(level / 2));
        var h = Math.min(20, 9 + Math.floor(level / 3));
        var density = Math.min(0.35, 0.12 + level * 0.005);
        var m = Math.max(1, Math.min(w * h - 1, Math.floor(w * h * density)));
        return { width: w, height: h, mines: m };
    }

    function setSpawn(x, y) {
        spawnX = x;
        spawnY = y;
    }

    function getSpawn() {
        return { x: spawnX, y: spawnY };
    }

    function clearSpawn() {
        spawnX = -1;
        spawnY = -1;
    }

    function nextLevel() {
        level++;
        if (level > highestLevel) highestLevel = level;
        // 每关回血 +2（上限 maxHp）
        hp = Math.min(maxHp, hp + 2);
        // 每5关增加最大血量
        if (level % 5 === 0) {
            maxHp = Math.min(30, maxHp + 2);
            if (maxHp > maxHpReached) maxHpReached = maxHp;
        }
        score += level * 100;
        totalRevealed = 0;
        spawnX = -1;
        spawnY = -1;
    }

    function takeDamage(amount) {
        hp = Math.max(0, hp - amount);
        return hp;
    }

    function heal(amount) {
        hp = Math.min(maxHp, hp + amount);
        return hp;
    }

    function addScore(s) {
        score += s;
    }

    function addRevealed(n) {
        totalRevealed += n;
        // 每揭示20格回1血
        if (totalRevealed >= 20) {
            totalRevealed -= 20;
            heal(1);
        }
    }

    function getState() {
        return {
            level: level,
            hp: hp,
            maxHp: maxHp,
            score: score,
            totalRevealed: totalRevealed,
            spawnX: spawnX,
            spawnY: spawnY,
            highestLevel: highestLevel,
            maxHpReached: maxHpReached
        };
    }

    function loadState(state) {
        if (!state) return;
        level = state.level || 1;
        hp = state.hp || 10;
        maxHp = state.maxHp || 10;
        score = state.score || 0;
        totalRevealed = state.totalRevealed || 0;
        spawnX = state.spawnX || -1;
        spawnY = state.spawnY || -1;
        highestLevel = state.highestLevel || level;
        maxHpReached = state.maxHpReached || maxHp;
    }

    return {
        init: init,
        getBoardConfig: getBoardConfig,
        setSpawn: setSpawn,
        getSpawn: getSpawn,
        clearSpawn: clearSpawn,
        nextLevel: nextLevel,
        takeDamage: takeDamage,
        heal: heal,
        addScore: addScore,
        addRevealed: addRevealed,
        getState: getState,
        loadState: loadState
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Endless;
}
