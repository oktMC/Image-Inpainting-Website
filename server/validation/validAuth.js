const Joi = require("joi")

const register = {
	body: Joi.object().keys({
		username: Joi.string().alphanum().min(5).max(66).required(),
		password: Joi.string().trim().min(5).max(666).required(),
	})
};

const login = {
	body: Joi.object().keys({
		username: Joi.string().required(),
		password: Joi.string().required(),
	})
};

module.exports = {
	register,
	login
};