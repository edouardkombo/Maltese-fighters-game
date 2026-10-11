import { SCENE_WIDTH } from '../constants/Stage.js';
import { LOGO_FLASH_DELAY } from '../constants/battle.js';
import { SelectScene } from './SelectScene.js';

export class StartScene {
	image = document.getElementById('Controls');
	logoImg = document.getElementById('Logo');

	text = 'CLICK ANYWHERE TO START';
	repeatTime = 3;
	position = 10;
	logoFlash = false;
	flashTimer = 0;
	brightness = 0;
	contrast = 3;
	sceneEnded = false;

	endStartScene = () => {
		this.changeScene(SelectScene);
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

	draw = (context) => {
		context.drawImage(this.image, 0, 0);
		this.drawLogo(context);
		this.drawText(context);
	};
}
