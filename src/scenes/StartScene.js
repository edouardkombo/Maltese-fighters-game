import { SCENE_WIDTH } from '../constants/Stage.js';
import { LOGO_FLASH_DELAY } from '../constants/battle.js';
import { MenuScene } from './MenuScene.js';
import { NetLobbyScene } from './NetLobbyScene.js';
import { isTouchDevice } from '../utils/pointer.js';
import { Audio } from '../engine/Audio.js';
import { roomFromUrl } from '../engine/Net.js';
import { drawBackdrop, drawMoveList, outlinedText } from './ui.js';

/** Title screen: logo, controls and super powers. The first tap / click / key also starts the music. */
export class StartScene {
	logoImg = document.getElementById('Logo');
	touch = isTouchDevice();
	room = roomFromUrl();
	text = this.room
		? `${isTouchDevice() ? 'TAP' : 'CLICK'} TO JOIN YOUR FRIEND'S GAME`
		: `${isTouchDevice() ? 'TAP' : 'CLICK'} ANYWHERE TO START`;
	logoFlash = false;
	flashTimer = 0;
	t = 0;
	sceneEnded = false;

	endStartScene = (e) => {
		if (this.sceneEnded) return;
		if (e?.type === 'keydown' && !['Enter', 'Space'].includes(e.code)) return;
		this.sceneEnded = true;
		Audio.unlock();
		Audio.click();
		this.changeScene(this.room ? NetLobbyScene : MenuScene);
	};

	destroy = () => {
		window.removeEventListener('click', this.endStartScene);
		window.removeEventListener('keydown', this.endStartScene);
	};

	constructor(changeScene) {
		this.changeScene = changeScene;
		window.addEventListener('click', this.endStartScene);
		window.addEventListener('keydown', this.endStartScene);
		Audio.playMusic('title'); // starts as soon as the browser allows sound (first tap / click / key)
	}

	updateLogo = (time) => {
		if (this.flashTimer > time.previous) return;
		this.flashTimer = time.previous + LOGO_FLASH_DELAY[Number(!this.logoFlash)];
		this.logoFlash = !this.logoFlash;
	};

	update = (time) => {
		this.t += time.secondsPassed;
		this.updateLogo(time);
	};

	drawLogo = (context) => {
		if (!this.logoImg || !this.logoImg.complete) return;
		context.imageSmoothingEnabled = true;
		const scale = 0.85 + Math.sin(this.t * 3) * 0.015;
		const w = (this.logoImg.naturalWidth / 3) * scale; // logo.png is stored at 3x
		const h = (this.logoImg.naturalHeight / 3) * scale;
		context.globalAlpha = this.logoFlash ? 0.8 : 1;
		context.drawImage(this.logoImg, (SCENE_WIDTH - w) / 2, 4, w, h);
		context.imageSmoothingEnabled = false;
		context.globalAlpha = 1;
	};

	draw = (context) => {
		drawBackdrop(context, this.t);
		this.drawLogo(context);
		context.fillStyle = 'rgba(0,0,0,.35)';
		context.fillRect(10, 72, SCENE_WIDTH - 20, 66);
		drawMoveList(context, this.touch, 16, 86);
		const pulse = 0.55 + 0.45 * Math.abs(Math.sin(this.t * 3));
		context.globalAlpha = pulse;
		outlinedText(context, this.text, SCENE_WIDTH / 2, 166, 12, '#ffcc00', '#5a0a10');
		context.globalAlpha = 1;
		outlinedText(context, 'PLAY THE CPU  •  OR FIGHT A FRIEND ONLINE WITH A LINK', SCENE_WIDTH / 2, 186, 7, '#b8c4ff', '#0a1030', 'center', 700);
		if (!Audio.unlocked) outlinedText(context, '♪ music starts on your first tap / click', SCENE_WIDTH / 2, 212, 6.5, '#8c98cc', '#0a1030', 'center', 700);
	};
}
