# Neon Cyber Pixel RPG Pack

Commercial jam pack: **20 procedural cyberpunk characters** × **5 camera views** baked to **56×84** pixel cells (from 224×336 render @ ÷4).

Roster: [`cyber-roster.json`](cyber-roster.json)  
Golden QA: [`golden-seeds.json`](golden-seeds.json) → `cyber[]`

## Camera views (all included per character)

| View | Pitch | Filename | Use |
|------|-------|----------|-----|
| **face** | 0° | `{seed}_face_sheet.*` | Horizontal face-on portraits & dialogue |
| **ortho_low** | 12° | `{seed}_ortho_low_sheet.*` | Shallow elevated — more body depth |
| **ortho** | 22° | `{seed}_ortho_sheet.*` | Classic elevated RPG walk cycle |
| **ortho_high** | 42° | `{seed}_ortho_high_sheet.*` | Steep elevated — stronger top-read |
| **topdown** | 88° | `{seed}_topdown_sheet.*` | Near top-down / twin-stick friendly |

All use the same orthographic projection — only camera elevation changes.

## Locked bake recipe (`/index.html`)

| Control | Value |
|---------|-------|
| Style | **Pixel RPG** |
| Directions | **8** |
| Walk frames | **6** |
| Render res | **224×336** (slider index 2) |
| Pixel scale | **÷4** → **56×84** cells |
| Outline | **40%** |
| Saturation | **110%** |
| Pose | Walk |

Pitch is set per view (see table above). Default preview / walk gameplay: **ortho** (22°).

Manual: for each roster entry, bake once per view in `bakeDefaults.views`.

## Roster tiers

| Tier | Seeds | Notes |
|------|-------|-------|
| Hero | VX-0001, VX-0012, VX-0024, VX-0036 | Augment locks in roster JSON — cover art |
| Standard | 15 seeds | Archetype + hue locked; augments RNG |
| Wildcard | VX-0240 | `gender`/`outfit` auto — preview before ship |

## Bake loop

Automated (recommended):

```bash
npm run dev   # in another terminal
npm run bake:cyber-roster
npm run verify:cyber-release
```

Manual: for each roster entry, bake once per view in `bakeDefaults.views`.

## QA automation

```bash
npm run verify:vx-golden
npm run verify:chibi-golden
npm run verify:cloth-clearance
npm run typecheck
npm run bake:cyber-roster
npm run verify:cyber-release   # expects 100 sheets (20×5 views)
```

**Showcase:** [`/showcase.html`](/showcase.html) — live roster explorer and pack pitch page.

## Export JSON (additive fields)

- `cameraView`: `"face"` | `"ortho_low"` | `"ortho"` | `"ortho_high"` | `"topdown"`
- `cameraPitch`: degrees at bake time
- Cyber augments: `cyberArm`, `cyberLeg`, `core`, `visor`, `hood`, `synth`

## Zip layout

```bash
npm run zip:cyber   # → chrome-district.zip (repo root)
```

Contents: `LICENSE`, `README.md`, `SHEET-FORMAT.md`, `CYBER-PACK.md`, `release/roster.json`, `examples/`, `release/cyber/` (100 PNG + 100 JSON).
