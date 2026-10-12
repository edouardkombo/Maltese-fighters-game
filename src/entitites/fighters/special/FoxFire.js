import { FireballState } from '../../../constants/fireball.js';
import { VectorProjectile } from './VectorProjectile.js';

/** Ichi's MELA: a blue-cored spirit fox-fire with a flaming tail. Same speed / damage as the MELA orb. */
export class FoxFire extends VectorProjectile {
	constructor(fighter, strength, time, entities) {
		super(fighter, strength, time, entities, [-13, -12, 26, 24], 2, 3);
	}

	update = (time, camera) => {
		this.age += time.secondsPassed;
		this.updateAnimation(time);
		this.updateMovement(time, camera);
	};

	drawFireball = (context, camera) => {
		const { x, y } = this.screenPos(camera);
		const hit = this.currentState === FireballState.COLLIDED;
		const p = hit ? this.hitProgress() : 0;
		context.save();
		context.translate(x, y);
		context.scale(this.direction, 1);
		context.globalCompositeOperation = 'lighter';
		// flame trail
		if (!hit) {
			for (let i = 0; i < 6; i++) {
				const k = i / 6;
				const wob = Math.sin(this.age * 30 + i) * 2;
				context.fillStyle = `rgba(255,${120 - i * 12},20,${0.5 - k * 0.45})`;
				context.beginPath();
				context.arc(-8 - i * 5, wob * k, 9 - i * 1.2, 0, Math.PI * 2);
				context.fill();
			}
		}
		const r = 11 + p * 14;
		const g = context.createRadialGradient(0, 0, 1, 0, 0, r);
		g.addColorStop(0, `rgba(235,250,255,${1 - p})`);
		g.addColorStop(0.35, `rgba(90,190,255,${0.95 - p})`);
		g.addColorStop(0.7, `rgba(255,120,30,${0.8 - p * 0.8})`);
		g.addColorStop(1, 'rgba(255,40,0,0)');
		context.fillStyle = g;
		context.beginPath();
		context.arc(0, 0, r, 0, Math.PI * 2);
		context.fill();
		// flickering fox-fire tongues
		for (let i = 0; i < 5; i++) {
			const a = this.age * 14 + (i * Math.PI * 2) / 5;
			context.fillStyle = `rgba(160,220,255,${0.6 * (1 - p)})`;
			context.beginPath();
			context.arc(Math.cos(a) * 7, Math.sin(a) * 7, 2.2, 0, Math.PI * 2);
			context.fill();
		}
		context.restore();
	};
}
