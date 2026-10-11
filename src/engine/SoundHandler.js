import { GLOBAL_VOLUME } from '../constants/sounds.js';

//[FIXED] using https://stackoverflow.com/questions/36803176/how-to-prevent-the-play-request-was-interrupted-by-a-call-to-pause-error TODO: Proabably there is a race condition between play() and pause() giving error 'The play() request was interrupted by a call to pause()' in the consol.

export const playSound = (sound, volume = GLOBAL_VOLUME) => {
	sound.volume = volume;
	if (
		!sound.paused &&
		sound.currentTime > 0 &&
		!sound.ended &&
		sound.readyState > sound.HAVE_CURRENT_DATA
	) {
		sound.currentTime = 0;
		sound.play()?.catch(() => {});
	} else {
		sound.play()?.catch(() => {});
	}
};

export const stopSound = (sound) => {
	sound.pause();
	sound.currentTime = 0;
};

// ---------------------------------------------------------------------------------------
// "MELA!" - synthesised on the fly (WebAudio zap + browser speech), so there is no audio file.
// ---------------------------------------------------------------------------------------
let audioCtx;
const getAudio = () => {
	if (audioCtx) return audioCtx;
	const AC = window.AudioContext || window.webkitAudioContext;
	if (!AC) return undefined;
	audioCtx = new AC();
	return audioCtx;
};

const zap = (pitch) => {
	const ctx = getAudio();
	if (!ctx) return;
	if (ctx.state === 'suspended') ctx.resume().catch(() => {});
	const t = ctx.currentTime;
	const gain = ctx.createGain();
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(0.35, t + 0.03);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
	gain.connect(ctx.destination);
	const osc = ctx.createOscillator();
	osc.type = 'sawtooth';
	osc.frequency.setValueAtTime(180 * pitch, t);
	osc.frequency.exponentialRampToValueAtTime(900 * pitch, t + 0.18);
	osc.frequency.exponentialRampToValueAtTime(260 * pitch, t + 0.5);
	osc.connect(gain);
	osc.start(t);
	osc.stop(t + 0.6);
};

export const playMela = ({ pitch = 1, rate = 1.05 } = {}) => {
	try {
		zap(pitch);
	} catch (e) {
		/* audio is optional */
	}
	try {
		const synth = window.speechSynthesis;
		if (!synth) return;
		synth.cancel();
		const u = new SpeechSynthesisUtterance('Mela!');
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
