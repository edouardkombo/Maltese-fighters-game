import {
	SCENE_WIDTH,
	STAGE_MID_POINT,
	STAGE_PADDING,
} from '../constants/Stage.js';
import {
	FighterAttackBaseData,
	FighterAttackStrength,
	FighterId,
	FighterState,
	FighterStruckDelay,
} from '../constants/fighter.js';
import { HEALTH_MAX_HIT_POINTS } from '../constants/battle.js';
import { FRAME_TIME } from '../constants/game.js';
import { Camera } from '../engine/Camera.js';
import { EntityList } from '../engine/EntityList.js';
import { Lou, Ganni, Karmenu } from '../entitites/fighters/index.js';
import {
	HeavyHitSplash,
	LightHitSplash,
	MediumHitSplash,
	Shadow,
} from '../entitites/fighters/shared/index.js';
import { FpsCounter } from '../entitites/overlays/FpsCounter.js';
import { StatusBar } from '../entitites/overlays/StatusBar.js';
import { ValletaStage } from '../entitites/stage/ValletaStage.js';
import { gameState, ROUNDS_TO_WIN, isLastStage } from '../states/gameState.js';
import { SimpleAI } from '../engine/SimpleAI.js';
import { setAIHeld, setInputEnabled } from '../engine/InputHandler.js';
import { TouchControls } from '../engine/TouchControls.js';
import { InterludeScene } from './InterludeScene.js';

const INTRO_TIME = 2.1; // "ROUND n" + "FIGHT!"
const ROUND_END_TIME = 3.0;
const MATCH_END_TIME = 2.8;

/**
 * One fight = best of three rounds: two rounds are always played, a third decides it only if they are level.
 * phases: intro -> fight -> roundEnd -> (intro again | matchEnd)
 */
export class BattleScene {
	fighters = [];
	camera = undefined;
	shadows = [];
	FighterDrawOrder = [0, 1];
	hurtTimer = 0;

	round = 1;
	wins = [0, 0];
	phase = 'intro';
	phaseTime = 0;
	banner = null; // { text, sub }
	matchResult = null; // 'win' | 'lose'

	constructor(changeScene) {
		this.changeScene = changeScene;
		this.stage = new ValletaStage();
		this.entities = new EntityList();
		this.fpsCounter = new URLSearchParams(window.location.search).has('debug')
			? new FpsCounter()
			: null;
		this.overlays = [];
		TouchControls.show();
		this.startRound();
	}

	destroy = () => {
		TouchControls.hide();
		setAIHeld(new Set());
		setInputEnabled(true);
	};

	// -------------------------------------------------------------------------------- setup
	getFighterClass = (id) => {
		switch (id) {
			case FighterId.LOU:
				return Lou;
			case FighterId.GANNI:
				return Ganni;
			case FighterId.KARMENU:
				return Karmenu;
			default:
				throw new Error(`Invalid Fighter Id: ${id}`);
		}
	};

	getFighterEntitiy = (id, index) => {
		const FighterClass = this.getFighterClass(id);
		return new FighterClass(index, this.handleAttackHit, this.entities);
	};

	getFighterEntities = () => {
		const fighterEntities = gameState.fighters.map(({ id }, index) => {
			const fighterEntity = this.getFighterEntitiy(id, index);
			gameState.fighters[index].instance = fighterEntity;
			return fighterEntity;
		});

		fighterEntities[0].opponent = fighterEntities[1];
		fighterEntities[1].opponent = fighterEntities[0];

		return fighterEntities;
	};

	startRound = () => {
		gameState.fighters.forEach((f) => (f.hitPoints = HEALTH_MAX_HIT_POINTS));
		this.entities = new EntityList(); // clears projectiles / splashes from the previous round
		this.fighters = this.getFighterEntities();
		this.FighterDrawOrder = [0, 1];
		this.hurtTimer = 0;
		const level = gameState.session.stage;
		this.ai = new SimpleAI(this.fighters[1], this.fighters[0], level);
		this.camera = new Camera(
			STAGE_PADDING + STAGE_MID_POINT - SCENE_WIDTH / 2,
			16,
			this.fighters
		);
		this.shadows = this.fighters.map((fighter) => new Shadow(fighter));
		this.statusBar = new StatusBar(this.fighters, this.onTimeEnd);
		this.overlays = [this.statusBar, ...(this.fpsCounter ? [this.fpsCounter] : [])];

		this.phase = 'intro';
		this.phaseTime = 0;
		this.banner = null;
		setAIHeld(new Set());
		setInputEnabled(false);
	};

