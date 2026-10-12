import { FighterState } from './fighter.js';

/**
 * The four Maltese super powers. Each one has its own effect, its own cooldown (ms of game time)
 * and can be fired either with a one-touch button (keyboard Q/W/E/R, the touch buttons, gamepad
 * L2/R2/L3/R3) or with the classic motion input shown in `motion`.
 */
export const SpecialKind = {
	MELA: 'mela',
	PASTIZZI: 'pastizzi',
	UWEJJA: 'uwejja',
	RICOTTA: 'ricotta',
};

export const SPECIALS = {
	[SpecialKind.MELA]: {
		label: 'MELA!',
		cooldown: 1100,
		color: '#ffd23a',
		key: 'Q',
		short: 'straight orb',
		motion: '↓ ↘ → + PUNCH',
		power: 'Maltese-cross orb. Light / medium / heavy punch = slow / medium / fast',
	},
	[SpecialKind.PASTIZZI]: {
		label: 'PASTIZZI!',
		cooldown: 2200,
		color: '#f0a838',
		key: 'W',
		short: '3 lobbed pastizzi',
		motion: '↓ ↙ ← + PUNCH',
		power: 'Lobs 3 hot pastizzi in an arc - great against jumpers and from afar',
	},
	[SpecialKind.UWEJJA]: {
		label: 'UWEJJA!',
		cooldown: 3000,
		color: '#5ad0ff',
		key: 'E',
		short: 'close shockwave',
		motion: '↓ ↘ → + KICK',
		power: 'Close-range shout shockwave: big damage, huge knock-back, cancels projectiles',
		damage: 32,
	},
	[SpecialKind.RICOTTA]: {
		label: 'RICOTTA!',
		cooldown: 9000,
		color: '#ffffff',
		key: 'R',
		short: 'heal +25 HP',
		motion: '↓ ↙ ← + KICK',
		power: 'Eat a ricotta pastizz: heals 25 HP (long cooldown)',
		heal: 25,
	},
};

export const SPECIAL_ORDER = [SpecialKind.MELA, SpecialKind.PASTIZZI, SpecialKind.UWEJJA, SpecialKind.RICOTTA];

/** Which special a fighter state belongs to. */
export const specialOfState = (state) => {
	switch (state) {
		case FighterState.SPECIAL_1_LIGHT:
		case FighterState.SPECIAL_1_MEDIUM:
		case FighterState.SPECIAL_1_HEAVY:
			return SpecialKind.MELA;
		case FighterState.SPECIAL_PASTIZZI:
			return SpecialKind.PASTIZZI;
		case FighterState.SPECIAL_UWEJJA:
			return SpecialKind.UWEJJA;
		case FighterState.SPECIAL_RICOTTA:
			return SpecialKind.RICOTTA;
		default:
			return null;
	}
};

/** State started by the one-touch button of each special. */
export const stateOfSpecial = {
	[SpecialKind.MELA]: FighterState.SPECIAL_1_MEDIUM,
	[SpecialKind.PASTIZZI]: FighterState.SPECIAL_PASTIZZI,
	[SpecialKind.UWEJJA]: FighterState.SPECIAL_UWEJJA,
	[SpecialKind.RICOTTA]: FighterState.SPECIAL_RICOTTA,
};
