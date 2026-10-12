/**
 * All of the game's sound is synthesised here with the Web Audio API: two original music tracks
 * (a title theme to hype players up and a fight theme), every hit / whoosh / landing effect and the
 * special-move shouts. There are no audio files at all.
 *
 * Browsers only allow sound after the first tap / click / key press, so `unlock()` is wired to the
 * first user gesture; music requested before that starts as soon as it happens.
 */

const MUTE_KEY = 'mf2-muted';

// ------------------------------------------------------------------------------------------ notes
const NOTE_INDEX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const freq = (name) => {
	const m = /^([A-G][#b]?)(\d)$/.exec(name);
	if (!m) return 0;
	const midi = 12 * (Number(m[2]) + 1) + NOTE_INDEX[m[1]];
	return 440 * Math.pow(2, (midi - 69) / 12);
};

/** "A4 - - C5 . E5" -> [{ step, note, len }]; '-' holds the previous note, '.' is a rest. */
const parseLine = (text) => {
	const tokens = text.trim().split(/\s+/);
	const out = [];
	let current = null;
	tokens.forEach((tok, step) => {
		if (tok === '-') {
			if (current) current.len += 1;
			return;
		}
		current = null;
		if (tok === '.') return;
		current = { step, note: freq(tok), len: 1 };
		out.push(current);
	});
	return { notes: out, steps: tokens.length };
};

// chord = [root, third, fifth] note names (octave 3)
const CHORDS = {
	Am: ['A2', 'C4', 'E4', 'A4'],
	F: ['F2', 'A3', 'C4', 'F4'],
	G: ['G2', 'B3', 'D4', 'G4'],
	E: ['E2', 'G#3', 'B3', 'E4'],
	Dm: ['D2', 'F3', 'A3', 'D4'],
	Bb: ['Bb1', 'D3', 'F3', 'Bb3'],
	C: ['C2', 'E3', 'G3', 'C4'],
	Gm: ['G2', 'Bb3', 'D4', 'G4'],
	A: ['A1', 'C#4', 'E4', 'A4'],
};

/**
 * Original tracks (16 steps per bar). Harmonic-minor melodies for a Mediterranean flavour.
 */
const TRACKS = {
	// "Mela! Theme" - title / menus
	title: {
		bpm: 138,
		chords: ['Am', 'F', 'G', 'E', 'Dm', 'Am', 'E', 'E'],
		lead: [
			'A4 - - C5 - - E5 - A5 - - - G#5 - E5 -',
			'F5 - - E5 - - C5 - A4 - - - C5 - F5 -',
			'G5 - - F5 - - D5 - B4 - - - D5 - G5 -',
			'G#5 - - - B5 - - - E5 - - - . . . .',
			'D5 - F5 - A5 - - - G5 - F5 - E5 - D5 -',
			'C5 - E5 - A5 - - - B5 - C6 - B5 - A5 -',
			'G#5 - - - E5 - - - B4 - - - E5 - G#5 -',
			'B5 - - - - - - - . . A5 - B5 - C6 -',
		].join(' '),
		drums: { kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], open: [14] },
		leadWave: 'square',
		leadVol: 0.07,
	},
	// "Festa Fight" - battles
	fight: {
		bpm: 152,
		chords: ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Gm', 'A'],
		lead: [
			'D5 - D5 . F5 - D5 . A5 - - - G5 - F5 -',
			'E5 - C#5 - D5 - - - . . A4 - D5 - E5 -',
			'F5 - F5 . D5 - F5 . Bb5 - - - A5 - G5 -',
			'G5 - E5 - C5 - - - E5 - G5 - C6 - - -',
			'D6 - - - A5 - - - F5 - D5 - A5 - - -',
			'G5 - F5 - E5 - F5 - D5 - - - . . . .',
			'Bb5 - - - G5 - Bb5 - D6 - - - C6 - Bb5 -',
			'A5 - - - C#6 - - - E6 - - - A5 - - -',
		].join(' '),
		drums: { kick: [0, 3, 8, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [6, 14] },
		leadWave: 'sawtooth',
		leadVol: 0.05,
	},
};
for (const t of Object.values(TRACKS)) t.parsed = parseLine(t.lead);

// ------------------------------------------------------------------------------------------ engine
class AudioEngine {
	ctx = null;
	master = null;
	musicBus = null;
	sfxBus = null;
	noise = null;
	unlocked = false;
	wantedTrack = null;
	track = null;
	step = 0;
	nextTime = 0;
	timer = null;
	muted = false;

	constructor() {
		try {
			this.muted = localStorage.getItem(MUTE_KEY) === '1';
		} catch (e) {
			/* storage may be blocked */
		}
	}

	init() {
		if (this.ctx) return this.ctx;
		const AC = window.AudioContext || window.webkitAudioContext;
		if (!AC) return null;
		const ctx = new AC();
		this.ctx = ctx;
		this.master = ctx.createGain();
		this.master.gain.value = this.muted ? 0 : 0.9;
		const comp = ctx.createDynamicsCompressor();
		comp.threshold.value = -14;
		comp.ratio.value = 4;
		this.master.connect(comp).connect(ctx.destination);
		this.musicBus = ctx.createGain();
		this.musicBus.gain.value = 0.55;
		this.musicBus.connect(this.master);
		this.sfxBus = ctx.createGain();
		this.sfxBus.gain.value = 1;
		this.sfxBus.connect(this.master);

		// one second of white noise, reused by drums and hits
		const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
		const data = buf.getChannelData(0);
		for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
		this.noise = buf;
		return ctx;
	}

	/** Call from any user gesture: creates / resumes the AudioContext and starts pending music. */
	unlock = () => {
		const ctx = this.init();
		if (!ctx) return;
		if (ctx.state === 'suspended') ctx.resume().catch(() => {});
		if (!this.unlocked) {
			this.unlocked = true;
			if (this.wantedTrack && !this.track) this.startTrack(this.wantedTrack);
		}
	};

	installUnlock() {
		const once = () => this.unlock();
		for (const t of ['pointerdown', 'keydown', 'touchend'])
			window.addEventListener(t, once, { capture: true, passive: true });
	}

	setMuted(m) {
		this.muted = !!m;
		try {
			localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
		} catch (e) {
			/* ignore */
		}
		if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, this.ctx.currentTime, 0.05);
	}

	toggleMute = () => this.setMuted(!this.muted);

	// ------------------------------------------------------------------------------ music
	playMusic(name) {
		this.wantedTrack = name;
		if (!this.unlocked || !this.ctx) return;
		if (this.track === TRACKS[name]) return;
		this.startTrack(name);
	}

	stopMusic() {
		this.wantedTrack = null;
		this.track = null;
		clearInterval(this.timer);
		this.timer = null;
	}

	startTrack(name) {
		clearInterval(this.timer);
		const track = TRACKS[name];
		if (!track) return;
		this.track = track;
		this.step = 0;
		this.nextTime = this.ctx.currentTime + 0.08;
		this.timer = setInterval(this.schedule, 25);
		this.schedule();
	}

	schedule = () => {
		const track = this.track;
		if (!track || !this.ctx) return;
		const stepDur = 60 / track.bpm / 4;
		while (this.nextTime < this.ctx.currentTime + 0.15) {
			this.playStep(track, this.step, this.nextTime, stepDur);
			this.step = (this.step + 1) % track.parsed.steps;
			this.nextTime += stepDur;
		}
	};

	playStep(track, step, t, dur) {
		const bar = Math.floor(step / 16) % track.chords.length;
		const s = step % 16;
		const chord = CHORDS[track.chords[bar]];

		// drums
		if (track.drums.kick.includes(s)) this.kick(t);
		if (track.drums.snare.includes(s)) this.snare(t);
		if (track.drums.hat.includes(s)) this.hat(t, track.drums.open.includes(s) ? 0.12 : 0.035);

		// octave-bouncing bass on eighths
		if (s % 2 === 0) {
			const root = freq(chord[0]);
			this.tone(t, s % 4 === 0 ? root : root * 2, dur * 1.8, 'sawtooth', 0.11, 700);
		}
		// soft arpeggio on 16ths
		const arp = chord.slice(1);
		this.tone(t, freq(arp[s % arp.length]) * 2, dur * 0.9, 'triangle', 0.035);

		// lead
		for (const n of track.parsed.notes) {
			if (n.step === step) this.tone(t, n.note, dur * n.len * 0.95, track.leadWave, track.leadVol, 3200, true);
		}
	}

	// ------------------------------------------------------------------------------ voices
	tone(t, f, len, type, vol, cutoff = 0, vibrato = false, bus = this.musicBus) {
		if (!f) return;
		const ctx = this.ctx;
		const osc = ctx.createOscillator();
		osc.type = type;
		osc.frequency.setValueAtTime(f, t);
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
		g.gain.setValueAtTime(vol, t + Math.max(0.02, len - 0.04));
		g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.05);
		let node = osc;
		if (cutoff) {
			const f2 = ctx.createBiquadFilter();
			f2.type = 'lowpass';
			f2.frequency.value = cutoff;
			node.connect(f2);
			node = f2;
		}
		if (vibrato && len > 0.25) {
			const lfo = ctx.createOscillator();
			const lg = ctx.createGain();
			lfo.frequency.value = 5.5;
			lg.gain.value = f * 0.012;
			lfo.connect(lg).connect(osc.frequency);
			lfo.start(t + 0.12);
			lfo.stop(t + len + 0.1);
		}
		node.connect(g).connect(bus);
		osc.start(t);
		osc.stop(t + len + 0.1);
	}

	noiseBurst(t, len, vol, type, f, q = 1, bus = this.musicBus, sweepTo = 0) {
		const ctx = this.ctx;
		const src = ctx.createBufferSource();
		src.buffer = this.noise;
		const filter = ctx.createBiquadFilter();
		filter.type = type;
		filter.frequency.setValueAtTime(f, t);
		if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, t + len);
		filter.Q.value = q;
		const g = ctx.createGain();
		g.gain.setValueAtTime(vol, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + len);
		src.connect(filter).connect(g).connect(bus);
		src.start(t, Math.random() * 0.5);
		src.stop(t + len + 0.02);
	}

	sweep(t, from, to, len, type, vol, bus = this.sfxBus) {
		const ctx = this.ctx;
		const osc = ctx.createOscillator();
		osc.type = type;
		osc.frequency.setValueAtTime(from, t);
		osc.frequency.exponentialRampToValueAtTime(to, t + len);
		const g = ctx.createGain();
		g.gain.setValueAtTime(vol, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + len);
		osc.connect(g).connect(bus);
		osc.start(t);
		osc.stop(t + len + 0.02);
	}

	kick(t, bus = this.musicBus, vol = 0.5) {
		this.sweep(t, 150, 42, 0.16, 'sine', vol, bus);
	}

	snare(t) {
		this.noiseBurst(t, 0.14, 0.22, 'bandpass', 1900, 0.8);
		this.sweep(t, 220, 140, 0.08, 'triangle', 0.12, this.musicBus);
	}

	hat(t, len) {
		this.noiseBurst(t, len, 0.08, 'highpass', 7500, 0.7);
	}

	// ------------------------------------------------------------------------------ effects
	ready() {
		return this.ctx && this.unlocked && !this.muted;
	}

	/** Swing of an attack: filtered-noise whoosh. strength: light | medium | heavy */
	whoosh(strength) {
		if (!this.ready()) return;
		const t = this.ctx.currentTime;
		const k = { light: [0.09, 2600, 1100, 0.18], medium: [0.13, 2000, 700, 0.24], heavy: [0.2, 1500, 420, 0.3] }[strength] || [0.1, 2200, 900, 0.2];
		this.noiseBurst(t, k[0], k[3], 'bandpass', k[1], 1.6, this.sfxBus, k[2]);
	}

	/** A blow that connects. type: punch | kick */
	hit(strength, type = 'punch') {
		if (!this.ready()) return;
		const t = this.ctx.currentTime;
		const power = { light: 0.6, medium: 0.8, heavy: 1 }[strength] ?? 0.7;
		const low = type === 'kick' ? 95 : 130;
		this.sweep(t, low * 1.6, low * 0.4, 0.12 + power * 0.1, 'sine', 0.55 * power);
		this.noiseBurst(t, 0.06 + power * 0.08, 0.45 * power, 'lowpass', type === 'kick' ? 1400 : 2600, 0.7, this.sfxBus);
		this.noiseBurst(t, 0.025, 0.3 * power, 'highpass', 4000, 0.7, this.sfxBus); // the "crack"
	}

	land() {
		if (!this.ready()) return;
		const t = this.ctx.currentTime;
		this.sweep(t, 110, 40, 0.1, 'sine', 0.3);
		this.noiseBurst(t, 0.06, 0.12, 'lowpass', 600, 0.7, this.sfxBus);
	}

	/** Magic zap for a special move, coloured per kind. */
	zap(kind = 'mela', pitch = 1) {
		if (!this.ready()) return;
		const t = this.ctx.currentTime;
		if (kind === 'ricotta') {
			['C5', 'E5', 'G5', 'C6', 'E6'].forEach((n, i) =>
				this.tone(t + i * 0.06, freq(n) * pitch, 0.18, 'triangle', 0.12, 0, false, this.sfxBus)
			);
			return;
		}
		if (kind === 'uwejja') {
			this.sweep(t, 90 * pitch, 40 * pitch, 0.45, 'sawtooth', 0.28);
			this.noiseBurst(t, 0.4, 0.35, 'lowpass', 1800, 0.8, this.sfxBus, 200);
			return;
		}
		if (kind === 'pastizzi') {
			[0, 0.09, 0.18].forEach((d, i) => this.sweep(t + d, (500 + i * 120) * pitch, 180 * pitch, 0.12, 'square', 0.1));
			return;
		}
		const osc = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(180 * pitch, t);
		osc.frequency.exponentialRampToValueAtTime(900 * pitch, t + 0.18);
		osc.frequency.exponentialRampToValueAtTime(260 * pitch, t + 0.5);
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
		g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
		osc.connect(g).connect(this.sfxBus);
		osc.start(t);
		osc.stop(t + 0.6);
	}

	/** Bright stab for "FIGHT!" */
	fightStab() {
		if (!this.ready()) return;
		const t = this.ctx.currentTime;
		['A3', 'E4', 'A4', 'C#5'].forEach((n) => this.tone(t, freq(n), 0.35, 'sawtooth', 0.07, 2500, false, this.sfxBus));
		this.kick(t, this.sfxBus, 0.6);
		this.noiseBurst(t, 0.5, 0.18, 'highpass', 5000, 0.5, this.sfxBus);
	}

	/** Church-bell "dong" for the round call. */
	bell() {
		if (!this.ready()) return;
		const t = this.ctx.currentTime;
		[1, 2.76, 5.4].forEach((m, i) => this.tone(t, 220 * m, 1.2 - i * 0.3, 'sine', 0.12 / (i + 1), 0, false, this.sfxBus));
	}

	ko() {
		if (!this.ready()) return;
		const t = this.ctx.currentTime;
		this.sweep(t, 600, 60, 0.9, 'sawtooth', 0.18);
		this.noiseBurst(t, 0.5, 0.3, 'lowpass', 1200, 0.7, this.sfxBus, 150);
	}

	/** Small jingle: win (major) or lose (minor). */
	jingle(win) {
		if (!this.ready()) return;
		const t = this.ctx.currentTime;
		const notes = win ? ['C5', 'E5', 'G5', 'C6'] : ['A4', 'F4', 'D4', 'A3'];
		notes.forEach((n, i) => this.tone(t + i * 0.13, freq(n), i === 3 ? 0.6 : 0.14, 'square', 0.08, 3000, false, this.sfxBus));
	}

	click() {
		if (!this.ready()) return;
		const t = this.ctx.currentTime;
		this.tone(t, 880, 0.05, 'square', 0.05, 0, false, this.sfxBus);
	}
}

export const Audio = new AudioEngine();

// ------------------------------------------------------------------------------------------ voice
/** Shout a word with the browser's speech voice (Maltese > Italian > English voice if available). */
export const shout = (text, { pitch = 1, rate = 1.05 } = {}) => {
	if (Audio.muted) return;
	try {
		const synth = window.speechSynthesis;
		if (!synth) return;
		synth.cancel();
		const u = new SpeechSynthesisUtterance(text);
		u.pitch = pitch;
		u.rate = rate;
		u.volume = 1;
		const voices = synth.getVoices();
		const voice =
			voices.find((v) => v.lang.toLowerCase().startsWith('mt')) ||
			voices.find((v) => v.lang.toLowerCase().startsWith('it')) ||
			voices.find((v) => v.lang.toLowerCase().startsWith('en'));
		if (voice) {
			u.voice = voice;
			u.lang = voice.lang;
		}
		synth.speak(u);
	} catch (e) {
		/* speech is optional */
	}
};
