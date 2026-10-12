import { SCENE_WIDTH } from '../constants/Stage.js';
import { gameState, prepareStage, currentOpponent, startSession, ROSTER } from '../states/gameState.js';
import { toLogical, getCanvas, isTouchDevice } from '../utils/pointer.js';
import { BattleScene } from './BattleScene.js';
import { SelectScene } from './SelectScene.js';
import { FIGHTER_INFO, drawBackdrop, drawButton, drawPortrait, inRect, outlinedText } from './ui.js';
import { ARENAS } from '../entitites/stage/MaltaStage.js';
import { Audio } from '../engine/Audio.js';

const AUTO_START = 4.5; // seconds before a "versus" screen starts the fight on its own

/**
 * The screens between fights, driven by gameState.session.mode:
 *   stage    -> "STAGE n  A vs B"  (then the fight)
 *   gameover -> retry / change fighter
 *   champion -> you beat everyone
 */
export class InterludeScene {
	t = 0;
	leaving = false;
	confetti = [];

	constructor(changeScene) {
		this.changeScene = changeScene;
		this.canvas = getCanvas();
		this.touch = isTouchDevice();
		this.mode = gameState.session.mode;
		if (this.mode === 'stage') prepareStage();
		Audio.playMusic('title');
		if (this.mode === 'champion') {
			for (let i = 0; i < 70; i++)
				this.confetti.push({
					x: Math.random() * SCENE_WIDTH,
					y: -Math.random() * 224,
					v: 30 + Math.random() * 50,
					s: 2 + Math.random() * 3,
					c: ['#ffcc00', '#e03a3a', '#ffffff', '#4aa8ff'][i % 4],
					p: Math.random() * 6,
				});
		}
		this.buttons = this.makeButtons();
		this.canvas.addEventListener('pointerup', this.onUp);
		window.addEventListener('keydown', this.onKey);
	}

	destroy = () => {
		this.canvas.removeEventListener('pointerup', this.onUp);
		window.removeEventListener('keydown', this.onKey);
	};

	makeButtons() {
		const cx = SCENE_WIDTH / 2;
		if (this.mode === 'stage') return [{ id: 'go', label: 'FIGHT!', x: cx - 62, y: 186, w: 124, h: 26 }];
		if (this.mode === 'gameover')
			return [
				{ id: 'retry', label: 'TRY AGAIN', x: cx - 118, y: 176, w: 108, h: 26 },
				{ id: 'menu', label: 'CHANGE FIGHTER', x: cx + 10, y: 176, w: 108, h: 26 },
			];
		return [{ id: 'menu', label: 'PLAY AGAIN', x: cx - 62, y: 186, w: 124, h: 26 }];
	}

	act = (id) => {
		if (this.leaving) return;
		this.leaving = true;
		if (id === 'go') this.changeScene(BattleScene);
		else if (id === 'retry') {
			startSession(gameState.session.playerId);
			this.changeScene(InterludeScene);
		} else this.changeScene(SelectScene);
	};

	onUp = (e) => {
		const p = toLogical(e);
		const hit = this.buttons.find((b) => inRect(p, b));
		if (hit) this.act(hit.id);
		else if (this.mode === 'stage' && this.t > 0.6) this.act('go'); // tap anywhere to skip
	};

	onKey = (e) => {
		if (e.repeat) return;
		if (e.code === 'Enter' || e.code === 'Space') {
			this.act(this.buttons[0].id);
			e.preventDefault();
		}
	};

	update = (time) => {
		this.t += time.secondsPassed;
		if (this.mode === 'stage' && this.t > AUTO_START) this.act('go');
		for (const c of this.confetti) {
			c.y += c.v * time.secondsPassed;
			c.p += time.secondsPassed * 4;
			if (c.y > 230) c.y = -6;
		}
	};

