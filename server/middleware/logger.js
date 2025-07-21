const logger = require("../config/logger.js")

const requestlogger = (req,res,next) => {
    const method = req.method
    const url = req.url

    logger.info(method + ' ' + url)
    next()
}

module.exports = requestlogger