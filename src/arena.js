import * as THREE from 'three';

export const FIELD = {
  halfX: 54,
  halfZ: 34,
  ceiling: 27,
  goalHalfZ: 10,
  goalHeight: 8.5,
  goalDepth: 7,
};

export const TEAM = {
  blue: {
    key: 'blue', name: 'BLUE', color: 0x2d83ff, paint: 0x1b64d1, bright: 0x62d7ff, accent: 0x7ff4ff,
    css: '#42c8ff', cssSoft: '#9feaff', glow: '#2ee7ff', dark: '#06213a',
  },
  orange: {
    key: 'orange', name: 'ORANGE', color: 0xff6a12, paint: 0xd9570e, bright: 0xffa23c, accent: 0xffd39a,
    css: '#ff9a3c', cssSoft: '#ffd0a0', glow: '#ff7a1f', dark: '#2a1104',
  },
};

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function drawHexGrid(ctx, w, h, size, color, alpha = 0.14) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1.2;
  const r = size;
  const stepX = r * 1.5;
  const stepY = r * Math.sqrt(3);
  for (let x = -r; x < w + r; x += stepX) {
    for (let y = -r; y < h + r; y += stepY) {
      const ox = (Math.round(x / stepX) % 2) * (stepY / 2);
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = Math.PI / 3 * i + Math.PI / 6;
        const px = x + Math.cos(a) * r;
        const py = y + ox + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
}

function makeFieldTexture() {
  return canvasTexture(2048, 1280, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#061320');
    grad.addColorStop(0.5, '#081c2b');
    grad.addColorStop(1, '#06111c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Team-tinted halves
    const left = ctx.createLinearGradient(0, 0, w * 0.5, 0);
    left.addColorStop(0, 'rgba(20, 80, 170, 0.22)');
    left.addColorStop(1, 'rgba(20, 80, 170, 0)');
    ctx.fillStyle = left;
    ctx.fillRect(0, 0, w * 0.5, h);
    const right = ctx.createLinearGradient(w, 0, w * 0.5, 0);
    right.addColorStop(0, 'rgba(170, 70, 10, 0.16)');
    right.addColorStop(1, 'rgba(170, 70, 10, 0)');
    ctx.fillStyle = right;
    ctx.fillRect(w * 0.5, 0, w * 0.5, h);

    drawHexGrid(ctx, w, h, 38, '#3eb6d6', 0.075);

    // Mowing stripes
    for (let i = 0; i < 10; i += 1) {
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(120, 220, 255, 0.018)';
        ctx.fillRect((i / 10) * w, 0, w / 10, h);
      }
    }

    // Grain
    ctx.globalAlpha = 0.035;
    for (let i = 0; i < 2600; i += 1) {
      ctx.fillStyle = i % 2 ? '#a8e8ff' : '#000000';
      const s = Math.random() * 2 + 0.5;
      ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
    ctx.globalAlpha = 1;

    const cx = w / 2;
    const cy = h / 2;
    const margin = 62;
    const glow = '#6ce7ff';
    const dim = 'rgba(145, 230, 255, 0.62)';

    function line(x1, y1, x2, y2, width = 3, alpha = 0.8, color = glow) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    }

    function circle(x, y, r, width = 3, alpha = 0.8, fill = false) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = glow;
      ctx.lineWidth = width;
      ctx.shadowColor = glow;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (fill) { ctx.fillStyle = 'rgba(70, 220, 255, 0.08)'; ctx.fill(); }
      ctx.stroke();
      ctx.restore();
    }

    // Outer boundary
    ctx.save();
    ctx.strokeStyle = dim;
    ctx.lineWidth = 4;
    ctx.strokeRect(margin, margin, w - margin * 2, h - margin * 2);
    ctx.strokeStyle = 'rgba(40, 150, 190, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(margin + 14, margin + 14, w - margin * 2 - 28, h - margin * 2 - 28);
    ctx.restore();

    // Halfway line
    line(cx, margin, cx, h - margin, 3, 0.55);
    circle(cx, cy, 172, 3, 0.72);
    circle(cx, cy, 8, 4, 0.95, true);

    // Center logo
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = glow;
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i += 1) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 58);
      ctx.lineTo(0, 118);
      ctx.stroke();
    }
    ctx.restore();

    // Goal boxes + arcs
    function goalBox(side) {
      const dir = side === 'left' ? 1 : -1;
      const edge = side === 'left' ? margin : w - margin;
      const boxW = 196;
      const boxH = 492;
      ctx.save();
      ctx.strokeStyle = 'rgba(135, 226, 255, 0.5)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.rect(Math.min(edge, edge + boxW * dir), cy - boxH / 2, boxW, boxH);
      ctx.stroke();
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(edge + 74 * dir, cy, 212, side === 'left' ? -Math.PI / 2.7 : Math.PI - Math.PI / 2.7, side === 'left' ? Math.PI / 2.7 : Math.PI + Math.PI / 2.7);
      ctx.stroke();
      ctx.restore();
    }
    goalBox('left');
    goalBox('right');

    // Goal mouths
    ctx.save();
    ctx.fillStyle = 'rgba(46, 231, 255, 0.14)';
    ctx.fillRect(0, cy - 196, 24, 392);
    ctx.fillStyle = 'rgba(255, 122, 31, 0.14)';
    ctx.fillRect(w - 24, cy - 196, 24, 392);
    ctx.restore();

    // Corner spots + penalty dots
    [[cx - 330, cy], [cx + 330, cy]].forEach(([x, y]) => {
      ctx.fillStyle = 'rgba(150, 235, 255, 0.65)';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Side team marks
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#6ce7ff';
    ctx.font = '900 120px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.translate(355, cy);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('NEON', 0, 0);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ff9a3c';
    ctx.font = '900 120px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.translate(w - 355, cy);
    ctx.rotate(Math.PI / 2);
    ctx.fillText('STRIKE', 0, 0);
    ctx.restore();

    // Subtle noise lines
    ctx.globalAlpha = 0.03;
    ctx.strokeStyle = '#ffffff';
    for (let y = 0; y < h; y += 7) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  });
}

