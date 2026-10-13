# Quad Shot — Project Handover Document

## 1. Project Overview & Objective
This project successfully reverse-engineered two foundational geometric combat games:
1. **Endless Fire** (`/endless`): A procedural OpenGL/DirectX shmup utilizing a dual-fire risk-reward scoring loop (Z spread multiplier growth vs. X stream score harvesting), defensive shields, evolving generation waves, and real-time screen-space Psycho FX distortion.
2. **G-Wars** (`/G-Wars_Stable_a_V0`): A 64-bit Unity twin-stick shooter using Rigidbody2D vector physics, look rotation angle alignment, procedural wave spawning with distance filtering (`distToPlayer`), smooth damped camera following, and weapon upgrade pick-ups.

Using the **Reverse-Engineer-Anything (REA)** methodology and the [Quad Shot Game Design Document](file:///home/ashoka/Documents/Respawn/Quad_Shot-Game_Design_Document(1).md), we engineered **Quad Shot**—a high-speed 2D open-world roguelike set on an infinite Cartesian coordinate plane, integrating the [Neon Cyber Pixel RPG Sprite Pack](file:///home/ashoka/Documents/Respawn/sprites).

---

## 2. Codebase Architecture & File Structure

```
Respawn/
├── .gitignore                     # Configured to ignore reference game binaries (endless, G-Wars)
├── README.md                      # Project introduction & quick-start guide
├── HANDOVER.md                    # This comprehensive handover document
├── index.html                     # Root redirect entry point
├── quad_shot/                     # Core Game Application
│   ├── index.html                 # HTML5 game shell & interactive Tron HUD
│   ├── index.css                  # Vanilla CSS design system (Tron neon, glassmorphism, CRT scanlines)
│   ├── bundle.js                  # Production unified bundle (offline & file:// compatible)
│   ├── bundle.py                  # Build tool to compile src/*.js into bundle.js
│   ├── sprites/ -> ../sprites     # Symlink to sprite pack assets
│   └── src/                       # Modular Source Code
│       ├── math.js                # Vector2 math, line intersections, sine & parabolic trajectories
│       ├── audio.js               # Web Audio API retro synth sound engine & procedural BGM
│       ├── grid.js                # Reactive Cartesian grid deformation & dynamic quadrant rendering
│       ├── sprite_manager.js      # Cyberpunk sprite sheet parser & renderer (8 dirs, 6 frames)
│       ├── stickman.js            # The Origin Point (0,0) protagonist, dual physics & martial arts poses
│       ├── weapons.js             # 8 Primary weapons (Grades I-IV) & 4 deployable traps
│       ├── enemies.js             # Hostile units: Ray-Caster, Tessellator, Sine-Seeker, Scalar, Delta Swarm
│       ├── bosses.js              # Mini-bosses (every 5th wave) & Wave 100 Boss: The Corruption Vector
│       ├── economy_meta.js        # Vertices currency, Prime Matrices & Origin Hub Meta-Matrix
│       └── game.js                # Main game orchestrator, combat lockdown & wave manager
└── sprites/                       # Neon Cyber Pixel RPG Sprite Pack
    ├── release/cyber/             # 20 cyberpunk character sheets (topdown, ortho, face-on)
    ├── release/roster.json        # Character metadata & seeds
    └── SHEET-FORMAT.md            # Sheet atlas specification
```

---

## 3. Core Mechanics & Mathematical Implementation

| GDD Section | Implemented Feature | Implementation Details |
| :--- | :--- | :--- |
| **§ 1 Concept** | Tron Vector Aesthetics | High-contrast neon lines (`#00ffea`, `#ff007f`, `#39ff14`, `#9d00ff`) on deep-space canvas with reactive spring-damper grid deformation. |
| **§ 2 Physics** | Dual Physics System | Selectable via `Z`: **Kinematic Frame** (instant stop, direct grid alignment) vs. **Inertial Frame** (thrust acceleration, vector preservation, momentum drift). |
| **§ 3 World Map** | 4 Dynamic Quadrants | **Domain of Order** (+,+), **Parabolic Wastes** (-,+), **Fractal Depths** (-,-), **Zero-G Void** (+,-). Quadrant locations scramble upon player death. |
| **§ 4 Mobility** | Vector Movement | **8-Way Dash** (`Space`, 5 charges, 1.5s burning neon trail); **Apex Step** (`C`, 360° radial projectile-cancel shockwave); **Suspension State** (`RMB`/`Shift`, 60% time-slow). |
| **§ 5 & 6 Arsenal** | 8 Weapons & 4 Traps | **Sine Rifle**, **Parabolic Mortar**, **Reflection Ray**, **Tangent Disc**, **Scalar Shotgun**, **Fractal Cluster**, **Asymptote Laser**, **Doppler Repeater**; Traps: **Gravity Tether**, **Prism Mine**, **Möbius Snare**, **Vector Repulsor**. |
| **§ 5 Drops** | Intersection Pause | When weapons/traps drop, time drops to 5% speed. Interactive overlay offers **[E] Swap** into loadout or **[X] Scrap** for Vertices. |
| **§ 7 Economy** | Sustain & Vertices | **Vampiric Vectors** (flanking critical angle calculation heals HP); **Code Fragments** (elite drop restoring 25% HP & trap charges); **Elastic Collision** & **Terminal Velocity**. |
| **§ 8 Waves** | Hostile Scaling | Grunt spawn counts scale exponentially at **10% per wave**: $N(w) = \text{round}(8 \cdot 1.10^w)$. Ray-Caster, Tessellator, Sine-Seeker, Scalar, Delta Swarm. |
| **§ 9 & 10 Bosses**| Boss Encounters | Every 5th wave triggers **Macro-View** camera zoom and Mini-Boss (Orbital Torus, Hyperbolic Twins, Non-Euclidean Prism, Apex Icosahedron). **Wave 100 Boss: The Corruption Vector** dynamically shifts armor and damage based on active grunt population. |
| **§ 11 Meta** | Meta Matrix | Unspent Vertices convert to Prime Matrices (10:1 ratio). Upgrades: **Vector Processing**, **Kinetic Dampening**, **Matrix Expansion**, **Initial Matrix**, **Trap Calibration**, and **Chromatic Shifts**. |

---

## 4. Sprite Pack Integration (`/sprites`)
- Driven by `quad_shot/src/sprite_manager.js`.
- Protagonist **The Origin Point (0,0)** defaults to **Null-7 (`VX-0024`)** with teal synth core glow.
- Hostile entities and bosses use **Cipher (`VX-0012`)**, **Ledger (`VX-0048`)**, **Static (`VX-0042`)**, **Wire (`VX-0156`)**, **Grit (`VX-0036`)**, and **Glitch (`VX-0240`)**.
- Players can toggle between the Cyberpunk Character Sprite and the animated Neon Vector Stickman using the **`T`** key.

---

## 5. How to Run & Verify

1. **Local Dev Server**:
   ```bash
   python3 -m http.server 8080
   ```
   Open `http://localhost:8080/quad_shot/index.html` in your browser.
2. **Direct File Launch**:
   Open `quad_shot/index.html` directly in any modern browser (Chrome, Firefox, Brave) via `file://`. The game utilizes `bundle.js` with zero external dependencies.

---

## 6. Repository Hygiene & Git State
- Reference game directories `/endless` and `/G-Wars_Stable_a_V0` are excluded in `.gitignore`.
- Scratch reverse-engineering test files have been removed.
- All code modules passed `node --check` validation without syntax or runtime dependency errors.
