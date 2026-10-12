/** RICOTTA! - visual only: creamy sparkles and a "+25" rising from the fighter who eats it. */
export class RicottaHeal {
	age = 0;

	constructor(fighter, amount, entities) {
		this.fighter = fighter;
		this.amount = amount;
		this.entities = entities;
		this.bits = Array.from({ length: 14 }, (_, i) => ({
			x: ((i * 37) % 44) - 22,
			y: -((i * 53) % 70) - 10,
			s: 1.2 + (i % 3) * 0.6,
			v: 26 + (i % 4) * 9,
		}));
	}

	update = (time) => {
		this.age += time.secondsPassed;
		if (this.age > 1.2) this.entities.remove(this);
	};

	draw = (context, camera) => {
		const x = this.fighter.position.x - camera.position.x;
		const y = this.fighter.position.y - camera.position.y;
		const a = Math.max(0, 1 - this.age / 1.2);
		context.save();
		// soft white aura
		const g = context.createRadialGradient(x, y - 45, 4, x, y - 45, 46);
		g.addColorStop(0, `rgba(255,255,240,${0.45 * a})`);
		g.addColorStop(1, 'rgba(255,255,240,0)');
		context.fillStyle = g;
		context.fillRect(x - 50, y - 95, 100, 100);
		// rising ricotta blobs and plus signs
		for (const [i, b] of this.bits.entries()) {
			const by = y + b.y - this.age * b.v;
			context.globalAlpha = a;
			if (i % 2) {
				context.fillStyle = '#fffdf0';
				context.beginPath();
				context.arc(x + b.x, by, b.s, 0, Math.PI * 2);
				context.fill();
			} else {
				context.fillStyle = '#7dff9a';
				context.fillRect(x + b.x - b.s, by - 0.5, b.s * 2, 1);
				context.fillRect(x + b.x - 0.5, by - b.s, 1, b.s * 2);
			}
		}
		context.globalAlpha = a;
		context.font = '900 11px "Arial Black", Impact, sans-serif';
		context.textAlign = 'center';
		context.lineWidth = 3;
		context.strokeStyle = '#0b3a16';
		context.fillStyle = '#7dff9a';
		const ty = y - 104 - this.age * 14;
		context.strokeText(`+${this.amount}`, x, ty);
		context.fillText(`+${this.amount}`, x, ty);
		context.restore();
	};
}
