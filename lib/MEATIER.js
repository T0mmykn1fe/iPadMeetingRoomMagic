/*
 * MEATIER
 * https://bitbucket.org/aahmed/meat
 *
 * Copyright (c) 2012 Adam Ahmed
 * Licensed under the MIT license.
 */

var path = require('path');

var winston = require('winston');
var extend = require('node.extend');

var configHandler = require('./configHandler');
var logHandler = require('./logHandler');

var config = configHandler.getConfiguration();

var logger, clientLogger, datasource;

function getDatasource(config, logger) {
	var datasourceName = config.options.datasource;
	var datasourceConfig = extend(true, {
		logger : logger,
		dataDirectory :  path.join(config.directories.data, datasourceName),
		roomFilter : config.options.rooms.filter
	}, config.options[datasourceName]);

	if (datasourceName === 'gapps') {
		return require('./' + datasourceName + '/datasource')(datasourceConfig);	
	} else {
		throw new Error('Google Apps (gapps) is currently the only supported datasource.');
	}	
}

logger = logHandler.getLogger(config);
clientLogger = logHandler.getClientLogger(config);
datasource = getDatasource(config, logger);

datasource.on('error', function(e) {
	logger.error('Datasource error', e);
});

var app = require('./app')({
		secret : config.options.deviceSecret,
		datasource : datasource,
		logger : clientLogger,
		clientConfig : extend(true, {
			bookingParameters : config.options.booking,
			removeRegex : config.options.rooms.noDisplayRegex
		}, config.options.client)
	});

app.listen(config.options.server.port || process.env.C9_PORT || 80);