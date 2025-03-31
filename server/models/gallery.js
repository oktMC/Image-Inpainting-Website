const mongoose = require('mongoose');

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

module.exports = mongoose.model('Gallery', gallerySchema, 'gallery');