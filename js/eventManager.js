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
					dateOrRange >= this.start && dateOrRange <= this.end :
					dateOrRange.end >= this.start && dateOrRange.start <= this.end;
	},
	isBefore : function(date) {
		return this.end <= date;
	},
	isAfter : function(date) {
		return this.start > date;
	}
};
TimeRange.create = function(gTime) {
	return new TimeRange(
		gTime.getStartTime().getDate(),
		gTime.getEndTime().getDate());
};
TimeRange.sorter = function(a, b) {
	return a.start < b.start ? -1 :
			a.start > b.start ? 1 :
			0;
};

var CalendarEvent;
(function() {
	function mapToAuthorStrings(author) {
		return author && author.getName() ? author.getName().getValue() : undefined;
	}
	CalendarEvent = function (evtEntry) {
		this._entry = evtEntry;
		this._times = $.map(evtEntry.getTimes(), TimeRange.create);
		var titleObj = evtEntry.getTitle();
		this._title = titleObj ? titleObj.getText() : "";
		this._status = evtEntry.getEventStatus().getValue();
		this._show = google.gdata.EventStatus.VALUE_CANCELED != this._status;
		this._authorStr = $.map(evtEntry.getAuthors(), mapToAuthorStrings).join( "; ");
	};
})();
CalendarEvent.prototype = {
	recurs : function () {
		return this._entry.getRecurrence();
	},
	conflictsWith : function (date) {
        if (this._show) {
            for (var i = 0; i < this._times.length; i++) {
                if (this._times[i].intersects(date)) {
                    return true;
                }
            }
        }
		return false;
	},
	//ASSUME: occurences are in chronological order.
	nextOccurenceTime : function (afterDate) {
        if (this._show) {
            for (var i = 0; i < this._times.length; i++) {
                var occurrence = this._times[i];
                if (occurrence.isAfter(afterDate)) {
                    return occurrence.start;
                }
                if (occurrence.isBefore(afterDate)) {
                    continue;
                }
                //conflicts
                return afterDate;
            }
        }
		return null;
	},
	//ASSUME: occurences are in chronological order.
	nextNonConflict : function (afterDate) {
        if (this._show) {
            for (var i = 0; i < this._times.length; i++) {
                var occurrence = this._times[i];
                if (occurrence.isAfter(afterDate)) {
                    return afterDate;
                }
                if (!occurrence.isBefore(afterDate)) {
                    //the current afterDate conflicts with this occurence.  Move it to after this event.
                    afterDate = occurrence.end;
                }
            }
        }
		return afterDate;
	},
	toString : function() {
		return '"' + this._title + '"(' + this._status + '):[' + this._times.join(', ') + ']';
	},
    title : function() { return this._title; },
    organizer : function() { return this._authorStr; }
};
CalendarEvent.getEvents = function (feed) {
	var events = [];
	var entries = feed.feed.entry;
	for (var i = 0; i < entries.length; i++) {
		events[events.length] = new CalendarEvent(entries[i]);
	}
	return events;
};

var Calendar = function (calEntry) {
	this._entry = calEntry;
	var titleObj = calEntry.getTitle();
	this.title = titleObj ? titleObj.getText() : "";
	this.eventFeedLink = calEntry.getEventFeedLink().getHref();
	this.id = this.eventFeedLink.replace(new RegExp('https://www.google.com/calendar/feeds/|/private/full', 'g'), '');
	this.decodedId = decodeURIComponent(this.id);
}
Calendar.isValid = function(entry) {
	return !!entry.getEventFeedLink();
};
Calendar.getCalendars = function (feed) {
	var calendars = [];
	var entries = feed.feed.entry;
	for (var i = 0; i < entries.length; i++) {
		if (Calendar.isValid(entries[i])) {
			calendars[calendars.length] = new Calendar(entries[i]);
		}
	}
	return calendars;
};

