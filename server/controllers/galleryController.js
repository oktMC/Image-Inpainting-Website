const path = require('path');
const fsPromises = require('fs').promises;
const sharp = require('sharp');
const Gallery = require('../models/gallery');
const User = require('../models/user');

exports.saveImage = async (req, res) => {
    try {
      const user = await User.findOne({ username: req.user.username });
      const processedImageID = req.body.processedImageID;
      
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (!processedImageID) return res.status(400).json({ error: 'ImageID is required' });
  
      const tempDir = path.join(__dirname, '../processed_Image');
      const files = await fsPromises.readdir(tempDir);
      const matchingFile = files.find(file => file.startsWith(processedImageID));
      
      if (!matchingFile) return res.status(404).json({ error: 'Processed image not found.' });
  
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
      });
  
      await newImage.save();
      await fsPromises.unlink(tempImagePath);
      res.status(201).json({ message: 'Image saved to gallery!' });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
};
  
exports.getGallery = async (req, res) => {
    try {
      const images = await Gallery.find({ username: req.user.username }).select("-username -__v");
      if (images.length === 0) {
          return res.status(404).json({ error: 'No images found for this user' });
      }
      res.status(200).json({ images });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteImage = async (req, res) => {
    try {
      const processedImageID = req.body.processedImageID;
      if (!processedImageID) return res.status(400).json({ error: 'ImageID is required' });

      const tempDir = path.join(__dirname, '../processed_Image');
      const files = await fsPromises.readdir(tempDir);
      const matchingFile = files.find(file => file.startsWith(processedImageID));
      
      if (!matchingFile) return res.status(404).json({ error: 'Processed image not found.' });

      const tempImagePath = path.join(tempDir, matchingFile);
      await fsPromises.unlink(tempImagePath);

      res.status(200).json({ message: 'Image deleted' });
    } catch (error) {
      console.error('Error deleting image:', error);
      if (error.code === 'ENOENT') {
          res.status(404).json({ error: 'File not found' });
      } else {
          res.status(500).json({ error: 'Internal server error' });
      }
    }
};

exports.updateFavorite = async (req, res) => {
  try {
    if (!req.body._id || typeof req.body.favorite !== 'boolean') {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const image = await Gallery.findById(req.body._id);
    if (!image) return res.status(404).json({ error: 'Image not found' });
    if (image.username !== req.user.username) return res.status(403).json({ error: 'Unauthorized' });

    const updatedImage = await Gallery.findByIdAndUpdate(
      req.body._id,
      { favorite: req.body.favorite },
      { new: true }
    );

    res.json({
      message: `Image ${updatedImage.favorite ? 'added to' : 'removed from'} favorites`,
      image: {
        _id: updatedImage._id,
        favorite: updatedImage.favorite
      }
    });
  } catch (error) {
    console.error('Error updating favorite:', error);
    if (error.name === 'CastError') return res.status(400).json({ error: 'Invalid image ID' });
    res.status(500).json({ error: 'Failed to update favorite' });
  }
};

exports.updateTitle = async (req, res) => {
  try {
    if (!req.body._id || !req.body.title) {
      return res.status(400).json({ error: 'Both _id and title are required' });
    }
    if (req.body.title.length > 20) {
      return res.status(400).json({ error: 'Title cannot exceed 20 characters' });
    }

    const image = await Gallery.findById(req.body._id);
    if (!image) return res.status(404).json({ error: 'Image not found' });
    if (image.username !== req.user.username) return res.status(403).json({ error: 'Unauthorized' });

    const updatedImage = await Gallery.findByIdAndUpdate(
      req.body._id,
      { title: req.body.title.trim() },
      { new: true }
    );

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
    if (error.name === 'CastError') return res.status(400).json({ error: 'Invalid image ID' });
    if (error.name === 'ValidationError') return res.status(400).json({ error: 'Validation failed' });
    res.status(500).json({ error: 'Failed to update title' });
  }
};

exports.deleteGalleryImage = async (req, res) => {
  try {
    if (!req.body._id) {
      return res.status(400).json({ error: 'Image ID is required' });
    }

    const image = await Gallery.findOne({ 
      _id: req.body._id,
      username: req.user.username 
    });

    if (!image) { return res.status(404).json({ error: 'Image not found', }) }

    await Gallery.deleteOne({ _id: req.body._id });

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      deletedId: req.body._id
    });

  } catch (error) {
    console.error('Delete error:', error);
    // Handle different error types
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    res.status(500).json({error: 'Server error during deletion'});
  }
};