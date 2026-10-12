# Maltese Fighters

A browser fighting game set in Malta. Pure HTML5 canvas + ES modules:
**no build step, no dependencies to install** - it runs as-is on GitHub Pages.

## The fighters

| Fighter | Who |
|---|---|
| **LOU** | The young striker - drawn from the reference artwork (afro, red headband, black/red kit, striped socks, fingerless gloves) |
| **GANNI** | *il-Pastizzier* - flour-dusted baker, flat cap, big moustache |
| **KARMENU** | *il-Kondutturi* - vintage bus driver, aviators, "the bus is late" |

## The four super powers

Every fighter has all four, each with its own effect and cooldown (the round icons under the health bars,
and the touch buttons, fill up again when a power is ready):

| Power | Effect | Desktop key | Motion (classic) |
|---|---|---|---|
| **MELA!** | Glowing Maltese-cross orb. Light / medium / heavy punch = slow / medium / fast | **Q** | ↓ ↘ → + punch |
| **PASTIZZI!** | Lobs 3 hot pastizzi in an arc - good against jumpers and from afar | **W** | ↓ ↙ ← + punch |
| **UWEJJA!** | Close-range shout shockwave: big damage, huge knock-back, plows through projectiles | **E** | ↓ ↘ → + kick |
| **RICOTTA!** | Eat a ricotta pastizz: heals 25 HP (long cooldown) | **R** | ↓ ↙ ← + kick |

On phones/tablets each power is one tap on its own button.

## Arenas

Every fight takes place in a random spot in Malta: **Valletta** (Grand Harbour), **Mdina** (the Silent City at sunset),
**Marsaxlokk** (the luzzu harbour), **Gozo** (festa night with fireworks at the Citadel) and **Comino** (the Blue Lagoon).
Valletta is a photo; the others are painted in code (`src/entitites/stage/MaltaStage.js`).

## Play with a friend online

1. Menu -> **PLAY WITH A FRIEND**. You get a room code and an invite link (`...?room=ABC123`).
2. Send the link (COPY / SHARE buttons). Your friend opens it and taps to join.
3. Both pick a fighter and press **READY**. Best of three rounds, then rematch as often as you like.

How it works on a static site: the two browsers connect **peer-to-peer (WebRTC)** with [PeerJS](https://peerjs.com).
PeerJS's free public broker only introduces the two players (and relays through its TURN server when a direct
connection is impossible), so no server of our own is needed. The PeerJS script is loaded from unpkg only when you
go online. Both machines run the same simulation in lockstep, 60 ticks a second, with a small input delay chosen
from the measured ping; the host also sends periodic checks so any drift is corrected.

## Music and sounds

All original and synthesised live with the Web Audio API (`src/engine/Audio.js`): a hype title theme for the menus,
a fight theme, and every whoosh / hit / landing / special effect. There are no audio files. Browsers only allow
sound after the first tap / click / key, so the music starts on that first interaction. **M** or the 🔊 button mutes.

## Play locally

```bash
python3 -m http.server 8080      # any static server works
# open http://localhost:8080
```
(ES modules do not load from `file://`, so use a server.)

## Publish on GitHub Pages

1. Push this folder's contents to a repo (`index.html` must be at the repo root).
2. *Settings -> Pages -> Deploy from a branch -> `main` / `(root)`*.
3. Open `https://<you>.github.io/<repo>/`. Invite links point to the same address automatically.

All paths are relative and every file name is lower-case/exact-case, so it also works from a sub-path.
`.nojekyll` is included.

## How a game works

1. **1 PLAYER**: pick your fighter (swipe / arrows / Enter), then beat the rest of the roster one after the other.
   Lose a fight = game over (retry or change fighter); win them all = *Champion of Malta*.
2. **Each fight is two rounds**; if you win one each (or both are draws) a **third, deciding round** is played.
3. **The CPU gets tougher every stage** and uses all four super powers too.

## Controls

**Keyboard**

| Key | Action |
|-----|--------|
| ← → | Walk left / right |
| ↑ / ↓ | Jump / crouch |
| A / S / D | Light / medium / heavy punch |
| Z / X / C | Light / medium / heavy kick |
| Q / W / E / R | MELA / PASTIZZI / UWEJJA / RICOTTA |
| F (or double-click, or the ⛶ button) | Full screen |
| M | Sound on / off |

**Touch (phones / tablets)** - an on-screen controller appears in fights: a D-pad (slide your thumb for diagonals / jump / crouch),
`LP MP HP` punches, `LK MK HK` kicks and the four super-power buttons. Works in portrait (controller under the game) and in
landscape (controller floats over the corners). Full screen via the ⛶ button (on iPhone use *Share -> Add to Home Screen*,
which opens the game full screen thanks to `manifest.webmanifest`).

**Gamepad** - D-pad, face buttons + L1/R1 for attacks, L2 / R2 / L3 / R3 for the four super powers.

Add `?touch` to the URL to preview the touch controller on a desktop, `?debug` for the FPS counter.

## How it is built

* `src/` - game engine (scenes, fighter state machine, collision, AI). `BattleScene` runs rounds (and the online lockstep),
  `MenuScene` / `NetLobbyScene` the mode choice and online lobby, `InterludeScene` the between-fight screens,
  `SelectScene` the carousel, `engine/TouchControls.js` the on-screen controller (it feeds the same input path as the keyboard),
  `engine/SimpleAI.js` the CPU (difficulty per stage in `AI_LEVELS`), `engine/Net.js` the online connection.
  `MalteseFighter.js` holds the shared moveset and super powers; `Lou.js`, `Ganni.js`, `Karmenu.js` only provide art + voice + orb.
  Super-power tuning (cooldowns, damage, heal) is in `src/constants/specials.js`.
* The canvas renders at 3x (1146x672) so the hi-res sprites stay crisp; game logic still runs at 382x224.
* `tools/` - Python generators for the art (optional - the generated PNG/JS files are committed):

  ```bash
  pip install numpy opencv-python pillow
  python3 tools/make_fighters.py        # sprite sheets + portraits (all 78 frames x 3 fighters)
  python3 tools/make_mela.py            # the MELA orb
  ```
  Lou's head is cut straight out of `tools/reference_lou.png`; the bodies are painted around it.
  Edit poses in `tools/lib/poses.py`, costumes in `tools/make_fighters.py`, faces in `tools/lib/heads.py`.

## Credits

Engine adapted from [Mayank-Jain-1/StreetFighter](https://github.com/Mayank-Jain-1/StreetFighter).
The HUD graphics (`public/images/hud.png`, `decals.png`) come from that project; the old Street Fighter music and
sound effects have been removed and replaced with our own synthesised audio.
