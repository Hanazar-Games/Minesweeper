/**
 * 音效管理模块
 * 使用 Web Audio API 生成程序化音效
 * 支持多种音效风格和高级合成参数
 */

const AudioManager = (function() {
    let ctx = null;
    let enabled = true;
    let musicEnabled = false;
    let volume = 0.5;
    let masterVolume = 0.8;
    let sfxVolume = 0.7;
    let musicVol = 0.3;
    let musicOsc = null;
    let musicGain = null;

    // 音效风格参数
    const sfxStyles = {
        classic:   { type: 'sine',   detune: 0,   filter: 8000,  decay: 1.0 },
        electronic:{ type: 'sawtooth', detune: 10, filter: 6000,  decay: 0.8 },
        retro:     { type: 'square',   detune: 0,   filter: 4000,  decay: 0.6 },
        wood:      { type: 'sine',     detune: 5,   filter: 3000,  decay: 1.2 },
        bell:      { type: 'sine',     detune: 0,   filter: 12000, decay: 1.5 },
        space:     { type: 'sine',     detune: 20,  filter: 5000,  decay: 2.0 },
        drum:      { type: 'square',   detune: 0,   filter: 2000,  decay: 0.4 },
        piano:     { type: 'triangle', detune: 2,   filter: 8000,  decay: 1.3 },
        synth:     { type: 'sawtooth', detune: 15,  filter: 7000,  decay: 0.9 },
        '8bit':    { type: 'square',   detune: 0,   filter: 3000,  decay: 0.5 },
    };

    let currentSfxStyle = 'classic';
    let adsrAttack = 5;
    let adsrDecay = 50;
    let adsrRelease = 30;
    let musicReverbAmount = 0.2;

    function getCtx() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return ctx;
    }

    function resume() {
        if (ctx && ctx.state === 'suspended') {
            ctx.resume();
        }
    }

    function getStyle() {
        return sfxStyles[currentSfxStyle] || sfxStyles.classic;
    }

    function playTone(freq, duration, type, vol, options = {}) {
        if (!enabled) return;
        resume();
        const context = getCtx();
        const style = getStyle();
        const oscType = options.type || style.type;
        const finalVol = vol * volume * masterVolume * sfxVolume;
        if (finalVol <= 0) return;

        const osc = context.createOscillator();
        const gain = context.createGain();
        const filter = context.createBiquadFilter();

        osc.type = oscType;
        osc.frequency.setValueAtTime(freq, context.currentTime);
        if (style.detune) {
            osc.detune.setValueAtTime(style.detune, context.currentTime);
        }

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(options.filter || style.filter || 8000, context.currentTime);

        const attack = (options.attack || adsrAttack) / 1000;
        const decay = (options.decay || adsrDecay) / 1000;
        const release = (options.release || adsrRelease) / 1000;

        gain.gain.setValueAtTime(0, context.currentTime);
        gain.gain.linearRampToValueAtTime(finalVol, context.currentTime + attack);
        var decayEndTime = context.currentTime + attack + decay;
        var releaseEndTime = context.currentTime + duration + release;
        if (releaseEndTime <= decayEndTime) {
            releaseEndTime = decayEndTime + 0.01;
        }
        gain.gain.exponentialRampToValueAtTime(finalVol * 0.3, decayEndTime);
        gain.gain.exponentialRampToValueAtTime(0.001, releaseEndTime);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);

        osc.start(context.currentTime);
        osc.stop(context.currentTime + duration + release + 0.1);
    }

    // 不同风格的音效变体
    function playClick() {
        const style = getStyle();
        if (style.type === 'square' || style.type === 'sawtooth') {
            playTone(880, 0.05, null, 0.3, { type: style.type, filter: style.filter });
        } else if (currentSfxStyle === 'wood' || currentSfxStyle === 'drum') {
            playTone(200, 0.08, null, 0.4, { filter: 1500 });
        } else if (currentSfxStyle === 'bell') {
            playTone(1200, 0.15, null, 0.25, { filter: 12000 });
            setTimeout(() => playTone(1800, 0.1, null, 0.15, { filter: 12000 }), 50);
        } else if (currentSfxStyle === 'space') {
            playTone(400, 0.3, null, 0.2, { filter: 3000 });
        } else {
            playTone(800, 0.05, null, 0.3);
        }
    }

    function playReveal() {
        const style = getStyle();
        if (currentSfxStyle === 'bell') {
            playTone(600, 0.08, null, 0.2, { filter: 10000 });
        } else if (currentSfxStyle === 'piano') {
            playTone(523, 0.1, null, 0.25, { filter: 8000 });
        } else {
            playTone(600, 0.08, null, 0.2);
        }
    }

    function playFlag() {
        const style = getStyle();
        if (currentSfxStyle === 'drum') {
            playTone(100, 0.1, null, 0.35, { filter: 800 });
        } else if (currentSfxStyle === '8bit') {
            playTone(300, 0.05, null, 0.3);
            setTimeout(() => playTone(400, 0.05, null, 0.2), 50);
        } else {
            playTone(400, 0.1, null, 0.3);
        }
    }

    function playUnflag() {
        playTone(300, 0.1, null, 0.25);
    }

    function playWin() {
        if (!enabled) return;
        resume();
        const style = getStyle();
        const baseNotes = [523, 659, 784, 1047];
        const delays = [0, 120, 240, 360];

        baseNotes.forEach((freq, i) => {
            setTimeout(() => {
                playTone(freq, 0.3, null, 0.4, {
                    type: style.type,
                    filter: style.filter,
                    attack: 10,
                    decay: 100
                });
            }, delays[i]);
        });

        // 额外装饰音
        if (currentSfxStyle === 'bell' || currentSfxStyle === 'piano') {
            setTimeout(() => playTone(1319, 0.4, null, 0.3, { filter: 12000 }), 500);
        }
    }

    function playLose() {
        if (!enabled) return;
        resume();
        const style = getStyle();
        const notes = [400, 350, 300, 200];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                playTone(freq, 0.3, null, 0.25, {
                    type: style.type === 'sine' ? 'sawtooth' : style.type,
                    filter: 2000
                });
            }, i * 150);
        });
    }

    function playChord() {
        const style = getStyle();
        playTone(500, 0.06, null, 0.2, { filter: style.filter });
    }

    function playHint() {
        if (!enabled) return;
        resume();
        playTone(880, 0.15, null, 0.3, { type: 'sine', filter: 10000 });
        setTimeout(() => playTone(1100, 0.2, null, 0.3, { type: 'sine', filter: 10000 }), 120);
    }

    function playHover() {
        playTone(1200, 0.02, null, 0.05);
    }

    function playCount() {
        playTone(1000, 0.03, null, 0.15);
    }

    // ========== 新增音效 ==========

    function playTick() {
        if (!enabled) return;
        resume();
        playTone(1200, 0.04, 'square', 0.12, { filter: 6000 });
    }

    function playTimeout() {
        if (!enabled) return;
        resume();
        var notes = [600, 500, 400, 300];
        notes.forEach(function(freq, i) {
            setTimeout(function() {
                playTone(freq, 0.3, 'sawtooth', 0.3, { filter: 2000 });
            }, i * 120);
        });
    }

    function playStreakUp(n) {
        if (!enabled) return;
        resume();
        var baseFreq = 440 + Math.min(n * 50, 400);
        playTone(baseFreq, 0.15, 'sine', 0.35, { filter: 8000 });
        setTimeout(function() {
            playTone(baseFreq * 1.25, 0.2, 'sine', 0.3, { filter: 8000 });
        }, 100);
        setTimeout(function() {
            playTone(baseFreq * 1.5, 0.3, 'sine', 0.25, { filter: 10000 });
        }, 220);
    }

    function playStreakReset() {
        if (!enabled) return;
        resume();
        playTone(400, 0.2, 'sawtooth', 0.25, { filter: 1500 });
        setTimeout(function() {
            playTone(300, 0.3, 'sawtooth', 0.2, { filter: 1000 });
        }, 150);
    }

    function playPowerUp() {
        if (!enabled) return;
        resume();
        playTone(660, 0.08, 'sine', 0.3, { filter: 8000 });
        setTimeout(function() {
            playTone(880, 0.12, 'sine', 0.25, { filter: 10000 });
        }, 80);
        setTimeout(function() {
            playTone(1320, 0.2, 'sine', 0.2, { filter: 12000 });
        }, 180);
    }

    function playLevelUp() {
        if (!enabled) return;
        resume();
        var notes = [523, 659, 784, 1047, 1319];
        notes.forEach(function(freq, i) {
            setTimeout(function() {
                playTone(freq, 0.25, 'sine', 0.3, { filter: 9000, attack: 15 });
            }, i * 100);
        });
    }

    function playCombo(milestone) {
        if (!enabled) return;
        resume();
        var freq = 600 + milestone * 40;
        playTone(freq, 0.1, 'sine', 0.3, { filter: 8000 });
        setTimeout(function() {
            playTone(freq * 1.2, 0.15, 'sine', 0.25, { filter: 10000 });
        }, 80);
    }

    function startMusic() {
        if (!musicEnabled || !enabled) return;
        resume();
        const context = getCtx();

        musicGain = context.createGain();
        musicGain.gain.value = musicVol * volume * masterVolume;
        musicGain.connect(context.destination);

        // 根据音乐风格选择旋律
        const melodies = {
            orchestral: [262, 294, 330, 349, 330, 294, 262, 196],
            ambient:    [262, 262, 294, 294, 330, 330, 349, 349],
            electronic: [330, 392, 523, 392, 330, 392, 523, 659],
            piano:      [262, 294, 262, 349, 330, 294, 262, 294],
            synth:      [392, 392, 523, 392, 659, 523, 784, 659],
            nature:     [262, 294, 262, 330, 294, 262, 220, 196],
            jazz:       [262, 294, 330, 294, 262, 247, 262, 294],
            meditation: [196, 262, 196, 262, 196, 262, 196, 262],
            cyber:      [523, 523, 659, 523, 784, 659, 1047, 784],
            lofi:       [262, 294, 349, 294, 262, 220, 196, 220],
        };

        var musicStyle = (typeof Settings !== 'undefined') ? Settings.get('musicStyle') : 'orchestral';
        const melody = melodies[musicStyle] || melodies.orchestral;
        let noteIndex = 0;

        // 读取 tempo 设置（修复：原来硬编码 500ms）
        var tempoSetting = (typeof Settings !== 'undefined') ? (Settings.get('musicTempo') || 100) : 100;
        var noteInterval = Math.max(200, Math.min(1000, 500 * (100 / tempoSetting)));
        var sustainTime = Math.max(150, noteInterval * 0.8);

        // 混响效果（修复：原来未接入信号链）
        var convolver = null;
        var reverbGain = null;
        if (musicReverbAmount > 0.01) {
            convolver = context.createConvolver();
            reverbGain = context.createGain();
            reverbGain.gain.value = musicReverbAmount;
            // 程序化生成简单脉冲响应
            var impulseLen = context.sampleRate * 1.5;
            var impulse = context.createBuffer(2, impulseLen, context.sampleRate);
            for (var ch = 0; ch < 2; ch++) {
                var data = impulse.getChannelData(ch);
                for (var i = 0; i < impulseLen; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLen, 2);
                }
            }
            convolver.buffer = impulse;
            musicGain.connect(convolver);
            convolver.connect(reverbGain);
            reverbGain.connect(context.destination);
        }

        function playNextNote() {
            if (!musicEnabled) return;

            if (musicOsc) {
                try { musicOsc.stop(); } catch(e) {}
            }

            musicOsc = context.createOscillator();
            musicOsc.type = 'sine';
            musicOsc.frequency.value = melody[noteIndex % melody.length];
            musicOsc.connect(musicGain);
            musicOsc.start();

            setTimeout(function() {
                if (musicOsc) {
                    try { musicOsc.stop(); } catch(e) {}
                }
            }, sustainTime);

            noteIndex++;
            setTimeout(playNextNote, noteInterval);
        }

        playNextNote();
    }

    function stopMusic() {
        if (musicOsc) {
            try { musicOsc.stop(); } catch(e) {}
            musicOsc = null;
        }
        musicGain = null;
    }

    function setEnabled(v) {
        enabled = v;
    }

    var musicStarted = false;
    function setMusicEnabled(v) {
        if (musicEnabled === v) return;
        musicEnabled = v;
        if (musicEnabled) {
            if (!musicStarted) {
                musicStarted = true;
                startMusic();
            }
        } else {
            musicStarted = false;
            stopMusic();
        }
    }

    function setVolume(v) {
        volume = Math.max(0, Math.min(1, v));
        if (musicGain) {
            musicGain.gain.value = musicVol * volume * masterVolume;
        }
    }

    function setMasterVolume(v) {
        masterVolume = Math.max(0, Math.min(1, v));
        if (musicGain) {
            musicGain.gain.value = musicVol * volume * masterVolume;
        }
    }

    function setSfxVolume(v) {
        sfxVolume = Math.max(0, Math.min(1, v));
    }

    function setMusicVolume(v) {
        musicVol = Math.max(0, Math.min(1, v));
        if (musicGain) {
            musicGain.gain.value = musicVol * volume * masterVolume;
        }
    }

    function setSfxStyle(style) {
        currentSfxStyle = style;
    }

    function setAdsr(a, d, r) {
        adsrAttack = a;
        adsrDecay = d;
        adsrRelease = r;
    }

    function setMusicReverb(v) {
        musicReverbAmount = v;
    }

    return {
        playClick,
        playReveal,
        playFlag,
        playUnflag,
        playWin,
        playLose,
        playChord,
        playHint,
        playHover,
        playCount,
        playTick,
        playTimeout,
        playStreakUp,
        playStreakReset,
        playPowerUp,
        playLevelUp,
        playCombo,
        setEnabled,
        setMusicEnabled,
        setVolume,
        setMasterVolume,
        setSfxVolume,
        setMusicVolume,
        setSfxStyle,
        setAdsr,
        setMusicReverb,
        get enabled() { return enabled; }
    };
})();
