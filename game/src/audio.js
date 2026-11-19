export class Audio {
    constructor(game) {
        this.game = game;
        this.context = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.musicSource = null;
        this.musicBuffer = null;
        this.sfxBuffers = {};
        this.musicVolume = 0.5;
        this.sfxVolume = 0.7;
        this.currentStation = 0;
        this.stations = [
            { name: 'Wave 88.5', genre: 'Neon Drive', artist: 'Midnight Driver', bpm: 120, baseFreq: 220 },
            { name: 'Bay FM 97.3', genre: 'Coastal Vibes', artist: 'Sunset Collective', bpm: 100, baseFreq: 180 },
            { name: 'Static 104.1', genre: 'Underground', artist: 'Neon Shadows', bpm: 140, baseFreq: 150 }
        ];
        this.rng = new SeededRNG(44444);
    }

    init() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.context.destination);

            this.musicGain = this.context.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.context.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);

            this.generateSfx();
            // startMusic may throw if context is suspended (no user gesture yet)
            try { this.startMusic(); } catch (e) { console.warn('Music start deferred:', e); }
        } catch (e) {
            console.warn('WebAudio not available:', e);
        }
    }

    generateSfx() {
        this.sfxBuffers = {
            shoot: this.createShootSound(),
            car_door: this.createCarDoorSound(),
            engine: this.createEngineSound(),
            honk: this.createHonkSound(),
            explosion: this.createExplosionSound(),
            death: this.createDeathSound(),
            mission_start: this.createMissionStartSound(),
            mission_complete: this.createMissionCompleteSound(),
            mission_fail: this.createMissionFailSound()
        };
    }

    createShootSound() {
        const buffer = this.context.createBuffer(1, this.context.sampleRate * 0.1, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            const t = i / this.context.sampleRate;
            data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 50) * 0.3;
        }
        return buffer;
    }

    createCarDoorSound() {
        const buffer = this.context.createBuffer(1, this.context.sampleRate * 0.2, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            const t = i / this.context.sampleRate;
            data[i] = Math.sin(200 * Math.PI * t) * Math.exp(-t * 20) * 0.2;
        }
        return buffer;
    }

    createEngineSound() {
        const buffer = this.context.createBuffer(1, this.context.sampleRate * 1, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            const t = i / this.context.sampleRate;
            data[i] = (Math.sin(80 * Math.PI * t) + Math.sin(160 * Math.PI * t) * 0.5) * 0.1;
        }
        return buffer;
    }

    createHonkSound() {
        const buffer = this.context.createBuffer(1, this.context.sampleRate * 0.5, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            const t = i / this.context.sampleRate;
            data[i] = Math.sin(440 * Math.PI * t) * Math.exp(-t * 3) * 0.2;
        }
        return buffer;
    }

    createExplosionSound() {
        const buffer = this.context.createBuffer(1, this.context.sampleRate * 1.5, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            const t = i / this.context.sampleRate;
            data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 2) * 0.4;
        }
        return buffer;
    }

    createDeathSound() {
        const buffer = this.context.createBuffer(1, this.context.sampleRate * 0.5, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            const t = i / this.context.sampleRate;
            data[i] = Math.sin(200 * Math.PI * t) * Math.exp(-t * 10) * 0.3;
        }
        return buffer;
    }

    createMissionStartSound() {
        const buffer = this.context.createBuffer(1, this.context.sampleRate * 0.5, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            const t = i / this.context.sampleRate;
            data[i] = Math.sin(523 * Math.PI * t) * Math.exp(-t * 5) * 0.2;
        }
        return buffer;
    }

    createMissionCompleteSound() {
        const buffer = this.context.createBuffer(1, this.context.sampleRate * 1, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        const notes = [523, 659, 784, 1047];
        for (let i = 0; i < data.length; i++) {
            const t = i / this.context.sampleRate;
            let val = 0;
            notes.forEach((freq, idx) => {
                val += Math.sin(freq * Math.PI * t) * Math.exp(-t * 2) * 0.1;
            });
            data[i] = val;
        }
        return buffer;
    }

    createMissionFailSound() {
        const buffer = this.context.createBuffer(1, this.context.sampleRate * 0.8, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            const t = i / this.context.sampleRate;
            data[i] = Math.sin(200 * Math.PI * t) * Math.exp(-t * 3) * 0.2;
        }
        return buffer;
    }

    playSfx(name, position) {
        if (!this.context || !this.sfxBuffers[name]) return;
        const source = this.context.createBufferSource();
        source.buffer = this.sfxBuffers[name];
        source.connect(this.sfxGain);
        source.start(0);

        if (position) {
            const panner = this.context.createPanner();
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.refDistance = 1;
            panner.maxDistance = 100;
            panner.rolloffFactor = 1;
            panner.positionX.setValueAtTime(position.x, this.context.currentTime);
            panner.positionY.setValueAtTime(position.y, this.context.currentTime);
            panner.positionZ.setValueAtTime(position.z, this.context.currentTime);
            source.connect(panner);
            panner.connect(this.sfxGain);
        }
    }

    startMusic() {
        if (!this.context) return;
        if (this.musicSource) {
            this.musicSource.stop();
        }
        this.generateMusicLoop();
        this.musicSource = this.context.createBufferSource();
        this.musicSource.buffer = this.musicBuffer;
        this.musicSource.loop = true;
        this.musicSource.connect(this.musicGain);
        this.musicSource.start(0);
    }

    generateMusicLoop() {
        const station = this.stations[this.currentStation];
        const duration = 8;
        const sampleRate = this.context.sampleRate;
        const length = sampleRate * duration;
        this.musicBuffer = this.context.createBuffer(2, length, sampleRate);

        for (let ch = 0; ch < 2; ch++) {
            const data = this.musicBuffer.getChannelData(ch);
            for (let i = 0; i < length; i++) {
                const t = i / sampleRate;
                const beat = Math.floor(t * station.bpm / 60);
                const beatPhase = (t * station.bpm / 60) % 1;

                let val = 0;
                val += Math.sin(station.baseFreq * Math.PI * 2 * t) * 0.15;
                val += Math.sin(station.baseFreq * 1.5 * Math.PI * 2 * t) * 0.08;
                val += Math.sin(station.baseFreq * 2 * Math.PI * 2 * t) * 0.04;

                if (beatPhase < 0.1) {
                    val += Math.sin(80 * Math.PI * 2 * t) * 0.2;
                }
                if (beatPhase < 0.05 && beat % 2 === 0) {
                    val += Math.sin(120 * Math.PI * 2 * t) * 0.15;
                }

                const bassFreq = station.baseFreq * 0.5;
                val += Math.sin(bassFreq * Math.PI * 2 * t) * 0.2 * (0.5 + 0.5 * Math.sin(t * 0.5));

                data[i] = val * 0.5;
            }
        }
    }

    switchStation() {
        this.currentStation = (this.currentStation + 1) % this.stations.length;
        this.startMusic();
        this.game.systems.hud.showNotification(`Radio: ${this.stations[this.currentStation].name}`);
    }

    setMusicVolume(vol) {
        this.musicVolume = vol;
        if (this.musicGain) this.musicGain.gain.value = vol;
    }

    setSfxVolume(vol) {
        this.sfxVolume = vol;
        if (this.sfxGain) this.sfxGain.gain.value = vol;
    }

    resume() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    }
}

class SeededRNG {
    constructor(seed) { this.seed = seed; }
    next() { this.seed = (this.seed * 1664525 + 1013904223) % 4294967296; return this.seed / 4294967296; }
    float(min=0, max=1) { return min + this.next() * (max - min); }
}
