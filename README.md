# Respawn Roguelike — Quad Shot

**Quad Shot** is a high-speed 2D open-world roguelike set on an infinite Cartesian coordinate plane, engineered by reverse-engineering **Endless Fire** (`/endless`) and **G-Wars** (`/G-Wars_Stable_a_V0`) using the REA methodology and synthesized according to the [Quad Shot Game Design Document](file:///home/ashoka/Documents/Respawn/Quad_Shot-Game_Design_Document(1).md).

---

## 🚀 Quick Launch & Play

Open the game in any web browser:
- **Local Server**: `http://localhost:8080/quad_shot/index.html` (or root `http://localhost:8080/`)
- **Direct File**: Open [index.html](file:///home/ashoka/Documents/Respawn/quad_shot/index.html) directly in Chrome, Firefox, or Brave.

---

## 🕹️ Controls & Flight Manual

| Input | Action | Mechanic |
| :--- | :--- | :--- |
| **W, A, S, D** | 8-Directional Vector Movement | Direct or Inertial vector displacement |
| **Mouse Aim & LMB** | Aim & Fire Active Weapon | High-velocity projectile kinematics |
| **RMB / Shift** | **Suspension State** | Slows time by 60%, halts gravity for 2.5s trajectory calculation |
| **Space** | **8-Directional Vector Dash** | 5 charges; leaves glowing, damaging neon trail lines for 1.5s |
| **C** | **Apex Step** | Double-jump shockwave pulse: cancels light bullets, knocks back enemies |
| **1, 2, 3 / Q / Wheel** | Switch Primary Weapon | 3 slots: Sine Rifle, Reflection Ray, Mortar, Shotgun, etc. |
| **E / F** | Deploy Active Trap | Gravity Tether, Prism Mine, Möbius Snare, Vector Repulsor |
| **Z** | **Dual Physics Toggle** | Switch between **Kinematic Frame** (zero drift) & **Inertial Frame** (momentum/drift) |
| **P** | **Psycho FX Toggle** | Real-time chromatic distortion and reactive grid warping |
| **T** | **Avatar View Toggle** | Switch between Cyberpunk Character Sprite (Null-7) and Neon Vector Stickman |
| **M** | **The Meta Matrix** | (0,0) Origin Terminal for permanent upgrades, loadout tuning, and palette shifts |

---

## 🧬 Reverse Engineering Synthesis

### 1. From Endless Fire (`/endless`)
- **Multiplier Scoring Loop**: Multiplier increases with hits and decays over time ($dM/dt < 0$); score scales with active multiplier.
- **Procedural Pattern Escalation**: Semi-random procedural wave generation.
- **Psycho FX Visual Pipeline**: Real-time chromatic aberration, color cycling, and screen space distortion.
- **Defensive Bomb / Shield**: Mirrored in Quad Shot's **Apex Step** and **Deployable Traps**.

### 2. From G-Wars (`/G-Wars_Stable_a_V0`)
- **Vector Math & Orientation**: Rigidbody kinematic integration, normalized direction vectors, and mouse tracking.
- **Wave Management System**: Dynamic distance-filtered spawner with clear-to-advance logic.
- **Damped Follow Camera**: Smooth camera damping following player movements, with automatic **Macro-View** zoom-out on Boss waves.
- **Vector Visuals**: High-contrast glowing vector lines and bloom styling.

### 3. Sprite Pack Integration (`/sprites`)
- Uses the **Neon Cyber Pixel RPG Sprite Pack** (`/sprites/release/cyber`).
- Features **Null-7 (`VX-0024`)** with teal synth core glow as the protagonist **"The Origin Point (0,0)"**, alongside **Cipher (`VX-0012`)**, **Ledger (`VX-0048`)**, **Static (`VX-0042`)**, **Wire (`VX-0156`)**, and **Glitch (`VX-0240`)** powering hostile units and bosses.
- Both 8-directional top-down sprites and martial-arts animated vector stickman rendering are supported via the `T` key!

---

## 🗺️ Cartesian World Map & Biomes

Centred around **The Origin Point (0,0)** Hub:
- **Quadrant I (+,+)**: *Domain of Order* — Rigid crystalline grid with linear laser hazards.
- **Quadrant II (-,+)**: *Parabolic Wastes* — Curved gravitational arcs that bend projectile trajectories.
- **Quadrant III (-,-)**: *Fractal Depths* — Dense spatial corridors and recursively splitting hazard zones.
- **Quadrant IV (+,-)**: *Zero-G Void* — Frictionless grid space with long-distance directional drift.
- **Quadrant Scrambling**: Biome locations scramble upon player death, creating new progression routes each run.

---

## 🔬 Arsenal & Systems Summary

- **Weapons (Grades I to IV)**: Sine Rifle, Parabolic Mortar, Reflection Ray, Tangent Disc, Scalar Shotgun, Fractal Cluster, Asymptote Laser, Doppler Repeater.
- **Traps**: Gravity Tether, Prism Mine, Möbius Snare, Vector Repulsor.
- **Intersection Pause System**: Time slows to 5% when weapons drop; analyze trajectory math and choose **Swap** or **Scrap** for Vertices.
- **Bosses**: Orbital Torus, Hyperbolic Twins, Non-Euclidean Prism, Apex Icosahedron (every 5th wave), and Wave 100 **Corruption Vector** with adaptive swarm defense.
- **Meta-Progression**: Convert unspent Vertices into Prime Matrices (10:1 ratio) to unlock Algorithmic Tree tiers, Loadout Variables, and Chromatic Shifts.
