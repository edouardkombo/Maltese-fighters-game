import { Audio } from './Audio.js';

const doc = document;
const root = doc.documentElement;

export const canFullscreen = () => !!(root.requestFullscreen || root.webkitRequestFullscreen);
export const isFullscreen = () => !!(doc.fullscreenElement || doc.webkitFullscreenElement);

export const toggleFullscreen = () => {
	if (isFullscreen()) {
		(doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
		return;
	}
	const req = root.requestFullscreen || root.webkitRequestFullscreen;
	if (!req) return;
	const p = req.call(root, { navigationUI: 'hide' });
	// on phones, also try to lock landscape (only allowed while fullscreen, ignored elsewhere)
	Promise.resolve(p)
		.then(() => screen.orientation?.lock?.('landscape'))
		.catch(() => {});
};

let pauseHandler = null;
let pauseButton = null;

/** Show the ❚❚ button (fn = what it does) or hide it (null). */
export const setPauseHandler = (fn) => {
	pauseHandler = fn;
	if (pauseButton) pauseButton.hidden = !fn;
};

/**
 * Always-visible corner buttons: fullscreen (also the F key / double-click on the game) and
 * sound on/off (also the M key).
 */
export const installScreenControls = () => {
	const bar = doc.createElement('div');
	bar.className = 'screen-btns';

	const sound = doc.createElement('button');
	sound.type = 'button';
	sound.className = 'screen-btn';
	const paintSound = () => {
		sound.textContent = Audio.muted ? '🔇' : '🔊';
		sound.title = Audio.muted ? 'Sound off (M)' : 'Sound on (M)';
		sound.setAttribute('aria-label', sound.title);
	};
	sound.addEventListener('click', (e) => {
		e.stopPropagation();
		Audio.unlock();
		Audio.toggleMute();
		paintSound();
	});
	paintSound();
	bar.appendChild(sound);

	if (canFullscreen()) {
		const fs = doc.createElement('button');
		fs.type = 'button';
		fs.className = 'screen-btn';
		fs.textContent = '⛶';
		fs.title = 'Full screen (F)';
		fs.setAttribute('aria-label', 'Full screen');
		fs.addEventListener('click', (e) => {
			e.stopPropagation();
			toggleFullscreen();
		});
		bar.appendChild(fs);
		doc.querySelector('canvas')?.addEventListener('dblclick', toggleFullscreen);
	}

	// pause (only shown in single-player fights, see setPauseHandler)
	const pause = doc.createElement('button');
	pause.type = 'button';
	pause.className = 'screen-btn';
	pause.textContent = '❚❚';
	pause.title = 'Pause (Esc)';
	pause.setAttribute('aria-label', 'Pause');
	pause.hidden = true;
	pause.addEventListener('click', (e) => {
		e.stopPropagation();
		pauseHandler?.();
	});
	bar.prepend(pause);
	pauseButton = pause;

	// keep the buttons from starting the game / clicking through to the canvas
	bar.addEventListener('pointerdown', (e) => e.stopPropagation());
	bar.addEventListener('pointerup', (e) => e.stopPropagation());
	doc.body.appendChild(bar);

	window.addEventListener('keydown', (e) => {
		if (e.repeat) return;
		if (e.code === 'KeyF' && canFullscreen()) toggleFullscreen();
		else if (e.code === 'KeyM') {
			Audio.toggleMute();
			paintSound();
		}
	});
};
