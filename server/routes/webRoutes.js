const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/', (req, res) => {
  res.status(200).sendFile(path.resolve('../src/index.html'));
});

module.exports = router;