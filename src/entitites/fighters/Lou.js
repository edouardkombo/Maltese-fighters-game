import { FighterAttackStrength } from '../../constants/fighter.js';
import { MalteseFighter } from './MalteseFighter.js';
import { LouSheet } from './sheets/lou.js';
import { Mela } from './special/Mela.js';

export class Lou extends MalteseFighter {
	constructor(playerId, onAttackHit, entityList) {
		super(playerId, onAttackHit, entityList, {
			imageId: 'LouImage',
			sheet: LouSheet,
			Projectile: Mela,
			melaKind: 'lou',
			voice: { pitch: 1.5, rate: 1.15 },
			special: {
				[FighterAttackStrength.LIGHT]: 'PASTIZZ ATTACK',
				[FighterAttackStrength.MEDIUM]: 'RICOTTA BOMB',
				[FighterAttackStrength.HEAVY]: 'KINNIE BLAST',
			},
		});
	}
}
