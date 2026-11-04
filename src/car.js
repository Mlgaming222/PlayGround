import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { FIELD, TEAM } from './arena.js';

const UP = new THREE.Vector3(0, 1, 0);

function damp(current, target, lambda, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

function disposeGroup(group) {
  group.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => {
        for (const key of Object.keys(m)) {
          const value = m[key];
          if (value && value.isTexture) value.dispose();
        }
        m.dispose();
      });
    }
  });
}

function buildBodyProfile(dims) {
  const L = dims.length;
  const H = dims.height;
  const shape = new THREE.Shape();
  shape.moveTo(-L / 2, 0.14);
  shape.lineTo(-L / 2, 0.48 + H * 0.22);
  shape.lineTo(-L * 0.37, 0.54 + H * 0.28);
  shape.lineTo(-L * 0.24, 0.58 + H * 0.24);
  shape.lineTo(-L * 0.08, 0.6 + H * 0.18);
  shape.lineTo(L * 0.16, 0.58 + H * 0.16);
  shape.lineTo(L * 0.3, 0.52 + H * 0.2);
  shape.lineTo(L * 0.43, 0.42 + H * 0.18);
  shape.lineTo(L / 2, 0.29 + H * 0.06);
  shape.lineTo(L / 2, 0.16);
  shape.lineTo(-L / 2, 0.09);
  shape.closePath();
  return shape;
}

function buildCanopyProfile(dims) {
  const L = dims.length;
  const H = dims.height;
  const C = dims.cabin;
  const base = 0.58 + H * 0.2;
  const shape = new THREE.Shape();
  shape.moveTo(-L * 0.25, base - 0.03);
  shape.lineTo(-L * 0.19, base + C * 0.48);
  shape.lineTo(-L * 0.1, base + C * 0.9);
  shape.lineTo(L * 0.02, base + C);
  shape.lineTo(L * 0.13, base + C * 0.7);
  shape.lineTo(L * 0.22, base + C * 0.17);
  shape.lineTo(L * 0.25, base - 0.03);
  shape.closePath();
  return shape;
}

