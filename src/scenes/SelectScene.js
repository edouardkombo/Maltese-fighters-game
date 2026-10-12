import { SCENE_WIDTH } from '../constants/Stage.js';
import { ROSTER, startSession } from '../states/gameState.js';
import { toLogical, getCanvas, isTouchDevice } from '../utils/pointer.js';
import { InterludeScene } from './InterludeScene.js';
import { FIGHTER_INFO, drawBackdrop, drawButton, drawPortrait, inRect, outlinedText } from './ui.js';

const SPACING = 104; // distance between carousel cards (game px)
const CENTER_X = SCENE_WIDTH / 2;

/**
 * Pick your fighter: swipe / drag the carousel, click the arrows, use A/D or the arrow keys,
 * then tap FIGHT! (or the portrait, or Enter). The rest of the roster is your chain of opponents.
 */
export class SelectScene {
	index = 0; // selected fighter
	pos = 0; // animated carousel position (float)
	t = 0;
	drag = null; // { startX, startPos, moved }
	leaving = false;

	arrowL = { x: 6, y: 66, w: 34, h: 70 };
	arrowR = { x: SCENE_WIDTH - 40, y: 66, w: 34, h: 70 };
	fightBtn = { x: CENTER_X - 62, y: 187, w: 124, h: 26 };
	card = { x: CENTER_X - 45, y: 52, w: 90, h: 100 };

	constructor(changeScene) {
		this.changeScene = changeScene;
		this.canvas = getCanvas();
		this.touch = isTouchDevice();
		this.canvas.addEventListener('pointerdown', this.onDown);
		window.addEventListener('pointermove', this.onMove);
		window.addEventListener('pointerup', this.onUp);
		window.addEventListener('pointercancel', this.onCancel);
		window.addEventListener('keydown', this.onKey);
	}

	destroy = () => {
		this.canvas.removeEventListener('pointerdown', this.onDown);
		window.removeEventListener('pointermove', this.onMove);
		window.removeEventListener('pointerup', this.onUp);
		window.removeEventListener('pointercancel', this.onCancel);
		window.removeEventListener('keydown', this.onKey);
	};

	// ---------------------------------------------------------------------------- input
	move = (dir) => {
		const n = ROSTER.length;
		this.index = (this.index + dir + n) % n;
	};

	confirm = () => {
		if (this.leaving) return;
		this.leaving = true;
		startSession(ROSTER[this.index]);
		this.changeScene(InterludeScene);
	};

	onKey = (e) => {
		if (e.repeat) return;
		if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.move(-1);
		else if (e.code === 'KeyD' || e.code === 'ArrowRight') this.move(1);
		else if (e.code === 'Enter' || e.code === 'Space') this.confirm();
		else return;
		e.preventDefault();
	};

	onDown = (e) => {
		const p = toLogical(e);
		this.drag = { startX: p.x, startPos: this.pos, moved: false, id: e.pointerId, start: p };
		try {
			this.canvas.setPointerCapture(e.pointerId);
		} catch (err) {
			/* not all browsers allow capture for every pointer type */
		}
	};

	onMove = (e) => {
		if (!this.drag || e.pointerId !== this.drag.id) return;
		const p = toLogical(e);
		const dx = p.x - this.drag.startX;
		if (Math.abs(dx) > 5) this.drag.moved = true;
		if (this.drag.moved) this.pos = this.drag.startPos - dx / SPACING; // the carousel follows the finger
	};

	onCancel = (e) => {
		if (!this.drag || e.pointerId !== this.drag.id) return;
		this.index = this.nearest();
		this.drag = null;
	};

	onUp = (e) => {
		if (!this.drag || e.pointerId !== this.drag.id) return;
		const d = this.drag;
		this.drag = null;
		const p = toLogical(e);
		if (d.moved) {
			// swipe: flick or drag far enough -> snap to the nearest card
			const dx = p.x - d.startX;
			let target = this.nearest();
			const startIdx = ((Math.round(d.startPos) % ROSTER.length) + ROSTER.length) % ROSTER.length;
			if (Math.abs(dx) > 18 && target === startIdx) {
				target = (target + (dx < 0 ? 1 : -1) + ROSTER.length) % ROSTER.length;
			}
			this.index = target;
			return;
		}
		// tap
		if (inRect(p, this.arrowL)) this.move(-1);
		else if (inRect(p, this.arrowR)) this.move(1);
		else if (inRect(p, this.fightBtn) || inRect(p, this.card)) this.confirm();
		else if (p.x < CENTER_X - 60) this.move(-1); // tap a side card to bring it forward
		else if (p.x > CENTER_X + 60) this.move(1);
	};