function makeAdTexture(label, colorA, colorB) {
  return canvasTexture(1024, 128, (ctx, w, h) => {
    ctx.fillStyle = '#04101b';
    ctx.fillRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, colorA);
    grad.addColorStop(1, colorB);
    ctx.fillStyle = grad;
    ctx.fillRect(0, h - 8, w, 8);
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, 4);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#dff9ff';
    ctx.font = '700 48px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, w / 2, h / 2 + 2);
    // little corner ticks
    ctx.strokeStyle = colorB;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.65;
    for (let i = 0; i < 4; i += 1) {
      const x = 20 + i * 8;
      ctx.beginPath();
      ctx.moveTo(x, 24);
      ctx.lineTo(x + 4, 24);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w - x, h - 24);
      ctx.lineTo(w - x - 4, h - 24);
      ctx.stroke();
    }
  });
}

function makeScreenTexture(title, sub, color) {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#061827');
    grad.addColorStop(1, '#02090f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    drawHexGrid(ctx, w, h, 32, color, 0.14);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(0, 0, w, 6);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eafcff';
    ctx.font = '900 88px Orbitron, sans-serif';
    ctx.fillText(title, w / 2, h / 2 - 22);
    ctx.fillStyle = color;
    ctx.font = '700 26px Orbitron, sans-serif';
    ctx.fillText(sub, w / 2, h / 2 + 52);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, w - 48, h - 48);
  });
}

function makeSky() {
  const geo = new THREE.SphereGeometry(310, 48, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color('#01040c') },
      mid: { value: new THREE.Color('#071528') },
      bottom: { value: new THREE.Color('#0b2637') },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 top; uniform vec3 mid; uniform vec3 bottom;
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y;
        vec3 c = mix(bottom, mid, smoothstep(-0.1, 0.28, h));
        c = mix(c, top, smoothstep(0.28, 0.9, h));
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
  return new THREE.Mesh(geo, mat);
}

