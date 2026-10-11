import { FighterId } from '../constants/fighter.js';
import { createDefaultFighterState } from './fighterState.js';

export var gameState = {
	fighters: [
		createDefaultFighterState(FighterId.RYU),
		createDefaultFighterState(FighterId.LOU),
	],
};

export const resetGameState = () => {
	// Only reset HP/score – keep current character IDs if set
	const ids = gameState.fighters.map(f => f.id);
	gameState = {
		fighters: [
			createDefaultFighterState(ids[0] || FighterId.RYU),
			createDefaultFighterState(ids[1] || FighterId.LOU),
		],
	};
};
