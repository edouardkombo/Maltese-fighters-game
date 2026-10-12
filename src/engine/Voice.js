import { Audio } from './Audio.js';

/**
 * Every spoken line of the game.
 *
 * 1. If a real recording exists (listed in public/voices/voices.json - make them with
 *    tools/voice-recorder.html), that recording is played.
 * 2. Otherwise the browser's speech voice says it. For Maltese words a Maltese voice is preferred
 *    (Microsoft Edge has natural-sounding "Maltese (Malta)" voices), then Italian, then English.
 */
export const LINES = {
	'intro-lou-ichi': { text: 'Lou and Ichi!', lang: ['it', 'en'], pitch: 1.6, rate: 1.12 }, // cheerful, high, Italian accent
	'intro-title': { text: 'Pastizzi Fighters!', lang: ['mt', 'it', 'en'], pitch: 0.85, rate: 0.95 }, // deep Maltese announcer
	mela: { text: 'Mela!', lang: ['mt', 'it', 'en'] },
	pastizzi: { text: 'Pastizzi!', lang: ['mt', 'it', 'en'] },
	uwejja: { text: 'Uwejja!', lang: ['mt', 'it', 'en'] },
	ricotta: { text: 'Irkotta!', lang: ['mt', 'it', 'en'] }, // "ricotta" in Maltese
	plane: { text: 'Go back to your country!', lang: ['mt', 'it', 'en'] },
};

const VOICES_DIR = 'public/voices/';

class VoiceEngine {
	recordings = {}; // id -> file name
	clips = {}; // id -> HTMLAudioElement
	introState = 'idle'; // idle | playing | done

	constructor() {
		fetch(`${VOICES_DIR}voices.json`, { cache: 'no-cache' })
			.then((r) => (r.ok ? r.json() : {}))
			.then((list) => {
				this.recordings = list || {};
				for (const [id, file] of Object.entries(this.recordings)) {
					const a = new window.Audio(VOICES_DIR + file);
					a.preload = 'auto';
					this.clips[id] = a;
				}
			})
			.catch(() => {});
		// the browser's voice list loads asynchronously
		window.speechSynthesis?.addEventListener?.('voiceschanged', () => (this.voiceCache = {}));
	}

	voiceCache = {};

	pickVoice(langs) {
		const key = langs.join(',');
		if (this.voiceCache[key] !== undefined) return this.voiceCache[key];
		const voices = window.speechSynthesis?.getVoices?.() || [];
		let found = null;
		for (const lang of langs) {
			const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
			// natural / online voices sound far more human
			found = matching.find((v) => /natural|online|neural|premium|enhanced/i.test(v.name)) || matching[0];
			if (found) break;
		}
		if (voices.length) this.voiceCache[key] = found;
		return found;
	}

	/**
	 * Say a line. opts.pitch / opts.rate give each fighter their own tone
	 * (recordings are sped up / slowed down a little instead).
	 */
	say(id, { pitch = 1, rate = 1, interrupt = true, onend, onfail } = {}) {
		if (Audio.muted) {
			onend?.();
			return;
		}
		const line = LINES[id];
		const clip = this.clips[id];
		if (clip) {
			const a = clip.cloneNode();
			a.volume = 1;
			a.preservesPitch = false;
			a.playbackRate = Math.max(0.6, Math.min(1.6, pitch));
			a.onended = () => onend?.();
			a.play().catch(() => onfail?.());
			return;
		}
		const synth = window.speechSynthesis;
		if (!synth || !line) {
			onend?.();
			return;
		}
		try {
			if (interrupt) synth.cancel();
			const u = new SpeechSynthesisUtterance(line.text);
			u.pitch = Math.max(0, Math.min(2, (line.pitch ?? 1) * pitch));
			u.rate = Math.max(0.5, Math.min(2, (line.rate ?? 1.05) * rate));
			u.volume = 1;
			const voice = this.pickVoice(line.lang);
			if (voice) {
				u.voice = voice;
				u.lang = voice.lang;
			}
			u.onend = () => onend?.();
			u.onerror = (e) => (e.error === 'not-allowed' ? onfail?.() : onend?.());
			synth.speak(u);
		} catch (e) {
			onfail?.();
		}
	}

	/**
	 * The launch call: "Lou & Ichi!" (bright, high) then "Pastizzi Fighters!" (deep, Maltese).
	 * Browsers usually block sound until the first tap / click / key: then it plays at that moment.
	 */
	playIntro() {
		if (this.introState !== 'idle') return;
		this.introState = 'playing';
		const fail = () => {
			this.introState = 'idle';
		};
		Audio.duckMusic?.(3.5);
		this.say('intro-lou-ichi', {
			onfail: fail,
			onend: () => this.say('intro-title', { interrupt: false, onend: () => (this.introState = 'done'), onfail: fail }),
		});
	}

	installIntro() {
		// try straight away (works when the browser allows it), otherwise on the first interaction
		setTimeout(() => this.playIntro(), 300);
		const retry = () => {
			if (this.introState === 'idle') this.playIntro();
		};
		for (const t of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(t, retry, { capture: true, passive: true });
	}
}

export const Voice = new VoiceEngine();
