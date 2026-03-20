const express = require('express');
const router = express.Router();
const { analyzeImageController, analyzeTextController } = require('../controllers/image.controller');
const { verifyJWT } = require('../middleware/auth.middleware');
const { uploadSingle } = require('../middleware/upload.middleware');

router.post('/analyze', verifyJWT, uploadSingle, analyzeImageController);
router.post('/analyze-text', verifyJWT, analyzeTextController);

module.exports = router;
