import { FighterAttackStrength } from '../../constants/fighter.js';
import { MalteseFighter } from './MalteseFighter.js';
import { GanniSheet } from './sheets/ganni.js';
import { Mela } from './special/Mela.js';


export class Ganni extends MalteseFighter {
	constructor(playerId, onAttackHit, entityList) {
		super(playerId, onAttackHit, entityList, {
			imageId: 'GanniImage',
			sheet: GanniSheet,
			Projectile: Mela,
			melaKind: 'ganni',
			voice: { pitch: 0.6, rate: 0.95 },
			special: {
				[FighterAttackStrength.LIGHT]: 'PASTIZZ-POWER',
				[FighterAttackStrength.MEDIUM]: 'FRESH FROM THE OVEN',
				[FighterAttackStrength.HEAVY]: 'EXTRA RICOTTA',
			},
		});
	}
}
