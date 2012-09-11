
var token = require('./tokenHandler');
var gcal = require('./gcal');


var Room = require('../models/room');
var Event = require('../models/event');
function wrapGRoom(gcalendar) {
    return new Room(gcalendar.id, gcalendar.summary);
}
function gtimeToDate(gtime, options) {
    if (gtime.dateTime) {
        return new Date(gtime.dateTime);
    }
    if (gtime.date) { // all day
        var date = new Date(gtime.date);
        date.setUTCHours(options.leading ? 0 : 23);
        date.setUTCMinutes(options.leading ? 0 : 59);
        date.setUTCSeconds(options.leading ? 0 : 59);
        date.setUTCMilliseconds(options.leading ? 0 : 999);

        //TODO - which timezone? Need to shift the day to match.
        var timezone = gtime.timeZone || options.defaultTimezone;
        //date.add(timezone.gettimezoneoffset());

        return date;
    }
    console.log('gTime object not recognized:');
    console.log(gtime);
}
function wrapGEvent(gevent, fallbackTimezone) {
    return new Event(
        gevent.summary,
        gevent.organizer.displayName,
        gtimeToDate(gevent.start, { leading: true, defaultTimezone: fallbackTimezone }),
        gtimeToDate(gevent.end, { leading: false, defaultTimezone: fallbackTimezone })
    );
}



var defaultUpdateSeconds = 60 * 10;

function Datasource(options) {
    this._loadedAny = false;
    this._periodSeconds = defaultUpdateSeconds;
    this._rooms = [];

    this._roomFilter = options && options.roomFilter || function (calendarJson) {
        if (/@resource.calendar.google.com$/.test(calendarJson.id)) {
            return true;
        }
    };
}
Datasource.prototype = new (require('events').EventEmitter)();

Datasource.prototype.setTokenData = function(tokenData) {
    this.gcal = gcal(tokenData);
    this.emit('authenticated');
    var self = this;
    this.updateRooms(this.enable.bind(this));
};

Datasource.prototype.setUpdatePeriod = function(seconds) {
    this._periodSeconds = seconds;
};

function roomIndexForKey(ds, key) {
    var i = -1;
    ds._rooms.some(function(room, index) {
        if (room.getKey() === key) {
            i = index;
            return true;
        }
    });
    return i;
}
Datasource.prototype.updateRooms = function(cb) {
    var self = this;
    this.gcal.getRooms(function(err, res) {
        if (err) {
            self.emit('error', err);
            cb(err);
            return;
        }
        if (!res || !res.items) {
            self.emit('error', {
                message : 'Unrecognized response.',
                responseBody : res
            });
            return;
        }

        var oldRooms = self._rooms;
        var newRooms = res.items.filter(self._roomFilter).map(wrapGRoom);

        // use all the new room data, but migrate over any event data so we don't lose it needlessly.
        newRooms.forEach(function(newRoom) {
            var oldRoomIndex = roomIndexForKey(self, newRoom.getKey());
            if (~oldRoomIndex) {
                newRoom.setEvents(self._rooms[oldRoomIndex].getEvents());
            }
        });
        self._rooms = newRooms;
        cb();
    });
};

Datasource.prototype.load = function(cb) {
    var self = this;
    var cnt = 0;
    var gcal = this.gcal;
    this._rooms.forEach(function(room) {
        cnt++;
        gcal.getUpcomingEvents(room.getKey(), function(err, res) {
            cnt--;

            if (err) {
                self.emit('error', err);
                cb(err);
                return;
            }
            if (!res || (!res.items && !res.kind)) {
                self.emit('error', {
                    message : 'Unrecognized response.',
                    responseBody : res
                });
                return;
            }

            room.setEvents(res.items ? res.items.filter(function(gevent) {
                var attendees = gevent.attendees || [];
                var keep = gevent.status === 'confirmed' && attendees.some(function(attendee) {
                    // since we asked for events in this room, the room attendee is self=true.
                    // We need to check that the room accepted the event and filter it out otherwise.
                    return attendee.self && attendee.responseStatus === 'accepted';
                });
                return keep;
            }).map(function(gevent) {
                return wrapGEvent(gevent, res.timeZone);
            }) : []);

            if (!cnt) {
                cb();
            }
        });
    });
};

function beginUpdates(ds, intervalMs) {
    if (ds.enabled) {
        ds.load(function() {
            setTimeout(function() { beginUpdates(ds, intervalMs); }, intervalMs);
        });
    } else {
        ds.disabling = false;
    }
}

Datasource.prototype.enable = function() {
    if (!this.gcal) {
        return;
    }

    // don't start a new loop if we're already enabled or if we disabled and reenabled fast enough that
    // the update loop wasn't interrupted.
    var requiresRestart = !this.enabled && !this.disabling;
    
    this.disabling = false;
    this.enabled = true;

    if (requiresRestart) {
        beginUpdates(this, this._periodSeconds * 1000);
    }
};
Datasource.prototype.disable = function() {
    this.disabling = this.enabled;
    this.enabled = false;
};

Datasource.prototype.rooms = function() {
    return this._rooms;
};
Datasource.prototype.events = function(roomKey) {
    var events;
    this._rooms.forEach(function(room) {
        if (room.getKey() === roomKey) {
            events = room.getEvents();
        }
    });
    return events || [];
};

function roomResponse(gevent, roomKey) {
    var response;
    gevent.attendees.some(function(attendee) {
        return attendee.email === roomKey && (response = attendee.responseStatus);
    });
    return response;
}
function pollForConfirmation(ds, roomKey, eventId, cb) {
    ds.gcal.getEvent(roomKey, eventId, function(err, gevent) {
        var response = roomResponse(gevent, roomKey);
        if (response !== 'needsAction') {
            cb(null, gevent);
        } else {
            pollForConfirmation(ds,roomKey, eventId, cb);
        }
    });
}

Datasource.prototype.book = function(roomKey, startDate, endDate, cb) {
    var index = roomIndexForKey(this, roomKey);
    var self = this;
    if (~index) {
        this.gcal.book(roomKey, startDate, endDate, function(err, gevent) {
            if (err) {
                return cb(err);
            }
            if (!gevent.start) {
                return cb(gevent);
            }

            pollForConfirmation(self, roomKey, gevent.id, function(err, gevent) {
                var keep = gevent.status === 'confirmed' && gevent.attendees.some(function(attendee) {
                    // We need to check that the room accepted the event and filter it out otherwise.
                    return attendee.email === roomKey && attendee.responseStatus === 'accepted';
                });

                var event = wrapGEvent(gevent);
                    
                if (keep) {
                    var index = roomIndexForKey(self, roomKey);
                    if (~index) {
                        self._rooms[index].addEvent(event);
                    }
                    cb(null, event);
                } else {
                    cb({
                        status: 'declined',
                        event : event
                    });
                }
            });
        });   
    } else {
        cb(new Error('Room not found.'));
    }
};


module.exports = function(clientId, clientSecret, options) {
    var ds = new Datasource(options);

    token.getTokenData(clientId, clientSecret, function(err, tokenData) {
        if (err) {
            ds.emit('error', err);
            return;
        }

        ds.setTokenData(tokenData);
    });

    return ds;
};