/*
 * MEATIER
 * https://bitbucket.org/aahmed/meat
 *
 * Copyright (c) 2012 Adam Ahmed
 * Licensed under the MIT license.
 */

var path = require('path');

var express = require("express");

var logStream = require('./logStream');

module.exports = function(options) {
    var secret = options.secret;
    var datasource = options.datasource;
    var logger = options.logger;

    var clientConfig = options.clientConfig;

    function knowsSecret(theirKey) {
        return !secret || secret === theirKey;
    }

    var app = express.createServer();

    app.configure(function() {
        app.set('view engine', 'jade');
        app.set('views', __dirname + '/views');
        app.use(express.logger({ stream : logStream(logger, 'info') }));
        app.use(express['static'](__dirname + "/../public"));
    });

    function checkSecret(req, res, next) {
        if (knowsSecret(req.query.secret)) {
            return next();
        }
        res.redirect('/forbidden');
    }

    app.get('/', function(req, res, next) {
        return res.render('index');
    });

    app.get('/forbidden', function(req, res, next) {
        return res.render('forbidden', { status : 403 });
    });

    app.get('/js/conf.js', function(req, res, next) {
        res.header('Content-Type', 'text/javascript');
        return res.send('var EventManagerConfig = '+JSON.stringify(clientConfig));
    });

    function toJSON(obj) {
        return obj.toJSON();
    }

    app.get('/data/time', function(req, res, next) {
        res.json({
            datetime : new Date().toISOString()
        });
    });

    app.get('/data/rooms', checkSecret, function(req, res, next) {
        var rooms = datasource.rooms().map(toJSON);
        if (req.query.expand) {
            rooms.forEach(function(room) {
                room.events = datasource.events(room.key).map(toJSON);
            });
        }
        res.json({
            rooms : rooms
        });
    });

    app.get('/data/events', checkSecret, function(req, res, next) {
        res.json({
            events : datasource.events(req.query.room).map(toJSON)
        });
    });

    app.post('/data/events', checkSecret, function(req, res, next) {
        var start = req.query.start && new Date(req.query.start);
        var end = req.query.end && new Date(req.query.end);

        datasource.book(req.query.room, start, end, function(err, event) {
            if (err) {
                if (err.status === 'declined') {
                    return res.send(409);
                }
                return next(err);
            }
            res.json(event.toJSON());
        });
    });

    return app; 
};