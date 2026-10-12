import { gameState } from '../states/gameState.js';
import { pressVirtual, releaseVirtual, releaseAllVirtual } from './InputHandler.js';
import { isTouchDevice } from '../utils/pointer.js';

// Virtual keys = Player 1's keyboard codes, so touch plays through the exact same input path.
const K = {
	left: 'KeyA',
	right: 'KeyD',
	up: 'KeyW',
	down: 'KeyS',
	lp: 'KeyQ',
	mp: 'KeyE',
	hp: 'KeyR',
	lk: 'KeyF',
	mk: 'KeyV',
	hk: 'KeyG',
};

const el = (tag, cls, html = '') => {
	const e = document.createElement(tag);
	if (cls) e.className = cls;
	if (html) e.innerHTML = html;
	return e;
};

/**
 * On-screen controller: 8-way D-pad (slide your thumb for diagonals), 3 punches, 3 kicks and a one-tap MELA!.
 * Built once, shown only during fights, and only on touch devices (or with ?touch in the URL).
 */
class TouchControlsImpl {
	root = null;
	macroTimers = [];
	dpadPointer = null;
	enabled = isTouchDevice();

	build() {
		if (this.root) return;
		const root = el('div', 'tc');
		root.id = 'touch-controls';
		root.hidden = true;

		// ---- D-pad
		const pad = el('div', 'tc-pad');
		pad.innerHTML =
			'<i class="tc-a tc-up">▲</i><i class="tc-a tc-down">▼</i><i class="tc-a tc-left">◀</i><i class="tc-a tc-right">▶</i><b class="tc-knob"></b>';
		root.appendChild(pad);
		this.pad = pad;
		this.knob = pad.querySelector('.tc-knob');
		pad.addEventListener('pointerdown', (e) => this.padMove(e, true));
		pad.addEventListener('pointermove', (e) => this.padMove(e, false));
		for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'])
			pad.addEventListener(t, (e) => this.padEnd(e));

		// ---- action buttons
		const actions = el('div', 'tc-actions');
		const defs = [
			['mela', 'MELA!', 'tc-mela', null],
			['hp', 'HP', 'tc-p', K.hp],
			['mp', 'MP', 'tc-p', K.mp],
			['lp', 'LP', 'tc-p', K.lp],
			['hk', 'HK', 'tc-k', K.hk],
			['mk', 'MK', 'tc-k', K.mk],
			['lk', 'LK', 'tc-k', K.lk],
		];
		for (const [id, label, cls, key] of defs) {
			const b = el('button', `tc-btn ${cls} tc-${id}`, label);
			b.type = 'button';
			b.setAttribute('aria-label', label);
			if (key) this.bindButton(b, key);
			else this.bindMela(b);
			actions.appendChild(b);
		}
		root.appendChild(actions);

		// ---- fullscreen toggle (handy on phones)
		const fs = el('button', 'tc-fs', '⛶');
		fs.type = 'button';
		fs.setAttribute('aria-label', 'Fullscreen');
		fs.hidden = true;
		fs.addEventListener('click', () => {
			if (document.fullscreenElement) document.exitFullscreen?.();
			else document.documentElement.requestFullscreen?.().catch(() => {});
		});
		document.body.appendChild(fs);
		this.fs = fs;

		document.body.appendChild(root);
		this.root = root;

		// no context menu / selection / scrolling while playing
		root.addEventListener('contextmenu', (e) => e.preventDefault());
		root.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
	}

	bindButton(b, key) {
		const down = (e) => {
			e.preventDefault();
			b.setPointerCapture?.(e.pointerId);
			b.classList.add('on');
			pressVirtual(key);
		};
		const up = () => {
			b.classList.remove('on');
			releaseVirtual(key);
		};
		b.addEventListener('pointerdown', down);
		for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(t, up);
	}

	// ---- D-pad -------------------------------------------------------------------------------
	padMove(e, start) {
		if (start) {
			this.dpadPointer = e.pointerId;
			this.pad.setPointerCapture?.(e.pointerId);
		}
		if (e.pointerId !== this.dpadPointer) return;
		e.preventDefault();
		const r = this.pad.getBoundingClientRect();
		const cx = r.left + r.width / 2;
		const cy = r.top + r.height / 2;
		const dx = e.clientX - cx;
		const dy = e.clientY - cy;
		const radius = r.width / 2;
		const dead = radius * 0.2;
		const thr = radius * 0.26;
		const want = {
			[K.left]: dx < -thr || (Math.abs(dx) > dead && dx < 0 && Math.abs(dx) > Math.abs(dy) * 0.55),
			[K.right]: dx > thr || (Math.abs(dx) > dead && dx > 0 && Math.abs(dx) > Math.abs(dy) * 0.55),
			[K.up]: dy < -thr && Math.abs(dy) > dead,
			[K.down]: dy > thr && Math.abs(dy) > dead,
		};
		for (const [code, on] of Object.entries(want)) {
			if (on) pressVirtual(code);
			else releaseVirtual(code);
		}
		// visual feedback: knob follows the thumb inside the pad
		const m = Math.hypot(dx, dy) || 1;
		const k = Math.min(1, (radius * 0.62) / m);
		this.knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
		this.pad.classList.toggle('active', true);
	}

	padEnd(e) {
		if (e.pointerId !== this.dpadPointer) return;
		this.dpadPointer = null;
		for (const code of [K.left, K.right, K.up, K.down]) releaseVirtual(code);
		this.knob.style.transform = '';
		this.pad.classList.remove('active');
	}

	// ---- one-tap special (down, down+forward, forward, punch) ---------------------------------------
	bindMela(b) {
		b.addEventListener('pointerdown', (e) => {
			e.preventDefault();
			b.classList.add('on');
			setTimeout(() => b.classList.remove('on'), 160);
			this.runMela();
		});
	}

	runMela() {
		if (this.macroTimers.length) return; // already running
		const me = gameState.fighters[0]?.instance;
		const fwd = me && me.direction < 0 ? K.left : K.right;
		const steps = [
			[0, [K.down]],
			[90, [K.down, fwd]],
			[180, [fwd]],
			[270, [fwd, K.mp]],
			[430, []],
		];
		for (const [t, keys] of steps) {
			this.macroTimers.push(
				setTimeout(() => {
					for (const code of [K.down, K.left, K.right, K.mp]) {
						if (keys.includes(code)) pressVirtual(code);
						else releaseVirtual(code);
					}
					if (t === 430) this.macroTimers = [];
				}, t)
			);
		}
	}

	// ---- visibility ------------------------------------------------------------------------------
	show() {
		if (!this.enabled) return;
		this.build();
		this.root.hidden = false;
		this.fs.hidden = !document.documentElement.requestFullscreen;
		document.body.classList.add('tc-on');
	}

	hide() {
		this.macroTimers.forEach(clearTimeout);
		this.macroTimers = [];
		releaseAllVirtual();
		if (!this.root) return;
		this.root.hidden = true;
		this.fs.hidden = true;
		document.body.classList.remove('tc-on');
	}
}

export const TouchControls = new TouchControlsImpl();
