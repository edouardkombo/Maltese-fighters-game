import { RENDER_SCALE } from '../constants/game.js';
import { SCENE_HEIGHT, SCENE_WIDTH } from '../constants/Stage.js';

/** Back to the base transform (logical game pixels -> hi-res canvas). */
export const resetTransform = (context) => {
	context.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
};

export const drawFrame = (context, image, dimensions, x, y, direction = 1) => {
	const [sourceX, sourceY, sourceWidth, sourceHeight] = dimensions;

	context.scale(direction, 1);
	context.drawImage(
		image,
		sourceX,
		sourceY,
		sourceWidth,
		sourceHeight,
		x * direction,
		y,
		sourceWidth,
		sourceHeight
	);

	resetTransform(context);
};

export const getContext = () => {
	const canvasEL = document.querySelector('canvas');
	canvasEL.width = SCENE_WIDTH * RENDER_SCALE;
	canvasEL.height = SCENE_HEIGHT * RENDER_SCALE;
	const context = canvasEL.getContext('2d');
	resetTransform(context);
	context.imageSmoothingEnabled = false; // pixel-art HUD / UI stay crisp
	return context;
};
