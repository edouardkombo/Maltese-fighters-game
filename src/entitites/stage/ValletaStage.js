import { SCENE_WIDTH } from '../../constants/Stage.js';

/** Grand Harbour, Valletta: photo backdrop (parallax) + limestone quay floor. */
export class ValletaStage {
	image = document.getElementById('StageImage');
	floor = document.getElementById('FloorImage');
	backgroundMusic = document.getElementById('kensTheme');
	musicStarted = false;

	update = () => {
		if (!this.musicStarted && this.backgroundMusic) {
			try {
				this.backgroundMusic.volume = 0.35;
				this.backgroundMusic.loop = true;
				this.backgroundMusic.play().catch(() => {});
			} catch (e) {
				/* autoplay may be blocked until the first click - harmless */
			}
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
		context.imageSmoothingEnabled = true;
		context.imageSmoothingQuality = 'high';
		context.drawImage(
			img,
			0, 0, img.naturalWidth, img.naturalHeight,
			offsetX - 40, 0, drawW + 80, 224
		);
		context.imageSmoothingEnabled = false;
		this.drawFloor(context, camera);
	};

	// nothing sits in front of the fighters (the floor is part of the background so feet are never covered)
	drawForeground = () => {};

	drawFloor = (context, camera) => {
		const floorY = 200;
		const f = this.floor;
		if (!f || !f.complete || !f.naturalWidth) {
			context.fillStyle = '#9a8660';
			context.fillRect(0, floorY, SCENE_WIDTH + 40, 30);
			return;
		}
		const tileW = f.naturalWidth / 3; // logical width of one tile (382)
		const shift = -(((camera?.position?.x || 0) % tileW) + tileW) % tileW;
		context.imageSmoothingEnabled = true;
		for (let x = shift - tileW; x < SCENE_WIDTH + tileW; x += tileW) {
			context.drawImage(f, 0, 0, f.naturalWidth, 30 * 3, Math.floor(x), floorY, tileW + 1, 30);
		}
		context.imageSmoothingEnabled = false;
		// soft horizon shadow where the quay meets the harbour
		const g = context.createLinearGradient(0, floorY - 6, 0, floorY + 4);
		g.addColorStop(0, 'rgba(0,0,0,0)');
		g.addColorStop(1, 'rgba(0,0,0,0.28)');
		context.fillStyle = g;
		context.fillRect(0, floorY - 6, SCENE_WIDTH + 40, 10);
	};
}
