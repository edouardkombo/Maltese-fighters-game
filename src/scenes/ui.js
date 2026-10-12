import { SCENE_WIDTH } from '../constants/Stage.js';
import { SPECIALS, SPECIAL_ORDER } from '../constants/specials.js';

export const FONT = '"Arial Black", Impact, "Segoe UI", sans-serif';

export const GAME_TITLE = 'PASTIZZIS FIGHTERS';

/** The game logo, drawn in code: golden flaming title + a pastizz between the words. */
export const drawTitleLogo = (context, cx, y, size = 30, t = 0) => {
	context.save();
	context.textAlign = 'center';
	context.textBaseline = 'alphabetic';
	context.lineJoin = 'round';
	const lines = [['PASTIZZIS', y], ['FIGHTERS', y + size * 0.95]];
	for (const [text, yy] of lines) {
		context.font = `900 ${size}px ${FONT}`;
		// fiery glow
		context.shadowColor = 'rgba(255,90,0,.9)';
		context.shadowBlur = size * 0.35 + Math.sin(t * 5) * 2;
		context.lineWidth = size / 4.5;
		context.strokeStyle = '#5a0a08';
		context.strokeText(text, cx, yy);
		context.shadowBlur = 0;
		const g = context.createLinearGradient(0, yy - size * 0.8, 0, yy);
		g.addColorStop(0, '#fff6b0');
		g.addColorStop(0.45, '#ffc21a');
		g.addColorStop(1, '#e8561c');
		context.fillStyle = g;
		context.fillText(text, cx, yy);
	}
	// a little pastizz badge between the two lines
	const px = cx + context.measureText('FIGHTERS').width / 2 + size * 0.55;
	const py = y + size * 0.55;
	context.translate(px, py);
	context.rotate(Math.sin(t * 2) * 0.15);
	const s = size / 22;
	context.scale(s, s);
	const pg = context.createLinearGradient(0, -7, 0, 7);
	pg.addColorStop(0, '#ffd77a');
	pg.addColorStop(1, '#b86a1e');
	context.fillStyle = pg;
	context.strokeStyle = '#5a2a08';
	context.lineWidth = 1;
	context.beginPath();
	context.moveTo(-10, 0);
	context.quadraticCurveTo(-4, -8, 0, -7.5);
	context.quadraticCurveTo(4, -8, 10, 0);
	context.quadraticCurveTo(4, 8, 0, 7.5);
	context.quadraticCurveTo(-4, 8, -10, 0);
	context.fill();
	context.stroke();
	context.fillStyle = '#fffdf2';
	context.beginPath();
	context.ellipse(0, -6.5, 3.2, 1.4, 0, 0, Math.PI * 2);
	context.fill();
	context.restore();
};

export const FIGHTER_INFO = {
	Lou: { label: 'LOU', tag: 'The Young Striker', portrait: 'LouPortrait', color: '#2c5fa0', taunt: 'MELA! LET\'S PLAY!' },
	Ganni: { label: 'GANNI', tag: 'il-Pastizzier', portrait: 'GanniPortrait', color: '#a8402e', taunt: 'MELA! HOT PASTIZZI, HOT FISTS!' },
	Karmenu: { label: 'KARMENU', tag: 'il-Kondutturi', portrait: 'KarmenuPortrait', color: '#b07a1c', taunt: 'MELA! THE BUS WON\'T WAIT!' },
	Ichi: { label: 'ICHI', tag: 'The Fire-Fox Spirit', portrait: 'IchiPortrait', color: '#9c2a0a', taunt: 'FEEL THE SPIRIT FIRE!' },
};

export const outlinedText = (context, text, x, y, size, fill = '#fff', stroke = '#12122a', align = 'center', weight = 900) => {
	context.save();
	context.textAlign = align;
	context.lineJoin = 'round';
	context.font = `${weight} ${size}px ${FONT}`;
	context.lineWidth = Math.max(2, size / 4);
	context.strokeStyle = stroke;
	context.strokeText(text, x, y);
	context.fillStyle = fill;
	context.fillText(text, x, y);
	context.restore();
};

export const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

export const drawButton = (context, r, label, { fill = '#ffcc00', text = '#3a1200', pulse = 0, active = false } = {}) => {
	context.save();
	const grow = pulse * 1.2;
	const x = r.x - grow, y = r.y - grow, w = r.w + grow * 2, h = r.h + grow * 2;
	const rad = h / 2;
	context.beginPath();
	context.moveTo(x + rad, y);
	context.arcTo(x + w, y, x + w, y + h, rad);
	context.arcTo(x + w, y + h, x, y + h, rad);
	context.arcTo(x, y + h, x, y, rad);
	context.arcTo(x, y, x + w, y, rad);
	context.closePath();
	context.shadowColor = 'rgba(0,0,0,.5)';
	context.shadowBlur = 6;
	context.shadowOffsetY = 2;
	context.fillStyle = active ? '#fff3b0' : fill;
	context.fill();
	context.shadowColor = 'transparent';
	context.lineWidth = 1.6;
	context.strokeStyle = '#ffffff';
	context.stroke();
	context.fillStyle = text;
	context.textAlign = 'center';
	context.textBaseline = 'middle';
	let fs = Math.min(13, h * 0.5);
	context.font = `900 ${fs}px ${FONT}`;
	while (context.measureText(label).width > w - 12 && fs > 6) {
		fs -= 0.5;
		context.font = `900 ${fs}px ${FONT}`;
	}
	context.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 0.5);
	context.restore();
};

