import { FighterState } from '../../constants/fighter.js';
import { Ken } from './Ken.js';
import { LouSheet } from './LouFrames.js';
import { LouFood, LOU_SPECIAL_NAMES } from './special/LouFood.js';

/**
 * Lou plays exactly like Ken (same states, animation timings, push/hurt boxes,
 * controls and special-move input) - only the artwork and the projectiles differ.
 *
 * Every frame key that Ken has also exists in Lou.png (see tools/make_lou_sprites.py),
 * so we re-point each of Ken's frames at Lou's sprite cell and swap in the attack
 * hit-boxes measured from Lou's own poses.
 *
 * Special move (down, down-forward, forward + punch) throws Maltese food:
 *   light punch  -> Pastizz   medium punch -> Ricotta   heavy punch -> Kinnie
 */
export class Lou extends Ken {
	callout = null;

	constructor(playerId, onAttackHit, entityList) {
		super(playerId, onAttackHit, entityList);

		this.image = document.getElementById('LouImage');

		const frames = new Map();
		for (const [key, kenFrame] of this.frames) {
			const [, pushBox, hurtBoxes, kenHitBox] = kenFrame;
			const sheet = LouSheet[key];
			if (!sheet) {
				console.warn(`Lou: no sprite for frame "${key}"`);
				frames.set(key, kenFrame);
				continue;
			}
			const entry = [[sheet.rect, sheet.origin], pushBox, hurtBoxes];
			if (kenHitBox) entry.push(sheet.hit ?? kenHitBox);
			frames.set(key, entry);
		}
		this.frames = frames;
		this.setAnimationFrame(0, { previous: 0 });

		// --- Maltese special move -------------------------------------------------
		this.handleMalteseSpecial = (time) => {
			const { attackStrength } = this.states[this.currentState];
			if (this.animationFrame === 3 && !this.fireballFired) {
				this.entityList.add(LouFood, this, attackStrength, time);
				this.fireballFired = true;
				this.callout = { text: LOU_SPECIAL_NAMES[attackStrength], age: 0 };
			}
			if (!this.isAnimationCompleted()) return;
			this.fireballFired = false;
			this.changeState(FighterState.IDLE, time);
		};
		for (const state of [
			FighterState.SPECIAL_1_LIGHT,
			FighterState.SPECIAL_1_MEDIUM,
			FighterState.SPECIAL_1_HEAVY,
		]) {
			this.states[state].update = this.handleMalteseSpecial;
		}

		// --- floating shout above Lou's head while the special flies ----------------
		const baseUpdate = this.update;
		this.update = (time, camera) => {
			baseUpdate(time, camera);
			if (this.callout) {
				this.callout.age += time.secondsPassed;
				if (this.callout.age > 1.1) this.callout = null;
			}
		};

		const baseDraw = this.draw;
		this.draw = (context, camera) => {
			baseDraw(context, camera);
			if (!this.callout) return;
			const x = Math.floor(this.position.x - camera.position.x);
			const y = Math.floor(this.position.y - camera.position.y) - 104 - this.callout.age * 12;
			context.save();
			context.font = 'bold 9px monospace';
			context.textAlign = 'center';
			context.lineWidth = 3;
			context.strokeStyle = '#2a0a0a';
			context.strokeText(this.callout.text, x, y);
			context.fillStyle = this.callout.age % 0.2 < 0.1 ? '#ffe040' : '#ffffff';
			context.fillText(this.callout.text, x, y);
			context.restore();
		};
	}
}
