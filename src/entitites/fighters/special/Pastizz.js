import { FireballState } from '../../../constants/fireball.js';
import { STAGE_FLOOR } from '../../../constants/Stage.js';
import { VectorProjectile } from './VectorProjectile.js';

const THROWS = [
	{ vx: 105, vy: -270 },
	{ vx: 160, vy: -235 },
	{ vx: 225, vy: -190 },
];
const GRAVITY = 640;

/** PASTIZZI! - three hot pastizzi lobbed in arcs. Light damage each, they splat on the floor. */
export class Pastizz extends VectorProjectile {
	damage = 9;
	knockback = 0.6;

	constructor(fighter, strength, time, index, entities) {
		super(fighter, strength, time, entities, [-7, -6, 14, 12], 2, 3);
		const t = THROWS[index % THROWS.length];
		this.vx = t.vx;
		this.vy = t.vy;
		this.spin = index * 0.7;
		this.position = {
			x: fighter.position.x + 28 * this.direction,
			y: fighter.position.y - 74,
		};
	}

	handleCollidedInit = (time) => {
		this.currentState = FireballState.COLLIDED;
		this.vx *= 0.15;
		this.vy = 0;
		this.animationFrame = 0;
		this.animationTimer = time.previous + this.animations[this.currentState][0][1] * (1000 / 60);
	};

	updateMovement = (time, camera) => {
		const dt = time.secondsPassed;
		this.age += dt;
		this.position.x += this.vx * this.direction * dt;
		if (this.currentState === FireballState.ACTIVE) {
			this.vy += GRAVITY * dt;
			this.position.y += this.vy * dt;
			this.spin += dt * 9;
			if (this.position.y >= STAGE_FLOOR - 4) {
				this.position.y = STAGE_FLOOR - 4;
				this.handleCollidedInit(time);
			}
		}
		if (this.isOffScreen(camera)) {
			this.endFireball();
			return;
		}
		this.checkCollisions(time);
	};

	drawFireball = (context, camera) => {
		const { x, y } = this.screenPos(camera);
		context.save();
		context.translate(x, y);
		if (this.currentState === FireballState.COLLIDED) {
			// golden crumbs + a little ricotta splat
			const p = this.hitProgress();
			context.globalAlpha = 1 - p * 0.8;
			for (let i = 0; i < 7; i++) {
				const a = (i / 7) * Math.PI * 2 + this.spin;
				const r = 3 + p * 12;
				context.fillStyle = i % 3 === 0 ? '#fffbe8' : '#e8a640';
				context.beginPath();
				context.arc(Math.cos(a) * r, Math.sin(a) * r * 0.7 - p * 4, 1.6 - p, 0, Math.PI * 2);
				context.fill();
			}
			context.restore();
			return;
		}
		context.rotate(this.spin * this.direction);
		// steam trail
		context.globalAlpha = 0.35;
		context.fillStyle = '#ffffff';
		context.beginPath();
		context.arc(-9 * this.direction, 0, 2.5, 0, Math.PI * 2);
		context.arc(-14 * this.direction, 1, 1.6, 0, Math.PI * 2);
		context.fill();
		context.globalAlpha = 1;
		// the diamond-shaped flaky pastry
		const g = context.createLinearGradient(0, -6, 0, 6);
		g.addColorStop(0, '#ffd77a');
		g.addColorStop(0.5, '#e9a23b');
		g.addColorStop(1, '#b86a1e');
		context.fillStyle = g;
		context.strokeStyle = '#7a3e0c';
		context.lineWidth = 0.8;
		context.beginPath();
		context.moveTo(-8, 0);
		context.quadraticCurveTo(-3, -6.5, 0, -6);
		context.quadraticCurveTo(3, -6.5, 8, 0);
		context.quadraticCurveTo(3, 6.5, 0, 6);
		context.quadraticCurveTo(-3, 6.5, -8, 0);
		context.closePath();
		context.fill();
		context.stroke();
		// flaky layers
		context.strokeStyle = 'rgba(255,240,190,.8)';
		context.lineWidth = 0.6;
		for (const k of [-3.5, 0, 3.5]) {
			context.beginPath();
			context.moveTo(k - 2, -3.5);
			context.quadraticCurveTo(k + 1, 0, k - 2, 3.5);
			context.stroke();
		}
		// ricotta peeking out of the top seam
		context.fillStyle = '#fffdf2';
		context.beginPath();
		context.ellipse(0, -5.2, 2.6, 1.2, 0, 0, Math.PI * 2);
		context.fill();
		context.restore();
	};
}
