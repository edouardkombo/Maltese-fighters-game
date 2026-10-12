import { SpecialKind } from '../../constants/specials.js';
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
				[SpecialKind.MELA]: 'FULL HORN',
				[SpecialKind.PASTIZZI]: 'NO CHANGE GIVEN',
				[SpecialKind.UWEJJA]: 'THE BUS IS LATE!',
				[SpecialKind.RICOTTA]: 'TEA BREAK',
			},
		});
	}
}
