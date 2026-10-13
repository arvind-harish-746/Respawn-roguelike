// Quad Shot — Reactive Cartesian Grid & Deformable Space Engine
import { Vec2 } from './math.js';

export class CartesianGrid {
    constructor(worldWidth = 4000, worldHeight = 4000, spacing = 60) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.spacing = spacing;
        this.cols = Math.ceil(worldWidth / spacing) + 1;
        this.rows = Math.ceil(worldHeight / spacing) + 1;
        this.halfW = worldWidth / 2;
        this.halfH = worldHeight / 2;

        // Deformation grid vertices
        this.points = [];
        this.initGrid();

        // Biome mapping: [Q1 (+,+), Q2 (-,+), Q3 (-,-), Q4 (+,-)]
        this.biomes = ['Domain of Order', 'Parabolic Wastes', 'Fractal Depths', 'Zero-G Void'];
        
        // Themes
        this.theme = 'CYBER'; // CYBER, ULTRAVIOLET, THERMAL, MATRIX, MONOCHROME
        this.psychoMode = false;
        this.time = 0;
    }

    initGrid() {
        this.points = [];
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const ox = -this.halfW + x * this.spacing;
                const oy = -this.halfH + y * this.spacing;
                this.points.push({
                    ox, oy, // Original rest position
                    x: ox, y: oy, // Current deformed position
                    vx: 0, vy: 0 // Velocity for spring oscillation
                });
            }
        }
    }

    scrambleQuadrants() {
        // Scramble the 4 biomes across the quadrants upon player death
        for (let i = this.biomes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.biomes[i], this.biomes[j]] = [this.biomes[j], this.biomes[i]];
        }
    }

    getBiomeAt(x, y) {
        // Hub check: (0,0) safe zone within radius 350
        if (Math.hypot(x, y) < 350) return 'The Origin Hub';
        if (x >= 0 && y >= 0) return this.biomes[0]; // Quadrant I
        if (x < 0 && y >= 0) return this.biomes[1];  // Quadrant II
        if (x < 0 && y < 0) return this.biomes[2];   // Quadrant III
        return this.biomes[3];                       // Quadrant IV
    }

    applyImpulse(x, y, radius, strength) {
        const rSq = radius * radius;
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            const dx = p.x - x;
            const dy = p.y - y;
            const distSq = dx * dx + dy * dy;
            if (distSq < rSq && distSq > 0.001) {
                const dist = Math.sqrt(distSq);
                const force = (1 - dist / radius) * strength;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }
        }
    }

    applyGravityWell(x, y, radius, pullStrength) {
        const rSq = radius * radius;
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            const dx = x - p.x;
            const dy = y - p.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < rSq && distSq > 0.001) {
                const dist = Math.sqrt(distSq);
                const force = (1 - dist / radius) * pullStrength;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }
        }
    }

    update(dt) {
        this.time += dt;
        // Spring physics relaxation towards (ox, oy)
        const stiffness = 0.08;
        const damping = 0.88;

        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            const ax = (p.ox - p.x) * stiffness;
            const ay = (p.oy - p.y) * stiffness;
            p.vx = (p.vx + ax) * damping;
            p.vy = (p.vy + ay) * damping;
            p.x += p.vx;
            p.y += p.vy;
        }
    }

    render(ctx, camera) {
        ctx.save();

        const viewLeft = camera.x - camera.width / (2 * camera.zoom) - 100;
        const viewRight = camera.x + camera.width / (2 * camera.zoom) + 100;
        const viewTop = camera.y - camera.height / (2 * camera.zoom) - 100;
        const viewBottom = camera.y + camera.height / (2 * camera.zoom) + 100;

        // Theme colors
        let gridColor = 'rgba(0, 240, 255, 0.12)';
        let axisColor = 'rgba(0, 255, 234, 0.7)';
        let hubColor = 'rgba(57, 255, 20, 0.6)';
        let textColor = 'rgba(0, 240, 255, 0.4)';

        if (this.psychoMode) {
            const hue = (this.time * 90) % 360;
            gridColor = `hsla(${hue}, 100%, 55%, 0.25)`;
            axisColor = `hsla(${(hue + 180) % 360}, 100%, 65%, 0.9)`;
            hubColor = `hsla(${(hue + 90) % 360}, 100%, 60%, 0.8)`;
            textColor = `hsla(${hue}, 100%, 75%, 0.7)`;
        } else if (this.theme === 'ULTRAVIOLET') {
            gridColor = 'rgba(157, 0, 255, 0.15)';
            axisColor = 'rgba(255, 0, 180, 0.8)';
            hubColor = 'rgba(180, 80, 255, 0.7)';
        } else if (this.theme === 'THERMAL') {
            gridColor = 'rgba(255, 170, 0, 0.15)';
            axisColor = 'rgba(255, 60, 0, 0.8)';
            hubColor = 'rgba(255, 230, 0, 0.7)';
        } else if (this.theme === 'MATRIX') {
            gridColor = 'rgba(0, 255, 65, 0.13)';
            axisColor = 'rgba(50, 255, 100, 0.8)';
            hubColor = 'rgba(120, 255, 160, 0.7)';
        } else if (this.theme === 'MONOCHROME') {
            gridColor = 'rgba(255, 255, 255, 0.1)';
            axisColor = 'rgba(255, 255, 255, 0.75)';
            hubColor = 'rgba(220, 220, 220, 0.8)';
        }

        // Draw grid lines (horizontal & vertical)
        ctx.lineWidth = 1;
        ctx.strokeStyle = gridColor;

        // Horizontal lines
        for (let y = 0; y < this.rows; y++) {
            const p0 = this.points[y * this.cols];
            if (p0.y < viewTop || p0.y > viewBottom) continue;
            ctx.beginPath();
            let started = false;
            for (let x = 0; x < this.cols; x++) {
                const p = this.points[y * this.cols + x];
                if (p.x >= viewLeft && p.x <= viewRight) {
                    if (!started) {
                        ctx.moveTo(p.x, p.y);
                        started = true;
                    } else {
                        ctx.lineTo(p.x, p.y);
                    }
                }
            }
            ctx.stroke();
        }

        // Vertical lines
        for (let x = 0; x < this.cols; x++) {
            const p0 = this.points[x];
            if (p0.x < viewLeft || p0.x > viewRight) continue;
            ctx.beginPath();
            let started = false;
            for (let y = 0; y < this.rows; y++) {
                const p = this.points[y * this.cols + x];
                if (p.y >= viewTop && p.y <= viewBottom) {
                    if (!started) {
                        ctx.moveTo(p.x, p.y);
                        started = true;
                    } else {
                        ctx.lineTo(p.x, p.y);
                    }
                }
            }
            ctx.stroke();
        }

        // Major Cartesian Coordinate Axes: X-Axis (y=0) and Y-Axis (x=0)
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = axisColor;
        ctx.shadowBlur = 12;
        ctx.shadowColor = axisColor;

        // X-Axis
        ctx.beginPath();
        ctx.moveTo(-this.halfW, 0);
        ctx.lineTo(this.halfW, 0);
        ctx.stroke();

        // Y-Axis
        ctx.beginPath();
        ctx.moveTo(0, -this.halfH);
        ctx.lineTo(0, this.halfH);
        ctx.stroke();

        // Origin (0,0) Hub Anchor
        ctx.shadowBlur = 20;
        ctx.shadowColor = hubColor;
        ctx.strokeStyle = hubColor;
        ctx.fillStyle = 'rgba(57, 255, 20, 0.05)';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(0, 0, 320, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();

        // Inner Hub Matrix Anchor Ring
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, 240, this.time * 0.4, this.time * 0.4 + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Origin Crosshair
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.moveTo(-30, 0); ctx.lineTo(30, 0);
        ctx.moveTo(0, -30); ctx.lineTo(0, 30);
        ctx.stroke();

        // Quadrant Labels & Coordinate Markers
        ctx.shadowBlur = 0;
        ctx.font = '13px "JetBrains Mono", monospace';
        ctx.fillStyle = textColor;

        // Quadrant texts
        ctx.fillText(`QUADRANT I (+,+) — [${this.biomes[0]}]`, 420, 420);
        ctx.fillText(`QUADRANT II (-,+) — [${this.biomes[1]}]`, -850, 420);
        ctx.fillText(`QUADRANT III (-,-) — [${this.biomes[2]}]`, -850, -420);
        ctx.fillText(`QUADRANT IV (+,-) — [${this.biomes[3]}]`, 420, -420);
        
        ctx.fillStyle = hubColor;
        ctx.font = 'bold 15px "JetBrains Mono", monospace';
        ctx.fillText('THE ORIGIN POINT (0,0) — [NON-COMBAT MATRIX HUB]', -210, -40);

        ctx.restore();
    }
}
