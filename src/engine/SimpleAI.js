import { Control } from '../constants/controls.js';
import { FighterDirection, FighterState } from '../constants/fighter.js';
import { HEALTH_MAX_HIT_POINTS } from '../constants/battle.js';
import { SpecialKind } from '../constants/specials.js';
import { gameState } from '../states/gameState.js';

const SUPER_CONTROL = {
	[SpecialKind.MELA]: Control.SPECIAL_MELA,
	[SpecialKind.PASTIZZI]: Control.SPECIAL_PASTIZZI,
	[SpecialKind.UWEJJA]: Control.SPECIAL_UWEJJA,
	[SpecialKind.RICOTTA]: Control.SPECIAL_RICOTTA,
};

/**
 * CPU opponent for player index 1. It "presses" controls through the same input path as a human
 * (see setAIHeld in InputHandler), including the real MELA! motion (down, down-forward, forward + punch).
 *
 * Difficulty is data: one entry per stage. Everything is expressed in frames (60 fps).
 */
export const AI_LEVELS = [
	// stage 1 - already sharper than the original dummy AI
	{ think: [16, 34], aggression: 0.62, special: 0.16, antiAir: 0.55, retreat: 0.28, combo: 0.35, heavy: 0.18 },
	// stage 2
	{ think: [10, 24], aggression: 0.74, special: 0.22, antiAir: 0.72, retreat: 0.36, combo: 0.5, heavy: 0.24 },
	// stage 3+
	{ think: [6, 16], aggression: 0.85, special: 0.28, antiAir: 0.85, retreat: 0.45, combo: 0.65, heavy: 0.3 },
];

const ATTACK_STATES = new Set([
	FighterState.LIGHT_PUNCH,
	FighterState.MEDIUM_PUNCH,
	FighterState.HEAVY_PUNCH,
	FighterState.LIGHT_KICK,
	FighterState.MEDIUM_KICK,
	FighterState.HEAVY_KICK,
]);
const AIRBORNE = new Set([
	FighterState.JUMP_UP,
	FighterState.JUMP_FORWARD,
	FighterState.JUMP_BACKWARD,
]);
const HURT = new Set([
	FighterState.HURT_HEAD_LIGHT,
	FighterState.HURT_HEAD_MEDIUM,
	FighterState.HURT_HEAD_HEAVY,
	FighterState.HURT_BODY_LIGHT,
	FighterState.HURT_BODY_MEDIUM,
	FighterState.HURT_BODY_HEAVY,
]);

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

export class SimpleAI {
	constructor(fighter, opponent, level = 0) {
		this.fighter = fighter;
		this.opponent = opponent;
		this.cfg = AI_LEVELS[Math.min(level, AI_LEVELS.length - 1)];
		this.cooldown = rnd(...this.cfg.think);
		this.queue = []; // [{ keys:Set, frames:n }]
		this.step = null;
		this.walk = null; // { key, frames }
	}

	say(...keys) {
		return new Set(keys);
	}

	enqueueSpecial(forward, punch) {
		const F = forward;
		this.queue = [
			{ keys: [Control.DOWN], frames: 4 },
			{ keys: [Control.DOWN, F], frames: 4 },
			{ keys: [F], frames: 4 },
			{ keys: [F, punch], frames: 4 },
		];
	}

	/** Press a one-touch super power if it is off cooldown. */
	trySuper(kind) {
		if (this.fighter.cooldownLeft?.(kind) !== 0) return false;
		this.queue = [{ keys: [SUPER_CONTROL[kind]], frames: 2 }];
		return true;
	}

