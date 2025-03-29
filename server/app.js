require('dotenv').config();

const express = require('express')
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const fsPromises = require('fs').promises;
const { spawn } = require('child_process')
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

const logger = require('./logger');
const verifyToken = require('./JWT')
const { validate } = require('webpack');

mongoose.connect('mongodb://localhost:27017/appdb')
.then(() => {
    console.log('Connected to MongoDB');
})
.catch((e) => {
    console.error('Error connecting to MongoDB:', e);
});

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt:{
        type:Date,
        immutable : true,
        default:() => Date.now(),
    }
});

const gallerySchema = new mongoose.Schema({
    username: { type: String, required: true },
    title: {type:String, default: "Untitled" },
    image: { type: String, required: true },
    size: {type: String}, //1.8 MB
    dimensions: {type: String}, //1920 x 1080
    favorite : {type: Boolean, default: false},
    mimeType: {type: String, required: true}, // "image/jpeg", "image/png"
    uploadedAt: { type: Date, default: Date.now }
  });

const User = mongoose.model('User', userSchema, 'users');
const Gallery = mongoose.model('Gallery', gallerySchema, 'gallery');

const counterFilePath = path.join(__dirname, 'fileCounter.txt');

let fileCounter = 0;
if (fs.existsSync(counterFilePath)) {
    fileCounter = parseInt(fs.readFileSync(counterFilePath, 'utf8'), 10);
}

const updateCounter = () => {
    fs.writeFileSync(counterFilePath, fileCounter.toString());
};

