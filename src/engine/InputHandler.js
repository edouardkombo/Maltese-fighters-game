import { CONTROLLER_DEADZONE, controls } from '../config/controls.js';
import { Control } from '../constants/controls.js';
import { FighterDirection } from '../constants/fighter.js';

// --- simulated players ---------------------------------------------------------------------------
// A player can be driven by a "held set" of Controls instead of the keyboard: the CPU (player 1 in
// single-player) and, online, BOTH players (each tick gets the exact same inputs on both machines).
const simHeld = [null, new Set()];
export const setSimHeld = (id, s) => {
	simHeld[id] = s || null;
};
export const setAIHeld = (s) => {
	simHeld[1] = s || new Set();
};
export const clearSimHeld = () => {
	simHeld[0] = null;
	simHeld[1] = new Set();
};
const sim = (id) => simHeld[id];

// Input gate: closed during round intros / round ends so nobody (human or CPU) can act.
let inputEnabled = true;
export const setInputEnabled = (v) => {
	inputEnabled = !!v;
	if (!inputEnabled) releaseAllVirtual();
};
export const isInputEnabled = () => inputEnabled;

const mappedButtons = new Set(
	controls.map(({ gamepad }) => Object.values(gamepad)).flat()
);
const heldGamepadButtons = [new Set(), new Set()];
const pressedGamepadButtons = [new Set(), new Set()];

const gamepadThumbstickAxes = [
	{ x: 0, y: 0 },
	{ x: 0, y: 0 },
];

const heldKeys = new Set();
const pressedKeys = new Set();
const pressedKeysControlHistory = [new Set(), new Set()];
const mappedKeys = controls
	.map(({ keyboard }) => Object.values(keyboard))
	.flat();

const isButtonPressed = (id, code) => {
	if (
		heldGamepadButtons[id].has(code) &&
		!pressedGamepadButtons[id].has(code)
	) {
		pressedGamepadButtons[id].add(code);
		return true;
	}
	return false;
};

const isPressed = (code) => {
	if (heldKeys.has(code) && !pressedKeys.has(code)) {
		pressedKeys.add(code);
		return true;
	}
	return false;
};

const isPressedControlHistory = (id, code) => {
	const controlKeyId = controls[id].keyboard[code];
	const controlButtonId = controls[id].gamepad[code];
	if (
		heldKeys.has(controlKeyId) &&
		!pressedKeysControlHistory[id].has(controlKeyId)
	) {
		pressedKeysControlHistory[id].add(controlKeyId);
		return true;
	} else if (
		heldGamepadButtons[id].has(controlButtonId) &&
		!pressedKeysControlHistory[id].has(controlButtonId)
	) {
		pressedKeysControlHistory[id].add(controlButtonId);
		return true;
	}
	return false;
};

const handleKeyDown = (event) => {
	if (!mappedKeys.includes(event.code)) return;
	event.preventDefault();
	if (!heldKeys.has(event.code)) {
		heldKeys.add(event.code);
	}
};

const handleKeyUp = (event) => {
	if (!mappedKeys.includes(event.code)) return;
	event.preventDefault();
	if (heldKeys.has(event.code)) {
		heldKeys.delete(event.code);
		pressedKeys.delete(event.code);
		if (Object.values(controls[0].keyboard).includes(event.code))
			pressedKeysControlHistory[0].delete(event.code);
		else pressedKeysControlHistory[1].delete(event.code);
	}
};

/** Virtual (touch) keys are Player 1's keyboard codes, so they flow through the exact same code path. */
export const pressVirtual = (code) => {
	if (!mappedKeys.includes(code)) return;
	heldKeys.add(code);
};

export const releaseVirtual = (code) => {
	if (!heldKeys.has(code)) return;
	heldKeys.delete(code);
	pressedKeys.delete(code);
	pressedKeysControlHistory[0].delete(code);
	pressedKeysControlHistory[1].delete(code);
};

export const releaseAllVirtual = () => {
	for (const code of [...heldKeys]) releaseVirtual(code);
};

export const registerKeyboardEvents = () => {
	window.addEventListener('keydown', handleKeyDown);
	window.addEventListener('keyup', handleKeyUp);
	// never leave a key "stuck" when the tab / app loses focus
	window.addEventListener('blur', releaseAllVirtual);
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) releaseAllVirtual();
	});
};

const handleGamepadConnected = (event) => {
	console.log(`gamepad named ${event.gamepad.id} connected`);
};

const handleGamepadDisconnected = (event) => {
	console.log(`gamepad named ${event.gamepad.id} disconnected`);
};

const updateGamepadButtons = (gamePadIndex, gamePad) => {
	if (!gamePad) return;
	gamePad.buttons.forEach((button, index) => {
		if (!mappedButtons.has(index)) return;
		if (button.pressed) {
			heldGamepadButtons[gamePadIndex].add(index);
		} else {
			heldGamepadButtons[gamePadIndex].delete(index);
			pressedGamepadButtons[gamePadIndex].delete(index);
			pressedKeysControlHistory[gamePadIndex].delete(index);
		}
	});
};

