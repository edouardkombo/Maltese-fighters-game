import { SpecialKind } from '../../constants/specials.js';
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
				[SpecialKind.MELA]: 'KINNIE BLAST',
				[SpecialKind.PASTIZZI]: 'PASTIZZ ATTACK',
				[SpecialKind.UWEJJA]: 'COME ON!',
				[SpecialKind.RICOTTA]: 'ENERGY SNACK',
			},
		});
	}
}
