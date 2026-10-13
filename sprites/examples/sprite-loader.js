/**
 * Minimal loader for Voxel Sprite Baker sheets (PNG + JSON).
 * No dependencies — copy into jam projects or script-tag from examples/.
 *
 * @see ../SHEET-FORMAT.md
 */
(function (global) {
  'use strict';

  function parseSheetMeta(json) {
    if (typeof json !== 'object' || json === null) throw new Error('Invalid sheet metadata');
    const m = json;
    for (const k of ['seed', 'cellW', 'cellH', 'directions', 'frames']) {
      if (!(k in m)) throw new Error('Missing field: ' + k);
    }
    return {
      seed: String(m.seed),
      generator: m.generator || 'cyber',
      archetype: m.archetype,
      outfit: m.outfit,
      gender: m.gender,
      cellW: Number(m.cellW),
      cellH: Number(m.cellH),
      directions: Number(m.directions),
      frames: Number(m.frames),
      layout: String(m.layout || ''),
      note: String(m.note || ''),
    };
  }

  function loadSheet(pngUrl, jsonUrl) {
    return fetch(jsonUrl)
      .then(function (r) {
        if (!r.ok) throw new Error('JSON fetch failed');
        return r.json();
      })
      .then(function (json) {
        const meta = parseSheetMeta(json);
        return new Promise(function (resolve, reject) {
          const img = new Image();
          img.onload = function () {
            resolve({ image: img, meta: meta });
          };
          img.onerror = reject;
          img.src = pngUrl;
        });
      });
  }

  function loadSheetFromFiles(pngFile, jsonFile) {
    return jsonFile.text().then(function (text) {
      const meta = parseSheetMeta(JSON.parse(text));
      const url = URL.createObjectURL(pngFile);
      return new Promise(function (resolve, reject) {
        const img = new Image();
        img.onload = function () {
          URL.revokeObjectURL(url);
          resolve({ image: img, meta: meta });
        };
        img.onerror = function (err) {
          URL.revokeObjectURL(url);
          reject(err);
        };
        img.src = url;
      });
    });
  }

  /** Movement → facing row. Screen Y+ = down. See pack/SHEET-FORMAT.md */
  function angleToRow(vx, vy, directions) {
    const theta = Math.atan2(vx, vy);
    let d = Math.round((theta / (2 * Math.PI)) * directions);
    return ((d % directions) + directions) % directions;
  }

  function SpriteController(meta) {
    this.meta = meta;
    this.state = { x: 0, y: 0, vx: 0, vy: 0, dir: 0, frame: 0, frameTimer: 0, pose: 'idle' };
    this.keys = new Set();
    this.speed = 140;
  }

  SpriteController.prototype.onKeyDown = function (key) {
    this.keys.add(String(key).toLowerCase());
  };

  SpriteController.prototype.onKeyUp = function (key) {
    this.keys.delete(String(key).toLowerCase());
  };

  SpriteController.prototype.tick = function (dt, fps, bounds) {
    const k = this.keys;
    let vx = 0;
    let vy = 0;
    if (k.has('a') || k.has('arrowleft')) vx -= 1;
    if (k.has('d') || k.has('arrowright')) vx += 1;
    if (k.has('w') || k.has('arrowup')) vy -= 1;
    if (k.has('s') || k.has('arrowdown')) vy += 1;

    const moving = vx !== 0 || vy !== 0;
    const s = this.state;
    const meta = this.meta;

    if (moving) {
      const len = Math.hypot(vx, vy) || 1;
      vx /= len;
      vy /= len;
      s.dir = angleToRow(vx, vy, meta.directions);
      s.pose = 'walk';
      s.x += vx * this.speed * dt;
      s.y += vy * this.speed * dt;
    } else {
      s.pose = 'idle';
    }
    s.vx = vx;
    s.vy = vy;

    if (moving) {
      s.frameTimer += dt;
      const frameDur = 1 / Math.max(1, fps);
      while (s.frameTimer >= frameDur) {
        s.frameTimer -= frameDur;
        s.frame = (s.frame + 1) % meta.frames;
      }
    } else {
      s.frame = 0;
      s.frameTimer = 0;
    }

    if (bounds) {
      const hw = bounds.cellW / 2;
      const hh = bounds.cellH / 2;
      s.x = Math.min(Math.max(s.x, hw), bounds.w - hw);
      s.y = Math.min(Math.max(s.y, hh), bounds.h - hh);
    }
  };

  /** Draw one cell centered at (x, y). scale multiplies cell size. */
  function drawSprite(ctx, image, meta, dir, frame, x, y, scale) {
    scale = scale == null ? 1 : scale;
    const w = meta.cellW * scale;
    const h = meta.cellH * scale;
    const sx = frame * meta.cellW;
    const sy = dir * meta.cellH;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, sx, sy, meta.cellW, meta.cellH, x - w / 2, y - h / 2, w, h);
  }

  global.VoxelSheet = {
    parseSheetMeta: parseSheetMeta,
    loadSheet: loadSheet,
    loadSheetFromFiles: loadSheetFromFiles,
    angleToRow: angleToRow,
    SpriteController: SpriteController,
    drawSprite: drawSprite,
  };
})(typeof window !== 'undefined' ? window : globalThis);
