/*
 * MEATIER
 * https://bitbucket.org/aahmed/meat
 *
 * Copyright (c) 2012 Adam Ahmed
 * Licensed under the MIT license.
 */

var path = require('path');
var winston = require('winston');

var logger = new (winston.Logger)({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
      	    filename: path.join(__dirname, '..', 'meat.log')
        })
    ],
    exceptionHandlers: [
        new winston.transports.Console(),
        new winston.transports.File({
        	filename: path.join(__dirname, '..', 'meat-exception.log')
        })
    ]
});

var port = process.env.C9_PORT || 80;

var clientId = '23835704985.apps.googleusercontent.com';
var clientSecret = "Pj1DAnZGNn8mfHMllmyrcKex";
var datasource = require('./gapps/datasource')(clientId, clientSecret, { logger : logger });


datasource.on('error', function(e) {
	logger.error('Datasource error', e);
});

// If specified, any device wanting to read or write to GApps will need to
// include a secret="{deviceSecret}" query string variable.
var deviceSecret = '';

var app = require('./app')(deviceSecret, datasource);

app.listen(port);
