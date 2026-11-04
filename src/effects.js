import * as THREE from 'three';

const PARTICLE_VERT = `
  attribute float size;
  attribute float alpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = alpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (330.0 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;
const PARTICLE_FRAG = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    if (d > 0.5) discard;
    float glow = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(vColor, glow * vAlpha);
  }
`;

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.max = 1400;
    this.cursor = 0;
    this.particles = [];
    const positions = new Float32Array(this.max * 3);
    const colors = new Float32Array(this.max * 3);
    const sizes = new Float32Array(this.max);
    const alphas = new Float32Array(this.max);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    this.material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.rings = [];
    this.ringGeometry = new THREE.RingGeometry(0.92, 1.0, 72);
    this.tmpColor = new THREE.Color();
    this.emitAccum = 0;
  }

  spawn(opts) {
    const {
      position, count = 1, spread = 0.2, speed = 0, speedSpread = 0,
      direction = null, colors = [0xffffff], size = [0.3, 0.9], life = [0.4, 1.0],
      gravity = 0, drag = 0.2, upward = 0,
    } = opts;
    for (let i = 0; i < count; i += 1) {
      const idx = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      const p = this.particles[idx] || { pos: new THREE.Vector3(), vel: new THREE.Vector3(), color: new THREE.Color() };
      p.pos.copy(position);
      p.pos.x += (Math.random() - 0.5) * spread;
      p.pos.y += (Math.random() - 0.5) * spread;
      p.pos.z += (Math.random() - 0.5) * spread;
      p.vel.set(0, 0, 0);
      if (direction) p.vel.copy(direction).multiplyScalar(speed + Math.random() * speedSpread);
      else {
        p.vel.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
          .normalize().multiplyScalar(speed + Math.random() * speedSpread);
      }
      p.vel.y += upward * (0.5 + Math.random());
      p.vel.x += (Math.random() - 0.5) * speedSpread * 0.45;
      p.vel.z += (Math.random() - 0.5) * speedSpread * 0.45;
      const base = colors[Math.floor(Math.random() * colors.length)];
      p.color.set(base);
      if (Math.random() < 0.25) p.color.lerp(new THREE.Color(0xffffff), 0.6);
      p.size = size[0] + Math.random() * (size[1] - size[0]);
      p.maxLife = life[0] + Math.random() * (life[1] - life[0]);
      p.life = p.maxLife;
      p.gravity = gravity;
      p.drag = drag;
      p.active = true;
      this.particles[idx] = p;
    }
  }

  ring(position, color, plane = 'x', duration = 0.7, maxScale = 24) {
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.8, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.ringGeometry, mat);
    mesh.position.copy(position);
    if (plane === 'x') mesh.rotation.y = Math.PI / 2;
    else if (plane === 'floor') mesh.rotation.x = -Math.PI / 2;
    mesh.scale.setScalar(1);
    this.scene.add(mesh);
    this.rings.push({ mesh, time: 0, duration, maxScale });
  }

  boost(car, dt) {
    this.emitAccum += dt * 55;
    const emit = Math.floor(this.emitAccum);
    if (emit <= 0) return;
    this.emitAccum -= emit;
    const fwd = car.forward;
    const pos = new THREE.Vector3().copy(car.pos)
      .addScaledVector(fwd, -car.stats.dims.length * 0.5)
      .add(new THREE.Vector3(0, 0.5, 0));
    const dir = new THREE.Vector3().copy(fwd).multiplyScalar(-1);
    const colors = [car.build.chosen.boost.flame, car.build.chosen.boost.flame2, 0xffffff];
    this.spawn({
      position: pos, count: emit, spread: 0.26, direction: dir, speed: 6, speedSpread: 5,
      colors, size: [0.25, 0.65], life: [0.16, 0.4], gravity: -1.5, drag: 1.6,
    });
  }

  hit(car, ball, impact, normal) {
    const count = Math.min(34, Math.floor(8 + impact * 0.7));
    const pos = ball.pos.clone().addScaledVector(normal, -ball.radius * 0.45);
    const teamColor = car.team.bright;
    const colors = [teamColor, 0xffffff, 0xffe6a8];
    this.spawn({
      position: pos, count, spread: ball.radius * 0.65, direction: normal, speed: 5,
      speedSpread: impact * 0.65, colors, size: [0.3, 1.0], life: [0.25, 0.8], gravity: 4, drag: 1.0,
    });
    this.ring(pos, teamColor, 'x', 0.32, 4 + impact * 0.2);
  }

  land(car, impact) {
    const pos = new THREE.Vector3(car.pos.x, 0.12, car.pos.z);
    this.spawn({
      position: pos, count: Math.min(15, Math.floor(impact)), spread: 1.2, speed: 2.5,
      speedSpread: 4, colors: [0x9fd5e8, 0x4a7c92, 0xffffff], size: [0.2, 0.7],
      life: [0.25, 0.65], gravity: 1, drag: 2.2, upward: 0.3,
    });
  }

  jump(car) {
    const pos = new THREE.Vector3(car.pos.x, 0.15, car.pos.z);
    this.spawn({
      position: pos, count: 8, spread: 1.4, speed: 3, speedSpread: 2.5,
      colors: [car.team.bright, 0xffffff], size: [0.18, 0.5], life: [0.2, 0.45], gravity: 2, drag: 2,
    });
  }

  flip(car) {
    this.spawn({
      position: new THREE.Vector3(car.pos.x, car.pos.y + 0.7, car.pos.z),
      count: 14, spread: 1.4, speed: 4, speedSpread: 4,
      colors: [car.team.bright, 0xffffff], size: [0.25, 0.7], life: [0.2, 0.5], gravity: 2, drag: 1.5,
    });
  }

  bounce(ball, impact) {
    this.spawn({
      position: ball.pos.clone(), count: Math.min(16, Math.floor(impact * 0.9)),
      spread: ball.radius * 1.4, speed: 2, speedSpread: impact * 0.3,
      colors: [0x9feaff, 0xffffff], size: [0.2, 0.6], life: [0.2, 0.55], gravity: 3, drag: 1.4,
    });
  }

  wallBounce(ball) {
    this.spawn({
      position: ball.pos.clone(), count: 7, spread: 1.2, speed: 2, speedSpread: 3,
      colors: [0x7fd7ff, 0xffffff], size: [0.18, 0.5], life: [0.15, 0.4], gravity: 1, drag: 2,
    });
  }

  trail(ball) {
    const speed = ball.vel.length();
    if (speed < 13) return;
    this.spawn({
      position: ball.pos.clone(), count: speed > 34 ? 2 : 1, spread: ball.radius * 0.8,
      speed: 0.4, speedSpread: 1.2, colors: [0x7fe6ff, 0xffffff, 0x2ee7ff],
      size: [0.25, 0.85], life: [0.2, 0.55], gravity: 0, drag: 1.8,
    });
  }

  goal(position, team, color) {
    const main = new THREE.Color(color);
    const colors = [color, 0xffffff, 0xffd28a, team === 'blue' ? 0x2d83ff : 0xff6a12];
    this.spawn({
      position, count: 260, spread: 3.5, speed: 12, speedSpread: 26,
      colors, size: [0.45, 1.7], life: [0.7, 2.0], gravity: 7, drag: 0.55, upward: 1.2,
    });
    this.spawn({
      position, count: 120, spread: 5.5, speed: 5, speedSpread: 22,
      colors: [0xffffff, main.getHex()], size: [0.8, 2.8], life: [0.3, 1.1], gravity: 2, drag: 1.2,
    });
    this.ring(position, color, 'x', 0.9, 34);
    this.ring(position, 0xffffff, 'x', 0.65, 22);
    this.ring(new THREE.Vector3(position.x, 0.08, position.z), color, 'floor', 1.2, 30);
  }

  update(dt) {
    const positions = this.geometry.attributes.position.array;
    const colors = this.geometry.attributes.color.array;
    const sizes = this.geometry.attributes.size.array;
    const alphas = this.geometry.attributes.alpha.array;
    for (let i = 0; i < this.max; i += 1) {
      const p = this.particles[i];
      if (!p || !p.active) {
        alphas[i] = 0;
        sizes[i] = 0;
        continue;
      }
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        alphas[i] = 0;
        sizes[i] = 0;
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.vel.multiplyScalar(Math.exp(-p.drag * dt));
      p.pos.addScaledVector(p.vel, dt);
      if (p.pos.y < 0.05) { p.pos.y = 0.05; p.vel.y *= -0.35; }
      positions[i * 3] = p.pos.x;
      positions[i * 3 + 1] = p.pos.y;
      positions[i * 3 + 2] = p.pos.z;
      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;
      sizes[i] = p.size * (0.6 + 0.4 * (p.life / p.maxLife));
      alphas[i] = Math.min(1, (p.life / p.maxLife) * 1.8) * 0.85;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.alpha.needsUpdate = true;

    for (let i = this.rings.length - 1; i >= 0; i -= 1) {
      const ring = this.rings[i];
      ring.time += dt;
      const t = Math.min(1, ring.time / ring.duration);
      const s = 1 + (ring.maxScale - 1) * (1 - Math.pow(1 - t, 3));
      ring.mesh.scale.setScalar(s);
      ring.mesh.material.opacity = 0.8 * (1 - t) * (1 - t);
      if (t >= 1) {
        this.scene.remove(ring.mesh);
        ring.mesh.material.dispose();
        this.rings.splice(i, 1);
      }
    }
  }
}
