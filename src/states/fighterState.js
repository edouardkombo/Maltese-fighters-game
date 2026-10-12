import { HEALTH_MAX_HIT_POINTS } from '../constants/battle.js';

export const createDefaultFighterState = (id, score = 1) => {
	return {
		instance: undefined,
		id,
		score,
		battles: 0,
		hitPoints: HEALTH_MAX_HIT_POINTS,
	};
};
