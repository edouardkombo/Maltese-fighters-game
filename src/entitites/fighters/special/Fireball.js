import { resetTransform } from '../../../utils/context.js';
import { SCENE_WIDTH, STAGE_WIDTH } from '../../../constants/Stage.js';
import { DRAW_DEBUG } from '../../../constants/battle.js';
import { FighterAttackType } from '../../../constants/fighter.js';
import {
	FireballCollisionType,
	FireballState,
	fireballVelocity,
} from '../../../constants/fireball.js';
import { FRAME_TIME } from '../../../constants/game.js';
import {
	boxOverlap,
	getActualBoxDimensions,
} from '../../../utils/collisions.js';
import { drawDebugBox } from '../../../utils/fighterDebug.js';

export class Fireball {
	image = null;
	spriteScale = 1;

	animationFrame = 0;
	animationTimer = 0;

	frames = new Map();
	animations = { [FireballState.ACTIVE]: [], [FireballState.COLLIDED]: [] };

	currentState = FireballState.ACTIVE;
	damage = undefined; // undefined = the strength's base damage
	knockback = 1;

	constructor(fighter, strength, time, entities) {
		this.fighter = fighter;
		this.direction = this.fighter.direction;
		this.strength = strength;
		this.velocity = fireballVelocity[strength];
		this.entities = entities;
		this.position = {
			x: this.fighter.position.x + 76 * this.direction,
			y: this.fighter.position.y - 57,
		};
		this.animationTimer = time.previous;
	}

	endFireball = () => {
		this.entities.remove(this);
		this.fighter.fireballInstance = undefined;
	};

	handleCollidedInit = (time, speed = 0.333) => {
		this.velocity *= speed;
		this.currentState = FireballState.COLLIDED;
		this.animationFrame = 0;
		this.animationTimer =
			time.previous +
			this.animations[this.currentState][this.animationFrame][1] * FRAME_TIME;
	};

	updateAnimation = (time) => {
		if (this.animationTimer > time.previous) return;

		this.animationFrame++;

		if (this.animationFrame >= this.animations[this.currentState].length) {
			this.animationFrame = 0;
			if (this.currentState === FireballState.COLLIDED) this.endFireball();
		}
		this.animationTimer =
			time.previous +
			this.animations[this.currentState][this.animationFrame][1] * FRAME_TIME;
	};

	updateMovement = (time, camera) => {
		this.position.x += this.velocity * this.direction * time.secondsPassed;
		if (
			this.position.x - camera.position.x >= SCENE_WIDTH + 56 ||
			this.position.x - camera.position.x <= -56
		) {
			this.endFireball();
		}

		if (this.currentState === FireballState.COLLIDED) return;
		const collided = this.hasFireballCollided(time);
		if (!collided) return;
		if (collided.collisionType === FireballCollisionType.OPPONENT)
			this.handleCollisionWithOpponent(time, collided.hurtArea);
		else this.handleCollisionWithFireball(time, collided.otherFireball);
	};

	handleCollisionWithFireball = (time, otherFireball) => {
		this.handleCollidedInit(time, 0.1);
		otherFireball.handleCollidedInit(time, 0.1);
		this.currentState = FireballState.COLLIDED;
		otherFireball.currentState = FireballState.COLLIDED;
	};

	handleCollisionWithOpponent = (time, hurtArea) => {
		this.handleCollidedInit(time, 0.33);
		this.fighter.opponent.handleAttackHit(
			time,
			this.strength,
			hurtArea,
			FighterAttackType.PUNCH,
			undefined,
			this.damage,
			this.knockback
		);
	};

	hasCollidedWithOtherFireball = (actualFireballDimensions, otherFireball) => {
		const [x, y, width, height] = otherFireball.frames.get(
			otherFireball.animations[otherFireball.currentState][
				otherFireball.animationFrame
			][0]
		)[1];

		const actualOtherFireballDimensions = getActualBoxDimensions(
			otherFireball.position,
			otherFireball.direction,
			{ x, y, width, height }
		);

		if (!boxOverlap(actualFireballDimensions, actualOtherFireballDimensions))
			return false;
		return {
			collisionType: FireballCollisionType.FIREBALL,
			otherFireball,
		};
	};

	hasFireballCollidedWithOpponent = (actualFireballDimensions, opponent) => {
		for (const [hurtArea, dimensions] of Object.entries(opponent.boxes.hurt)) {
			const [x, y, width, height] = dimensions;
			const actualHurtDimensions = getActualBoxDimensions(
				this.fighter.opponent.position,
				this.fighter.opponent.direction,
				{ x, y, width, height }
			);
			if (boxOverlap(actualFireballDimensions, actualHurtDimensions)) {
				return {
					collisionType: FireballCollisionType.OPPONENT,
					hurtArea,
				};
			}
		}
		return false;
	};

	hasFireballCollided = () => {
		var [x, y, width, height] = this.frames.get(
			this.animations[this.currentState][this.animationFrame][0]
		)[1];

		const actualFireballDimensions = getActualBoxDimensions(
			this.position,
			this.direction,
			{ x, y, width, height }
		);
		//Other Fireballs
		for (const entity of this.entities.entitiesList) {
			// a fighter's own projectiles never cancel each other (pastizzi fly in groups)
			if (
				entity instanceof Fireball &&
				entity !== this &&
				entity.fighter !== this.fighter &&
				entity.currentState !== FireballState.COLLIDED
			) {
				const hasCollidedWithOtherFireball = this.hasCollidedWithOtherFireball(
					actualFireballDimensions,
					entity
				);
				if (hasCollidedWithOtherFireball) return hasCollidedWithOtherFireball;
			}
		}

		const hasCollidedWithOpponent = this.hasFireballCollidedWithOpponent(
			actualFireballDimensions,
			this.fighter.opponent
		);
		if (hasCollidedWithOpponent) return hasCollidedWithOpponent;
	};

	update = (time, camera) => {
		this.updateAnimation(time);
		this.updateMovement(time, camera);
	};

	drawFireball = (context, camera) => {
		const frameKey = this.animations[this.currentState][this.animationFrame][0];

		const [[[x, y, width, height], [originX, originY]]] =
			this.frames.get(frameKey);

		const k = this.spriteScale || 1;
		context.scale(this.direction, 1);
		context.imageSmoothingEnabled = k > 1;
		context.imageSmoothingQuality = 'high';
		context.drawImage(
			this.image,
			x,
			y,
			width,
			height,
			Math.floor(this.position.x - camera.position.x) * this.direction -
				originX / k,
			Math.floor(this.position.y - camera.position.y) - originY / k,
			width / k,
			height / k
		);
		context.imageSmoothingEnabled = false;

		resetTransform(context);
	};

	draw = (context, camera) => {
		this.drawFireball(context, camera);

		DRAW_DEBUG &&
			drawDebugBox(
				context,
				camera,
				this.position,
				this.direction,
				this.frames.get(
					this.animations[this.currentState][this.animationFrame][0]
				)[1],
				'#ff0000'
			);
	};
}