	decide(dist, toward, away, forward) {
		const c = this.cfg;
		const opp = this.opponent;
		const oppState = opp.currentState;
		const r = Math.random();

		// 0. low on health and safe at range: eat a ricotta
		const myHp = gameState.fighters[this.fighter.playerId]?.hitPoints ?? HEALTH_MAX_HIT_POINTS;
		if (myHp < HEALTH_MAX_HIT_POINTS * 0.4 && dist > 120 && r < c.special * 2 && this.trySuper(SpecialKind.RICOTTA)) return;
		// 1. punish jumps with a heavy punch (anti-air) - or pastizzi if they jump from far
		if (AIRBORNE.has(oppState) && dist >= 95 && r < c.special && this.trySuper(SpecialKind.PASTIZZI)) return;
		if (AIRBORNE.has(oppState) && dist < 95 && r < c.antiAir) {
			this.queue = [{ keys: [Control.HEAVY_PUNCH], frames: 2 }];
			return;
		}
		// 2. the player is mid-attack and close: back off (or crouch) so the hit whiffs, then punish
		if (ATTACK_STATES.has(oppState) && dist < 80 && r < c.retreat) {
			this.walk = { key: away, frames: rnd(10, 18) };
			if (Math.random() < 0.5)
				this.queue = [
					{ keys: [], frames: rnd(8, 14) },
					{ keys: [Control.MEDIUM_KICK], frames: 2 },
				];
			return;
		}
		// 3. far away: throw a MELA! or close the distance
		if (dist > 110) {
			if (r < c.special) {
				if (Math.random() < 0.35 && this.trySuper(SpecialKind.PASTIZZI)) return;
				const punch = [Control.LIGHT_PUNCH, Control.MEDIUM_PUNCH, Control.HEAVY_PUNCH][rnd(0, 2)];
				if (this.fighter.cooldownLeft?.(SpecialKind.MELA) === 0) this.enqueueSpecial(forward, punch);
				else this.walk = { key: toward, frames: rnd(10, 20) };
			} else if (r < c.special + 0.1) {
				this.queue = [{ keys: [Control.UP, toward], frames: 3 }]; // jump in
			} else {
				this.walk = { key: toward, frames: rnd(14, 34) };
			}
			return;
		}
		// 4. mid range: poke or step in
		if (dist > 62) {
			if (r < c.aggression * 0.55) {
				this.queue = [{ keys: [[Control.MEDIUM_KICK, Control.HEAVY_KICK, Control.MEDIUM_PUNCH][rnd(0, 2)]], frames: 2 }];
			} else if (r < 0.8) {
				this.walk = { key: toward, frames: rnd(8, 16) };
			} else if (r < 0.88) {
				this.enqueueSpecial(forward, Control.MEDIUM_PUNCH);
			} else {
				this.walk = { key: away, frames: rnd(6, 12) };
			}
			return;
		}
		// 5. close range: combos / mix-ups (and the UWEJJA shockwave)
		if (r < c.special * 0.7 && this.trySuper(SpecialKind.UWEJJA)) return;
		if (r < c.aggression) {
			if (Math.random() < c.combo) {
				this.queue = [
					{ keys: [Control.LIGHT_PUNCH], frames: 2 },
					{ keys: [], frames: 9 },
					{ keys: [Math.random() < c.heavy ? Control.HEAVY_PUNCH : Control.MEDIUM_PUNCH], frames: 2 },
				];
			} else {
				const pool = [Control.LIGHT_PUNCH, Control.LIGHT_KICK, Control.MEDIUM_KICK, Control.HEAVY_PUNCH];
				this.queue = [{ keys: [pool[rnd(0, pool.length - 1)]], frames: 2 }];
			}
		} else if (r < c.aggression + 0.12) {
			this.queue = [{ keys: [Control.DOWN, Control.HEAVY_KICK], frames: 2 }]; // low attack
		} else {
			this.walk = { key: away, frames: rnd(8, 16) };
		}
	}

	/** Returns the set of Controls to treat as held this frame. */
	getHeldControls() {
		const held = new Set();
		const f = this.fighter;
		const opp = this.opponent;
		if (!f || !opp) return held;
		if (f.currentState === FighterState.KO || opp.currentState === FighterState.KO) {
			this.queue = [];
			return held;
		}
		// stunned: wait it out
		if (HURT.has(f.currentState)) {
			this.queue = [];
			this.walk = null;
			return held;
		}

		const dx = opp.position.x - f.position.x;
		const dist = Math.abs(dx);
		const toward = dx >= 0 ? Control.RIGHT : Control.LEFT;
		const away = dx >= 0 ? Control.LEFT : Control.RIGHT;
		const forward = f.direction === FighterDirection.RIGHT ? Control.RIGHT : Control.LEFT;

		// running a scripted sequence (special motion, combo...)
		if (!this.step && this.queue.length) this.step = { ...this.queue.shift() };
		if (this.step) {
			this.step.keys.forEach((k) => held.add(k));
			if (--this.step.frames <= 0) this.step = null;
			return held;
		}

		if (this.walk) {
			held.add(this.walk.key);
			if (--this.walk.frames <= 0) this.walk = null;
			return held;
		}

		if (--this.cooldown > 0) return held;
		this.cooldown = rnd(...this.cfg.think);
		this.decide(dist, toward, away, forward);
		return held;
	}
}
