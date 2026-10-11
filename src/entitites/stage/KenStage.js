import {
	SCENE_WIDTH,
	STAGE_MID_POINT,
	STAGE_PADDING,
	STAGE_WIDTH,
} from '../../constants/Stage.js';

export class KenStage {
	image = document.getElementById('KenStage');
	backgroundMusic = document.getElementById('kensTheme');
	musicStarted = false;

	update = (time) => {
		if (!this.musicStarted && this.backgroundMusic) {
			try {
				this.backgroundMusic.volume = 0.35;
				this.backgroundMusic.loop = true;
				this.backgroundMusic.play().catch(() => {});
			} catch (e) {}
			this.musicStarted = true;
		}
	};

	drawBackground = (context, camera) => {
		const img = this.image;
		if (!img || !img.complete || !img.naturalWidth) {
			context.fillStyle = '#1a3a5c';
			context.fillRect(0, 0, SCENE_WIDTH + 20, 224);
			return;
		}
		const scaleY = 224 / img.naturalHeight;
		const drawW = img.naturalWidth * scaleY;
		const offsetX = -(camera?.position?.x || 0) * 0.35;
		context.drawImage(
			img,
			0, 0, img.naturalWidth, img.naturalHeight,
			offsetX - 40, 0, drawW + 80, 224
		);
	};

	drawForeground = (context, camera) => {
		// Solid floor platform so fighters look grounded
		const floorY = 200;
		// Main floor slab
		context.fillStyle = '#5a4a32';
		context.fillRect(0, floorY, SCENE_WIDTH + 40, 30);
		// Top edge highlight
		context.fillStyle = '#8a7a55';
		context.fillRect(0, floorY, SCENE_WIDTH + 40, 4);
		// Tile lines
		context.strokeStyle = 'rgba(0,0,0,0.25)';
		context.lineWidth = 1;
		for (let x = 0; x < SCENE_WIDTH + 40; x += 32) {
			context.beginPath();
			context.moveTo(x, floorY);
			context.lineTo(x, 230);
			context.stroke();
		}
		// Shadow under floor edge
		context.fillStyle = 'rgba(0,0,0,0.4)';
		context.fillRect(0, floorY + 26, SCENE_WIDTH + 40, 8);
	};
}
