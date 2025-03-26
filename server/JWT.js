const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    // console.log(token)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      console.log(err)
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Unauthorized: Token expired' });
        }
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
      req.user = decoded;
      next();
    });
};

module.exports = verifyToken