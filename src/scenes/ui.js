import { SCENE_WIDTH } from '../constants/Stage.js';
import { SPECIALS, SPECIAL_ORDER } from '../constants/specials.js';

export const FONT = '"Arial Black", Impact, "Segoe UI", sans-serif';

export const FIGHTER_INFO = {
	Lou: { label: 'LOU', tag: 'The Young Striker', portrait: 'LouPortrait', color: '#2c5fa0', taunt: 'MELA! LET\'S PLAY!' },
	Ganni: { label: 'GANNI', tag: 'il-Pastizzier', portrait: 'GanniPortrait', color: '#a8402e', taunt: 'MELA! HOT PASTIZZI, HOT FISTS!' },
	Karmenu: { label: 'KARMENU', tag: 'il-Kondutturi', portrait: 'KarmenuPortrait', color: '#b07a1c', taunt: 'MELA! THE BUS WON\'T WAIT!' },
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
	const gap = compact ? 11 : 13;
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
		context.font = `900 8px ${FONT}`;
		context.fillStyle = s.color;
		context.fillText(s.label, sx + (touch ? 0 : 10), yy);
		context.font = '700 6.5px system-ui, sans-serif';
		context.fillStyle = '#dfe6ff';
		context.fillText(touch ? s.short : s.motion, sx + 69, yy);
		if (!touch) {
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
	if (img && img.complete && img.naturalWidth) {
		context.imageSmoothingEnabled = true;
		context.imageSmoothingQuality = 'high';
		context.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, x, y, size, size);
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