function makeStars() {
  const count = 700;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [new THREE.Color('#a8ecff'), new THREE.Color('#ffffff'), new THREE.Color('#8cb8ff'), new THREE.Color('#ffd6a0')];
  for (let i = 0; i < count; i += 1) {
    const r = 180 + Math.random() * 100;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.46;
    positions[i * 3] = Math.cos(theta) * Math.cos(phi) * r;
    positions[i * 3 + 1] = 18 + Math.sin(phi) * r;
    positions[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * r;
    const c = palette[Math.floor(Math.random() * palette.length)];
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 1.5, vertexColors: true, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, map: starSprite(),
  });
  return new THREE.Points(geo, mat);
}

let _starSprite;
function starSprite() {
  if (_starSprite) return _starSprite;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(200,245,255,0.8)');
  g.addColorStop(1, 'rgba(160,230,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  _starSprite = new THREE.CanvasTexture(c);
  _starSprite.colorSpace = THREE.SRGBColorSpace;
  return _starSprite;
}

function makeGoal(scene, team, side) {
  const x = side * (FIELD.halfX + 0.25);
  const dir = -side;
  const group = new THREE.Group();

  const glowMat = new THREE.MeshStandardMaterial({
    color: team.color, emissive: team.color, emissiveIntensity: 4.2,
    metalness: 0.4, roughness: 0.25,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x06131f, metalness: 0.7, roughness: 0.35 });

  const postGeo = new THREE.BoxGeometry(0.65, FIELD.goalHeight + 0.4, 0.65);
  for (const z of [-FIELD.goalHalfZ, FIELD.goalHalfZ]) {
    const post = new THREE.Mesh(postGeo, glowMat);
    post.position.set(x, (FIELD.goalHeight + 0.4) / 2, z);
    post.castShadow = true;
    group.add(post);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 1.3), darkMat);
    base.position.set(x, 0.18, z);
    group.add(base);
  }
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, FIELD.goalHalfZ * 2 + 0.7), glowMat);
  cross.position.set(x, FIELD.goalHeight + 0.35, 0);
  group.add(cross);

  // Inner goal shell
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x03101b, emissive: team.color, emissiveIntensity: 0.22,
    metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide,
  });
  const backX = side * (FIELD.halfX + FIELD.goalDepth);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(FIELD.goalHalfZ * 2, FIELD.goalHeight), shellMat);
  back.position.set(backX, FIELD.goalHeight / 2, 0);
  back.rotation.y = dir * Math.PI / 2;
  group.add(back);
  for (const z of [-FIELD.goalHalfZ, FIELD.goalHalfZ]) {
    const sidePanel = new THREE.Mesh(new THREE.PlaneGeometry(FIELD.goalDepth, FIELD.goalHeight), shellMat);
    sidePanel.position.set(side * (FIELD.halfX + FIELD.goalDepth / 2), FIELD.goalHeight / 2, z);
    group.add(sidePanel);
  }
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(FIELD.goalDepth, FIELD.goalHalfZ * 2), shellMat);
  roof.position.set(side * (FIELD.halfX + FIELD.goalDepth / 2), FIELD.goalHeight, 0);
  roof.rotation.x = Math.PI / 2;
  group.add(roof);

  // Net grids
  const netMat = new THREE.LineBasicMaterial({ color: team.bright, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
  const points = [];
  const z0 = -FIELD.goalHalfZ;
  const z1 = FIELD.goalHalfZ;
  for (let i = 0; i <= 16; i += 1) {
    const z = z0 + (z1 - z0) * (i / 16);
    points.push(backX, 0, z, backX, FIELD.goalHeight, z);
  }
  for (let i = 0; i <= 7; i += 1) {
    const y = (FIELD.goalHeight * i) / 7;
    points.push(backX, y, z0, backX, y, z1);
  }
  for (const z of [z0, z1]) {
    for (let i = 0; i <= 6; i += 1) {
      const t = i / 6;
      points.push(FIELD.halfX * side, 0, z, backX, 0, z);
      points.push(FIELD.halfX * side, FIELD.goalHeight, z, backX, FIELD.goalHeight, z);
      const xx = FIELD.halfX * side + (backX - FIELD.halfX * side) * t;
      points.push(xx, 0, z, xx, FIELD.goalHeight, z);
    }
  }
  const netGeo = new THREE.BufferGeometry();
  netGeo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  group.add(new THREE.LineSegments(netGeo, netMat));

  // Goal glow floor
  const floorGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(FIELD.goalHalfZ * 2, FIELD.goalDepth),
    new THREE.MeshBasicMaterial({ color: team.color, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.set(side * (FIELD.halfX + FIELD.goalDepth / 2), 0.03, 0);
  group.add(floorGlow);

  // Explosion light
  const light = new THREE.PointLight(team.color, 0, 34, 1.5);
  light.position.set(side * (FIELD.halfX + 2), 4, 0);
  group.add(light);

  // Score screen above goal
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 9),
    new THREE.MeshBasicMaterial({
      map: makeScreenTexture('NEON', 'STRIKERS', team.css), toneMapped: false,
    }),
  );
  screen.position.set(side * (FIELD.halfX + 0.9), 15.8, 0);
  screen.rotation.y = dir * Math.PI / 2;
  group.add(screen);

  scene.add(group);
  return { group, light, glowMat, floorGlow, screen };
}

function makeBoostPads(scene) {
  const pads = [];
  const bigPositions = [[-31, -18], [-31, 18], [31, -18], [31, 18]];
  const smallPositions = [[0, -23], [0, 23], [-18, 0], [18, 0]];
  const ringMatBase = {
    color: 0xffa42c, emissive: 0xff7a12, emissiveIntensity: 4.5,
    metalness: 0.4, roughness: 0.25, transparent: true,
  };

  function create(x, z, big) {
    const group = new THREE.Group();
    const scale = big ? 1.25 : 0.72;
    const amount = big ? 100 : 25;
    const ringMat = new THREE.MeshStandardMaterial({ ...ringMatBase });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55 * scale, 0.12 * scale, 8, 40), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.16;
    group.add(ring);

    const discMat = new THREE.MeshBasicMaterial({
      color: 0xff9b2a, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.5 * scale, 32), discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.1;
    group.add(disc);

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffd27a, emissive: 0xff8a1a, emissiveIntensity: 5.5, metalness: 0.2, roughness: 0.2,
    });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34 * scale, 0), coreMat);
    core.position.y = 0.55;
    group.add(core);

    const light = new THREE.PointLight(0xff9a30, big ? 2.2 : 1.1, big ? 12 : 7, 2);
    light.position.y = 1.2;
    group.add(light);

    group.position.set(x, 0, z);
    scene.add(group);
    pads.push({ group, ring, disc, core, light, ringMat, discMat, coreMat, amount, big, cooldown: 0, x, z, baseScale: 1 });
    return group;
  }

  bigPositions.forEach(([x, z]) => create(x, z, true));
  smallPositions.forEach(([x, z]) => create(x, z, false));
  return pads;
}

