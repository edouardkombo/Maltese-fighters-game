import { SCENE_WIDTH, STAGE_PADDING, STAGE_WIDTH } from '../../constants/Stage.js';
import { RENDER_SCALE } from '../../constants/game.js';

/**
 * Malta-based arenas. Valletta uses the photo backdrop; the others are painted in code once
 * (into off-screen canvases) when the fight starts, then scrolled with parallax.
 *
 * Every layer is drawn so it always covers the whole screen, whatever the camera position
 * (the old Valletta backdrop left the right edge uncovered when the camera went far right).
 */

const FLOOR_Y = 200; // screen y where the fighting floor starts
const FAR_W = 470; // far layer width (scrolls slowly)
const MID_W = 576; // mid layer width (scrolls faster)
const LAYER_H = FLOOR_Y;

export const ARENAS = [
	{ id: 'valletta', name: 'VALLETTA', sub: 'Grand Harbour' },
	{ id: 'mdina', name: 'MDINA', sub: 'The Silent City at sunset' },
	{ id: 'marsaxlokk', name: 'MARSAXLOKK', sub: 'The luzzu harbour' },
	{ id: 'gozo', name: 'GOZO', sub: 'Festa night at the Citadel' },
	{ id: 'comino', name: 'COMINO', sub: 'The Blue Lagoon' },
];

/** Random arena, different from `previous` when possible. */
export const pickArena = (previous = -1, random = Math.random) => {
	let i = Math.floor(random() * ARENAS.length);
	if (i === previous) i = (i + 1 + Math.floor(random() * (ARENAS.length - 1))) % ARENAS.length;
	return i;
};

