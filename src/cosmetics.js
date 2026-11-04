export const STAT_KEYS = ['speed', 'accel', 'handling', 'power', 'jump', 'boost'];

export const STAT_LABELS = {
  speed: 'TOP SPEED',
  accel: 'ACCEL',
  handling: 'HANDLING',
  power: 'HIT POWER',
  jump: 'JUMP',
  boost: 'BOOST',
};

const carIcon = (path) => `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5"><path d="${path}" stroke-linejoin="round"/><circle cx="12" cy="29" r="3.2"/><circle cx="28" cy="29" r="3.2"/><path d="M17 16h6M10 22h20" stroke-width="1" opacity=".6"/></svg>`;

const wheelIcon = (spokes) => `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="20" cy="20" r="13"/><circle cx="20" cy="20" r="3" fill="currentColor" stroke="none"/>${spokes}</svg>`;

const boostIcon = (flame) => `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5"><path d="${flame}" stroke-linejoin="round"/><path d="M15 8h10" stroke-width="1" opacity=".55"/></svg>`;

const topperIcon = (shape) => `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5">${shape}</svg>`;

export const CATEGORIES = [
  { id: 'body', label: 'BODY', icon: 'BODY' },
  { id: 'wheels', label: 'WHEELS', icon: 'WHEEL' },
  { id: 'boost', label: 'BOOST', icon: 'BOOST' },
  { id: 'topper', label: 'TOPPER', icon: 'TOPPER' },
];