function makeCrowd(scene) {
  const dummy = new THREE.Object3D();
  const positions = [];
  const rows = 7;
  const spacing = 1.55;
  // Sides
  for (let row = 0; row < rows; row += 1) {
    const z = 38.5 + row * 1.25;
    for (let x = -52; x <= 52; x += spacing) {
      positions.push([x + (Math.random() - 0.5) * 0.55, 2.4 + row * 1.05, z + (Math.random() - 0.5) * 0.3]);
      positions.push([x + (Math.random() - 0.5) * 0.55, 2.4 + row * 1.05, -z + (Math.random() - 0.5) * 0.3]);
    }
  }
  // Ends
  for (let row = 0; row < rows; row += 1) {
    const x = 59 + row * 1.25;
    for (let z = -34; z <= 34; z += spacing) {
      positions.push([x + (Math.random() - 0.5) * 0.3, 2.4 + row * 1.05, z + (Math.random() - 0.5) * 0.55]);
      positions.push([-x + (Math.random() - 0.5) * 0.3, 2.4 + row * 1.05, z + (Math.random() - 0.5) * 0.55]);
    }
  }

  const geo = new THREE.BoxGeometry(0.52, 0.62, 0.52);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.76, metalness: 0.05, emissive: 0x0a1824, emissiveIntensity: 0.8 });
  const mesh = new THREE.InstancedMesh(geo, mat, positions.length);
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  const bluePalette = ['#2d83ff', '#35c7ff', '#8fe6ff', '#1c4f9e', '#4d91d8', '#d7f5ff', '#0e2d5e'];
  const orangePalette = ['#ff6a12', '#ff9a3c', '#ffd39a', '#9e3200', '#ffb15c', '#ffe9cc', '#5e1d00'];
  const color = new THREE.Color();
  positions.forEach((p, i) => {
    dummy.position.set(p[0], p[1], p[2]);
    dummy.rotation.y = (Math.random() - 0.5) * 0.35;
    const s = 0.85 + Math.random() * 0.35;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    const palette = p[0] < 0 ? bluePalette : orangePalette;
    color.set(palette[Math.floor(Math.random() * palette.length)]);
    mesh.setColorAt(i, color);
  });
  mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);
  return mesh;
}

