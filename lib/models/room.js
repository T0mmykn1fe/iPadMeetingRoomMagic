function Room(key, name) {
    this._key = key;
    this._name = name;
    this._events = [];
}
Room.prototype.getKey = function() { return this._key; };
Room.prototype.getName = function() { return this._name; };
Room.prototype.getEvents = function() { return this._events; };

Room.prototype.setEvents = function(events) {
    this._events = events;
};
Room.prototype.addEvent = function(event) {
    this._events.push(event);
    this._events.sort(function(a, b) {
        return (a._start - b._start) || (a._end - b._end);
    });
};
Room.prototype.toJSON = function(expand) {
    return expand ? {
        key : this._key,
        name : this._name,
        events : this._events.map(function(event) { return event.toJSON(); })
    } : {
        key : this._key,
        name : this._name
    };
};

Room.hasKey = function(key, room) {
    if (room) {
        return key === room.getKey();
    }
    return function (room) {
        return key === room.getKey();
    };
};

module.exports = Room;
