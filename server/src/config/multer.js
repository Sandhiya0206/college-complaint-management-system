const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = process.env.UPLOAD_PATH || 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../', uploadDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedVideoTypes = /mp4|mov|avi|mkv|webm/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const isImage = allowedImageTypes.test(ext) && allowedImageTypes.test(file.mimetype);
  const isVideo = allowedVideoTypes.test(ext) && /video/.test(file.mimetype);
  if (isImage || isVideo) {
    cb(null, true);
  } else {
    cb(new Error('Only image (jpeg, jpg, png, gif, webp) and video (mp4, mov, avi, webm) files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB for videos
    files: 5
  }
});

module.exports = upload;
