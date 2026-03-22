/**
 * VCET Massive Mock Data Seeder
 * Velalar College of Engineering and Technology, Thindal, Erode
 *
 * Generates:
 *   - 1 Admin
 *   - 18 Workers (2 per maintenance dept)
 *   - 2,160 Students (9 depts × 4 batches × 60 students)
 *   - 800 Complaints (realistic spread over 2024–2026)
 *   - Feedback for Completed complaints
 *   - Notifications for key events
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { testConnection, syncDatabase } = require('../config/sequelize');

const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Category = require('../models/Category');
const Notification = require('../models/Notification');
const Feedback = require('../models/Feedback');

// ─────────────────────────────────────────────────────────────────────────────
// COLLEGE REFERENCE DATA
// ─────────────────────────────────────────────────────────────────────────────
const COLLEGE_CODE = '7329';
const BATCHES = [22, 23, 24, 25];
const DEPARTMENTS = [
  { name: 'Artificial Intelligence and Machine Learning', code: 'AMR', shortName: 'AIML' },
  { name: 'Computer Science and Engineering',             code: 'CSR', shortName: 'CSE'  },
  { name: 'Information Technology',                       code: 'ITR', shortName: 'IT'   },
  { name: 'Artificial Intelligence and Data Science',     code: 'ADR', shortName: 'AIDS' },
  { name: 'Biomedical Engineering',                       code: 'BMR', shortName: 'BME'  },
  { name: 'Mechatronics Engineering',                     code: 'MDR', shortName: 'MDE'  },
  { name: 'Mechanical Engineering',                       code: 'MER', shortName: 'Mech' },
  { name: 'Civil Engineering',                            code: 'CER', shortName: 'Civil'},
  { name: 'Electrical and Electronics Engineering',       code: 'EER', shortName: 'EEE'  },
];
const STUDENTS_PER_BATCH = 60;
const BUILDINGS = ['Main Block', 'L-Block', 'Civil Block', 'Girls Hostel', 'Boys Hostel'];

// ─────────────────────────────────────────────────────────────────────────────
// TAMIL NAMES
// ─────────────────────────────────────────────────────────────────────────────
const MALE_FIRST = [
  'Aarav',        'Adithya',    'Ajith',        'Aravind',    'Arjun',
  'Ashwin',       'Balaji',     'Bharath',       'Chandru',    'Dhanush',
  'Deepak',       'Dinesh',     'Ezhil',         'Ganesh',     'Gokul',
  'Gowtham',      'Hariharan',  'Harish',        'Ilavarasan', 'Jeevanandham',
  'Karthick',     'Karthikeyan','Kishore',        'Logesh',     'Lokesh',
  'Manikandan',   'Mohankumar', 'Murugesan',      'Naresh',     'Naveen',
  'Nithish',      'Palani',     'Prabhu',         'Prasanth',   'Praveen',
  'Prithivi',     'Rajesh',     'Ram',            'Ramesh',     'Saravanan',
  'Sathish',      'Siva',       'Sivakumar',      'Sudharsan',  'Surya',
  'Vignesh',      'Vijay',      'Vinoth',         'Yuvaraj',    'Anand',
  'Ashok',        'Balamurugan','Chandrasekaran', 'Dhanasekar', 'Esakki',
  'Guna',         'Hari',       'Ilayaraja',      'Jeyakumar',  'Kavin',
];

const FEMALE_FIRST = [
  'Abinaya',      'Anitha',     'Anjali',        'Aswini',     'Bhavani',
  'Deepa',        'Divya',      'Gayathri',       'Geetha',     'Gomathi',
  'Indhu',        'Janani',     'Jeevitha',       'Kalpana',    'Kavya',
  'Keerthana',    'Kavitha',    'Kokila',         'Lakshmi',    'Lavanya',
  'Logeshwari',   'Madhumitha', 'Meena',          'Nithya',     'Oviya',
  'Pavithra',     'Ponmalar',   'Pooja',           'Priya',      'Rajalakshmi',
  'Ramya',        'Renuga',     'Sangeetha',      'Saranya',    'Selvi',
  'Sindhu',       'Sowndarya',  'Suganya',        'Swetha',     'Tamizharasi',
  'Thenmozhi',    'Usha',       'Vanitha',        'Vasanthi',   'Vimala',
  'Yamuna',       'Haritha',    'Kalaiselvi',     'Nandhini',   'Priyadharshini',
  'Abarna',       'Akshaya',    'Amudha',         'Brindha',    'Chitra',
  'Devi',         'Elakkiya',   'Famitha',        'Hamsaveni',  'Iswarya',
];

const SURNAMES = [
  'Murugan',       'Rajendran',     'Krishnamurthy', 'Palanisamy',   'Govindarajan',
  'Annamalai',     'Subramanian',   'Selvam',        'Soundararajan','Raju',
  'Shanmugam',     'Periyasamy',    'Muthukumar',    'Arumugam',     'Natarajan',
  'Subramaniam',   'Velayutham',    'Durai',         'Marimuthu',    'Karuppasamy',
  'Pandi',         'Thiyagarajan',  'Venkatesan',    'Rathinam',     'Chandrasekaran',
  'Gunasekaran',   'Pandian',       'Ramasamy',      'Palaniswamy',  'Manickam',
  'Elumalai',      'Thiruvengadam', 'Srinivasan',    'Balasubramanian','Krishnan',
  'Sundaram',      'Muthu',         'Senthil',       'Kannan',       'Sivakumar',
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rInt  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const padZ  = (n, len) => String(n).padStart(len, '0');
const seqId = (prefix, year, n) => `${prefix}-${year}-${padZ(n, 4)}`;
const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const TOTAL_COMPLAINTS = parsePositiveInt(process.env.VCET_SEED_COMPLAINTS, 800);
const STUDENT_BATCH_SIZE = parsePositiveInt(process.env.VCET_STUDENT_BATCH_SIZE, 500);
const COMPLAINT_BATCH_SIZE = parsePositiveInt(process.env.VCET_COMPLAINT_BATCH_SIZE, 1000);

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────
const categories = [
  { name: 'Electrical',     description: 'Electrical issues: wiring, switches, outlets, lights, fans',  defaultPriority: 'High',   workerDepartment: 'Electrical',     keywords: ['switch','wire','bulb','socket','circuit','fan','tube light','power cut','sparking'], icon: '⚡' },
  { name: 'Plumbing',       description: 'Water and plumbing issues',                                   defaultPriority: 'High',   workerDepartment: 'Plumbing',       keywords: ['pipe','tap','leak','drain','water','toilet','flush','overflow','tank'],           icon: '🔧' },
  { name: 'Furniture',      description: 'Broken or damaged furniture and fixtures',                    defaultPriority: 'Low',    workerDepartment: 'Furniture',      keywords: ['chair','table','desk','bed','cabinet','bench','door','window','hinge'],           icon: '🪑' },
  { name: 'Cleanliness',    description: 'Hygiene, waste management and pest control',                  defaultPriority: 'Low',    workerDepartment: 'Cleanliness',    keywords: ['trash','garbage','dirt','stain','mold','pest','odour','dirty','mosquito'],        icon: '🧹' },
  { name: 'AC/Ventilation', description: 'Air conditioning, fans and ventilation',                      defaultPriority: 'Medium', workerDepartment: 'AC/Ventilation', keywords: ['ac','fan','vent','cooling','hot','humid','exhaust','air conditioner'],            icon: '❄️' },
  { name: 'Internet/WiFi',  description: 'Network, WiFi and connectivity issues',                       defaultPriority: 'Medium', workerDepartment: 'Internet/WiFi',  keywords: ['wifi','internet','router','network','cable','lan','slow','disconnect'],           icon: '📶' },
  { name: 'Infrastructure', description: 'Building structural and civil issues',                        defaultPriority: 'Medium', workerDepartment: 'Infrastructure', keywords: ['wall','ceiling','floor','crack','roof','plaster','tile','railing','seepage'],     icon: '🏗️' },
  { name: 'Security',       description: 'Security, locks, CCTV and fire safety',                      defaultPriority: 'High',   workerDepartment: 'Security',       keywords: ['lock','gate','cctv','key','door','camera','fire extinguisher','security'],        icon: '🔒' },
  { name: 'Other',          description: 'General campus issues',                                       defaultPriority: 'Medium', workerDepartment: 'General',        keywords: [],                                                                                  icon: '📋' },
];

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────
const ADMIN_USER = {
  name:   'Dr. Annamalai Krishnamurthy',
  email:  'admin@vcet.edu.in',
  role:   'admin',
  isActive: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// WORKERS (18 — 2 per maintenance dept)
// ─────────────────────────────────────────────────────────────────────────────
const WORKER_DATA = [
  { name: 'Rajasekaran Murugan',       email: 'electrical1@vcet.edu.in',  department: 'Electrical',     phone: '9842100001' },
  { name: 'Marimuthu Selvam',          email: 'electrical2@vcet.edu.in',  department: 'Electrical',     phone: '9842100002' },
  { name: 'Pandi Krishnan',            email: 'plumbing1@vcet.edu.in',    department: 'Plumbing',       phone: '9842100003' },
  { name: 'Elumalai Raju',             email: 'plumbing2@vcet.edu.in',    department: 'Plumbing',       phone: '9842100004' },
  { name: 'Sundarraj Natarajan',       email: 'furniture1@vcet.edu.in',   department: 'Furniture',      phone: '9842100005' },
  { name: 'Arumugam Durai',            email: 'furniture2@vcet.edu.in',   department: 'Furniture',      phone: '9842100006' },
  { name: 'Palanisamy Govindarajan',   email: 'cleaning1@vcet.edu.in',    department: 'Cleanliness',    phone: '9842100007' },
  { name: 'Karuppasamy Muthukumar',    email: 'cleaning2@vcet.edu.in',    department: 'Cleanliness',    phone: '9842100008' },
  { name: 'Sivakumar Periyasamy',      email: 'ac1@vcet.edu.in',          department: 'AC/Ventilation', phone: '9842100009' },
  { name: 'Shanmugam Annamalai',       email: 'ac2@vcet.edu.in',          department: 'AC/Ventilation', phone: '9842100010' },
  { name: 'Venkatesan Subramanian',    email: 'it1@vcet.edu.in',          department: 'Internet/WiFi',  phone: '9842100011' },
  { name: 'Naveen Soundararajan',      email: 'it2@vcet.edu.in',          department: 'Internet/WiFi',  phone: '9842100012' },
  { name: 'Gunasekaran Chandrasekaran',email: 'infra1@vcet.edu.in',       department: 'Infrastructure', phone: '9842100013' },
  { name: 'Velayutham Ramasamy',       email: 'infra2@vcet.edu.in',       department: 'Infrastructure', phone: '9842100014' },
  { name: 'Thiyagarajan Pandian',      email: 'security1@vcet.edu.in',    department: 'Security',       phone: '9842100015' },
  { name: 'Manickam Balasubramanian',  email: 'security2@vcet.edu.in',    department: 'Security',       phone: '9842100016' },
  { name: 'Senthilkumar Kannan',       email: 'general@vcet.edu.in',      department: 'General',        phone: '9842100017' },
  { name: 'Thiruvengadam Pandian',     email: 'general2@vcet.edu.in',     department: 'General',        phone: '9842100018' },
];

// Department → maintenance worker-department mapping
const DEPT_TO_WORKER_DEPT = {
  Electrical:     'Electrical',
  Plumbing:       'Plumbing',
  Furniture:      'Furniture',
  Cleanliness:    'Cleanliness',
  'AC/Ventilation': 'AC/Ventilation',
  'Internet/WiFi':  'Internet/WiFi',
  Infrastructure: 'Infrastructure',
  Security:       'Security',
  Other:          'General',
};

// ─────────────────────────────────────────────────────────────────────────────
// LOCATION POOLS (per building)
// ─────────────────────────────────────────────────────────────────────────────
const BUILDING_LOCATIONS = {
  'Main Block': [
    'CSE Department - Room 101', 'CSE Department - Room 102', 'CSE Department - Room 103',
    'CSE Department - Room 104', 'CSE Department - Room 105',
    'IT Department - Room 201',  'IT Department - Room 202',  'IT Department - Room 203',
    'AIML Department - Room 301','AIML Department - Room 302','AIML Department - Room 303',
    'AIDS Department - Room 304','AIDS Department - Room 305',
    'Main Block - Seminar Hall', 'Main Block - Conference Hall',
    'Main Block - Staff Room Floor 1','Main Block - Staff Room Floor 2',
    'Main Block - Library',      'Main Block - Reading Hall',
    'Main Block - Corridor Floor 1','Main Block - Corridor Floor 2','Main Block - Corridor Floor 3',
    'Main Block - Washroom Floor 1','Main Block - Washroom Floor 2','Main Block - Washroom Floor 3',
    'Main Block - Canteen',      'Main Block - Ground Floor Lobby',
    'Principal Office',          'Administration Block',
    'Main Block - Exam Hall',    'Main Block - Placement Cell',
    'Main Block - Xerox Centre', 'Main Block - Water Cooler Area',
  ],
  'L-Block': [
    'L-Block - Computer Lab 1',  'L-Block - Computer Lab 2',  'L-Block - Computer Lab 3',
    'L-Block - Computer Lab 4',  'L-Block - Drawing Hall',    'L-Block - Workshop',
    'EEE Department - Lab 1',    'EEE Department - Lab 2',    'EEE Department - Classroom 1',
    'EEE Department - Classroom 2',
    'Mech Department - Workshop','Mech Department - Lab 1',   'Mech Department - Classroom 1',
    'BME Department - Lab 1',    'BME Department - Classroom 1',
    'MDE Department - Lab 1',    'MDE Department - Classroom 1',
    'L-Block - Corridor Floor 1','L-Block - Corridor Floor 2','L-Block - Corridor Floor 3',
    'L-Block - Washroom Floor 1','L-Block - Washroom Floor 2',
    'L-Block - Server Room',     'L-Block - Electrical Panel Room',
    'L-Block - Seminar Hall',    'L-Block - Water Cooler Area',
  ],
  'Civil Block': [
    'Civil Department - Classroom 1','Civil Department - Classroom 2','Civil Department - Classroom 3',
    'Civil Department - Survey Lab',  'Civil Department - Concrete Lab',
    'Civil Department - CAD Lab',     'Civil Department - Geotechnical Lab',
    'Civil Block - Drawing Hall',     'Civil Block - Material Testing Lab',
    'Civil Block - Corridor Floor 1', 'Civil Block - Corridor Floor 2',
    'Civil Block - Washroom Floor 1', 'Civil Block - Washroom Floor 2',
    'Civil Block - Staff Room',       'Civil Block - Water Cooler Area',
    'Civil Block - Seminar Hall',
  ],
  'Girls Hostel': [
    'Girls Hostel - Room GH-101', 'Girls Hostel - Room GH-102', 'Girls Hostel - Room GH-103',
    'Girls Hostel - Room GH-104', 'Girls Hostel - Room GH-105',
    'Girls Hostel - Room GH-201', 'Girls Hostel - Room GH-202', 'Girls Hostel - Room GH-203',
    'Girls Hostel - Room GH-204', 'Girls Hostel - Room GH-205',
    'Girls Hostel - Room GH-301', 'Girls Hostel - Room GH-302', 'Girls Hostel - Room GH-303',
    'Girls Hostel - Room GH-304',
    'Girls Hostel - Room GH-401', 'Girls Hostel - Room GH-402', 'Girls Hostel - Room GH-403',
    'Girls Hostel - Bathroom Floor 1','Girls Hostel - Bathroom Floor 2',
    'Girls Hostel - Bathroom Floor 3','Girls Hostel - Bathroom Floor 4',
    'Girls Hostel - Common Room',    'Girls Hostel - Study Room',
    'Girls Hostel - Corridor Floor 1','Girls Hostel - Corridor Floor 2',
    'Girls Hostel - Corridor Floor 3',
    'Girls Hostel - Kitchen',        'Girls Hostel - Reception',
    'Girls Hostel - Rooftop Water Tank Area',
    'Girls Hostel - Dining Hall',    'Girls Hostel - Washing Area',
  ],
  'Boys Hostel': [
    'Boys Hostel - Room BH-101', 'Boys Hostel - Room BH-102', 'Boys Hostel - Room BH-103',
    'Boys Hostel - Room BH-104', 'Boys Hostel - Room BH-105',
    'Boys Hostel - Room BH-201', 'Boys Hostel - Room BH-202', 'Boys Hostel - Room BH-203',
    'Boys Hostel - Room BH-204', 'Boys Hostel - Room BH-205',
    'Boys Hostel - Room BH-301', 'Boys Hostel - Room BH-302', 'Boys Hostel - Room BH-303',
    'Boys Hostel - Room BH-304',
    'Boys Hostel - Room BH-401', 'Boys Hostel - Room BH-402', 'Boys Hostel - Room BH-403',
    'Boys Hostel - Bathroom Floor 1','Boys Hostel - Bathroom Floor 2',
    'Boys Hostel - Bathroom Floor 3','Boys Hostel - Bathroom Floor 4',
    'Boys Hostel - Common Room',    'Boys Hostel - Reading Room',
    'Boys Hostel - Corridor Floor 1','Boys Hostel - Corridor Floor 2',
    'Boys Hostel - Corridor Floor 3',
    'Boys Hostel - Kitchen',        'Boys Hostel - Reception',
    'Boys Hostel - Rooftop Water Tank Area',
    'Boys Hostel - Dining Hall',    'Boys Hostel - Washing Area',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPLAINT TEMPLATES  (title + description, {loc} and {days} replaced)
// ─────────────────────────────────────────────────────────────────────────────
const COMPLAINT_TEMPLATES = {
  Electrical: [
    { title: 'Tube light not working',      desc: 'The tube light at {loc} has been non-functional for {days} days. Students are unable to see properly during evenings and cloudy weather. Please arrange immediate replacement.' },
    { title: 'Power socket damaged',         desc: 'The electrical socket at {loc} is damaged and sparks when devices are plugged in. This is a serious safety hazard and must be repaired immediately.' },
    { title: 'Ceiling fan not working',      desc: 'The ceiling fan at {loc} has stopped working. Due to the extreme heat in Erode, studying and working in this area is very uncomfortable for all students.' },
    { title: 'Street light not functioning', desc: 'The street light near {loc} has been out for {days} days. Movement in the campus is unsafe after sunset, especially for hostel students returning from the study hall.' },
    { title: 'Main switchboard damaged',     desc: 'The main switchboard at {loc} shows exposed wires. This is a critical safety hazard affecting everyone in the building and requires urgent attention from the electrical team.' },
    { title: 'Electrical wiring exposed',    desc: 'Electrical wiring near {loc} is exposed and hanging loose from the wall. There is a direct risk of electric shock. I request immediate repair before an accident occurs.' },
    { title: 'Power fluctuation issue',      desc: 'Frequent power fluctuations have been observed at {loc} for the past {days} days. Lab equipment has been affected and ongoing project work is being disrupted repeatedly.' },
    { title: 'LED light flickering',         desc: 'The LED lights at {loc} have been flickering for {days} days. The constant flickering causes eye strain and headaches especially during long practical sessions.' },
    { title: 'Generator not starting',       desc: 'The backup generator for {loc} is not starting during power cuts. All work stops immediately when grid power fails, disrupting classes and lab sessions significantly.' },
    { title: 'Earthing issue in lab',        desc: 'Students in {loc} have been experiencing mild electric shocks from metal surfaces. There appears to be an earthing failure that needs immediate inspection by the electrical team.' },
  ],
  Plumbing: [
    { title: 'Water leaking from tap',       desc: 'The water tap at {loc} is continuously leaking and wasting water. The floor has become slippery and unhygienic. This has been going on for {days} days without repair.' },
    { title: 'Drain pipe blocked',           desc: 'The drain pipe at {loc} is completely blocked causing water stagnation and a terrible foul smell. The area near this drain is unusable. Immediate attention required.' },
    { title: 'No water supply',              desc: 'There has been no water supply at {loc} for {days} days. Daily sanitation activities have become extremely difficult, especially for hostel students who depend on this supply.' },
    { title: 'Toilet flush not working',     desc: 'The toilet flush mechanism at {loc} is broken. Despite multiple verbal complaints to the caretaker, no repair has been done. Please escalate this issue immediately.' },
    { title: 'Overhead tank overflowing',    desc: 'The overhead water tank near {loc} is overflowing and water is flowing down the walls, seeping into lower floors and causing building damage and water wastage.' },
    { title: 'Burst pipe in bathroom',       desc: 'A pipe has burst in the bathroom at {loc}. Water is uncontrollably flowing and the entire area has been flooded. Emergency repair is needed right away.' },
    { title: 'Multiple taps broken',         desc: 'More than {days} taps in the washroom at {loc} are broken and non-functional. With a large number of students sharing the facility, this has become a serious daily problem.' },
    { title: 'Drinking water cooler leaking',desc: 'The drinking water cooler at {loc} is leaking from its base. The water spillage is making the floor slippery. The cooler also makes a strange noise suggesting an internal fault.' },
    { title: 'Sewer line blocked',           desc: 'The sewer line near {loc} appears to be blocked. Raw sewage smell is spreading to the entire corridor. This is a major health and hygiene issue requiring urgent resolution.' },
    { title: 'Water supply pipe rusted',     desc: 'The water supply pipe at {loc} appears to be rusted and discoloured water is coming from some taps. Students are afraid to use this water for drinking or washing.' },
  ],
  Furniture: [
    { title: 'Classroom chairs broken',      desc: 'Several chairs in {loc} are broken with cracked or missing seat supports. Students risk injury while sitting. At least {days} chairs need immediate replacement.' },
    { title: 'Lab bench unstable',           desc: 'The lab bench at {loc} is unstable and wobbles during practical sessions. This is affecting the accuracy of experiments and also poses a safety risk for students.' },
    { title: 'Classroom door not closing',   desc: 'The door of {loc} does not close or latch properly. This causes constant noise from the corridor, disturbs lectures and is a security concern for the classroom.' },
    { title: 'Window glass broken',          desc: 'The window glass at {loc} is cracked and broken. During rain this allows water to enter and the sharp broken edges pose an injury risk to students sitting nearby.' },
    { title: 'Desks damaged in classroom',   desc: 'Multiple desks in {loc} have broken writing boards and unstable legs. This is not the first time this has been reported but the issue has not been permanently resolved.' },
    { title: 'Cupboard lock broken',         desc: 'The storage cupboard at {loc} has a broken lock and damaged hinges. Important materials, project components and personal belongings cannot be securely stored here.' },
    { title: 'Lab stools broken',            desc: 'The lab stools in {loc} are broken. One student already had a minor fall last week. Please arrange for safe seating replacements immediately to prevent further accidents.' },
    { title: 'Hostel bed frame broken',      desc: 'The bed frame in {loc} is completely broken. The student using it cannot sleep properly and risks further injury. Please replace or repair this on priority.' },
    { title: 'Blackboard damaged',           desc: 'The blackboard/whiteboard in {loc} is heavily scratched and damaged. Writing on it is not clearly visible even from the front row, affecting the quality of teaching.' },
    { title: 'Almirah door broken',          desc: 'The almirah/wardrobe door at {loc} is broken and will not stay shut. Personal belongings stored inside are not secure. This needs immediate carpentry repair.' },
  ],
  Cleanliness: [
    { title: 'Garbage not collected',        desc: 'Garbage near {loc} has been accumulating for {days} days without being cleared. The foul smell has become unbearable and is affecting the health of students nearby.' },
    { title: 'Washroom very dirty',          desc: 'The washroom at {loc} has not been cleaned for several days. The hygiene standard is unacceptable and the facility is nearly unusable. Urgent deep cleaning is required.' },
    { title: 'Stagnant water near building', desc: 'Stagnant water has collected near {loc} for {days} days which is breeding mosquitoes. This is a serious health hazard for students and staff in this area.' },
    { title: 'Pest infestation reported',    desc: 'Cockroaches and rodents have been spotted in {loc}. We request urgent pest control treatment to prevent food contamination and the spread of disease among students.' },
    { title: 'Canteen area unhygienic',      desc: 'The canteen near {loc} has food waste and dirty tables. The unhygienic conditions are a health risk for students who eat there regularly. Immediate cleaning required.' },
    { title: 'Foul smell from drain',        desc: 'A strong foul odour is coming from the drain near {loc}. It is disrupting classes and making the entire corridor unpleasant. Drain cleaning and deodorising is needed.' },
    { title: 'Dustbins overflowing',         desc: 'All dustbins near {loc} are overflowing as collection has been irregular for {days} days. Additional bins and a regular collection schedule are urgently needed.' },
    { title: 'Washroom floor slippery',      desc: 'The washroom floor at {loc} remains wet and slippery all day due to poor drainage. Two students have already slipped here. Proper drainage repair is urgently needed.' },
    { title: 'Biowaste not disposed properly',desc: 'Biowaste from the BME / science labs near {loc} is not being disposed of properly. This is a health and environmental compliance issue that needs immediate attention.' },
    { title: 'Cleaning schedule irregular',  desc: 'The cleaning schedule for {loc} appears to be very irregular. The area has not been properly swept or mopped in {days} days. Please ensure consistent daily cleaning.' },
  ],
  'AC/Ventilation': [
    { title: 'AC not working',               desc: 'The air conditioner in {loc} has stopped working. Erode summer temperature is extreme and without AC it is nearly impossible for students to concentrate during longer sessions.' },
    { title: 'AC leaking water',             desc: 'The air conditioner at {loc} is dripping water onto students during class. The floor underneath is wet and slippery. This needs both repair and immediate safety action.' },
    { title: 'AC making loud noise',         desc: 'The AC unit at {loc} produces a very loud grinding noise during operation that disrupts lectures and makes it impossible to hear the faculty or other students clearly.' },
    { title: 'Poor ventilation in lab',      desc: 'The ventilation in {loc} is extremely poor. With many computers and students, the room becomes dangerously hot and stuffy. A good exhaust or additional AC unit is urgently required.' },
    { title: 'Exhaust fan not working',      desc: 'The exhaust fan in the washroom at {loc} is non-functional. The absence of ventilation has made the washroom extremely humid, smelly and unpleasant to use.' },
    { title: 'AC cooling insufficient',      desc: 'The AC at {loc} is not cooling effectively for the room capacity. Despite running continuously all day, the indoor temperature remains very uncomfortable for students.' },
    { title: 'Fan making rattling noise',    desc: 'The ceiling fan at {loc} is making a loud rattling noise during operation. It is highly distracting during lectures, lab sessions and the recently held internal examinations.' },
    { title: 'AC remote control missing',    desc: 'The remote control for the AC at {loc} has gone missing. The AC cannot be adjusted to the correct temperature and is making the room too cold for most students.' },
    { title: 'AC compressor not starting',   desc: 'The AC in {loc} powers on but the compressor does not start so there is no cooling. The room temperature is very high and impacting student attendance and performance.' },
    { title: 'Ventilation grilles blocked',  desc: 'The ventilation grilles at {loc} are blocked with dust buildup reducing airflow significantly. This is affecting the AC efficiency and air quality in the room.' },
  ],
  'Internet/WiFi': [
    { title: 'WiFi not connecting',          desc: 'The college WiFi at {loc} has been down for {days} days. Students cannot access study materials, submit online assignments or attend online lectures. Urgent fix needed.' },
    { title: 'Internet speed very slow',     desc: 'Internet speed at {loc} is extremely slow. Online lab tools, Google Classroom uploads and video lectures take too long to load and are constantly buffering.' },
    { title: 'WiFi router not working',      desc: 'The WiFi router at {loc} appears to have failed. All indicator LEDs are off and no device can detect the SSID. A replacement or technical inspection is needed urgently.' },
    { title: 'LAN cable disconnected',       desc: 'The LAN cable connections in {loc} are broken or disconnected. Desktop computers in this lab cannot access the college network, internet or any cloud-based resources.' },
    { title: 'No WiFi coverage in this area',desc: 'There is no detectable WiFi signal at {loc}. While nearby areas have reasonable coverage, this spot has a dead zone that prevents students from using online resources during class.' },
    { title: 'Network disconnecting frequently',desc: 'The network at {loc} disconnects every few minutes. This is a critical problem during online exams and timed assignment submissions, causing marks to be lost unfairly.' },
    { title: 'Smart board not connecting',   desc: 'The smart board at {loc} is unable to connect to the internet despite being powered on. Faculty cannot use online teaching materials and interactive content during lectures.' },
    { title: 'WiFi login portal not loading',desc: 'The college network login portal is not loading at {loc}. New devices and students who recently changed their phone cannot get connected at all despite having valid credentials.' },
    { title: 'Network very slow during exams',desc: 'During online examinations at {loc}, the network becomes unbearably slow. The examination portal times out for multiple students simultaneously causing a very stressful experience.' },
    { title: 'Ethernet ports not working',   desc: 'All ethernet ports in {loc} appear to be non-functional. Network cables that worked last month now show no connection at all. A thorough inspection is requested.' },
  ],
  Infrastructure: [
    { title: 'Wall crack in classroom',      desc: 'A significant crack has appeared on the wall of {loc}. The crack appears to be widening and may indicate a structural issue. An expert structural assessment is urgently needed.' },
    { title: 'Ceiling plaster falling',      desc: 'Plaster from the ceiling at {loc} is falling in large chunks. This is a serious safety risk. One incident of falling plaster has already been reported. Immediate repair is needed.' },
    { title: 'Floor tiles broken',           desc: 'Several floor tiles at {loc} are cracked and have sharp raised edges. Students have already tripped. The broken pieces are creating a daily injury hazard that must be addressed.' },
    { title: 'Staircase railing loose',      desc: 'The staircase railing at {loc} is completely loose and wobbles when held. A large number of students use this staircase daily e The safety risk is very high.' },
    { title: 'Roof leaking during rain',     desc: 'The roof at {loc} leaks heavily during rainfall. Water enters and damages furniture, electrical equipment and student belongings. The problem has persisted for {days} months.' },
    { title: 'Seepage on wall',              desc: 'There is significant seepage and dampness on the walls of {loc}. The moisture is causing mould growth, a musty smell and paint peeling which suggests a plumbing issue in the wall.' },
    { title: 'Steps damaged at entrance',    desc: 'The steps at the entrance of {loc} are damaged and uneven. Students carrying heavy bags and faculty have already tripped here. Repair with proper anti-slip coating is needed.' },
    { title: 'False ceiling board falling',  desc: 'A false ceiling board at {loc} has come loose and is hanging dangerously low. Students in the room below are at risk of injury. Temporary barricading and permanent repair needed.' },
    { title: 'Compound wall damaged',        desc: 'A section of the compound wall near {loc} has partially collapsed after recent rains. This is creating an unauthorized entry point and should be repaired as soon as possible.' },
    { title: 'Paint peeling extensively',    desc: 'The paint at {loc} is peeling off extensively due to dampness. Beyond aesthetics, the exposed concrete is deteriorating and needs protective treatment and repainting.' },
  ],
  Security: [
    { title: 'Classroom door lock broken',   desc: 'The door lock of {loc} is broken and the room cannot be secured after hours. Valuable lab equipment, laptops and project materials are at risk of theft every night.' },
    { title: 'CCTV camera not working',      desc: 'The CCTV camera near {loc} is non-functional. This area has no security surveillance at all which is a serious concern given the equipment and student safety requirements.' },
    { title: 'Gate lock not functioning',    desc: 'The gate lock at {loc} is faulty and can be pushed open without a proper key. This completely compromises the night-time security of this section of the campus.' },
    { title: 'Fire extinguisher missing',    desc: 'The fire extinguisher that should be placed near {loc} is missing from its bracket. This is a serious fire safety violation and needs to be rectified immediately.' },
    { title: 'Laboratory door hinge broken', desc: 'The door hinge at {loc} is broken and the door will not close or stay shut. The lab cannot be secured when not in use, putting expensive equipment at risk.' },
    { title: 'Window latch broken',          desc: 'The window latch at {loc} is broken and the window stays permanently open. This allows unauthorized access from outside and also lets insects into the classroom and lab.' },
    { title: 'Hostel gate not locking',      desc: 'The hostel gate at {loc} does not lock properly after 10 PM. This is a security and safety risk for all resident students, particularly female students in the girls hostel.' },
    { title: 'CCTV blind spot reported',     desc: 'After reviewing CCTV footage, students noticed there is a significant blind spot near {loc} where no camera captures activity. This area should be covered with a new camera.' },
    { title: 'Fire alarm not tested',        desc: 'The fire alarm system near {loc} does not appear to have been tested in a long time. Students are unsure if it is functional which is a serious fire preparedness concern.' },
    { title: 'Biometric access not working', desc: 'The biometric access control system at {loc} is not scanning properly. Students and faculty are unable to log in via fingerprint and have to wait for manual access every day.' },
  ],
  Other: [
    { title: 'Drinking water cooler broken', desc: 'The drinking water cooler at {loc} is completely non-functional. During the extreme Erode summer, students struggle to get cold water throughout the day. Please repair or replace.' },
    { title: 'Notice board damaged',         desc: 'The notice board at {loc} is damaged and falling off the wall. Important exam schedules and events cannot be displayed properly, leading to students missing deadlines.' },
    { title: 'Projector not working',        desc: 'The projector in {loc} has stopped working. Faculty cannot conduct visual lectures or presentations. The teaching quality has been affected for {days} days now.' },
    { title: 'UPS not working during power cuts',desc: 'The UPS at {loc} is not providing backup power during frequent power cuts. All computer work and lab experiments stop abruptly causing data loss and incomplete records.' },
    { title: 'Photocopier machine broken',   desc: 'The photocopier near {loc} is broken and has been unserviced for a long time. Students and faculty cannot print or photocopy notes needed for classes and upcoming exams.' },
    { title: 'Water cooler area flooding',   desc: 'The area around the water cooler at {loc} floods every time the cooler is used. The drainage is blocked and the constant water on the floor creates a slipping hazard.' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK COMMENTS
// ─────────────────────────────────────────────────────────────────────────────
const POSITIVE_COMMENTS = [
  'Very quick response! The problem was fixed efficiently. Thank you VCET maintenance team.',
  'Excellent work. Issue resolved perfectly and the area was cleaned up afterwards.',
  'The worker was punctual, professional and courteous. Very satisfied with the service.',
  'Fast resolution within one working day. Highly impressed with the response time.',
  'Great job! The repair is solid and no further problems have occurred. Well done.',
  'Very happy with the service quality. The team took extra care to do the job cleanly.',
  'The technician explained what was done which was very helpful. Good communication.',
  'Timely action and thorough work. Appreciate the prompt response from the college.',
  'One of the best maintenance responses I have seen in the college. Keep it up!',
  'Professional work. Thank you for prioritising my complaint and resolving it quickly.',
];
const NEUTRAL_COMMENTS = [
  'Issue has been resolved. Response could have been a bit faster but work is satisfactory.',
  'Problem fixed but it took longer than expected. Work quality is acceptable.',
  'The fix seems temporary. Please ensure a permanent repair is done during next maintenance.',
  'Issue resolved after a couple of follow-ups. Please be more proactive in the future.',
  'Work done adequately but the area was not cleaned after the repair.',
  'Okay response time. The issue is fixed for now but may need to be reviewed again.',
  'Satisfactory service overall. Communication could have been better during the process.',
];
const NEGATIVE_COMMENTS = [
  'Took too long to resolve. There were many days with no update despite repeated requests.',
  'The repair was done hastily and the same problem recurred within a week.',
  'The quality of repair is poor. I expect a proper fix to be done soon.',
  'No communication was given during the entire time the complaint was pending.',
  'Had to raise the same complaint multiple times before getting any attention.',
  'The worker did not seem knowledgeable about the issue. Problem not fully fixed.',
  'Not satisfied. The underlying issue was not properly addressed during the repair.',
];

// ─────────────────────────────────────────────────────────────────────────────
// STATUS LOGIC (based on age of complaint in days)
// ─────────────────────────────────────────────────────────────────────────────
function pickStatus(daysAgo) {
  const r = rInt(0, 99);
  if (daysAgo > 90) {
    if (r < 55) return 'Completed';
    if (r < 70) return 'Resolved';
    if (r < 80) return 'In Progress';
    if (r < 88) return 'Assigned';
    if (r < 94) return 'Rejected';
    return 'Submitted';
  }
  if (daysAgo > 30) {
    if (r < 35) return 'Completed';
    if (r < 52) return 'Resolved';
    if (r < 65) return 'In Progress';
    if (r < 78) return 'Assigned';
    if (r < 87) return 'Submitted';
    if (r < 93) return 'On Hold';
    return 'Rejected';
  }
  if (daysAgo > 7) {
    if (r < 18) return 'Completed';
    if (r < 30) return 'Resolved';
    if (r < 48) return 'In Progress';
    if (r < 63) return 'Assigned';
    if (r < 80) return 'Submitted';
    if (r < 90) return 'On Hold';
    return 'Rejected';
  }
  // Very recent (≤7 days)
  if (r < 5)  return 'Completed';
  if (r < 12) return 'Resolved';
  if (r < 22) return 'In Progress';
  if (r < 38) return 'Assigned';
  if (r < 78) return 'Submitted';
  if (r < 90) return 'On Hold';
  return 'Rejected';
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT GENERATOR  (2160 students)
// ─────────────────────────────────────────────────────────────────────────────
function generateStudents(hashedPassword) {
  const students = [];
  let globalIdx = 0;

  for (const batch of BATCHES) {
    for (const dept of DEPARTMENTS) {
      for (let seat = 1; seat <= STUDENTS_PER_BATCH; seat++) {
        const studentId = `${COLLEGE_CODE}${padZ(batch, 2)}${dept.code}${padZ(seat, 3)}`;
        const isFemale  = seat % 3 === 0; // ~33% female
        const firstName = isFemale
          ? FEMALE_FIRST[globalIdx % FEMALE_FIRST.length]
          : MALE_FIRST  [globalIdx % MALE_FIRST.length];
        const surname   = SURNAMES[globalIdx % SURNAMES.length];
        const name      = `${firstName} ${surname}`;

        // Hostel: ~35% Girls Hostel, ~45% Boys Hostel, ~20% Day Scholar
        let hostelBlock;
        const hr = globalIdx % 20;
        if (isFemale)     hostelBlock = hr < 14 ? 'Girls Hostel' : 'Day Scholar';
        else              hostelBlock = hr < 16 ? 'Boys Hostel'  : 'Day Scholar';

        students.push({
          name,
          email:      `${studentId.toLowerCase()}@vcet.edu.in`,
          password:   hashedPassword,
          role:       'student',
          studentId,
          hostelBlock,
          phone:      `9${String(800000000 + globalIdx).slice(-9)}`,
          isActive:   true,
        });
        globalIdx++;
      }
    }
  }
  return students;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLAINT GENERATOR  (800 complaints)
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORY_POOL = (() => {
  const weights = [
    ['Electrical',20],['Plumbing',15],['Furniture',12],['Cleanliness',13],
    ['AC/Ventilation',10],['Internet/WiFi',15],['Infrastructure',8],['Security',5],['Other',2],
  ];
  const pool = [];
  for (const [cat, w] of weights) for (let i = 0; i < w; i++) pool.push(cat);
  return pool;
})();

function generateComplaints(studentDocs, workerDocs, adminId, totalComplaints = TOTAL_COMPLAINTS) {
  // build workerMap: maintenance-dept → [workerId, ...]
  const workerMap = {};
  for (const w of workerDocs) {
    if (!workerMap[w.department]) workerMap[w.department] = [];
    workerMap[w.department].push(w._id);
  }
  const pickWorker = (cat) => {
    const dept   = DEPT_TO_WORKER_DEPT[cat] || 'General';
    const list   = workerMap[dept] || workerMap['General'] || [];
    return list.length ? pick(list) : null;
  };

  const START = new Date('2024-01-15').getTime();
  const END   = new Date('2026-03-10').getTime();
  const RANGE = END - START;

  const complaints = [];
  const TOTAL = parsePositiveInt(totalComplaints, TOTAL_COMPLAINTS);

  for (let i = 0; i < TOTAL; i++) {
    const student   = studentDocs[rInt(0, studentDocs.length - 1)];
    const category  = CATEGORY_POOL[rInt(0, 99)];
    const templates = COMPLAINT_TEMPLATES[category];
    const tmpl      = templates[rInt(0, templates.length - 1)];
    const building  = pick(BUILDINGS);
    const location  = pick(BUILDING_LOCATIONS[building]);
    const daysAgo   = Math.floor((END - (START + Math.random() * RANGE)) / 86400000);
    const createdAt = new Date(END - daysAgo * 86400000);
    const year      = createdAt.getFullYear();
    const status    = pickStatus(daysAgo);

    const title = tmpl.title;
    const desc  = tmpl.desc
      .replace(/\{loc\}/g, location)
      .replace(/\{days\}/g, String(rInt(2, 10)));

    const priority = (['Electrical','Plumbing','Security'].includes(category))
      ? (rInt(0,9) < 7 ? 'High' : 'Medium')
      : (category === 'Furniture' || category === 'Cleanliness')
        ? (rInt(0,9) < 6 ? 'Low' : 'Medium')
        : (rInt(0,9) < 5 ? 'Medium' : rInt(0,1) ? 'High' : 'Low');

    const workerAssigned = pickWorker(category);
    const hasWorker = ['Assigned','In Progress','On Hold','Resolved','Completed'].includes(status);
    const assignedTo = hasWorker ? workerAssigned : null;

    // SLA
    const slaHours = priority === 'High' ? 24 : priority === 'Medium' ? 48 : 72;
    const slaDeadline = new Date(createdAt.getTime() + slaHours * 3600000);

    // Status history
    const statusHistory = [{
      status:       'Submitted',
      updatedBy:    student._id,
      timestamp:    createdAt,
      remarks:      'Complaint submitted via CampusResolve portal',
      isAutoUpdate: false,
    }];
    const assignedAt = new Date(createdAt.getTime() + rInt(30, 180) * 60000);
    if (hasWorker) {
      statusHistory.push({
        status:       'Assigned',
        updatedBy:    adminId,
        timestamp:    assignedAt,
        remarks:      `Auto-assigned to ${category} department based on AI classification`,
        isAutoUpdate: true,
      });
    }
    const inProgressAt = new Date(assignedAt.getTime() + rInt(1, 4) * 3600000);
    if (['In Progress','On Hold','Resolved','Completed'].includes(status)) {
      statusHistory.push({
        status:       'In Progress',
        updatedBy:    assignedTo,
        timestamp:    inProgressAt,
        remarks:      'Work started. Technician on site.',
        isAutoUpdate: false,
      });
    }
    if (status === 'On Hold') {
      statusHistory.push({
        status:       'On Hold',
        updatedBy:    assignedTo,
        timestamp:    new Date(inProgressAt.getTime() + rInt(2, 8) * 3600000),
        remarks:      'Work temporarily paused - awaiting spare parts / additional crew.',
        isAutoUpdate: false,
      });
    }
    const resolvedAt  = new Date(inProgressAt.getTime() + rInt(3, 18) * 3600000);
    const completedAt = new Date(resolvedAt.getTime() + rInt(1, 24) * 3600000);
    if (['Resolved','Completed'].includes(status)) {
      statusHistory.push({
        status:       'Resolved',
        updatedBy:    assignedTo,
        timestamp:    resolvedAt,
        remarks:      'Issue has been fixed. Please verify and close the ticket.',
        isAutoUpdate: false,
      });
    }
    if (status === 'Completed') {
      statusHistory.push({
        status:       'Completed',
        updatedBy:    student._id,
        timestamp:    completedAt,
        remarks:      'Resolution verified and accepted by student.',
        isAutoUpdate: false,
      });
    }
    if (status === 'Rejected') {
      statusHistory.push({
        status:       'Rejected',
        updatedBy:    adminId,
        timestamp:    new Date(createdAt.getTime() + rInt(1, 6) * 3600000),
        remarks:      'Complaint rejected: duplicate entry or insufficient information provided.',
        isAutoUpdate: false,
      });
    }

    // AI analysis
    const confidence = parseFloat((Math.random() * 0.45 + 0.55).toFixed(2));
    const method     = pick(['tensorflow','google_vision','hybrid','keyword_fallback']);
    const severity   = rInt(0, 9) < 7 ? 'normal' : rInt(0, 1) ? 'high' : 'critical';

    complaints.push({
      complaintId:  seqId('VCET', year, i + 1),
      studentId:    student._id,
      category,
      title,
      description:  desc,
      location,
      hostelBlock:  student.hostelBlock !== 'Day Scholar' ? student.hostelBlock : '',
      roomNumber:   student.hostelBlock !== 'Day Scholar' ? pick(['101','102','103','201','202','203','301','302']) : '',
      buildingName: building,
      priority,
      status,
      assignedTo:   hasWorker ? assignedTo : null,
      assignedBy:   hasWorker ? adminId    : null,
      isAutoAssigned: hasWorker,
      autoAssignmentReason: hasWorker
        ? `AI detected ${category} issue (conf ${confidence}) – auto-assigned to ${category} department`
        : null,
      assignedAt:   hasWorker    ? assignedAt  : null,
      completedAt:  status === 'Completed' ? completedAt : null,
      resolutionRemarks: ['Resolved','Completed'].includes(status)
        ? `The ${category.toLowerCase()} issue at ${location} has been resolved by the maintenance team. Repair completed and area cleaned.`
        : null,
      rejectionReason: status === 'Rejected'
        ? 'Complaint rejected: duplicate entry or insufficient detail provided by the student.'
        : null,
      slaDeadline,
      slaHours,
      isEscalated:  rInt(0, 19) === 0 && priority === 'High',
      statusHistory,
      aiAnalysis: {
        suggestedCategory: category,
        finalCategory:     category,
        confidence,
        detectedObjects:   [{ name: category.toLowerCase(), confidence }],
        detectedLabels:    [{ label: category, confidence }],
        method,
        isSafeContent:     severity !== 'critical',
        studentOverrode:   false,
        analyzedAt:        createdAt,
      },
      severityLevel:      severity,
      genuinenessScore:   rInt(55, 100),
      genuinenessVerdict: rInt(0,9) < 8 ? 'genuine' : rInt(0,1) ? 'review' : 'suspicious',
      etaHours:           slaHours * (priority === 'High' ? 0.6 : priority === 'Medium' ? 1.0 : 1.5),
      verificationStatus: status === 'Completed' ? 'accepted' : 'pending',
      isActive:           true,
      createdAt,
      updatedAt:          statusHistory[statusHistory.length - 1].timestamp,
    });
  }
  return complaints;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
const seedDB = async () => {
  try {
    const connected = await testConnection();
    if (!connected) throw new Error('Failed to connect to PostgreSQL');
    await syncDatabase();
    console.log('\n📡  Connected to PostgreSQL');

    // ── Clear existing data ──────────────────────────────────────────────────
    await Promise.all([
      User.deleteMany({}),
      Complaint.deleteMany({}),
      Category.deleteMany({}),
      Notification.deleteMany({}),
      Feedback.deleteMany({}),
    ]);
    console.log('🗑️   Cleared all existing data');

    // ── Categories ───────────────────────────────────────────────────────────
    await Category.insertMany(categories);
    console.log(`✅  Inserted ${categories.length} categories`);

    // ── Hash passwords (once each, reused for speed) ──────────────────────────
    console.log('🔐  Hashing passwords …');
    const [adminHash, workerHash, studentHash] = await Promise.all([
      bcrypt.hash('admin123',   10),
      bcrypt.hash('worker123',  10),
      bcrypt.hash('student123', 10),
    ]);

    // ── Admin ────────────────────────────────────────────────────────────────
    const [adminDoc] = await User.insertMany([{ ...ADMIN_USER, password: adminHash }]);
    console.log(`✅  Inserted admin: ${adminDoc.name}`);

    // ── Workers ──────────────────────────────────────────────────────────────
    const workerDocs = await User.insertMany(
      WORKER_DATA.map(w => ({ ...w, password: workerHash, role: 'worker', isActive: true }))
    );
    console.log(`✅  Inserted ${workerDocs.length} workers`);

    // ── Students ─────────────────────────────────────────────────────────────
    const studentData = generateStudents(studentHash);
    // Insert in batches to avoid memory spikes on larger seed sizes
    let insertedStudents = 0;
    const studentDocs = [];
    for (let i = 0; i < studentData.length; i += STUDENT_BATCH_SIZE) {
      const chunk = studentData.slice(i, i + STUDENT_BATCH_SIZE);
      const docs  = await User.insertMany(chunk, { ordered: false });
      studentDocs.push(...docs);
      insertedStudents += docs.length;
      process.stdout.write(`\r   ↳ Students inserted: ${insertedStudents}/${studentData.length}`);
    }
    console.log(`\n✅  Inserted ${insertedStudents} students`);

    // ── Complaints ───────────────────────────────────────────────────────────
    const complaintData = generateComplaints(studentDocs, workerDocs, adminDoc._id, TOTAL_COMPLAINTS);
    const complaintDocs = [];
    for (let i = 0; i < complaintData.length; i += COMPLAINT_BATCH_SIZE) {
      const chunk = complaintData.slice(i, i + COMPLAINT_BATCH_SIZE);
      const docs = await Complaint.insertMany(chunk, { ordered: false });
      complaintDocs.push(...docs);
      process.stdout.write(`\r   ↳ Complaints inserted: ${complaintDocs.length}/${complaintData.length}`);
    }
    console.log(`\n✅  Inserted ${complaintDocs.length} complaints`);

    // ── Feedback (for Completed complaints) ───────────────────────────────────
    const completedComplaints = complaintDocs.filter(c => c.status === 'Completed');
    const feedbackDocs = completedComplaints.map(c => {
      const r = rInt(0, 9);
      let overall, responseTime, quality, comments;
      if (r < 6) { // 60% positive
        overall = rInt(4, 5); responseTime = rInt(4, 5); quality = rInt(4, 5);
        comments = pick(POSITIVE_COMMENTS);
      } else if (r < 9) { // 30% neutral
        overall = rInt(3, 4); responseTime = rInt(2, 4); quality = rInt(3, 4);
        comments = pick(NEUTRAL_COMMENTS);
      } else { // 10% negative
        overall = rInt(1, 3); responseTime = rInt(1, 2); quality = rInt(1, 3);
        comments = pick(NEGATIVE_COMMENTS);
      }
      return {
        complaintId:      c._id,
        studentId:        c.studentId,
        workerId:         c.assignedTo,
        overallRating:    overall,
        responseTimeRating: responseTime,
        qualityRating:    quality,
        comments,
        createdAt:        c.completedAt,
        updatedAt:        c.completedAt,
      };
    }).filter(f => f.workerId != null);

    if (feedbackDocs.length > 0) {
      await Feedback.insertMany(feedbackDocs, { ordered: false });
    }
    console.log(`✅  Inserted ${feedbackDocs.length} feedback records`);

    // ── Notifications ─────────────────────────────────────────────────────────
    const notifications = [];
    const recentComplaints = complaintDocs.slice(-100); // last 100
    for (const c of recentComplaints) {
      // Notify admin of new complaints
      notifications.push({
        userId:      adminDoc._id,
        type:        'complaint_created',
        title:       'New Complaint Submitted',
        message:     `A new ${c.category} complaint has been submitted for ${c.location}.`,
        complaintId: c._id,
        isRead:      c.status !== 'Submitted',
        createdAt:   c.createdAt,
      });
      // Notify worker if assigned
      if (c.assignedTo && ['Assigned','In Progress','Resolved','Completed'].includes(c.status)) {
        notifications.push({
          userId:      c.assignedTo,
          type:        'complaint_assigned',
          title:       'New Complaint Assigned',
          message:     `A ${c.priority} priority ${c.category} complaint has been assigned to you at ${c.location}.`,
          complaintId: c._id,
          isRead:      ['Resolved','Completed'].includes(c.status),
          createdAt:   c.assignedAt || c.createdAt,
        });
      }
      // Notify student on completion
      if (c.status === 'Completed') {
        notifications.push({
          userId:      c.studentId,
          type:        'complaint_completed',
          title:       'Complaint Resolved',
          message:     `Your ${c.category} complaint at ${c.location} has been resolved and marked complete.`,
          complaintId: c._id,
          isRead:      rInt(0,1) === 1,
          createdAt:   c.completedAt,
        });
      }
      // Notify student on rejection
      if (c.status === 'Rejected') {
        notifications.push({
          userId:      c.studentId,
          type:        'complaint_rejected',
          title:       'Complaint Rejected',
          message:     `Your ${c.category} complaint at ${c.location} was rejected. Reason: ${c.rejectionReason}`,
          complaintId: c._id,
          isRead:      false,
          createdAt:   c.statusHistory[c.statusHistory.length - 1].timestamp,
        });
      }
    }
    if (notifications.length > 0) {
      await Notification.insertMany(notifications, { ordered: false });
    }
    console.log(`✅  Inserted ${notifications.length} notifications`);

    // ── Summary ───────────────────────────────────────────────────────────────
    const statusSummary = {};
    for (const c of complaintDocs) statusSummary[c.status] = (statusSummary[c.status] || 0) + 1;

    console.log('\n' + '═'.repeat(60));
    console.log('  VCET MOCK DATABASE — SEED COMPLETE');
    console.log('  Velalar College of Engineering and Technology, Erode');
    console.log('═'.repeat(60));
    console.log(`  Students : ${insertedStudents.toLocaleString()}`);
    console.log(`             (${DEPARTMENTS.length} depts × ${BATCHES.length} batches × ${STUDENTS_PER_BATCH} students)`);
    console.log(`  Workers  : ${workerDocs.length}`);
    console.log(`  Complaints: ${complaintDocs.length}`);
    console.log(`  Seed config: VCET_SEED_COMPLAINTS=${TOTAL_COMPLAINTS}, VCET_STUDENT_BATCH_SIZE=${STUDENT_BATCH_SIZE}, VCET_COMPLAINT_BATCH_SIZE=${COMPLAINT_BATCH_SIZE}`);
    for (const [s, n] of Object.entries(statusSummary)) console.log(`             ${s.padEnd(12)}: ${n}`);
    console.log(`  Feedback : ${feedbackDocs.length} (for Completed complaints)`);
    console.log(`  Notifs   : ${notifications.length}`);
    console.log('─'.repeat(60));
    console.log('  LOGIN CREDENTIALS');
    console.log('─'.repeat(60));
    console.log('  ADMIN:');
    console.log('    admin@vcet.edu.in            / admin123');
    console.log('  WORKERS (password: worker123):');
    for (const w of WORKER_DATA.slice(0, 9)) {
      console.log(`    ${w.email.padEnd(36)} [${w.department}]`);
    }
    console.log('    … (18 total workers)');
    console.log('  STUDENT SAMPLE (password: student123):');
    console.log('    732922amr001@vcet.edu.in    → Batch 22 AIML Student 1');
    console.log('    732923csr001@vcet.edu.in    → Batch 23 CSE Student 1');
    console.log('    732924itr001@vcet.edu.in    → Batch 24 IT  Student 1');
    console.log('    732925eer001@vcet.edu.in    → Batch 25 EEE Student 1');
    console.log('  BATCH CODES: 22, 23, 24, 25');
    console.log('  DEPT CODES:  AMR CSR ITR ADR BMR MDR MER CER EER');
    console.log('═'.repeat(60) + '\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌  Seed error:', err.message);
    if (err.writeErrors) {
      console.error(`   Write errors: ${err.writeErrors.length} (continuing past duplicates)`);
    }
    process.exit(1);
  }
};

seedDB();
