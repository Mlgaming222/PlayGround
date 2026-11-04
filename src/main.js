import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createArena, FIELD, TEAM } from './arena.js';
import { Car } from './car.js';
import { Ball } from './ball.js';
import { FX } from './effects.js';
import { GameAudio } from './audio.js';
import {
  CATEGORIES, ITEMS, STAT_KEYS, STAT_LABELS, computeBuild, loadSelection, saveSelection,
  tradeoffText, modChips, itemById,
} from './cosmetics.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const DIFFICULTIES = {
  rookie: { label: 'ROOKIE', speed: 0.84, accel: 0.84, reaction: 0.26, error: 4.6, boost: 0.3, jump: 0.42 },
  pro: { label: 'PRO', speed: 0.96, accel: 0.95, reaction: 0.12, error: 2.2, boost: 0.66, jump: 0.72 },
  allstar: { label: 'ALL-STAR', speed: 1.05, accel: 1.05, reaction: 0.045, error: 0.9, boost: 0.9, jump: 0.95 },
};

const AI_LOADOUT = { body: 'dominus', wheels: 'zomba', boost: 'flamethrower', topper: 'crown' };
const AI_BUILD = computeBuild(AI_LOADOUT);
const AI_BASE_STATS = { ...AI_BUILD.physics };

// ---------------------------------------------------------------- renderer
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, powerPreference: 'high-performance', stencil: false,
});
const coarse = window.matchMedia('(pointer: coarse)').matches;
const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 700;
const DPR = Math.min(window.devicePixelRatio || 1, coarse || smallScreen ? 1.35 : 1.8);
renderer.setPixelRatio(DPR);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.94;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#02070e');
scene.fog = new THREE.FogExp2(0x04101a, 0.0036);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 700);
camera.position.set(0, 4.5, 14);
const UP = new THREE.Vector3(0, 1, 0);

const pmrem = new THREE.PMREMGenerator(renderer);
const envRT = pmrem.fromScene(new RoomEnvironment(), 0.05);
scene.environment = envRT.texture;
scene.environmentIntensity = 0.055;

const composer = new EffectComposer(renderer);
composer.setPixelRatio(DPR);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  coarse || smallScreen ? 0.22 : 0.25,
  0.4,
  2.05,
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------- world
const arena = createArena(scene);
const fx = new FX(scene);
const ball = new Ball(scene);

const game = {
  mode: 'boot',
  previousMode: 'playing',
  scores: { blue: 0, orange: 0 },
  clock: 180,
  otClock: 0,
  overtime: false,
  stateTime: 0,
  countdown: 3.2,
  lastCount: 4,
  selected: loadSelection(),
  difficulty: 'pro',
  ballCam: true,
  menuAngle: 0.22,
  goalTeam: null,
  goalSide: 1,
  shake: 0,
  cameraLook: new THREE.Vector3(0, 1.2, 0),
  stats: { goals: 0, hits: 0, topSpeed: 0, boostUsed: 0, distance: 0, possession: 0 },
  aiTimer: 0,
  aiTarget: new THREE.Vector3(),
  aiJumpCooldown: 0,
  aiStuck: 0,
  aiReverse: 0,
  aiBoostCooldown: 0,
  toastTimer: 0,
  shotCooldown: 0,
};

try {
  const savedDiff = localStorage.getItem('neon-strikers-difficulty');
  if (savedDiff && DIFFICULTIES[savedDiff]) game.difficulty = savedDiff;
} catch { /* ignore */ }

const playerBuild = () => computeBuild(game.selected);
let build = playerBuild();
const player = new Car(scene, {
  team: TEAM.blue, build, isPlayer: true, name: 'MLG-222', number: '07',
});
const ai = new Car(scene, {
  team: TEAM.orange, build: AI_BUILD, isPlayer: false, name: 'VEX-13', number: '13',
});
const audio = new GameAudio();

player.pos.set(0, 0, 0);
player.yaw = -0.18;
player.visual.group.position.copy(player.pos);
player.visual.group.rotation.y = player.yaw;
ai.visual.group.visible = false;
ball.mesh.visible = false;
ball.shell.visible = false;
ball.glow.visible = false;
ball.light.visible = false;

// ---------------------------------------------------------------- UI: garage
const els = {
  menu: $('#menu'), hud: $('#hud'), loader: $('#loader'), loadBar: $('#loadBar'),
  loadStatus: $('#loadStatus'), itemGrid: $('#itemGrid'), tabs: $('#tabs'), statList: $('#statList'),
  loadoutName: $('#loadoutName'), tradeoff: $('#tradeoff'), buildClass: $('#buildClass'),
  carName: $('#carName'), carBlurb: $('#carBlurb'), heroTags: $('#heroTags'),
  difficulty: $('#difficulty'), playBtn: $('#playBtn'), soundBtn: $('#soundBtn'),
  scoreBlue: $('#scoreBlue'), scoreOrange: $('#scoreOrange'), clock: $('#clock'),
  matchState: $('#matchState'), objective: $('#objective'), boostValue: $('#boostValue'),
  boostFill: $('#boostFill'), boostItem: $('#boostItem'), regenTag: $('#regenTag'),
  speed: $('#speed'), sonicBar: $('#sonicBar'), hudSpeed: $('.speed-hud'),
  jumpPip: $('#jumpPip'), dodgePip: $('#dodgePip'), driftPip: $('#driftPip'),
  centerMsg: $('#centerMsg'), goalBanner: $('#goalBanner'), goalKicker: $('#goalKicker'),
  goalName: $('#goalName'), toast: $('#toast'), camChip: $('#camChip'), pauseBtn: $('#pauseBtn'),
  pause: $('#pause'), resumeBtn: $('#resumeBtn'), restartBtn: $('#restartBtn'), quitBtn: $('#quitBtn'),
  pauseBlue: $('#pauseBlue'), pauseOrange: $('#pauseOrange'), endScreen: $('#endScreen'),
  endTitle: $('#endTitle'), endEyebrow: $('#endEyebrow'), endBlue: $('#endBlue'),
  endOrange: $('#endOrange'), endStats: $('#endStats'), rematchBtn: $('#rematchBtn'),
  endGarageBtn: $('#endGarageBtn'), endFoot: $('#endFoot'), rotateHint: $('#rotateHint'),
};
let activeCategory = 'body';

