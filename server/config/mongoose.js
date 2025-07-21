const mongoose = require('mongoose')
const logger  = require('./logger.js')

const mongooseConnect = () => {
	const reconnectTimeout = 5000;

	const connect = () => {
		mongoose.connect(process.env.MONGODB_URI);
	};
	const db = mongoose.connection;

	db.on('connecting', () => {
		logger.info('🚀 Connecting to MongoDB...');
	});

	db.on('error', (err) => {
		logger.error(`MongoDB connection error: ${err}`);
		mongoose.disconnect();
	});

	db.on('connected', () => {
		logger.info('🚀 Connected to MongoDB!');
	});

	db.once('open', () => {
		logger.info('🚀 MongoDB connection opened!');
	});

	db.on('reconnected', () => {
		logger.info('🚀 MongoDB reconnected!');
	});

	db.on('disconnected', () => {
		logger.error(`MongoDB disconnected! Reconnecting in ${reconnectTimeout / 1000}s...`);
		setTimeout(() => connect(), reconnectTimeout);
	});

	connect();
};

module.exports = mongooseConnect;