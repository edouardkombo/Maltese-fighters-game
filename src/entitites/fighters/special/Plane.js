import { FireballState } from '../../../constants/fireball.js';
import { SPECIALS, SpecialKind } from '../../../constants/specials.js';
import { FighterAttackType } from '../../../constants/fighter.js';
import { VectorProjectile } from './VectorProjectile.js';

const SPEED = 250;

/** GO BACK TO YOUR COUNTRY! - a little red-and-white airliner thrown at the opponent. The biggest hit in the game. */
export class Plane extends VectorProjectile {
	damage = SPECIALS[SpecialKind.PLANE].damage;
	knockback = 2.6;

	constructor(fighter, strength, time, entities) {
		super(fighter, strength, time, entities, [-20, -9, 40, 18], 2, 3);
		this.position = {
			x: fighter.position.x + 40 * this.direction,
			y: fighter.position.y - 64,
		};
	}

	// it lands like any other blow (same hit flash as punches and kicks), then is gone
	handleCollisionWithOpponent = (time, hurtArea) => {
		this.fighter.opponent.handleAttackHit(
			time,
			this.strength,
			hurtArea,
			FighterAttackType.PUNCH,
			{ x: this.position.x + 14 * this.direction, y: this.position.y },
			this.damage,
			this.knockback
		);
		this.endFireball();
	};

	// a plane is too big to be stopped: it blows straight through other projectiles
	handleCollisionWithFireball = (time, other) => {
		other.handleCollidedInit(time, 0.1);
		other.currentState = FireballState.COLLIDED;
	};

	updateMovement = (time, camera) => {
		const dt = time.secondsPassed;
		this.age += dt;
		const speed = this.currentState === FireballState.ACTIVE ? SPEED : SPEED * 0.15;
		this.position.x += speed * this.direction * dt;
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
			// puff of smoke + a few stars
			const p = this.hitProgress();
			context.globalAlpha = 1 - p * 0.9;
			for (let i = 0; i < 6; i++) {
				const a = (i / 6) * Math.PI * 2;
				context.fillStyle = i % 2 ? '#ffffff' : '#c8ccd4';
				context.beginPath();
				context.arc(Math.cos(a) * (6 + p * 16), Math.sin(a) * (4 + p * 10), 5 - p * 2, 0, Math.PI * 2);
				context.fill();
			}
			context.fillStyle = '#ffd23a';
			for (let i = 0; i < 4; i++) context.fillRect(Math.cos(i * 1.7) * (10 + p * 20), Math.sin(i * 1.7) * (8 + p * 12), 2, 2);
			context.restore();
			return;
		}
		context.scale(this.direction, 1);
		context.rotate(Math.sin(this.age * 9) * 0.06);
		// speed lines
		context.strokeStyle = 'rgba(255,255,255,.7)';
		context.lineWidth = 1;
		for (const [dy, len] of [[-5, 14], [0, 20], [5, 12]]) {
			context.beginPath();
			context.moveTo(-26 - ((this.age * 160) % 8), dy);
			context.lineTo(-26 - len, dy);
			context.stroke();
		}
		// tail fin (red with a white Maltese cross)
		context.fillStyle = '#cf142b';
		context.beginPath();
		context.moveTo(-20, -2);
		context.lineTo(-26, -15);
		context.lineTo(-19, -15);
		context.lineTo(-11, -2);
		context.fill();
		context.fillStyle = '#ffffff';
		context.fillRect(-21.5, -12, 3, 1);
		context.fillRect(-20.5, -13, 1, 3);
		// fuselage
		const g = context.createLinearGradient(0, -6, 0, 6);
		g.addColorStop(0, '#ffffff');
		g.addColorStop(1, '#c4cad4');
		context.fillStyle = g;
		context.beginPath();
		context.moveTo(-22, -3);
		context.lineTo(14, -4.5);
		context.quadraticCurveTo(24, -3, 24, 0.5);
		context.quadraticCurveTo(22, 4, 14, 4);
		context.lineTo(-20, 3);
		context.closePath();
		context.fill();
		context.strokeStyle = '#5a6070';
		context.lineWidth = 0.6;
		context.stroke();
		// red stripe + windows + cockpit
		context.fillStyle = '#cf142b';
		context.fillRect(-18, 1, 34, 1.2);
		context.fillStyle = '#2a4a7a';
		for (let i = 0; i < 7; i++) context.fillRect(-14 + i * 4, -2.2, 1.6, 1.6);
		context.beginPath();
		context.moveTo(17, -3.2);
		context.lineTo(21.5, -2.2);
		context.lineTo(18, -1);
		context.fill();
		// wing
		context.fillStyle = '#d9dde4';
		context.beginPath();
		context.moveTo(-2, 1);
		context.lineTo(-10, 10);
		context.lineTo(-5, 10);
		context.lineTo(6, 1);
		context.fill();
		context.stroke();
		context.restore();
	};
}
