import { SCENE_WIDTH } from '../constants/Stage.js';
import { Audio } from '../engine/Audio.js';
import { Net, roomFromUrl } from '../engine/Net.js';
import { ARENAS, pickArena } from '../entitites/stage/MaltaStage.js';
import { ROSTER, gameState, prepareNetMatch } from '../states/gameState.js';
import { getCanvas, isTouchDevice, toLogical } from '../utils/pointer.js';
import { BattleScene } from './BattleScene.js';
import { MenuScene } from './MenuScene.js';
import { FIGHTER_INFO, drawBackdrop, drawButton, drawPortrait, inRect, outlinedText } from './ui.js';

const CX = SCENE_WIDTH / 2;

const copyText = async (text) => {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch (e) {
		const ta = document.createElement('textarea');
		ta.value = text;
		ta.style.position = 'fixed';
		ta.style.opacity = '0';
		document.body.appendChild(ta);
		ta.select();
		let ok = false;
		try {
			ok = document.execCommand('copy');
		} catch (err) {
			ok = false;
		}
		ta.remove();
		return ok;
	}
};

/**
 * Online lobby: create a room (host) or join one from an invite link (guest), pick your fighter,
 * both press READY, fight. After each fight you come back here for a rematch.
 */
export class NetLobbyScene {
	t = 0;
	leaving = false;
	toast = null; // { text, t }
	ready = false;

	constructor(changeScene) {
		this.changeScene = changeScene;
		this.canvas = getCanvas();
		this.touch = isTouchDevice();
		Audio.playMusic('title');

		const room = roomFromUrl();
		if (!gameState.net || !Net.connected) {
			gameState.net = {
				role: room ? 'guest' : 'host',
				localIndex: room ? 1 : 0,
				wins: [0, 0],
				matchCount: 0,
				lastResult: null,
				myFighter: gameState.net?.myFighter ?? ROSTER[room ? 1 : 0],
			};
			if (room) Net.join(room);
			else Net.host();
		} else if (Net.last.pick) {
			Net.last.pick.ready = false; // a finished fight resets both READY flags
		}

		this.unsubscribe = Net.on(this.onNet);
		this.canvas.addEventListener('pointerup', this.onUp);
		window.addEventListener('keydown', this.onKey);
		if (Net.connected) this.sendPick();
	}

	destroy = () => {
		this.unsubscribe?.();
		this.canvas.removeEventListener('pointerup', this.onUp);
		window.removeEventListener('keydown', this.onKey);
	};

	get net() {
		return gameState.net;
	}

	get remote() {
		return Net.last.pick || null;
	}

	// ---------------------------------------------------------------------------- network
	sendPick() {
		Net.send({ t: 'pick', id: this.net.myFighter, ready: this.ready });
	}

	onNet = (type, d) => {
		if (type === 'connected') {
			Audio.click();
			this.sendPick();
		} else if (type === 'message' && d.t === 'pick') {
			this.maybeStart();
		} else if (type === 'message' && d.t === 'start' && this.net.role === 'guest') {
			this.begin(d);
		}
	};

	/** Host only: when both players are ready, choose the arena + input delay and start the fight. */
	maybeStart() {
		if (this.net.role !== 'host' || !this.ready || !this.remote?.ready || this.leaving) return;
		const start = {
			t: 'start',
			m: this.net.matchCount + 1,
			fighters: [this.net.myFighter, this.remote.id],
			arena: pickArena(gameState.arena),
			delay: Net.suggestedDelay(),
		};
		Net.send(start);
		this.begin(start);
	}

	begin(start) {
		if (this.leaving) return;
		this.leaving = true;
		this.net.matchCount = start.m;
		this.net.delay = start.delay;
		Net.beginMatch(start.m);
		if (Net.last.pick) Net.last.pick.ready = false;
		prepareNetMatch(start.fighters, start.arena);
		Audio.click();
		this.changeScene(BattleScene);
	}

	// ---------------------------------------------------------------------------- input
	buttons() {
		if (!this.net || this.leaving) return [];
		const st = Net.status;
		if (st === 'connected') {
			return [
				{ id: 'prev', label: '◀', x: 26, y: 92, w: 24, h: 30 },
				{ id: 'next', label: '▶', x: 136, y: 92, w: 24, h: 30 },
				{ id: 'ready', label: this.ready ? 'READY! (CANCEL)' : 'READY', x: CX - 70, y: 178, w: 140, h: 24 },
				{ id: 'leave', label: 'LEAVE', x: 8, y: 196, w: 52, h: 20 },
			];
		}
		if (st === 'error' || st === 'closed') {
			return [
				{ id: 'retry', label: this.net.role === 'host' ? 'NEW ROOM' : 'TRY AGAIN', x: CX - 118, y: 160, w: 108, h: 26 },
				{ id: 'leave', label: 'BACK TO MENU', x: CX + 10, y: 160, w: 108, h: 26 },
			];
		}
		const list = [{ id: 'leave', label: 'BACK', x: 8, y: 196, w: 52, h: 20 }];
		if (this.net.role === 'host' && st === 'waiting') {
			list.push({ id: 'copy', label: 'COPY INVITE LINK', x: CX - 118, y: 146, w: 112, h: 26 });
			list.push({ id: 'share', label: navigator.share ? 'SHARE…' : 'COPY CODE', x: CX + 6, y: 146, w: 112, h: 26 });
		}
		return list;
	}

