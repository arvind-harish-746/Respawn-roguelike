# Quad Shot — Project Handover Document

## 1. Project Overview & Architecture
**Quad Shot** is a high-speed 2D open-world roguelike set on an infinite Cartesian coordinate plane, built strictly according to the [Quad Shot Game Design Document](file:///home/ashoka/Documents/Respawn/Quad_Shot-Game_Design_Document(1).md). The combat system visualizes high-contrast neon vector graphics (`#00ffea`, `#ff007f`, `#39ff14`, `#9d00ff`), dynamic spring-damper grid deformation, and martial-arts combat.

The game is distributed with self-healing, dedicated standalone desktop executables for **Linux**, **Windows**, and **macOS**, running directly in their own chromeless desktop application window without requiring the user to manually launch a web browser.

---

## 2. Codebase Architecture & File Structure

```
Respawn/
├── .gitignore                     # Configured to ignore local binaries and caches
├── README.md                      # Project manual, launch instructions & feature overview
├── HANDOVER.md                    # This complete handover document
├── index.html                     # Root redirect entry point
├── main.go                        # Go-based self-healing desktop application runner & server
├── quad_shot.exe                  # Root Windows self-contained executable & installer
├── quad_shot.sh                   # Linux executable launcher script
├── quad_shot.command              # macOS application launcher script
├── bin/                           # Compiled standalone native executables
│   ├── quad_shot-linux            # Linux x86_64 native executable
│   ├── quad_shot-windows.exe      # Windows x86_64 native executable
│   ├── quad_shot-macos            # macOS Intel x86_64 native executable
│   └── quad_shot-macos-arm64      # macOS Apple Silicon arm64 native executable
├── quad_shot/                     # Core Game Application
│   ├── index.html                 # HTML5 game shell & interactive Tron HUD
│   ├── index.css                  # Vanilla CSS design system (neon glow, glassmorphism, CRT scanlines)
│   ├── bundle.js                  # Production unified bundle (offline & file:// compatible)
│   ├── bundle.py                  # Build tool to compile src/*.js into bundle.js
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

## 3. Dedicated Desktop Window & Self-Healing Engine

The application runner (`main.go`) embeds the entire game distribution (`//go:embed`) and includes the following autonomous self-healing capabilities:

1. **Self-Healing Asset Recovery**:
   On startup, the runner verifies local filesystem integrity for all game assets. If any critical asset (`index.html`, `bundle.js`, `index.css`, or sprite sheets) is deleted or corrupted, the runner automatically extracts and restores the asset from its embedded payload.
2. **Dynamic Ephemeral Port Allocation**:
   The listener binds to an auto-assigned ephemeral port (`127.0.0.1:0`), completely eliminating port collision errors if port 8080 or other ports are occupied.
3. **Chromeless Desktop Application Window**:
   Launches the game in a dedicated, top-level, chromeless native window (`--app=http://...` mode with `--window-size=1280,820`) using the platform's default web runtime (Chrome, Edge, Chromium, Brave), providing an authentic standalone game application feel without browser tabs, bookmarks, or URL bars.
4. **Watchdog Healthcheck Loop**:
   Runs a background healthcheck monitor querying `/healthz`. If connection drops or the window is closed, the runner handles cleanup gracefully.

---

## 4. Core Mechanics & Mathematical Implementation

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

## 5. Sprite Pack Integration (`/sprites`)
- Managed by `quad_shot/src/sprite_manager.js`.
- Protagonist **The Origin Point (0,0)** defaults to **Null-7 (`VX-0024`)** with teal synth core glow.
- Hostile units and bosses use **Cipher (`VX-0012`)**, **Ledger (`VX-0048`)**, **Static (`VX-0042`)**, **Wire (`VX-0156`)**, **Grit (`VX-0036`)**, and **Glitch (`VX-0240`)**.
- Players can toggle between the Cyberpunk Character Sprite and the animated Neon Vector Stickman using the **`T`** key.

---

## 6. How to Run

### Linux
```bash
./bin/quad_shot-linux
# or
./quad_shot.sh
```

### Windows
Double click `quad_shot.exe` (or `bin\quad_shot-windows.exe`):
```cmd
quad_shot.exe
```
> *Standalone Installer*: A user can download `quad_shot.exe` on its own from GitHub. Running it automatically extracts missing game assets and launches the game in a dedicated window.

### macOS
Double click `quad_shot.command` or run:
```bash
./bin/quad_shot-macos          # Intel x86_64
./bin/quad_shot-macos-arm64    # Apple Silicon
```

### Direct Browser Access (Alternative)
Open `quad_shot/index.html` in any browser or run `python3 -m http.server 8080`.
