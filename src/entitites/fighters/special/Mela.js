import { FireballState } from '../../../constants/fireball.js';
import { MelaSheet } from '../sheets/mela.js';
import { Fireball } from './Fireball.js';

/** The "MELA!" projectile (replaces the classic fireball). Same speed/damage/collision rules. */
export class Mela extends Fireball {
	constructor(fighter, strength, time, entities) {
		super(fighter, strength, time, entities);

		const kind = fighter.cfg.melaKind;
		this.image = document.getElementById('MelaImage');
		this.spriteScale = MelaSheet.scale;

		const frame = (name) => {
			const { rect, origin } = MelaSheet.frames[`${kind}-${name}`];
			return [[rect, origin], MelaSheet.box, MelaSheet.box];
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
				[`${kind}-hit-1`, 6],
				[`${kind}-hit-2`, 5],
				[`${kind}-hit-3`, 6],
			],
		};
	}
}
