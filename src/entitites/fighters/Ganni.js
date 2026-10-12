import { SpecialKind } from '../../constants/specials.js';
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
				[SpecialKind.MELA]: 'FRESH FROM THE OVEN',
				[SpecialKind.PASTIZZI]: 'PASTIZZ-POWER',
				[SpecialKind.UWEJJA]: 'OVEN BLAST',
				[SpecialKind.RICOTTA]: 'EXTRA RICOTTA',
			},
		});
	}
}
