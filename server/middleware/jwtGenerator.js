const jwt = require('jsonwebtoken');

const generateToken = (req, res, next) => {
  try {
    const token = jwt.sign({
            sub: req.user._id,               
            iat: Math.floor(Date.now() / 1000), 
            exp: Math.floor(Date.now() / 1000) + 60 * 60, 
    }, process.env.JWT_SECRET);

    res.cookie('jwt', token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000,
    });
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = generateToken;