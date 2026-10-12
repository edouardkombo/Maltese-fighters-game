import { SCENE_WIDTH } from '../constants/Stage.js';

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

export const drawPortrait = (context, id, x, y, size, { dim = 0, border = '#fff', bg } = {}) => {
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
