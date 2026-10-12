import { SCENE_WIDTH } from '../constants/Stage.js';
import { Audio } from '../engine/Audio.js';
import { Net } from '../engine/Net.js';
import { gameState } from '../states/gameState.js';
import { getCanvas, toLogical } from '../utils/pointer.js';
import { NetLobbyScene } from './NetLobbyScene.js';
import { SelectScene } from './SelectScene.js';
import { drawBackdrop, drawButton, inRect, outlinedText } from './ui.js';

const CX = SCENE_WIDTH / 2;

/** 1 player (career vs the CPU) or online with a friend. */
export class MenuScene {
	t = 0;
	selected = 0;
	leaving = false;
	buttons = [
		{ id: 'solo', label: '1 PLAYER  -  VS CPU', sub: 'Beat everybody on the island', x: CX - 110, y: 78, w: 220, h: 34 },
		{ id: 'online', label: 'PLAY WITH A FRIEND', sub: 'Online - send them an invite link', x: CX - 110, y: 128, w: 220, h: 34 },
	];

	constructor(changeScene) {
		this.changeScene = changeScene;
		this.canvas = getCanvas();
		Net.close();
		gameState.net = null;
		Audio.playMusic('title');
		this.canvas.addEventListener('pointerup', this.onUp);
		this.canvas.addEventListener('pointermove', this.onMove);
		window.addEventListener('keydown', this.onKey);
	}

	destroy = () => {
		this.canvas.removeEventListener('pointerup', this.onUp);
		this.canvas.removeEventListener('pointermove', this.onMove);
		window.removeEventListener('keydown', this.onKey);
	};

	act = (id) => {
		if (this.leaving) return;
		this.leaving = true;
		Audio.click();
		if (id === 'solo') this.changeScene(SelectScene);
		else this.changeScene(NetLobbyScene);
	};

	onMove = (e) => {
		const p = toLogical(e);
		const i = this.buttons.findIndex((b) => inRect(p, b));
		if (i >= 0) this.selected = i;
	};

	onUp = (e) => {
		const p = toLogical(e);
		const hit = this.buttons.find((b) => inRect(p, b));
		if (hit) this.act(hit.id);
	};

	onKey = (e) => {
		if (e.repeat) return;
		if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
			this.selected = 1 - this.selected;
			Audio.click();
		} else if (e.code === 'Enter' || e.code === 'Space') this.act(this.buttons[this.selected].id);
		else return;
		e.preventDefault();
	};

	update = (time) => {
		this.t += time.secondsPassed;
	};

	draw = (context) => {
		drawBackdrop(context, this.t);
		outlinedText(context, 'MALTESE FIGHTERS', CX, 34, 22, '#ffcc00', '#7a0a14');
		outlinedText(context, 'HOW DO YOU WANT TO PLAY?', CX, 54, 9, '#b8c4ff', '#0a1030');
		const pulse = (Math.sin(this.t * 5) + 1) / 2;
		this.buttons.forEach((b, i) => {
			const on = i === this.selected;
			drawButton(context, b, b.label, { pulse: on ? pulse : 0, fill: on ? '#ffcc00' : '#9fb6ff' });
			outlinedText(context, b.sub, CX, b.y + b.h + 9, 7, '#ffffff', '#0a1030', 'center', 700);
		});
		outlinedText(context, '↑ ↓  +  ENTER   or   CLICK / TAP', CX, 212, 7, '#8c98cc', '#0a1030', 'center', 700);
	};
}
