# Quad Shot — 2D Cartesian Roguelike

**Quad Shot** is a high-speed 2D open-world roguelike set on an infinite Cartesian coordinate plane, built according to the [Quad Shot Game Design Document](file:///home/ashoka/Documents/Respawn/Quad_Shot-Game_Design_Document(1).md). The game visualizes combat through neon minimalism—a dark grid universe pulsing with high-contrast glowing vector graphics, geometric trajectory lines, reactive grid deformation, and fluid martial-arts combat.

---

## Standalone Desktop Launchers

Quad Shot runs as a dedicated desktop application in its own chromeless window with self-healing runtime and asset recovery:

### Linux
Run the native binary or launcher script:
```bash
./bin/quad_shot-linux
# or
./quad_shot.sh
```

### Windows (Direct Executable & Installer)
Download or double-click **`quad_shot.exe`** right at the repository root:
```cmd
quad_shot.exe
```
> *Self-Healing Installer*: You can download **`quad_shot.exe`** on its own from GitHub without cloning the repo. On first run, it automatically unpacks all embedded assets and launches the game in a dedicated window.

### macOS
Double-click `quad_shot.command` or run:
```bash
./bin/quad_shot-macos          # Intel x86_64
./bin/quad_shot-macos-arm64    # Apple Silicon M-Series
```

### Direct Browser Launch
You can also open [index.html](file:///home/ashoka/Documents/Respawn/quad_shot/index.html) directly in any browser (Chrome, Firefox, Brave) via `file://` or run `python3 -m http.server 8080`.

---

## Controls & Flight Manual

| Input | Action | Mechanic |
| :--- | :--- | :--- |
| **W, A, S, D** | 8-Directional Vector Movement | Direct or Inertial vector displacement |
| **Mouse Aim & LMB** | Aim & Fire Active Weapon | High-velocity projectile kinematics |
| **RMB / Shift** | **Suspension State** | Slows time by 60%, halts gravity for 2.5s trajectory calculation |
| **Space** | **8-Directional Vector Dash** | 5 charges; leaves glowing, damaging neon trail lines for 1.5s |
| **C** | **Apex Step** | Double-jump shockwave pulse: cancels light bullets, knocks back enemies |
| **1, 2, 3 / Q / Wheel** | Switch Primary Weapon | 3 slots: Sine Rifle, Reflection Ray, Mortar, Shotgun, etc. |
| **E / F** | Deploy Active Trap | Gravity Tether, Prism Mine, Möbius Snare, Vector Repulsor |
| **V** | **Combat Mode Toggle** | Switch between **Melee Mode** (weapon slash arcs & bullet-canceling cartoon effects) & **Ranged Mode** (mouse-aimed projectiles, waves, lasers) |
| **Z** | **Dual Physics Toggle** | Switch between **Kinematic Frame** (zero drift) & **Inertial Frame** (momentum/drift) |
| **P** | **Psycho FX Toggle** | Real-time chromatic distortion and reactive grid warping |
| **T** | **Avatar View Toggle** | Switch between Cyberpunk Character Sprite (Null-7) and Neon Vector Stickman |
| **M** | **The Meta Matrix** | (0,0) Origin Terminal for permanent upgrades, loadout tuning, and palette shifts |

---

## Core Architecture & Game Systems

### 1. Dual Physics System (Selectable via `Z`)
- **Kinematic Frame**: Direct, instantaneous velocity response with zero rotational drift. Strict tactical angle management.
- **Inertial Frame**: Momentum-driven physics utilizing ragdoll-style vector preservation, drift friction, thrust acceleration, and high-velocity slingshot maneuvers.

### 2. Infinite Cartesian World Map & 4 Dynamic Quadrants
Centered around **The Origin Point (0,0)** Hub:
- **Quadrant I (+,+) — Domain of Order**: Rigid crystalline grid with linear laser hazards and right-angled layouts.
- **Quadrant II (-,+) — Parabolic Wastes**: Curved geometry lines and gravitational arcs that bend projectile paths.
- **Quadrant III (-,-) — Fractal Depths**: Self-similar obstacle clusters and recursively splitting hazard zones.
- **Quadrant IV (+,-) — Zero-G Void**: Frictionless grid space with free-floating geometry hazards and long-distance drift.
- **Quadrant Scrambler**: Biome locations scramble upon player death, creating new progression routes each run.

### 3. Cyberpunk Character Roster Integration (`/sprites`)
- Uses the **Neon Cyber Pixel RPG Sprite Pack** (`/sprites/release/cyber`).
- Features **Null-7 (`VX-0024`)** with teal synth core glow as the protagonist **"The Origin Point (0,0)"**, alongside **Cipher (`VX-0012`)**, **Ledger (`VX-0048`)**, **Static (`VX-0042`)**, **Wire (`VX-0156`)**, and **Glitch (`VX-0240`)** powering hostile units and bosses.
- Both 8-directional top-down sprites and martial-arts animated vector stickman rendering are supported seamlessly via the `T` key.

---

## Arsenal & Systems Summary

- **Weapons (Grades I to IV)**: Sine Rifle, Parabolic Mortar, Reflection Ray, Tangent Disc, Scalar Shotgun, Fractal Cluster, Asymptote Laser, Doppler Repeater.
- **Traps**: Gravity Tether, Prism Mine, Möbius Snare, Vector Repulsor.
- **Intersection Pause System**: Time slows to 5% when weapons drop; analyze trajectory math and choose **Swap** into active loadout or **Scrap** for Vertices.
- **Bosses**: Orbital Torus, Hyperbolic Twins, Non-Euclidean Prism, Apex Icosahedron (every 5th wave), and Wave 100 **Corruption Vector** with adaptive swarm defense.
- **Meta-Progression**: Convert unspent Vertices into Prime Matrices (10:1 ratio) to unlock Algorithmic Tree tiers, Loadout Variables, and Chromatic Shifts.
