const upload = require('../config/multer');

const uploadImages = (req, res, next) => {
  const uploader = upload.array('images', 5);
  uploader(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large. Maximum size is 50MB.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ success: false, message: 'Too many files. Maximum 5 files allowed.' });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// Accept both images and videos (up to 5 files total)
const uploadMedia = (req, res, next) => {
  const uploader = upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'videos', maxCount: 3 }
  ]);
  uploader(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large. Max 50MB per file.' });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

const uploadSingle = (req, res, next) => {
  const uploader = upload.single('image');
  uploader(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

module.exports = { uploadImages, uploadMedia, uploadSingle };