export const ITEMS = {
  body: [
    {
      id: 'octane', name: 'Octane', tag: 'BALANCED FRAME', accent: '#ff9a3c',
      blurb: 'The all-rounder. No weaknesses, no wasted mass.',
      desc: 'A neutral chassis that lets your cosmetics do the talking.',
      mods: { speed: 0.6, accel: 0.5, handling: 0.4, power: 0.1, jump: 0.3, boost: 0.1 },
      weight: 1.0,
      dims: { length: 4.5, width: 1.95, height: 0.72, cabin: 0.62, cabinZ: 0.1, nose: 0.85, wheel: 0.53, wheelZ: 1.38 },
      icon: carIcon('M8 19 12 12h13l6 7 3 3v6h-4M14 28H8v-6l2-3h10l4 3h8'),
      shape: 'octane',
    },
    {
      id: 'dominus', name: 'Dominus', tag: 'LONG NOSE / POWER', accent: '#39c0ff',
      blurb: 'A low, long-nosed striker built for absurd ball control.',
      desc: 'Reach and power at the cost of a little agility.',
      mods: { speed: 1.25, accel: 0.1, handling: -0.25, power: 0.95, jump: -0.15, boost: 0.15 },
      weight: 1.08,
      dims: { length: 4.9, width: 1.9, height: 0.63, cabin: 0.52, cabinZ: 0.18, nose: 1.15, wheel: 0.5, wheelZ: 1.5 },
      icon: carIcon('M6 20 11 11h15l8 8 2 4v5h-4M13 28H6v-5l3-3h12l5 3h10'),
      shape: 'dominus',
    },
    {
      id: 'merc', name: 'Merc', tag: 'HEAVY / IMPACT', accent: '#ffd05c',
      blurb: 'A rolling wrecking ball. Hits like a freight train.',
      desc: 'Massive hit power and a huge boost tank, but turns like a barge.',
      mods: { speed: -0.15, accel: 0.15, handling: -0.85, power: 1.6, jump: -0.45, boost: 0.55 },
      weight: 1.32,
      dims: { length: 4.4, width: 2.12, height: 0.86, cabin: 0.72, cabinZ: 0.05, nose: 0.7, wheel: 0.58, wheelZ: 1.3 },
      icon: carIcon('M5 21l3-8h20l6 6 3 4v6h-5M13 29H5v-8h16l5 4h11'),
      shape: 'merc',
    },
    {
      id: 'wasp', name: 'Wasp', tag: 'LIGHT / AGILE', accent: '#ff4fd8',
      blurb: 'Featherweight chassis that dances through every challenge.',
      desc: 'Explosive acceleration and razor handling. Fragile in a 50/50.',
      mods: { speed: 0.05, accel: 1.15, handling: 1.35, power: -0.85, jump: 0.65, boost: -0.35 },
      weight: 0.82,
      dims: { length: 4.0, width: 1.82, height: 0.56, cabin: 0.48, cabinZ: 0.2, nose: 0.72, wheel: 0.48, wheelZ: 1.22 },
      icon: carIcon('M8 20l5-7h12l7 7 2 3v5h-4M14 28H8v-5l3-3h9l4 3h9'),
      shape: 'wasp',
    },
    {
      id: 'mantis', name: 'Mantis', tag: 'WIDE / STABLE', accent: '#a8ff5e',
      blurb: 'A flat, wide platform with unshakeable ground game.',
      desc: 'Stable cornering and a broad hitbox. Slightly clumsy in the air.',
      mods: { speed: 0.7, accel: 0.3, handling: 0.25, power: 0.35, jump: -0.2, boost: 0.2 },
      weight: 1.12,
      dims: { length: 4.55, width: 2.18, height: 0.52, cabin: 0.42, cabinZ: 0.12, nose: 0.9, wheel: 0.5, wheelZ: 1.42 },
      icon: carIcon('M5 21l4-6h22l5 6 2 4v4h-4M12 29H5v-4l3-4h14l5 4h10'),
      shape: 'mantis',
    },
  ],
  wheels: [
    {
      id: 'apex', name: 'Apex', tag: 'GRIP / CONTROL', accent: '#46e7ff',
      blurb: 'Precision forged rims with a balanced contact patch.',
      desc: 'More grip and a cleaner launch. A safe, fast all-rounder.',
      mods: { speed: -0.1, accel: 0.25, handling: 0.65, power: 0, jump: 0.15, boost: 0.05 },
      rim: '#38dfff', radius: 1.0,
      icon: wheelIcon('<path d="M20 7v7M20 26v7M7 20h7M26 20h7M11 11l5 5M24 24l5 5M29 11l-5 5M16 24l-5 5" opacity=".7"/>'),
    },
    {
      id: 'cristiano', name: 'Cristiano', tag: 'MAX CORNERING', accent: '#e6f3ff',
      blurb: 'The classic. Maximum lateral bite for aggressive lines.',
      desc: 'Best-in-class handling, at a slight cost to top-end speed.',
      mods: { speed: -0.4, accel: 0.35, handling: 1.0, power: -0.15, jump: 0.05, boost: 0.05 },
      rim: '#eaf9ff', radius: 1.02,
      icon: wheelIcon('<path d="M20 8v24M8 20h24M11 11l18 18M29 11 11 29" opacity=".65"/><circle cx="20" cy="20" r="7" opacity=".5"/>'),
    },
    {
      id: 'dieci', name: 'Dieci', tag: 'ROLLING SPEED', accent: '#ffcf6a',
      blurb: 'Lightweight street wheels that keep the top end alive.',
      desc: 'Top speed and acceleration. Less bite when you throw it sideways.',
      mods: { speed: 0.75, accel: 0.45, handling: -0.45, power: 0.1, jump: -0.15, boost: 0.05 },
      rim: '#ffbe42', radius: 0.97,
      icon: wheelIcon('<circle cx="20" cy="20" r="8"/><path d="M20 5v9M20 26v9M5 20h9M26 20h9" opacity=".7"/>'),
    },
    {
      id: 'zomba', name: 'Zomba', tag: 'LAUNCH / IMPACT', accent: '#ff7a46',
      blurb: 'Forged for punts. Extra spring on jumps and heavy contacts.',
      desc: 'More hit power and jump height, slightly less grip.',
      mods: { speed: 0.2, accel: -0.15, handling: -0.25, power: 0.65, jump: 0.4, boost: 0 },
      rim: '#ff8250', radius: 1.01,
      icon: wheelIcon('<path d="M20 6v8l5 5M20 34v-8l-5-5M6 20h8l5-5M34 20h-8l-5 5" opacity=".8"/><circle cx="20" cy="20" r="4"/>'),
    },
    {
      id: 'infinium', name: 'Infinium', tag: 'AIR CONTROL', accent: '#b78bff',
      blurb: 'Hover-forged wheels that feel at home upside down.',
      desc: 'Huge jump and air authority. Trades away some raw punch.',
      mods: { speed: -0.2, accel: 0.05, handling: 0.2, power: -0.35, jump: 0.85, boost: 0.2 },
      rim: '#b085ff', radius: 1.03,
      icon: wheelIcon('<circle cx="20" cy="20" r="7"/><path d="M20 4v7M20 29v7M4 20h7M29 20h7M8 8l6 6M26 26l6 6M32 8l-6 6M14 26l-6 6" opacity=".65"/>'),
    },
  ],
  boost: [
    {
      id: 'standard', name: 'Standard Core', tag: '100 / NO REGEN', accent: '#ff9b3d',
      blurb: 'Reliable orange fire. Balanced capacity and thrust.',
      desc: 'The benchmark. 100 boost, clean burn, no surprises.',
      mods: { speed: 0.2, accel: 0.3, handling: 0, power: 0, jump: 0, boost: 0.55 },
      capacity: 100, thrust: 1.0, regen: 0, drain: 33, flame: '#ff7a1a', flame2: '#ffe6a8', core: '#ffb25b',
      icon: boostIcon('M20 33c6 0 9-4 9-9 0-7-6-11-6-17 0 0-2 5-5 8-1-3-3-5-3-5 0 7-7 9-7 14 0 5 4 9 12 9z'),
    },
    {
      id: 'flamethrower', name: 'Flamethrower', tag: '80 / HIGH THRUST', accent: '#ff4a2a',
      blurb: 'Burns hot and fast. Ferocious thrust, tiny tank.',
      desc: 'The hardest acceleration in the game, but you will run dry.',
      mods: { speed: 0.75, accel: 0.55, handling: -0.2, power: 0.25, jump: -0.1, boost: 0.05 },
      capacity: 80, thrust: 1.2, regen: 0, drain: 36, flame: '#ff2b00', flame2: '#ffd04a', core: '#ff6b22',
      icon: boostIcon('M20 34c7 0 10-5 10-10 0-6-5-12-6-18 0 0-3 6-7 9-2-2-4-5-4-5 0 9-8 10-8 17 0 5 6 7 15 7z'),
    },
    {
      id: 'plasma', name: 'Plasma Coil', tag: '130 / BIG TANK', accent: '#36e7ff',
      blurb: 'A dense plasma reserve. Fly for days on a single tank.',
      desc: 'Massive capacity, softer thrust. Built for aerial pressure.',
      mods: { speed: 0.25, accel: 0.15, handling: 0.1, power: -0.25, jump: 0.05, boost: 1.2 },
      capacity: 130, thrust: 0.94, regen: 0, drain: 31, flame: '#1b9cff', flame2: '#b6fdff', core: '#54eaff',
      icon: boostIcon('M20 33c5 0 8-3 8-8 0-4-3-7-3-10 0-4 2-6 2-6-3 3-6 5-7 8-1-3-2-6-2-6-1 7-6 10-6 14 0 5 3 8 8 8z'),
    },
    {
      id: 'ion', name: 'Ion Stream', tag: '105 / REGEN 4.5/s', accent: '#9dff6a',
      blurb: 'A self-charging ion stream. Never fully out of options.',
      desc: 'Moderate tank that regenerates while you are not boosting.',
      mods: { speed: -0.1, accel: 0.45, handling: 0.25, power: -0.1, jump: 0.1, boost: 0.8 },
      capacity: 105, thrust: 1.0, regen: 4.5, drain: 32, flame: '#5cff5c', flame2: '#e2ffb5', core: '#a6ff5e',
      icon: boostIcon('M20 34c4 0 7-3 7-7 0-3-2-5-2-8 0-3 1-5 1-5-2 2-4 4-5 7-1-2-2-5-2-5 0 7-5 8-5 11 0 4 3 7 6 7z'),
    },
    {
      id: 'hypernova', name: 'Hypernova', tag: '90 / MAX SPEED', accent: '#ff3d81',
      blurb: 'Weaponized starlight. Highest top-end and launch thrust.',
      desc: 'Speed above everything. Demands perfect boost management.',
      mods: { speed: 1.05, accel: 0.2, handling: -0.25, power: 0.5, jump: -0.3, boost: -0.2 },
      capacity: 90, thrust: 1.32, regen: 0, drain: 38, flame: '#ff2d83', flame2: '#ffd3f4', core: '#ff5ca2',
      icon: boostIcon('M20 35c8 0 11-5 11-11 0-5-4-9-5-14-2 3-4 5-6 8-1-4-4-7-4-7 0 8-9 9-9 16 0 5 4 8 13 8z'),
    },
  ],
  topper: [
    {
      id: 'none', name: 'Clean Roof', tag: 'NO TOPPER', accent: '#7d97a8',
      blurb: 'Nothing but paint. Pure, unmodified physics.',
      desc: 'No stat changes. The purist choice.',
      mods: { speed: 0, accel: 0, handling: 0, power: 0, jump: 0, boost: 0 },
      icon: topperIcon('<path d="M9 27h22M13 22h14M17 17h6" opacity=".8"/><path d="M6 31h28" opacity=".35"/>'),
    },
    {
      id: 'halo', name: 'Aero Halo', tag: 'AIR CONTROL', accent: '#ffe066',
      blurb: 'A stable gyro ring that tightens your aerial control.',
      desc: 'More jump and handling. A tiny amount of punch is sacrificed.',
      mods: { speed: 0, accel: 0, handling: 0.25, power: -0.2, jump: 0.55, boost: 0.1 },
      icon: topperIcon('<ellipse cx="20" cy="24" rx="12" ry="4.5"/><path d="M20 8v4M14 12l2 4M26 12l-2 4" opacity=".65"/>'),
    },
    {
      id: 'mohawk', name: 'Mohawk', tag: 'TOP-END SPEED', accent: '#ff7a3d',
      blurb: 'A blade of pure attitude. Slices the air at speed.',
      desc: 'Top speed and power. Adds a little drag in the turns.',
      mods: { speed: 0.65, accel: 0.2, handling: -0.15, power: 0.25, jump: -0.1, boost: 0 },
      icon: topperIcon('<path d="M9 29h22M12 25l8-13 2 13 5-10 3 10"/><path d="M8 33h25" opacity=".35"/>'),
    },
    {
      id: 'propeller', name: 'Propeller', tag: 'LIGHT / JUMP', accent: '#5ce6ff',
      blurb: 'A spinning lift prop that shaves weight and boosts jumps.',
      desc: 'Extra jump height and acceleration. Less raw hit power.',
      mods: { speed: -0.2, accel: 0.25, handling: 0.15, power: -0.35, jump: 0.75, boost: 0.2 },
      icon: topperIcon('<path d="M20 13v7"/><path d="M20 11c-6 0-9 2-9 4s5 2 9-2c4 4 9 2 9-2s-9-2-9 0z"/><circle cx="20" cy="24" r="2"/>'),
    },
    {
      id: 'crown', name: 'Ion Crown', tag: 'POWER / BOOST', accent: '#ffc23d',
      blurb: 'A crown forged from dead boost pads. Heavy is the head.',
      desc: 'Big power and boost. Handles like it is wearing jewelry.',
      mods: { speed: 0.2, accel: -0.15, handling: -0.5, power: 0.7, jump: -0.15, boost: 0.35 },
      icon: topperIcon('<path d="M8 27h24l-2-14-6 6-4-9-4 9-6-6z"/><path d="M8 31h24" opacity=".35"/>'),
    },
    {
      id: 'satellite', name: 'Sat-Net', tag: 'BOOST EFFICIENCY', accent: '#9cffc1',
      blurb: 'A tiny orbital dish that finds every drop of boost.',
      desc: 'More boost and handling. Slightly less jump authority.',
      mods: { speed: -0.1, accel: 0.1, handling: 0.3, power: -0.1, jump: -0.2, boost: 0.75 },
      icon: topperIcon('<circle cx="20" cy="14" r="5"/><path d="M20 19v10M13 33c4-4 10-4 14 0M8 11l3 3M32 11l-3 3"/>'),
    },
  ],
};

