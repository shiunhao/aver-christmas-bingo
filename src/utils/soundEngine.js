/**
 * Web Audio API 溫馨聖誕音樂盒與互動音效引擎
 * 無須外部 MP3 檔案，100% 離線可用且零載入延遲
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.voiceEnabled = false;
    this.isPlayingMusic = false;
    this.musicTimer = null;
    this.noteIndex = 0;

    // 經典聖誕音樂盒旋律 (Jingle Bells + We Wish You a Merry Christmas 溫馨慢板音樂盒編曲)
    // 頻率對照 (Hz): C4=261.6, D4=293.7, E4=329.6, F4=349.2, G4=392.0, A4=440.0, B4=493.9,
    // C5=523.3, D5=587.3, E5=659.3, F5=698.5, G5=784.0, A5=880.0
    this.melody = [
      // Jingle Bells 主歌
      { f: 659.3, b: 392.0, d: 0.32 }, { f: 659.3, b: 0, d: 0.32 }, { f: 659.3, b: 523.3, d: 0.64 },
      { f: 659.3, b: 392.0, d: 0.32 }, { f: 659.3, b: 0, d: 0.32 }, { f: 659.3, b: 523.3, d: 0.64 },
      { f: 659.3, b: 392.0, d: 0.32 }, { f: 784.0, b: 0, d: 0.32 }, { f: 523.3, b: 329.6, d: 0.48 }, { f: 587.3, b: 0, d: 0.16 },
      { f: 659.3, b: 523.3, d: 0.96 }, { f: 0, b: 392.0, d: 0.32 },

      { f: 698.5, b: 349.2, d: 0.32 }, { f: 698.5, b: 0, d: 0.32 }, { f: 698.5, b: 440.0, d: 0.48 }, { f: 698.5, b: 0, d: 0.16 },
      { f: 698.5, b: 392.0, d: 0.32 }, { f: 659.3, b: 0, d: 0.32 }, { f: 659.3, b: 523.3, d: 0.32 }, { f: 659.3, b: 0, d: 0.16 }, { f: 659.3, b: 0, d: 0.16 },
      { f: 659.3, b: 293.7, d: 0.32 }, { f: 587.3, b: 0, d: 0.32 }, { f: 587.3, b: 440.0, d: 0.32 }, { f: 659.3, b: 0, d: 0.32 },
      { f: 587.3, b: 392.0, d: 0.64 }, { f: 784.0, b: 493.9, d: 0.64 },

      // Jingle Bells 第二段結尾
      { f: 659.3, b: 392.0, d: 0.32 }, { f: 659.3, b: 0, d: 0.32 }, { f: 659.3, b: 523.3, d: 0.64 },
      { f: 659.3, b: 392.0, d: 0.32 }, { f: 659.3, b: 0, d: 0.32 }, { f: 659.3, b: 523.3, d: 0.64 },
      { f: 659.3, b: 392.0, d: 0.32 }, { f: 784.0, b: 0, d: 0.32 }, { f: 523.3, b: 329.6, d: 0.48 }, { f: 587.3, b: 0, d: 0.16 },
      { f: 659.3, b: 523.3, d: 0.96 }, { f: 0, b: 392.0, d: 0.32 },

      { f: 698.5, b: 349.2, d: 0.32 }, { f: 698.5, b: 0, d: 0.32 }, { f: 698.5, b: 440.0, d: 0.48 }, { f: 698.5, b: 0, d: 0.16 },
      { f: 698.5, b: 392.0, d: 0.32 }, { f: 659.3, b: 0, d: 0.32 }, { f: 659.3, b: 523.3, d: 0.32 }, { f: 659.3, b: 0, d: 0.32 },
      { f: 784.0, b: 392.0, d: 0.32 }, { f: 784.0, b: 0, d: 0.32 }, { f: 698.5, b: 493.9, d: 0.32 }, { f: 587.3, b: 0, d: 0.32 },
      { f: 523.3, b: 261.6, d: 0.96 }, { f: 0, b: 392.0, d: 0.48 }
    ];
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // 播放單顆音樂盒泛音音符
  playMusicBoxNote(freq, bassFreq, duration) {
    if (!this.ctx || !this.musicEnabled) return;
    const now = this.ctx.currentTime;

    if (freq > 0) {
      const osc = this.ctx.createOscillator();
      const harmonic = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const hGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      harmonic.type = 'triangle';
      harmonic.frequency.setValueAtTime(freq * 2, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.055, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + Math.max(duration * 1.6, 0.45));

      hGain.gain.setValueAtTime(0.001, now);
      hGain.gain.linearRampToValueAtTime(0.012, now + 0.01);
      hGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.22);

      osc.connect(gain);
      harmonic.connect(hGain);
      gain.connect(this.ctx.destination);
      hGain.connect(this.ctx.destination);

      osc.start(now);
      harmonic.start(now);
      osc.stop(now + Math.max(duration * 1.65, 0.5));
      harmonic.stop(now + 0.25);
    }

    if (bassFreq > 0) {
      const bOsc = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(bassFreq, now);

      bGain.gain.setValueAtTime(0.001, now);
      bGain.gain.linearRampToValueAtTime(0.028, now + 0.02);
      bGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.55);

      bOsc.connect(bGain);
      bGain.connect(this.ctx.destination);
      bOsc.start(now);
      bOsc.stop(now + 0.6);
    }
  }

  startMusic() {
    this.ensureContext();
    if (this.isPlayingMusic || !this.musicEnabled) return;
    this.isPlayingMusic = true;

    const scheduleNext = () => {
      if (!this.isPlayingMusic || !this.musicEnabled) return;
      const item = this.melody[this.noteIndex % this.melody.length];
      this.noteIndex = (this.noteIndex + 1) % this.melody.length;
      if (this.ctx && this.ctx.state === 'running') {
        this.playMusicBoxNote(item.f, item.b, item.d);
      }
      this.musicTimer = setTimeout(scheduleNext, item.d * 1000);
    };

    scheduleNext();
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (enabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = enabled;
  }

  setVoiceEnabled(enabled) {
    this.voiceEnabled = enabled;
  }

  // 滾輪跳號音效 (木質清脆跳動聲)
  playTick(progress = 0) {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const baseFreq = 320 + progress * 260;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + 0.045);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // 號碼開出定格時的歡樂叮咚音效
  playDrawReveal() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.075;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx === notes.length - 1 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (idx === notes.length - 1 ? 0.65 : 0.25));

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    });
  }

  // 按鈕點擊木牌音效
  playClick() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.04);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  // 點擊聖誕樹星芒風鈴聲
  playTreeChime() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const chimes = [1046.5, 1174.7, 1318.5, 1568.0, 2093.0];
    chimes.forEach((f, i) => {
      const now = this.ctx.currentTime + i * 0.055;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    });
  }

  // BINGO! 勝利號角慶祝音效
  playBingoFanfare() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const fanfare = [
      { f: 523.25, t: 0, d: 0.14 },
      { f: 523.25, t: 0.15, d: 0.14 },
      { f: 523.25, t: 0.3, d: 0.14 },
      { f: 659.25, t: 0.45, d: 0.35 },
      { f: 587.33, t: 0.82, d: 0.16 },
      { f: 659.25, t: 1.0, d: 0.16 },
      { f: 783.99, t: 1.18, d: 0.65 },
      { f: 1046.5, t: 1.2, d: 0.7 }
    ];

    fanfare.forEach((n) => {
      const now = this.ctx.currentTime + n.t;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, now);
      gain.gain.setValueAtTime(0.13, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.d);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + n.d + 0.05);
    });
  }

  // 玩家端：點選賓果格標記音效（清脆雙音叮咚）
  playTileMark() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [587.33, 880.0]; // D5 -> A5
    notes.forEach((f, idx) => {
      const now = this.ctx.currentTime + idx * 0.055;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    });
  }

  // 玩家端：取消賓果格標記音效（柔和退回音）
  playTileUnmark() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(293.66, now + 0.08);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  // 玩家端：達成新連線時的璀璨星芒慶祝音效
  playLineComplete(lineCount = 1) {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    // 隨著連線數增加，結尾音高更華麗
    const chord =
      lineCount >= 3
        ? [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98]
        : [523.25, 659.25, 783.99, 1046.5, 1318.5];

    chord.forEach((f, idx) => {
      const now = this.ctx.currentTime + idx * 0.07;
      const osc = this.ctx.createOscillator();
      const sub = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now);

      sub.type = 'sine';
      sub.frequency.setValueAtTime(f * 2, now);

      const dur = idx === chord.length - 1 ? 0.65 : 0.28;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);

      osc.connect(gain);
      sub.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      sub.start(now);
      osc.stop(now + dur + 0.04);
      sub.stop(now + dur + 0.04);
    });
  }

  // 中文語音報號 (選配)
  speakNumber(num, phrase) {
    if (!this.voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(`${num}號！${phrase}`);
      utter.lang = 'zh-TW';
      utter.rate = 1.08;
      utter.pitch = 1.1;
      window.speechSynthesis.speak(utter);
    } catch {
      // 忽略語音錯誤
    }
  }
}

export const soundEngine = new SoundEngine();
