import { FighterId } from '../constants/fighter.js';
import { pickArena } from '../entitites/stage/MaltaStage.js';
import { createDefaultFighterState } from './fighterState.js';

/** Everybody who can be picked, in "chain" order. */
export const ROSTER = [FighterId.LOU, FighterId.ICHI, FighterId.GANNI, FighterId.KARMENU];

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
	// which Malta arena the next fight takes place in (index into ARENAS) - random per fight
	arena: 0,
	// online match with a friend (null in single player)
	// { role: 'host' | 'guest', localIndex: 0 | 1, delay: ticks, wins: [n, n], lastResult }
	net: null,
};

/** New career: pick a fighter, then face the rest of the roster in order. */
export const startSession = (playerId) => {
	gameState.net = null;
	gameState.session = {
		playerId,
		opponents: ROSTER.filter((id) => id !== playerId),
		stage: 0,
		score: 1,
		mode: 'stage',
	};
	prepareStage();
};

/** Fresh fighter states for the current stage (player score carries over) and a new random arena. */
export const prepareStage = () => {
	const s = gameState.session;
	gameState.fighters = [
		createDefaultFighterState(s.playerId, s.score),
		createDefaultFighterState(s.opponents[s.stage]),
	];
	gameState.arena = pickArena(gameState.arena);
};

/** Online: both fighters are humans, the host is always on the left (index 0). */
export const prepareNetMatch = (fighterIds, arena) => {
	gameState.fighters = [createDefaultFighterState(fighterIds[0]), createDefaultFighterState(fighterIds[1])];
	gameState.arena = arena;
};

export const currentOpponent = () => gameState.session.opponents[gameState.session.stage];
export const isLastStage = () => gameState.session.stage >= gameState.session.opponents.length - 1;

export const resetGameState = () => {
	startSession(gameState.session.playerId);
};
