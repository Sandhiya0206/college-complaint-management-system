require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Category = require('../models/Category');
const Notification = require('../models/Notification');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/complaint_management';

const categories = [
  { name: 'Electrical', description: 'Electrical issues: wiring, switches, outlets, bulbs', defaultPriority: 'High', workerDepartment: 'Electrical', keywords: ['switch', 'wire', 'bulb', 'socket', 'circuit'], icon: '⚡' },
  { name: 'Plumbing', description: 'Water & plumbing issues', defaultPriority: 'High', workerDepartment: 'Plumbing', keywords: ['pipe', 'tap', 'leak', 'drain', 'water'], icon: '🔧' },
  { name: 'Furniture', description: 'Broken or damaged furniture', defaultPriority: 'Low', workerDepartment: 'Furniture', keywords: ['chair', 'table', 'desk', 'bed', 'cabinet'], icon: '🪑' },
  { name: 'Cleanliness', description: 'Hygiene and waste issues', defaultPriority: 'Low', workerDepartment: 'Cleanliness', keywords: ['trash', 'garbage', 'dirt', 'stain', 'mold'], icon: '🧹' },
  { name: 'AC/Ventilation', description: 'Air conditioning and ventilation', defaultPriority: 'Medium', workerDepartment: 'AC/Ventilation', keywords: ['fan', 'ac', 'vent', 'cooling', 'heater'], icon: '❄️' },
  { name: 'Internet/WiFi', description: 'Network and connectivity issues', defaultPriority: 'Medium', workerDepartment: 'Internet/WiFi', keywords: ['wifi', 'internet', 'router', 'network', 'cable'], icon: '📶' },
  { name: 'Infrastructure', description: 'Building structure issues', defaultPriority: 'Medium', workerDepartment: 'Infrastructure', keywords: ['wall', 'ceiling', 'floor', 'crack', 'roof'], icon: '🏗️' },
  { name: 'Security', description: 'Security and lock issues', defaultPriority: 'High', workerDepartment: 'Security', keywords: ['lock', 'gate', 'cctv', 'key', 'door'], icon: '🔒' },
  { name: 'Other', description: 'Other campus issues', defaultPriority: 'Medium', workerDepartment: 'General', keywords: [], icon: '📋' }
];

const adminUsers = [
  { name: 'Admin', email: 'admin@college.edu', password: 'admin123', role: 'admin' }
];

const workerUsers = [
  { name: 'Rajesh Kumar', email: 'electrical@college.edu', password: 'worker123', role: 'worker', department: 'Electrical', phone: '9876543210' },
  { name: 'Suresh Patel', email: 'plumbing@college.edu', password: 'worker123', role: 'worker', department: 'Plumbing', phone: '9876543211' },
  { name: 'Meera Singh', email: 'furniture@college.edu', password: 'worker123', role: 'worker', department: 'Furniture', phone: '9876543212' },
  { name: 'Arun Das', email: 'cleaning@college.edu', password: 'worker123', role: 'worker', department: 'Cleanliness', phone: '9876543213' },
  { name: 'Priya Nair', email: 'it@college.edu', password: 'worker123', role: 'worker', department: 'Internet/WiFi', phone: '9876543214' }
];

const studentUsers = [
  { name: 'John Doe', email: 'student1@college.edu', password: 'student123', role: 'student', studentId: 'STU001' },
  { name: 'Jane Smith', email: 'student2@college.edu', password: 'student123', role: 'student', studentId: 'STU002' },
  { name: 'Arjun Sharma', email: 'student3@college.edu', password: 'student123', role: 'student', studentId: 'STU003' }
];

