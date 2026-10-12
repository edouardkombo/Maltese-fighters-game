/**
 * Online play with a friend, from a plain static site (GitHub Pages):
 *
 *  - The two browsers talk directly to each other over WebRTC (peer-to-peer) using PeerJS.
 *    PeerJS's free public broker is only used to introduce the two players to each other
 *    (and its TURN relay if a direct connection is impossible), so no server of our own is needed.
 *  - The host gets a room code and an invite link (?room=CODE); the friend opens the link.
 *  - During a fight both machines run the exact same simulation in lockstep: every 1/60 s tick
 *    uses both players' inputs for that tick, sent a few ticks ahead (input delay) so that
 *    normal internet latency is hidden. See BattleScene for the lockstep loop.
 */

const PEERJS_URL = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
const PREFIX = 'maltese-fighters-ii-';
const TIMEOUT_MS = 6000;
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L confusion

let peerJsPromise = null;
const loadPeerJs = () => {
	if (window.Peer) return Promise.resolve(window.Peer);
	if (peerJsPromise) return peerJsPromise;
	peerJsPromise = new Promise((resolve, reject) => {
		const s = document.createElement('script');
		s.src = PEERJS_URL;
		s.async = true;
		s.onload = () => (window.Peer ? resolve(window.Peer) : reject(new Error('PeerJS failed to load')));
		s.onerror = () => {
			peerJsPromise = null;
			reject(new Error('Could not load the online module (are you offline?)'));
		};
		document.head.appendChild(s);
	});
	return peerJsPromise;
};

const randomCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

export const roomFromUrl = () => {
	const room = new URLSearchParams(window.location.search).get('room');
	return room ? room.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) : null;
};

class NetSession {
	peer = null;
	conn = null;
	role = null; // 'host' | 'guest'
	code = null;
	status = 'idle'; // idle | loading | waiting | connecting | connected | closed | error
	error = '';
	rtt = 0;
	listeners = new Set();
	last = {}; // latest message of each type from the friend

	// lockstep state for the current match
	matchId = 0;
	remoteInputs = new Map(); // tick -> input bits
	snapshots = new Map(); // tick -> host snapshot (guest only)

	on(fn) {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}

	emit(type, data) {
		for (const fn of [...this.listeners]) fn(type, data);
	}

	setStatus(status, error = '') {
		this.status = status;
		this.error = error;
		this.emit('status', { status, error });
	}

	get connected() {
		return this.status === 'connected';
	}

	inviteLink() {
		const url = new URL(window.location.href);
		url.search = `?room=${this.code}`;
		url.hash = '';
		return url.toString();
	}

	async host() {
		this.close();
		this.role = 'host';
		this.setStatus('loading');
		let Peer;
		try {
			Peer = await loadPeerJs();
		} catch (e) {
			this.setStatus('error', e.message);
			return;
		}
		const open = (attempt) => {
			this.code = randomCode();
			const peer = new Peer(PREFIX + this.code, { debug: 1 });
			this.peer = peer;
			peer.on('open', () => this.setStatus('waiting'));
			peer.on('connection', (c) => {
				if (this.conn && this.conn.open) {
					c.on('open', () => {
						c.send({ t: 'full' });
						setTimeout(() => c.close(), 300);
					});
					return;
				}
				this.attach(c);
			});
			peer.on('disconnected', () => {
				// lost the broker (not the friend): reconnect so new friends can still join
				if (!peer.destroyed) peer.reconnect();
			});
			peer.on('error', (err) => {
				if (err.type === 'unavailable-id' && attempt < 3) {
					peer.destroy();
					open(attempt + 1);
				} else if (!this.connected) this.setStatus('error', this.describe(err));
			});
		};
		open(0);
	}

	async join(code) {
		this.close();
		this.role = 'guest';
		this.code = code;
		this.setStatus('loading');
		let Peer;
		try {
			Peer = await loadPeerJs();
		} catch (e) {
			this.setStatus('error', e.message);
			return;
		}
		const peer = new Peer({ debug: 1 });
		this.peer = peer;
		peer.on('open', () => {
			this.setStatus('connecting');
			this.attach(peer.connect(PREFIX + code, { reliable: true, serialization: 'json' }));
		});
		peer.on('error', (err) => {
			if (!this.connected) this.setStatus('error', this.describe(err));
		});
	}

	describe(err) {
		switch (err?.type) {
			case 'peer-unavailable':
				return 'Room not found - ask your friend for a new link';
			case 'network':
			case 'server-error':
			case 'socket-error':
				return 'Network problem - check your connection';
			case 'browser-incompatible':
				return 'This browser does not support online play';
			default:
				return err?.message || 'Connection failed';
		}
	}

	attach(c) {
		this.conn = c;
		c.on('open', () => {
			this.setStatus('connected');
			this.emit('connected');
			this.lastSeen = performance.now();
			clearInterval(this.pingTimer);
			this.pingTimer = setInterval(() => {
				// no sign of life for a while (closed tab, lost network): treat it as a disconnect
				if (performance.now() - this.lastSeen > TIMEOUT_MS) return this.onClosed();
				this.send({ t: 'ping', at: performance.now() });
			}, 1000);
			this.send({ t: 'ping', at: performance.now() });
		});
		c.on('data', (d) => this.onData(d));
		c.on('close', () => this.onClosed());
		c.on('error', () => this.onClosed());
	}

	onClosed() {
		if (this.status === 'closed' || this.status === 'idle') return;
		clearInterval(this.pingTimer);
		try {
			this.conn?.close();
		} catch (e) {
			/* already closed */
		}
		this.conn = null;
		this.setStatus('closed', 'Your friend left the game');
		this.emit('closed');
	}

	send(msg) {
		if (this.conn && this.conn.open) this.conn.send(msg);
	}

	onData(d) {
		if (!d || typeof d !== 'object') return;
		this.lastSeen = performance.now();
		switch (d.t) {
			case 'bye':
				this.onClosed();
				return;
			case 'i':
				if (d.m === this.matchId) for (const [k, b] of d.v) this.remoteInputs.set(k, b);
				return;
			case 's':
				if (d.m === this.matchId) this.snapshots.set(d.k, d.s);
				return;
			case 'ping':
				this.send({ t: 'pong', at: d.at });
				return;
			case 'pong':
				this.rtt = this.rtt ? this.rtt * 0.7 + (performance.now() - d.at) * 0.3 : performance.now() - d.at;
				return;
			case 'full':
				this.setStatus('error', 'That room already has two players');
				return;
			default:
				this.last[d.t] = d; // scenes that open later can still read the latest pick / start
				this.emit('message', d);
		}
	}

	/** Reset the lockstep buffers for a new match. */
	beginMatch(matchId) {
		this.matchId = matchId;
		this.remoteInputs = new Map();
		this.snapshots = new Map();
	}

	/** Input delay in ticks for the measured round-trip time (higher ping = more delay, fewer stalls). */
	suggestedDelay() {
		const oneWayTicks = this.rtt / 2 / (1000 / 60);
		return Math.max(3, Math.min(10, Math.ceil(oneWayTicks) + 2));
	}

	close() {
		clearInterval(this.pingTimer);
		this.send({ t: 'bye' });
		const peer = this.peer;
		this.peer = null;
		this.conn = null;
		this.status = 'idle';
		this.last = {};
		this.rtt = 0;
		try {
			peer?.destroy();
		} catch (e) {
			/* already gone */
		}
	}
}

export const Net = new NetSession();

// tell the friend right away when this page is closed / reloaded
window.addEventListener('pagehide', () => Net.send({ t: 'bye' }));
