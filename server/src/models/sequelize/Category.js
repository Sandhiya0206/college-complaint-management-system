const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    defaultPriority: {
      type: DataTypes.ENUM('Low', 'Medium', 'High'),
      defaultValue: 'Medium'
    },
    workerDepartment: {
      type: DataTypes.STRING,
      allowNull: false
    },
    keywords: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    icon: {
      type: DataTypes.STRING,
      defaultValue: '🔧'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true,
    indexes: [{ fields: ['name'] }, { fields: ['isActive'] }]
  });

  return Category;
};