	nearest = () => {
		const n = ROSTER.length;
		return ((Math.round(this.pos) % n) + n) % n;
	};

	// ---------------------------------------------------------------------------- loop
	update = (time) => {
		this.t += time.secondsPassed;
		if (this.drag?.moved) return; // while dragging, pos is driven by the finger
		// shortest way round the carousel to the selected index
		const n = ROSTER.length;
		let diff = this.index - this.pos;
		diff = ((((diff + n / 2) % n) + n) % n) - n / 2;
		this.pos += diff * Math.min(1, time.secondsPassed * 12);
		if (Math.abs(diff) < 0.001) this.pos = this.index;
		// keep the float bounded
		if (this.pos < 0) this.pos += n;
		if (this.pos >= n) this.pos -= n;
	};

	drawArrow(context, r, dir) {
		const cx = r.x + r.w / 2;
		const cy = r.y + r.h / 2;
		const bob = Math.sin(this.t * 4) * 1.5 * dir;
		context.save();
		context.fillStyle = 'rgba(255,255,255,.12)';
		context.fillRect(r.x, r.y, r.w, r.h);
		context.beginPath();
		context.moveTo(cx + dir * 8 + bob, cy);
		context.lineTo(cx - dir * 7 + bob, cy - 14);
		context.lineTo(cx - dir * 7 + bob, cy + 14);
		context.closePath();
		context.fillStyle = '#ffcc00';
		context.fill();
		context.lineWidth = 2;
		context.strokeStyle = '#3a1200';
		context.stroke();
		context.restore();
	}

	draw = (context) => {
		drawBackdrop(context, this.t);
		outlinedText(context, 'MALTESE FIGHTERS', CENTER_X, 24, 19, '#ffcc00', '#7a0a14');
		outlinedText(context, 'CHOOSE YOUR FIGHTER', CENTER_X, 41, 9, '#b8c4ff', '#0a1030');

		const n = ROSTER.length;
		const items = ROSTER.map((id, i) => {
			let d = i - this.pos;
			d = ((((d + n / 2) % n) + n) % n) - n / 2;
			return { id, i, d };
		}).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)); // far cards first

		for (const { id, d } of items) {
			const k = Math.min(1, Math.abs(d));
			const size = 90 - 38 * k;
			const x = CENTER_X + d * SPACING - size / 2;
			const y = 102 - size / 2 + 8 * k;
			drawPortrait(context, id, x, y, size, {
				dim: 0.55 * k,
				border: k < 0.5 ? '#ffcc00' : '#ffffff55',
			});
		}

		this.drawArrow(context, this.arrowL, -1);
		this.drawArrow(context, this.arrowR, 1);

		const sel = FIGHTER_INFO[ROSTER[this.nearest()]];
		outlinedText(context, sel.label, CENTER_X, 170, 15, '#ffffff', '#12122a');
		outlinedText(context, sel.tag.toUpperCase(), CENTER_X, 181, 7, '#ffcc00', '#12122a', 'center', 700);

		const pulse = (Math.sin(this.t * 5) + 1) / 2;
		drawButton(context, this.fightBtn, 'FIGHT!', { pulse });

		// the chain of opponents
		const others = ROSTER.filter((id) => id !== ROSTER[this.nearest()]);
		outlinedText(context, 'BEAT THEM ALL:', 10, 198, 6.5, '#b8c4ff', '#0a1030', 'left', 700);
		others.forEach((id, i) => {
			drawPortrait(context, id, 10 + i * 24, 202, 18, { border: '#ffffffaa' });
			if (i < others.length - 1) outlinedText(context, '›', 10 + i * 24 + 21, 215, 8, '#ffcc00', '#0a1030');
		});

		outlinedText(
			context,
			this.touch ? 'SWIPE TO CHOOSE  •  TAP FIGHT!' : 'CLICK ARROWS / DRAG  •  A D  •  ENTER',
			SCENE_WIDTH - 10,
			216,
			6.5,
			'#8c98cc',
			'#0a1030',
			'right',
			700
		);
	};
}
