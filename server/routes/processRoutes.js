const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { processImage } = require('../controllers/imageController');

// Image processing
router.post('/:mode', upload.single('image'), processImage);

module.exports = router;