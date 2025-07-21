const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const APIError = require('../utils/apiError');

const register = async (req, res) => {
    const existingUser = await User.findOne({ username: req.body.username });
    if (existingUser) {
      throw new APIError('Username already exists', 400)
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
}

const login = (req, res) => {
    res.json(
      { 
        success: true,
        user: { id: req.user.id, username: req.user.username}
      }
    );
}

const silentLogin = (req, res) => {
    res.json({ 
      isValid: true,
      username: req.user.username
    });
}

module.exports = {register, login, silentLogin}