function buildTabs() {
  els.tabs.innerHTML = CATEGORIES.map((cat) => `
    <button type="button" class="tab${cat.id === activeCategory ? ' active' : ''}" data-cat="${cat.id}">
      ${cat.label}<span class="tab-count">${ITEMS[cat.id].length}</span>
    </button>
  `).join('');
  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      activeCategory = tab.dataset.cat;
      audio.init();
      audio.ui();
      buildTabs();
      renderItems();
    });
  });
}

function renderItems() {
  const items = ITEMS[activeCategory];
  els.itemGrid.innerHTML = items.map((item) => {
    const selected = game.selected[activeCategory] === item.id;
    const chips = modChips(item).map((chip) => (
      `<span class="mod-chip${chip.negative ? ' neg' : ''}">${chip.text}</span>`
    )).join('');
    return `
      <button type="button" class="item-card${selected ? ' selected' : ''}" data-id="${item.id}" style="--accent:${item.accent}">
        <div class="item-icon">${item.icon}</div>
        <div class="item-meta"><strong>${item.name}</strong><span>${item.tag}</span></div>
        <div class="item-mods">${chips}</div>
      </button>
    `;
  }).join('');
  $$('.item-card').forEach((card) => {
    card.addEventListener('click', () => {
      if (game.selected[activeCategory] === card.dataset.id) return;
      game.selected[activeCategory] = card.dataset.id;
      saveSelection(game.selected);
      build = playerBuild();
      player.setBuild(build);
      audio.init();
      audio.select();
      renderItems();
      renderTelemetry();
      renderHero();
    });
  });
}

function renderTelemetry() {
  els.statList.innerHTML = STAT_KEYS.map((key) => {
    const value = build.totals[key];
    return `
      <div class="stat-row">
        <span>${STAT_LABELS[key]}</span>
        <div class="stat-track"><i class="stat-fill" style="width:${value * 10}%"></i></div>
        <b>${value.toFixed(1)}</b>
      </div>
    `;
  }).join('');
  els.buildClass.textContent = build.archetype;
  els.loadoutName.textContent = [
    build.chosen.body.name, build.chosen.wheels.name, build.chosen.boost.name, build.chosen.topper.name,
  ].join(' / ');
  els.tradeoff.innerHTML = tradeoffText(build);
}

function renderHero() {
  els.carName.textContent = build.chosen.body.name.toUpperCase();
  els.carBlurb.textContent = build.chosen.body.blurb;
  const tags = [
    build.archetype,
    build.chosen.body.tag,
    build.chosen.boost.regen ? `REGEN ${build.chosen.boost.regen}/S` : `${build.chosen.boost.capacity} BOOST`,
    build.chosen.topper.id === 'none' ? 'CLEAN ROOF' : build.chosen.topper.name.toUpperCase(),
  ];
  els.heroTags.innerHTML = tags.map((tag) => `<span>${tag}</span>`).join('');
}

function setDifficulty(diff) {
  if (!DIFFICULTIES[diff]) return;
  game.difficulty = diff;
  try { localStorage.setItem('neon-strikers-difficulty', diff); } catch { /* ignore */ }
  $$('.difficulty button').forEach((b) => b.classList.toggle('active', b.dataset.diff === diff));
  audio.ui();
}

function setupUI() {
  buildTabs();
  renderItems();
  renderTelemetry();
  renderHero();
  $$('.difficulty button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.diff === game.difficulty);
    btn.addEventListener('click', () => setDifficulty(btn.dataset.diff));
  });
  document.body.classList.toggle('muted', audio.muted);
  els.soundBtn.addEventListener('click', () => {
    audio.init();
    const muted = audio.toggleMuted();
    document.body.classList.toggle('muted', muted);
    if (!muted) audio.ui();
  });
  els.playBtn.addEventListener('click', () => {
    audio.init();
    audio.ui();
    startMatch();
  });
  els.pauseBtn.addEventListener('click', () => togglePause());
  els.resumeBtn.addEventListener('click', () => togglePause(false));
  els.restartBtn.addEventListener('click', () => { closePause(); startMatch(); });
  els.quitBtn.addEventListener('click', () => { closePause(); showMenu(); });
  els.rematchBtn.addEventListener('click', () => { els.endScreen.classList.add('hidden'); startMatch(); });
  els.endGarageBtn.addEventListener('click', () => { els.endScreen.classList.add('hidden'); showMenu(); });
}

