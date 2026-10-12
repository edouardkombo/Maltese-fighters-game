import { SCENE_HEIGHT, SCENE_WIDTH } from '../constants/Stage.js';

export const getCanvas = () => document.querySelector('canvas');

/** Pointer/mouse/touch event -> logical game coordinates (382x224), whatever the CSS size of the canvas. */
export const toLogical = (event) => {
	const rect = getCanvas().getBoundingClientRect();
	return {
		x: ((event.clientX - rect.left) / rect.width) * SCENE_WIDTH,
		y: ((event.clientY - rect.top) / rect.height) * SCENE_HEIGHT,
	};
};

export const isTouchDevice = () =>
	'ontouchstart' in window ||
	navigator.maxTouchPoints > 0 ||
	window.matchMedia?.('(pointer: coarse)').matches ||
	new URLSearchParams(window.location.search).has('touch');
