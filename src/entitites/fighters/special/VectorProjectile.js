import { FireballCollisionType, FireballState } from '../../../constants/fireball.js';
import { SCENE_WIDTH } from '../../../constants/Stage.js';
import { Fireball } from './Fireball.js';

/**
 * A projectile drawn with canvas paths instead of a sprite sheet. It keeps the Fireball data layout
 * (frames / animations / hit box) so collisions with other projectiles keep working.
 */
export class VectorProjectile extends Fireball {
	age = 0;

	constructor(fighter, strength, time, entities, box, flyFrames = 2, hitFrames = 3) {
		super(fighter, strength, time, entities);
		const entry = [[[0, 0, 1, 1], [0, 0]], box, box];
		this.frames = new Map([
			['fly', entry],
			['hit', entry],
		]);
		this.animations = {
			[FireballState.ACTIVE]: Array.from({ length: flyFrames }, () => ['fly', 5]),
			[FireballState.COLLIDED]: Array.from({ length: hitFrames }, () => ['hit', 6]),
		};
	}

	isOffScreen = (camera) =>
		this.position.x - camera.position.x >= SCENE_WIDTH + 56 ||
		this.position.x - camera.position.x <= -56;

	/** Shared collision handling for subclasses that move themselves. */
	checkCollisions = (time) => {
		if (this.currentState === FireballState.COLLIDED) return;
		const collided = this.hasFireballCollided(time);
		if (!collided) return;
		if (collided.collisionType === FireballCollisionType.OPPONENT)
			this.handleCollisionWithOpponent(time, collided.hurtArea);
		else this.handleCollisionWithFireball(time, collided.otherFireball);
	};

	/** Progress (0..1) through the collided animation, for fade-outs. */
	hitProgress = () => {
		const frames = this.animations[FireballState.COLLIDED].length;
		return Math.min(1, (this.animationFrame + 0.5) / frames);
	};

	screenPos = (camera) => ({
		x: this.position.x - camera.position.x,
		y: this.position.y - camera.position.y,
	});
}
