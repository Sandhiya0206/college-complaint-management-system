const CATEGORY_KEYWORD_MAP = {
  'Electrical': [
    'switch', 'outlet', 'socket', 'wire', 'cable', 'bulb', 'lamp', 'electricity', 'circuit',
    'fuse', 'plug', 'power', 'light', 'electric', 'wiring', 'voltage', 'transformer',
    'power strip', 'extension cord', 'spotlight', 'torch', 'flashlight', 'chandelier',
    'ceiling fixture', 'fluorescent', 'tube light', 'led', 'incandescent', 'halogen',
    'electric meter', 'surge protector', 'wall socket', 'light switch', 'dimmer',
    'electrical panel', 'junction box', 'conduit', 'generator', 'flickering', 'short circuit',
    'tripped', 'mcb', 'switchboard', 'broken light', 'no power'
  ],
  'Plumbing': [
    'pipe', 'faucet', 'tap', 'sink', 'toilet', 'drain', 'shower', 'water', 'leak', 'leaking',
    'basin', 'flush', 'sewage', 'overflow', 'valve', 'pump', 'geyser', 'blockage', 'clog',
    'dripping', 'burst', 'waterlogged', 'puddle', 'seepage',
    'bathroom sink', 'bathtub', 'water faucet', 'plunger', 'water hose', 'pipe wrench',
    'water bucket', 'water tank', 'water pump', 'cistern', 'urinal', 'bidet',
    'radiator', 'water heater', 'boiler', 'gutter', 'manhole'
  ],
  'Furniture': [
    'chair', 'table', 'desk', 'bed', 'cabinet', 'shelf', 'sofa', 'stool', 'drawer',
    'cupboard', 'bench', 'wardrobe', 'locker', 'rack', 'broken chair', 'broken table',
    'damaged furniture', 'door', 'window', 'hinge', 'knob', 'handle',
    'folding chair', 'armchair', 'office chair', 'bar stool', 'bookshelf', 'bookcase',
    'filing cabinet', 'study desk', 'writing table', 'dining table', 'coffee table',
    'bunk bed', 'mattress', 'curtain', 'blind', 'whiteboard', 'blackboard', 'chalkboard'
  ],
  'Cleanliness': [
    'trash', 'garbage', 'dirt', 'stain', 'mess', 'waste', 'filth', 'dust', 'mold', 'mildew',
    'spill', 'dirty', 'litter', 'odor', 'smell', 'graffiti', 'rat', 'cockroach', 'insect',
    'pest', 'rodent', 'cobweb', 'algae', 'muddy',
    'garbage truck', 'trash can', 'waste bin', 'dustbin', 'rubbish', 'compost',
    'broom', 'mop', 'cleaning supplies', 'detergent', 'debris', 'overflowing bin'
  ],
  'AC/Ventilation': [
    'fan', 'air conditioner', 'vent', 'duct', 'hvac', 'cooling', 'heater', 'exhaust',
    'ac', 'blower', 'aircon', 'split ac', 'window ac', 'hot', 'stuffy',
    'no cooling', 'not cooling', 'loud noise', 'dripping ac',
    'ceiling fan', 'pedestal fan', 'table fan', 'electric fan', 'oscillating fan',
    'wall fan', 'exhaust fan', 'air handler', 'vent cover', 'grille', 'louver',
    'humidifier', 'dehumidifier', 'space heater', 'portable ac', 'thermostat'
  ],
  'Internet/WiFi': [
    'router', 'ethernet', 'modem', 'network', 'wifi', 'wi-fi', 'antenna', 'internet',
    'connection', 'broadband', 'lan', 'signal', 'no internet', 'slow internet',
    'disconnected', 'network cable', 'port',
    'wireless router', 'network switch', 'network hub', 'ethernet cable', 'rj45',
    'patch panel', 'server rack', 'access point', 'repeater', 'fiber optic', 'data port'
  ],
  'Infrastructure': [
    'wall', 'ceiling', 'floor', 'crack', 'roof', 'pillar', 'step', 'staircase', 'ramp',
    'paint', 'plaster', 'concrete', 'structure', 'building', 'broken floor', 'leaking roof',
    'damaged wall', 'pothole', 'broken step', 'railing', 'gate damage',
    'tile', 'brick', 'stone wall', 'marble floor', 'granite', 'plywood', 'scaffold',
    'window frame', 'door frame', 'stairwell', 'corridor', 'hallway', 'balcony',
    'terrace', 'basement', 'parking', 'road', 'pavement', 'pathway'
  ],
  'Security': [
    'lock', 'gate', 'cctv', 'camera', 'key', 'chain', 'bolt', 'handle', 'guard',
    'security', 'surveillance', 'access', 'entry', 'broken lock', 'missing lock',
    'open gate', 'unauthorized', 'theft', 'intrusion',
    'padlock', 'deadbolt', 'door lock', 'security camera', 'surveillance camera',
    'biometric', 'fingerprint scanner', 'access card', 'barrier',
    'barbed wire', 'fence', 'grille door', 'shutter', 'intercom', 'doorbell'
  ]
};

