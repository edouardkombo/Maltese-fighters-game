import { FighterAttackStrength } from '../../constants/fighter.js';
import { MalteseFighter } from './MalteseFighter.js';
import { KarmenuSheet } from './sheets/karmenu.js';
import { Mela } from './special/Mela.js';


export class Karmenu extends MalteseFighter {
	constructor(playerId, onAttackHit, entityList) {
		super(playerId, onAttackHit, entityList, {
			imageId: 'KarmenuImage',
			sheet: KarmenuSheet,
			Projectile: Mela,
			melaKind: 'karmenu',
			voice: { pitch: 0.85, rate: 1.0 },
			special: {
				[FighterAttackStrength.LIGHT]: 'BUS IS LATE',
				[FighterAttackStrength.MEDIUM]: 'NO CHANGE GIVEN',
				[FighterAttackStrength.HEAVY]: 'FULL HORN',
			},
		});
	}
}
