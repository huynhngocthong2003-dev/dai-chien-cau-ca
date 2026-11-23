/**
 * Nhạc nền tự soạn bằng WebAudio (không dùng file nhạc → không lo bản quyền, rất nhẹ).
 * Mỗi chủ đề là MỘT BÀI CÓ GIAI ĐIỆU CỐ ĐỊNH 8 ô nhịp (dễ nhớ, vui tai) + bass nảy + rải hợp âm kiểu chiptune
 * + trống; vòng lặp thứ hai thêm bè hoà âm cho đỡ nhàm. Lập lịch trước ~0,25 giây để không vấp tiếng.
 */
export type MusicTheme = "hub" | "fishing" | "battle" | "boss" | "calm";

/** Một nốt giai điệu: [bán cung so với `key` (null = nghỉ), độ dài tính theo móc đơn]. Mỗi ô nhịp = 8 móc đơn. */
type MNote = [number | null, number];
type Quality = "maj" | "min" | "sus";

interface Song {
  bpm: number;
  /** Hợp âm mỗi ô nhịp: nốt gốc (MIDI) + kiểu. */
  chords: [number, Quality][];
  /** Giai điệu theo từng ô nhịp (cùng số ô với hợp âm). */
  melody: MNote[][];
  key: number;
  lead: OscillatorType;
  leadVol: number;
  /** Kiểu bass: "bounce" = gốc–quãng 8–quãng 5 nảy liên tục; "walk" = thong thả. */
  bass: "bounce" | "walk";
  /** Rải hợp âm (âm lượng, 0 = tắt). */
  arp: number;
  /** Trống: "full" = kick/snare/hat; "light" = kick nhẹ + hat; "none". */
  drums: "full" | "light" | "none";
  pad: number;
  /** Độ vang của giai điệu (0..0,5). */
  echo: number;
}

