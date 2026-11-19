/**
 * Nhạc nền tự soạn bằng WebAudio (không dùng file nhạc → không lo bản quyền, rất nhẹ).
 * Mỗi chủ đề là một vòng hợp âm + bass + giai điệu ngũ cung + bè đệm (+ trống cho trận đấu),
 * lập lịch trước ~0,25 giây để không vấp tiếng.
 */
export type MusicTheme = "hub" | "fishing" | "battle" | "boss" | "calm";

interface Song {
  bpm: number;
  /** Hợp âm mỗi ô nhịp: nốt gốc (MIDI) + kiểu. */
  chords: [number, "maj" | "min" | "sus"][];
  /** Thang ngũ cung cho giai điệu (bán cung so với nốt gốc của bài). */
  scale: number[];
  key: number;
  lead: OscillatorType;
  leadVol: number;
  density: number; // xác suất có nốt giai điệu mỗi phách lẻ
  drums: boolean;
  pad: number; // âm lượng bè đệm
  seed: number;
}

const SONGS: Record<MusicTheme, Song> = {
  // Sảnh: vui tươi, nhịp vừa (Đô trưởng ngũ cung)
  hub: { bpm: 104, chords: [[60, "maj"], [57, "min"], [65, "maj"], [67, "maj"]], scale: [0, 2, 4, 7, 9, 12, 14, 16], key: 72, lead: "triangle", leadVol: 0.09, density: 0.75, drums: false, pad: 0.03, seed: 7 },
  // Câu cá: êm, sóng nước (La thứ ngũ cung – âm hưởng dân ca)
  fishing: { bpm: 78, chords: [[57, "min"], [53, "maj"], [55, "maj"], [52, "min"]], scale: [0, 3, 5, 7, 10, 12, 15, 17], key: 69, lead: "sine", leadVol: 0.08, density: 0.45, drums: false, pad: 0.035, seed: 3 },
  // Menu/khác: nhẹ nhàng
  calm: { bpm: 90, chords: [[65, "maj"], [62, "min"], [58, "maj"], [60, "sus"]], scale: [0, 2, 4, 7, 9, 12, 14], key: 77, lead: "sine", leadVol: 0.06, density: 0.4, drums: false, pad: 0.03, seed: 11 },
  // Đấu Sinh Tử: dồn dập (Rê thứ)
  battle: { bpm: 144, chords: [[50, "min"], [46, "maj"], [48, "maj"], [45, "min"]], scale: [0, 3, 5, 7, 10, 12, 15], key: 74, lead: "square", leadVol: 0.05, density: 0.85, drums: true, pad: 0.025, seed: 21 },
  // Săn Boss: căng thẳng (Mi Phrygian)
  boss: { bpm: 126, chords: [[52, "min"], [53, "maj"], [52, "min"], [50, "maj"]], scale: [0, 1, 3, 7, 8, 12, 13], key: 76, lead: "sawtooth", leadVol: 0.04, density: 0.7, drums: true, pad: 0.03, seed: 13 },
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const triad = (root: number, q: "maj" | "min" | "sus") => [root, root + (q === "maj" ? 4 : q === "min" ? 3 : 5), root + 7];

class MusicEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private song: Song | null = null;
  private theme: MusicTheme | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private rngState = 1;
  private melodyIdx = 3;
  enabled = true;

  constructor() {
    try {
      this.enabled = localStorage.getItem("dccc_music") !== "off";
    } catch {
      /* mặc định bật */
    }
  }

  /** Gọi khi AudioContext đã được mở khoá (sau lần chạm đầu tiên). */
  attach(ctx: AudioContext) {
    if (this.ctx) return;
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    // lọc nhẹ cho tiếng tròn, đỡ chói trên loa điện thoại
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 5200;
    this.master.connect(lp).connect(ctx.destination);
    if (this.theme) this.start(this.theme, true);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    try {
      localStorage.setItem("dccc_music", on ? "on" : "off");
    } catch {
      /* bỏ qua */
    }
    if (!on) this.stop();
    else if (this.theme) this.start(this.theme, true);
  }

  /** Đổi chủ đề nhạc (không làm gì nếu đang phát đúng chủ đề). */
  play(theme: MusicTheme) {
    if (theme === this.theme && this.timer) return;
    this.theme = theme;
    this.start(theme, false);
  }

  private start(theme: MusicTheme, force: boolean) {
    if (!this.ctx || !this.master || !this.enabled) return;
    if (!force && this.timer && this.song === SONGS[theme]) return;
    const c = this.ctx;
    // chuyển bài mượt: giảm âm lượng → đổi bài → tăng lại
    this.master.gain.cancelScheduledValues(c.currentTime);
    this.master.gain.setTargetAtTime(0, c.currentTime, 0.15);
    if (this.timer) clearInterval(this.timer);
    this.song = SONGS[theme];
    this.rngState = this.song.seed;
    this.step = 0;
    this.melodyIdx = 3;
    this.nextTime = c.currentTime + 0.6;
    this.master.gain.setTargetAtTime(1, c.currentTime + 0.6, 0.4);
    this.timer = setInterval(() => this.schedule(), 90);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
  }

  private rand() {
    // LCG đơn giản – giai điệu lặp lại giống nhau mỗi lần nghe
    this.rngState = (this.rngState * 1103515245 + 12345) & 0x7fffffff;
    return this.rngState / 0x7fffffff;
  }

  private note(freq: number, t: number, dur: number, type: OscillatorType, vol: number, attack = 0.01) {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private hat(t: number, vol: number, len = 0.05) {
    const c = this.ctx!;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 6000;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master!);
    src.start(t);
  }

  private kick(t: number) {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.2);
  }

  private schedule() {
    const c = this.ctx;
    const s = this.song;
    if (!c || !s || !this.enabled) return;
    if (c.state === "suspended") return;
    const eighth = 60 / s.bpm / 2;
    while (this.nextTime < c.currentTime + 0.25) {
      const t = this.nextTime;
      const bar = Math.floor(this.step / 8) % s.chords.length;
      const pos = this.step % 8;
      const [root, q] = s.chords[bar]!;
      const chord = triad(root, q);
      // bè đệm: hợp âm dài đầu ô nhịp
      if (pos === 0) for (const n of chord) this.note(midi(n), t, eighth * 8, "sine", s.pad, 0.25);
      // bass: phách 1 và 3 (+ móc ở trận đấu)
      if (pos === 0 || pos === 4 || (s.drums && pos === 6)) this.note(midi(root - 12), t, eighth * 1.8, "triangle", 0.13);
      // giai điệu: bước đi ngẫu nhiên có kiểm soát trên thang ngũ cung, ưu tiên nốt hợp âm ở phách mạnh
      const strong = pos % 2 === 0;
      if ((strong && this.rand() < 0.9) || (!strong && this.rand() < s.density * 0.6)) {
        const move = Math.floor(this.rand() * 5) - 2;
        this.melodyIdx = Math.max(0, Math.min(s.scale.length - 1, this.melodyIdx + move));
        let n = s.key + s.scale[this.melodyIdx]!;
        if (pos === 0) n = chord.reduce((best, x) => (Math.abs(x + 12 - n) < Math.abs(best - n) ? x + 12 : best), chord[0]! + 12);
        const len = this.rand() < 0.3 ? eighth * 2 : eighth * 0.9;
        this.note(midi(n), t, len, s.lead, s.leadVol * (strong ? 1 : 0.7));
      }
      // trống
      if (s.drums) {
        if (pos === 0 || pos === 4) this.kick(t);
        this.hat(t, pos % 2 ? 0.05 : 0.025);
        if (pos === 2 || pos === 6) this.hat(t, 0.08, 0.12);
      } else if (pos === 4 && this.rand() < 0.5) this.hat(t, 0.015, 0.03);
      this.nextTime += eighth;
      this.step++;
    }
  }
}

export const Music = new MusicEngine();
