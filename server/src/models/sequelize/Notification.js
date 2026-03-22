const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM(
        'complaint_created',
        'complaint_assigned',
        'status_changed',
        'complaint_resolved',
        'complaint_rejected',
        'complaint_escalated',
        'complaint_completed'
      ),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    complaintId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Complaints',
        key: 'id'
      }
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    timestamps: true,
    indexes: [{ fields: ['userId'] }, { fields: ['isRead'] }, { fields: ['createdAt'] }]
  });

  return Notification;
};