export const DEFAULT_SELECTION = { body: 'octane', wheels: 'apex', boost: 'standard', topper: 'halo' };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function itemById(category, id) {
  return ITEMS[category].find((item) => item.id === id) || ITEMS[category][0];
}

export function computeBuild(selection = DEFAULT_SELECTION) {
  const chosen = {};
  const totals = Object.fromEntries(STAT_KEYS.map((key) => [key, 5]));
  for (const category of CATEGORIES) {
    const item = itemById(category.id, selection[category.id]);
    chosen[category.id] = item;
    for (const key of STAT_KEYS) totals[key] += item.mods[key] || 0;
  }
  for (const key of STAT_KEYS) totals[key] = Math.round(clamp(totals[key], 1, 10) * 10) / 10;

  const body = chosen.body;
  const boost = chosen.boost;
  const wheels = chosen.wheels;
  const topper = chosen.topper;

  const physics = {
    maxSpeed: 23.5 + totals.speed * 1.95,
    accel: 23 + totals.accel * 2.75,
    steerRate: 2.05 + totals.handling * 0.185,
    grip: 4.4 + totals.handling * 0.6,
    jumpSpeed: 9.4 + totals.jump * 0.92,
    hitPower: 0.7 + totals.power * 0.085,
    weight: body.weight,
    capacity: boost.capacity,
    thrust: boost.thrust,
    regen: boost.regen,
    drain: boost.drain,
    wheelRadius: wheels.radius,
    wheelGrip: wheels.radius,
    dims: body.dims,
  };

  const top = STAT_KEYS.reduce((a, key) => (totals[key] > totals[a] ? key : a), 'speed');
  const worst = STAT_KEYS.reduce((a, key) => (totals[key] < totals[a] ? key : a), 'speed');
  let archetype = 'ALL-ROUNDER';
  if (totals.speed - 5 > 1.3) archetype = 'SPEED DEMON';
  if (totals.power - 5 > 1.2) archetype = 'HEAVY HITTER';
  if (totals.handling - 5 > 1.3) archetype = 'TECHNICIAN';
  if (totals.jump - 5 > 1.3) archetype = 'AERIAL ACE';
  if (Math.max(...STAT_KEYS.map((key) => totals[key])) - Math.min(...STAT_KEYS.map((key) => totals[key])) > 5.5) archetype = 'GLASS CANNON';

  return { selection: { ...selection }, chosen, totals, physics, archetype, top, worst };
}

