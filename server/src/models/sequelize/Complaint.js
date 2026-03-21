const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Complaint = sequelize.define('Complaint', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    complaintId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    category: {
      type: DataTypes.ENUM(
        'Electrical',
        'Plumbing',
        'Furniture',
        'Cleanliness',
        'AC/Ventilation',
        'Internet/WiFi',
        'Infrastructure',
        'Security',
        'Other'
      ),
      allowNull: false
    },
    subcategory: {
      type: DataTypes.STRING,
      allowNull: true
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: ''
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false
    },
    images: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    videos: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    hostelBlock: {
      type: DataTypes.STRING,
      allowNull: true
    },
    roomNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    locationType: {
      type: DataTypes.STRING,
      defaultValue: ''
    },
    buildingName: {
      type: DataTypes.STRING,
      defaultValue: ''
    },
    floorNumber: {
      type: DataTypes.STRING,
      defaultValue: ''
    },
    gender: {
      type: DataTypes.STRING,
      defaultValue: ''
    },
    section: {
      type: DataTypes.STRING,
      defaultValue: ''
    },
    landmark: {
      type: DataTypes.STRING,
      defaultValue: ''
    },
    customLocation: {
      type: DataTypes.STRING,
      defaultValue: ''
    },
    priority: {
      type: DataTypes.ENUM('Low', 'Medium', 'High'),
      defaultValue: 'Medium'
    },
    status: {
      type: DataTypes.ENUM(
        'Submitted',
        'Assigned',
        'In Progress',
        'On Hold',
        'Resolved',
        'Completed',
        'Rejected'
      ),
      defaultValue: 'Submitted'
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    assignedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    isAutoAssigned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    autoAssignmentReason: {
      type: DataTypes.STRING,
      allowNull: true
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    aiAnalysis: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    resolutionRemarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    resolutionImages: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    statusHistory: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    slaDeadline: {
      type: DataTypes.DATE,
      allowNull: true
    },
    slaHours: {
      type: DataTypes.INTEGER,
      defaultValue: 24
    },
    verificationStatus: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
      defaultValue: 'pending'
    },
    verificationRejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    completedVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isEscalated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    escalatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    escalatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    escalationReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    escalationLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    duplicateCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    mergedFrom: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    severityLevel: {
      type: DataTypes.ENUM('normal', 'high', 'critical'),
      defaultValue: 'normal'
    },
    severitySignals: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    genuinenessScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: { min: 0, max: 100 }
    },
    genuinenessVerdict: {
      type: DataTypes.ENUM('genuine', 'review', 'suspicious'),
      allowNull: true
    },
    genuinenessFlags: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    etaHours: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    etaConfidence: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    etaBasedOn: {
      type: DataTypes.STRING,
      allowNull: true
    },
    aiDraftUpdate: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rlState: {
      type: DataTypes.STRING,
      allowNull: true
    },
    rlAction: {
      type: DataTypes.STRING,
      allowNull: true
    },
    slaBreach: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    timestamps: true,
    indexes: [
      { fields: ['studentId', 'createdAt'] },
      { fields: ['assignedTo', 'status'] },
      { fields: ['status', 'priority'] },
      { fields: ['category'] },
      { fields: ['complaintId'] }
    ]
  });

  // Auto-generate complaintId before create
  Complaint.beforeCreate(async (complaint) => {
    if (!complaint.complaintId) {
      const year = new Date().getFullYear();
      const count = await Complaint.count();
      complaint.complaintId = `CMP-${year}-${String(count + 1).padStart(4, '0')}`;
    }
  });

  return Complaint;
};
