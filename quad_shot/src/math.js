// Quad Shot — Mathematical & Vector Geometry Engine
// All coordinates operate on the Cartesian Coordinate Plane

export class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    clone() {
        return new Vec2(this.x, this.y);
    }

    copy(v) {
        this.x = v.x;
        this.y = v.y;
        return this;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    scale(s) {
        this.x *= s;
        this.y *= s;
        return this;
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    cross(v) {
        return this.x * v.y - this.y * v.x;
    }

    magSq() {
        return this.x * this.x + this.y * this.y;
    }

    mag() {
        return Math.hypot(this.x, this.y);
    }

    normalize() {
        const m = this.mag();
        if (m > 0.00001) {
            this.x /= m;
            this.y /= m;
        } else {
            this.x = 0;
            this.y = 0;
        }
        return this;
    }

    dist(v) {
        return Math.hypot(this.x - v.x, this.y - v.y);
    }

    distSq(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return dx * dx + dy * dy;
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    rotate(angleRad) {
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const nx = this.x * cos - this.y * sin;
        const ny = this.x * sin + this.y * cos;
        this.x = nx;
        this.y = ny;
        return this;
    }

    reflect(normal) {
        // v' = v - 2 * (v . n) * n
        const d = 2 * this.dot(normal);
        this.x -= d * normal.x;
        this.y -= d * normal.y;
        return this;
    }

    lerp(v, t) {
        this.x += (v.x - this.x) * t;
        this.y += (v.y - this.y) * t;
        return this;
    }

    static fromAngle(angleRad, length = 1) {
        return new Vec2(Math.cos(angleRad) * length, Math.sin(angleRad) * length);
    }

    static add(a, b) {
        return new Vec2(a.x + b.x, a.y + b.y);
    }

    static sub(a, b) {
        return new Vec2(a.x - b.x, a.y - b.y);
    }

    static scale(a, s) {
        return new Vec2(a.x * s, a.y * s);
    }

    static dist(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }
}

// Geometric intersection & reflection utilities
export function lineIntersection(p1, p2, p3, p4) {
    const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
    if (Math.abs(d) < 1e-8) return null; // Parallel

    const u = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
    const v = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;

    if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
        return new Vec2(p1.x + u * (p2.x - p1.x), p1.y + u * (p2.y - p1.y));
    }
    return null;
}

// Flanking angle calculation for Vampiric Vectors
// Angle between attacker trajectory and target facing orientation
export function getFlankingAngle(attackerPos, targetPos, targetHeadingAngle) {
    const attackDir = Math.atan2(attackerPos.y - targetPos.y, attackerPos.x - targetPos.x);
    let diff = Math.abs(attackDir - targetHeadingAngle);
    while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);
    // diff = 0 is head-on, diff = PI is directly behind (flank)
    return diff; // in radians [0, PI]
}

// Calculate critical strike chance multiplier from flanking angle
export function calculateFlankCritChance(flankAngleRad) {
    // Linear scale from 0.05 (head-on) to 0.75 (from behind)
    const ratio = flankAngleRad / Math.PI;
    return 0.05 + ratio * 0.70;
}

// Sine wave displacement calculation
export function calculateSineWavePoint(origin, targetDir, distance, frequency, amplitude, phase) {
    const forward = Vec2.fromAngle(targetDir, distance);
    const perp = Vec2.fromAngle(targetDir + Math.PI / 2, Math.sin(distance * frequency + phase) * amplitude);
    return Vec2.add(origin, forward).add(perp);
}

// Parabolic arc displacement calculation
export function calculateParabolaHeight(t, maxHeight) {
    // 4 * h * t * (1 - t)
    return 4 * maxHeight * t * (1 - t);
}
