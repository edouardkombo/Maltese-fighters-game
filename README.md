# Maltese Fighters by Louison

A small **2D fighting-game experiment** for kids and beginners — inspired by classic Street Fighter, set against a real photo of **Valletta / Grand Harbour (Malta)**.

This project is mainly for **learning and fun**: trying sprites, a simple AI opponent, character select, and a local web game. It is **not** a polished commercial game.

---

## What’s inside

| Feature | Description |
|--------|-------------|
| **Characters** | Ryu, Ken, and **LOU** (pixel soccer fighter) |
| **Stage** | Real Malta harbour background + ground platform |
| **Modes** | 1 player vs CPU (P2 is always AI) |
| **Select screen** | Choose who is Player 1 and who is the CPU |
| **Moves** | Walk, jump, crouch, punches, kicks, specials (where supported) |
| **Audio** | Theme music + hit / attack sounds |

Engine and classic sprites are adapted from the open-source project  
[Mayank-Jain-1/StreetFighter](https://github.com/Mayank-Jain-1/StreetFighter).  
LOU uses a custom pixel atlas; the stage uses a Malta photo.

---

## How to run (Linux / Mac / Windows)

You need a simple local web server (opening `index.html` as a file often breaks image/sound loading).

```bash
# 1. Unzip
unzip maltese-fighter-II.zip
cd maltese-fighter

# 2. Start a local server
python3 -m http.server 8080
```

Then open in your browser:

**http://localhost:8080**

Stop the server with `Ctrl+C` in the terminal.

> **Tip:** If the music does not start, click once on the title screen (browsers block autoplay until you interact).

---

## How to play

### Title screen
- Click anywhere → character select  

### Character select
| Keys | Action |
|------|--------|
| **A / D** | Change Player 1 |
| **Z / C** | Change Player 2 (CPU) |
| **Enter** or **Space** | Start fight |

### In battle (Player 1)

| Keys | Action |
|------|--------|
| **A / D** | Walk left / right |
| **W** | Jump |
| **S** | Crouch |
| **Q / E / R** | Light / Medium / Heavy punch |
| **F / V / G** | Light / Medium / Heavy kick |

Player 2 is controlled by a simple CPU AI.

---

## Project layout (for curious kids / parents)

```
maltese-fighter/
├── index.html          # Page that loads the game
├── README.md           # This file
├── public/
│   ├── images/         # Sprites, portraits, stage photo
│   └── sounds/         # Music and sound effects
└── src/
    ├── scenes/         # Title, select, battle screens
    ├── entitites/      # Fighters (Ryu, Ken, Lou), stage, HUD
    ├── engine/         # Input, camera, sounds, AI
    └── constants/      # Game numbers and control IDs
```

---

## Notes for parents & teachers

- This is an **experimentation / educational** project: code and art are mixed from open sources and custom assets.
- Best played on a computer with a keyboard (not ideal on pure touch phones).
- Content is cartoon fighting (no realistic violence); still supervise younger children if needed.
- Works offline once the folder is downloaded (only needs `python3` or any static file server).

---

## Known limitations (honest list)

- LOU’s animations are mapped from a custom atlas; some moves are simpler than Ryu/Ken.
- CPU AI is basic (approach + attack).
- One stage only (Malta harbour).
- Designed for local play in a browser, not as an installable app store game.

---

## Credits

- **Engine / Ryu & Ken sprites:** [Mayank-Jain-1/StreetFighter](https://github.com/Mayank-Jain-1/StreetFighter)
- **LOU character concept:** custom pixel soccer fighter atlas  
- **Stage:** photograph of Valletta / Grand Harbour, Malta  
- **Title:** Maltese Fighters by Louison  

---

## License / use

Use freely for **learning, school projects, and family fun**.  
Respect the licenses of the original Street Fighter engine repo and any third-party art if you republish or share widely.

Have fun experimenting!

