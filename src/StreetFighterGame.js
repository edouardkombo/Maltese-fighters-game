import {
	registerGamepadEvents,
	registerKeyboardEvents,
	updateGamePads,
} from './engine/InputHandler.js';
import { getContext } from './utils/context.js';
import { BattleScene } from './scenes/BattleScene.js';
import { GAME_SPEED } from './constants/game.js';
import { StartScene } from './scenes/StartScene.js';
import { ContextHandler } from './engine/ContextHandler.js';
import { SCENE_HEIGHT, SCENE_WIDTH } from './constants/Stage.js';
import { resetTransform } from './utils/context.js';

export class StreetFighterGame {
	context = getContext();

	frameTime = {
		secondsPassed: 0,
		previous: 0,
	};

	timeStarted = 0;
	sceneStarted = false;
	nextScene = undefined;

	contextHandler = new ContextHandler(this.context);

	changeScene = (SceneClass) => {
		this.contextHandler.startDimDown();
		this.sceneStarted = false;
		this.nextScene = SceneClass;
	};

	startScene = (SceneClass) => {
		this.contextHandler.startGlowUp();
		this.scene?.destroy?.(); // let the old scene remove its listeners / hide its controls
		this.scene = new SceneClass(this.changeScene);
		this.sceneStarted = true;
	};

	constructor() {
		this.startScene(StartScene);
	}

	updateScenes = () => {
		// start every frame from a clean canvas: nothing from the previous frame may survive
		// (otherwise any spot a scene does not repaint keeps "ghost" images of the fighters)
		resetTransform(this.context);
		this.context.globalAlpha = 1;
		this.context.fillStyle = '#000';
		this.context.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
		this.scene.draw(this.context);
		if (this.contextHandler.dimDown) return;
		if (!this.sceneStarted) this.startScene(this.nextScene);
		this.scene.update(this.frameTime);
	};

	frame = (time) => {
		window.requestAnimationFrame(this.frame.bind(this));

		if (this.timeStarted === 0) {
			this.timeStarted = time;
		}
		time -= this.timeStarted;
		time = time * GAME_SPEED;

		this.frameTime = {
			secondsPassed: Math.min(0.05, (time - this.frameTime.previous) / 1000), // clamp to avoid jump lag spikes
			previous: time,
		};
		updateGamePads();
		this.contextHandler.update(this.frameTime);
		// filter disabled for performance
		this.updateScenes();
	};

	start() {
		registerKeyboardEvents();
		registerGamepadEvents();
		window.requestAnimationFrame(this.frame.bind(this));
	}
}
