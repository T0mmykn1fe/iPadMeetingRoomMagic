/*
 * MEATIER
 * https://bitbucket.org/aahmed/meat
 *
 * Copyright (c) 2012 Adam Ahmed
 * Licensed under the MIT license.
 */

var EventEmitter = require('events').EventEmitter;
var open = require('open');
var https = require('https');
var express = require("express");


function wrapEmitter(emitter) {
    return {
        success : function(handler) {
            emitter.on('success', handler);
            return this;
        },
        error : function(handler) {
            emitter.on('error', handler);
            return this;
        }
    };
}

function toQS(obj) {
    var arr = [];
    for(var key in obj) {
        arr.push(key + '=' + obj[key]);
    }
    return arr.join('&');
}

var listenerPort = 60053; // mmm, goose meat.
var redirectUri = 'http://localhost:' + listenerPort;

// oauth response listener
var emitter = new EventEmitter();
var listener;
function ensureListener() {
    if (listener) {
        return;
    }

    listener = express.createServer();
    listener.configure(function() {
        listener.use(express.logger());
    });
    listener.all('/', function(req, res, next) {
        var code = req.query.code;
        if (!code) {
            emitter.emit('error', req.query.state, req.query.error, req);
            res.send('Code not found. See logs for details.', 400);
            return;
        }
        emitter.emit('success', req.query.state, code, req);
        res.send("Thanks! We're authenticated. You can close your browser.", 200);
    });
    listener.on('error', function() {
        console.log('There was an error attaching the OAuth responder on port ' + listenerPort + '. Please ensure you' +
            ' run with priviledges that allow you to listen on that port.');
    });
    listener.listen(listenerPort);
}
function destroyListener() {
    if (!listener) {
        return;
    }
    listener.close();
    listener = null;
}

var nextId = 0;
var requests = {};
var liveRequests = 0;

emitter.on('success', function(id, code, req) {
    if (id in requests) {
        requests[id].emitter.emit('success', code);
        delete requests[id];
        liveRequests--;
    } else {
        // this response either has an old id, or is possibly for some other app.
        // ignore, maybe log it.
        console.log('Unexpected OAuth response received at url: ' + req.url);
    }
    if (!liveRequests) {
        destroyListener();
    }
});
emitter.on('error', function(id, error, req) {
    if (id in requests) {
        requests[id].emitter.emit('error', error || 'Request received without "code" query string parameter.');
        // don't delete this request - they might want to retry.
    } else {
        // this response either has an old id, or is possibly for some other app.
        // ignore, maybe log it.
        console.log('Unexpected OAuth response received at url: ' + req.url);
    }
});


var scopeUrls = {
    "calendar" : "https://www.googleapis.com/auth/calendar"
};
function scopeLookup(scope) { return scopeUrls[scope] || scope; }

function toScopeString(scopes) {
    return !scopes ?
                scopeUrls.calendar :
           !scopes.map ?
                scopes + "" :
            scopes.map(scopeLookup).join('+');
}

exports.getCode = function (clientId, scopes) {
    var id = nextId++;

    open("https://accounts.google.com/o/oauth2/auth?" + toQS({
        response_type : 'code',
        redirect_uri : redirectUri,
        client_id : clientId,
        state : id,
        scope : toScopeString(scopes)
    }));
    liveRequests++;

    ensureListener();

    var emitter = new EventEmitter();

    requests[id] = {
        emitter : emitter
    };

    return wrapEmitter(emitter);
};

function getTokens(postData, beforeSuccess) {
    var emitter = new EventEmitter();

    var req = https.request({
        headers : {
            'content-type': 'application/x-www-form-urlencoded'
        },
        method : 'POST',
        host : "accounts.google.com",
        path : "/o/oauth2/token"
    }, function(res) {
        var data = '';
        res.on('data', function(d) { data += d;});
        res.on('end', function() {
            var json;
            try {
                json = JSON.parse(data);
                if (json && json.access_token) {
                    emitter.emit('success', beforeSuccess(json));
                } else {
                    if (json && json.error) {
                        emitter.emit('error', {
                            message: json.error,
                            requestBody: toQS(postData)
                        });  
                    } else {
                        emitter.emit('error', {
                            message: 'Response format unrecognized',
                            responseBody : json,
                            requestBody: toQS(postData)
                        });    
                    }
                    
                }
            } catch (e) {
                emitter.emit('error', e, data, postData);
            }
        });
    });
    req.setTimeout(20 * 1000, function() {
        req.abort();
        emitter.emit('error', 'Timed out.');
    });
    req.write(toQS(postData));
    req.end();

    return wrapEmitter(emitter);
}

exports.getTokens = function(clientId, clientSecret, code) {
    return getTokens({
        code : code,
        client_id : clientId,
        client_secret : clientSecret,
        redirect_uri : redirectUri,
        grant_type : 'authorization_code'
    }, function(a) { return a; });
};

exports.refreshTokens = function(clientId, clientSecret, tokenData) {
    return getTokens({
        refresh_token : tokenData.refresh_token,
        client_id : clientId,
        client_secret : clientSecret,
        grant_type : 'refresh_token'
    }, function(json) {
        json.refresh_token = tokenData.refresh_token;
        return json;
    });
};