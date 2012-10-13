var EventEmitter = require('events').EventEmitter;

function noop() {}

module.exports = function(logger, level) {
    logger = logger || require('winston');
    level = level || 'info';

    function loggerWrite(msg, enc) {
        if (Buffer.isBuffer(msg)) {
            msg = msg.toString(enc);
        }

        var n;
        while(~(n = msg.indexOf('\n'))) {
            logger[level](msg.substring(0, n));
            msg = msg.substring(n + 1);
        }
        if (msg) {
            logger[level](msg);
        }
        loggerStream.emit('drain');
        return false;
    }
    var loggerStream = Object.create(EventEmitter.prototype);
    loggerStream.writeable = true;
    loggerStream.write = loggerStream.end = loggerWrite;
    loggerStream.destroy = loggerStream.destroySoon = noop;

    return loggerStream;
};
