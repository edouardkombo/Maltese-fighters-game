import { Control } from '../constants/controls.js';

const PSControls = {
	X: 0,
	O: 1,
	SQ: 2,
	TR: 3,
	L1: 4,
	R1: 5,
	L2: 6,
	R2: 7,
	L3: 10,
	R3: 11,
	UP: 12,
	DOWN: 13,
	LEFT: 14,
	RIGHT: 15,
};

const gamepad = {
	[Control.LEFT]: PSControls.LEFT,
	[Control.RIGHT]: PSControls.RIGHT,
	[Control.UP]: PSControls.UP,
	[Control.DOWN]: PSControls.DOWN,
	[Control.LIGHT_PUNCH]: PSControls.X,
	[Control.MEDIUM_PUNCH]: PSControls.SQ,
	[Control.HEAVY_PUNCH]: PSControls.L1,
	[Control.LIGHT_KICK]: PSControls.O,
	[Control.MEDIUM_KICK]: PSControls.TR,
	[Control.HEAVY_KICK]: PSControls.R1,
	[Control.SPECIAL_MELA]: PSControls.L2,
	[Control.SPECIAL_PASTIZZI]: PSControls.R2,
	[Control.SPECIAL_UWEJJA]: PSControls.L3,
	[Control.SPECIAL_RICOTTA]: PSControls.R3,
};

/**
 * Index 0 = the human player on this device (keyboard, touch buttons and the first gamepad).
 * Index 1 is driven by the CPU (or by your friend's inputs online), its keyboard map is unused.
 *
 *   arrows   move / jump / crouch
 *   A S D    light / medium / heavy punch
 *   Z X C    light / medium / heavy kick
 *   Q W E R  MELA / PASTIZZI / UWEJJA / RICOTTA
 */
export const controls = [
	{
		gamepad,
		keyboard: {
			[Control.LEFT]: 'ArrowLeft',
			[Control.RIGHT]: 'ArrowRight',
			[Control.UP]: 'ArrowUp',
			[Control.DOWN]: 'ArrowDown',
			[Control.LIGHT_PUNCH]: 'KeyA',
			[Control.MEDIUM_PUNCH]: 'KeyS',
			[Control.HEAVY_PUNCH]: 'KeyD',
			[Control.LIGHT_KICK]: 'KeyZ',
			[Control.MEDIUM_KICK]: 'KeyX',
			[Control.HEAVY_KICK]: 'KeyC',
			[Control.SPECIAL_MELA]: 'KeyQ',
			[Control.SPECIAL_PASTIZZI]: 'KeyW',
			[Control.SPECIAL_UWEJJA]: 'KeyE',
			[Control.SPECIAL_RICOTTA]: 'KeyR',
		},
	},
	{
		gamepad,
		keyboard: {
			[Control.LEFT]: 'Numpad4',
			[Control.RIGHT]: 'Numpad6',
			[Control.UP]: 'Numpad8',
			[Control.DOWN]: 'Numpad5',
			[Control.LIGHT_PUNCH]: 'KeyU',
			[Control.MEDIUM_PUNCH]: 'KeyI',
			[Control.HEAVY_PUNCH]: 'KeyO',
			[Control.LIGHT_KICK]: 'KeyJ',
			[Control.MEDIUM_KICK]: 'KeyK',
			[Control.HEAVY_KICK]: 'KeyL',
			[Control.SPECIAL_MELA]: 'Digit7',
			[Control.SPECIAL_PASTIZZI]: 'Digit8',
			[Control.SPECIAL_UWEJJA]: 'Digit9',
			[Control.SPECIAL_RICOTTA]: 'Digit0',
		},
	},
];

export const CONTROLLER_DEADZONE = 0.4;
