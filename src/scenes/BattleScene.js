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
import { CONTROL_ORDER, Control } from '../constants/controls.js';
import { SPECIALS, SPECIAL_ORDER } from '../constants/specials.js';
import { Camera } from '../engine/Camera.js';
import { EntityList } from '../engine/EntityList.js';
import { Lou, Ganni, Karmenu, Ichi } from '../entitites/fighters/index.js';
import {
	HeavyHitSplash,
	LightHitSplash,
	MediumHitSplash,
	Shadow,
} from '../entitites/fighters/shared/index.js';
import { FpsCounter } from '../entitites/overlays/FpsCounter.js';
import { StatusBar } from '../entitites/overlays/StatusBar.js';
import { MaltaStage } from '../entitites/stage/MaltaStage.js';
import { gameState, ROUNDS_TO_WIN, isLastStage } from '../states/gameState.js';
import { SimpleAI } from '../engine/SimpleAI.js';
import { clearSimHeld, sampleLocalHeld, setAIHeld, setInputEnabled, setSimHeld } from '../engine/InputHandler.js';
import { TouchControls } from '../engine/TouchControls.js';
import { Audio } from '../engine/Audio.js';
import { Net } from '../engine/Net.js';
import { InterludeScene } from './InterludeScene.js';
import { NetLobbyScene } from './NetLobbyScene.js';
import { MenuScene } from './MenuScene.js';
import { setPauseHandler } from '../engine/ScreenControls.js';
import { getCanvas, isTouchDevice, toLogical } from '../utils/pointer.js';
import { drawButton, inRect } from './ui.js';

const INTRO_TIME = 2.1; // "ROUND n" + "FIGHT!"
const ROUND_END_TIME = 3.0;
const MATCH_END_TIME = 2.8;

// ---- online lockstep
const TICK = 1 / 60;
const SNAPSHOT_EVERY = 30; // ticks between host -> guest drift checks
const BUTTON_PULSE = 4; // a button press is held for this many ticks so no state machine can miss it
const DIRECTIONS = new Set([Control.LEFT, Control.RIGHT, Control.UP, Control.DOWN]);
const pack = (held) => CONTROL_ORDER.reduce((bits, c, i) => (held.has(c) ? bits | (1 << i) : bits), 0);
const unpack = (bits) => new Set(CONTROL_ORDER.filter((c, i) => bits & (1 << i)));