// ------------------------------------------------------------------------------------------ helpers
const rng = (seed) => () => {
	seed |= 0;
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const makeLayer = (w, h, paint) => {
	const c = document.createElement('canvas');
	c.width = Math.ceil(w * RENDER_SCALE);
	c.height = Math.ceil(h * RENDER_SCALE);
	const ctx = c.getContext('2d');
	ctx.scale(RENDER_SCALE, RENDER_SCALE);
	paint(ctx, w, h);
	return c;
};

const vgrad = (ctx, x, y0, w, y1, stops) => {
	const g = ctx.createLinearGradient(0, y0, 0, y1);
	stops.forEach(([o, c]) => g.addColorStop(o, c));
	ctx.fillStyle = g;
	ctx.fillRect(x, y0, w, y1 - y0);
};

const poly = (ctx, pts, fill) => {
	ctx.beginPath();
	ctx.moveTo(pts[0][0], pts[0][1]);
	for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
	ctx.closePath();
	ctx.fillStyle = fill;
	ctx.fill();
};

/** Rolling hills silhouette between yTop and yBase. */
const hills = (ctx, w, yBase, amp, yTop, color, r, bumps = 5) => {
	ctx.beginPath();
	ctx.moveTo(0, yBase);
	const phase = r() * 10;
	for (let x = 0; x <= w; x += 4) {
		const y = yTop + amp * (0.5 + 0.5 * Math.sin(x / (w / bumps) + phase) * Math.sin(x / 37 + phase * 2));
		ctx.lineTo(x, y);
	}
	ctx.lineTo(w, yBase);
	ctx.closePath();
	ctx.fillStyle = color;
	ctx.fill();
};

const maltaFlag = (ctx, x, y, h = 30, wave = 0) => {
	ctx.fillStyle = '#5a4a3a';
	ctx.fillRect(x, y, 1, h);
	const fw = 12, fh = 8;
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(x + 1, y + wave, fw / 2, fh);
	ctx.fillStyle = '#cf142b';
	ctx.fillRect(x + 1 + fw / 2, y + wave, fw / 2, fh);
	ctx.fillStyle = '#9aa0a8';
	ctx.fillRect(x + 2, y + 1 + wave, 1.5, 1.5); // the George Cross
};

/** A Maltese limestone house front with windows and, sometimes, a coloured wooden balcony (gallarija). */
const house = (ctx, x, yTop, w, h, stone, r, lit = null) => {
	ctx.fillStyle = stone;
	ctx.fillRect(x, yTop, w, h);
	ctx.fillStyle = 'rgba(0,0,0,.10)';
	ctx.fillRect(x + w - 2, yTop, 2, h);
	ctx.fillStyle = 'rgba(255,255,255,.12)';
	ctx.fillRect(x, yTop, w, 1.5);
	const floors = Math.max(1, Math.floor(h / 13));
	const cols = Math.max(1, Math.floor(w / 9));
	for (let f = 0; f < floors; f++) {
		for (let c = 0; c < cols; c++) {
			const wx = x + 3 + c * ((w - 6) / cols) + ((w - 6) / cols - 3) / 2;
			const wy = yTop + 4 + f * 13;
			if (wy + 6 > yTop + h) continue;
			ctx.fillStyle = lit && r() < lit ? '#ffcf6a' : 'rgba(40,30,30,.65)';
			ctx.fillRect(wx, wy, 3, 5.5);
		}
	}
	if (w > 14 && h > 20 && r() < 0.55) {
		const colors = ['#2f7a3d', '#b3262e', '#2b5aa8', '#e0b030', '#6a3d8a'];
		const bw = Math.min(w - 4, 12);
		const bx = x + (w - bw) / 2;
		const by = yTop + 6;
		ctx.fillStyle = colors[Math.floor(r() * colors.length)];
		ctx.fillRect(bx, by, bw, 9);
		ctx.fillStyle = lit ? 'rgba(255,210,120,.85)' : 'rgba(210,235,255,.55)';
		for (let i = 0; i < 3; i++) ctx.fillRect(bx + 1.5 + i * (bw - 3) / 3, by + 1.5, (bw - 3) / 3 - 1, 4);
		ctx.fillStyle = 'rgba(0,0,0,.25)';
		ctx.fillRect(bx, by + 9, bw, 1.5);
	}
};

/** Church: facade, two bell towers and a dome. */
const church = (ctx, cx, baseY, s, stone, domeColor, shade = 'rgba(0,0,0,.18)', lit = false) => {
	const fw = 34 * s, fh = 30 * s;
	// dome behind the facade
	ctx.fillStyle = domeColor;
	ctx.beginPath();
	ctx.ellipse(cx, baseY - fh - 2 * s, 11 * s, 13 * s, 0, Math.PI, 0);
	ctx.fill();
	ctx.fillStyle = stone;
	ctx.fillRect(cx - 9 * s, baseY - fh - 3 * s, 18 * s, 3 * s); // drum
	ctx.fillStyle = domeColor;
	ctx.fillRect(cx - 1.5 * s, baseY - fh - 22 * s, 3 * s, 8 * s); // lantern
	ctx.fillStyle = stone;
	ctx.fillRect(cx - 0.5 * s, baseY - fh - 27 * s, 1 * s, 5 * s);
	ctx.fillRect(cx - 2 * s, baseY - fh - 25.5 * s, 4 * s, 1 * s);
	// facade
	ctx.fillStyle = stone;
	ctx.fillRect(cx - fw / 2, baseY - fh, fw, fh);
	poly(ctx, [[cx - fw / 4, baseY - fh], [cx, baseY - fh - 7 * s], [cx + fw / 4, baseY - fh]], stone);
	// towers
	for (const side of [-1, 1]) {
		const tx = cx + side * (fw / 2) - (side > 0 ? 0 : 8 * s);
		ctx.fillStyle = stone;
		ctx.fillRect(tx, baseY - fh - 16 * s, 8 * s, fh + 16 * s);
		ctx.fillStyle = domeColor;
		ctx.beginPath();
		ctx.ellipse(tx + 4 * s, baseY - fh - 16 * s, 4 * s, 5 * s, 0, Math.PI, 0);
		ctx.fill();
		ctx.fillStyle = lit ? '#ffd27a' : 'rgba(40,30,30,.6)';
		ctx.fillRect(tx + 2.5 * s, baseY - fh - 12 * s, 3 * s, 5 * s); // belfry
		ctx.fillStyle = '#e8e2d0';
		ctx.beginPath();
		ctx.arc(tx + 4 * s, baseY - fh - 2 * s, 1.8 * s, 0, Math.PI * 2); // clock
		ctx.fill();
	}
	ctx.fillStyle = shade;
	ctx.fillRect(cx + fw / 2 - 4 * s, baseY - fh, 4 * s, fh);
	ctx.fillStyle = lit ? '#ffcf6a' : 'rgba(50,35,30,.7)';
	ctx.beginPath();
	ctx.ellipse(cx, baseY - 8 * s, 4 * s, 8 * s, 0, Math.PI, 0);
	ctx.fill();
	ctx.fillRect(cx - 4 * s, baseY - 8 * s, 8 * s, 8 * s);
};

const luzzu = (ctx, x, y, s, hull, stripe, dir = 1) => {
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(s * dir, s);
	// hull
	ctx.beginPath();
	ctx.moveTo(-22, -6);
	ctx.quadraticCurveTo(-24, -14, -20, -16); // tall stern post
	ctx.lineTo(-17, -7);
	ctx.lineTo(16, -7);
	ctx.lineTo(21, -17); // high prow
	ctx.quadraticCurveTo(24, -10, 18, 2);
	ctx.quadraticCurveTo(0, 6, -17, 2);
	ctx.closePath();
	ctx.fillStyle = hull;
	ctx.fill();
	ctx.fillStyle = stripe;
	ctx.fillRect(-18, -5, 36, 2.2);
	ctx.fillStyle = '#c8202c';
	ctx.fillRect(-17, 0, 34, 1.5);
	// eye of Osiris on the prow
	ctx.fillStyle = '#ffffff';
	ctx.beginPath();
	ctx.ellipse(14, -9, 2.6, 1.6, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = '#111';
	ctx.beginPath();
	ctx.arc(14.3, -9, 1, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = '#111';
	ctx.lineWidth = 0.6;
	ctx.beginPath();
	ctx.moveTo(11, -11);
	ctx.quadraticCurveTo(14, -12.5, 17, -10.5);
	ctx.stroke();
	// cabin + mast
	ctx.fillStyle = '#f2efe6';
	ctx.fillRect(-8, -12, 10, 5);
	ctx.fillStyle = '#5b4632';
	ctx.fillRect(-2, -30, 1, 18);
	ctx.restore();
};

// ------------------------------------------------------------------------------------------ arenas
const PAINTERS = {
	mdina: {
		far(ctx, w, h) {
			const r = rng(11);
			vgrad(ctx, 0, 0, w, h, [[0, '#2a1a4a'], [0.35, '#8a3d78'], [0.62, '#f07a4a'], [0.8, '#ffc56a'], [1, '#ffe2a0']]);
			// sun
			const sx = w * 0.62, sy = 132;
			const g = ctx.createRadialGradient(sx, sy, 4, sx, sy, 70);
			g.addColorStop(0, 'rgba(255,240,180,1)');
			g.addColorStop(0.25, 'rgba(255,200,120,.6)');
			g.addColorStop(1, 'rgba(255,160,90,0)');
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, w, h);
			ctx.fillStyle = '#fff3c4';
			ctx.beginPath();
			ctx.arc(sx, sy, 15, 0, Math.PI * 2);
			ctx.fill();
			// thin clouds
			ctx.fillStyle = 'rgba(255,190,200,.35)';
			for (let i = 0; i < 7; i++) ctx.fillRect(r() * w, 30 + r() * 70, 30 + r() * 60, 1.5 + r() * 2);
			hills(ctx, w, h, 14, 140, '#9a5a6e', r, 4);
			hills(ctx, w, h, 10, 152, '#6e4560', r, 6);
			// Mdina's skyline on its hill, far away
			const base = 150;
			ctx.fillStyle = '#5a3550';
			for (let x = 40; x < w - 40; x += 6 + r() * 8) {
				const bh = 6 + r() * 10;
				ctx.fillRect(x, base - bh, 7 + r() * 6, bh);
			}
			church(ctx, w * 0.42, base, 0.55, '#5a3550', '#4a2a45');
		},
		mid(ctx, w, h) {
			const r = rng(21);
			// bastion wall with a sloping base
			const top = 118;
			const stone = '#d79a5e';
			poly(ctx, [[0, top], [w, top], [w, h], [0, h]], stone);
			const g = ctx.createLinearGradient(0, top, 0, h);
			g.addColorStop(0, 'rgba(255,210,150,.35)');
			g.addColorStop(1, 'rgba(90,40,30,.35)');
			ctx.fillStyle = g;
			ctx.fillRect(0, top, w, h - top);
			// stone courses
			ctx.strokeStyle = 'rgba(120,60,30,.25)';
			ctx.lineWidth = 0.6;
			for (let y = top + 6; y < h; y += 6) {
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(w, y);
				ctx.stroke();
				for (let x = (y / 6) % 2 ? 0 : 7; x < w; x += 14) {
					ctx.beginPath();
					ctx.moveTo(x, y - 6);
					ctx.lineTo(x, y);
					ctx.stroke();
				}
			}
			// buildings on top of the walls
			let x = -4;
			while (x < w) {
				const bw = 14 + r() * 22;
				const bh = 18 + r() * 26;
				if (Math.abs(x + bw / 2 - w * 0.5) > 34) house(ctx, x, top - bh, bw, bh, ['#e3b27a', '#d9a46c', '#eabf88'][Math.floor(r() * 3)], r);
				x += bw;
			}
			church(ctx, w * 0.5, top, 1.1, '#e6b47c', '#a8442e');
			// the city gate
			ctx.fillStyle = '#b97a45';
			ctx.fillRect(w * 0.18, top + 18, 30, h - top - 18);
			ctx.fillStyle = '#3a2418';
			ctx.beginPath();
			ctx.ellipse(w * 0.18 + 15, top + 42, 8, 12, 0, Math.PI, 0);
			ctx.fill();
			ctx.fillRect(w * 0.18 + 7, top + 42, 16, h - top - 42);
			// sentry box (gardjola) on the corner
			ctx.fillStyle = '#e3b27a';
			ctx.fillRect(w * 0.82, top - 12, 10, 12);
			ctx.beginPath();
			ctx.moveTo(w * 0.82 - 1, top - 12);
			ctx.lineTo(w * 0.82 + 5, top - 19);
			ctx.lineTo(w * 0.82 + 11, top - 12);
			ctx.fill();
			maltaFlag(ctx, w * 0.3, top - 70, 32);
			maltaFlag(ctx, w * 0.7, top - 62, 26);
			// low parapet right behind the fighters
			ctx.fillStyle = '#c98f55';
			ctx.fillRect(0, h - 8, w, 8);
			ctx.fillStyle = 'rgba(255,220,170,.4)';
			ctx.fillRect(0, h - 8, w, 1.5);
		},
	},

	marsaxlokk: {
		far(ctx, w, h) {
			const r = rng(31);
			vgrad(ctx, 0, 0, w, 128, [[0, '#4aa2e6'], [0.7, '#a8dcff'], [1, '#e2f4ff']]);
			ctx.fillStyle = 'rgba(255,255,255,.9)';
			for (let i = 0; i < 6; i++) {
				const cx = r() * w, cy = 20 + r() * 50, s = 8 + r() * 10;
				for (let k = 0; k < 4; k++) {
					ctx.beginPath();
					ctx.ellipse(cx + k * s * 0.8, cy + (k % 2) * 2, s, s * 0.55, 0, 0, Math.PI * 2);
					ctx.fill();
				}
			}
			// the far shore: houses + the twin-towered parish church
			hills(ctx, w, 132, 6, 112, '#c9b48a', r, 3);
			let x = 0;
			while (x < w) {
				const bw = 8 + r() * 12, bh = 6 + r() * 10;
				ctx.fillStyle = ['#e6d3a6', '#dcc596', '#efe0b8'][Math.floor(r() * 3)];
				ctx.fillRect(x, 126 - bh, bw, bh);
				ctx.fillStyle = 'rgba(70,60,50,.5)';
				ctx.fillRect(x + 2, 126 - bh + 3, 2, 3);
				x += bw;
			}
			church(ctx, w * 0.55, 126, 0.6, '#efe0b8', '#8a7f6a');
			// sea
			vgrad(ctx, 0, 126, w, h, [[0, '#1e7fb8'], [1, '#2aa6d6']]);
		},
		mid(ctx, w, h) {
			// stone quay edge with bollards and fishing nets
			vgrad(ctx, 0, h - 12, w, h, [[0, '#d8c79c'], [1, '#b49e70']]);
			ctx.fillStyle = 'rgba(0,0,0,.18)';
			ctx.fillRect(0, h - 12, w, 1.2);
			for (let x = 20; x < w; x += 96) {
				ctx.fillStyle = '#2b2b2b';
				ctx.fillRect(x, h - 18, 6, 7);
				ctx.fillRect(x - 1, h - 19, 8, 2);
			}
			const nets = [['#e0552e', 70], ['#2a8fd0', 260], ['#3aa860', 430]];
			for (const [c, nx] of nets) {
				ctx.fillStyle = c;
				ctx.beginPath();
				ctx.ellipse(nx, h - 13, 16, 5, 0, Math.PI, 0);
				ctx.fill();
				ctx.strokeStyle = 'rgba(0,0,0,.25)';
				ctx.lineWidth = 0.4;
				for (let i = -14; i < 16; i += 3) {
					ctx.beginPath();
					ctx.moveTo(nx + i, h - 13);
					ctx.lineTo(nx + i + 2, h - 17);
					ctx.stroke();
				}
			}
		},
		live(ctx, t, offFar, offMid) {
			// sea shimmer
			ctx.fillStyle = 'rgba(255,255,255,.35)';
			for (let i = 0; i < 26; i++) {
				const y = 132 + ((i * 17) % 60);
				const x = ((i * 53 + t * (8 + (i % 3) * 4)) % (FAR_W + 40)) - 20 + offFar;
				ctx.fillRect(x, y, 5 + (i % 4) * 2, 0.8);
			}
			// bobbing luzzu boats (mid-layer parallax)
			const far = [
				[40, 146, 0.7, '#d8342c', '#f2c230', -1],
				[150, 149, 0.75, '#2e8b57', '#f2c230', 1],
				[255, 144, 0.65, '#f2c230', '#2a64c8', 1],
				[370, 148, 0.7, '#2a64c8', '#e8c030', -1],
				[450, 145, 0.7, '#2e8b57', '#d8342c', 1],
			];
			const near = [
				[70, 180, 1.7, '#f2c230', '#2a64c8', 1],
				[250, 184, 1.85, '#2e8b57', '#e8c030', -1],
				[440, 179, 1.7, '#2a64c8', '#f2c230', 1],
				[560, 183, 1.8, '#d8342c', '#2a64c8', -1],
			];
			for (const [i, [bx, by, s, hull, stripe, d]] of far.entries()) {
				const bob = Math.sin(t * 1.4 + i * 2.1) * 0.8;
				luzzu(ctx, bx + (offFar + offMid) / 2, by + bob, s, hull, stripe, d);
			}
			for (const [i, [bx, by, s, hull, stripe, d]] of near.entries()) {
				const bob = Math.sin(t * 1.6 + i * 1.3) * 1.6;
				luzzu(ctx, bx + offMid, by + bob, s, hull, stripe, d);
			}
		},
	},

	gozo: {
		far(ctx, w, h) {
			const r = rng(41);
			vgrad(ctx, 0, 0, w, h, [[0, '#040a22'], [0.55, '#14204e'], [0.85, '#3a2f63'], [1, '#55407a']]);
			for (let i = 0; i < 120; i++) {
				ctx.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`;
				const s = r() < 0.1 ? 1.4 : 0.8;
				ctx.fillRect(r() * w, r() * 110, s, s);
			}
			// moon
			ctx.fillStyle = '#fff6d8';
			ctx.beginPath();
			ctx.arc(w * 0.82, 34, 10, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = '#0a1230';
			ctx.beginPath();
			ctx.arc(w * 0.82 + 4, 31, 9, 0, Math.PI * 2);
			ctx.fill();
			// the hill with the Cittadella
			const cx = w * 0.45;
			ctx.fillStyle = '#16203e';
			ctx.beginPath();
			ctx.moveTo(0, h);
			ctx.lineTo(0, 160);
			ctx.quadraticCurveTo(cx - 90, 150, cx - 60, 112);
			ctx.lineTo(cx + 70, 112);
			ctx.quadraticCurveTo(cx + 110, 150, w, 158);
			ctx.lineTo(w, h);
			ctx.fill();
			// floodlit walls
			const wall = ctx.createLinearGradient(0, 88, 0, 114);
			wall.addColorStop(0, '#f6c672');
			wall.addColorStop(1, '#b07a3a');
			ctx.fillStyle = wall;
			ctx.fillRect(cx - 62, 96, 134, 18);
			for (let x = cx - 62; x < cx + 72; x += 6) ctx.fillRect(x, 93, 3, 3);
			church(ctx, cx + 5, 96, 0.75, '#f3c06e', '#c98a3e', 'rgba(0,0,0,.2)', true);
			// village lights at the foot of the hill
			for (let i = 0; i < 70; i++) {
				ctx.fillStyle = r() < 0.5 ? '#ffd27a' : '#ffb04a';
				ctx.fillRect(r() * w, 150 + r() * 45, 1.2, 1.2);
			}
		},
		mid(ctx, w, h) {
			const r = rng(51);
			// village street: houses with lit windows
			let x = -6;
			while (x < w) {
				const bw = 16 + r() * 22;
				const bh = 34 + r() * 30;
				house(ctx, x, h - bh, bw, bh, ['#3a3350', '#423a5c', '#352f4a'][Math.floor(r() * 3)], r, 0.55);
				x += bw;
			}
			// festa light strings hanging across the street
			const poles = [10, 150, 290, 430, 566];
			for (const px of poles) {
				ctx.fillStyle = '#2a2236';
				ctx.fillRect(px - 1, 30, 2, h - 30);
				// pavaljun (festa banner)
				ctx.fillStyle = '#c0182e';
				ctx.fillRect(px + 1, 34, 7, 28);
				ctx.fillStyle = '#f2c230';
				ctx.fillRect(px + 1, 34, 7, 3);
				ctx.fillRect(px + 1, 59, 7, 3);
			}
			const bulbs = ['#ff5a5a', '#ffe060', '#5ae0ff', '#7aff8a', '#ff9af0'];
			for (let p = 0; p < poles.length - 1; p++) {
				const x0 = poles[p], x1 = poles[p + 1];
				for (const [row, sag] of [[32, 26], [44, 18]]) {
					ctx.strokeStyle = 'rgba(30,25,40,.9)';
					ctx.lineWidth = 0.5;
					ctx.beginPath();
					ctx.moveTo(x0, row);
					ctx.quadraticCurveTo((x0 + x1) / 2, row + sag * 2, x1, row);
					ctx.stroke();
					for (let k = 1; k < 14; k++) {
						const tt = k / 14;
						const bx = (1 - tt) * (1 - tt) * x0 + 2 * (1 - tt) * tt * ((x0 + x1) / 2) + tt * tt * x1;
						const by = (1 - tt) * (1 - tt) * row + 2 * (1 - tt) * tt * (row + sag * 2) + tt * tt * row;
						const c = bulbs[(k + p) % bulbs.length];
						ctx.fillStyle = c;
						ctx.beginPath();
						ctx.arc(bx, by + 1, 1.1, 0, Math.PI * 2);
						ctx.fill();
						ctx.globalAlpha = 0.25;
						ctx.beginPath();
						ctx.arc(bx, by + 1, 3, 0, Math.PI * 2);
						ctx.fill();
						ctx.globalAlpha = 1;
					}
				}
			}
		},
		live(ctx, t, offFar) {
			// fireworks over the Citadel: a new burst every ~1.3 s, deterministic from the time
			for (let n = 0; n < 3; n++) {
				const cycle = 1.9;
				const tt = t + n * 0.63;
				const id = Math.floor(tt / cycle) * 3 + n;
				const age = (tt % cycle) / cycle;
				const r = rng(id * 7919);
				const bx = 40 + r() * (FAR_W - 80) + offFar;
				const by = 25 + r() * 45;
				const hue = ['#ff5a5a', '#ffe060', '#5ae0ff', '#ff9af0', '#9aff7a'][id % 5];
				if (age < 0.18) {
					ctx.fillStyle = 'rgba(255,230,180,.9)';
					ctx.fillRect(bx, by + 60 * (1 - age / 0.18), 1, 4);
					continue;
				}
				const k = (age - 0.18) / 0.82;
				ctx.globalAlpha = Math.max(0, 1 - k);
				ctx.fillStyle = hue;
				for (let i = 0; i < 16; i++) {
					const a = (i / 16) * Math.PI * 2;
					const rad = 4 + k * 22;
					ctx.fillRect(bx + Math.cos(a) * rad, by + Math.sin(a) * rad + k * k * 8, 1.4, 1.4);
				}
				ctx.globalAlpha = 1;
			}
		},
	},

	comino: {
		far(ctx, w, h) {
			const r = rng(61);
			vgrad(ctx, 0, 0, w, 120, [[0, '#2f9ff0'], [1, '#bfe9ff']]);
			ctx.fillStyle = 'rgba(255,255,255,.85)';
			for (let i = 0; i < 4; i++) {
				const cx = r() * w, cy = 18 + r() * 40, s = 10 + r() * 8;
				for (let k = 0; k < 5; k++) {
					ctx.beginPath();
					ctx.ellipse(cx + k * s * 0.7, cy + (k % 2) * 2.5, s, s * 0.5, 0, 0, Math.PI * 2);
					ctx.fill();
				}
			}
			// Gozo far away
			hills(ctx, w, 122, 8, 106, '#8fa8b8', r, 3);
			// the deep sea, then the lagoon
			vgrad(ctx, 0, 118, w, h, [[0, '#0b5f9e'], [0.4, '#0f8fbf'], [0.75, '#22c6cc'], [1, '#8cf0e0']]);
			// Santa Marija tower on its cliff
			const tx = w * 0.7;
			poly(ctx, [[tx - 60, 124], [tx - 30, 100], [tx + 40, 98], [tx + 70, 124]], '#d6c08a');
			ctx.fillStyle = '#e8d6a2';
			ctx.fillRect(tx - 9, 78, 18, 22);
			ctx.fillStyle = '#c9b07a';
			ctx.fillRect(tx - 11, 76, 22, 3);
			for (let i = 0; i < 4; i++) ctx.fillRect(tx - 11 + i * 6.4, 73, 3, 3);
			ctx.fillStyle = 'rgba(60,40,30,.6)';
			ctx.fillRect(tx - 2, 84, 4, 6);
			maltaFlag(ctx, tx + 6, 58, 18);
		},
		mid(ctx, w, h) {
			const r = rng(71);
			// limestone rocks on both sides of the lagoon
			const rock = (x0, x1, top, dir) => {
				ctx.beginPath();
				ctx.moveTo(x0, h);
				let y = top;
				for (let x = x0; dir > 0 ? x <= x1 : x >= x1; x += 6 * dir) {
					y = top + r() * 10 + Math.abs(x - x0) * 0.22;
					ctx.lineTo(x, y);
				}
				ctx.lineTo(x1, h);
				ctx.closePath();
				const g = ctx.createLinearGradient(0, top, 0, h);
				g.addColorStop(0, '#f0dca4');
				g.addColorStop(1, '#b89a62');
				ctx.fillStyle = g;
				ctx.fill();
				ctx.strokeStyle = 'rgba(120,90,50,.35)';
				ctx.lineWidth = 0.6;
				for (let i = 0; i < 18; i++) {
					const sx = x0 + (x1 - x0) * r();
					const sy = top + 20 + r() * (h - top - 20);
					ctx.beginPath();
					ctx.moveTo(sx, sy);
					ctx.lineTo(sx + 6 * dir, sy + 3);
					ctx.stroke();
				}
			};
			rock(0, 165, 112, 1);
			rock(w, w - 175, 106, -1);
			// a tourist boat moored in the lagoon
			luzzu(ctx, w * 0.42, 176, 1.25, '#ffffff', '#2a8fd0', 1);
			// beach umbrellas
			for (const [ux, c] of [[150, '#e64a3a'], [205, '#f2c230'], [380, '#2a8fd0']]) {
				ctx.fillStyle = '#6b5a40';
				ctx.fillRect(ux, h - 22, 1, 22);
				ctx.fillStyle = c;
				ctx.beginPath();
				ctx.ellipse(ux, h - 22, 12, 5, 0, Math.PI, 0);
				ctx.fill();
			}
		},
		live(ctx, t, offFar) {
			ctx.fillStyle = 'rgba(255,255,255,.55)';
			for (let i = 0; i < 30; i++) {
				const y = 124 + ((i * 13) % 70);
				const x = ((i * 61 + t * (5 + (i % 4) * 3)) % (FAR_W + 30)) - 15 + offFar;
				const tw = (Math.sin(t * 3 + i) + 1) / 2;
				ctx.globalAlpha = 0.3 + tw * 0.5;
				ctx.fillRect(x, y, 3 + (i % 3) * 2, 0.8);
			}
			ctx.globalAlpha = 1;
		},
	},
};

// ------------------------------------------------------------------------------------------ floors
const sandTile = () =>
	makeLayer(SCENE_WIDTH, 30, (ctx, w, h) => {
		const r = rng(5);
		vgrad(ctx, 0, 0, w, h, [[0, '#f3dcaa'], [1, '#d9b97c']]);
		for (let i = 0; i < 900; i++) {
			ctx.fillStyle = r() < 0.5 ? 'rgba(160,120,70,.35)' : 'rgba(255,250,230,.5)';
			ctx.fillRect(r() * w, r() * h, 0.7, 0.7);
		}
		// wet edge of the lagoon
		ctx.fillStyle = 'rgba(120,200,210,.35)';
		ctx.fillRect(0, 0, w, 1.5);
	});

const FLOOR_TINT = {
	valletta: null,
	mdina: 'rgba(255,150,80,.18)',
	marsaxlokk: null,
	gozo: 'rgba(20,20,70,.5)',
	comino: 'sand',
};

// ------------------------------------------------------------------------------------------ stage
export class MaltaStage {
	photo = document.getElementById('StageImage');
	floor = document.getElementById('FloorImage');
	t = 0;

	constructor(index = 0) {
		this.arena = ARENAS[index] || ARENAS[0];
		const painter = PAINTERS[this.arena.id];
		if (painter) {
			this.far = makeLayer(FAR_W, LAYER_H, painter.far);
			this.mid = makeLayer(MID_W, LAYER_H, painter.mid);
			this.live = painter.live;
		}
		if (FLOOR_TINT[this.arena.id] === 'sand') this.sand = sandTile();
	}

	update = (time) => {
		this.t += time.secondsPassed;
	};

	/** 0 when the camera is fully left, 1 when fully right. */
	progress = (camera) => {
		const range = STAGE_WIDTH - SCENE_WIDTH;
		const p = ((camera?.position?.x ?? STAGE_PADDING) - STAGE_PADDING) / range;
		return Math.min(1, Math.max(0, p));
	};

	drawBackground = (context, camera) => {
		const p = this.progress(camera);
		context.imageSmoothingEnabled = true;
		context.imageSmoothingQuality = 'high';
		if (this.far) {
			const offFar = -p * (FAR_W - SCENE_WIDTH);
			const offMid = -p * (MID_W - SCENE_WIDTH);
			context.drawImage(this.far, offFar, 0, FAR_W, LAYER_H);
			this.live?.(context, this.t, offFar, offMid);
			context.drawImage(this.mid, offMid, 0, MID_W, LAYER_H);
		} else {
			this.drawPhoto(context, p);
		}
		context.imageSmoothingEnabled = false;
		this.drawFloor(context, camera);
	};

	drawPhoto = (context, p) => {
		const img = this.photo;
		if (!img || !img.complete || !img.naturalWidth) {
			context.fillStyle = '#1a3a5c';
			context.fillRect(0, 0, SCENE_WIDTH, 224);
			return;
		}
		const scaleY = 224 / img.naturalHeight;
		const drawW = Math.max(SCENE_WIDTH, img.naturalWidth * scaleY);
		context.drawImage(img, -p * (drawW - SCENE_WIDTH), 0, drawW, 224);
	};

	// nothing sits in front of the fighters (the floor is part of the background so feet are never covered)
	drawForeground = () => {};

	drawFloor = (context, camera) => {
		const camX = camera?.position?.x || 0;
		const tileSrc = this.sand || this.floor;
		if (!tileSrc || (tileSrc === this.floor && (!this.floor.complete || !this.floor.naturalWidth))) {
			context.fillStyle = '#9a8660';
			context.fillRect(0, FLOOR_Y, SCENE_WIDTH, 24);
			return;
		}
		const tileW = SCENE_WIDTH;
		const shift = -(((camX % tileW) + tileW) % tileW);
		context.imageSmoothingEnabled = true;
		for (let x = shift; x < SCENE_WIDTH; x += tileW) {
			if (this.sand) context.drawImage(this.sand, Math.floor(x), FLOOR_Y, tileW + 1, 30);
			else context.drawImage(tileSrc, 0, 0, tileSrc.naturalWidth, 30 * 3, Math.floor(x), FLOOR_Y, tileW + 1, 30);
		}
		context.imageSmoothingEnabled = false;
		const tint = FLOOR_TINT[this.arena.id];
		if (tint && tint !== 'sand') {
			context.fillStyle = tint;
			context.fillRect(0, FLOOR_Y, SCENE_WIDTH, 30);
		}
		// soft horizon shadow where the background meets the floor
		const g = context.createLinearGradient(0, FLOOR_Y - 6, 0, FLOOR_Y + 4);
		g.addColorStop(0, 'rgba(0,0,0,0)');
		g.addColorStop(1, 'rgba(0,0,0,0.28)');
		context.fillStyle = g;
		context.fillRect(0, FLOOR_Y - 6, SCENE_WIDTH, 10);
	};
}
