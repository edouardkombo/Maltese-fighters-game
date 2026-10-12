/**
 * ICHI - the fire-fox spirit, drawn entirely with canvas paths.
 * Fierce but on the good side: narrowed glowing eyes, a confident fang grin, swept-back ears,
 * a mane of flames, three blue spirit-fire tails, and Lou's glowing triangle on the forehead.
 *
 * All coordinates are game pixels, origin = between the feet, facing right (+x = forward).
 */

const C = {
	fur: '#e8561c',
	furLight: '#ff8a2a',
	furDark: '#9c2a0a',
	outline: '#3a0d04',
	cream: '#fff0d8',
	black: '#1a0a08',
	eye: '#ffd23a',
	blue: '#3ab0ff',
	blueLight: '#b8ecff',
	mark: '#fff6a0',
};

const lerp = (a, b, k) => a + (b - a) * k;

/** A thick limb: dark outline stroke, then fur stroke on top. */
const limb = (ctx, pts, w, color = C.fur) => {
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	for (const [col, width] of [[C.outline, w + 2], [color, w]]) {
		ctx.strokeStyle = col;
		ctx.lineWidth = width;
		ctx.beginPath();
		ctx.moveTo(pts[0][0], pts[0][1]);
		for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
		ctx.stroke();
	}
};

const paw = (ctx, x, y, r = 3.6, fire = 0) => {
	ctx.fillStyle = C.black;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fill();
	// claws
	ctx.fillStyle = C.cream;
	for (let i = -1; i <= 1; i++) ctx.fillRect(x + r - 0.5, y + i * 1.6 - 0.4, 1.8, 0.8);
	if (fire > 0) flameBurst(ctx, x + 4, y, 6 + fire * 6, fire);
};

/** Teardrop flame tongue pointing up (rotation in radians). */
const flame = (ctx, x, y, h, w, rot, inner = C.eye, outer = C.furLight) => {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(rot);
	const g = ctx.createLinearGradient(0, 0, 0, -h);
	g.addColorStop(0, inner);
	g.addColorStop(1, outer);
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.moveTo(-w, 0);
	ctx.quadraticCurveTo(-w, -h * 0.6, 0, -h);
	ctx.quadraticCurveTo(w, -h * 0.6, w, 0);
	ctx.quadraticCurveTo(0, w * 0.8, -w, 0);
	ctx.fill();
	ctx.restore();
};