function makeStands(scene) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x06121e, metalness: 0.55, roughness: 0.55 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x123c55, emissive: 0x0e4a68, emissiveIntensity: 0.8, metalness: 0.4, roughness: 0.5 });
  for (let row = 0; row < 7; row += 1) {
    for (const side of [-1, 1]) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(112, 1.0, 1.36), mat);
      step.position.set(0, 1.55 + row * 1.05, side * (38.1 + row * 1.25));
      group.add(step);
      if (row === 0) {
        const trim = new THREE.Mesh(new THREE.BoxGeometry(112, 0.08, 1.38), trimMat);
        trim.position.set(0, 1.06, side * (38.1 + row * 1.25));
        group.add(trim);
      }
    }
    for (const side of [-1, 1]) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.0, 69), mat);
      step.position.set(side * (58.6 + row * 1.25), 1.55 + row * 1.05, 0);
      group.add(step);
    }
  }
  // Back wall of stands
  const backMat = new THREE.MeshStandardMaterial({ color: 0x03090f, metalness: 0.3, roughness: 0.8 });
  for (const side of [-1, 1]) {
    const back = new THREE.Mesh(new THREE.BoxGeometry(116, 14, 1), backMat);
    back.position.set(0, 8, side * 47.5);
    group.add(back);
  }
  scene.add(group);
  return group;
}

function makeTrusses(scene) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x0a1824, metalness: 0.8, roughness: 0.4 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x9feeff, emissive: 0x7fe8ff, emissiveIntensity: 2.4, metalness: 0.2, roughness: 0.3 });
  const beamGeo = new THREE.BoxGeometry(FIELD.halfX * 2 + 16, 0.32, 0.34);
  const lightGeo = new THREE.BoxGeometry(2.2, 0.08, 0.22);
  for (let i = -2; i <= 2; i += 1) {
    const beam = new THREE.Mesh(beamGeo, mat);
    beam.position.set(0, 28.5, i * 14);
    group.add(beam);
    for (let j = -5; j <= 5; j += 1) {
      const light = new THREE.Mesh(lightGeo, glowMat);
      light.position.set(j * 9.5, 28.27, i * 14);
      group.add(light);
    }
  }
  scene.add(group);
  return group;
}

function makePodium(scene) {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x020a12, metalness: 0.08, roughness: 0.88 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x1ecfff, emissive: 0x2ee7ff, emissiveIntensity: 2.8, metalness: 0.3, roughness: 0.25 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 5.4, 0.28, 64), baseMat);
  base.position.y = 0.14;
  group.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5.12, 0.07, 8, 96), glowMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.31;
  group.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.04, 6, 96), glowMat);
  ring2.rotation.x = Math.PI / 2;
  ring2.position.y = 0.02;
  group.add(ring2);
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.55), glowMat);
    tick.position.set(Math.cos(a) * 7.7, 0.02, Math.sin(a) * 7.7);
    tick.rotation.y = -a;
    group.add(tick);
  }
  const glow = new THREE.PointLight(0x2ee7ff, 1.2, 9, 2);
  glow.position.set(0, 1.4, 0);
  group.add(glow);
  group.position.set(0, 0.02, 0);
  scene.add(group);
  return group;
}

