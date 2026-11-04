import * as THREE from 'three';
import { FIELD } from './arena.js';

function makeBallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#e8fbff');
  grad.addColorStop(0.5, '#c8e9f5');
  grad.addColorStop(1, '#a9d5e4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // soccer-ball style dark panels on a distorted hex grid
  const cell = 86;
  for (let row = -1; row < 8; row += 1) {
    for (let col = -1; col < 14; col += 1) {
      const ox = (row % 2) * cell * 0.5;
      const cx = col * cell + ox;
      const cy = row * cell * 0.86;
      if ((row * 7 + col * 3) % 5 !== 0) continue;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(((row * 13 + col * 7) % 10) * 0.06);
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const px = Math.cos(a) * 31;
        const py = Math.sin(a) * 31;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = '#132433';
      ctx.fill();
      ctx.strokeStyle = 'rgba(3, 10, 16, 0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  // Seams
  ctx.strokeStyle = 'rgba(20, 55, 70, 0.22)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 26; i += 1) {
    ctx.beginPath();
    ctx.arc(Math.random() * 1024, Math.random() * 512, 30 + Math.random() * 55, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Neon markings + brand
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#2ee7ff';
  ctx.beginPath();
  ctx.arc(512, 256, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#2ee7ff';
  ctx.beginPath();
  ctx.arc(512, 256, 38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#0a2a3a';
  ctx.font = '900 34px Orbitron, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NEON', 512, 140);
  ctx.fillText('STRIKERS', 512, 390);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeGlowSprite(color = 0xbfefff, size = 14) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.18, 'rgba(180,240,255,0.55)');
  g.addColorStop(0.5, 'rgba(80,200,255,0.18)');
  g.addColorStop(1, 'rgba(40,160,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex, color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(size);
  return sprite;
}

export class Ball {
  constructor(scene) {
    this.scene = scene;
    this.radius = 2.2;
    this.pos = new THREE.Vector3(0, this.radius, 0);
    this.vel = new THREE.Vector3();
    this.frozen = false;
    this.lastTouch = null;
    this.lastTouchCar = null;
    this.hitFlash = 0;
    this.trailTimer = 0;

    const tex = makeBallTexture();
    this.material = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0x1c4f63,
      emissiveMap: tex,
      emissiveIntensity: 0.75,
      metalness: 0.18,
      roughness: 0.44,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.radius, 48, 32), this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);

    this.shell = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius * 1.015, 32, 20),
      new THREE.MeshBasicMaterial({
        color: 0x7fefff, wireframe: true, transparent: true, opacity: 0.055,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    scene.add(this.shell);

    this.glow = makeGlowSprite(0xa8ecff, 15);
    scene.add(this.glow);

    this.light = new THREE.PointLight(0x9feaff, 3.2, 16, 2);
    scene.add(this.light);
  }

  reset() {
    this.pos.set(0, this.radius, 0);
    this.vel.set(0, 0, 0);
    this.frozen = false;
    this.hitFlash = 0;
    this.mesh.quaternion.identity();
    this.mesh.position.copy(this.pos);
    this.lastTouch = null;
    this.lastTouchCar = null;
  }

  update(dt, effects = {}) {
    if (this.frozen) {
      this.syncVisual(dt);
      return null;
    }
    const steps = 2;
    const h = dt / steps;
    let goal = null;
    for (let step = 0; step < steps && !goal; step += 1) {
      this.vel.y -= 31 * h;
      // air drag
      this.vel.multiplyScalar(Math.exp(-0.045 * h));
      this.pos.addScaledVector(this.vel, h);
      goal = this.resolveCollisions(effects);
    }
    if (goal) {
      this.frozen = true;
    }
    this.syncVisual(dt);
    return goal;
  }

  resolveCollisions(effects) {
    const r = this.radius;
    const halfX = FIELD.halfX;
    const halfZ = FIELD.halfZ;
    let goal = null;

    // Floor
    if (this.pos.y < r) {
      this.pos.y = r;
      if (this.vel.y < 0) {
        const impact = -this.vel.y;
        this.vel.y = impact > 1.2 ? impact * 0.7 : 0;
        this.vel.x *= 0.992;
        this.vel.z *= 0.992;
        if (impact > 9 && effects.bounce) effects.bounce(this, impact);
      }
    }
    // Ceiling
    if (this.pos.y > FIELD.ceiling - r) {
      this.pos.y = FIELD.ceiling - r;
      if (this.vel.y > 0) this.vel.y *= -0.62;
    }
    // Side walls
    if (this.pos.z > halfZ - r) {
      this.pos.z = halfZ - r;
      if (this.vel.z > 0) this.vel.z *= -0.68;
      this.vel.x *= 0.985;
      if (effects.wallBounce) effects.wallBounce(this);
    } else if (this.pos.z < -halfZ + r) {
      this.pos.z = -halfZ + r;
      if (this.vel.z < 0) this.vel.z *= -0.68;
      this.vel.x *= 0.985;
      if (effects.wallBounce) effects.wallBounce(this);
    }

    const inMouthZ = Math.abs(this.pos.z) < FIELD.goalHalfZ - 0.15;
    const inMouthY = this.pos.y < FIELD.goalHeight - 0.2;

    // End walls / goals
    for (const side of [-1, 1]) {
      const backX = side * (halfX + FIELD.goalDepth);
      if (side > 0) {
        if (this.pos.x > halfX - r) {
          if (!(inMouthZ && inMouthY)) {
            this.pos.x = halfX - r;
            if (this.vel.x > 0) this.vel.x *= -0.7;
            this.vel.y *= 0.97;
            this.vel.z *= 0.985;
            if (effects.wallBounce) effects.wallBounce(this);
          } else {
            // Goal interior
            if (this.pos.x > backX - r + 0.5) {
              this.pos.x = backX - r + 0.5;
              if (this.vel.x > 0) this.vel.x *= -0.4;
            }
            if (Math.abs(this.pos.z) > FIELD.goalHalfZ - r + 0.5) {
              this.pos.z = Math.sign(this.pos.z) * (FIELD.goalHalfZ - r + 0.5);
              this.vel.z *= -0.4;
            }
            if (this.pos.y > FIELD.goalHeight - r + 0.4) {
              this.pos.y = FIELD.goalHeight - r + 0.4;
              this.vel.y *= -0.4;
            }
            if (this.pos.x > halfX + 1.4) goal = 'blue';
          }
        }
      } else if (this.pos.x < -halfX + r) {
        if (!(inMouthZ && inMouthY)) {
          this.pos.x = -halfX + r;
          if (this.vel.x < 0) this.vel.x *= -0.7;
          this.vel.y *= 0.97;
          this.vel.z *= 0.985;
          if (effects.wallBounce) effects.wallBounce(this);
        } else {
          if (this.pos.x < backX + r - 0.5) {
            this.pos.x = backX + r - 0.5;
            if (this.vel.x < 0) this.vel.x *= -0.4;
          }
          if (Math.abs(this.pos.z) > FIELD.goalHalfZ - r + 0.5) {
            this.pos.z = Math.sign(this.pos.z) * (FIELD.goalHalfZ - r + 0.5);
            this.vel.z *= -0.4;
          }
          if (this.pos.y > FIELD.goalHeight - r + 0.4) {
            this.pos.y = FIELD.goalHeight - r + 0.4;
            this.vel.y *= -0.4;
          }
          if (this.pos.x < -halfX - 1.4) goal = 'orange';
        }
      }
    }

    // Goal posts (simple cylinder caps)
    for (const side of [-1, 1]) {
      for (const z of [-FIELD.goalHalfZ, FIELD.goalHalfZ]) {
        const dx = this.pos.x - side * halfX;
        const dy = this.pos.y - FIELD.goalHeight / 2;
        const dz = this.pos.z - z;
        const d = Math.sqrt(dx * dx + dz * dz);
        const minDist = r + 0.38;
        if (Math.abs(dy) < FIELD.goalHeight / 2 + 0.2 && d < minDist && d > 0.001) {
          const nx = dx / d;
          const nz = dz / d;
          this.pos.x = side * halfX + nx * minDist;
          this.pos.z = z + nz * minDist;
          const vn = this.vel.x * nx + this.vel.z * nz;
          if (vn < 0) {
            this.vel.x -= 1.5 * vn * nx;
            this.vel.z -= 1.5 * vn * nz;
          }
        }
      }
    }
    return goal;
  }

  syncVisual(dt) {
    this.mesh.position.copy(this.pos);
    this.shell.position.copy(this.pos);
    this.glow.position.copy(this.pos);
    this.light.position.copy(this.pos);
    const speed = this.vel.length();
    this.glow.scale.setScalar(14 + Math.min(10, speed * 0.22));
    this.glow.material.opacity = 0.35 + Math.min(0.4, speed * 0.008);
    this.light.intensity = 2.2 + Math.min(6, speed * 0.12);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 2.8);
    this.material.emissiveIntensity = 0.7 + this.hitFlash * 2.8;
    if (speed > 0.2) {
      const axis = new THREE.Vector3(-this.vel.z, 0, this.vel.x).normalize();
      const angle = (speed * dt) / this.radius;
      this.mesh.rotateOnWorldAxis(axis, angle);
      this.shell.rotateOnWorldAxis(axis, angle * 0.6);
    }
    this.shell.material.opacity = 0.012 + Math.min(0.032, speed * 0.0008) + this.hitFlash * 0.05;
  }
}
