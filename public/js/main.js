/* Atlassian M.E.A.T.
 * Authors: Adam Ahmed, Martin Jopson, Stephen Russell, Robert Smart
 * (c) 2011 Atlassian Pty Ltd.
 * Atlassian M.E.A.T. may be freely distributed under the MIT Expat license.
 */
 
(function() {
	var params = ParameterParser.parse();
	var roomName = params.room;
	
	function runAtMidnight(func) {
		var oneDay = 1000 * 60 * 60 * 24;
		
		var midnight = new Date(new Date().getTime() + oneDay);
		midnight.setSeconds(0); midnight.setMinutes(0);midnight.setHours(0);
		
		// paranoia
		while (midnight < new Date()) midnight = new Date(midnight.getTime() + oneDay);
		
		setTimeout(func, midnight - new Date());
	}
	function runEveryNMinutesOnTheMthSecond(n, m, func) {
		var firstDelaySec = m - (DebugSettings.now() || new Date()).getSeconds();
		if (firstDelaySec <= 0) {
			firstDelaySec +=  60;
		}

		setTimeout(function() {
            try {
                func();
                setInterval(function() {
                    func();
                }, 1000 * 60 * n);
            } catch (err) {
                Logger.log("Error in repeated function.", err);
            }
		}, firstDelaySec * 1000);
	}
	
	function reloadRoom(room, callback) {
		room.reload(function() {
			GlobalEvents.trigger('roomUpdatedByServer', room);
			callback && callback();
		});
	}
	function beginReloadingRooms(thisRoom) {
		var currIndex = 0;
		function updateARoom() {
			var otherRoom = EventManager.rooms[currIndex];
			currIndex++;
			currIndex %= EventManager.rooms.length;
			
			if (otherRoom == thisRoom) { // skip it, it has its own cycle.
				updateARoom();
			} else {
				reloadRoom(otherRoom);
			}
		}
	
		runEveryNMinutesOnTheMthSecond(15, 20, updateARoom);
	}
	
	function getRootUrl() {
		var qsStart = window.location.href.indexOf('?');
		var hashStart = window.location.href.indexOf('#');
		var url = window.location.href.substring(0,
			Math.min(~qsStart ? qsStart : Infinity, ~hashStart ? hashStart : Infinity));
		
		if (url.lastIndexOf('/') !== url.length - 1) {
			url += '/';
		}
		return url;
	}

	DebugSettings.init(getRootUrl());
	EventManager.init(getRootUrl(), params.secret, function() {
		var thisRoom = roomName ? EventManager.getRoom(roomName) : undefined;
		
		if (roomName && !thisRoom) {
			$('#errormsg')
				.css('font-size','18px')
				.text('You entered an invalid room name.  The room could not be found.')
				.removeClass('hidden');
			$('#container').addClass('hidden');
			return;
		}
		
		//once all the "other" rooms are loaded, begin REloading them one at a time in a round robin to keep them up-to-date.
		var afterAllRoomsLoaded = _.after(EventManager.rooms.length, function() { beginReloadingRooms(thisRoom); }),
			loadOtherRooms = function(thisRoom) {
				_.each(EventManager.rooms, function(room) {
					thisRoom !== room && room.load(function() {
						afterAllRoomsLoaded();
						GlobalEvents.trigger('roomLoaded', room);
					});
				});
			};
			
		initUi(thisRoom);
		if (thisRoom) {
			thisRoom.load(function() { // if we have a "this" room, we want to load it first without other loads getting in the way (not sure they actually will...)
				GlobalEvents.trigger('roomLoaded', thisRoom);
				afterAllRoomsLoaded();
				
				//begin reloading this room at regular intervals
				runEveryNMinutesOnTheMthSecond(30, 40, function() { reloadRoom(thisRoom); });
				
				loadOtherRooms(thisRoom);
			});
		} else {
			loadOtherRooms();
		}
		
		//update UI when the minute ticks over.
		runEveryNMinutesOnTheMthSecond(1, 1, function() {
			GlobalEvents.trigger('minuteChanged');
		});
	});
	
	GlobalEvents.bind('bookingAddedByUser', function(event, booking) {
		EventManager.bookRoom(booking.room, booking.time, booking.duration,
			function success() {			
				booking.room.reload(function() {
					GlobalEvents.trigger('roomUpdatedByServer', booking.room);
				});
			},
			function failure() {
				GlobalEvents.trigger('bookingFailure', booking);
			}
		);
	});
	
	// update MEAT from server everyday at midnight.  gApps also seems to have some memory leaks.  This lets us avoid bad consequences from that...
	runAtMidnight(function() { window.location.reload(); });
})();