var Room;
(function() {
    Room = function (calendar) {
        var _events;
        var _loaded = false;

        this.calendar = function() { return calendar; };
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
            EventManager.getRoomEvents(this, function(root) {
                try {
                    _events = CalendarEvent.getEvents(root);
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
            var minOccurenceDate = event.nextOccurenceTime(dateObj);
            if(minOccurenceDate && (minOccurenceDate < minDate || !minDate)) {
                minDate = minOccurenceDate;
                minDateEvent = event;
            }
        }

        room._nextEventCache[dateObj] = { event: minDateEvent, date: minDate };
        return room._nextEventCache[dateObj];
    }

    Room.prototype = {
        id : function() { return this.calendar().id; },
        decodedId : function() { return this.calendar().decodedId; },
        name : function() { return this.calendar().title; },
        simpleName : EventManagerConfig.removeRegex && EventManagerConfig.removeRegex.test ?
            function() { return this.calendar().title.replace(EventManagerConfig.removeRegex, ''); } :
            function() { return this.calendar().title; },
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
            //read-only copy
            var events = function(){};
            events.prototype = this.events();
            events = new events();

            return events.join(', ');
        },
        toBookedTimesString : function() {
            var times = [],
                events = this.events();
            for (var i = 0; i < events.length; i++) {
                times.push.apply(times, events[i]._times);
            }
            times.sort(TimeRange.sorter);
            return times.join(', ');
        },
        getBookedTimesToday : function() {
            var now = DebugSettings.now() || new Date(),
                today = new TimeRange(
                            new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                            new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
            return $.map(
                        $.map(
                            this.events(),
                            function(evt) { return evt._times; }
                        ),
                        function(timeRange) {
                            return timeRange.intersects(today) ? timeRange : null;
                        }
                    );
        }
    };
})();

Room.roomIdTest = /.*resource\.calendar\.google\.com/;
Room.filteredTest = 
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
			return EventManagerConfig.roomsToShow.test(name);
		} :
	Logger.log('EventManagerConfig.roomsToShow must be falsy, an Array of strings, or a RegExp object.');
Room.isRoom = function(calendar) {
	return Room.roomIdTest.test(calendar.id) && Room.filteredTest(calendar.title);
};
Room.getRooms = function(calendars) {
	var rooms = [];
	for (var i = 0; i < calendars.length; i++) {
		var calendar = calendars[i];
		if (Room.isRoom(calendar)) {
			rooms.push(new Room(calendar));
		}
	}
	return rooms;
};

var EventManager = new (function () {
	var calendarService, calendarToken;
	
	this.calendarToken = function() { return calendarToken; };
	this.setCalendarToken = function(value) { calendarToken = value; };
	this.calendarService = function() { return calendarService; };
	this.setCalendarService = function(value) { calendarService = value; };
	
	this.scope = function () { return 'https://www.google.com/calendar/feeds/'; };
	
	var Authenticator = {
		loginWithAuthSub : function(callback) {
			if (google.accounts.user.checkLogin(EventManager.scope())) {
				EventManager.setCalendarToken(google.accounts.user.login(EventManager.scope(), { hd: 'atlassian.com'}));
				EventManager.setCalendarService( new google.gdata.calendar.CalendarService('Atlassian Meeting Rooms') );
				
				callback();
			}
			else {
				if (google.accounts.user.getStatus() == google.accounts.AuthSubStatus.LOGGING_IN) {
					return;
				}
				else if (google.accounts.user.getStatus() == google.accounts.AuthSubStatus.LOGGED_OUT) {
					google.accounts.user.login(EventManager.scope(), { hd: 'atlassian.com'});
				}
			}
		},
		 loginWithCredentials : function(callback) {
			throw "Not Implemented";
			
			$('<div style="position: fixed; bakcground-color: rgba(0,0,0,0,3); top: 0px; left: 0px; bottom: 0px; right: 0px; z-index: 10000;">&nbsp;</div>' +
			'<div id="loginPopup" style="position: fixed; top: 100px; margin: 0px auto; width: 400px; height: 300px; z-index: 10001;">' +
				'<form>' +
					'<label for="username">Username</label>: <input type="text" id="username" name="username" /><br />' +
					'<label for="username">Username</label>: <input type="password" id="password" name="password />' +
					'<input type="submit" name="login" id="login" value="Login" />' +
				'</form>' +
			'</div>').appendTo(document.body);
			
			$('#loginPopup > form').submit(function() {	
				EventManager.setCalendarService( new google.gdata.calendar.CalendarService('Atlassian Meeting Rooms') );
				EventManager.calendarService().setUserCredentials($('#username').val(), $('#password').val(), google.gdata.client.ClientLoginAccountType.HOSTED);
				callback();
			});
		}
	};
	
	var readyToInit = false;
	var runInitASAP = false;
	var currentRoomName;
	var roomsByName;
	var roomsById;
	
	if (!google.gdata) {
		google.load("gdata", "2.s", {
			callback : function() {
                    try {
                        google.gdata.onLoad();
                        readyToInit = true;

                        if (runInitASAP) {
                            EventManager.init();
                        }
                    } catch (e) {
                        Logger.log("Google load error", err);
                    }
				},
			packages : ['calendar']
			});
	}
	
	var initCallbacks = [];
	this.init = function(callback) {
		
		if (callback) initCallbacks.push(callback);
		
		if (readyToInit) {
			var afterLogin = function() {
				EventManager.inited = true;
				
				EventManager.getAvailableCalendars(function(feed){
					EventManager.calendars = Calendar.getCalendars(feed);
					EventManager.screenCalendar = EventManager.calendars[0];
					EventManager.rooms = Room.getRooms(EventManager.calendars);
					roomsByName = {};
					roomsById = {};
					
					for(var i = 0; i < EventManager.rooms.length; i++) {
						var currRoom = EventManager.rooms[i];
						roomsByName[currRoom.name()] = currRoom;
						roomsById[currRoom.id()] = currRoom;
					}
					
					for (var i = 0; i < initCallbacks.length; i++) {
						initCallbacks[i]();
					}
				}, function(err) { Logger.log('GetAvailableCalendars error', err); });
			};
			
			Authenticator.loginWithAuthSub(afterLogin);
			//Authenticator.loginWithCredentials(afterLogin);
		}
		else runInitASAP = true;
	};
	
	this.getRoom = function (roomName) {
		return roomsByName[roomName];
	};
	this.getRoomById = function (roomId) {
		return roomsById[roomId];
	};
	
	this.getAvailableCalendars = function(onSuccess, onError) {
		try {
			if(this.inited) {
				var feedUrl = "https://www.google.com/calendar/feeds/default/allcalendars/full";
				return EventManager.calendarService().getAllCalendarsFeed(feedUrl, onSuccess, onError);
			}
			else initCallbacks.push(function() { EventManager.getAvailableCalendars(onSuccess, onError) });
		}
		catch(e) {
			onError && onError(e);
		}
	}
	
	function pad(num, digits) {
		var numStr = num.toString();
		return new Array(digits - numStr.length + 1).join("0") + numStr;
	}
	function toRFC3339Date(date) {
		return (
			pad(date.getUTCFullYear(),4) + "-" + pad(date.getUTCMonth() + 1,2) + "-" + pad(date.getUTCDate(),2) + "T" +
			pad(date.getUTCHours(),2) + ":" + pad(date.getUTCMinutes(),2) + ":" + pad(date.getUTCSeconds(),2) + "." + pad(date.getUTCMilliseconds(),3) + "Z"
		);
	}
	
	this.getRoomEvents = function(room, onSuccess, onError) {
		try {
			if(this.inited) {
				var minDate = DebugSettings.now() || new Date(),
					maxDate = DebugSettings.now() || new Date();
				maxDate.setDate(maxDate.getDate() + 1);
				var feedUrl  =
					"https://www.google.com/calendar/feeds/" + room.id() + 
					"/private/full?orderby=starttime&sortorder=a" +
					"&max-results=" + 25 +
					"&start-min=" + toRFC3339Date(minDate) + "&start-max=" + toRFC3339Date(maxDate);
				return EventManager.calendarService().getEventsFeed(feedUrl, onSuccess, onError);
			}
			else initCallbacks.push(function() { EventManager.getRoomEvents(room, onSuccess, onError) });
		}
		catch(e) {
			onError && onError(e);
		}
	};
	
	this.bookRoom = function(room, eventName, startTime, durationMinutes, onSuccess, onError) {
		try {
			if(this.inited) {
				var endTime = new Date(startTime);
				endTime.setMinutes(startTime.getMinutes() + durationMinutes);
				
				var feedUrl = EventManager.screenCalendar.eventFeedLink;
				var entry = new google.gdata.calendar.CalendarEventEntry();
				entry.setTitle(google.gdata.atom.Text.create(eventName));
				
				var when = new google.gdata.When();
				when.setStartTime(new google.gdata.DateTime(startTime, false));
				when.setEndTime(new google.gdata.DateTime(endTime, false));
				entry.addTime(when);
				
				var roomWho = new google.gdata.calendar.EventWho({
					email : room.decodedId(),
					resource: {
						id: room.id(),
						value : true
					},
					rel : google.gdata.Who.REL_EVENT_ATTENDEE,
					valueString : room.name()
				});
				roomWho.setAttendeeType({value : google.gdata.AttendeeType.VALUE_REQUIRED});
				roomWho.setAttendeeStatus({value : google.gdata.AttendeeStatus.VALUE_INVITED});
				entry.addParticipant(roomWho);

				calendarService.insertEntry(feedUrl, entry, onSuccess, onError, google.gdata.calendar.CalendarEventEntry);
			}
			else initCallbacks.push(function() { EventManager.bookRoom(room, eventName, startTime, durationMinutes, onSuccess, onError) });
		}
		catch(e) {
			onError && onError(e);
		}
	};
	
	return this;
})();