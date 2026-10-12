import { StreetFighterGame } from './StreetFighterGame.js';
import { isTouchDevice } from './utils/pointer.js';
import { Audio } from './engine/Audio.js';
import { installScreenControls } from './engine/ScreenControls.js';

window.onload = () => {
	if (isTouchDevice()) document.body.classList.add('touch');
	Audio.installUnlock(); // music + sounds start on the first tap / click / key (browser rule)
	installScreenControls(); // full screen + sound buttons
	const game = new StreetFighterGame();
	game.start();
	if (new URLSearchParams(window.location.search).has('debug')) window.__game = game; // handy for testing
};