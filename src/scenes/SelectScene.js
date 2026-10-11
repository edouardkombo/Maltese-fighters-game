import { SCENE_WIDTH } from '../constants/Stage.js';
import { FighterId } from '../constants/fighter.js';
import { gameState } from '../states/gameState.js';
import { createDefaultFighterState } from '../states/fighterState.js';
import { BattleScene } from './BattleScene.js';

const CHOICES = [
	{ id: FighterId.RYU, label: 'RYU', portrait: 'RyuPortrait', bg: '#6490c8' },
	{ id: FighterId.KEN, label: 'KEN', portrait: 'KenPortrait', bg: '#c86432' },
	{ id: FighterId.LOU, label: 'LOU', portrait: 'LouPortrait', bg: '#288040' },
];

export class SelectScene {
	p1Index = 0;
	p2Index = 2;
	selected = false;
	flash = 0;

	constructor(changeScene) {
		this.changeScene = changeScene;
		this._onKey = (e) => this.onKey(e);
		window.addEventListener('keydown', this._onKey);
		const music = document.getElementById('kensTheme');
		if (music) {
			music.volume = 0.35;
			music.loop = true;
			music.play().catch(() => {});
		}
	}

	onKey(e) {
		if (this.selected) return;
		const k = e.code;
		if (k === 'KeyA' || k === 'ArrowLeft')
			this.p1Index = (this.p1Index + CHOICES.length - 1) % CHOICES.length;
		else if (k === 'KeyD' || k === 'ArrowRight')
			this.p1Index = (this.p1Index + 1) % CHOICES.length;
		else if (k === 'KeyZ')
			this.p2Index = (this.p2Index + CHOICES.length - 1) % CHOICES.length;
		else if (k === 'KeyC')
			this.p2Index = (this.p2Index + 1) % CHOICES.length;
		else if (k === 'Enter' || k === 'Space')
			this.confirm();
	}

	confirm() {
		this.selected = true;
		window.removeEventListener('keydown', this._onKey);
		gameState.fighters = [
			createDefaultFighterState(CHOICES[this.p1Index].id),
			createDefaultFighterState(CHOICES[this.p2Index].id),
		];
		this.changeScene(BattleScene);
	}

	update(time) {
		this.flash += time.secondsPassed || 0.016;
	}

	drawPortrait(context, choice, x, y, size) {
		context.fillStyle = choice.bg;
		context.fillRect(x, y, size, size);
		const img = document.getElementById(choice.portrait);
		if (img && img.complete && img.naturalWidth > 0) {
			context.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, x, y, size, size);
		} else {
			context.fillStyle = '#fff';
			context.font = 'bold 20px monospace';
			context.textAlign = 'center';
			context.fillText(choice.label[0], x + size / 2, y + size / 2 + 7);
		}
		context.strokeStyle = '#ffffff';
		context.lineWidth = 2;
		context.strokeRect(x, y, size, size);
	}

	draw(context) {
		context.fillStyle = '#0a0a20';
		context.fillRect(0, 0, SCENE_WIDTH + 10, 230);

		context.textAlign = 'center';
		context.font = 'bold 12px monospace';
		context.fillStyle = '#ffcc00';
		context.fillText('MALTESE FIGHTERS', SCENE_WIDTH / 2, 20);
		context.font = '9px monospace';
		context.fillStyle = '#ffffff';
		context.fillText('by Louison', SCENE_WIDTH / 2, 34);
		context.font = '8px monospace';
		context.fillStyle = '#aaaaff';
		context.fillText('SELECT YOUR FIGHTER', SCENE_WIDTH / 2, 52);

		// P1
		context.fillStyle = '#1a1a3a';
		context.fillRect(25, 65, 150, 110);
		context.strokeStyle = '#00ff88';
		context.lineWidth = 2;
		context.strokeRect(25, 65, 150, 110);
		context.fillStyle = '#00ff88';
		context.font = '9px monospace';
		context.fillText('PLAYER 1', 100, 78);
		this.drawPortrait(context, CHOICES[this.p1Index], 72, 85, 56);
		context.fillStyle = '#ffffff';
		context.font = 'bold 14px monospace';
		context.fillText(CHOICES[this.p1Index].label, 100, 158);
		context.font = '7px monospace';
		context.fillStyle = '#888';
		context.fillText('A / D change', 100, 170);

		// P2
		context.fillStyle = '#3a1a1a';
		context.fillRect(205, 65, 150, 110);
		context.strokeStyle = '#ff6688';
		context.lineWidth = 2;
		context.strokeRect(205, 65, 150, 110);
		context.fillStyle = '#ff6688';
		context.font = '9px monospace';
		context.fillText('PLAYER 2 (CPU)', 280, 78);
		this.drawPortrait(context, CHOICES[this.p2Index], 252, 85, 56);
		context.fillStyle = '#ffffff';
		context.font = 'bold 14px monospace';
		context.fillText(CHOICES[this.p2Index].label, 280, 158);
		context.font = '7px monospace';
		context.fillStyle = '#888';
		context.fillText('Z / C change', 280, 170);

		if (Math.floor(this.flash * 3) % 2 === 0) {
			context.fillStyle = '#ffcc00';
			context.font = '10px monospace';
			context.fillText('PRESS ENTER TO FIGHT', SCENE_WIDTH / 2, 200);
		}
	}
}
