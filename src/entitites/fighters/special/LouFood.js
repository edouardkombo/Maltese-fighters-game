import { FighterAttackStrength } from '../../../constants/fighter.js';
import { FireballState } from '../../../constants/fireball.js';
import { LouFoodSheet as LouSheetFood } from '../LouFoodFrames.js';
import { Fireball } from './Fireball.js';

// Lou's Maltese "super powers": light = Pastizz, medium = Ricotta, heavy = Kinnie.
// They behave exactly like Ken's fireball (speed, damage, collisions) - only the art differs.
const FOOD = {
	[FighterAttackStrength.LIGHT]: 'pastizz',
	[FighterAttackStrength.MEDIUM]: 'ricotta',
	[FighterAttackStrength.HEAVY]: 'kinnie',
};

export const LOU_SPECIAL_NAMES = {
	[FighterAttackStrength.LIGHT]: 'PASTIZZ ATTACK!',
	[FighterAttackStrength.MEDIUM]: 'RICOTTA BOMB!',
	[FighterAttackStrength.HEAVY]: 'KINNIE BLAST!',
};

export class LouFood extends Fireball {
	constructor(fighter, strength, time, entities) {
		super(fighter, strength, time, entities);

		const kind = FOOD[strength] ?? 'pastizz';
		this.kind = kind;
		this.image = document.getElementById('LouFoodImage');

		const box = LouSheetFood[`${kind}-box`];
		const frame = (name) => {
			const { rect, origin } = LouSheetFood[`${kind}-${name}`];
			return [[rect, origin], box, box];
		};
		this.frames = new Map(
			['fly-1', 'fly-2', 'hit-1', 'hit-2', 'hit-3'].map((n) => [`${kind}-${n}`, frame(n)])
		);
		this.animations = {
			[FireballState.ACTIVE]: [
				[`${kind}-fly-1`, 5],
				[`${kind}-fly-2`, 5],
			],
			[FireballState.COLLIDED]: [
				[`${kind}-hit-1`, 8],
				[`${kind}-hit-2`, 5],
				[`${kind}-hit-3`, 6],
			],
		};
	}
}