/** Fiery claw-slash where a hit lands. */
const flameBurst = (ctx, x, y, r, k = 1) => {
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	const g = ctx.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(255,250,200,${0.9 * k})`);
	g.addColorStop(0.4, `rgba(255,150,40,${0.7 * k})`);
	g.addColorStop(1, 'rgba(255,60,0,0)');
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
	// three claw marks
	ctx.strokeStyle = `rgba(255,255,230,${k})`;
	ctx.lineWidth = 1.2;
	ctx.lineCap = 'round';
	for (let i = -1; i <= 1; i++) {
		ctx.beginPath();
		ctx.moveTo(x - r * 0.5, y + i * 3 - r * 0.3);
		ctx.quadraticCurveTo(x, y + i * 3, x + r * 0.6, y + i * 3 + r * 0.35);
		ctx.stroke();
	}
};

/** One of the three spirit tails: orange fur fading into blue fire. */
const tail = (ctx, x, y, len, angle, sway, t, i) => {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(angle);
	const bend = Math.sin(t * 3 + i * 1.7) * 6 + sway;
	const tipX = -len, tipY = -len * 0.25 + bend;
	const g = ctx.createLinearGradient(0, 0, tipX, tipY);
	g.addColorStop(0, C.fur);
	g.addColorStop(0.55, C.furLight);
	g.addColorStop(0.8, C.blue);
	g.addColorStop(1, C.blueLight);
	ctx.fillStyle = g;
	ctx.strokeStyle = C.outline;
	ctx.lineWidth = 0.8;
	ctx.beginPath();
	ctx.moveTo(0, -3);
	ctx.quadraticCurveTo(-len * 0.5, -len * 0.45 + bend, tipX, tipY);
	// spiky flame tip
	ctx.lineTo(tipX - 4, tipY - 5);
	ctx.lineTo(tipX + 2, tipY - 1);
	ctx.lineTo(tipX - 5, tipY + 3);
	ctx.quadraticCurveTo(-len * 0.45, -len * 0.05 + bend, 0, 3);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.restore();
};

/**
 * The head, centred on (0,0), facing right.
 * mood: 'fierce' | 'roar' | 'hurt' | 'ko' | 'happy'
 */
export const drawIchiHead = (ctx, mood = 'fierce', t = 0) => {
	// flame mane behind the head
	for (let i = 0; i < 6; i++) {
		const a = -2.6 + i * 0.42;
		const fl = 1 + Math.sin(t * 9 + i) * 0.15;
		flame(ctx, Math.cos(a) * 7 - 3, Math.sin(a) * 7 + 2, 10 * fl, 3, a + Math.PI / 2, C.furLight, 'rgba(255,60,0,0.2)');
	}
	// ears: tall, sharp, swept back, black tips
	const ear = (bx, tipX, tipY, w) => {
		ctx.fillStyle = C.fur;
		ctx.strokeStyle = C.outline;
		ctx.lineWidth = 0.9;
		ctx.beginPath();
		ctx.moveTo(bx - w, -5);
		ctx.lineTo(tipX, tipY);
		ctx.lineTo(bx + w, -6);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = '#ffb060';
		ctx.beginPath();
		ctx.moveTo(bx - w * 0.45, -6);
		ctx.lineTo(lerp(bx, tipX, 0.75), lerp(-6, tipY, 0.75));
		ctx.lineTo(bx + w * 0.45, -6.5);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = C.black;
		ctx.beginPath();
		ctx.moveTo(lerp(bx - w, tipX, 0.72), lerp(-5, tipY, 0.72));
		ctx.lineTo(tipX, tipY);
		ctx.lineTo(lerp(bx + w, tipX, 0.72), lerp(-6, tipY, 0.72));
		ctx.closePath();
		ctx.fill();
	};
	const earBack = mood === 'hurt' || mood === 'ko' ? 6 : 0;
	ear(-5, -13 - earBack, -21 + earBack, 4.5);
	ear(1, -2 - earBack, -24 + earBack, 4.5);

	// skull + long snout
	ctx.fillStyle = C.fur;
	ctx.strokeStyle = C.outline;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(-10, 2);
	ctx.quadraticCurveTo(-11, -9, -1, -9.5);
	ctx.quadraticCurveTo(7, -9, 10, -4);
	ctx.lineTo(19, 0.5); // snout bridge
	ctx.quadraticCurveTo(20.5, 2.5, 18, 3.5);
	ctx.lineTo(8, 6);
	ctx.quadraticCurveTo(0, 10, -6, 8);
	// cheek spikes
	ctx.lineTo(-12, 9);
	ctx.lineTo(-9, 5);
	ctx.lineTo(-14, 4);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	// darker top of the head
	ctx.fillStyle = C.furDark;
	ctx.globalAlpha = 0.35;
	ctx.beginPath();
	ctx.moveTo(-9, -4);
	ctx.quadraticCurveTo(-1, -10, 9, -4.5);
	ctx.quadraticCurveTo(0, -6, -9, -4);
	ctx.fill();
	ctx.globalAlpha = 1;
	// cream jaw / cheek
	ctx.fillStyle = C.cream;
	ctx.beginPath();
	ctx.moveTo(-4, 4);
	ctx.quadraticCurveTo(4, 3.5, 17, 3.2);
	ctx.lineTo(8, 6);
	ctx.quadraticCurveTo(0, 9.5, -5, 7.5);
	ctx.closePath();
	ctx.fill();
	// nose
	ctx.fillStyle = C.black;
	ctx.beginPath();
	ctx.ellipse(19, 1.2, 1.8, 1.3, 0.3, 0, Math.PI * 2);
	ctx.fill();

	// mouth: confident smirk with a fang, or an open roar
	if (mood === 'roar') {
		ctx.fillStyle = '#5a0a0a';
		ctx.beginPath();
		ctx.moveTo(8, 3.5);
		ctx.lineTo(18, 3.5);
		ctx.lineTo(10, 9.5);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.moveTo(15, 3.5);
		ctx.lineTo(16.2, 3.5);
		ctx.lineTo(15.4, 6);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(10, 3.6);
		ctx.lineTo(11.2, 3.6);
		ctx.lineTo(10.6, 5.8);
		ctx.fill();
	} else {
		ctx.strokeStyle = C.outline;
		ctx.lineWidth = 0.8;
		ctx.beginPath();
		ctx.moveTo(17, 3.6);
		ctx.quadraticCurveTo(12, 5.2, mood === 'happy' ? 7 : 8, mood === 'happy' ? 3 : 4.2);
		ctx.stroke();
		if (mood !== 'ko') {
			ctx.fillStyle = '#ffffff';
			ctx.beginPath();
			ctx.moveTo(10.5, 4.6);
			ctx.lineTo(11.8, 4.4);
			ctx.lineTo(11.2, 6.6); // fang
			ctx.fill();
		}
	}

	// eye
	if (mood === 'ko') {
		ctx.strokeStyle = C.black;
		ctx.lineWidth = 0.9;
		ctx.beginPath();
		ctx.moveTo(2, -3.5);
		ctx.lineTo(6, -0.5);
		ctx.moveTo(6, -3.5);
		ctx.lineTo(2, -0.5);
		ctx.stroke();
	} else if (mood === 'hurt') {
		ctx.strokeStyle = C.black;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(1.5, -3);
		ctx.lineTo(6.5, -1.5);
		ctx.lineTo(1.5, 0);
		ctx.stroke();
	} else {
		// glow
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		const g = ctx.createRadialGradient(4.5, -2, 0, 4.5, -2, 6);
		g.addColorStop(0, 'rgba(255,220,80,.8)');
		g.addColorStop(1, 'rgba(255,120,0,0)');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(4.5, -2, 6, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		// narrowed almond eye, slanted down toward the snout
		ctx.fillStyle = C.eye;
		ctx.beginPath();
		ctx.moveTo(1, -2.8);
		ctx.quadraticCurveTo(4.5, -4.6, 8, -1.6);
		ctx.quadraticCurveTo(4.5, 0.4, 1, -2.8);
		ctx.fill();
		ctx.fillStyle = C.black;
		ctx.beginPath();
		ctx.ellipse(5.3, -2.1, 0.7, 1.4, 0, 0, Math.PI * 2); // slit pupil
		ctx.fill();
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(4.3, -3.2, 0.7, 0.7);
		// heavy brow
		ctx.strokeStyle = C.black;
		ctx.lineWidth = 1.3;
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(0, -4.6);
		ctx.lineTo(8.2, -2.4);
		ctx.stroke();
		// war-paint flame stripe under the eye
		ctx.fillStyle = '#b81e0a';
		ctx.beginPath();
		ctx.moveTo(2, 0.5);
		ctx.lineTo(7, 0.8);
		ctx.lineTo(3, 2.6);
		ctx.closePath();
		ctx.fill();
	}
	// Lou's glowing triangle on the forehead
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	ctx.fillStyle = `rgba(255,240,150,${0.75 + Math.sin(t * 6) * 0.25})`;
	ctx.beginPath();
	ctx.moveTo(-1.5, -9);
	ctx.lineTo(1.5, -9.2);
	ctx.lineTo(0, -6.5);
	ctx.closePath();
	ctx.fill();
	ctx.restore();
};

/**
 * Full body. pose = {
 *   t, bob, lean, crouch (0..1), stride (-1..1), airborne (0..1), spin (radians),
 *   arm: { x, y, fire } | null   (front paw target),  kick: { x, y, fire } | null (front foot target),
 *   mood, aura (0..1), ko (0..1), armsUp (bool)
 * }
 */
export const drawIchi = (ctx, p) => {
	const t = p.t;
	const crouch = p.crouch || 0;
	const hipY = -30 + crouch * 14 + p.bob - (p.airborne || 0) * 6;
	const hip = [-2, hipY];
	const shoulder = [6 + p.lean, hipY - 30 + crouch * 8];
	const headPos = [shoulder[0] + 7 + p.lean * 0.4, shoulder[1] - 13];

	ctx.save();
	if (p.ko) {
		// lying on the floor
		ctx.translate(0, -2);
		ctx.rotate(-1.45 * p.ko);
		ctx.translate(0, 2);
	}
	if (p.spin) {
		ctx.translate(0, -40);
		ctx.rotate(p.spin);
		ctx.translate(0, 40);
	}

	// ---- spirit aura (behind everything)
	const aura = p.aura ?? 0.5;
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	const ag = ctx.createRadialGradient(2, hipY - 14, 4, 2, hipY - 14, 52);
	ag.addColorStop(0, `rgba(255,120,30,${0.28 * aura + 0.1})`);
	ag.addColorStop(1, 'rgba(255,60,0,0)');
	ctx.fillStyle = ag;
	ctx.fillRect(-55, hipY - 70, 110, 100);
	for (let i = 0; i < 7; i++) {
		const fx = -16 + i * 6;
		const fl = 0.7 + Math.sin(t * 11 + i * 2.3) * 0.3;
		flame(ctx, fx, hipY + 4, (14 + (i % 3) * 6) * fl * (0.6 + aura), 3.5, Math.sin(t * 5 + i) * 0.2, 'rgba(255,170,40,.55)', 'rgba(255,40,0,0)');
	}
	ctx.restore();

	// ---- three tails
	for (let i = 0; i < 3; i++) tail(ctx, hip[0] - 4, hip[1] + 2, 30 + i * 3, -0.35 + i * 0.32, (p.airborne || 0) * 8, t, i);

	// ---- legs (digitigrade, like a beast warrior)
	const stride = (p.stride || 0) * 7;
	const legTo = (side, footX, footY) => {
		const knee = [hip[0] + side * 3 + (footX - hip[0]) * 0.55 + 4, lerp(hip[1], footY, 0.45)];
		const hock = [lerp(knee[0], footX, 0.5) - 5, lerp(knee[1], footY, 0.6)];
		limb(ctx, [hip, knee, hock, [footX, footY - 2]], side < 0 ? 6 : 7, side < 0 ? C.furDark : C.fur);
		ctx.fillStyle = C.black;
		ctx.beginPath();
		ctx.ellipse(footX + 2, footY - 1.5, 4, 2, 0, 0, Math.PI * 2);
		ctx.fill();
	};
	const lift = (p.airborne || 0) * 14;
	legTo(-1, -10 - stride, -lift);
	if (p.kick) {
		limb(ctx, [hip, [lerp(hip[0], p.kick.x, 0.45), lerp(hip[1], p.kick.y, 0.3) - 4], [p.kick.x, p.kick.y]], 7);
		paw(ctx, p.kick.x, p.kick.y, 4, p.kick.fire);
	} else legTo(1, 10 + stride, -lift * 0.7);

	// ---- back arm
	limb(ctx, [shoulder, [shoulder[0] - 2, shoulder[1] + 9], [shoulder[0] + 7, shoulder[1] + 2]], 5, C.furDark);

	// ---- torso
	ctx.save();
	const ang = Math.atan2(shoulder[1] - hip[1], shoulder[0] - hip[0]);
	const len = Math.hypot(shoulder[0] - hip[0], shoulder[1] - hip[1]);
	ctx.translate((hip[0] + shoulder[0]) / 2, (hip[1] + shoulder[1]) / 2);
	ctx.rotate(ang + Math.PI / 2);
	ctx.fillStyle = C.fur;
	ctx.strokeStyle = C.outline;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.ellipse(0, 0, 11, len / 2 + 5, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();
	// cream chest with a spiky ruff
	ctx.fillStyle = C.cream;
	ctx.beginPath();
	ctx.moveTo(4, -len / 2 - 2);
	ctx.lineTo(10, -len / 2 + 4);
	ctx.lineTo(7, -len / 2 + 6);
	ctx.lineTo(10, -len / 2 + 11);
	ctx.quadraticCurveTo(8, len / 4, 2, len / 2);
	ctx.quadraticCurveTo(1, 0, 4, -len / 2 - 2);
	ctx.fill();
	// flame stripes on the flank
	ctx.fillStyle = C.furDark;
	for (let i = 0; i < 3; i++) {
		ctx.beginPath();
		ctx.moveTo(-10, -6 + i * 7);
		ctx.lineTo(-3, -4 + i * 7);
		ctx.lineTo(-10, -2 + i * 7);
		ctx.fill();
	}
	ctx.restore();

	// ---- head
	ctx.save();
	ctx.translate(headPos[0], headPos[1]);
	ctx.rotate(p.headTilt || 0);
	drawIchiHead(ctx, p.mood || 'fierce', t);
	ctx.restore();

	// ---- front arm (guard, punch or arms up)
	if (p.arm) {
		const elbow = [lerp(shoulder[0], p.arm.x, 0.5), lerp(shoulder[1], p.arm.y, 0.5) + 3];
		limb(ctx, [shoulder, elbow, [p.arm.x, p.arm.y]], 6);
		paw(ctx, p.arm.x, p.arm.y, 3.8, p.arm.fire);
	} else if (p.armsUp) {
		limb(ctx, [shoulder, [shoulder[0] + 3, shoulder[1] - 10], [shoulder[0] + 1, shoulder[1] - 20]], 6);
		paw(ctx, shoulder[0] + 1, shoulder[1] - 21, 3.6, 0.6);
	} else {
		// boxing guard in front of the chin
		const g = [headPos[0] + 6, headPos[1] + 12 + Math.sin(t * 4) * 0.8];
		limb(ctx, [shoulder, [shoulder[0] + 2, shoulder[1] + 10], g], 6);
		paw(ctx, g[0], g[1], 3.6, 0);
	}

	// ---- floating embers
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	for (let i = 0; i < 6; i++) {
		const k = (t * 0.7 + i / 6) % 1;
		ctx.fillStyle = i % 2 ? `rgba(120,200,255,${1 - k})` : `rgba(255,200,80,${1 - k})`;
		ctx.fillRect(-14 + ((i * 37) % 30), hipY - 10 - k * 60, 1.4, 1.4);
	}
	ctx.restore();
	ctx.restore();
};

/** Square portrait for the menus (canvas, 240x240). */
export const makeIchiPortrait = () => {
	const c = document.createElement('canvas');
	c.width = c.height = 240;
	const ctx = c.getContext('2d');
	const g = ctx.createRadialGradient(120, 130, 10, 120, 130, 170);
	g.addColorStop(0, '#ff8a2a');
	g.addColorStop(0.45, '#9c2a0a');
	g.addColorStop(1, '#1a0404');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, 240, 240);
	ctx.translate(108, 160);
	ctx.scale(5.2, 5.2);
	drawIchiHead(ctx, 'fierce', 0.3);
	return c;
};
