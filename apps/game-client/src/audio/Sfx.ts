import { GameState } from "../state/GameState.ts";
import { Music } from "./Music.ts";

/**
 * Âm thanh tổng hợp bằng WebAudio – không cần tải file, nhẹ cho điện thoại.
 * AudioContext chỉ được tạo sau tương tác đầu tiên của người chơi.
 */
class SfxEngine {
  private ctx: AudioContext | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private reelGain: GainNode | null = null;

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      Music.attach(this.ctx);
    } catch {
      this.ctx = null;
    }
  }

  private get ok() {
    return !!this.ctx && GameState.soundOn;
  }

  private tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.2, delay = 0, slideTo?: number) {
    if (!this.ok) return;
    const c = this.ctx!;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noise(dur: number, freq: number, vol = 0.3, delay = 0, q = 1, sweepTo?: number) {
    if (!this.ok || !this.noiseBuf) return;
    const c = this.ctx!;
    const t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  click() {
    this.tone(660, 0.07, "triangle", 0.15);
  }
  locked() {
    this.tone(220, 0.12, "square", 0.08);
    this.tone(180, 0.15, "square", 0.08, 0.08);
  }
  cast() {
    this.noise(0.35, 2400, 0.25, 0, 2, 600);
  }
  splash(big = false) {
    this.noise(big ? 0.7 : 0.4, 900, big ? 0.5 : 0.35, 0, 0.8, 200);
    this.tone(big ? 140 : 260, 0.18, "sine", 0.15, 0, big ? 60 : 120);
  }
  bite() {
    this.tone(880, 0.09, "square", 0.12);
    this.tone(1175, 0.12, "square", 0.12, 0.1);
  }
  hook() {
    this.tone(300, 0.15, "sawtooth", 0.15, 0, 600);
  }
  danger() {
    this.tone(520, 0.1, "square", 0.08);
  }
  skill() {
    this.tone(400, 0.4, "sawtooth", 0.14, 0, 1200);
    this.noise(0.5, 3000, 0.2, 0.05, 1, 800);
  }
  crit() {
    this.tone(1400, 0.08, "square", 0.1);
  }
  snap() {
    this.tone(1200, 0.25, "sawtooth", 0.2, 0, 90);
    this.noise(0.2, 4000, 0.3);
  }
  fail() {
    [392, 330, 262].forEach((f, i) => this.tone(f, 0.22, "triangle", 0.15, i * 0.16));
  }
  catchFanfare(rare: boolean) {
    const notes = rare ? [523, 659, 784, 1047, 1319] : [523, 659, 784, 1047];
    notes.forEach((f, i) => this.tone(f, 0.25, "triangle", 0.16, i * 0.09));
    if (rare) [1047, 1319, 1568].forEach((f) => this.tone(f, 0.9, "sine", 0.1, notes.length * 0.09));
  }
  levelUp() {
    [523, 784, 1047, 1568].forEach((f, i) => this.tone(f, 0.3, "square", 0.08, i * 0.08));
  }
  coin() {
    this.tone(988, 0.07, "square", 0.08);
    this.tone(1319, 0.18, "square", 0.08, 0.07);
  }

  /** Tiếng guồng quay khi kéo dây (liên tục). */
  setReeling(on: boolean, tension = 0) {
    if (!this.ok) {
      this.stopReel();
      return;
    }
    const c = this.ctx!;
    if (on && !this.reelGain) {
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 1800;
      f.Q.value = 6;
      const lfo = c.createOscillator();
      const lg = c.createGain();
      const g = c.createGain();
      lfo.frequency.value = 22;
      lg.gain.value = 0.05;
      g.gain.value = 0.05;
      lfo.connect(lg).connect(g.gain);
      src.connect(f).connect(g).connect(c.destination);
      src.start();
      lfo.start();
      this.reelGain = g;
      (g as unknown as { _stop: () => void })._stop = () => {
        src.stop();
        lfo.stop();
      };
    }
    if (!on) this.stopReel();
    else if (this.reelGain) this.reelGain.gain.value = 0.04 + tension * 0.0008;
  }

  private stopReel() {
    if (this.reelGain) {
      (this.reelGain as unknown as { _stop: () => void })._stop();
      this.reelGain.disconnect();
      this.reelGain = null;
    }
  }
}

export const Sfx = new SfxEngine();