const PRIORITY_RULES = {
  High: ['Electrical', 'Plumbing', 'Security'],
  Medium: ['AC/Ventilation', 'Internet/WiFi', 'Infrastructure'],
  Low: ['Cleanliness', 'Furniture', 'Other']
};

const CATEGORY_ICONS = {
  'Electrical': '⚡',
  'Plumbing': '🔧',
  'Furniture': '🪑',
  'Cleanliness': '🧹',
  'AC/Ventilation': '❄️',
  'Internet/WiFi': '📶',
  'Infrastructure': '🏗️',
  'Security': '🔒',
  'Other': '📋'
};

const CATEGORY_LIST = [...Object.keys(CATEGORY_KEYWORD_MAP), 'Other'];

// Explicit YOLO object -> campus category map for backend detector fusion.
const YOLO_OBJECT_CATEGORY_MAP = {
  chair: 'Furniture',
  desk: 'Furniture',
  table: 'Furniture',
  bed: 'Furniture',
  cabinet: 'Furniture',
  shelf: 'Furniture',
  drawer: 'Furniture',
  sink: 'Plumbing',
  pipe: 'Plumbing',
  faucet: 'Plumbing',
  tap: 'Plumbing',
  shower: 'Plumbing',
  toilet: 'Plumbing',
  urinal: 'Plumbing',
  drain: 'Plumbing',
  valve: 'Plumbing',
  pump: 'Plumbing',
  leak: 'Plumbing',
  water: 'Plumbing',
  fan: 'AC/Ventilation',
  vent: 'AC/Ventilation',
  duct: 'AC/Ventilation',
  airconditioner: 'AC/Ventilation',
  air_conditioner: 'AC/Ventilation',
  ac: 'AC/Ventilation',
  router: 'Internet/WiFi',
  modem: 'Internet/WiFi',
  switch: 'Internet/WiFi',
  ethernet: 'Internet/WiFi',
  laptop: 'Internet/WiFi',
  computer: 'Internet/WiFi',
  monitor: 'Internet/WiFi',
  trash: 'Cleanliness',
  garbage: 'Cleanliness',
  dustbin: 'Cleanliness',
  litter: 'Cleanliness',
  broom: 'Cleanliness',
  mop: 'Cleanliness',
  person: 'Security',
  lock: 'Security',
  gate: 'Security',
  cctv: 'Security',
  camera: 'Security',
  barrier: 'Security',
  fence: 'Security',
  crack: 'Infrastructure',
  wall: 'Infrastructure',
  ceiling: 'Infrastructure',
  floor: 'Infrastructure',
  roof: 'Infrastructure',
  stairs: 'Infrastructure',
  staircase: 'Infrastructure',
  railing: 'Infrastructure',
  pothole: 'Infrastructure',
  tile: 'Infrastructure',
  brick: 'Infrastructure',
  wire: 'Electrical',
  cable: 'Electrical',
  bulb: 'Electrical',
  lamp: 'Electrical',
  switchboard: 'Electrical',
  socket: 'Electrical',
  outlet: 'Electrical',
  transformer: 'Electrical',
  panel: 'Electrical'
};

const clamp01 = (value, fallback = 0) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(1, num));
};

const normalizeLabel = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ');

const normalizeIncomingLabels = (labels = []) => labels
  .map((item) => {
    const label = normalizeLabel(item?.label || item?.description || item?.name || item);
    if (!label) return null;
    return {
      label,
      confidence: clamp01(item?.confidence ?? item?.score ?? item?.probability, 0.5)
    };
  })
  .filter(Boolean);

