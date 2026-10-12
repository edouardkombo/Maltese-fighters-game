# Maltese Fighters

A browser fighting game set on the Grand Harbour quay in Valletta. Pure HTML5 canvas + ES modules:
**no build step, no dependencies** - it runs as-is on GitHub Pages.

## The fighters

| Fighter | Who | Special-move subtitles |
|---|---|---|
| **LOU** | The young striker - drawn from the reference artwork (afro, red headband, black/red kit, striped socks, fingerless gloves) | Pastizz Attack / Ricotta Bomb / Kinnie Blast |
| **GANNI** | *il-Pastizzier* - flour-dusted baker, flat cap, big moustache | Pastizz-Power / Fresh From The Oven / Extra Ricotta |
| **KARMENU** | *il-Kondutturi* - vintage bus driver, aviators, "the bus is late" | Bus Is Late / No Change Given / Full Horn |

Every special move is a shout of **"MELA!"** (synthesised zap + the browser's speech voice) and throws a
glowing Maltese-cross *mela* orb. Light / medium / heavy punch = slow / medium / fast orb.
It is all affectionate: the people of Malta are the heroes here.

## Play locally

```bash
python3 -m http.server 8080      # any static server works
# open http://localhost:8080
```
(ES modules do not load from `file://`, so use a server.)

## Publish on GitHub Pages

1. Push this folder's contents to a repo (`index.html` must be at the repo root).
2. *Settings -> Pages -> Deploy from a branch -> `main` / `(root)`*.
3. Open `https://<you>.github.io/<repo>/`.

All paths are relative and every file name is lower-case/exact-case, so it also works from a sub-path.
`.nojekyll` is included.

## How a game works

1. **Pick your fighter** - swipe/drag the carousel with your finger or mouse, click the arrows, use **A / D** (or the arrow keys),
   then tap **FIGHT!** (or press **Enter**).
2. **Beat everybody.** The rest of the roster is your chain of opponents (Stage 1, Stage 2, ...). Lose a fight = game over
   (retry or change fighter); win them all = *Champion of Malta*.
3. **Each fight is two rounds**; if you win one each (or both are draws) a **third, deciding round** is played.
4. **The CPU gets tougher every stage**: faster decisions, anti-air punishes, retreats from your attacks, combos and real MELA! specials.

## Controls

**Touch (phones / tablets)** - an on-screen controller appears in fights: a D-pad (slide your thumb for diagonals / jump / crouch),
`LP MP HP` punches, `LK MK HK` kicks and a one-tap **MELA!** button. Works in portrait (controller under the game) and in
landscape (controller floats over the corners). There is a fullscreen button in the corner.

**Keyboard**

| Key | Action |
|-----|--------|
| A / D | Left / Right |
| W / S | Jump / Crouch |
| Q / E / R | Light / Medium / Heavy Punch |
| F / V / G | Light / Medium / Heavy Kick |
| S, then S+D, then D, then a Punch | **MELA!** |

Gamepads still work too. Add `?touch` to the URL to preview the touch controller on a desktop, `?debug` for the FPS counter.

## How it is built

* `src/` - game engine (scenes, fighter state machine, collision, AI). `BattleScene` runs rounds, `InterludeScene` the
  between-fight screens, `SelectScene` the carousel, `engine/TouchControls.js` the on-screen controller (it feeds the
  same input path as the keyboard), `engine/SimpleAI.js` the CPU (difficulty per stage in `AI_LEVELS`).
  `MalteseFighter.js` holds the shared moveset; `Lou.js`, `Ganni.js`, `Karmenu.js` only provide art + voice + orb.
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
The HUD graphics and the sound effects/music in `public/` come from that project. If you plan a public
release, check their licensing or swap them for your own.