	drawStage(context) {
		const s = gameState.session;
		const total = s.opponents.length;
		const me = s.playerId;
		const foe = currentOpponent();
		outlinedText(context, `STAGE ${s.stage + 1} / ${total}`, SCENE_WIDTH / 2, 30, 17, '#ffcc00', '#7a0a14');
		const arena = ARENAS[gameState.arena];
		outlinedText(context, `ARENA: ${arena.name} - ${arena.sub}`, SCENE_WIDTH / 2, 44, 7.5, '#b8c4ff', '#0a1030', 'center', 700);

		const slide = Math.min(1, this.t / 0.45);
		const ease = 1 - Math.pow(1 - slide, 3);
		const size = 84;
		drawPortrait(context, me, -size + ease * (SCENE_WIDTH / 2 - 112 + size), 54, size, { border: '#35e0a0' });
		drawPortrait(context, foe, SCENE_WIDTH + 0 - ease * (SCENE_WIDTH / 2 - 112 + size) , 54, size, { border: '#ff6a80' });

		const vs = Math.min(1, Math.max(0, (this.t - 0.35) / 0.2));
		outlinedText(context, 'VS', SCENE_WIDTH / 2, 108 + (1 - vs) * -10, 24 + 8 * (1 - vs), '#ffffff', '#c01030');

		outlinedText(context, FIGHTER_INFO[me].label, 121, 156, 10, '#35e0a0', '#0a1030', 'center');
		outlinedText(context, FIGHTER_INFO[foe].label, 261, 156, 10, '#ff6a80', '#0a1030', 'center');
		outlinedText(context, FIGHTER_INFO[foe].taunt, SCENE_WIDTH / 2, 176, 8, '#ffe9a0', '#2a1000', 'center', 700);

		// remaining chain
		const left = s.opponents.slice(s.stage + 1);
		if (left.length) {
			outlinedText(context, 'NEXT:', 10, 207, 6.5, '#b8c4ff', '#0a1030', 'left', 700);
			left.forEach((id, i) => drawPortrait(context, id, 36 + i * 22, 199, 16, { border: '#ffffff88', dim: 0.3 }));
		}
	}

	drawGameOver(context) {
		const s = gameState.session;
		outlinedText(context, 'GAME OVER', SCENE_WIDTH / 2, 56, 30, '#ff4a4a', '#2a0000');
		const foe = FIGHTER_INFO[s.opponents[s.stage]];
		outlinedText(context, `${foe.label} WAS TOO STRONG ON STAGE ${s.stage + 1}`, SCENE_WIDTH / 2, 88, 8, '#ffffff', '#0a1030', 'center', 700);
		drawPortrait(context, s.opponents[s.stage], SCENE_WIDTH / 2 - 33, 98, 66, { border: '#ff6a80' });
	}

	drawChampion(context) {
		const s = gameState.session;
		for (const c of this.confetti) {
			context.fillStyle = c.c;
			context.fillRect(c.x + Math.sin(c.p) * 6, c.y, c.s, c.s * 0.6);
		}
		outlinedText(context, 'CHAMPION OF MALTA!', SCENE_WIDTH / 2, 40, 19, '#ffcc00', '#7a0a14');
		drawPortrait(context, s.playerId, SCENE_WIDTH / 2 - 40, 54, 80, { border: '#ffcc00' });
		outlinedText(context, `${FIGHTER_INFO[s.playerId].label} BEAT EVERYBODY ON THE ISLAND`, SCENE_WIDTH / 2, 154, 8, '#ffffff', '#0a1030', 'center', 700);
		outlinedText(context, `SCORE ${s.score}`, SCENE_WIDTH / 2, 170, 10, '#ffe9a0', '#2a1000');
	}

	draw = (context) => {
		drawBackdrop(context, this.t);
		if (this.mode === 'stage') this.drawStage(context);
		else if (this.mode === 'gameover') this.drawGameOver(context);
		else this.drawChampion(context);
		const pulse = (Math.sin(this.t * 5) + 1) / 2;
		this.buttons.forEach((b, i) => drawButton(context, b, b.label, { pulse: i === 0 ? pulse : 0, fill: b.id === 'menu' && this.mode === 'gameover' ? '#9fb6ff' : '#ffcc00' }));
	};
}