const toRankedOutput = (scores, source) => {
  const ranked = Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a);

  if (ranked.length === 0) {
    return {
      category: 'Other',
      confidence: 0.25,
      topCategories: [{ category: 'Other', confidence: 0.25, source }]
    };
  }

  const [topCategory, topScore] = ranked[0];
  const totalScore = ranked.reduce((sum, [, score]) => sum + score, 0) || 1;
  const dominance = topScore / totalScore;
  const strength = Math.min(1, topScore / 1.5);
  const confidence = Math.max(0.25, Math.min(0.96, dominance * 0.65 + strength * 0.35));

  const topCategories = ranked.slice(0, 3).map(([category, score]) => ({
    category,
    confidence: clamp01(score / totalScore, 0),
    score: Number(score.toFixed(4)),
    source
  }));

  return {
    category: topCategory,
    confidence,
    topCategories
  };
};

const mapLabelsToCategory = (labels) => {
  const normalizedLabels = normalizeIncomingLabels(labels);
  if (normalizedLabels.length === 0) {
    return {
      category: 'Other',
      confidence: 0.2,
      topCategories: [{ category: 'Other', confidence: 0.2, source: 'labels' }]
    };
  }

  const scores = Object.fromEntries(CATEGORY_LIST.map((category) => [category, 0]));

  normalizedLabels.forEach(({ label, confidence }) => {
    let matched = false;

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORD_MAP)) {
      const isHit = keywords.some((keyword) => label.includes(keyword) || keyword.includes(label));
      if (!isHit) continue;

      const exactBoost = keywords.includes(label) ? 1.25 : 1;
      scores[category] += confidence * exactBoost;
      matched = true;
    }

    if (!matched) {
      scores.Other += confidence * 0.25;
    }
  });

  return toRankedOutput(scores, 'labels');
};

const calculatePriorityFromCategory = (category, confidence = 1) => {
  let priority = 'Medium';
  if (PRIORITY_RULES.High.includes(category)) priority = 'High';
  else if (PRIORITY_RULES.Low.includes(category)) priority = 'Low';

  // Downgrade if confidence too low
  if (confidence < 0.5 && priority === 'High') {
    priority = 'Medium';
  }
  return priority;
};

const mapYoloObjectsToCategory = (detections = []) => {
  if (!Array.isArray(detections) || detections.length === 0) {
    return {
      category: 'Other',
      confidence: 0.15,
      topCategories: [{ category: 'Other', confidence: 0.15, source: 'yolo' }],
      dominantObjects: []
    };
  }

  const scores = Object.fromEntries(CATEGORY_LIST.map((category) => [category, 0]));
  const evidenceByCategory = Object.fromEntries(CATEGORY_LIST.map((category) => [category, []]));

  detections.forEach((det) => {
    const labelText = normalizeLabel(det?.label || det?.name || det?.class);
    if (!labelText) return;

    const confidence = clamp01(det?.confidence ?? det?.score ?? det?.probability, 0.5);
    let matched = false;

    for (const [keyword, category] of Object.entries(YOLO_OBJECT_CATEGORY_MAP)) {
      const normalizedKeyword = normalizeLabel(keyword);
      const isExact = labelText === normalizedKeyword;
      const isHit = isExact || labelText.includes(normalizedKeyword) || normalizedKeyword.includes(labelText);

      if (isHit) {
        const semanticBoost = isExact ? 1.35 : 1;
        const weightedScore = confidence * semanticBoost;
        scores[category] += weightedScore;
        evidenceByCategory[category].push({
          label: labelText,
          confidence,
          weightedScore: Number(weightedScore.toFixed(4))
        });
        matched = true;
      }
    }

    if (!matched) {
      scores.Other += confidence * 0.2;
      evidenceByCategory.Other.push({
        label: labelText,
        confidence,
        weightedScore: Number((confidence * 0.2).toFixed(4))
      });
    }
  });

  const rankedResult = toRankedOutput(scores, 'yolo');
  const dominantObjects = (evidenceByCategory[rankedResult.category] || [])
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, 5);

  return {
    ...rankedResult,
    dominantObjects
  };
};

module.exports = {
  CATEGORY_KEYWORD_MAP,
  PRIORITY_RULES,
  CATEGORY_ICONS,
  YOLO_OBJECT_CATEGORY_MAP,
  mapLabelsToCategory,
  calculatePriorityFromCategory,
  mapYoloObjectsToCategory
};
