require('dotenv').config();

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const apiRoutes = require('./routes/apiRoutes');
const webRoutes = require('./routes/webRoutes');
const processRoutes = require('./routes/processRoutes');
const logger = require('./middleware/logger');

mongoose.connect('mongodb://localhost:27017/appdb')
.then(() => {
    console.log('Connected to MongoDB');
})
.catch((e) => {
    console.error('Error connecting to MongoDB:', e);
});

const app = express();

// Middleware
app.use(logger);

// Static files
app.use(express.static(path.join(__dirname, '../src')));

// Routes
app.use('/api', apiRoutes);
app.use('/process', processRoutes);
app.use('/', webRoutes);

app.listen(5000,()=>{
    console.log('server is listening port 5000')
})

