const { analyzeImage } = require('../services/imageAnalysis.service');
const { classifyTextWithGroq, hasGroqTextEnabled } = require('../services/groqVision.service');
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
    const result = await analyzeImage(buffer, clientData, {
      imagePath: req.file.path,
      mimeType: req.file.mimetype
    });

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

// @desc    Analyze complaint text standalone
// @route   POST /api/image/analyze-text
const analyzeTextController = async (req, res, next) => {
  try {
    const description = String(req.body?.description || '').trim();
    const title = String(req.body?.title || '').trim();

    if (description.length < 4) {
      return res.status(400).json({ success: false, message: 'Description is required' });
    }

    if (!hasGroqTextEnabled()) {
      return res.status(503).json({ success: false, message: 'Text AI analysis is currently disabled' });
    }

    const analysis = await classifyTextWithGroq({ description, title });
    res.status(200).json({ success: true, analysis });
  } catch (err) {
    next(err);
  }
};

module.exports = { analyzeImageController, analyzeTextController };