	// -------------------------------------------------------------------------------- combat
	updateFighters = (time) => {
		this.fighters.map((fighter) => {
			if (this.hurtTimer > time.previous) {
				fighter.updateHurtShake(time, this.hurtTimer);
			} else fighter.update(time, this.camera);
		});
	};

	getHitSplashClass = (strength) => {
		switch (strength) {
			case FighterAttackStrength.LIGHT:
				return LightHitSplash;
			case FighterAttackStrength.MEDIUM:
				return MediumHitSplash;
			case FighterAttackStrength.HEAVY:
				return HeavyHitSplash;
			default:
				throw new Error('Invalid Strength Splash requested');
		}
	};

	handleAttackHit = (time, playerId, opponentId, position, strength) => {
		if (this.phase !== 'fight') return; // no damage during intros / after the bell
		this.FighterDrawOrder = [opponentId, playerId];
		gameState.fighters[playerId].score += FighterAttackBaseData[strength].score;

		gameState.fighters[opponentId].hitPoints -=
			FighterAttackBaseData[strength].damage;

		const HitSplashClass = this.getHitSplashClass(strength);

		if (gameState.fighters[opponentId].hitPoints <= 0) {
			this.fighters[opponentId].changeState(FighterState.KO, time);
		}

		this.fighters[opponentId].direction =
			this.fighters[playerId].direction * -1;

		position &&
			this.entities.add(HitSplashClass, position.x, position.y, playerId);

		this.hurtTimer = time.previous + FighterStruckDelay * FRAME_TIME;
	};

	// -------------------------------------------------------------------------------- rounds
	onTimeEnd = (time) => {
		if (this.phase !== 'fight') return;
		const [a, b] = gameState.fighters.map((f) => f.hitPoints);
		if (a === b) return this.endRound(null, 'TIME OVER', time);
		this.endRound(a > b ? 0 : 1, 'TIME OVER', time);
	};

	checkKo = (time) => {
		const [a, b] = gameState.fighters.map((f) => f.hitPoints <= 0);
		if (a && b) this.endRound(null, 'DOUBLE K.O.', time);
		else if (a) this.endRound(1, 'K.O.', time);
		else if (b) this.endRound(0, 'K.O.', time);
	};

	endRound = (winner, reason, time) => {
		if (this.phase !== 'fight') return;
		this.phase = 'roundEnd';
		this.phaseTime = 0;
		setInputEnabled(false);
		setAIHeld(new Set());

		if (winner === null) {
			this.banner = { text: reason, sub: 'DRAW' };
		} else {
			this.wins[winner] += 1;
			const loser = 1 - winner;
			this.fighters[winner].victory = true;
			if (this.fighters[loser].currentState !== FighterState.KO) {
				this.fighters[loser].changeState(FighterState.KO, time);
			}
			const name = gameState.fighters[winner].id.toUpperCase();
			this.banner = { text: reason, sub: `${name} WINS THE ROUND` };
		}
	};

	/** Who has won the fight (0 / 1), or null if another round is needed. */
	fightWinner = () => {
		const [a, b] = this.wins;
		if (a >= ROUNDS_TO_WIN) return 0;
		if (b >= ROUNDS_TO_WIN) return 1;
		if (this.round < 2) return null; // two rounds are always played
		if (a !== b) return a > b ? 0 : 1;
		if (this.round < 3) return null; // level after two rounds -> deciding third round
		// still level after the deciding round (draw): the better fighter on points takes it, ties go to the player
		const [sa, sb] = gameState.fighters.map((f) => f.score);
		return sb > sa ? 1 : 0;
	};

	nextAfterRoundEnd = () => {
		const winner = this.fightWinner();
		if (winner === null) {
			this.round += 1;
			this.startRound();
			return;
		}
		this.phase = 'matchEnd';
		this.phaseTime = 0;
		TouchControls.hide();
		this.matchResult = winner === 0 ? 'win' : 'lose';
		// the career state is only advanced when we leave, so the HUD keeps showing the current stage
		this.commitMatch = () => {
			const s = gameState.session;
			if (winner === 0) {
				s.score = gameState.fighters[0].score;
				if (isLastStage()) s.mode = 'champion';
				else {
					s.stage += 1;
					s.mode = 'stage';
				}
			} else {
				s.mode = 'gameover';
			}
		};
		const name = gameState.fighters[winner].id.toUpperCase();
		this.banner = {
			text: winner === 0 ? 'YOU WIN!' : 'YOU LOSE',
			sub: winner === 0 ? `${name} TAKES THE FIGHT` : `${name} TAKES THE FIGHT`,
		};
	};

