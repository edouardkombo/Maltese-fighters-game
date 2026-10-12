import { FireballState } from '../../../constants/fireball.js';
import { SPECIALS, SpecialKind } from '../../../constants/specials.js';
import { VectorProjectile } from './VectorProjectile.js';

const SPEED = 330;
const LIFE = 0.32; // seconds -> about 100 px of reach

/**
 * UWEJJA! - a shouted shockwave. Short range, heavy damage, huge knock-back.
 * It plows through enemy projectiles instead of being cancelled by them.
 */
export class Uwejja extends VectorProjectile {
	damage = SPECIALS[SpecialKind.UWEJJA].damage;
	knockback = 2.2;

	constructor(fighter, strength, time, entities) {
		super(fighter, strength, time, entities, [-10, -92, 30, 90], 2, 2);
		this.position = {
			x: fighter.position.x + 30 * this.direction,
			y: fighter.position.y,
		};
	}

	handleCollisionWithFireball = (time, other) => {
		other.handleCollidedInit(time, 0.1);
		other.currentState = FireballState.COLLIDED;
	};

	updateMovement = (time, camera) => {
		const dt = time.secondsPassed;
		this.age += dt;
		const speed = this.currentState === FireballState.ACTIVE ? SPEED : SPEED * 0.2;
		this.position.x += speed * this.direction * dt;
		if (this.age > LIFE + 0.15 || this.isOffScreen(camera)) {
			this.endFireball();
			return;
		}
		if (this.age > LIFE) return; // fading out, no longer dangerous
		this.checkCollisions(time);
	};

	drawFireball = (context, camera) => {
		const { x, y } = this.screenPos(camera);
		const fade = this.age > LIFE ? 1 - (this.age - LIFE) / 0.15 : 1;
		context.save();
		context.translate(x, y - 46);
		context.scale(this.direction, 1);
		context.lineCap = 'round';
		for (let i = 0; i < 4; i++) {
			const r = 12 + i * 9 + this.age * 40;
			context.globalAlpha = Math.max(0, fade * (0.9 - i * 0.18));
			context.strokeStyle = i % 2 ? '#ffffff' : '#5ad0ff';
			context.lineWidth = 3.2 - i * 0.5;
			context.beginPath();
			context.arc(-r * 0.6, 0, r, -0.85, 0.85);
			context.stroke();
		}
		// sound-wave letters
		context.globalAlpha = Math.max(0, fade);
		context.font = '900 9px "Arial Black", Impact, sans-serif';
		context.textAlign = 'center';
		context.lineWidth = 2.5;
		context.strokeStyle = '#06324a';
		context.fillStyle = '#e8fbff';
		context.strokeText('!!', 6, 4);
		context.fillText('!!', 6, 4);
		context.restore();
	};
}