// ---------------------------------------------------------------- UI: HUD
let hudTick = 0;
function updateHUD(dt) {
  els.scoreBlue.textContent = game.scores.blue;
  els.scoreOrange.textContent = game.scores.orange;
  els.pauseBlue.textContent = game.scores.blue;
  els.pauseOrange.textContent = game.scores.orange;

  if (game.overtime) {
    const total = Math.floor(game.otClock);
    els.clock.textContent = `+${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
    els.matchState.textContent = 'OVERTIME';
    $('.clock-wrap').classList.add('overtime');
    $('.clock-wrap').classList.remove('hurry');
  } else {
    const total = Math.max(0, Math.ceil(game.clock));
    els.clock.textContent = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
    els.matchState.textContent = 'REGULATION';
    $('.clock-wrap').classList.toggle('hurry', game.clock <= 30);
    $('.clock-wrap').classList.remove('overtime');
  }

  const boostPct = Math.max(0, Math.min(100, (player.boost / player.stats.capacity) * 100));
  els.boostValue.textContent = Math.round(player.boost);
  els.boostFill.style.width = `${boostPct}%`;
  els.boostItem.textContent = player.build.chosen.boost.name.toUpperCase();
  els.regenTag.textContent = player.stats.regen > 0 ? `+${player.stats.regen}/S REGEN` : 'NO REGEN';

  const kph = Math.round(player.speed * 3.6);
  els.speed.textContent = String(kph).padStart(3, '0');
  const maxKph = player.stats.maxSpeed * 1.3 * 3.6;
  els.sonicBar.style.setProperty('--speed', `${Math.min(100, (kph / maxKph) * 100)}%`);
  els.hudSpeed.classList.toggle('sonic', player.speed > player.stats.maxSpeed * 0.93);

  els.jumpPip.classList.toggle('active', player.grounded || player.jumpCount < 2);
  els.dodgePip.classList.toggle('active', !player.grounded && player.jumpCount < 2);
  els.driftPip.classList.toggle('active', !!currentInput.drift);

  if (game.toastTimer > 0) {
    game.toastTimer -= dt;
    if (game.toastTimer <= 0) els.toast.classList.remove('show');
  }

  // Only update expensive-ish text ~15fps
  hudTick += dt;
  if (hudTick > 0.1) {
    hudTick = 0;
    if (game.mode === 'playing') {
      const diff = Math.abs(game.scores.blue - game.scores.orange);
      if (game.overtime) els.objective.textContent = 'SUDDEN DEATH — NEXT GOAL WINS';
      else if (game.clock <= 30 && diff <= 1) els.objective.textContent = 'CLUTCH TIME — PROTECT THE NET';
      else if (diff >= 3) els.objective.textContent = 'MERCY RULE? KEEP THE PRESSURE ON';
      else els.objective.textContent = 'FIRST TO THE BALL. LAST TO LEAVE.';
    }
  }
}

function showCenter(text, className = '', duration = 1000) {
  els.centerMsg.textContent = text;
  els.centerMsg.className = `center-msg show ${className}`.trim();
  clearTimeout(showCenter.timer);
  showCenter.timer = setTimeout(() => {
    els.centerMsg.className = 'center-msg';
  }, duration);
}

function showToast(text, duration = 1.8) {
  els.toast.textContent = text;
  els.toast.classList.add('show');
  game.toastTimer = duration;
}

// ---------------------------------------------------------------- game flow
function hideBall(visible) {
  ball.mesh.visible = visible;
  ball.shell.visible = visible;
  ball.glow.visible = visible;
  ball.light.visible = visible;
}

function showMenu() {
  game.mode = 'menu';
  game.stateTime = 0;
  game.menuAngle = 0.22;
  arena.setMenuMode(true);
  hideBall(false);
  ai.visual.group.visible = false;
  player.visual.group.visible = true;
  player.pos.set(0, 0, 0);
  player.vel.set(0, 0, 0);
  player.yaw = -0.18;
  player.visual.group.position.copy(player.pos);
  player.visual.group.rotation.y = player.yaw;
  player.visual.bodyGroup.rotation.set(0, 0, 0);
  player.boost = 34;
  player.boosting = false;
  els.menu.classList.remove('hidden');
  els.hud.classList.add('hidden');
  els.pause.classList.add('hidden');
  els.endScreen.classList.add('hidden');
  els.goalBanner.classList.remove('show');
  els.centerMsg.className = 'center-msg';
  audio.setEngine(0, false, false);
  renderTelemetry();
  renderHero();
  updateCamChip();
}

function prepareAI() {
  const cfg = DIFFICULTIES[game.difficulty];
  ai.stats.maxSpeed = AI_BASE_STATS.maxSpeed * cfg.speed;
  ai.stats.accel = AI_BASE_STATS.accel * cfg.accel;
}

function resetKickoff(countdown = 3.2, message = true) {
  player.reset(-32, 0, Math.PI / 2, 34);
  ai.reset(32, 0, -Math.PI / 2, 34);
  ball.reset();
  game.countdown = countdown;
  game.lastCount = 4;
  game.stateTime = 0;
  game.mode = 'countdown';
  ball.frozen = true;
  hideBall(true);
  ai.visual.group.visible = true;
  arena.setMenuMode(false);
  game.shake = 0;
  if (message) showCenter('READY', '');
  audio.whistle();
}

function startMatch() {
  game.scores = { blue: 0, orange: 0 };
  game.clock = 180;
  game.otClock = 0;
  game.overtime = false;
  game.stats = { goals: 0, hits: 0, topSpeed: 0, boostUsed: 0, distance: 0, possession: 0 };
  player.topSpeed = 0;
  player.boostUsed = 0;
  player.hits = 0;
  game.shotCooldown = 0;
  game.aiTimer = 0;
  game.aiJumpCooldown = 0;
  game.aiStuck = 0;
  game.aiReverse = 0;
  game.aiBoostCooldown = 0;
  prepareAI();
  els.menu.classList.add('hidden');
  els.hud.classList.remove('hidden');
  els.endScreen.classList.add('hidden');
  els.pause.classList.add('hidden');
  els.goalBanner.classList.remove('show');
  resetKickoff(3.2);
  updateHUD(0);
  updateCamChip();
}

function togglePause(force) {
  if (game.mode === 'menu' || game.mode === 'ended' || game.mode === 'boot') return;
  const shouldPause = typeof force === 'boolean' ? force : game.mode !== 'paused';
  if (shouldPause) {
    if (game.mode === 'paused') return;
    game.previousMode = game.mode;
    game.mode = 'paused';
    els.pause.classList.remove('hidden');
    els.pauseBlue.textContent = game.scores.blue;
    els.pauseOrange.textContent = game.scores.orange;
    audio.setEngine(0, false, false);
    audio.ui();
  } else {
    if (game.mode !== 'paused') return;
    game.mode = game.previousMode;
    els.pause.classList.add('hidden');
    audio.ui();
  }
}

function closePause() {
  els.pause.classList.add('hidden');
  if (game.mode === 'paused') game.mode = game.previousMode;
}

function beginOvertime() {
  game.overtime = true;
  game.clock = 0;
  game.otClock = 0;
  showToast('OVERTIME — NEXT GOAL WINS', 3);
  resetKickoff(3.2, false);
  showCenter('OVERTIME', 'warn', 1500);
  audio.whistle();
}

function endMatch() {
  game.mode = 'ended';
  const won = game.scores.blue > game.scores.orange;
  els.endTitle.textContent = won ? 'VICTORY' : 'DEFEAT';
  els.endTitle.classList.toggle('loss', !won);
  els.endEyebrow.textContent = game.overtime ? 'OVERTIME COMPLETE' : 'MATCH COMPLETE';
  els.endBlue.textContent = game.scores.blue;
  els.endOrange.textContent = game.scores.orange;
  const stats = [
    ['GOALS', game.stats.goals],
    ['BALL TOUCHES', player.hits],
    ['TOP SPEED', `${Math.round(player.topSpeed * 3.6)} KPH`],
    ['BOOST BURNED', `${Math.round(player.boostUsed)}`],
    ['DISTANCE', `${(game.stats.distance / 1000).toFixed(2)} KM`],
    ['POSSESSION', `${Math.round(game.stats.possession)} S`],
  ];
  els.endStats.innerHTML = stats.map(([label, value]) => (
    `<div class="end-stat"><span>${label}</span><b>${value}</b></div>`
  )).join('');
  els.endFoot.textContent = won
    ? 'THE ARENA REMEMBERS YOUR NAME.'
    : 'RECALIBRATE THE LOADOUT. RUN IT BACK.';
  els.endScreen.classList.remove('hidden');
  els.hud.classList.remove('hidden');
  audio.setEngine(0, false, false);
  if (won) audio.win(); else audio.lose();
}

function scoreGoal(team) {
  if (game.mode !== 'playing') return;
  game.mode = 'goal';
  game.stateTime = 0;
  game.goalTeam = team;
  game.goalSide = team === 'blue' ? 1 : -1;
  game.scores[team] += 1;
  game.shake = 1.4;
  ball.frozen = true;
  const scorer = ball.lastTouchCar ? ball.lastTouchCar.name : team.toUpperCase();
  const teamData = TEAM[team];
  els.goalBanner.classList.toggle('orange', team === 'orange');
  els.goalKicker.textContent = `${teamData.name} SCORES`;
  els.goalName.textContent = scorer;
  els.goalBanner.classList.add('show');
  arena.setGoalFlash(team, 1.2);
  const pos = new THREE.Vector3(game.goalSide * (FIELD.halfX - 2), 5, Math.max(-8, Math.min(8, ball.pos.z)));
  fx.goal(pos, team, teamData.glow);
  audio.goal(team);
  if (team === 'blue') game.stats.goals += 1;
  game.toastTimer = 0;
  els.toast.classList.remove('show');
  showCenter('', '');
  updateHUD(0);
}

function afterGoal() {
  els.goalBanner.classList.remove('show');
  if (game.overtime) { endMatch(); return; }
  if (game.clock <= 0) {
    if (game.scores.blue === game.scores.orange) beginOvertime();
    else endMatch();
    return;
  }
  resetKickoff(3.0);
}

function checkClock(dt) {
  if (!game.overtime) {
    const before = game.clock;
    game.clock -= dt;
    if (before > 0 && game.clock <= 0) {
      game.clock = 0;
      if (game.scores.blue === game.scores.orange) beginOvertime();
      else endMatch();
    }
  } else {
    game.otClock += dt;
  }
}

// ---------------------------------------------------------------- input
const keys = new Set();
let jumpQueued = false;
let currentInput = { throttle: 0, steer: 0, boost: false, drift: false, jumpPressed: false };
const stick = { active: false, x: 0, y: 0, pointerId: null };
const touch = { boost: false, drift: false };

window.addEventListener('keydown', (ev) => {
  const code = ev.code;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(code)) ev.preventDefault();
  if (keys.has(code)) return;
  keys.add(code);
  audio.init();
  if (code === 'Space') jumpQueued = true;
  if (code === 'KeyC') toggleBallCam();
  if (code === 'KeyM') {
    const muted = audio.toggleMuted();
    document.body.classList.toggle('muted', muted);
    if (!muted) audio.ui();
  }
  if (code === 'Escape') togglePause();
});
window.addEventListener('keyup', (ev) => {
  keys.delete(ev.code);
});
window.addEventListener('blur', () => {
  keys.clear();
  if (game.mode === 'playing') togglePause(true);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.mode === 'playing') togglePause(true);
});
window.addEventListener('contextmenu', (e) => e.preventDefault());

function readPlayerInput() {
  const left = keys.has('ArrowLeft') || keys.has('KeyA');
  const right = keys.has('ArrowRight') || keys.has('KeyD');
  const up = keys.has('ArrowUp') || keys.has('KeyW');
  const down = keys.has('ArrowDown') || keys.has('KeyS');
  let throttle = (up ? 1 : 0) + (down ? -1 : 0);
  let steer = (right ? 1 : 0) + (left ? -1 : 0);
  const boost = keys.has('ShiftLeft') || keys.has('ShiftRight') || touch.boost;
  const drift = keys.has('KeyQ') || touch.drift;
  if (stick.active || Math.abs(stick.x) > 0.06 || Math.abs(stick.y) > 0.06) {
    throttle = THREE.MathUtils.clamp(-stick.y + throttle, -1, 1);
    steer = THREE.MathUtils.clamp(stick.x + steer, -1, 1);
  }
  const input = { throttle, steer, boost, drift, jumpPressed: jumpQueued };
  jumpQueued = false;
  return input;
}

function updateStick(clientX, clientY) {
  const base = $('#stickBase');
  const rect = base.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = clientX - cx;
  let dy = clientY - cy;
  const max = rect.width * 0.34;
  const len = Math.hypot(dx, dy);
  if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
  stick.x = dx / max;
  stick.y = dy / max;
  $('#stickKnob').style.transform = `translate(${dx}px, ${dy}px)`;
}

function setupTouch() {
  if (navigator.maxTouchPoints > 0 || coarse) document.body.classList.add('touch');
  const base = $('#stickBase');
  base.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    audio.init();
    stick.active = true;
    stick.pointerId = e.pointerId;
    base.setPointerCapture(e.pointerId);
    updateStick(e.clientX, e.clientY);
  });
  base.addEventListener('pointermove', (e) => {
    if (!stick.active || e.pointerId !== stick.pointerId) return;
    e.preventDefault();
    updateStick(e.clientX, e.clientY);
  });
  const endStick = (e) => {
    if (e.pointerId !== stick.pointerId) return;
    stick.active = false;
    stick.x = 0;
    stick.y = 0;
    $('#stickKnob').style.transform = 'translate(0px, 0px)';
  };
  base.addEventListener('pointerup', endStick);
  base.addEventListener('pointercancel', endStick);

  function bindHold(id, prop) {
    const el = $(id);
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      audio.init();
      touch[prop] = true;
      el.classList.add('held');
    });
    const end = () => { touch[prop] = false; el.classList.remove('held'); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerleave', end);
  }
  bindHold('#touchBoost', 'boost');
  bindHold('#touchDrift', 'drift');
  const jump = $('#touchJump');
  jump.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    audio.init();
    jumpQueued = true;
    jump.classList.add('held');
  });
  const jumpEnd = () => jump.classList.remove('held');
  jump.addEventListener('pointerup', jumpEnd);
  jump.addEventListener('pointercancel', jumpEnd);
  $('#touchCam').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    toggleBallCam();
  });
}

function toggleBallCam() {
  game.ballCam = !game.ballCam;
  updateCamChip();
  if (game.mode !== 'menu') showToast(game.ballCam ? 'BALL CAM ON' : 'CAR CAM ON', 1.1);
  audio.ui();
}

function updateCamChip() {
  els.camChip.classList.toggle('car', !game.ballCam);
  els.camChip.innerHTML = `<span></span>${game.ballCam ? 'BALL CAM' : 'CAR CAM'}`;
}

// ---------------------------------------------------------------- AI
function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function aiInput(dt) {
  const cfg = DIFFICULTIES[game.difficulty];
  game.aiTimer -= dt;
  game.aiJumpCooldown = Math.max(0, game.aiJumpCooldown - dt);
  game.aiBoostCooldown = Math.max(0, game.aiBoostCooldown - dt);
  game.aiReverse = Math.max(0, game.aiReverse - dt);

  if (game.aiTimer <= 0) {
    game.aiTimer = cfg.reaction + Math.random() * cfg.reaction * 0.6;
    const predicted = ball.pos.clone().addScaledVector(ball.vel, 0.12);
    const attack = new THREE.Vector3(-FIELD.halfX, 0, 0);
    const behind = predicted.clone().sub(attack);
    behind.y = 0;
    if (behind.lengthSq() < 0.01) behind.set(1, 0, 0);
    behind.normalize();
    const target = predicted.clone().addScaledVector(behind, 4.4);
    const err = cfg.error;
    target.x += Math.sin(performance.now() * 0.0013) * err;
    target.z += Math.cos(performance.now() * 0.0017) * err * 0.8;
    target.x = THREE.MathUtils.clamp(target.x, -FIELD.halfX + 3, FIELD.halfX - 3);
    target.z = THREE.MathUtils.clamp(target.z, -FIELD.halfZ + 3, FIELD.halfZ - 3);
    target.y = 0;

    // Recover boost if the ball is far away
    if (ai.boost < 22 && ai.pos.distanceTo(ball.pos) > 25) {
      let best = null;
      let bestD = Infinity;
      for (const pad of arena.boostPads) {
        if (pad.cooldown > 0) continue;
        const d = Math.hypot(ai.pos.x - pad.x, ai.pos.z - pad.z);
        if (d < bestD) { bestD = d; best = pad; }
      }
      if (best) target.set(best.x, 0, best.z);
    }
    game.aiTarget.copy(target);
  }

  const target = game.aiTarget;
  const dx = target.x - ai.pos.x;
  const dz = target.z - ai.pos.z;
  const dist = Math.hypot(dx, dz);
  const desiredYaw = Math.atan2(dx, dz);
  let angle = wrapAngle(desiredYaw - ai.yaw);
  let steer = THREE.MathUtils.clamp(angle * 2.6, -1, 1);
  let throttle = 1;

  if (game.aiReverse > 0) {
    throttle = -0.8;
    steer = -steer;
  } else if (Math.abs(angle) > 2.0 && dist < 8) {
    throttle = 0.25;
  } else if (dist < 2.4) {
    throttle = 0.45;
  }

  // Stuck detection
  if (Math.abs(throttle) > 0.6 && ai.speed < 2.2 && ai.pos.distanceTo(ball.pos) > 5) {
    game.aiStuck += dt;
    if (game.aiStuck > 0.8) {
      game.aiStuck = 0;
      game.aiReverse = 0.55;
    }
  } else {
    game.aiStuck = Math.max(0, game.aiStuck - dt * 2);
  }

  const ballDist = Math.hypot(ai.pos.x - ball.pos.x, ai.pos.z - ball.pos.z);
  const aligned = Math.abs(angle) < 0.38;
  const wantBoost = ai.boost > 12 && aligned && dist > 13 && Math.random() < cfg.boost;
  if (wantBoost && game.aiBoostCooldown <= 0) {
    game.aiBoostCooldown = 0.1;
  }

  // Jump for aerial balls
  let jumpPressed = false;
  if (ai.grounded && game.aiJumpCooldown <= 0 && ballDist < 7.2) {
    const heightDiff = ball.pos.y - (ai.pos.y + 1.2);
    if (heightDiff > 1.4 && Math.random() < cfg.jump) {
      jumpPressed = true;
      game.aiJumpCooldown = 0.8;
    }
  }
  // Double jump when already airborne and close
  if (!ai.grounded && ai.jumpCount === 1 && ai.vel.y < 4 && ballDist < 5.4 && game.aiJumpCooldown <= 0 && Math.random() < cfg.jump * 0.6) {
    jumpPressed = true;
    game.aiJumpCooldown = 0.7;
  }

  return {
    throttle,
    steer,
    boost: wantBoost && game.aiBoostCooldown <= 0.05,
    drift: Math.abs(angle) > 1.0 && ai.speed > 13,
    jumpPressed,
  };
}

// ---------------------------------------------------------------- collisions & pickups
function updatePads() {
  for (const pad of arena.boostPads) {
    if (pad.cooldown > 0) continue;
    for (const car of [player, ai]) {
      const d = Math.hypot(car.pos.x - pad.x, car.pos.z - pad.z);
      if (d < (pad.big ? 2.8 : 2.0) && car.boost < car.stats.capacity - 0.5) {
        const gained = car.addBoost(pad.amount);
        if (gained) {
          pad.cooldown = pad.big ? 7 : 4.2;
          fx.spawn({
            position: new THREE.Vector3(pad.x, 0.6, pad.z), count: pad.big ? 26 : 10,
            spread: 1.2, speed: 3.4, speedSpread: 7, colors: [0xffb23c, 0xffe6a8, 0xffffff],
            size: [0.3, 0.8], life: [0.3, 0.8], gravity: 2, drag: 1.4, upward: 0.8,
          });
          if (car === player) audio.pad(pad.big);
          break;
        }
      }
    }
  }
}

// ---------------------------------------------------------------- camera
const lookSmooth = new THREE.Vector3(0, 1.2, 0);
let airCamY = 0;
let camYawSmooth = Math.PI / 2;

function updateCamera(dt, elapsed) {
  const shakeAmt = game.shake;
  game.shake = Math.max(0, game.shake - dt * 1.6);
  const sx = (Math.random() - 0.5) * shakeAmt * 0.8;
  const sy = (Math.random() - 0.5) * shakeAmt * 0.8;

  if (game.mode === 'menu' || game.mode === 'boot') {
    game.menuAngle += dt * 0.1;
    const angle = game.menuAngle;
    const desired = new THREE.Vector3(
      player.pos.x + Math.sin(angle) * 12.6,
      4.2 + Math.sin(elapsed * 0.4) * 0.2,
      player.pos.z + Math.cos(angle) * 12.6,
    );
    camera.position.lerp(desired, 1 - Math.exp(-3 * dt));
    const center = new THREE.Vector3(player.pos.x, 1.08, player.pos.z);
    const toCar = center.clone().sub(camera.position).normalize();
    const camRight = new THREE.Vector3().crossVectors(toCar, UP).normalize();
    const camUp = new THREE.Vector3().crossVectors(camRight, toCar).normalize();
    const narrow = window.innerWidth < 1240;
    const shiftX = narrow ? 3.85 : 2.65;
    const shiftY = narrow ? 3.15 : 2.45;
    const lookTarget = center.clone().addScaledVector(camRight, -shiftX).addScaledVector(camUp, -shiftY);
    lookSmooth.lerp(lookTarget, 1 - Math.exp(-5 * dt));
    camera.lookAt(lookSmooth);
    camera.fov = THREE.MathUtils.lerp(camera.fov, 52, 1 - Math.exp(-3 * dt));
    camera.updateProjectionMatrix();
    return;
  }

  if (game.mode === 'goal') {
    const side = game.goalSide;
    const desired = new THREE.Vector3(side * (FIELD.halfX - 15), 10.5, 12 * Math.sin(game.stateTime * 0.4 + 0.4));
    camera.position.lerp(desired, 1 - Math.exp(-3.2 * dt));
    lookSmooth.lerp(ball.pos, 1 - Math.exp(-4.5 * dt));
    camera.lookAt(lookSmooth);
    camera.fov = THREE.MathUtils.lerp(camera.fov, 62, 1 - Math.exp(-3 * dt));
    camera.updateProjectionMatrix();
    return;
  }

  const forward = player.forward;
  const speed = player.speed;
  const airborne = Math.max(0, player.pos.y - 1) * 0.45;
  airCamY = THREE.MathUtils.damp(airCamY, airborne, 4, dt);
  const dist = 11.4 + Math.min(2.2, speed * 0.04);

  // Ball cam orbits the camera to the far side of the car from the ball, so
  // both the car and the ball stay framed no matter which way the car faces.
  let camYaw = player.yaw;
  if (game.ballCam) {
    const dx = ball.pos.x - player.pos.x;
    const dz = ball.pos.z - player.pos.z;
    const flatDist = Math.hypot(dx, dz);
    if (flatDist > 0.001) {
      const ballYaw = Math.atan2(dx, dz);
      const blend = THREE.MathUtils.smoothstep(flatDist, 3, 9);
      camYaw = player.yaw + wrapAngle(ballYaw - player.yaw) * blend;
    }
  }
  const yawRate = game.ballCam ? 5.2 : 7.5;
  camYawSmooth += wrapAngle(camYaw - camYawSmooth) * (1 - Math.exp(-yawRate * dt));

  // Keep the camera inside the arena shell. When the ideal spot is behind a
  // wall, orbit the camera sideways instead of letting the car fall out of
  // frame (and never let it clip into the stands).
  const limitX = FIELD.halfX - 2.2;
  const limitZ = FIELD.halfZ - 2.2;
  const fits = (yaw, radius) => {
    const x = player.pos.x - Math.sin(yaw) * radius;
    const z = player.pos.z - Math.cos(yaw) * radius;
    return Math.abs(x) <= limitX && Math.abs(z) <= limitZ ? { x, z } : null;
  };
  let camX = player.pos.x - Math.sin(camYawSmooth) * dist;
  let camZ = player.pos.z - Math.cos(camYawSmooth) * dist;
  let wallPush = 0;
  if (Math.abs(camX) > limitX || Math.abs(camZ) > limitZ) {
    const offsets = [0, 0.45, -0.45, 0.9, -0.9, 1.35, -1.35, 1.8, -1.8, 2.25, -2.25, Math.PI];
    const scales = [1, 0.82, 0.66, 0.52];
    let found = false;
    for (const scale of scales) {
      for (const off of offsets) {
        const spot = fits(camYawSmooth + off, dist * scale);
        if (spot) {
          camX = spot.x;
          camZ = spot.z;
          wallPush = (1 - scale) * 3;
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (!found) {
      camX = THREE.MathUtils.clamp(camX, -limitX, limitX);
      camZ = THREE.MathUtils.clamp(camZ, -limitZ, limitZ);
      wallPush = 3;
    }
  }
  const desired = new THREE.Vector3(camX, 4.05 + airCamY + wallPush, camZ);
  camera.position.lerp(desired, 1 - Math.exp(-10 * dt));
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -limitX, limitX);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -limitZ, limitZ);
  camera.position.y = Math.max(1.6, camera.position.y);

  const lookTarget = new THREE.Vector3();
  if (game.ballCam) {
    lookTarget.copy(ball.pos);
    lookTarget.y = Math.max(1.3, ball.pos.y + 0.25);
  } else {
    lookTarget.copy(player.pos).addScaledVector(forward, 11);
    lookTarget.y += 1.1;
  }
  lookSmooth.lerp(lookTarget, 1 - Math.exp(-12 * dt));
  camera.lookAt(lookSmooth);
  const targetFov = 63 + Math.min(9, speed * 0.2) + (player.boosting ? 3.5 : 0);
  camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 4, dt);
  camera.updateProjectionMatrix();

  camera.position.x += sx;
  camera.position.y += sy;
  camera.lookAt(lookSmooth);
}

// ---------------------------------------------------------------- main update
const fixedClock = { last: performance.now() / 1000, elapsedTime: 0 };

function updateCountdown(dt) {
  game.countdown -= dt;
  const count = Math.ceil(game.countdown);
  if (count !== game.lastCount && count > 0) {
    game.lastCount = count;
    showCenter(String(count), count === 1 ? 'warn' : '', 650);
    audio.countdown(false);
  }
  if (game.countdown <= 0) {
    game.mode = 'playing';
    game.stateTime = 0;
    ball.frozen = false;
    showCenter('GO', 'go', 700);
    audio.countdown(true);
  }
}

function updatePlaying(dt) {
  currentInput = readPlayerInput();
  const aiIn = aiInput(dt);
  player.update(dt, currentInput, ball, {
    boost: (c) => { if (c === player) fx.boost(c, dt); },
    jump: () => audio.jump(),
    flip: () => audio.flip(),
    land: (c, imp) => { if (c === player) { audio.land(imp); game.shake = Math.max(game.shake, Math.min(0.24, imp * 0.018)); } fx.land(c, imp); },
    hit: (c, b, impact, normal) => {
      if (c === player) {
        audio.hit(impact);
        game.shake = Math.max(game.shake, Math.min(0.5, impact * 0.016));
        game.stats.hits += 1;
        if (impact > 12) showToast(impact > 30 ? 'ROCKET HIT!' : 'CLEAN HIT', 0.9);
      }
      fx.hit(c, b, impact, normal);
    },
  });
  ai.update(dt, aiIn, ball, {
    boost: (c) => fx.boost(c, dt),
    hit: (c, b, impact, normal) => fx.hit(c, b, impact, normal),
    land: (c, imp) => fx.land(c, imp),
    jump: () => {},
    flip: () => {},
  });

  const goal = ball.update(dt, {
    bounce: (b, imp) => { fx.bounce(b, imp); if (b.pos.distanceTo(player.pos) < 18) audio.bounce(imp); },
    wallBounce: (b) => { fx.wallBounce(b); if (b.pos.distanceTo(player.pos) < 20) audio.bounce(3); },
  });
  fx.trail(ball);

  updatePads();
  checkClock(dt);
  if (game.mode !== 'playing') return;

  game.stats.topSpeed = Math.max(game.stats.topSpeed, player.topSpeed);
  game.stats.boostUsed = player.boostUsed;
  game.stats.distance += player.speed * dt;
  game.stats.possession += ball.lastTouch === 'blue' ? dt : 0;
  if (ball.lastTouch === 'blue') game.shotCooldown = Math.max(0, game.shotCooldown - dt);

  if (goal) scoreGoal(goal);

  audio.setEngine(player.speed, player.boosting, true);
}

function update(dt, elapsed) {
  arena.update(dt, elapsed);
  fx.update(dt);

  if (game.mode === 'menu') {
    player.updateVisual(dt, elapsed);
    ai.updateVisual(dt, elapsed);
  } else if (game.mode === 'countdown') {
    game.stateTime += dt;
    player.updateVisual(dt, elapsed);
    ai.updateVisual(dt, elapsed);
    updateCountdown(dt);
  } else if (game.mode === 'playing') {
    game.stateTime += dt;
    updatePlaying(dt);
    player.updateVisual(dt, elapsed);
    ai.updateVisual(dt, elapsed);
  } else if (game.mode === 'goal') {
    game.stateTime += dt;
    // let the cars coast out with no input
    const idle = { throttle: 0, steer: 0, boost: false, drift: false, jumpPressed: false };
    player.update(dt, idle, ball);
    ai.update(dt, idle, ball);
    player.updateVisual(dt, elapsed);
    ai.updateVisual(dt, elapsed);
    ball.update(dt);
    if (game.stateTime > 3.1) afterGoal();
  } else if (game.mode === 'ended') {
    player.updateVisual(dt, elapsed);
    ai.updateVisual(dt, elapsed);
    ball.update(dt);
  } else if (game.mode === 'paused') {
    // frozen
  }

  if (game.mode !== 'menu' && game.mode !== 'boot') updateHUD(dt);
  updateCamera(dt, elapsed);
}

// ---------------------------------------------------------------- resize
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.setSize(w, h);
  if (w < h && w < 700) {
    els.rotateHint.classList.remove('hidden');
  } else {
    els.rotateHint.classList.add('hidden');
  }
}
window.addEventListener('resize', onResize);

// ---------------------------------------------------------------- boot
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now() / 1000;
  const dt = Math.min(0.05, Math.max(0, now - fixedClock.last));
  fixedClock.last = now;
  fixedClock.elapsedTime += dt;
  const elapsed = fixedClock.elapsedTime;
  update(dt, elapsed);
  composer.render();
}

async function boot() {
  setupUI();
  setupTouch();
  onResize();
  showMenu();
  els.loadBar.style.width = '100%';
  els.loadStatus.textContent = 'ARENA ONLINE';
  try { await document.fonts.ready; } catch { /* ignore */ }
  animate();
  setTimeout(() => {
    els.loader.classList.add('done');
    if (game.mode === 'menu') els.menu.classList.remove('hidden');
  }, 320);
}

boot();

// Debug handle for visual QA in the browser console.
window.__NEON = { THREE, scene, camera, renderer, player, ai, ball, game, arena, build, composer, bloom, update, startMatch, showMenu };
