/**
 * SLA Logistic Regression Model
 * Innovation #E: SLA Breach Predictor
 *
 * Stores the trained weight vector w and bias b for the online logistic regression:
 *   P(breach) = σ(w · x + b)
 * Features (6): [categoryRisk, priorityScore, workerLoad, workerBreachRate, hourSin, hourCos]
 */
const mongoose = require('mongoose');

const slaModelSchema = new mongoose.Schema({
  name: { type: String, default: 'sla_breach_v1', unique: true },
  weights: { type: [Number], default: [0, 0, 0, 0, 0, 0] },  // 6 features
  bias: { type: Number, default: 0 },
  learningRate: { type: Number, default: 0.05 },
  trainingSamples: { type: Number, default: 0 },
  lastTrainedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SLAModel', slaModelSchema);
