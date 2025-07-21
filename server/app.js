require('dotenv').config();

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser')

const apiRoutes = require('./routes/apiRoutes');
const webRoutes = require('./routes/webRoutes');
const processRoutes = require('./routes/processRoutes');

const passport = require('./config/passport')
const logger = require('./config/logger.js')
const mongooseConnect = require("./config/mongoose")

const requestlogger = require('./middleware/logger');
const error = require('./middleware/error.js')

// mongoose.connect('mongodb://localhost:27017/appdb')
// .then(() => {
//     console.log('Connected to MongoDB');
// })
// .catch((e) => {
//     console.error('Error connecting to MongoDB:', e);
// });
mongooseConnect()
const app = express();

// Static files
app.use(express.static(path.join(__dirname, '../src')));

app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

// Middleware
app.use(requestlogger);

app.use(passport.initialize())

// Routes
app.use('/api', apiRoutes);
app.use('/process', processRoutes);
app.use('/', webRoutes);

//error handler
app.use(error.converter);
app.use(error.notFound);
app.use(error.handler);


app.listen(process.env.PORT || 5000,() =>
    console.log(`Server is listening port ${process.env.PORT}`),
    logger.info(`Server is listening port ${process.env.PORT}`)
)