function makeBarriers(scene) {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x071420, metalness: 0.75, roughness: 0.38 });
  const adBlue = makeAdTexture('NEON STRIKERS  //  BOOST IS LIFE', '#2d83ff', '#2ee7ff');
  const adOrange = makeAdTexture('GARAGE  //  COSMETICS CHANGE PHYSICS', '#ff6a12', '#ffb15c');
  const adCyan = makeAdTexture('ONE ARENA  //  ZERO EXCUSES', '#2ee7ff', '#2d83ff');
  const adPink = makeAdTexture('NEON STRIKERS  //  SEASON 01', '#ff3d81', '#ff9a3c');
  const ads = [adBlue, adOrange, adCyan, adPink];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i += 1) {
      const ad = new THREE.Mesh(
        new THREE.PlaneGeometry(23, 2.7),
        new THREE.MeshBasicMaterial({ map: ads[(i + (side > 0 ? 1 : 0)) % ads.length], toneMapped: false }),
      );
      ad.position.set(-34 + i * 23, 1.9, side * 33.45);
      ad.rotation.y = side > 0 ? Math.PI : 0;
      group.add(ad);
    }
    const frame = new THREE.Mesh(new THREE.BoxGeometry(108, 0.35, 0.18), frameMat);
    frame.position.set(0, 3.35, side * 33.6);
    group.add(frame);
  }
  for (const side of [-1, 1]) {
    for (const z of [-23, 23]) {
      const ad = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 2.7),
        new THREE.MeshBasicMaterial({ map: ads[(z > 0 ? 2 : 3)], toneMapped: false }),
      );
      ad.position.set(side * 53.5, 1.9, z);
      ad.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      group.add(ad);
    }
  }
  scene.add(group);
  return group;
}

function makeWalls(scene) {
  const group = new THREE.Group();
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b3550, metalness: 0.55, roughness: 0.18, transparent: true, opacity: 0.26,
    side: THREE.DoubleSide, envMapIntensity: 1.2,
  });
  const solidMat = new THREE.MeshStandardMaterial({ color: 0x061522, metalness: 0.72, roughness: 0.4 });
  const glowCyan = new THREE.MeshStandardMaterial({ color: 0x2ee7ff, emissive: 0x2ee7ff, emissiveIntensity: 3.2, metalness: 0.4, roughness: 0.3 });
  const glowOrange = new THREE.MeshStandardMaterial({ color: 0xff7a1f, emissive: 0xff7a1f, emissiveIntensity: 3.2, metalness: 0.4, roughness: 0.3 });

  // Side walls
  for (const side of [-1, 1]) {
    const glass = new THREE.Mesh(new THREE.BoxGeometry(FIELD.halfX * 2, 13, 0.35), glassMat);
    glass.position.set(0, 7.2, side * FIELD.halfZ);
    group.add(glass);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(FIELD.halfX * 2, 1.1, 0.7), solidMat);
    bumper.position.set(0, 0.55, side * (FIELD.halfZ + 0.05));
    group.add(bumper);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(FIELD.halfX * 2, 0.09, 0.5), side > 0 ? glowOrange : glowCyan);
    strip.position.set(0, 1.16, side * (FIELD.halfZ + 0.02));
    group.add(strip);
    const topStrip = new THREE.Mesh(new THREE.BoxGeometry(FIELD.halfX * 2, 0.07, 0.4), glowCyan);
    topStrip.position.set(0, 13.8, side * FIELD.halfZ);
    group.add(topStrip);
    // ribs
    for (let i = -6; i <= 6; i += 1) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.18, 13, 0.5), solidMat);
      rib.position.set(i * 8.4, 7.2, side * (FIELD.halfZ + 0.05));
      group.add(rib);
    }
  }

  // End walls, split around goal mouth
  for (const side of [-1, 1]) {
    const outerWidth = FIELD.halfZ - FIELD.goalHalfZ;
    for (const zSign of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.35, 13, outerWidth), glassMat);
      panel.position.set(side * FIELD.halfX, 7.2, zSign * (FIELD.goalHalfZ + outerWidth / 2));
      group.add(panel);
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, outerWidth), solidMat);
      bumper.position.set(side * (FIELD.halfX + 0.05), 0.55, zSign * (FIELD.goalHalfZ + outerWidth / 2));
      group.add(bumper);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, outerWidth), side > 0 ? glowOrange : glowCyan);
      strip.position.set(side * (FIELD.halfX + 0.02), 1.16, zSign * (FIELD.goalHalfZ + outerWidth / 2));
      group.add(strip);
    }
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.5, FIELD.goalHalfZ * 2 + 0.4), glassMat);
    upper.position.set(side * FIELD.halfX, FIELD.goalHeight + 2.7, 0);
    group.add(upper);
    const topStrip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.07, FIELD.halfZ * 2), side > 0 ? glowOrange : glowCyan);
    topStrip.position.set(side * FIELD.halfX, 13.8, 0);
    group.add(topStrip);
  }

  // Corner angled supports
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 14, 0.6), solidMat);
      pillar.position.set(sx * (FIELD.halfX - 0.3), 7, sz * (FIELD.halfZ - 0.2));
      group.add(pillar);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.1), sx > 0 ? glowOrange : glowCyan);
      lamp.position.set(sx * (FIELD.halfX - 0.3), 13.2, sz * (FIELD.halfZ - 0.2));
      group.add(lamp);
    }
  }

  scene.add(group);
  return group;
}