export function modChips(item) {
  const entries = STAT_KEYS
    .filter((key) => Math.abs(item.mods[key]) >= 0.15)
    .map((key) => ({ key, value: item.mods[key] }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const chips = entries.slice(0, 3).map(({ key, value }) => ({
    text: `${STAT_LABELS[key].replace('TOP ', '')} ${value > 0 ? '+' : ''}${value.toFixed(1)}`,
    negative: value < 0,
  }));
  if (item.capacity) {
    chips.push({ text: `${item.capacity} CAP`, negative: false });
    if (item.regen) chips.push({ text: `+${item.regen}/S`, negative: false });
  }
  return chips.slice(0, 3);
}

export function tradeoffText(build) {
  const positives = STAT_KEYS.filter((key) => build.totals[key] >= 6.3)
    .sort((a, b) => build.totals[b] - build.totals[a]);
  const negatives = STAT_KEYS.filter((key) => build.totals[key] <= 4.4)
    .sort((a, b) => build.totals[a] - build.totals[b]);
  const pos = positives.slice(0, 2).map((key) => `<b>${STAT_LABELS[key]}</b>`).join(' + ');
  const neg = negatives.slice(0, 2).map((key) => `<i>${STAT_LABELS[key]}</i>`).join(' / ');
  if (!pos && !neg) return 'A perfectly neutral build. Your driving decides everything.';
  if (!neg) return `Built for ${pos}. No meaningful weaknesses.`;
  if (!pos) return `A specialist build. Watch the ${neg}.`;
  return `Strong ${pos}. Gives up ${neg}.`;
}

export function loadSelection() {
  try {
    const raw = JSON.parse(localStorage.getItem('neon-strikers-loadout') || 'null');
    if (!raw) return { ...DEFAULT_SELECTION };
    const clean = {};
    for (const category of CATEGORIES) {
      const valid = ITEMS[category.id].some((item) => item.id === raw[category.id]);
      clean[category.id] = valid ? raw[category.id] : DEFAULT_SELECTION[category.id];
    }
    return clean;
  } catch {
    return { ...DEFAULT_SELECTION };
  }
}

export function saveSelection(selection) {
  try { localStorage.setItem('neon-strikers-loadout', JSON.stringify(selection)); } catch { /* private mode */ }
}
