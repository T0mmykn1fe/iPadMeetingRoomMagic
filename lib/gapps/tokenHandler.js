var EventEmitter = require('events').EventEmitter;

var gauth = require('./gauth');
var storage = require('./storage');

var storageKey = 'auth_tokens';

function getCode(clientId, cb) {
    gauth.getCode(clientId, [ 'calendar' ]).success(function(code) {
        cb(code);
    }).error(function(error) {
        error = error ? "(" + error + ")" : '';
        console.log('Error authenticating' + error + '. Please retry...');
        getCode(clientId, cb);
    });
}

function TokenData(clientId, clientSecret, json) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;

    this.init(json);
}
TokenData.prototype.init = function(json) {
    this._access = json.access_token;
    this._refresh = json.refresh_token;
    this._expire = json.expire_date ?
        new Date(json.expire_date) :
        new Date(new Date().getTime() + ((+json.expires_in) * 1000));
};
TokenData.prototype.getToken = function() { return this._access; };
TokenData.prototype.toJSON = function() {
    return {
        access_token : this._access,
        refresh_token : this._refresh,
        expire_date : +this._expire
    };
};
var oneMinute = 1000 * 60 * 1;
TokenData.prototype.isFresh = function() {
    /*console.log('fresh: ' + (new Date().getTime() + oneMinute) < this._expire.getTime(),
        'expireTime: ' + this._expire, 'currentTime: ' + new Date(new Date().getTime() + oneMinute));*/
    return (new Date().getTime() + oneMinute) < this._expire.getTime();
};
TokenData.prototype.refresh = function(cb) {
    if (this.isFresh()) {
        cb(null, this);
    } else if (this._request) {
        this._request.once('request', cb);
        this._request.once('error', cb);
    } else {
        this._request = new EventEmitter();
        this._request.setMaxListeners(0);
        this._request.once('request', cb);
        this._request.once('error', cb);

        var self = this;
        gauth.refreshTokens(this.clientId, this.clientSecret, this.toJSON()).success(function(tokenJson) {
            self.init(tokenJson);
            storage.put(storageKey, self.toJSON());
            self._request.emit('request', null, self);
            self._request = null;
        }).error(function(err) {
            self._request.emit('error', null, self);
            self._request = null;
        });
    }
};

exports.getTokenData = function(clientId, clientSecret, cb) {
    var tokenJson = storage.get(storageKey);

    if (!tokenJson) {
        getCode(clientId, function(code) {
            gauth.getTokens(clientId, clientSecret, code).success(function(tokenJson) {
                var tokenData = new TokenData(clientId, clientSecret, tokenJson);
                storage.put(storageKey, tokenData.toJSON());
                cb(null, tokenData);
            }).error(function(err) {
                if (cb) {
                    cb(err);
                } else {
                    throw err;
                }
            });
        });
    } else {
        new TokenData(clientId, clientSecret, tokenJson).refresh(cb);
    }
};
