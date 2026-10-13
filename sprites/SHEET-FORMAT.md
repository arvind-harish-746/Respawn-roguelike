# Sheet metadata format (`*_sheet.json`)

Every baked PNG has a sidecar JSON file with identical basename.

## Example

```json
{
  "seed": "VX-0042",
  "generator": "cyber",
  "archetype": "punk",
  "outfit": "jacket",
  "gender": "fem",
  "cellW": 56,
  "cellH": 84,
  "directions": 8,
  "frames": 6,
  "layout": "rows=directions (front, clockwise), cols=frames",
  "note": "pixel art bake (56×84 cells, ÷4 from render res)"
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `seed` | string | Generator seed (reproducible in the baker UI) |
| `generator` | `"cyber"` \| `"chibi"` \| `"mii"` | Which generator produced the character |
| `archetype` | string | Cyber archetype or `"chibi"` / `"mii"` |
| `outfit` | string | Outfit tag from generation |
| `gender` | `"masc"` \| `"fem"` \| `"andro"` | Body roll |
| `cellW` | number | Pixel width of one frame |
| `cellH` | number | Pixel height of one frame |
| `directions` | number | Row count (typically 4, 8, or 16) |
| `frames` | number | Column count (walk cycle length) |
| `layout` | string | Human-readable layout hint (stable contract) |
| `note` | string | Bake style notes (pixel scale, cel, camera, etc.) |
| `cameraView` | `"face"` \| `"ortho_low"` \| `"ortho"` \| `"ortho_high"` \| `"topdown"` | Optional — baked camera preset |
| `cameraPitch` | number | Optional — camera pitch in degrees at bake time |

## Camera views

Cyber pack sheets use filename suffixes matching `cameraView`:

| Suffix | `cameraView` | Typical use |
|--------|--------------|-------------|
| `_face_sheet` | `face` | Dialogue, horizontal scenes |
| `_ortho_low_sheet` | `ortho_low` | Shallow elevated walk |
| `_ortho_sheet` | `ortho` | Default RPG walk cycle |
| `_ortho_high_sheet` | `ortho_high` | Steep elevated walk |
| `_topdown_sheet` | `topdown` | Twin-stick / strict top-down |

## Atlas math

```
sheetWidth  = frames * cellW
sheetHeight = directions * cellH
```

Source rectangle for direction `d`, frame `f`:

```
x = f * cellW
y = d * cellH
w = cellW
h = cellH
```

## Facing row from velocity

Given normalized movement `(vx, vy)` on screen (Y+ = down):

```javascript
function angleToRow(vx, vy, directions) {
  const theta = Math.atan2(vx, vy);
  let d = Math.round((theta / (2 * Math.PI)) * directions);
  return ((d % directions) + directions) % directions;
}
```

Row 0 = character facing the camera (classic top-down “down” on keyboard).

## Animation

- **Walking:** cycle `frame` from `0` to `frames - 1` at your chosen FPS.
- **Idle:** hold `frame = 0`, keep last `dir` from movement.

## Validation

The repo's `parseSheetMeta()` in `src/bake/export.ts` is the reference validator used by the playground.
