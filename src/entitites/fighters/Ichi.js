import { FighterState } from '../../constants/fighter.js';
import { SpecialKind } from '../../constants/specials.js';
import { MalteseFighter } from './MalteseFighter.js';
import { LouSheet } from './sheets/lou.js';
import { FoxFire } from './special/FoxFire.js';
import { drawIchi } from './IchiArt.js';

const S = FighterState;
const PUNCHES = new Set([S.LIGHT_PUNCH, S.MEDIUM_PUNCH, S.HEAVY_PUNCH]);
const KICKS = new Set([S.LIGHT_KICK, S.MEDIUM_KICK, S.HEAVY_KICK]);
const HURT = new Set([S.HURT_HEAD_LIGHT, S.HURT_HEAD_MEDIUM, S.HURT_HEAD_HEAVY, S.HURT_BODY_LIGHT, S.HURT_BODY_MEDIUM, S.HURT_BODY_HEAVY]);
const SPECIAL = new Set([S.SPECIAL_1_LIGHT, S.SPECIAL_1_MEDIUM, S.SPECIAL_1_HEAVY, S.SPECIAL_PASTIZZI, S.SPECIAL_UWEJJA, S.SPECIAL_PLANE]);

/**
 * ICHI - Lou's fire-fox spirit. Drawn in code (IchiArt.js) instead of a sprite sheet.
 * Same moveset and hit boxes as everybody else, but the spirit is quicker on its feet,
 * floats higher when it jumps and throws blue fox-fire instead of the MELA orb.
 */
export class Ichi extends MalteseFighter {
	constructor(playerId, onAttackHit, entityList) {
		super(playerId, onAttackHit, entityList, {
			imageId: 'LouImage', // only used for the frame / hit-box layout, never drawn
			sheet: LouSheet,
			Projectile: FoxFire,
			melaKind: 'lou',
			voice: { pitch: 1.35, rate: 1.1 },
			special: {
				[SpecialKind.MELA]: 'FOX FIRE',
				[SpecialKind.PASTIZZI]: 'SPIRIT PASTIZZI',
				[SpecialKind.UWEJJA]: 'SPIRIT HOWL',
				[SpecialKind.RICOTTA]: 'NINE LIVES',
				[SpecialKind.PLANE]: 'SPIRIT FLIGHT',
			},
		});
		// a spirit: quicker steps, floatier jumps
		this.initialVelocity = {
			...this.initialVelocity,
			x: {
				...this.initialVelocity.x,
				[S.WALK_FORWARD]: 3.5 * 60,
				[S.WALK_BACKWARD]: -(2.5 * 60),
				[S.JUMP_FORWARD]: 190,
				[S.JUMP_BACKWARD]: -200,
			},
			jump: -440,
		};
		this.gravity = 900;
	}

	pose() {
		const s = this.currentState;
		const t = this.lastTime / 1000;
		const anim = this.animations[s];
		const progress = this.animationFrame / Math.max(1, anim.length - 1);
		const hit = this.boxes.hit;
		const striking = hit && hit.width > 0;
		const target = striking ? { x: hit.x + hit.width * 0.85, y: hit.y + hit.height / 2, fire: 1 } : null;
		const p = { t, bob: Math.sin(t * 4) * 1.5, lean: 0, mood: 'fierce', aura: 0.5 };

		if (s === S.WALK_FORWARD || s === S.WALK_BACKWARD) {
			p.stride = Math.sin(t * 12);
			p.lean = s === S.WALK_FORWARD ? 3 : -3;
		} else if (s === S.JUMP_START || s === S.JUMP_LAND) {
			p.crouch = 0.5;
		} else if (s === S.JUMP_UP) {
			p.airborne = 1;
		} else if (s === S.JUMP_FORWARD || s === S.JUMP_BACKWARD) {
			p.airborne = 1;
			const k = Math.min(1, Math.max(0, (this.animationFrame - 1) / 5));
			p.spin = (s === S.JUMP_FORWARD ? 1 : -1) * k * Math.PI * 2;
		} else if (s === S.CROUCH || s === S.CROUCH_TURN) {
			p.crouch = 1;
		} else if (s === S.CROUCH_DOWN) {
			p.crouch = Math.min(1, progress * 1.5);
		} else if (s === S.CROUCH_UP) {
			p.crouch = 1 - progress;
		} else if (PUNCHES.has(s)) {
			p.lean = 4;
			p.arm = target || { x: 4, y: -58, fire: 0 };
			p.aura = striking ? 1 : 0.6;
		} else if (KICKS.has(s)) {
			p.lean = -3;
			p.kick = target;
			p.aura = striking ? 1 : 0.6;
		} else if (HURT.has(s)) {
			p.lean = -7;
			p.mood = 'hurt';
			p.headTilt = -0.35;
			p.aura = 0.25;
		} else if (s === S.SPECIAL_RICOTTA || s === S.VICTORY) {
			p.armsUp = true;
			p.mood = 'happy';
			p.aura = 1;
			if (s === S.VICTORY) p.bob = -Math.abs(Math.sin(t * 6)) * 6;
		} else if (SPECIAL.has(s)) {
			p.mood = 'roar';
			p.aura = 1;
			p.lean = 4;
			p.arm = { x: 30, y: -62, fire: this.animationFrame >= 3 ? 1 : 0.35 };
		} else if (s === S.KO) {
			p.ko = Math.min(1, this.animationFrame / 2);
			p.mood = 'ko';
			p.aura = 0.1;
			p.bob = 0;
		}
		return p;
	}

	drawBody = (context, camera) => {
		context.save();
		context.translate(
			Math.floor(this.position.x - camera.position.x) - this.hurtShake,
			Math.floor(this.position.y - camera.position.y)
		);
		context.scale(this.direction, 1);
		drawIchi(context, this.pose());
		context.restore();
	};
}
