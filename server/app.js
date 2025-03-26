require('dotenv').config();

const express = require('express')
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

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
    image: { type: String, required: true },
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
        const {mode} = req.params

        const pythonScriptPath = path.resolve(__dirname, '../../test.py');
        const outputImagePath = path.join(__dirname, `./processed_Image/${req.fileName}_processed${req.fileExtension}`);

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

                res.set('Content-Type', contentType);
                res.sendFile(outputImagePath, (err) => {
                    // Clean up temporary files
                    if (err) {
                        console.error('Error sending file:', err);
                        res.status(500).send('Failed to send file.');
                    } else {
                        fs.unlink(imagePath, () => {});
                        fs.unlink(outputImagePath, () => {});
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

app.post('/api/upload', express.json(), verifyToken, async(req,res) => {
    try {
        const user = await User.findOne({ username: req.user.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (!req.body.image) {
            return res.status(400).json({ error: 'Image data is required' });
        }
        const newImage = new Gallery({
            username: req.user.username,
            image: req.body.image
        })
        await newImage.save();
        res.status(201).json({ message: 'Upload successfully' });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

app.get('/api/gallery', verifyToken, async (req,res) => {
    try {
        const image = await Gallery.find({ username: req.user.username }).select("image");
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

app.listen(5000,()=>{
    console.log('server is listening port 5000')
})