	// -------------------------------------------------------------------------------- loop
	update = (time) => {
		const dt = time.secondsPassed;
		this.phaseTime += dt;

		if (this.phase === 'intro') {
			if (this.phaseTime >= INTRO_TIME) {
				this.phase = 'fight';
				this.phaseTime = 0;
				this.statusBar.resume(time);
				setInputEnabled(true);
			}
		} else if (this.phase === 'fight') {
			setAIHeld(this.ai.getHeldControls(time));
		} else if (this.phase === 'roundEnd') {
			if (this.phaseTime >= ROUND_END_TIME) this.nextAfterRoundEnd();
		} else if (this.phase === 'matchEnd') {
			if (this.phaseTime >= MATCH_END_TIME && !this.leaving) {
				this.leaving = true;
				this.commitMatch();
				this.changeScene(InterludeScene);
			}
		}

		this.updateFighters(time);
		this.shadows.map((shadow) => shadow.update(time));
		this.stage.update(time);
		this.entities.update(time, this.camera);
		this.camera.update(time);
		this.overlays.map((overlay) => overlay.update(time));
		if (this.phase === 'fight') this.checkKo(time);
	};

	// -------------------------------------------------------------------------------- drawing
	drawFighters(context) {
		this.FighterDrawOrder.map((id) =>
			this.fighters[id].draw(context, this.camera)
		);
	}

	drawBanner(context, text, y, size, color = '#ffe040', alpha = 1) {
		context.save();
		context.globalAlpha = alpha;
		context.textAlign = 'center';
		context.lineJoin = 'round';
		context.font = `900 ${size}px "Arial Black", Impact, sans-serif`;
		context.lineWidth = Math.max(3, size / 4);
		context.strokeStyle = '#3a0a0a';
		context.strokeText(text, SCENE_WIDTH / 2, y);
		context.fillStyle = color;
		context.fillText(text, SCENE_WIDTH / 2, y);
		context.restore();
	}

	drawRoundMarkers(context) {
		const need = ROUNDS_TO_WIN;
		for (let side = 0; side < 2; side++) {
			for (let i = 0; i < need; i++) {
				const x = side === 0 ? 36 + i * 11 : 346 - i * 11;
				const y = 52;
				context.beginPath();
				context.arc(x, y, 3.6, 0, Math.PI * 2);
				context.fillStyle = i < this.wins[side] ? '#ffd23a' : 'rgba(0,0,0,0.45)';
				context.fill();
				context.lineWidth = 1.2;
				context.strokeStyle = '#ffffff';
				context.stroke();
			}
		}
	}

	drawPhaseText(context) {
		const t = this.phaseTime;
		if (this.phase === 'intro') {
			const label = this.round === 3 ? 'FINAL ROUND' : `ROUND ${this.round}`;
			if (t < 1.2) {
				const pop = Math.min(1, t / 0.18);
				this.drawBanner(context, label, 98, 22 + 6 * (1 - pop), '#ffffff');
			} else {
				const pop = Math.min(1, (t - 1.2) / 0.15);
				this.drawBanner(context, 'FIGHT!', 100, 28 + 10 * (1 - pop), '#ffe040');
			}
		} else if (this.phase === 'fight' && t < 0.6) {
			this.drawBanner(context, 'FIGHT!', 100, 28, '#ffe040', 1 - t / 0.6);
		} else if (this.phase === 'roundEnd' && this.banner) {
			this.drawBanner(context, this.banner.text, 96, 28, '#ff5040');
			if (t > 0.5) this.drawBanner(context, this.banner.sub, 114, 11, '#ffffff');
		} else if (this.phase === 'matchEnd' && this.banner) {
			this.drawBanner(context, this.banner.text, 96, 28, this.matchResult === 'win' ? '#ffe040' : '#ff5040');
			this.drawBanner(context, this.banner.sub, 114, 11, '#ffffff');
		}
	}

	draw = (context) => {
		this.stage.drawBackground(context, this.camera);
		this.shadows.map((shadow) => shadow.draw(context, this.camera));
		this.drawFighters(context);
		this.entities.draw(context, this.camera);
		this.stage.drawForeground(context, this.camera);
		this.overlays.map((overlay) => overlay.draw(context, this.camera));
		this.drawRoundMarkers(context);
		this.drawPhaseText(context);
	};
}