function makeLightTowers(scene) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x08131e, metalness: 0.85, roughness: 0.35 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xdff9ff, emissive: 0xc8f4ff, emissiveIntensity: 5, toneMapped: true });
  const spots = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const tower = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.44, 22, 8), mat);
      pole.position.y = 11;
      tower.add(pole);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 0.9), mat);
      bar.position.y = 22;
      tower.add(bar);
      for (let i = 0; i < 5; i += 1) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.3), lampMat);
        lamp.position.set(-2 + i, 22.2, 0.1);
        lamp.rotation.x = 0.4;
        tower.add(lamp);
      }
      tower.position.set(sx * 47, 0, sz * 44);
      tower.rotation.y = sx > 0 ? -0.4 : 0.4;
      group.add(tower);
      const spot = new THREE.SpotLight(0xd7f6ff, 24, 150, 0.62, 0.8, 1.05);
      spot.position.set(sx * 47, 22, sz * 44);
      spot.target.position.set(0, 0, 0);
      group.add(spot);
      group.add(spot.target);
      spots.push(spot);
    }
  }
  scene.add(group);
  return { group, spots };
}

function makePlanet(scene) {
  const group = new THREE.Group();
  const planetMat = new THREE.MeshStandardMaterial({
    color: 0x183c5c, emissive: 0x0c3048, emissiveIntensity: 0.6,
    roughness: 0.75, metalness: 0.2,
  });
  const planet = new THREE.Mesh(new THREE.IcosahedronGeometry(12, 2), planetMat);
  group.add(planet);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x2ee7ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const ring = new THREE.Mesh(new THREE.RingGeometry(15, 21, 64), ringMat);
  ring.rotation.x = Math.PI / 2.4;
  ring.rotation.y = 0.2;
  group.add(ring);
  const moons = new THREE.Group();
  for (let i = 0; i < 2; i += 1) {
    const moon = new THREE.Mesh(new THREE.SphereGeometry(1.1 + i * 0.5, 12, 8), new THREE.MeshBasicMaterial({ color: i ? 0xff9a3c : 0x2ee7ff }));
    moon.position.set(20 + i * 7, 4 - i * 5, -4);
    moons.add(moon);
  }
  group.add(moons);
  group.position.set(-112, 58, -175);
  group.rotation.z = 0.18;
  scene.add(group);
  return { group, ring, moons };
}