const SONGS: Record<MusicTheme, Song> = {
  // Sảnh: lễ hội vui tươi, nhún nhảy (Đô trưởng) – C G Am F | C G F G
  hub: {
    bpm: 132,
    chords: [[60, "maj"], [55, "maj"], [57, "min"], [53, "maj"], [60, "maj"], [55, "maj"], [53, "maj"], [55, "maj"]],
    melody: [
      [[4, 1], [7, 1], [9, 1], [7, 1], [4, 1], [0, 1], [2, 1], [4, 1]],
      [[2, 1], [2, 1], [-1, 1], [-5, 1], [2, 2], [null, 2]],
      [[0, 1], [4, 1], [9, 1], [7, 1], [4, 1], [0, 1], [4, 1], [7, 1]],
      [[5, 2], [4, 1], [2, 1], [0, 2], [null, 2]],
      [[4, 1], [7, 1], [12, 1], [11, 1], [9, 1], [7, 1], [4, 1], [7, 1]],
      [[7, 1], [9, 1], [11, 1], [14, 1], [11, 2], [7, 2]],
      [[9, 1], [9, 1], [7, 1], [5, 1], [4, 1], [5, 1], [7, 1], [9, 1]],
      [[7, 2], [2, 2], [4, 1], [2, 1], [0, 2]],
    ],
    key: 72,
    lead: "triangle",
    leadVol: 0.085,
    bass: "bounce",
    arp: 0.018,
    drums: "full",
    pad: 0.022,
    echo: 0.28,
  },
  // Câu cá: thư thái mà vẫn rộn ràng (Son trưởng ngũ cung) – G Em C D
  fishing: {
    bpm: 108,
    chords: [[55, "maj"], [52, "min"], [48, "maj"], [50, "maj"], [55, "maj"], [52, "min"], [48, "maj"], [50, "maj"]],
    melody: [
      [[12, 2], [9, 1], [7, 1], [4, 2], [7, 2]],
      [[9, 1], [7, 1], [4, 1], [2, 1], [4, 4]],
      [[0, 1], [2, 1], [4, 1], [7, 1], [9, 2], [7, 2]],
      [[9, 1], [12, 1], [14, 2], [12, 2], [null, 2]],
      [[12, 1], [14, 1], [16, 2], [14, 1], [12, 1], [9, 2]],
      [[7, 2], [9, 1], [7, 1], [4, 4]],
      [[4, 1], [7, 1], [9, 1], [12, 1], [9, 1], [7, 1], [4, 1], [2, 1]],
      [[2, 2], [4, 2], [7, 4]],
    ],
    key: 67,
    lead: "triangle",
    leadVol: 0.085,
    bass: "walk",
    arp: 0.018,
    drums: "light",
    pad: 0.028,
    echo: 0.32,
  },
  // Menu/khác: tươi sáng, nhẹ nhàng (Fa trưởng) – F C Dm Bb
  calm: {
    bpm: 116,
    chords: [[53, "maj"], [48, "maj"], [50, "min"], [46, "maj"], [53, "maj"], [48, "maj"], [50, "min"], [48, "maj"]],
    melody: [
      [[12, 2], [16, 2], [19, 2], [16, 2]],
      [[14, 2], [12, 1], [14, 1], [16, 4]],
      [[9, 2], [12, 2], [14, 2], [12, 2]],
      [[10, 2], [9, 2], [7, 4]],
      [[12, 1], [12, 1], [16, 1], [19, 1], [21, 2], [19, 2]],
      [[19, 1], [16, 1], [14, 1], [12, 1], [14, 4]],
      [[17, 2], [16, 2], [14, 2], [12, 2]],
      [[14, 2], [16, 2], [12, 4]],
    ],
    key: 65,
    lead: "triangle",
    leadVol: 0.085,
    bass: "walk",
    arp: 0.018,
    drums: "light",
    pad: 0.026,
    echo: 0.3,
  },
  // Đấu Sinh Tử: sôi sục, dồn dập (Rê thứ) – Dm Bb C A
  battle: {
    bpm: 152,
    chords: [[50, "min"], [46, "maj"], [48, "maj"], [45, "maj"], [50, "min"], [46, "maj"], [48, "maj"], [45, "maj"]],
    melody: [
      [[0, 1], [0, 1], [12, 1], [0, 1], [10, 1], [0, 1], [7, 1], [5, 1]],
      [[3, 1], [5, 1], [7, 2], [5, 1], [3, 1], [2, 2]],
      [[0, 1], [2, 1], [3, 1], [5, 1], [7, 2], [10, 2]],
      [[7, 2], [11, 2], [14, 2], [null, 2]],
      [[12, 1], [10, 1], [12, 1], [14, 1], [15, 2], [14, 2]],
      [[10, 2], [12, 1], [10, 1], [7, 4]],
      [[7, 1], [10, 1], [12, 1], [15, 1], [14, 2], [12, 2]],
      [[11, 2], [9, 2], [7, 4]],
    ],
    key: 74,
    lead: "triangle",
    leadVol: 0.085,
    bass: "bounce",
    arp: 0.018,
    drums: "full",
    pad: 0.02,
    echo: 0.22,
  },
  // Boss: hùng tráng, hào hứng (Mi thứ) – Em C D B
  boss: {
    bpm: 140,
    chords: [[52, "min"], [48, "maj"], [50, "maj"], [47, "maj"], [52, "min"], [48, "maj"], [50, "maj"], [47, "maj"]],
    melody: [
      [[0, 1], [0, 1], [3, 1], [0, 1], [5, 1], [0, 1], [7, 2]],
      [[8, 2], [7, 1], [5, 1], [3, 4]],
      [[2, 1], [5, 1], [10, 2], [7, 2], [5, 2]],
      [[-1, 2], [2, 2], [7, 2], [null, 2]],
      [[12, 1], [10, 1], [7, 1], [5, 1], [7, 2], [0, 2]],
      [[3, 1], [5, 1], [7, 1], [8, 1], [7, 4]],
      [[5, 1], [7, 1], [10, 1], [12, 1], [10, 2], [7, 2]],
      [[11, 2], [7, 2], [2, 4]],
    ],
    key: 76,
    lead: "triangle",
    leadVol: 0.085,
    bass: "bounce",
    arp: 0.018,
    drums: "full",
    pad: 0.028,
    echo: 0.25,
  },
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const triad = (root: number, q: Quality) => [root, root + (q === "maj" ? 4 : q === "min" ? 3 : 5), root + 7];

/** Trải giai điệu ra theo từng móc đơn: chỉ số bước → [nốt, độ dài] (bỏ qua bước đang ngân). */
function flatten(song: Song): (MNote | undefined)[] {
  const out: (MNote | undefined)[] = [];
  for (const bar of song.melody) {
    let used = 0;
    for (const n of bar) {
      out.push(n);
      for (let k = 1; k < n[1]; k++) out.push(undefined);
      used += n[1];
    }
    for (; used < 8; used++) out.push(undefined);
  }
  return out;
}

class MusicEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private song: Song | null = null;
  private theme: MusicTheme | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private line: (MNote | undefined)[] = [];
  private echoIn: GainNode | null = null;
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
    lp.frequency.value = 3000;
    this.master.connect(lp).connect(ctx.destination);
    // vang cho giai điệu (delay có phản hồi) – nghe lung linh, rộn ràng hơn
    const d = ctx.createDelay(1);
    d.delayTime.value = 0.27;
    const fb = ctx.createGain();
    fb.gain.value = 0.22;
    this.echoIn = ctx.createGain();
    this.echoIn.gain.value = 0;
    this.echoIn.connect(d);
    d.connect(fb).connect(d);
    d.connect(this.master);
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
    this.line = flatten(this.song);
    this.step = 0;
    if (this.echoIn) this.echoIn.gain.setValueAtTime(this.song.echo, c.currentTime);
    this.nextTime = c.currentTime + 0.6;
    this.master.gain.setTargetAtTime(1, c.currentTime + 0.6, 0.4);
    this.timer = setInterval(() => this.schedule(), 60);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
  }

  private note(freq: number, t: number, dur: number, type: OscillatorType, vol: number, attack = 0.02, echo = false) {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    // bao âm mềm: vào nhẹ, giữ, nhả dần (không cụt tiếng → không "lụp bụp")
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, dur * 0.6));
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(this.master!);
    if (echo && this.echoIn) g.connect(this.echoIn);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** Bộ đệm tiếng ồn dùng chung cho mọi tiếng hi-hat (trước đây tạo mới mỗi tiếng → giật máy yếu). */
  private hatBufs = new Map<number, AudioBuffer>();

  private hat(t: number, vol: number, len = 0.05, band = 0) {
    const c = this.ctx!;
    let buf = this.hatBufs.get(len);
    if (!buf) {
      buf = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      this.hatBufs.set(len, buf);
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    // band > 0: tiếng trống snare/vỗ tay (lọc dải giữa); còn lại hi-hat (lọc cao)
    f.type = band ? "bandpass" : "highpass";
    f.frequency.value = band || 8000;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master!);
    src.start(t);
  }

  private kick(t: number, vol = 0.35) {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(vol, t);
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
    const bars = s.chords.length;
    // máy khựng lâu (tab ẩn, tải nặng) → bỏ qua đoạn đã trễ thay vì phát dồn một lúc
    if (this.nextTime < c.currentTime - 0.05) this.nextTime = c.currentTime + 0.05;
    while (this.nextTime < c.currentTime + 0.6) {
      const t = this.nextTime;
      const loop = Math.floor(this.step / (bars * 8));
      const bar = Math.floor(this.step / 8) % bars;
      const pos = this.step % 8;
      const [root, q] = s.chords[bar]!;
      const chord = triad(root, q);
      // bè đệm: hợp âm dài đầu ô nhịp
      if (pos === 0) for (const n of chord) this.note(midi(n), t, eighth * 8, "sine", s.pad, 0.2);
      // bass nảy (gốc – quãng 8 – quãng 5) hoặc thong thả
      if (s.bass === "bounce") {
        const b = [0, 12, 7, 12, 0, 12, 7, 10][pos]!;
        this.note(midi(root - 12 + b), t, eighth * 0.95, "triangle", pos % 2 ? 0.08 : 0.12);
      } else if (pos % 2 === 0) this.note(midi(root - 12 + [0, 7, 12, 7][pos / 2]!), t, eighth * 1.7, "triangle", 0.12);
      // rải hợp âm lấp lánh (móc kép kiểu chiptune)
      if (s.arp && pos % 2 === 0) {
        const a = chord[(pos / 2 + loop) % 3]! + 12 + (pos >= 4 ? 12 : 0);
        this.note(midi(a), t, eighth * 1.4, "triangle", s.arp);
      }
      // giai điệu cố định (vòng lặp thứ 2 thêm bè hoà âm quãng 3 dưới)
      const m = this.line[this.step % this.line.length];
      if (m && m[0] !== null) {
        const n = s.key + m[0];
        const len = eighth * m[1] * 0.98;
        this.note(midi(n), t, len, s.lead, s.leadVol, 0.02, true);
        if (loop % 2 === 1) this.note(midi(n - (q === "min" ? 3 : 4)), t, len, "sine", s.leadVol * 0.45);
      }
      // trống vui tai
      if (s.drums === "full") {
        if (pos === 0 || pos === 4 || (pos === 7 && bar % 2 === 1)) this.kick(t, 0.28);
        if (pos === 2 || pos === 6) this.hat(t, 0.1, 0.1, 1500);
        if (pos % 2) this.hat(t, 0.025);
        if (bar === bars - 1 && pos === 7) this.hat(t + eighth / 2, 0.08, 0.08, 1500); // dồn trống cuối vòng
      } else if (s.drums === "light") {
        if (pos === 0) this.kick(t, 0.18);
        if (pos === 4) this.hat(t, 0.05, 0.08, 1500);
        if (pos % 2) this.hat(t, 0.015);
      }
      this.nextTime += eighth;
      this.step++;
    }
  }
}

export const Music = new MusicEngine();
