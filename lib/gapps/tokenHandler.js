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

    this._access = json.access_token;
    this._refresh = json.refresh_token;
    this._expire = json.expire_date ? new Date(json.expire_date) : new Date(new Date() + ((+json.expires_in) * 1000));
}
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
    return (new Date() + oneMinute) < this._expire;
};
TokenData.prototype.refresh = function(cb) {
    if (this.isFresh()) {
        cb(null, this);
    } else {
        var self = this;
        gauth.refreshTokens(this.clientId, this.clientSecret, this.toJSON()).success(function(tokenJson) {
            TokenData.call(self, this.clientId, this.clientSecret, tokenJson);
            storage.put(storageKey, self.toJSON());
            cb(null, self);
        }).error(function(err) {
            if (cb) {
                cb(err);
            } else {
                throw err;
            }
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