	setToast(text) {
		this.toast = { text, t: this.t };
	}

	act = async (id) => {
		Audio.click();
		if (id === 'prev' || id === 'next') {
			if (this.ready) return;
			const i = ROSTER.indexOf(this.net.myFighter);
			this.net.myFighter = ROSTER[(i + (id === 'next' ? 1 : -1) + ROSTER.length) % ROSTER.length];
			this.sendPick();
		} else if (id === 'ready') {
			this.ready = !this.ready;
			this.sendPick();
			this.maybeStart();
		} else if (id === 'copy') {
			this.setToast((await copyText(Net.inviteLink())) ? 'LINK COPIED - SEND IT TO YOUR FRIEND!' : 'COPY FAILED - READ THE LINK ABOVE');
		} else if (id === 'share') {
			if (navigator.share) {
				navigator
					.share({ title: 'Maltese Fighters', text: 'Fight me in Maltese Fighters! Mela!', url: Net.inviteLink() })
					.catch(() => {});
			} else {
				this.setToast((await copyText(Net.code)) ? `ROOM CODE ${Net.code} COPIED` : 'COPY FAILED');
			}
		} else if (id === 'retry') {
			const role = this.net.role;
			gameState.net = null;
			if (role !== 'guest') history.replaceState(null, '', window.location.pathname);
			this.leaving = true;
			this.changeScene(NetLobbyScene);
		} else if (id === 'leave') {
			if (this.leaving) return;
			this.leaving = true;
			Net.close();
			gameState.net = null;
			history.replaceState(null, '', window.location.pathname); // forget ?room=...
			this.changeScene(MenuScene);
		}
	};

	onUp = (e) => {
		const p = toLogical(e);
		const hit = this.buttons().find((b) => inRect(p, b));
		if (hit) this.act(hit.id);
	};

	onKey = (e) => {
		if (e.repeat) return;
		const st = Net.status;
		if (st === 'connected') {
			if (e.code === 'ArrowLeft') this.act('prev');
			else if (e.code === 'ArrowRight') this.act('next');
			else if (e.code === 'Enter' || e.code === 'Space') this.act('ready');
			else if (e.code === 'Escape') this.act('leave');
			else return;
		} else if (e.code === 'Escape') this.act('leave');
		else if ((e.code === 'Enter' || e.code === 'KeyC') && st === 'waiting') this.act('copy');
		else return;
		e.preventDefault();
	};

	update = (time) => {
		this.t += time.secondsPassed;
	};

	// ---------------------------------------------------------------------------- drawing
	drawWaiting(context) {
		const st = Net.status;
		const dots = '.'.repeat(1 + (Math.floor(this.t * 2) % 3));
		if (this.net.role === 'host') {
			outlinedText(context, 'PLAY WITH A FRIEND', CX, 30, 17, '#ffcc00', '#7a0a14');
			if (st !== 'waiting') {
				outlinedText(context, `Creating your room${dots}`, CX, 100, 10, '#ffffff', '#0a1030', 'center', 700);
				return;
			}
			outlinedText(context, 'YOUR ROOM CODE', CX, 56, 8, '#b8c4ff', '#0a1030', 'center', 700);
			outlinedText(context, Net.code, CX, 84, 26, '#ffffff', '#c01030');
			outlinedText(context, 'Send this link to your friend - they just open it:', CX, 106, 7, '#b8c4ff', '#0a1030', 'center', 700);
			context.save();
			context.fillStyle = 'rgba(0,0,0,.45)';
			context.fillRect(18, 113, SCENE_WIDTH - 36, 16);
			context.font = '700 7px ui-monospace, monospace';
			context.textAlign = 'center';
			context.fillStyle = '#ffe9a0';
			let link = Net.inviteLink();
			while (context.measureText(link).width > SCENE_WIDTH - 44 && link.length > 20) link = '…' + link.slice(2);
			context.fillText(link, CX, 124);
			context.restore();
			outlinedText(context, `Waiting for your friend${dots}`, CX, 192, 8, '#ffffff', '#0a1030', 'center', 700);
		} else {
			outlinedText(context, 'JOINING YOUR FRIEND', CX, 30, 17, '#ffcc00', '#7a0a14');
			outlinedText(context, `ROOM ${Net.code || ''}`, CX, 70, 14, '#ffffff', '#0a1030');
			outlinedText(context, `Connecting${dots}`, CX, 100, 10, '#b8c4ff', '#0a1030', 'center', 700);
		}
	}

