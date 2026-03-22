const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SLAModel = sequelize.define('SLAModel', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      defaultValue: 'sla_breach_v1'
    },
    weights: {
      type: DataTypes.JSON,
      defaultValue: [0, 0, 0, 0, 0, 0]
    },
    bias: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    learningRate: {
      type: DataTypes.FLOAT,
      defaultValue: 0.05
    },
    trainingSamples: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastTrainedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: true,
    indexes: [{ unique: true, fields: ['name'] }]
  });

  return SLAModel;
};