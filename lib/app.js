/*
 * MEATIER
 * https://bitbucket.org/aahmed/meat
 *
 * Copyright (c) 2012 Adam Ahmed
 * Licensed under the MIT license.
 */

var express = require("express");

module.exports = function(secret, datasource) {

    function knowsSecret(theirKey) {
        return !secret || secret === theirKey;
    }

    var app = express.createServer();

    app.configure(function() {
        app.set('view engine', 'jade');
        app.set('views', __dirname + '/views');
        app.use(express.logger());
        app.use(express['static'](__dirname + "/../public"));
    });

    function checkSecret(req, res, next) {
        if (knowsSecret(req.params.secret)) {
            return next();
        }
        res.redirect('/forbidden');
    }

    app.get('/', function(req, res, next) {
        return res.render('index');
    });

    app.get('/forbidden', function(req, res, next) {
        return res.render('forbidden');
    });

    app.use('/data', checkSecret);

    function toJSON(obj) {
        return obj.toJSON();
    }

    app.get('/data/time', function(req, res, next) {
        res.json({
            datetime : new Date().toISOString()
        });
    })

    app.get('/data/rooms', function(req, res, next) {
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

    app.get('/data/events', function(req, res, next) {
        console.log(req.query.room);
        res.json({
            events : datasource.events(req.query.room).map(toJSON)
        });
    });

    app.post('/data/events', function(req, res, next) {
        var start = req.query.start && new Date(req.query.start);
        var end = req.query.end && new Date(req.query.end);

        datasource.book(req.query.room, start, end, next);
    }, function(req, res, next) {
        res.send(204);
    });

    return app; 
};