/**
 * One fight = best of three rounds: two rounds are always played, a third decides it only if they are level.
 * phases: intro -> fight -> roundEnd -> (intro again | matchEnd)
 *
 * Single player: player 0 = you (keyboard / touch / gamepad), player 1 = the CPU.
 * Online: both players are humans; both browsers run this exact simulation tick by tick (lockstep).
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
		this.net = gameState.net; // null in single player
		this.localIndex = this.net ? this.net.localIndex : 0;
		this.touch = isTouchDevice();
		this.stage = new MaltaStage(gameState.arena);
		this.entities = new EntityList();
		this.fpsCounter = new URLSearchParams(window.location.search).has('debug')
			? new FpsCounter()
			: null;
		this.overlays = [];
		if (this.net) this.initNet();
		else {
			// single player can pause (Esc / P / the ❚❚ button) and quit back to the menu
			setPauseHandler(this.togglePause);
			window.addEventListener('keydown', this.onPauseKey);
			getCanvas().addEventListener('pointerup', this.onPauseClick);
		}
		Audio.playMusic('fight');
		TouchControls.show();
		this.startRound();
		if (new URLSearchParams(window.location.search).has('debug')) window.__battle = this;
	}

	destroy = () => {
		TouchControls.hide();
		clearSimHeld();
		setInputEnabled(true);
		this.unsubscribeNet?.();
		setPauseHandler(null);
		window.removeEventListener('keydown', this.onPauseKey);
		getCanvas().removeEventListener('pointerup', this.onPauseClick);
	};

	// -------------------------------------------------------------------------------- pause (single player)
	paused = false;
	pauseButtons = [
		{ id: 'resume', label: 'RESUME', x: SCENE_WIDTH / 2 - 70, y: 96, w: 140, h: 26 },
		{ id: 'quit', label: 'QUIT TO MENU', x: SCENE_WIDTH / 2 - 70, y: 132, w: 140, h: 26 },
	];

	togglePause = () => {
		if (this.leaving || this.phase === 'matchEnd') return;
		this.paused = !this.paused;
		if (this.paused) {
			Audio.click();
			TouchControls.hide();
		} else TouchControls.show();
	};

	quitToMenu = () => {
		if (this.leaving) return;
		this.leaving = true;
		Audio.click();
		this.changeScene(MenuScene);
	};

	onPauseKey = (e) => {
		if (e.repeat) return;
		if (e.code === 'Escape' || e.code === 'KeyP') this.togglePause();
		else if (this.paused && e.code === 'Enter') this.togglePause();
		else if (this.paused && e.code === 'KeyQ') this.quitToMenu();
	};

	onPauseClick = (e) => {
		if (!this.paused) return;
		const p = toLogical(e);
		const hit = this.pauseButtons.find((b) => inRect(p, b));
		if (hit?.id === 'resume') this.togglePause();
		else if (hit?.id === 'quit') this.quitToMenu();
	};

	drawPause(context) {
		context.fillStyle = 'rgba(5,10,30,.7)';
		context.fillRect(0, 0, SCENE_WIDTH, 224);
		this.drawBanner(context, 'PAUSED', 80, 24, '#ffffff');
		this.pauseButtons.forEach((b, i) => drawButton(context, b, b.label, { fill: i === 0 ? '#ffcc00' : '#9fb6ff' }));
		this.drawLabel(context, this.touch ? '' : 'ESC resume  •  Q quit', SCENE_WIDTH / 2, 176, '#b8c4ff');
	}

	// -------------------------------------------------------------------------------- setup
	getFighterClass = (id) => {
		switch (id) {
			case FighterId.LOU:
				return Lou;
			case FighterId.GANNI:
				return Ganni;
			case FighterId.KARMENU:
				return Karmenu;
			case FighterId.ICHI:
				return Ichi;
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
		if (!this.net) this.ai = new SimpleAI(this.fighters[1], this.fighters[0], gameState.session.stage);
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
		if (this.net) {
			setSimHeld(0, new Set());
			setSimHeld(1, new Set());
		} else {
			setSimHeld(0, null);
			setAIHeld(new Set());
		}
		setInputEnabled(false);
		Audio.bell();
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

	handleAttackHit = (time, playerId, opponentId, position, strength, damage) => {
		if (this.phase !== 'fight') return; // no damage during intros / after the bell
		this.FighterDrawOrder = [opponentId, playerId];
		gameState.fighters[playerId].score += FighterAttackBaseData[strength].score;

		gameState.fighters[opponentId].hitPoints -= damage ?? FighterAttackBaseData[strength].damage;

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
		if (!this.net) setAIHeld(new Set());
		if (reason !== 'TIME OVER') Audio.ko();

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
		// still level after the deciding round (draw): the better fighter on points takes it, ties go to player 1
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
		const won = winner === this.localIndex;
		this.matchResult = won ? 'win' : 'lose';
		Audio.jingle(won);
		// the career state is only advanced when we leave, so the HUD keeps showing the current stage
		this.commitMatch = () => {
			if (this.net) {
				this.net.wins[winner] += 1;
				this.net.lastResult = this.matchResult;
				return;
			}
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
			text: won ? 'YOU WIN!' : 'YOU LOSE',
			sub: `${name} TAKES THE FIGHT`,
		};
	};

	// -------------------------------------------------------------------------------- simulation
	/** One step of the fight. Single player: once per screen frame. Online: once per 1/60 s tick. */
	simulate = (time) => {
		const dt = time.secondsPassed;
		this.phaseTime += dt;

		if (this.phase === 'intro') {
			if (this.phaseTime >= INTRO_TIME) {
				this.phase = 'fight';
				this.phaseTime = 0;
				this.statusBar.resume(time);
				setInputEnabled(true);
				Audio.fightStab();
			}
		} else if (this.phase === 'fight') {
			if (!this.net) setAIHeld(this.ai.getHeldControls(time));
		} else if (this.phase === 'roundEnd') {
			if (this.phaseTime >= ROUND_END_TIME) this.nextAfterRoundEnd();
		} else if (this.phase === 'matchEnd') {
			if (this.phaseTime >= MATCH_END_TIME && !this.leaving) {
				this.leaving = true;
				this.commitMatch();
				this.changeScene(this.net ? NetLobbyScene : InterludeScene);
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

	update = (time) => {
		if (this.net) this.stepNet(time);
		else if (!this.paused) this.simulate(time);
	};

	// -------------------------------------------------------------------------------- online lockstep
	initNet() {
		this.tick = 0;
		this.acc = 0;
		this.delay = this.net.delay || 4;
		this.lastSent = this.delay - 1; // ticks before `delay` have no input on either side
		this.localInputs = new Map();
		this.prevHeld = new Set();
		this.pulse = {};
		this.hist = new Map();
		this.stallSince = null;
		this.desyncs = 0;
		this.netLost = false;
		this.lostTime = 0;
		this.unsubscribeNet = Net.on((type) => {
			if (type === 'closed') this.netLost = true;
		});
	}

	/** What this device's player is pressing, as input bits (button presses become short pulses). */
	sampleLocalBits() {
		const held = sampleLocalHeld();
		const out = new Set();
		for (const c of CONTROL_ORDER) {
			if (DIRECTIONS.has(c)) {
				if (held.has(c)) out.add(c);
				continue;
			}
			if (held.has(c) && !this.prevHeld.has(c)) this.pulse[c] = BUTTON_PULSE;
			if (this.pulse[c] > 0) {
				out.add(c);
				this.pulse[c] -= 1;
			}
		}
		this.prevHeld = held;
		return pack(out);
	}

	sendLocalInput() {
		const k = this.tick + this.delay;
		if (k <= this.lastSent) return;
		const bits = this.sampleLocalBits();
		this.localInputs.set(k, bits);
		Net.send({ t: 'i', m: Net.matchId, v: [[k, bits]] });
		this.lastSent = k;
	}

	snapshot() {
		const [a, b] = this.fighters;
		const [ha, hb] = gameState.fighters;
		return [this.round, a.position.x, a.position.y, ha.hitPoints, b.position.x, b.position.y, hb.hitPoints];
	}

	/** Guest: nudge any drift back to the host's numbers (same tick, same round only). */
	applyHostSnapshots() {
		for (const [k, host] of Net.snapshots) {
			if (k > this.tick) continue;
			Net.snapshots.delete(k);
			const mine = this.hist.get(k);
			if (!mine || mine[0] !== host[0] || host[0] !== this.round) continue;
			const d = host.map((v, i) => v - mine[i]);
			if (d.every((v) => Math.abs(v) < 1e-6)) continue;
			this.desyncs += 1;
			const [a, b] = this.fighters;
			a.position.x += d[1];
			a.position.y += d[2];
			gameState.fighters[0].hitPoints += d[3];
			b.position.x += d[4];
			b.position.y += d[5];
			gameState.fighters[1].hitPoints += d[6];
		}
	}

	stepNet = (frameTime) => {
		if (this.netLost) {
			this.lostTime += frameTime.secondsPassed;
			if (this.lostTime > 2.5 && !this.leaving) {
				this.leaving = true;
				this.changeScene(NetLobbyScene);
			}
			return;
		}
		this.acc = Math.min(this.acc + frameTime.secondsPassed, TICK * 12);
		let steps = 0;
		let stalled = false;
		while (this.acc >= TICK - 1e-4 && steps < 4) {
			this.sendLocalInput();
			const t = this.tick;
			const remote = t < this.delay ? 0 : Net.remoteInputs.get(t);
			if (remote === undefined) {
				stalled = true;
				break;
			}
			const local = t < this.delay ? 0 : this.localInputs.get(t) ?? 0;
			const bits = this.localIndex === 0 ? [local, remote] : [remote, local];
			setSimHeld(0, unpack(bits[0]));
			setSimHeld(1, unpack(bits[1]));

			this.simulate({ secondsPassed: TICK, previous: t * FRAME_TIME });

			if (t % SNAPSHOT_EVERY === 0) {
				const s = this.snapshot();
				this.hist.set(t, s);
				if (this.net.role === 'host') Net.send({ t: 's', m: Net.matchId, k: t, s });
			}
			if (this.net.role === 'guest') this.applyHostSnapshots();
			this.localInputs.delete(t);
			Net.remoteInputs.delete(t);
			this.hist.delete(t - SNAPSHOT_EVERY * 20);

			this.tick += 1;
			this.acc -= TICK;
			steps += 1;
		}
		if (stalled) this.stallSince ??= performance.now();
		else this.stallSince = null;
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

	/** The four super powers of each fighter, with their cooldown (and the key to press for you). */
	drawSpecialIcons(context) {
		for (let side = 0; side < 2; side++) {
			const fighter = this.fighters[side];
			if (!fighter?.cooldownLeft) continue;
			const showKeys = side === this.localIndex && !this.touch;
			SPECIAL_ORDER.forEach((kind, i) => {
				const s = SPECIALS[kind];
				const x = side === 0 ? 66 + i * 13 : 316 - i * 13;
				const y = 52;
				const left = fighter.cooldownLeft(kind);
				context.save();
				context.beginPath();
				context.arc(x, y, 5, 0, Math.PI * 2);
				context.fillStyle = left > 0 ? 'rgba(0,0,0,.55)' : s.color;
				context.fill();
				if (left > 0) {
					context.beginPath();
					context.moveTo(x, y);
					context.arc(x, y, 5, -Math.PI / 2, -Math.PI / 2 + (1 - left) * Math.PI * 2);
					context.closePath();
					context.globalAlpha = 0.6;
					context.fillStyle = s.color;
					context.fill();
					context.globalAlpha = 1;
				}
				context.lineWidth = 1;
				context.strokeStyle = left > 0 ? 'rgba(255,255,255,.5)' : '#ffffff';
				context.stroke();
				context.font = '900 6px "Arial Black", Impact, sans-serif';
				context.textAlign = 'center';
				context.textBaseline = 'middle';
				context.fillStyle = left > 0 ? 'rgba(255,255,255,.7)' : '#1a1020';
				context.fillText(showKeys ? s.key : s.icon || s.label[0], x, y + 0.5);
				context.restore();
			});
		}
	}

	drawPhaseText(context) {
		const t = this.phaseTime;
		if (this.phase === 'intro') {
			const label = this.round === 3 ? 'FINAL ROUND' : `ROUND ${this.round}`;
			if (t < 1.2) {
				const pop = Math.min(1, t / 0.18);
				this.drawBanner(context, label, 98, 22 + 6 * (1 - pop), '#ffffff');
				const arena = this.stage.arena;
				this.drawBanner(context, `${arena.name}  -  ${arena.sub.toUpperCase()}`, 114, 8, '#ffe9a0', Math.min(1, t * 3));
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

	/** Online: a little "YOU" tag over your own fighter, and the connection status. */
	drawNetInfo(context) {
		const me = this.fighters[this.localIndex];
		if (me && (this.phase === 'intro' || (this.phase === 'fight' && this.phaseTime < 3))) {
			const x = Math.floor(me.position.x - this.camera.position.x);
			const y = Math.floor(me.position.y - this.camera.position.y) - 104;
			context.save();
			context.fillStyle = '#35e0a0';
			context.beginPath();
			context.moveTo(x - 4, y);
			context.lineTo(x + 4, y);
			context.lineTo(x, y + 5);
			context.fill();
			context.restore();
			this.drawLabel(context, 'YOU', x, y - 3, '#35e0a0');
		}
		if (this.netLost) {
			this.drawBanner(context, 'FRIEND DISCONNECTED', 150, 13, '#ff6a6a');
		} else if (this.stallSince && performance.now() - this.stallSince > 400) {
			this.drawBanner(context, 'WAITING FOR YOUR FRIEND…', 150, 10, '#ffffff', 0.9);
		}
	}

	drawLabel(context, text, x, y, color) {
		context.save();
		context.textAlign = 'center';
		context.font = '900 7px "Arial Black", Impact, sans-serif';
		context.lineWidth = 2.5;
		context.strokeStyle = '#0a1030';
		context.strokeText(text, x, y);
		context.fillStyle = color;
		context.fillText(text, x, y);
		context.restore();
	}

	draw = (context) => {
		this.stage.drawBackground(context, this.camera);
		this.shadows.map((shadow) => shadow.draw(context, this.camera));
		this.drawFighters(context);
		this.entities.draw(context, this.camera);
		this.stage.drawForeground(context, this.camera);
		this.overlays.map((overlay) => overlay.draw(context, this.camera));
		this.drawRoundMarkers(context);
		this.drawSpecialIcons(context);
		this.drawPhaseText(context);
		if (this.net) this.drawNetInfo(context);
		if (this.paused) this.drawPause(context);
		TouchControls.updateCooldowns(this.fighters[this.localIndex]);
	};
}
