/**
 * 回放系统模块
 * 记录并回放游戏过程
 */

const Replay = (function() {
    let recording = [];
    let isRecording = false;
    let startTime = 0;

    function start() {
        recording = [];
        isRecording = true;
        startTime = Date.now();
    }

    function record(action, x, y) {
        if (!isRecording) return;
        recording.push({
            time: Date.now() - startTime,
            action,
            x,
            y
        });
    }

    function stop() {
        isRecording = false;
        return recording.slice();
    }

    function getRecording() {
        return recording.slice();
    }

    function exportJSON() {
        return JSON.stringify(recording, null, 2);
    }

    function importJSON(json) {
        try {
            const data = JSON.parse(json);
            if (Array.isArray(data)) {
                recording = data;
                return true;
            }
        } catch (e) {}
        return false;
    }

    function play(rec, boardWidth, boardHeight, mineCount, onStep, onComplete) {
        if (!rec || rec.length === 0) return;

        let index = 0;
        let start = Date.now();

        function step() {
            if (index >= rec.length) {
                if (onComplete) onComplete();
                return;
            }

            const expectedTime = rec[index].time;
            const elapsed = Date.now() - start;

            if (elapsed >= expectedTime) {
                const entry = rec[index];
                if (onStep) onStep(entry.action, entry.x, entry.y);
                index++;
            }

            requestAnimationFrame(step);
        }

        step();
    }

    return {
        start,
        record,
        stop,
        getRecording,
        exportJSON,
        importJSON,
        play
    };
})();