export const drawBackdrop = (context, t = 0) => {
	const g = context.createLinearGradient(0, 0, 0, 224);
	g.addColorStop(0, '#0a1430');
	g.addColorStop(1, '#1d2b55');
	context.fillStyle = g;
	context.fillRect(0, 0, SCENE_WIDTH, 224);
	// slow drifting Maltese-cross pattern
	context.save();
	context.globalAlpha = 0.06;
	context.fillStyle = '#ffffff';
	for (let i = 0; i < 9; i++) {
		for (let j = 0; j < 5; j++) {
			const x = ((i * 48 + t * 6) % (SCENE_WIDTH + 48)) - 12;
			const y = j * 50 + (i % 2) * 24;
			context.beginPath();
			for (let k = 0; k < 4; k++) {
				const a = (k * Math.PI) / 2;
				context.moveTo(x, y);
				context.lineTo(x + Math.cos(a + 0.5) * 7, y + Math.sin(a + 0.5) * 7);
				context.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14);
				context.lineTo(x + Math.cos(a - 0.5) * 7, y + Math.sin(a - 0.5) * 7);
			}
			context.fill();
		}
	}
	context.restore();
};

/** Controls + the four super powers, for the title screen and the versus screen. */
export const drawMoveList = (context, touch, x, y, compact = false) => {
	const gap = compact ? 10 : 12;
	const basics = touch
		? [
				['D-PAD', 'move / jump / crouch'],
				['LP MP HP', 'punches'],
				['LK MK HK', 'kicks'],
		  ]
		: [
				['← → ↑ ↓', 'move / jump / crouch'],
				['A  S  D', 'light / medium / heavy punch'],
				['Z  X  C', 'light / medium / heavy kick'],
				['F  •  M', 'full screen  •  sound on/off'],
		  ];
	context.save();
	context.textAlign = 'left';
	basics.forEach(([a, b], i) => {
		const yy = y + i * gap;
		context.font = `900 8px ${FONT}`;
		context.fillStyle = '#ffcc00';
		context.fillText(a, x, yy);
		context.font = '700 7px system-ui, sans-serif';
		context.fillStyle = '#ffffff';
		context.fillText(b, x + 52, yy);
	});
	const sx = x + 170;
	context.font = `900 8px ${FONT}`;
	context.fillStyle = '#b8c4ff';
	context.fillText(touch ? 'SUPER POWERS - one tap:' : 'SUPER POWERS - one key, or the motion:', sx, y);
	SPECIAL_ORDER.forEach((kind, i) => {
		const s = SPECIALS[kind];
		const yy = y + (i + 1) * gap;
		if (!touch) {
			context.font = `900 8px ${FONT}`;
			context.fillStyle = '#ffffff';
			context.fillText(s.key, sx, yy);
		}
		const label = touch && s.icon ? ` ${s.label}` : s.label;
		context.font = `900 ${label.length > 12 ? 5.5 : label.length > 9 ? 6.5 : 8}px ${FONT}`;
		context.fillStyle = s.color;
		context.fillText(label, sx + (touch ? 0 : 10), yy);
		const labelEnd = sx + (touch ? 0 : 10) + context.measureText(label).width + 4;
		context.font = '700 6.5px system-ui, sans-serif';
		context.fillStyle = '#dfe6ff';
		// a long name pushes the rest of its row to the right (and drops the short description)
		context.fillText(touch ? s.short : s.motion, Math.max(sx + 69, labelEnd), yy);
		if (!touch && labelEnd <= sx + 69) {
			context.fillStyle = '#8c98cc';
			context.fillText(s.short, sx + 127, yy);
		}
	});
	context.restore();
};

export const drawPortrait =(context, id, x, y, size, { dim = 0, border = '#fff', bg } = {}) => {
	const info = FIGHTER_INFO[id];
	const img = document.getElementById(info.portrait);
	context.save();
	context.fillStyle = bg || info.color;
	context.fillRect(x, y, size, size);
	const ready = img && (img instanceof HTMLCanvasElement || (img.complete && img.naturalWidth));
	if (ready) {
		context.imageSmoothingEnabled = true;
		context.imageSmoothingQuality = 'high';
		context.drawImage(img, 0, 0, img.naturalWidth || img.width, img.naturalHeight || img.height, x, y, size, size);
	}
	if (dim > 0) {
		context.fillStyle = `rgba(0,0,0,${dim})`;
		context.fillRect(x, y, size, size);
	}
	context.lineWidth = Math.max(1.5, size / 36);
	context.strokeStyle = border;
	context.strokeRect(x, y, size, size);
	context.restore();
};