	drawProblem(context) {
		const st = Net.status;
		outlinedText(context, st === 'closed' ? 'CONNECTION ENDED' : 'COULD NOT CONNECT', CX, 60, 18, '#ff6a6a', '#2a0000');
		outlinedText(context, Net.error || 'Something went wrong', CX, 92, 8, '#ffffff', '#0a1030', 'center', 700);
		if (this.net.wins[0] + this.net.wins[1] > 0)
			outlinedText(context, `Final score: you ${this.net.wins[this.net.localIndex]} - ${this.net.wins[1 - this.net.localIndex]} friend`, CX, 116, 9, '#ffe9a0', '#2a1000', 'center', 700);
	}

	drawPicker(context) {
		const net = this.net;
		const me = net.localIndex;
		outlinedText(context, 'ONLINE MATCH', CX, 24, 15, '#ffcc00', '#7a0a14');
		const score = `YOU ${net.wins[me]}  -  ${net.wins[1 - me]} FRIEND`;
		outlinedText(context, score, CX, 38, 8, '#ffe9a0', '#2a1000', 'center', 700);
		if (net.lastResult) {
			const won = net.lastResult === 'win';
			outlinedText(context, won ? 'YOU WON THE LAST FIGHT!' : 'YOUR FRIEND WON THE LAST FIGHT', CX, 50, 7.5, won ? '#35e0a0' : '#ff6a80', '#0a1030', 'center', 700);
		}
		// you
		outlinedText(context, 'YOU', 93, 66, 9, '#35e0a0', '#0a1030');
		drawPortrait(context, net.myFighter, 54, 72, 78, { border: this.ready ? '#35e0a0' : '#ffcc00' });
		outlinedText(context, FIGHTER_INFO[net.myFighter].label, 93, 163, 10, '#ffffff', '#0a1030');
		// friend
		const r = this.remote;
		outlinedText(context, 'FRIEND', 289, 66, 9, '#ff6a80', '#0a1030');
		if (r?.id) {
			drawPortrait(context, r.id, 250, 72, 78, { border: r.ready ? '#35e0a0' : '#ffffff88' });
			outlinedText(context, FIGHTER_INFO[r.id].label, 289, 163, 10, '#ffffff', '#0a1030');
		} else {
			context.fillStyle = 'rgba(255,255,255,.08)';
			context.fillRect(250, 72, 78, 78);
		}
		outlinedText(context, r?.ready ? 'READY!' : 'choosing…', 289, 172, 7, r?.ready ? '#35e0a0' : '#b8c4ff', '#0a1030', 'center', 700);
		outlinedText(context, 'VS', CX, 116, 22, '#ffffff', '#c01030');
		outlinedText(context, `ping ${Math.round(Net.rtt)} ms`, SCENE_WIDTH - 8, 214, 6.5, '#8c98cc', '#0a1030', 'right', 700);
		outlinedText(context, this.ready ? 'waiting for your friend…' : this.touch ? 'pick with ◀ ▶ then READY' : '← → pick  •  ENTER ready', CX, 172, 7, '#b8c4ff', '#0a1030', 'center', 700);
		outlinedText(context, `next arena: random in Malta (${ARENAS.length} places)`, CX, 212, 6.5, '#8c98cc', '#0a1030', 'center', 700);
	}

	draw = (context) => {
		drawBackdrop(context, this.t);
		if (!this.net) return; // leaving
		const st = Net.status;
		if (st === 'connected') this.drawPicker(context);
		else if (st === 'error' || st === 'closed') this.drawProblem(context);
		else this.drawWaiting(context);

		const pulse = (Math.sin(this.t * 5) + 1) / 2;
		for (const b of this.buttons()) {
			const primary = ['ready', 'copy', 'retry'].includes(b.id);
			drawButton(context, b, b.label, {
				pulse: primary ? pulse : 0,
				fill: b.id === 'ready' && this.ready ? '#35e0a0' : primary || b.id === 'share' ? '#ffcc00' : '#9fb6ff',
			});
		}
		if (this.toast && this.t - this.toast.t < 2.5) outlinedText(context, this.toast.text, CX, 184, 8, '#35e0a0', '#0a1030', 'center', 700);
	};
}
