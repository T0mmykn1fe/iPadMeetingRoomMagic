/* Atlassian M.E.A.T.
 * Authors: Adam Ahmed, Martin Jopson, Stephen Russell, Robert Smart
 * (c) 2011 Atlassian Pty Ltd.
 * Atlassian M.E.A.T. may be freely distributed under the MIT Expat license.
 */

var EventManager = (function() {
	var TimeRange = function(start, end) {
		this.start = start;
		this.end = end;
	};
	TimeRange.prototype = {
		toString : function() {
			if (this.start.getDay() == this.end.getDay())
				return this.start.toDateString() + '(' + 
					this.start.getHours() + ':' + this.start.getMinutes() + ' - ' + 
					this.end.getHours() + ':' + this.end.getMinutes() + ')';
			else
				return '(' + this.start.toString() + ' - ' + this.end.toString() + ')';
		},
		intersects : function(dateOrRange) {
			return (dateOrRange instanceof Date) ?
						dateOrRange >= this.start && dateOrRange < this.end :
						dateOrRange.end > this.start && dateOrRange.start < this.end;
		},
		isBefore : function(date) {
			return this.end <= date;
		},
		isAfter : function(date) {
			return this.start > date;
		}
	};
	TimeRange.sorter = function(a, b) {
		return a.start < b.start ? -1 :
				a.start > b.start ? 1 :
				a.end < b.end ? -1 :
				a.end > b.end ? 1 :
				0;
	};

	function CalendarEvent(eventJson, room) {
		TimeRange.call(this, new Date(eventJson.start), new Date(eventJson.end));

		this._title = eventJson.title || 'Unnamed Event';
		this._organizer = eventJson.organizer;
		this._room = room;
	}
	$.extend(CalendarEvent.prototype, TimeRange.prototype, {
		conflictsWith : function (date) {
			return this.intersects(date);
		},
		includesRoom : function(roomName) {
			return roomName === this._room.name();
		},
		nextNonConflict : function (afterDate) {
			if (this.intersects(afterDate)) {
				return this.end;
			}
			return afterDate;
		},
		toString : function() {
			return this._title + "(" + TimeRange.prototype.toString.call(this) + ")";
		},
		title : function() { return this._title; },
		organizer : function() { return this._organizer; }
	});
	CalendarEvent.getEvents = function (eventJsonArr) {
		var events = [];
		for (var i = 0; i < eventJsonArr.length; i++) {
			events.push(new CalendarEvent(eventJsonArr[i]));
		}
		return events;
	};
	CalendarEvent.sorter = TimeRange.sorter;

	var Room;
	(function() {
		Room = function (roomJson) {
			var _events;
			var _loaded = false;

			this._meta = roomJson;

			this.loaded = function() { return _loaded; };

			this.events = function() { return _events; };

			this.load = function(callback) {
				if (!_loaded) {
					this.reload(callback);
				} else {
					callback && callback();
				}
			};
			var thisRoom = this;
			this.reload = function(callback) {
				EventManager.getRoomEvents(this, function(res) {
					try {
						_events = CalendarEvent.getEvents(res.events);
						_events.sort(CalendarEvent.sorter);
						thisRoom._nextFreeTimeCache = {};
						thisRoom._nextEventCache = {};
						_loaded = true;
						callback && callback();
					} catch (e) {
						Logger.log("Error during reload.", e);
					}
				}, function (ret) { Logger.log('Error loading room', ret); });
			};

			this._nextFreeTimeCache = {};
			this._nextEventCache = {};
		};
		function getNextEventCacheObj(afterDate, room) {
			var dateObj = afterDate || DebugSettings.now() || new Date();

			if (room._nextEventCache[dateObj]) {
				return room._nextEventCache[dateObj];
			}

			if (!room.loaded()) {
				Logger.log('Room not loaded.');
			}

			var minDate = null, minDateEvent = null;
			for (var i = 0, events = room.events(), l = events.length; i < l; i++) {
				var event = events[i];
				if (event.isBefore(afterDate)) {
					continue;
				}

				minDateEvent = event;
				minDate = event.isAfter(afterDate) ? event.start : afterDate;
				break;
			}

			room._nextEventCache[dateObj] = { event: minDateEvent, date: minDate };
			return room._nextEventCache[dateObj];
		}

		Room.prototype = {
			id : function() { return this._meta.key; },
			name : function() { return this._meta.name; },
			simpleName : EventManagerConfig.removeRegex && EventManagerConfig.removeRegex.test ?
				function() { return this.name().replace(EventManagerConfig.removeRegex, ''); } :
				function() { return this.name(); },
			isBooked : function (dateToCheck) {
				var dateObj = dateToCheck || DebugSettings.now() || new Date();

				if (!this.loaded()) {
					Logger.log('Room not loaded.');
				}

				for (var i = 0; i < this.events().length; i++) {
					if(this.events()[i].conflictsWith(dateObj)) {
						return true;
					}
				}
				return false;
			},
			upcomingBookings : function(afterDate) {
				var dateObj = afterDate || DebugSettings.now() || new Date();
				var events = this.events().slice();
				while(events.length && events[0].isBefore(dateObj)) {
					events.shift();
				}
				
				return events;
			},
			nextEvent : function (afterDate) {
				return getNextEventCacheObj(afterDate, this).event;
			},
			nextEventTime : function (afterDate) {
				return getNextEventCacheObj(afterDate, this).date;
			},
			nextFreeTime : function (afterDate) {
				var dateObj = afterDate || DebugSettings.now() || new Date();

				if (this._nextFreeTimeCache[dateObj]) {
					return this._nextFreeTimeCache[dateObj];
				}

				if (!this.loaded()) {
					Logger.log('Room not loaded.');
				}

				var maxofMinFreeDates = new Date(dateObj);
				for (var i = 0; i < this.events().length; i++) {
					var minFreeDate = this.events()[i].nextNonConflict(dateObj);
					if(minFreeDate > maxofMinFreeDates) {
						maxofMinFreeDates = minFreeDate;
					}
				}

				this._nextFreeTimeCache[dateObj] = maxofMinFreeDates;
				return maxofMinFreeDates;
			},
			toAllEventsString : function() {
				return this.events().join(', ');
			},
			toBookedTimesString : function() {
				return this.events().join(', ');
			},
			getBookedTimesToday : function() {
				var now = DebugSettings.now() || new Date(),
					today = new TimeRange(
								new Date(now.getFullYear(), now.getMonth(), now.getDate()),
								new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
				return $.map(
							this.events(),
							function(timeRange) {
								return timeRange.intersects(today) ? timeRange : null;
							}
						);
			}
		};
	})();

	var shouldShowRoom = 
		!EventManagerConfig.roomsToShow ?
			function(name) {
				return true;
			} :
		$.isArray(EventManagerConfig.roomsToShow) ?
			function(name) {
				for(var i = 0, l = EventManagerConfig.roomsToShow.length; i < l; i++) {
					if (EventManagerConfig.roomsToShow[i] === name) {
						return true;
					}
				}
				return false;
			} :
		EventManagerConfig.roomsToShow.test ?
			function(name) {
				EventManagerConfig.roomsToShow.lastIndex = 0;
				return EventManagerConfig.roomsToShow.test(name);
			} :
		Logger.log('EventManagerConfig.roomsToShow must be falsy, an Array of strings, or a RegExp object.');
	
	Room.getRooms = function(roomJsonArr) {
		var rooms = [];
		for (var i = 0; i < roomJsonArr.length; i++) {
			var roomJson = roomJsonArr[i];
			if (shouldShowRoom(roomJson.name)) {
				rooms.push(new Room(roomJson));
			}
		}
		return rooms;
	};

	return new (function () {
		var url;

		var roomsByName;
		var roomsById;
		
		this.init = function(rootUrl, callback) {
			url = rootUrl;
			getRooms(function(res){
				EventManager.rooms = Room.getRooms(res.rooms);
				roomsByName = {};
				roomsById = {};
				
				for(var i = 0; i < EventManager.rooms.length; i++) {
					var currRoom = EventManager.rooms[i];
					roomsByName[currRoom.name()] = currRoom;
					roomsById[currRoom.id()] = currRoom;
				}
				
				callback();
			}, function(err) { Logger.log('GetAvailableCalendars error', err); });
		};
		
		function getRooms(onSuccess, onError) {
			return $.ajax({
				url : url + 'data/rooms',
				dataType : 'json',
				success : onSuccess,
				error : onError
			});
		}

		function getEvents(roomKey, onSuccess, onError) {
			return $.ajax({
				url : url + 'data/events?room=' + roomKey,
				dataType : 'json',
				success : onSuccess,
				error : onError
			});
		}

		function bookRoom(roomKey, startTimeISO, endTimeISO, onSuccess, onError) {
			return $.ajax({
				type: 'POST',
				url : url + 'data/events?room=' + roomKey + '&start=' + startTimeISO + '&end=' + endTimeISO,
				dataType : 'json',
				success : onSuccess,
				error : onError
			});
		}
		
		this.getRoom = function (roomName) {
			return roomsByName[roomName];
		};
		this.getRoomById = function (roomId) {
			return roomsById[roomId];
		};
		
		this.getRoomEvents = function(room, onSuccess, onError) {
			return getEvents(room.id(), onSuccess, onError);
		};
		
		this.bookRoom = function(room, startTime, durationMinutes, onSuccess, onError) {
			var endTime = new Date(startTime);
			endTime.setMinutes(startTime.getMinutes() + durationMinutes);
			
			return bookRoom(room.id(), startTime.toISOString(), endTime.toISOString(), onSuccess, onError);
		};
	})();
})();