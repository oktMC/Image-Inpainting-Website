const { spawn } = require('child_process');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fsPromises = require('fs').promises;

exports.processImage = async (req, res) => {
    try {
      console.log("Processing image...");
        
      if (!req.file) {
          return res.status(400).send('No file uploaded');
      }
      const serverRoot = path.join(__dirname, '..');
      const imagePath = req.file.path;
      const mask = req.body.mask;
      const isLoggedIn = JSON.parse(req.body.isLoggedIn);
      const { mode } = req.params;
      const fileExtension = path.extname(req.file.originalname);
      
      const processedImageDir = path.join(serverRoot, 'processed_Image');

      const processedImageId = uuidv4();
      const pythonScriptPath = path.resolve(__dirname, '../../../test.py');
      const outputImagePath = path.join(__dirname, `../processed_Image/${processedImageId}${fileExtension}`);
  
      const python = spawn('python', [pythonScriptPath, imagePath, outputImagePath, mode]);
      python.stdin.write(mask);
      python.stdin.end();
  
      python.stdout.on('data', (data) => {
        console.log(`Python Output: ${data.toString()}`);
      });
  
      python.stderr.on('data', (data) => {
        console.error(`Python Error: ${data.toString()}`);
      });
  
      python.on('close', async (code) => {
        if (code !== 0) {
          console.error(`Python script exited with code ${code}`);
          return res.status(500).send('Failed to process image.');
        }
  
        console.log('Python script executed successfully.');
        const mimeTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
        };
  
        res.setHeader('Content-Type', mimeTypes[fileExtension.toLowerCase()] || 'application/octet-stream');
        res.setHeader('X-Processed-Image-ID', processedImageId);
        
        res.sendFile(outputImagePath, async (err) => {
          if (err) {
            console.error('Error sending file:', err);
            return res.status(500).send('Failed to send file.');
          }
          await fsPromises.unlink(imagePath);
          if (!isLoggedIn) await fsPromises.unlink(outputImagePath);
        });
      });
    } catch (error) {
      console.error('Error processing image:', error);
      res.status(500).send('Failed to process image.');
    }
};