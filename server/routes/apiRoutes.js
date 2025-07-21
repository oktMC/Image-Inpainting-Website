const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const generateToken = require('../middleware/jwtGenerator');
const validate = require('../middleware/validate.js');
const authValidation = require('../validation/validAuth.js')
const passport = require('../config/passport.js')
const catchAsync = require('../utils/catchAsync.js')

const { register, login, silentLogin} = require('../controllers/authController');
const { saveImage, getGallery, deleteImage, updateFavorite, updateTitle, deleteGalleryImage} = require('../controllers/galleryController');

// Authentication
router.post('/register', validate(authValidation.register), catchAsync(register));
router.post('/login', validate(authValidation.login), passport.authenticate('local',{ session: false }), generateToken, login);
router.post('/validate-token', passport.authenticate('jwt', { session: false }), silentLogin);

// Gallery
router.post('/save', passport.authenticate('jwt', { session: false }), saveImage);
router.get('/gallery', passport.authenticate('jwt', { session: false }), getGallery);
router.delete('/nosave', passport.authenticate('jwt', { session: false }), deleteImage);

// User actions
router.put('/users/favorites', passport.authenticate('jwt', { session: false }), updateFavorite);
router.put('/users/title', passport.authenticate('jwt', { session: false }), updateTitle);
router.delete('/users/delete', passport.authenticate('jwt', { session: false }), deleteGalleryImage)

module.exports = router;