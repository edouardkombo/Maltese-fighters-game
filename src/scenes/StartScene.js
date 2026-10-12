import { SCENE_WIDTH } from '../constants/Stage.js';
import { LOGO_FLASH_DELAY } from '../constants/battle.js';
import { SelectScene } from './SelectScene.js';
import { isTouchDevice } from '../utils/pointer.js';

export class StartScene {
	image = document.getElementById('Controls');
	logoImg = document.getElementById('Logo');

	text = isTouchDevice() ? 'TAP ANYWHERE TO START' : 'CLICK ANYWHERE TO START';
	repeatTime = 3;
	position = 10;
	logoFlash = false;
	flashTimer = 0;
	brightness = 0;
	contrast = 3;
	sceneEnded = false;

	endStartScene = () => {
		if (this.sceneEnded) return;
		this.sceneEnded = true;
		this.changeScene(SelectScene);
	};

	destroy = () => {
		window.removeEventListener('click', this.endStartScene);
	};

	constructor(changeScene) {
		this.changeScene = changeScene;
		window.removeEventListener('click', this.endStartScene);
		window.addEventListener('click', this.endStartScene);
		// Start music on title
		const music = document.getElementById('kensTheme');
		if (music) {
			music.volume = 0.35;
			music.loop = true;
			music.play().catch(() => {});
		}
	}

	updateLogo = (time) => {
		if (this.flashTimer > time.previous) return;
		this.flashTimer = time.previous + LOGO_FLASH_DELAY[Number(!this.logoFlash)];
		this.logoFlash = !this.logoFlash;
	};

	updateTextPosition = (time) => {
		this.position -= time.secondsPassed * 100;
	};

	update = (time) => {
		this.updateLogo(time);
		this.updateTextPosition(time);
	};

	drawText = (context) => {
		context.fillStyle = 'white';
		context.font = '12px Arial';
		const textWidth = context.measureText(this.text).width;

		for (let i = 0; i < this.repeatTime; i++) {
			context.fillText(this.text, this.position + i * (textWidth + 30), 18);
		}

		if (this.position < (-textWidth + -30) * this.repeatTime) {
			this.position = SCENE_WIDTH;
		}
	};

			drawLogo = (context) => {
		if (!this.logoImg || !this.logoImg.complete) return;
		context.imageSmoothingEnabled = true;
		// Draw the Maltese Fighters logo (Street-Fighter style)
		const scale = 1.2;
		const w = (this.logoImg.naturalWidth / 3) * scale; // logo.png is stored at 3x
		const h = (this.logoImg.naturalHeight / 3) * scale;
		const x = (SCENE_WIDTH - w) / 2;
		const y = 8;
		if (this.logoFlash) {
			context.globalAlpha = 0.7;
		}
		context.drawImage(this.logoImg, x, y, w, h);
		context.imageSmoothingEnabled = false;
		context.globalAlpha = 1;
	};

	drawTouchHelp = (context) => {
		const lines = [
			['D-PAD', 'move / jump / crouch  (slide for diagonals)'],
			['LP  MP  HP', 'light / medium / heavy punch'],
			['LK  MK  HK', 'light / medium / heavy kick'],
			['MELA!', 'one tap = special move'],
		];
		context.save();
		context.textAlign = 'left';
		lines.forEach(([a, b], i) => {
			const y = 112 + i * 24;
			context.font = '900 11px "Arial Black", Impact, sans-serif';
			context.fillStyle = '#ffcc00';
			context.fillText(a, 28, y);
			context.font = '700 9px system-ui, sans-serif';
			context.fillStyle = '#ffffff';
			context.fillText(b, 28, y + 10);
		});
		context.restore();
	};

	draw = (context) => {
		if (isTouchDevice()) {
			context.fillStyle = '#000';
			context.fillRect(0, 0, SCENE_WIDTH, 224);
			this.drawLogo(context);
			this.drawTouchHelp(context);
			this.drawText(context);
			return;
		}
		context.drawImage(this.image, 0, 0);
		this.drawLogo(context);
		this.drawText(context);
	};
}