function makeNumberTexture(number, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(64, 64, 45, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = color;
  ctx.font = '900 58px Orbitron, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(number, 64, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildCarVisual(build, team, options = {}) {
  const { isPlayer = false, number = '07' } = options;
  const dims = build.chosen.body.dims;
  const accentColor = new THREE.Color(build.chosen.body.accent);
  const teamColor = new THREE.Color(team.color);
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(team.paint || team.color),
    metalness: 0.46,
    roughness: 0.31,
    clearcoat: 1,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.05,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor, emissive: accentColor, emissiveIntensity: 0.55,
    metalness: 0.55, roughness: 0.3,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x060c12, metalness: 0.82, roughness: 0.34 });
  const carbonMat = new THREE.MeshStandardMaterial({ color: 0x0b141d, metalness: 0.6, roughness: 0.52 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x061824, metalness: 0.55, roughness: 0.07, transparent: true, opacity: 0.82,
    clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.8,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: team.bright, emissive: team.bright, emissiveIntensity: 2.1, metalness: 0.3, roughness: 0.3,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xff2a2a, emissive: 0xff1a1a, emissiveIntensity: 3.6, metalness: 0.2, roughness: 0.35,
  });

  // Main extruded chassis
  const profile = buildBodyProfile(dims);
  const extrude = new THREE.ExtrudeGeometry(profile, {
    depth: dims.width, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.055,
    bevelSegments: 3, curveSegments: 8,
  });
  extrude.computeVertexNormals();
  const chassis = new THREE.Mesh(extrude, paintMat);
  chassis.rotation.y = -Math.PI / 2;
  chassis.position.x = dims.width / 2;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  bodyGroup.add(chassis);

  // Glass canopy greenhouse
  const canopyProfile = buildCanopyProfile(dims);
  const canopyGeo = new THREE.ExtrudeGeometry(canopyProfile, {
    depth: dims.width * 0.68, bevelEnabled: true, bevelThickness: 0.025,
    bevelSize: 0.022, bevelSegments: 2, curveSegments: 8,
  });
  canopyGeo.computeVertexNormals();
  const canopy = new THREE.Mesh(canopyGeo, glassMat);
  canopy.rotation.y = -Math.PI / 2;
  canopy.position.x = dims.width * 0.34;
  canopy.castShadow = true;
  bodyGroup.add(canopy);

  // Window pillars
  const canopyBase = 0.58 + dims.height * 0.2;
  for (const side of [-1, 1]) {
    for (const z of [-dims.length * 0.17, dims.length * 0.07]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.055, dims.cabin * 0.74, 0.075), darkMat);
      pillar.position.set(side * dims.width * 0.343, canopyBase + dims.cabin * 0.46, z);
      pillar.rotation.z = side * 0.07;
      bodyGroup.add(pillar);
    }
  }

  // Roof spine
  const roofSpine = new THREE.Mesh(
    new RoundedBoxGeometry(0.22, 0.05, dims.length * 0.19, 3, 0.02),
    accentMat,
  );
  roofSpine.position.set(0, canopyBase + dims.cabin * 1.01, -dims.length * 0.03);
  roofSpine.rotation.x = -0.06;
  bodyGroup.add(roofSpine);

  // Hood stripes
  for (const x of [-0.24, 0.24]) {
    const stripe = new THREE.Mesh(
      new RoundedBoxGeometry(0.07, 0.025, dims.length * 0.3, 2, 0.01),
      accentMat,
    );
    stripe.position.set(x, 0.56 + dims.height * 0.39, dims.length * 0.28);
    stripe.rotation.x = -0.11;
    bodyGroup.add(stripe);
  }

  // Nose splitter + side skirts
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(dims.width * 0.92, 0.08, 0.42), carbonMat);
  splitter.position.set(0, 0.14, dims.length * 0.49);
  bodyGroup.add(splitter);
  for (const side of [-1, 1]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, dims.length * 0.58), carbonMat);
    skirt.position.set(side * dims.width * 0.47, 0.24, 0);
    bodyGroup.add(skirt);
  }

  // Headlights
  for (const x of [-dims.width * 0.28, dims.width * 0.28]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.13, 0.05), glowMat);
    light.position.set(x, 0.53, dims.length * 0.485);
    light.rotation.x = -0.35;
    bodyGroup.add(light);
  }
  // Tail lights
  for (const x of [-dims.width * 0.27, dims.width * 0.27]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.10, 0.05), tailMat);
    light.position.set(x, 0.53, -dims.length * 0.49);
    bodyGroup.add(light);
  }

  // Rear wing
  const wingY = 0.6 + dims.height * 0.72;
  const wing = new THREE.Mesh(
    new RoundedBoxGeometry(dims.width * 0.9, 0.06, 0.34, 3, 0.025),
    carbonMat,
  );
  wing.position.set(0, wingY, -dims.length * 0.4);
  wing.rotation.x = -0.12;
  bodyGroup.add(wing);
  for (const x of [-dims.width * 0.3, dims.width * 0.3]) {
    const support = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.16), carbonMat);
    support.position.set(x, wingY - 0.22, -dims.length * 0.4);
    bodyGroup.add(support);
  }
  const wingAccent = new THREE.Mesh(new THREE.BoxGeometry(dims.width * 0.86, 0.018, 0.05), accentMat);
  wingAccent.position.set(0, wingY + 0.045, -dims.length * 0.4);
  wingAccent.rotation.x = -0.12;
  bodyGroup.add(wingAccent);

  // Body-specific aero bits
  if (build.chosen.body.id === 'wasp') {
    for (const side of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.38, 0.6), accentMat);
      fin.position.set(side * dims.width * 0.42, 0.68 + dims.height * 0.55, -dims.length * 0.25);
      fin.rotation.z = side * 0.25;
      bodyGroup.add(fin);
    }
  }
  if (build.chosen.body.id === 'merc') {
    const intake = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.18, 0.55, 3, 0.05), carbonMat);
    intake.position.set(0, 0.68 + dims.cabin * 1.05, -dims.length * 0.13);
    bodyGroup.add(intake);
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.22), accentMat);
    scoop.position.set(0, 0.68 + dims.cabin * 1.15, -dims.length * 0.13);
    bodyGroup.add(scoop);
  }
  if (build.chosen.body.id === 'dominus') {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.8), accentMat);
    fin.position.set(0, 0.68 + dims.cabin * 0.7, -dims.length * 0.29);
    bodyGroup.add(fin);
  }
  if (build.chosen.body.id === 'mantis') {
    for (const side of [-1, 1]) {
      const pod = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.18, 1.15, 3, 0.04), darkMat);
      pod.position.set(side * dims.width * 0.47, 0.38, -dims.length * 0.02);
      bodyGroup.add(pod);
    }
  }

  // Side number medallions
  const numberTex = makeNumberTexture(number, team.cssSoft);
  const numberMat = new THREE.MeshBasicMaterial({ map: numberTex, transparent: true, opacity: 0.78, depthWrite: false });
  for (const side of [-1, 1]) {
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), numberMat);
    plate.position.set(side * (dims.width / 2 + 0.075), 0.62, -dims.length * 0.04);
    plate.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    bodyGroup.add(plate);
  }

  // Wheels
  const wheels = [];
  const wheelRadius = dims.wheel * build.chosen.wheels.radius;
  const rimMat = new THREE.MeshStandardMaterial({
    color: build.chosen.wheels.rim, emissive: build.chosen.wheels.rim, emissiveIntensity: 0.35,
    metalness: 0.9, roughness: 0.22,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x070a0d, metalness: 0.1, roughness: 0.82 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * (dims.width / 2 + 0.08), wheelRadius, sz * dims.wheelZ);
      const spinner = new THREE.Group();
      pivot.add(spinner);

      const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.34, 20, 1), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      spinner.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.64, wheelRadius * 0.64, 0.36, 16, 1), rimMat);
      rim.rotation.z = Math.PI / 2;
      spinner.add(rim);

      for (const side of [-1, 1]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius * 0.68, 0.035, 6, 20), rimMat);
        ring.position.x = side * 0.18;
        ring.rotation.y = Math.PI / 2;
        spinner.add(ring);
      }
      // spokes
      for (let i = 0; i < 5; i += 1) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.37, wheelRadius * 1.15, 0.035), darkMat);
        spoke.rotation.x = (i / 5) * Math.PI;
        spinner.add(spoke);
      }

      bodyGroup.add(pivot);
      wheels.push({ pivot, spinner, front: sz > 0 });
    }
  }

  // Thruster nozzles and flames
  const flameMats = [];
  const flames = [];
  const boostLights = [];
  for (const x of [-dims.width * 0.24, dims.width * 0.24]) {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.34, 12), darkMat);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(x, 0.48, -dims.length / 2 - 0.02);
    bodyGroup.add(nozzle);
    const nozzleGlow = new THREE.Mesh(new THREE.CircleGeometry(0.13, 14), glowMat);
    nozzleGlow.position.set(x, 0.48, -dims.length / 2 - 0.2);
    nozzleGlow.rotation.y = Math.PI;
    bodyGroup.add(nozzleGlow);

    const flameMat = new THREE.MeshBasicMaterial({
      color: build.chosen.boost.flame, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    flameMats.push(flameMat);
    const flameCoreMat = new THREE.MeshBasicMaterial({
      color: build.chosen.boost.flame2, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    flameMats.push(flameCoreMat);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.23, 2.2, 10, 1, true), flameMat);
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(x, 0.48, -dims.length / 2 - 0.95);
    flame.visible = false;
    bodyGroup.add(flame);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.11, 1.4, 8, 1, true), flameCoreMat);
    core.rotation.x = -Math.PI / 2;
    core.position.set(x, 0.48, -dims.length / 2 - 0.72);
    core.visible = false;
    bodyGroup.add(core);
    flames.push({ flame, core });
    const light = new THREE.PointLight(new THREE.Color(build.chosen.boost.flame), 0, 9, 2);
    light.position.set(x, 0.55, -dims.length / 2 - 0.6);
    bodyGroup.add(light);
    boostLights.push(light);
  }

  // Topper
  const topperGroup = new THREE.Group();
  topperGroup.position.set(0, 0.68 + dims.cabin * 1.03, -dims.length * 0.04);
  bodyGroup.add(topperGroup);
  const topperId = build.chosen.topper.id;
  let topperSpin = null;
  if (topperId === 'halo') {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.055, 8, 32),
      new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0xffc933, emissiveIntensity: 1.5, metalness: 0.7, roughness: 0.2 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.62;
    topperGroup.add(ring);
    for (let i = 0; i < 3; i += 1) {
      const a = (i / 3) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.42, 0.035), darkMat);
      spoke.position.set(Math.cos(a) * 0.38, 0.4, Math.sin(a) * 0.38);
      spoke.rotation.z = Math.cos(a) * 0.25;
      spoke.rotation.x = Math.sin(a) * 0.25;
      topperGroup.add(spoke);
    }
    topperSpin = ring;
  } else if (topperId === 'mohawk') {
    for (let i = 0; i < 5; i += 1) {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55 + (2 - Math.abs(i - 2)) * 0.15, 4), new THREE.MeshStandardMaterial({
        color: 0xff6a1a, emissive: 0xff4a00, emissiveIntensity: 2.5, metalness: 0.4, roughness: 0.35,
      }));
      fin.position.set(0, 0.3, (i - 2) * 0.22);
      fin.rotation.x = (i - 2) * 0.14;
      topperGroup.add(fin);
    }
  } else if (topperId === 'propeller') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.5, 8), darkMat);
    pole.position.y = 0.25;
    topperGroup.add(pole);
    const rotor = new THREE.Group();
    rotor.position.y = 0.52;
    for (let i = 0; i < 3; i += 1) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.12), accentMat);
      blade.rotation.y = (i / 3) * Math.PI * 2;
      blade.geometry.translate(0.48, 0, 0);
      rotor.add(blade);
    }
    topperGroup.add(rotor);
    topperSpin = rotor;
  } else if (topperId === 'crown') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.07, 6, 20), new THREE.MeshStandardMaterial({
      color: 0xffc23d, emissive: 0xff9a00, emissiveIntensity: 2.4, metalness: 0.9, roughness: 0.2,
    }));
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.2;
    topperGroup.add(band);
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.42, 4), new THREE.MeshStandardMaterial({
        color: 0xffd25c, emissive: 0xffa000, emissiveIntensity: 2.2, metalness: 0.85, roughness: 0.2,
      }));
      spike.position.set(Math.cos(a) * 0.33, 0.35, Math.sin(a) * 0.33);
      topperGroup.add(spike);
    }
  } else if (topperId === 'satellite') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.52, 6), darkMat);
    pole.position.y = 0.26;
    topperGroup.add(pole);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({
      color: 0xbaffd4, emissive: 0x47ff9a, emissiveIntensity: 1.2, metalness: 0.5, roughness: 0.3, side: THREE.DoubleSide,
    }));
    dish.position.y = 0.58;
    dish.rotation.x = Math.PI * 0.8;
    topperGroup.add(dish);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 4), accentMat);
    antenna.position.set(0.2, 0.48, 0);
    topperGroup.add(antenna);
    topperSpin = dish;
  }

  // Indicator ring under car
  const indicatorMat = new THREE.MeshBasicMaterial({
    color: team.color, transparent: true, opacity: isPlayer ? 0.38 : 0.2,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const indicator = new THREE.Mesh(new THREE.RingGeometry(dims.width * 0.72, dims.width * 0.82, 40), indicatorMat);
  indicator.rotation.x = -Math.PI / 2;
  indicator.position.y = 0.035;
  group.add(indicator);

  // Underglow
  const under = new THREE.PointLight(team.color, 1.2, 6, 2);
  under.position.y = 0.35;
  group.add(under);

  return {
    group, bodyGroup, wheels, flames, flameMats, boostLights, topperSpin, indicator,
    dims, wheelRadius,
  };
}

export class Car {
  constructor(scene, { team, build, isPlayer = false, name = 'PLAYER', number = '07' }) {
    this.scene = scene;
    this.team = team;
    this.teamKey = team.key;
    this.build = build;
    this.isPlayer = isPlayer;
    this.name = name;
    this.number = number;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.steer = 0;
    this.grounded = true;
    this.jumpCount = 0;
    this.boost = 33;
    this.boosting = false;
    this.hitCooldown = 0;
    this.visualRoll = 0;
    this.visualPitch = 0;
    this.wheelSpin = 0;
    this.flipTimer = 0;
    this.landTimer = 0;
    this.boostEmit = 0;
    this.topSpeed = 0;
    this.boostUsed = 0;
    this.hits = 0;
    this.stats = build.physics;
    this.visual = buildCarVisual(build, team, { isPlayer, number });
    this.scene.add(this.visual.group);
    this.visual.group.position.copy(this.pos);
  }

  setBuild(build) {
    const boostFrac = this.stats.capacity ? this.boost / this.stats.capacity : 0.33;
    const old = this.visual;
    this.scene.remove(old.group);
    disposeGroup(old.group);
    this.build = build;
    this.stats = build.physics;
    this.visual = buildCarVisual(build, this.team, { isPlayer: this.isPlayer, number: this.number });
    this.scene.add(this.visual.group);
    this.boost = boostFrac * this.stats.capacity;
    this.visual.group.position.copy(this.pos);
    this.visual.group.rotation.y = this.yaw;
  }

  reset(x, z, yaw, boost = 33) {
    this.pos.set(x, 0, z);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.steer = 0;
    this.grounded = true;
    this.jumpCount = 0;
    this.boost = Math.min(boost, this.stats.capacity);
    this.boosting = false;
    this.hitCooldown = 0;
    this.visual.group.position.copy(this.pos);
    this.visual.group.rotation.y = yaw;
    this.visual.bodyGroup.rotation.set(0, 0, 0);
    this.visual.group.visible = true;
  }

  get forward() {
    return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  get right() {
    return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  get speed() {
    return Math.hypot(this.vel.x, this.vel.z);
  }

  addBoost(amount) {
    const before = this.boost;
    this.boost = Math.min(this.stats.capacity, this.boost + amount);
    return this.boost > before;
  }

  update(dt, input, ball, effects = {}) {
    const stats = this.stats;
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.flipTimer = Math.max(0, this.flipTimer - dt);
    this.landTimer = Math.max(0, this.landTimer - dt);

    let forward = this.forward;
    let right = this.right;
    const fwdSpeed = this.vel.dot(forward);

    // Steering
    const dirSign = fwdSpeed < -0.8 ? -1 : 1;
    const speedFactor = this.grounded
      ? THREE.MathUtils.clamp(0.34 + Math.abs(fwdSpeed) / 9, 0.34, 1.08)
      : 0.55;
    const driftMul = input.drift && this.grounded ? 1.42 : 1;
    this.steer = damp(this.steer, input.steer, 14, dt);
    this.yaw += this.steer * stats.steerRate * speedFactor * driftMul * dirSign * dt;

    forward = this.forward;
    right = this.right;

    // Throttle
    let engineForce = 0;
    if (input.throttle > 0) {
      engineForce = stats.accel * input.throttle;
      if (fwdSpeed > stats.maxSpeed * 0.99) engineForce *= 0.15;
    } else if (input.throttle < 0) {
      if (fwdSpeed > 1.5) engineForce = -stats.accel * 1.35 * -input.throttle;
      else engineForce = stats.accel * 0.52 * input.throttle;
    }
    if (this.grounded) this.vel.addScaledVector(forward, engineForce * dt);
    else this.vel.addScaledVector(forward, engineForce * 0.28 * dt);

    // Boost
    const wantsBoost = !!input.boost && this.boost > 0.15;
    this.boosting = wantsBoost;
    if (wantsBoost) {
      const thrustAccel = 29 * stats.thrust;
      this.vel.addScaledVector(forward, thrustAccel * dt);
      if (!this.grounded) this.vel.y += 1.6 * dt;
      this.boost = Math.max(0, this.boost - stats.drain * dt);
      this.boostUsed += stats.drain * dt;
      this.boostEmit += dt;
      if (effects.boost) effects.boost(this, dt);
    } else if (stats.regen > 0) {
      this.boost = Math.min(stats.capacity, this.boost + stats.regen * dt);
    }

    // Grip and drag
    const lateral = this.vel.dot(right);
    const gripMul = this.grounded ? (input.drift ? 0.34 : 1) : 0.16;
    this.vel.addScaledVector(right, -lateral * Math.min(1, stats.grip * gripMul * dt));
    if (this.grounded) {
      const forwardDrag = input.throttle === 0 ? 0.85 : 0.16;
      const fwdComponent = this.vel.dot(forward);
      this.vel.addScaledVector(forward, -fwdComponent * Math.min(1, forwardDrag * dt));
    } else {
      this.vel.multiplyScalar(Math.exp(-0.08 * dt));
    }

    // Speed cap
    const flatSpeed = Math.hypot(this.vel.x, this.vel.z);
    const cap = stats.maxSpeed * (this.boosting ? 1.26 : 1.0);
    if (flatSpeed > cap) {
      const s = cap / flatSpeed;
      this.vel.x *= s;
      this.vel.z *= s;
    }

    // Jump / double jump
    if (input.jumpPressed) {
      if (this.grounded) {
        this.vel.y = stats.jumpSpeed;
        this.grounded = false;
        this.jumpCount = 1;
        this.landTimer = 0;
        if (effects.jump) effects.jump(this);
      } else if (this.jumpCount < 2) {
        this.vel.y = Math.max(this.vel.y, stats.jumpSpeed * 0.82);
        this.jumpCount = 2;
        const dir = new THREE.Vector3();
        dir.addScaledVector(forward, input.throttle);
        dir.addScaledVector(right, input.steer);
        if (dir.lengthSq() > 0.05) {
          dir.normalize();
          this.vel.addScaledVector(dir, 9.5 * (0.85 + stats.handling * 0.02));
          this.vel.y += 2.4;
        }
        this.flipTimer = 0.55;
        if (effects.flip) effects.flip(this);
      }
    }

    // Gravity
    if (!this.grounded) this.vel.y -= 37 * dt;

    // Integrate
    this.pos.addScaledVector(this.vel, dt);

    // Ground
    if (this.pos.y <= 0) {
      const impact = -this.vel.y;
      this.pos.y = 0;
      if (!this.grounded && impact > 3 && effects.land) effects.land(this, impact);
      this.vel.y = 0;
      this.grounded = true;
      this.jumpCount = 0;
    } else {
      this.grounded = false;
    }
    if (this.pos.y > FIELD.ceiling - 1.2) {
      this.pos.y = FIELD.ceiling - 1.2;
      this.vel.y = Math.min(0, this.vel.y);
    }

    // Arena walls (cars stay inside the pitch)
    const limitX = FIELD.halfX - 1.25;
    const limitZ = FIELD.halfZ - 1.1;
    if (this.pos.x > limitX) { this.pos.x = limitX; this.vel.x *= -0.28; this.vel.z *= 0.86; }
    if (this.pos.x < -limitX) { this.pos.x = -limitX; this.vel.x *= -0.28; this.vel.z *= 0.86; }
    if (this.pos.z > limitZ) { this.pos.z = limitZ; this.vel.z *= -0.28; this.vel.x *= 0.86; }
    if (this.pos.z < -limitZ) { this.pos.z = -limitZ; this.vel.z *= -0.28; this.vel.x *= 0.86; }

    // Ball collision
    if (ball) this.collideBall(ball, effects);

    this.topSpeed = Math.max(this.topSpeed, this.speed);
  }

  collideBall(ball, effects) {
    if (this.hitCooldown > 0 || ball.frozen) return;
    const dims = this.stats.dims;
    const center = new THREE.Vector3(this.pos.x, this.pos.y + 0.68, this.pos.z);
    const forward = this.forward;
    const right = this.right;
    const delta = new THREE.Vector3().subVectors(ball.pos, center);
    const localX = delta.dot(right);
    const localZ = delta.dot(forward);
    const halfX = dims.width * 0.47;
    const halfY = 0.5;
    const halfZ = dims.length * 0.46;
    const cx = THREE.MathUtils.clamp(localX, -halfX, halfX);
    const cy = THREE.MathUtils.clamp(delta.y, -halfY, halfY);
    const cz = THREE.MathUtils.clamp(localZ, -halfZ, halfZ);
    const closest = new THREE.Vector3()
      .copy(center)
      .addScaledVector(right, cx)
      .addScaledVector(UP, cy)
      .addScaledVector(forward, cz);
    const diff = new THREE.Vector3().subVectors(ball.pos, closest);
    let dist = diff.length();
    if (dist > ball.radius) return;

    let normal;
    if (dist < 0.0001) {
      normal = new THREE.Vector3(0, 1, 0);
      dist = 0.001;
    } else {
      normal = diff.divideScalar(dist);
    }
    const penetration = ball.radius - dist;
    ball.pos.addScaledVector(normal, penetration + 0.02);

    const rel = new THREE.Vector3().subVectors(ball.vel, this.vel);
    const closing = Math.max(0, -rel.dot(normal));
    const carIntoBall = Math.max(0, this.vel.dot(normal));
    const impact = Math.max(closing, carIntoBall);
    if (impact < 0.4 && penetration < 0.1) return;

    const boostBoost = this.boosting ? 1.14 : 1;
    const power = this.stats.hitPower * boostBoost;
    const kick = (2.8 + impact * 1.15) * power;
    ball.vel.addScaledVector(normal, kick * 0.68);
    ball.vel.addScaledVector(this.vel, 0.3 * power);
    ball.vel.y += Math.min(8.5, impact * 0.14) * power;

    // Nose punt
    const noseDistance = localZ - halfZ;
    if (localZ > halfZ * 0.55 && this.speed > 6) {
      ball.vel.addScaledVector(forward, this.speed * 0.36 * power);
    }
    if (noseDistance > 0 && normal.y < 0.6) {
      ball.vel.y += Math.min(3.4, this.speed * 0.06);
    }

    // Recoil
    this.vel.addScaledVector(normal, -impact * 0.018 / this.stats.weight);
    this.hitCooldown = 0.1;
    this.hits += 1;
    ball.lastTouch = this.teamKey;
    ball.lastTouchCar = this;
    ball.hitFlash = 1;
    if (effects.hit) effects.hit(this, ball, impact, normal);
  }

  updateVisual(dt, elapsed) {
    const v = this.visual;
    const fwdSpeed = this.vel.dot(this.forward);
    const lateral = this.vel.dot(this.right);
    v.group.position.copy(this.pos);

    const targetRoll = THREE.MathUtils.clamp(-this.steer * 0.1 - lateral * 0.006, -0.22, 0.22);
    const targetPitch = THREE.MathUtils.clamp((this.grounded ? 0 : -this.vel.dot(this.forward) * 0.0035) + (this.grounded ? 0 : this.vel.y * 0.002), -0.18, 0.18);
    this.visualRoll = damp(this.visualRoll, targetRoll, 9, dt);
    this.visualPitch = damp(this.visualPitch, targetPitch, 7, dt);
    v.bodyGroup.rotation.z = this.visualRoll;
    v.bodyGroup.rotation.x = this.visualPitch + (this.flipTimer > 0 ? Math.sin((0.55 - this.flipTimer) / 0.55 * Math.PI * 2) * 0.18 : 0);
    v.group.rotation.y = this.yaw;

    this.wheelSpin += (fwdSpeed * dt) / Math.max(0.3, v.wheelRadius);
    for (const wheel of v.wheels) {
      wheel.spinner.rotation.x = this.wheelSpin;
      if (wheel.front) wheel.pivot.rotation.y = this.steer * 0.42;
    }

    for (let i = 0; i < v.flames.length; i += 1) {
      const { flame, core } = v.flames[i];
      const on = this.boosting && this.boost > 0.1;
      flame.visible = on;
      core.visible = on;
      if (on) {
        const flicker = 0.82 + Math.sin(elapsed * 42 + i * 2.1) * 0.16 + Math.random() * 0.08;
        const length = 0.7 + Math.min(1.25, this.speed / 26) * 0.7;
        flame.scale.set(flicker, length, flicker);
        core.scale.set(1, length * 0.9, 1);
      }
      v.boostLights[i].intensity = on ? 1.8 + Math.random() * 0.9 : 0;
    }
    if (v.topperSpin) {
      if (this.build.chosen.topper.id === 'propeller') v.topperSpin.rotation.y += dt * (this.boosting ? 22 : 9);
      else if (this.build.chosen.topper.id === 'halo') v.topperSpin.rotation.z += dt * 0.8;
      else if (this.build.chosen.topper.id === 'satellite') v.topperSpin.rotation.y += dt * 0.5;
    }
    v.indicator.material.opacity = (this.isPlayer ? 0.32 : 0.16) + Math.sin(elapsed * 3) * 0.05;
  }

  dispose() {
    this.scene.remove(this.visual.group);
    disposeGroup(this.visual.group);
  }
}
