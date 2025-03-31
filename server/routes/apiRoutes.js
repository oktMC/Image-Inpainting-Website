const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');

const { register, login, silentLogin} = require('../controllers/authController');
const { saveImage, getGallery, deleteImage, updateFavorite, updateTitle} = require('../controllers/galleryController');

// Authentication
router.post('/register', express.json(), register);
router.post('/login', express.json(), login);
router.get('/validate-token', verifyToken, silentLogin);

// Gallery
router.post('/save', express.json(), verifyToken, saveImage);
router.get('/gallery', verifyToken, getGallery);
router.delete('/nosave', express.json(), verifyToken, deleteImage);

// User actions
router.put('/users/favorites', express.json(), verifyToken, updateFavorite);
router.put('/users/title', express.json(), verifyToken, updateTitle);

module.exports = router;