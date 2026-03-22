const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const QTable = sequelize.define('QTable', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    actions: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    visitCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    createdAt: true,
    updatedAt: true,
    indexes: [{ unique: true, fields: ['state'] }]
  });

  return QTable;
};