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

const mapLabelsToCategory = (labels) => {
  if (!labels || labels.length === 0) return { category: 'Other', confidence: 0.1 };

  const labelTexts = labels.map(l => (l.label || l.description || l).toLowerCase());
  const scores = {};

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORD_MAP)) {
    scores[category] = 0;
    for (const label of labelTexts) {
      for (const keyword of keywords) {
        if (label.includes(keyword)) {
          const matchScore = labels.find(l => (l.label || l.description || l).toLowerCase() === label);
          scores[category] += (matchScore?.confidence || matchScore?.score || 0.5);
        }
      }
    }
  }

  const sortedCategories = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .filter(([, score]) => score > 0);

  if (sortedCategories.length === 0) return { category: 'Other', confidence: 0.3 };

  const [topCategory, topScore] = sortedCategories[0];
  const normalizedConfidence = Math.min(topScore / 2, 0.95);

  return {
    category: topCategory,
    confidence: normalizedConfidence || 0.5
  };
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

module.exports = {
  CATEGORY_KEYWORD_MAP,
  PRIORITY_RULES,
  CATEGORY_ICONS,
  mapLabelsToCategory,
  calculatePriorityFromCategory
};
