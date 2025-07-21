const Joi = require("joi")
const _ = require('lodash')

const validate = (schema) => (req, res, next) => {
	console.log(req.body)
	const validSchema = _.pick(schema, ['params', 'query', 'body']);
	const object = _.pick(req, Object.keys(validSchema));
	const { error, value } = Joi.compile(validSchema)
		.prefs({ errors: { label: 'path', wrap: { label: false } }, abortEarly: false })
		.validate(object);
	if (error) {
		return next(error);
	}
	Object.assign(req, value);
	return next();
};

module.exports = validate;