const app = express()
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads'); 
    },
    filename: function (req, file, cb) {
        const extension = path.extname(file.originalname);
        fileCounter++;
        updateCounter();
        const filename = `file_${fileCounter}`
        req.fileExtension = extension;
        req.fileName = filename;
        cb(null, `${filename}${extension}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fieldSize: 10 * 1024 * 1024 
    }
});

app.use(logger)

app.use(express.static(path.join(__dirname, '../src')));

// app.get('/',(req,res)=>{
//    res.status(200).sendFile(path.resolve('../public/index.html'))
// })

app.get('/',(req,res)=>{
    res.status(200).sendFile(path.resolve('../src/index.html'))
})

app.post('/process/:mode', upload.single('image'), async (req, res) => {
    try {
        // Step 1: Get the uploaded image and mask
        const imagePath = req.file.path;
        const mask = req.body.mask
        const isLoggedIn = JSON.parse(req.body.isLoggedIn)
        const {mode} = req.params

        const processedImageId = uuidv4();
        const pythonScriptPath = path.resolve(__dirname, '../../test.py');
        const outputImagePath = path.join(__dirname, `./processed_Image/${processedImageId}${req.fileExtension}`);

        const python = spawn('python', [pythonScriptPath, imagePath, outputImagePath, mode]);

        python.stdin.write(mask)
        python.stdin.end();

        python.stdout.on('data', (data) => {
            console.log(`Python Output: ${data.toString()}`);
        });

        python.stderr.on('data', (data) => {
            console.error(`Python Error: ${data.toString()}`);
        });

        python.on('close', (code) => {
            if (code === 0) {
                console.log('Python script executed successfully.');
                // res.send("Success");
                
                const mimeTypes = {
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.gif': 'image/gif',
                };

                const contentType = mimeTypes[req.fileExtension.toLowerCase()] || 'application/octet-stream';

                res.setHeader('Content-Type', contentType);
                res.setHeader('X-Processed-Image-ID', processedImageId); 
                res.sendFile(outputImagePath, async(err) => {
                    // Clean up temporary files
                    if (err) {
                        console.error('Error sending file:', err);
                        res.status(500).send('Failed to send file.');
                    } else {
                        fsPromises.unlink(imagePath, () => {});
                        if (!isLoggedIn) { await fsPromises.unlink(outputImagePath)}
                    }
                });
            } else {
                console.error(`Python script exited with code ${code}`);
                res.status(500).send('Failed to process image.');
            }
        });
    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).send('Failed to process image.');
    }
});

// Route to register a new user
app.post('/api/register', express.json(), async (req, res) => {
    try {
      // Check if the user already exists
      const existingUser = await User.findOne({ username: req.body.username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
  
      // Create a new user
      const newUser = new User({
        username: req.body.username,
        password: hashedPassword
      });
      await newUser.save();
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
      console.log(error)
    }
});
  
// Route to authenticate and log in a user
app.post('/api/login', express.json(), async (req, res) => {
    try {
        // Check if the user exists
        const user = await User.findOne({ username: req.body.username });
        if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Compare passwords
        const passwordMatch = await bcrypt.compare(req.body.password, user.password);
        if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Generate JWT token
        const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN });
        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Protected route to get user details
app.get('/api/user', verifyToken, async (req, res) => {
    try {
        // Fetch user details using decoded token
        console.log(req.user)
        const user = await User.findOne({ username: req.user.username });
        if (!user) {
        return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ username: user.username, email: user.email });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/save', express.json(), verifyToken, async(req,res) => {
    try {
        const user = await User.findOne({ username: req.user.username });
        const processedImageID = req.body.processedImageID;
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!processedImageID) {
            return res.status(400).json({ error: 'ImageID is required' });
        }
        const tempDir = path.join(__dirname, './processed_Image');
        const files = await fsPromises.readdir(tempDir);
        const matchingFile = files.find(file => file.startsWith(processedImageID));
        
        if (!matchingFile) {
            return res.status(404).json({ error: 'Processed image not found.' });
        }

        const tempImagePath = path.join(tempDir, matchingFile);

        const imageBuffer = await fsPromises.readFile(tempImagePath);
        const base64Image = imageBuffer.toString('base64');

        const { width, height, size } = await sharp(imageBuffer).metadata();

        const newImage = new Gallery({
            username: req.user.username,
            image: base64Image,
            mimeType: `image/${path.extname(tempImagePath).slice(1)}`,
            size: `${Math.round(size / 1024)} KB`,
            dimensions: `${width} x ${height}`,
        })
        await newImage.save();

        await fsPromises.unlink(tempImagePath);

        res.status(201).json({ message: 'Image saved to gallery!' });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

app.get('/api/gallery', verifyToken, async (req,res) => {
    try {
        const image = await Gallery.find({ username: req.user.username }).select("-username -__v");
        if (image.length === 0) {
            return res.status(404).json({ error: 'No images found for this user' });
        }
        res.status(200).json({ image });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
})

app.get('/api/validate-token', verifyToken, (req, res) => {
    res.json({ 
      isValid: true,
      username: req.user.username
    });
});

app.put('/api/users/favorites', express.json(), verifyToken, async (req, res) => {
    try {
        // Validate request body
        // console.log(req.body)
        if (!req.body._id || typeof req.body.favorite !== 'boolean') {
            return res.status(400).json({ error: 'Invalid request. Both _id and favorite fields are required' });
        }

        // Check if image exists
        const image = await Gallery.findById(req.body._id);
        if (!image) {
            return res.status(404).json({ error: 'Image not found' });
        }

        // Verify ownership (optional but recommended)
        if (image.username !== req.user.username) {
            return res.status(403).json({ error: 'Unauthorized to modify this image' });
        }

        // Update favorite status
        const updatedImage = await Gallery.findByIdAndUpdate(
            req.body._id,
            { favorite: req.body.favorite },
            { new: true } // Return the updated document
        );

        res.json({
            message: `Image ${updatedImage.favorite ? 'added to' : 'removed from'} favorites`,
            image: {
                _id: updatedImage._id,
                favorite: updatedImage.favorite
            }
        });

    } catch (error) {
        console.error('Error updating favorite status:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid image ID format' });
        }
        
        res.status(500).json({ 
            error: 'Failed to update favorite status',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.put('/api/users/title', express.json(), verifyToken, async(req, res) => {
    try {
        // 1. Validate request body
        if (!req.body._id || !req.body.title) {
            return res.status(400).json({ 
                error: 'Both _id and title fields are required' 
            });
        }

        // 2. Check title length
        if (req.body.title.length > 20) {
            return res.status(400).json({ 
                error: 'Title cannot exceed 100 characters' 
            });
        }

        // 3. Find the image and verify ownership
        const image = await Gallery.findById(req.body._id);
        if (!image) {
            return res.status(404).json({ error: 'Image not found' });
        }

        if (image.username !== req.user.username) {
            return res.status(403).json({ error: 'Unauthorized to modify this image' });
        }

        // 4. Update the title
        const updatedImage = await Gallery.findByIdAndUpdate(
            req.body._id,
            { title: req.body.title }, // Trim whitespace
            { new: true} // Return updated doc and run schema validators
        );

        // 5. Send success response
        res.json({
            message: 'Title updated successfully',
            image: {
                _id: updatedImage._id,
                title: updatedImage.title,
                updatedAt: updatedImage.updatedAt
            }
        });

    } catch (error) {
        console.error('Error updating title:', error);
        
        // Handle different error types
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid image ID format' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: 'Validation failed' });
        }
        
        res.status(500).json({ error: 'Failed to update title' });
    }
});

app.delete('/api/nosave',express.json(), verifyToken, async(req,res) => {
    try{
        const processedImageID = req.body.processedImageID;
        if (!processedImageID) {
            return res.status(400).json({ error: 'ImageID is required' });
        }
        const tempDir = path.join(__dirname, './processed_Image');
        const files = await fsPromises.readdir(tempDir);
        const matchingFile = files.find(file => file.startsWith(processedImageID));
        
        if (!matchingFile) {
            return res.status(404).json({ error: 'Processed image not found.' });
        }

        const tempImagePath = path.join(tempDir, matchingFile);
        await fsPromises.unlink(tempImagePath);

        res.status(201).json({ message: 'Image deleted' });
    } catch (error) {
        console.error('Error in /api/nosave:', error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'File not found' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
})

app.listen(5000,()=>{
    console.log('server is listening port 5000')
})

