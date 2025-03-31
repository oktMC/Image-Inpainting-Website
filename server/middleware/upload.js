const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Counter file path

const counterFilePath = path.join(__dirname, '../fileCounter.txt');

// Initialize counter
let fileCounter = 0;
if (fs.existsSync(counterFilePath)) {
  fileCounter = parseInt(fs.readFileSync(counterFilePath, 'utf8'), 10);
}

// Update counter file
const updateCounter = () => {
  fs.writeFileSync(counterFilePath, fileCounter.toString());
};

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create uploads directory if it doesn't exist
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname);
    fileCounter++;
    updateCounter();
    const filename = `file_${fileCounter}`;
    
    // Attach info to request object for later use
    req.fileExtension = extension;
    req.fileName = filename;
    
    cb(null, `${filename}${extension}`);
  }
});

// Create upload middleware
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    fieldSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (!allowedTypes.includes(ext)) {
      return cb(new Error('Only image files are allowed!'));
    }
    cb(null, true);
  }
});

module.exports = upload;