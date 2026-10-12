import { FighterId } from '../constants/fighter.js';
import { createDefaultFighterState } from './fighterState.js';

/** Everybody who can be picked, in "chain" order. */
export const ROSTER = [FighterId.LOU, FighterId.GANNI, FighterId.KARMENU];

/** Rounds needed to win a fight (best of three: 2 rounds, a 3rd only if they are level). */
export const ROUNDS_TO_WIN = 2;

export var gameState = {
	fighters: [
		createDefaultFighterState(FighterId.LOU),
		createDefaultFighterState(FighterId.GANNI),
	],
	// the whole "career": the player has to beat every other fighter, one after the other
	session: {
		playerId: FighterId.LOU,
		opponents: [FighterId.GANNI, FighterId.KARMENU],
		stage: 0,
		score: 1,
		mode: 'stage', // 'stage' | 'gameover' | 'champion'
	},
};

/** New career: pick a fighter, then face the rest of the roster in order. */
export const startSession = (playerId) => {
	gameState.session = {
		playerId,
		opponents: ROSTER.filter((id) => id !== playerId),
		stage: 0,
		score: 1,
		mode: 'stage',
	};
	prepareStage();
};

/** Fresh fighter states for the current stage (player score carries over). */
export const prepareStage = () => {
	const s = gameState.session;
	gameState.fighters = [
		createDefaultFighterState(s.playerId, s.score),
		createDefaultFighterState(s.opponents[s.stage]),
	];
};

export const currentOpponent = () => gameState.session.opponents[gameState.session.stage];
export const isLastStage = () => gameState.session.stage >= gameState.session.opponents.length - 1;

export const resetGameState = () => {
	startSession(gameState.session.playerId);
};