export function createArena(scene) {
  const root = new THREE.Group();
  root.name = 'arena';
  scene.add(root);

  const sky = makeSky();
  scene.add(sky);
  const stars = makeStars();
  scene.add(stars);
  const planet = makePlanet(scene);

  const fieldTex = makeFieldTexture();
  const fieldMat = new THREE.MeshStandardMaterial({
    map: fieldTex,
    emissive: 0x0c3a50,
    emissiveMap: fieldTex,
    emissiveIntensity: 0.34,
    roughness: 0.7,
    metalness: 0.12,
  });
  const field = new THREE.Mesh(new THREE.PlaneGeometry(FIELD.halfX * 2, FIELD.halfZ * 2), fieldMat);
  field.rotation.x = -Math.PI / 2;
  field.receiveShadow = true;
  root.add(field);

  // Under-field skirt
  const skirt = new THREE.Mesh(
    new THREE.BoxGeometry(FIELD.halfX * 2 + 4, 0.6, FIELD.halfZ * 2 + 4),
    new THREE.MeshStandardMaterial({ color: 0x03101a, metalness: 0.4, roughness: 0.7 }),
  );
  skirt.position.y = -0.32;
  root.add(skirt);

  const walls = makeWalls(root);
  makeStands(root);
  const crowd = makeCrowd(root);
  makeBarriers(root);
  const trusses = makeTrusses(root);
  const lights = makeLightTowers(root);
  const goals = { blue: makeGoal(root, TEAM.blue, -1), orange: makeGoal(root, TEAM.orange, 1) };
  const boostPads = makeBoostPads(root);
  const podium = makePodium(root);

  // Extra ground glow ring
  const centerGlow = new THREE.Mesh(
    new THREE.RingGeometry(7.8, 9.2, 64),
    new THREE.MeshBasicMaterial({ color: 0x2ee7ff, transparent: true, opacity: 0.08, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  centerGlow.rotation.x = -Math.PI / 2;
  centerGlow.position.y = 0.025;
  root.add(centerGlow);

  const hemi = new THREE.HemisphereLight(0x6fb8d8, 0x050d15, 0.8);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xe6f9ff, 1.55);
  key.position.set(28, 48, 24);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -70;
  key.shadow.camera.right = 70;
  key.shadow.camera.top = 70;
  key.shadow.camera.bottom = -70;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 140;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff8b3d, 0.55);
  rim.position.set(-30, 22, -36);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0x2d83ff, 0.48);
  fill.position.set(-24, 18, 30);
  scene.add(fill);

  const state = {
    root, field, walls, crowd, trusses, lights, goals, boostPads, podium,
    playerGoal: goals.blue,
    enemyGoal: goals.orange,
    time: 0,
    flash: { blue: 0, orange: 0 },
  };

  function setMenuMode(menu) {
    podium.visible = menu;
    centerGlow.visible = menu;
  }
  setMenuMode(true);

  function setGoalFlash(team, value) {
    state.flash[team] = Math.max(state.flash[team], value);
  }

  function update(dt, elapsed) {
    state.time += dt;
    const t = state.time;
    for (let i = 0; i < boostPads.length; i += 1) {
      const pad = boostPads[i];
      pad.cooldown = Math.max(0, pad.cooldown - dt);
      const active = pad.cooldown <= 0;
      const bob = Math.sin(t * 2.2 + i * 1.7) * 0.11;
      pad.core.position.y = 0.62 + bob + (pad.big ? 0.12 : 0);
      pad.core.rotation.y += dt * 1.8;
      pad.core.rotation.x += dt * 0.7;
      pad.ring.rotation.z += dt * (pad.big ? 0.6 : -0.9);
      pad.ringMat.opacity = active ? 1 : 0.16;
      pad.discMat.opacity = active ? 0.2 + Math.sin(t * 3 + i) * 0.05 : 0.02;
      pad.coreMat.emissiveIntensity = active ? 5.5 : 0.5;
      pad.light.intensity = active ? (pad.big ? 2.2 : 1.1) : 0;
      const s = active ? 1 : 0.55;
      pad.group.scale.setScalar(THREE.MathUtils.lerp(pad.group.scale.x, s, dt * 6));
    }

    // Goal flash decay
    for (const key of ['blue', 'orange']) {
      state.flash[key] = Math.max(0, state.flash[key] - dt * 0.8);
      const f = state.flash[key];
      const goal = goals[key];
      goal.light.intensity = f * 28;
      goal.glowMat.emissiveIntensity = 4.2 + f * 12;
      goal.floorGlow.material.opacity = 0.08 + f * 0.45;
      goal.screen.material.opacity = 1;
    }

    planet.group.rotation.y += dt * 0.008;
    planet.ring.rotation.z += dt * 0.002;
    planet.moons.rotation.y += dt * 0.03;
    stars.rotation.y += dt * 0.0008;
    centerGlow.material.opacity = 0.06 + Math.sin(t * 1.4) * 0.02;
    podium.children.forEach((child) => {
      if (child.geometry && child.geometry.type === 'TorusGeometry') {
        child.rotation.z += dt * 0.15;
      }
    });
  }

  return { ...state, update, setMenuMode, setGoalFlash };
}
