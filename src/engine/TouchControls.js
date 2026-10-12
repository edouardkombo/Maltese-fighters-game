import { controls } from '../config/controls.js';
import { Control } from '../constants/controls.js';
import { SPECIALS, SPECIAL_ORDER } from '../constants/specials.js';
import { pressVirtual, releaseVirtual, releaseAllVirtual } from './InputHandler.js';
import { isTouchDevice } from '../utils/pointer.js';

// Virtual keys = Player 1's keyboard codes, so touch plays through the exact same input path.
const KB = controls[0].keyboard;
const K = {
	left: KB[Control.LEFT],
	right: KB[Control.RIGHT],
	up: KB[Control.UP],
	down: KB[Control.DOWN],
	lp: KB[Control.LIGHT_PUNCH],
	mp: KB[Control.MEDIUM_PUNCH],
	hp: KB[Control.HEAVY_PUNCH],
	lk: KB[Control.LIGHT_KICK],
	mk: KB[Control.MEDIUM_KICK],
	hk: KB[Control.HEAVY_KICK],
	mela: KB[Control.SPECIAL_MELA],
	pastizzi: KB[Control.SPECIAL_PASTIZZI],
	uwejja: KB[Control.SPECIAL_UWEJJA],
	ricotta: KB[Control.SPECIAL_RICOTTA],
};

const el = (tag, cls, html = '') => {
	const e = document.createElement(tag);
	if (cls) e.className = cls;
	if (html) e.innerHTML = html;
	return e;
};

/**
 * On-screen controller: 8-way D-pad (slide your thumb for diagonals), 3 punches, 3 kicks and the
 * four one-tap super powers (MELA / PASTIZZI / UWEJJA / RICOTTA) with their cooldowns.
 * Built once, shown only during fights, and only on touch devices (or with ?touch in the URL).
 */
class TouchControlsImpl {
	root = null;
	dpadPointer = null;
	enabled = isTouchDevice();
	specialButtons = {};

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

		// ---- right hand: super powers on top, punches and kicks below
		const right = el('div', 'tc-right-hand');
		const specials = el('div', 'tc-specials');
		for (const kind of SPECIAL_ORDER) {
			const b = el('button', `tc-btn tc-sp tc-sp-${kind}`, `<span>${SPECIALS[kind].label.replace('!', '')}</span>`);
			b.type = 'button';
			b.setAttribute('aria-label', SPECIALS[kind].label);
			this.bindButton(b, K[kind]);
			specials.appendChild(b);
			this.specialButtons[kind] = b;
		}
		right.appendChild(specials);

		const actions = el('div', 'tc-actions');
		const defs = [
			['lp', 'LP', 'tc-p', K.lp],
			['mp', 'MP', 'tc-p', K.mp],
			['hp', 'HP', 'tc-p', K.hp],
			['lk', 'LK', 'tc-k', K.lk],
			['mk', 'MK', 'tc-k', K.mk],
			['hk', 'HK', 'tc-k', K.hk],
		];
		for (const [id, label, cls, key] of defs) {
			const b = el('button', `tc-btn ${cls} tc-${id}`, label);
			b.type = 'button';
			b.setAttribute('aria-label', label);
			this.bindButton(b, key);
			actions.appendChild(b);
		}
		right.appendChild(actions);
		root.appendChild(right);

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

	/** Grey out the super powers that are cooling down (fighter = the local player's fighter). */
	updateCooldowns(fighter) {
		if (!this.root || this.root.hidden || !fighter?.cooldownLeft) return;
		for (const kind of SPECIAL_ORDER) {
			const left = fighter.cooldownLeft(kind);
			const b = this.specialButtons[kind];
			const v = left.toFixed(2);
			if (b.dataset.cd !== v) {
				b.dataset.cd = v;
				b.style.setProperty('--cd', v);
				b.classList.toggle('cooling', left > 0);
			}
		}
	}

	// ---- visibility ------------------------------------------------------------------------------
	show() {
		if (!this.enabled) return;
		this.build();
		this.root.hidden = false;
		document.body.classList.add('tc-on');
	}

	hide() {
		releaseAllVirtual();
		if (!this.root) return;
		this.root.hidden = true;
		document.body.classList.remove('tc-on');
	}
}

export const TouchControls = new TouchControlsImpl();
