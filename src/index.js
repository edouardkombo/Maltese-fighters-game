import { StreetFighterGame } from './StreetFighterGame.js';
import { isTouchDevice } from './utils/pointer.js';

window.onload = () => {
	if (isTouchDevice()) document.body.classList.add('touch');
	const game = new StreetFighterGame();
	game.start();
	if (new URLSearchParams(window.location.search).has('debug')) window.__game = game; // handy for testing
};
