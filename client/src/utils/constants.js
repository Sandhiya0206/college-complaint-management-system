// AI Category Keyword Map — includes MobileNet ImageNet class names + COCO-SSD + plain English
export const CATEGORY_KEYWORD_MAP = {
  Electrical: [
    // Plain English
    'switch', 'outlet', 'socket', 'wire', 'cable', 'bulb', 'lamp', 'electricity', 'circuit',
    'fuse', 'plug', 'power', 'light', 'electric', 'wiring', 'voltage', 'transformer', 'broken light',
    'flickering', 'short circuit', 'tripped', 'mcb', 'switchboard',
    // MobileNet ImageNet classes
    'power strip', 'extension cord', 'spotlight', 'torch', 'flashlight', 'chandelier',
    'ceiling fixture', 'fluorescent', 'tube light', 'led', 'incandescent', 'halogen',
    'electric meter', 'surge protector', 'wall socket', 'light switch', 'dimmer',
    'electrical panel', 'junction box', 'conduit', 'generator'
  ],
  Plumbing: [
    // Plain English
    'pipe', 'faucet', 'tap', 'sink', 'toilet', 'drain', 'shower', 'water', 'leak', 'leaking',
    'basin', 'flush', 'sewage', 'overflow', 'valve', 'pump', 'geyser', 'blockage', 'clog',
    'dripping', 'burst', 'waterlogged', 'puddle', 'seepage',
    // MobileNet ImageNet classes
    'bathroom sink', 'bathtub', 'water faucet', 'plunger', 'water hose', 'pipe wrench',
    'water bucket', 'water tank', 'water pump', 'cistern', 'urinal', 'bidet',
    'radiator', 'water heater', 'boiler', 'gutter', 'manhole'
  ],
  Furniture: [
    // Plain English
    'chair', 'table', 'desk', 'bed', 'cabinet', 'shelf', 'sofa', 'stool', 'drawer',
    'cupboard', 'bench', 'wardrobe', 'locker', 'rack', 'broken chair', 'broken table',
    'damaged furniture', 'door', 'window', 'hinge', 'knob', 'handle',
    // MobileNet ImageNet classes
    'folding chair', 'armchair', 'rocking chair', 'office chair', 'bar stool',
    'bookshelf', 'bookcase', 'filing cabinet', 'storage cabinet', 'credenza',
    'study desk', 'writing table', 'dining table', 'coffee table', 'side table',
    'bunk bed', 'single bed', 'mattress', 'pillow', 'curtain', 'blind', 'whiteboard',
    'blackboard', 'chalkboard', 'wooden', 'plastic chair', 'steel rack'
  ],
  Cleanliness: [
    // Plain English
    'trash', 'garbage', 'dirt', 'stain', 'mess', 'waste', 'filth', 'dust', 'mold', 'mildew',
    'spill', 'dirty', 'litter', 'odor', 'smell', 'graffiti', 'rat', 'cockroach', 'insect',
    'pest', 'rodent', 'cobweb', 'algae', 'muddy', 'clogged toilet',
    // MobileNet ImageNet classes
    'garbage truck', 'trash can', 'waste bin', 'dustbin', 'rubbish', 'compost',
    'broom', 'mop', 'cleaning supplies', 'detergent', 'bucket', 'sponge',
    'paper bag', 'plastic bag', 'cardboard', 'debris', 'sewage', 'overflowing bin'
  ],
  'AC/Ventilation': [
    // Plain English
    'fan', 'air conditioner', 'vent', 'duct', 'hvac', 'cooling', 'heater', 'exhaust',
    'ac', 'blower', 'ventilation', 'aircon', 'split ac', 'window ac', 'hot', 'stuffy',
    'no cooling', 'not cooling', 'loud noise', 'dripping ac',
    // MobileNet ImageNet classes
    'ceiling fan', 'pedestal fan', 'table fan', 'electric fan', 'oscillating fan',
    'wall fan', 'exhaust fan', 'air handler', 'vent cover', 'grille', 'louver',
    'humidifier', 'dehumidifier', 'space heater', 'portable ac', 'thermostat'
  ],
  'Internet/WiFi': [
    // Plain English
    'router', 'ethernet', 'modem', 'network', 'wifi', 'wi-fi', 'antenna', 'internet',
    'connection', 'broadband', 'lan', 'signal', 'no internet', 'slow internet',
    'disconnected', 'network cable', 'port', 'switch box',
    // MobileNet ImageNet classes
    'wireless router', 'network switch', 'network hub', 'ethernet cable', 'rj45',
    'patch panel', 'server rack', 'networking equipment', 'access point', 'repeater',
    'fiber optic', 'cat6', 'cat5', 'data port', 'telephone'
  ],
  Infrastructure: [
    // Plain English
    'wall', 'ceiling', 'floor', 'crack', 'roof', 'pillar', 'step', 'staircase', 'ramp',
    'paint', 'plaster', 'concrete', 'structure', 'building', 'broken floor', 'leaking roof',
    'damaged wall', 'pothole', 'broken step', 'railing', 'gate damage',
    // MobileNet ImageNet classes
    'construction', 'tile', 'brick', 'stone wall', 'marble floor', 'granite',
    'plywood', 'scaffold', 'ladder', 'hammer', 'drill', 'renovation',
    'window frame', 'door frame', 'stairwell', 'corridor', 'hallway', 'balcony',
    'terrace', 'basement', 'parking', 'road', 'pavement', 'pathway'
  ],
  Security: [
    // Plain English
    'lock', 'gate', 'cctv', 'camera', 'key', 'chain', 'bolt', 'handle', 'guard',
    'security', 'surveillance', 'access', 'entry', 'broken lock', 'missing lock',
    'open gate', 'unauthorized', 'theft', 'intrusion',
    // MobileNet ImageNet classes
    'padlock', 'deadbolt', 'door lock', 'security camera', 'surveillance camera',
    'biometric', 'fingerprint scanner', 'access card', 'id card', 'barrier',
    'barbed wire', 'fence', 'grille door', 'shutter', 'intercom', 'doorbell'
  ],
  Other: []
}

export const PRIORITY_RULES = {
  High: ['Electrical', 'Plumbing', 'Security'],
  Medium: ['AC/Ventilation', 'Internet/WiFi', 'Infrastructure'],
  Low: ['Cleanliness', 'Furniture', 'Other']
}

export const CATEGORY_ICONS = {
  Electrical: '⚡',
  Plumbing: '🔧',
  Furniture: '🪑',
  Cleanliness: '🧹',
  'AC/Ventilation': '❄️',
  'Internet/WiFi': '📶',
  Infrastructure: '🏗️',
  Security: '🔒',
  Other: '📋'
}

export const CATEGORIES = Object.keys(CATEGORY_KEYWORD_MAP)

export const STATUS_COLORS = {
  Submitted: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  Assigned: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  'In Progress': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  Resolved: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  Rejected: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' }
}

export const PRIORITY_COLORS = {
  High: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  Medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  Low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' }
}

export const SOCKET_EVENTS = {
  COMPLAINT_CREATED: 'complaint_created',
  COMPLAINT_ASSIGNED: 'complaint_assigned',
  STATUS_CHANGED: 'status_changed',
  COMPLAINT_RESOLVED: 'complaint_resolved',
  COMPLAINT_REJECTED: 'complaint_rejected',
  WORKER_REASSIGNED: 'worker_reassigned',
  NOTIFICATION_NEW: 'notification_new',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room'
}
