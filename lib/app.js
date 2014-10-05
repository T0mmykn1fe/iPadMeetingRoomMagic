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

    // allow regexs, but otherwise JSON.stringify
    function shtringify(obj) {
        if (obj instanceof RegExp) {
            return obj.toString();
        }
        if (obj instanceof Array) {
            return '[' + obj.map(shtringify).join(', ') + ']';
        }
        if (obj != null && typeof obj === 'object') {
            return '{' + Object.keys(obj).map(function(key) {
                return '"' + key + '" : ' + shtringify(obj[key]);
            }).join(', ') + '}';
        }
        return JSON.stringify(obj);
    }

    app.get('/js/conf.js', function(req, res, next) {
        res.header('Content-Type', 'text/javascript');

        return res.send('var EventManagerConfig = ' + shtringify(clientConfig));
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
        var shouldExpand = req.query.expand !== undefined;
        var rooms = (datasource.rooms() || []).map(function(room) {
            return room.toJSON(shouldExpand);
        });
        /*if (req.query.expand !== undefined) {
            rooms.forEach(function(room) {
                room.events = (datasource.events(room.key) || []).map(toJSON);
            });
        }*/
        res.json({
            rooms : rooms
        });
    });

    app.get('/data/events', checkSecret, function(req, res, next) {
        res.json({
            events : (datasource.events(req.query.room) || []).map(toJSON)
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

    app.get('/setup', checkSecret, function(req, res, next) {
        res.redirect('/setup/links');
    });

    app.get('/setup/links', checkSecret, function(req, res, next) {
        var rooms = (datasource.rooms() || []).map(function(room) {
            return {
                key: room.getKey(),
                name: room.getName(),
                url: req.protocol + '://' + req.headers.host + '/?room=' + encodeURIComponent(room.getName())
            };
        });
        return res.render('list', { rooms : rooms });
    });

    return app; 
};