/**
 * Q-Table Model — persists the Reinforcement Learning Q-values for worker assignment.
 * Innovation #A: Q-Learning Worker Assignment
 *
 * State encoding: "category|priority|hourBucket|loadBucket"
 * Action: workerId (string)
 * Q(s, a) stored as an embedded Map-like array for MongoDB compatibility.
 */
const mongoose = require('mongoose');

const qEntrySchema = new mongoose.Schema({
  // Composite key: "Electrical|High|morning|low"
  state: { type: String, required: true },
  // workerId → Q-value
  actions: {
    type: Map,
    of: Number,
    default: {}
  },
  // How many times this state was visited
  visitCount: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

qEntrySchema.index({ state: 1 }, { unique: true });

module.exports = mongoose.model('QTable', qEntrySchema);
