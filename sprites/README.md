# Neon Cyber Pixel RPG Sprite Pack

**20 pre-baked cyberpunk characters for game jams and sci-fi indie prototypes.**

Each character ships as **five camera views** — PNG atlas + JSON sidecar per view. Drop into Phaser, Godot, Pixi, or plain canvas. **CC0 license.** No engine lock-in.

## What's in the zip

```
release/cyber/
  VX-0001_ortho_sheet.png + .json      ← Neon Jack (walk / RPG)
  VX-0001_face_sheet.png + .json       ← same character, face-on
  VX-0001_ortho_low_sheet.png + .json
  VX-0001_ortho_high_sheet.png + .json
  VX-0001_topdown_sheet.png + .json
  ...20 characters × 5 views = 100 sheet pairs
roster.json                            ← names, seeds, hues, hero augment locks
examples/
  minimal-demo.html                    ← WASD demo in browser
  sprite-loader.js                     ← ~120 lines, zero dependencies
CYBER-PACK.md · SHEET-FORMAT.md · LICENSE
```

## Camera views (pick per use case)

| View suffix | Pitch | Best for |
|-------------|-------|----------|
| `_ortho_sheet` | 22° | **Default** — elevated RPG walk cycle |
| `_ortho_low_sheet` | 12° | Shallow angle — more body depth |
| `_ortho_high_sheet` | 42° | Steeper read — closer to top-down |
| `_topdown_sheet` | 88° | Twin-stick / strict top-down |
| `_face_sheet` | 0° | Dialogue portraits, horizontal scenes |

All views share the same **8 directions × 6 walk frames** layout.

## Specs (consistent across all sheets)

| | |
|--|--|
| Layout | Rows = direction (8), columns = walk frame (6) |
| Row 0 | Facing down (top-down RPG convention) |
| Cell size | **56×84 px** |
| Background | Transparent |
| Style | Pixel RPG — neon cyber palette, ink outlines |

## Named roster (preview)

Neon Jack · Cipher · Null-7 · Grit · Static · Ledger · Bolt · Ghost · Chrome · Dust · Riot · Vice · Scar · Proxy · Wire · Sable · Hex · Apex · Ridge · Glitch

Full metadata in `roster.json`.

## Quick start

1. Open `examples/minimal-demo.html` in a browser
2. Load any `VX-XXXX_ortho_sheet.png` + matching `.json` (start with ortho for gameplay)
3. Move with **WASD** — facing row and walk cycle follow automatically

Copy `sprite-loader.js` into your project. See [`SHEET-FORMAT.md`](SHEET-FORMAT.md) for atlas math and `cameraView` fields.

## Roll your own

Every JSON includes the **seed** and generator tag. Run the Voxel Baker locally (`npm run dev` → `/index.html`) to regenerate variants or bake additional camera angles.

## License

**CC0 1.0** — commercial use OK, no attribution required.
