const Joi = require('joi')
const APIError = require('../utils/apiError.js')
const logger = require("../config/logger.js")

const converter = (err, req, res, next) => {
	if (err instanceof Joi.ValidationError) {
		const errorMessage = err.details.map((d) => {
			return {
				message: d.message,
				location: d.path[1],
				locationType: d.path[0]
			};
		});
		const apiError = new APIError(errorMessage, 400);
		apiError.stack = err.stack;
		return next(apiError);
	} else if (!(err instanceof APIError)) {
		const status = err.status || 500;
		const message = err.message;
		const apiError = new APIError(message, status, false);
		apiError.stack = err.stack;
		apiError.message = [{ message: err.message }];
		return next(apiError);
	}
	err.message = [{ message: err.message }];
	return next(err);
};

const notFound = (req, res, next) => {
	return next(new APIError('404 Not Found', 404));
};

const handler = (err, req, res, next) => {
	let { status, message } = err;
	if (process.env.NODE_ENV === 'production' && !err.isOperational) {
		status = 500;
		message = 'INTERNAL_SERVER_ERROR';
	}
	logger.error(err.stack);
	return res.status(status).json({
		status: status,
		errors: message,
		...(process.env.NODE_ENV === 'development' && { stack: err.stack })
	});
};

module.exports = { converter, notFound, handler };