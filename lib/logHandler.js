
var path = require('path');

var winston = require('winston');
var Logger = winston.Logger;

function getLogger(config) {
    return new Logger({
        transports: [
            new winston.transports.Console(),
            new winston.transports.File({
                filename: path.join(config.directories.logs, 'meat.log'),
                maxsize: 10 * 1024 * 1024,
                maxFiles: 3
            })
        ],
        exceptionHandlers: [
            new winston.transports.Console(),
            new winston.transports.File({
                filename: path.join(config.directories.logs, 'meat-exception.log')
            })
        ]
    });
}
function getClientLogger(config) {
    return new Logger({
        transports: [
            new winston.transports.File({
                filename: path.join(config.directories.logs, 'meat-web.log'),
                maxsize: 5 * 1024 * 1024,
                maxFiles: 2
            })
        ]
    });
}

exports.getLogger = getLogger;
exports.getClientLogger = getClientLogger;
