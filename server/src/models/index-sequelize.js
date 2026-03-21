const { sequelize } = require('../config/sequelize');

// Import model definitions
const UserModel = require('./sequelize/User');
const ComplaintModel = require('./sequelize/Complaint');

// Initialize models
const User = UserModel(sequelize);
const Complaint = ComplaintModel(sequelize);

// Define associations
User.hasMany(Complaint, { 
  foreignKey: 'studentId',
  as: 'complaints'
});

Complaint.belongsTo(User, { 
  foreignKey: 'studentId',
  as: 'student',
  targetKey: 'id'
});

// Worker assignments
Complaint.belongsTo(User, { 
  foreignKey: 'assignedTo',
  as: 'worker',
  targetKey: 'id'
});

// Assignment authority
Complaint.belongsTo(User, { 
  foreignKey: 'assignedBy',
  as: 'assigner',
  targetKey: 'id'
});

// Escalation authority
Complaint.belongsTo(User, { 
  foreignKey: 'escalatedBy',
  as: 'escalator',
  targetKey: 'id'
});

// Status history references
// Note: Status history is stored as JSON, individual user references likely need migration

module.exports = {
  sequelize,
  User,
  Complaint
};
