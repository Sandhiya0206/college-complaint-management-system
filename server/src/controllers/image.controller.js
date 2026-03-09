const { analyzeImage } = require('../services/imageAnalysis.service');
const path = require('path');
const fs = require('fs');

// @desc    Analyze image standalone
// @route   POST /api/image/analyze
const analyzeImageController = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file required' });
    }

    let clientData = {};
    try {
      clientData = req.body.aiData ? JSON.parse(req.body.aiData) : {};
    } catch (e) {}

    const buffer = fs.readFileSync(req.file.path);
    const result = await analyzeImage(buffer, clientData);

    // Clean up temp file
    fs.unlink(req.file.path, () => {});

    res.status(200).json({
      success: true,
      analysis: result
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { analyzeImageController };