const generateSampleComplaints = (students, workers) => {
  const workerMap = {};
  workers.forEach(w => { workerMap[w.department] = w._id; });

  const sampleComplaints = [
    { category: 'Electrical', location: 'Hostel A, Room 101', priority: 'High', status: 'Resolved', studentIdx: 0, confidence: 0.87 },
    { category: 'Plumbing', location: 'Block B, Floor 2', priority: 'High', status: 'Resolved', studentIdx: 1, confidence: 0.92 },
    { category: 'Furniture', location: 'Library Reading Hall', priority: 'Low', status: 'Resolved', studentIdx: 2, confidence: 0.78 },
    { category: 'Cleanliness', location: 'canteen area', priority: 'Low', status: 'Resolved', studentIdx: 0, confidence: 0.65 },
    { category: 'Internet/WiFi', location: 'Computer Lab 3', priority: 'Medium', status: 'Resolved', studentIdx: 1, confidence: 0.81 },
    { category: 'Electrical', location: 'Hostel B, Room 205', priority: 'High', status: 'In Progress', studentIdx: 2, confidence: 0.79 },
    { category: 'Plumbing', location: 'Ground Floor Washroom', priority: 'High', status: 'In Progress', studentIdx: 0, confidence: 0.88 },
    { category: 'AC/Ventilation', location: 'Lecture Hall 3', priority: 'Medium', status: 'In Progress', studentIdx: 1, confidence: 0.72 },
    { category: 'Infrastructure', location: 'Main Gate Steps', priority: 'Medium', status: 'In Progress', studentIdx: 2, confidence: 0.61 },
    { category: 'Furniture', location: 'Classroom 201', priority: 'Low', status: 'Assigned', studentIdx: 0, confidence: 0.83 },
    { category: 'Cleanliness', location: 'Hostel C Common Room', priority: 'Low', status: 'Assigned', studentIdx: 1, confidence: 0.55 },
    { category: 'Security', location: 'Hostel A Main Gate', priority: 'High', status: 'Assigned', studentIdx: 2, confidence: 0.91 },
    { category: 'Electrical', location: 'Seminar Hall', priority: 'High', status: 'Submitted', studentIdx: 0, confidence: 0.45 },
    { category: 'Internet/WiFi', location: 'Admin Block Wifi', priority: 'Medium', status: 'Submitted', studentIdx: 1, confidence: 0.68 },
    { category: 'Plumbing', location: 'Girls Hostel Floor 3', priority: 'High', status: 'Rejected', studentIdx: 2, confidence: 0.33 }
  ];

  return sampleComplaints.map((c, i) => {
    const student = students[c.studentIdx];
    const workerForCategory = workerMap[c.category] || workers[0]._id;

    const baseDate = new Date(Date.now() - (15 - i) * 24 * 60 * 60 * 1000);
    const complaint = {
      complaintId: `CMP-2026-${String(i + 1).padStart(4, '0')}`,
      studentId: student._id,
      category: c.category,
      title: `${c.category} Issue at ${c.location}`,
      description: `Sample ${c.category.toLowerCase()} issue reported at ${c.location}. Requires immediate attention.`,
      location: c.location,
      images: [],
      priority: c.priority,
      status: c.status,
      assignedTo: ['Assigned', 'In Progress', 'Resolved'].includes(c.status) ? workerForCategory : null,
      assignedBy: null,
      isActive: true,
      isAutoAssigned: true,
      autoAssignmentReason: `AI detected ${c.category} issue, auto-assigned to department worker`,
      assignedAt: ['Assigned', 'In Progress', 'Resolved'].includes(c.status) ? new Date(baseDate.getTime() + 5 * 60000) : null,
      aiAnalysis: {
        suggestedCategory: c.category,
        finalCategory: c.category,
        confidence: c.confidence,
        detectedObjects: [{ name: c.category.toLowerCase(), confidence: c.confidence }],
        detectedLabels: [{ label: c.category, confidence: c.confidence }],
        method: 'tensorflow',
        isSafeContent: true,
        studentOverrode: false,
        analyzedAt: baseDate
      },
      statusHistory: [
        { status: 'Submitted', updatedBy: student._id, timestamp: baseDate, remarks: 'Complaint submitted', isAutoUpdate: false }
      ],
      createdAt: baseDate,
      updatedAt: baseDate
    };

    if (['Assigned', 'In Progress', 'Resolved'].includes(c.status)) {
      complaint.statusHistory.push({
        status: 'Assigned',
        timestamp: new Date(baseDate.getTime() + 5 * 60000),
        remarks: 'Auto-assigned by AI',
        isAutoUpdate: true
      });
    }
    if (['In Progress', 'Resolved'].includes(c.status)) {
      complaint.statusHistory.push({
        status: 'In Progress',
        updatedBy: workerForCategory,
        timestamp: new Date(baseDate.getTime() + 2 * 60 * 60 * 1000),
        remarks: 'Work started'
      });
    }
    if (c.status === 'Resolved') {
      complaint.statusHistory.push({
        status: 'Resolved',
        updatedBy: workerForCategory,
        timestamp: new Date(baseDate.getTime() + 6 * 60 * 60 * 1000),
        remarks: 'Issue resolved and verified'
      });
      complaint.resolutionRemarks = 'Issue has been resolved and verified. No further action needed.';
      complaint.completedAt = new Date(baseDate.getTime() + 6 * 60 * 60 * 1000);
    }
    if (c.status === 'Rejected') {
      complaint.statusHistory.push({
        status: 'Rejected',
        timestamp: new Date(baseDate.getTime() + 60 * 60 * 1000),
        remarks: 'Duplicate complaint or insufficient information'
      });
      complaint.rejectionReason = 'Duplicate complaint or insufficient information provided';
    }

    return complaint;
  });
};

const seedDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('📡 Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Complaint.deleteMany({}),
      Category.deleteMany({}),
      Notification.deleteMany({})
    ]);
    console.log('🗑️  Cleared existing data');

    // Seed categories
    const createdCategories = await Category.insertMany(categories);
    console.log(`✅ Created ${createdCategories.length} categories`);

    // Seed users (passwords will be hashed by pre-save hook)
    const createdAdmins = await User.create(adminUsers);
    const createdWorkers = await User.create(workerUsers);
    const createdStudents = await User.create(studentUsers);
    console.log(`✅ Created ${createdAdmins.length} admins, ${createdWorkers.length} workers, ${createdStudents.length} students`);

    // Seed complaints
    const sampleComplaints = generateSampleComplaints(createdStudents, createdWorkers);
    const createdComplaints = await Complaint.insertMany(sampleComplaints);
    console.log(`✅ Created ${createdComplaints.length} complaints`);

    // Create some notifications for workers
    const notifData = createdWorkers.slice(0, 3).map((worker, i) => ({
      userId: worker._id,
      type: 'complaint_assigned',
      title: 'Complaint Assigned',
      message: `You have a new complaint assigned`,
      isRead: false
    }));
    await Notification.insertMany(notifData);

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('─────────────────────────────────');
    console.log('ADMIN:   admin@college.edu       / admin123');
    console.log('WORKER:  electrical@college.edu  / worker123');
    console.log('WORKER:  plumbing@college.edu    / worker123');
    console.log('WORKER:  furniture@college.edu   / worker123');
    console.log('WORKER:  cleaning@college.edu    / worker123');
    console.log('WORKER:  it@college.edu          / worker123');
    console.log('STUDENT: student1@college.edu    / student123');
    console.log('STUDENT: student2@college.edu    / student123');
    console.log('STUDENT: student3@college.edu    / student123');
    console.log('─────────────────────────────────');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
};

seedDB();
