import { StreetFighterGame } from './StreetFighterGame.js';
import { isTouchDevice } from './utils/pointer.js';
import { Audio } from './engine/Audio.js';
import { Voice } from './engine/Voice.js';
import { installScreenControls } from './engine/ScreenControls.js';
import { checkForUpdate, registerServiceWorker } from './engine/Updater.js';
import { makeIchiPortrait } from './entitites/fighters/IchiArt.js';

window.onload = () => {
	registerServiceWorker(); // every file is re-validated with the server: never a stale version
	checkForUpdate(); // new version.json on the server -> clear caches + reload once

	if (isTouchDevice()) document.body.classList.add('touch');

	// Ichi is drawn in code, so is its portrait
	const ichi = makeIchiPortrait();
	ichi.id = 'IchiPortrait';
	ichi.style.display = 'none';
	document.body.appendChild(ichi);

	Audio.installUnlock(); // music + sounds start on the first tap / click / key (browser rule)
	Voice.installIntro(); // "Lou & Ichi!"  "Pastizzi Fighters!"
	installScreenControls(); // full screen + sound (+ pause) buttons
	const game = new StreetFighterGame();
	game.start();
	if (new URLSearchParams(window.location.search).has('debug')) window.__game = game; // handy for testing
};