const updateGamepadAxes = (gamePadIndex, gamePad) => {
	if (!gamePad) return;
	gamepadThumbstickAxes[gamePadIndex].x = gamePad.axes[0];
	gamepadThumbstickAxes[gamePadIndex].y = gamePad.axes[1];
};

export const updateGamePads = () => {
	const gamepadList = navigator.getGamepads ? navigator.getGamepads() : [];
	for (const [gamePadIndex, gamePad] of [...gamepadList].entries()) {
		if (gamePadIndex > 1) break;
		updateGamepadButtons(gamePadIndex, gamePad);
		updateGamepadAxes(gamePadIndex, gamePad);
	}
};

export const registerGamepadEvents = () => {
	window.addEventListener('gamepadconnected', handleGamepadConnected);
	window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);
};

/** Everything the human on this device is holding right now (keyboard, touch, first gamepad). */
export const sampleLocalHeld = () => {
	const held = new Set();
	const map = controls[0];
	for (const [control, key] of Object.entries(map.keyboard)) {
		if (heldKeys.has(key) || heldGamepadButtons[0].has(map.gamepad[control])) held.add(control);
	}
	const axes = gamepadThumbstickAxes[0];
	if (axes.x < -CONTROLLER_DEADZONE) held.add(Control.LEFT);
	if (axes.x > CONTROLLER_DEADZONE) held.add(Control.RIGHT);
	if (axes.y < -CONTROLLER_DEADZONE) held.add(Control.UP);
	if (axes.y > CONTROLLER_DEADZONE) held.add(Control.DOWN);
	return held;
};

const heldDirection = (id, control, axisTest) => {
	if (!inputEnabled) return false;
	if (sim(id)) return sim(id).has(control);
	if (axisTest(gamepadThumbstickAxes[id])) return true;
	return (
		heldKeys.has(controls[id].keyboard[control]) ||
		heldGamepadButtons[id].has(controls[id].gamepad[control])
	);
};

export const isLeft = (id) => heldDirection(id, Control.LEFT, (a) => a.x < -CONTROLLER_DEADZONE);
export const isRight = (id) => heldDirection(id, Control.RIGHT, (a) => a.x > CONTROLLER_DEADZONE);
export const isUp = (id) => heldDirection(id, Control.UP, (a) => a.y < -CONTROLLER_DEADZONE);
export const isDown = (id) => heldDirection(id, Control.DOWN, (a) => a.y > CONTROLLER_DEADZONE);

export const isForward = (id, direction) => {
	return direction === FighterDirection.RIGHT ? isRight(id) : isLeft(id);
};

export const isBackward = (id, direction) => {
	return direction === FighterDirection.RIGHT ? isLeft(id) : isRight(id);
};

export const isIdle = (id) =>
	isUp(id) || isDown(id) || isLeft(id) || isRight(id);

export const isKeyPressed = (id, code, forControlHistory) => {
	if (!inputEnabled) return false;
	if (sim(id)) return sim(id).has(code);
	if (forControlHistory) return isPressedControlHistory(id, code);

	return (
		isButtonPressed(id, controls[id].gamepad[code]) ||
		isPressed(controls[id].keyboard[code])
	);
};

export const isLightPunch = (id, forControlHistory = false) => isKeyPressed(id, Control.LIGHT_PUNCH, forControlHistory);
export const isMediumPunch = (id, forControlHistory = false) => isKeyPressed(id, Control.MEDIUM_PUNCH, forControlHistory);
export const isHeavyPunch = (id, forControlHistory = false) => isKeyPressed(id, Control.HEAVY_PUNCH, forControlHistory);
export const isLightKick = (id, forControlHistory = false) => isKeyPressed(id, Control.LIGHT_KICK, forControlHistory);
export const isMediumKick = (id, forControlHistory = false) => isKeyPressed(id, Control.MEDIUM_KICK, forControlHistory);
export const isHeavyKick = (id, forControlHistory = false) => isKeyPressed(id, Control.HEAVY_KICK, forControlHistory);

const SPECIAL_CONTROLS = [
	[Control.SPECIAL_MELA, 'mela'],
	[Control.SPECIAL_PASTIZZI, 'pastizzi'],
	[Control.SPECIAL_UWEJJA, 'uwejja'],
	[Control.SPECIAL_RICOTTA, 'ricotta'],
];

/** The one-touch special pressed this frame ('mela' | 'pastizzi' | 'uwejja' | 'ricotta'), or null. */
export const getSpecialPressed = (id) => {
	for (const [control, kind] of SPECIAL_CONTROLS) {
		if (isKeyPressed(id, control)) return kind;
	}
	return null;
};
