/**
 * HearingConstellationEngine
 * Chain: Source -> Input(stereo) -> Splitter -> [Left/Right: Preamp -> Peaking EQs -> Compressor]
 *        -> Merger -> Master -> Output
 * Loaded as a classic script in offscreen.html (exposes window.HearingConstellationEngine).
 */
class HearingConstellationEngine {
  // EQ centre frequencies (Hz) and NAL-R k-constants (dB)
  static BANDS = [
    { freq: 250,  k: -17 },
    { freq: 500,  k: -8 },
    { freq: 1000, k: 1 },
    { freq: 2000, k: -1 },
    { freq: 4000, k: -2 },
    { freq: 6000, k: -2 },
    { freq: 8000, k: -2 }
  ];

  // Frequencies the audiogram UI collects
  static AUDIOGRAM_FREQS = [125, 250, 500, 1000, 2000, 4000, 8000];

  static MAX_GAIN_DB = 30; // safety ceiling per band

  constructor(audioContext) {
    this.ctx = audioContext;
    this.source = null;

    // Force a stereo signal so mono tabs reach BOTH ears (a splitter on a mono
    // source would leave the right channel silent).
    this.input = this.ctx.createGain();
    this.input.channelCount = 2;
    this.input.channelCountMode = 'explicit';
    this.input.channelInterpretation = 'speakers';

    this.splitter = this.ctx.createChannelSplitter(2);
    this.merger = this.ctx.createChannelMerger(2);
    this.master = this.ctx.createGain();

    this.leftChain = this._createEarChain();
    this.rightChain = this._createEarChain();

    this.input.connect(this.splitter);
    this.splitter.connect(this.leftChain.preamp, 0);
    this.splitter.connect(this.rightChain.preamp, 1);
    this.leftChain.compressor.connect(this.merger, 0, 0);
    this.rightChain.compressor.connect(this.merger, 0, 1);
    this.merger.connect(this.master);
    this.master.connect(this.ctx.destination);

    this.setCompressor({ threshold: -30, knee: 20, ratio: 3, attack: 0.01, release: 0.25 });
  }

  _createEarChain() {
    const preamp = this.ctx.createGain();
    const filters = HearingConstellationEngine.BANDS.map(({ freq }) => {
      const f = this.ctx.createBiquadFilter();
      f.type = 'peaking';
      f.frequency.value = freq;
      f.Q.value = 1.0;
      f.gain.value = 0;
      return f;
    });
    const compressor = this.ctx.createDynamicsCompressor();

    let node = preamp;
    for (const f of filters) { node.connect(f); node = f; }
    node.connect(compressor);

    return { preamp, filters, compressor };
  }

  connectStream(stream) {
    this.disconnectSource();
    this.source = this.ctx.createMediaStreamSource(stream);
    this.source.connect(this.input);
  }

  disconnectSource() {
    if (this.source) { this.source.disconnect(); this.source = null; }
  }

  /** Threshold (dB HL) at any frequency, interpolated on a log-frequency axis. */
  static thresholdAt(thresholds, freq) {
    const pts = HearingConstellationEngine.AUDIOGRAM_FREQS
      .map((f) => [f, Number(thresholds?.[f])])
      .filter(([, v]) => Number.isFinite(v));
    if (!pts.length) return 0;
    if (freq <= pts[0][0]) return pts[0][1];
    if (freq >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
    for (let i = 0; i < pts.length - 1; i++) {
      const [f1, v1] = pts[i];
      const [f2, v2] = pts[i + 1];
      if (freq >= f1 && freq <= f2) {
        const t = (Math.log2(freq) - Math.log2(f1)) / (Math.log2(f2) - Math.log2(f1));
        return v1 + t * (v2 - v1);
      }
    }
    return 0;
  }

  /** NAL-R insertion gain per band (dB), aligned with BANDS. */
  static computeNALR(thresholds) {
    const h = (f) => HearingConstellationEngine.thresholdAt(thresholds, f);
    const x = 0.05 * (h(500) + h(1000) + h(2000));
    return HearingConstellationEngine.BANDS.map(({ freq, k }) => {
      const gain = x + 0.31 * h(freq) + k;
      return Math.min(Math.max(gain, 0), HearingConstellationEngine.MAX_GAIN_DB);
    });
  }

  _applyEar(chain, thresholds) {
    const gains = HearingConstellationEngine.computeNALR(thresholds);
    const t = this.ctx.currentTime;

    chain.filters.forEach((f, i) => f.gain.setTargetAtTime(gains[i], t, 0.05));

    // Pull the level down by half the largest boost so stacked bands don't clip.
    const headroomDb = Math.max(...gains) * 0.5;
    chain.preamp.gain.setTargetAtTime(Math.pow(10, -headroomDb / 20), t, 0.05);

    // Normal hearing (<= 20 dB HL everywhere): no compression needed.
    const maxLoss = Math.max(
      ...HearingConstellationEngine.AUDIOGRAM_FREQS.map((f) => HearingConstellationEngine.thresholdAt(thresholds, f))
    );
    chain.compressor.ratio.value = maxLoss <= 20 ? 1 : 3;

    return gains;
  }

  /** Apply independent audiograms for left and right ears ({125: dB, 250: dB, ...}). */
  setAudiogram(leftThresholds, rightThresholds) {
    return {
      leftGains: this._applyEar(this.leftChain, leftThresholds),
      rightGains: this._applyEar(this.rightChain, rightThresholds)
    };
  }

  setCompressor({ threshold, knee, ratio, attack, release } = {}) {
    [this.leftChain.compressor, this.rightChain.compressor].forEach((c) => {
      if (threshold !== undefined) c.threshold.value = threshold;
      if (knee !== undefined) c.knee.value = knee;
      if (ratio !== undefined) c.ratio.value = ratio;
      if (attack !== undefined) c.attack.value = attack;
      if (release !== undefined) c.release.value = release;
    });
  }

  setMasterGain(db) {
    this.master.gain.setTargetAtTime(Math.pow(10, db / 20), this.ctx.currentTime, 0.05);
  }

  /** Tear down this engine's nodes without closing the shared AudioContext. */
  dispose() {
    this.disconnectSource();
    [this.input, this.splitter, this.merger, this.master].forEach((n) => n.disconnect());
    for (const chain of [this.leftChain, this.rightChain]) {
      chain.preamp.disconnect();
      chain.filters.forEach((f) => f.disconnect());
      chain.compressor.disconnect();
    }
  }
}

window.HearingConstellationEngine = HearingConstellationEngine;
