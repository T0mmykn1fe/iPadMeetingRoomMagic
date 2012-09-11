/*
 * MEATIER
 * https://bitbucket.org/aahmed/meat
 *
 * Copyright (c) 2012 Adam Ahmed
 * Licensed under the MIT license.
 */

var port = process.env.C9_PORT || 80;

var clientId = '23835704985.apps.googleusercontent.com';
var clientSecret = "Pj1DAnZGNn8mfHMllmyrcKex";
var datasource = require('./gapps/datasource')(clientId, clientSecret);

datasource.on('error', function(e) {
	console.log('ERROR at ' + (new Date()).toString());
    Array.prototype.forEach.call(arguments, function(arg) {
        console.dir(arg);
    });
    throw e;
});

process.on('uncaughtException', function(err) {
  console.log(err);
});

// If specified, any device wanting to read or write to GApps will need to
// include a secret="{deviceSecret}" query string variable.
var deviceSecret = '';

var app = require('./app')(deviceSecret, datasource);

app.listen(port);
