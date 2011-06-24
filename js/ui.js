// ui js 

var displayFreeTime = false;

//this happens immediately for faster ui
(function(){
	function setSomeHeights() {
		var windowHeight = jQuery(window).height(),
		    counterHeight = windowHeight / 3,
            counterPosition = windowHeight / 8,
            nextMeetingHeight = windowHeight / 10,
            nextMeetingDetailsHeight = nextMeetingHeight * 2 / 3,
            bookItHeight = nextMeetingHeight;
		
        $('#minutes-free').css("font-size", counterHeight +"px");
        $('#next-event > h2').css("font-size", nextMeetingHeight +"px");
        $('#next-event > h3').css("font-size", nextMeetingDetailsHeight +"px");
        $('#book-this, #book-another').css("font-size", bookItHeight +"px");
        $('#status').css('padding-top', counterPosition +"px");
	}
	
	setSomeHeights();
	$('#status').removeClass('hidden');
	$(window).resize(setSomeHeights);
})();

//this only happens once we have data ready.
function initUi(thisRoom) {
	var $body = $('body'),
            $close = $('#close'),
            $container = $("#container"),
                $status = $('#status'),
                    $statusMinutes = $('#minutes-free > span'),
                    $nextEvent = $('#next-event'),
                        $nextOrCurrent = $('#next-or-current'),
                        $meetingTitle = $('#meeting-title'),
                        $meetingOrganizer = $('#meeting-organizer'),
            $booking = $('#booking'),
                $infoStrong = $('#info strong'),
                $timeRequired = $("#time-required"),
                $timeMore = $("#time-more"),
                $timeLess = $("#time-less"),
                $roomName = $('#room-name'),
            $rooms = $('#rooms'),
                $roomsList = $('#rooms-list'),
        $freeIn = $('.free-at');
	
	var msPerSec = 1000,
		msPerMin = 1000 * 60,
		msPerHour = 1000 * 60 * 60,
		msPerDay = 1000 * 60 * 60 * 24,
		minPerDay = 60 * 24;
	
	var maxBookingMinutes = 60,
		minBookableMinutes = 5,
		availableMinutes = maxBookingMinutes,
		maxBookingMinutesAvailable = true,
		maxStatusSoonMinutes = 30,
		minFreeTimeAdequateMinutes = 30,
		idleTimeoutSec = 30;
		
    var defaultTimeBlock = 30,
        timeBlock = defaultTimeBlock,
		timeInterval = 15;
	
	var roomStatus = 'status-busy',
		minutesFreeFor = '60',
		minutesFreeIn = '60',
        nextEvent = null,
		freeAt = null;
	
	var Stages = {
		Status : {
			name : 'status',
			enter : function() {
				endIdleTimeout();
				resetStatusUi();
				$status.fadeIn('slow', function() {
					currStage = Stages.Status;
					$body.dequeue();
				});
			},
			exit : function() {
				currStage = Stages.Switching;
				$status.fadeOut('fast', function() {
					$body.removeClass();
					beginIdleTimeout();
					$body.dequeue();
				});
			}
		},
		RoomList : {
			name : 'rooms',
			enter : function() {
				$body.addClass("rooms");				
				$rooms.fadeIn('slow',function(){
					$close.removeClass('hidden');
					currStage = Stages.RoomList;
					$body.dequeue();
				});
			},
			exit : function() {
				currStage = Stages.Switching;
				$body.removeClass('rooms');
				$rooms.fadeOut('fast',function() {
					$close.addClass('hidden');
					$body.dequeue();
				});
			}
		},
		Book : {
			name : 'book',
			enter : function() {
				$body.addClass("show-controls");
				updateBookingUiData();
				$timeMore.removeClass('hidden');
				$timeLess.removeClass('hidden');
				$booking.fadeIn('slow',function(){
					$close.removeClass('hidden');
				});
				currStage = Stages.Book;
				$body.dequeue();
			},
			exit : function() {
				currStage = Stages.Switching;
				bookingRoom = thisRoom;
				timeBlock = defaultTimeBlock;
				
				$booking.fadeOut('fast',function(){
					$body.removeClass('show-controls');
					$close.addClass('hidden');
					$body.dequeue();
				});
			}
		},
		Switching : null
	};
	var currStage = Stages.Status,
		prevStages = [ ];
	
	var bookingRoom = thisRoom;
	
	function switchTo(newStage) {
        if (currStage != Stages.Switching && currStage != newStage) {
            prevStages.push(currStage);
            currStage && $body.queue(currStage.exit).queue(newStage.enter);
        }
	}
	function revertToPreviousStage() {
		var newStage = prevStages.pop();
        //$('#debug').text(currStage.name + '=>' + newStage.name);
		currStage && newStage && $body.queue(currStage.exit).queue(newStage.enter);
	}
	function revertToStatus() {
		while(prevStages.length && prevStages[prevStages.length - 1] != Stages.Status) {
			prevStages.pop();
		}
		revertToPreviousStage();
	}
	
	function minutesBetween(a, b) { return Math.ceil((b.getTime() - a.getTime()) / msPerMin);}
    function timeBetweenString(a, b) {
        var minutes = minutesBetween(a, b);
        
        if (minutes < 60) {
            return minutes + " minutes";
        } else {
            var hours = Math.floor(minutes / 60);
            if (hours < 24) {
                return hours + "+ hours";
            } else {
                return "a long time";
            }
        }
    }
	
	function getRoomAvailability(room) {
		var now = DebugSettings.now() || new Date(),
			nextFree = room.nextFreeTime(now),
			nextBusy = room.nextEventTime(nextFree),
            nextEvent = room.nextEvent(now),
			availableMinutes = nextBusy ? minutesBetween(nextFree, nextBusy) : Infinity;
		while(availableMinutes < minBookableMinutes ) {
			//if the free time in question is less than we can book, move to the next free time.
			nextBusy.setMinutes(nextBusy.getMinutes() + 1);
			nextBusy.setSeconds(0);
			nextFree = room.nextFreeTime(nextBusy);
			nextBusy = room.nextEventTime(nextFree);
			availableMinutes = nextBusy ? minutesBetween(nextFree, nextBusy) : Infinity;
		}
		
		var minutesFreeIn = minutesBetween(now, nextFree);
		return {
			minutesFreeIn : minutesFreeIn,
			minutesFreeFor : availableMinutes,
			maxBookingMinutesAvailable : availableMinutes > maxBookingMinutes,
			freeAt : minutesFreeIn <= 0 ? null : nextFree,
            nextEvent : nextEvent
		};
	}
	
	var idleTimeout = null;
	function beginIdleTimeout() {
		if (!idleTimeout) {
			idleTimeout = ActivityMonitor.setIdleHandler(idleTimeoutSec * msPerSec, revertToStatus);
		}
	};
	function endIdleTimeout() {
		if (idleTimeout) {
			ActivityMonitor.clearIdleHandler(idleTimeout);
			idleTimeout = null;
		}
	};
	
	function shouldTimeButtonsEnable() {
		$timeMore.toggleClass('disabled', timeBlock + timeInterval > Math.min(availableMinutes, maxBookingMinutes));
		$timeLess.toggleClass('disabled', timeBlock <= timeInterval);
	}
	
	function resetStatusUi() {
		$body
			.removeClass()
			.addClass(roomStatus);
		$statusMinutes.text(minutesFreeIn < 1 ? '' : minutesFreeIn);
		
		if (nextEvent) {
            $nextOrCurrent.text(minutesFreeIn < 1 ? 'Next' : 'This');
            var title = nextEvent.title();
			$meetingTitle.text(title.length > 50 ? title.substring(0, 47) + "..." : title);
            var organizer = nextEvent.organizer();
			$meetingOrganizer.text(organizer.length > 50 ? organizer.substring(0, 47) + "..." : organizer);
			$nextEvent.removeClass('hidden');
		} else {
			$nextEvent.addClass('hidden');
		}
	}
	function resetBookingUi() {
		$roomName.text(bookingRoom.simpleName());
		$infoStrong.text(maxBookingMinutesAvailable ? maxBookingMinutes + '+' : availableMinutes);
		$timeRequired.text(timeBlock);
		
		if (freeAt) {
			var freeInPretty = timeBetweenString(DebugSettings.now() || new Date(), freeAt);
			$freeIn.text('in ' + freeInPretty);
		} else {
			$freeIn.text('');
		}
		shouldTimeButtonsEnable();
	}
	
	function timeRequiredClick(e){
		if($timeRequired.text() != 'Booked') {
			var bookingRoomFreeze = bookingRoom;
			var floorDate = freeAt ? freeAt : DebugSettings.now() || new Date();
			floorDate.setSeconds(0, 0);
			EventManager.bookRoom(bookingRoomFreeze, 'Impromptu Meeting', floorDate, timeBlock,
				function(a) {
					bookingRoomFreeze.reload(function() {
						updateStatusUiData();
						updateRoomRowUi(bookingRoomFreeze);
						sortRoomList();
					});
				},
				function(b) { Logger.log('Error booking room', b); });
			$timeRequired
				.text("Booked")
				.siblings()
					.addClass('hidden')
				.end()
				.delay(2000)
				.queue(function() {
					switchTo(Stages.Status);
					$(this).dequeue();
				});
		}
		e.stopPropagation();
	}
	function timeMoreClick(e){
		if (!$timeMore.hasClass('disabled')) {
			timeBlock += timeInterval;
			$timeRequired.text(timeBlock);
			shouldTimeButtonsEnable();
		}
		e.stopPropagation();
	}
	function timeLessClick(e){
		if (!$timeLess.hasClass('disabled')) {
			timeBlock -= timeInterval;
			$timeRequired.text(timeBlock);
			shouldTimeButtonsEnable();
		}
		e.stopPropagation();
	}
	function bodyClick(e) {
		if(currStage == Stages.Status) {
			if (minutesFreeIn <= 0) {
				switchTo(Stages.Book);
			} else {
				switchTo(Stages.RoomList);
			}
		}
		e.stopPropagation();
	}
	function closeClick(e){
		revertToPreviousStage();
		e.stopPropagation();
	}
	function getRoomRowClickFn(room) {
		var roomId = room.id();
		if (!getRoomRowClickFn[roomId]) {
			getRoomRowClickFn[roomId] = function(e) {
				bookingRoom = room;
				switchTo(Stages.Book);
				e.stopPropagation();
			};
		}
		return getRoomRowClickFn[roomId];
	}
    
    /* For use when we switch to touch events, if ever.
    var moved = false,
        oneFinger = false
        startTime = new Date();
    function started(e) {
        e = e || window.event;
        oneFinger = e.touches.length == 1;
        if (oneFinger) {
            moved = false;
            startTime = new Date();
        }
    }
    function moved() { moved = true; }
    if (document.addEventListener) {
        window.addEventListener('touchstart', started, true);
        window.addEventListener('touchmove', moved, true);
    } else {
        window.attachEvent('touchstart', started);
        window.attachEvent('touchmove', moved);
    }
    */
	function bindToClicklike($el, fn) {
		return $el
			.click(fn);
	}
	
	function unbindAllMouseEvents() {
        if (!unbindAllMouseEvents.called) {
            unbindAllMouseEvents.called = true;
            $timeRequired.unbind('click');
            $timeMore.unbind('click');
            $timeLess.unbind('click');
            $body.unbind('click');
            $close.unbind('click');
            $roomsList.children().unbind('click');
        }
	}
	
	function getStatusClassString(minutesFreeIn, minutesFreeFor) {
		return (
				minutesFreeIn <= 0 ?
					'status-free' :
				minutesFreeIn <= maxStatusSoonMinutes ?
					'status-soon' :
					'status-busy'
			) + ' ' + (
				minutesFreeFor < minFreeTimeAdequateMinutes ?
					'freetime-inadequate' :
				minutesFreeFor <= maxBookingMinutes ?
					'freetime-adequate' :
					'freetime-long'
			);
	}
	function updateStatusUiData() {
		var availability = getRoomAvailability(thisRoom);
		
		minutesFreeIn = availability.minutesFreeIn;
		minutesFreeFor = availability.minutesFreeFor;
        nextEvent = availability.nextEvent;
		roomStatus = getStatusClassString(minutesFreeIn, minutesFreeFor);
		
		if(currStage == Stages.Status) {
			resetStatusUi();
		}
	}
	function updateBookingUiData() {
		var availability = getRoomAvailability(bookingRoom);
		
		availableMinutes = availability.minutesFreeFor;
		maxBookingMinutesAvailable = availability.maxBookingMinutesAvailable;
		freeAt = availability.freeAt;
		
		if(availableMinutes < defaultTimeBlock) {
			timeBlock = Math.floor(availableMinutes/timeInterval)*timeInterval;
			if(timeBlock <= timeInterval) {
				timeBlock = availableMinutes;
			}
		}
		
		resetBookingUi();
	}
	
	function loadInitialRoomList() {
		$roomsList.children().remove();
		for(var i = 0; i < EventManager.rooms.length; i++) {
			var otherRoom = EventManager.rooms[i];
			
			(function(otherRoom) {
				otherRoom.load(function() {
					var $row = $('<li><em>✓</em><span></span><strong></strong></li>');
					$row
						.attr('id', otherRoom.id())
						.find('strong')
							.text(otherRoom.simpleName());
					bindToClicklike($row, getRoomRowClickFn(otherRoom));
					$roomsList.append($row);
					updateRoomRowUi(otherRoom);
					sortRoomList();
				});
			})(otherRoom);
		}
	}
	
	function updateARoom() {
		var otherRoom = EventManager.rooms[updateARoom.currIndex];
		updateARoom.currIndex++;
		updateARoom.currIndex %= EventManager.rooms.length;
		
		if (otherRoom == thisRoom) { // skip it, it has its own cycle.
			updateARoom();
		} else {
			updateRoomRow(otherRoom);
		}
	}
	updateARoom.currIndex = 0;
	
	function updateRoomRow(otherRoom) {
		if (otherRoom && otherRoom != thisRoom && otherRoom.loaded()) {
			otherRoom.reload(function() {
				updateRoomRowUi(otherRoom);
				sortRoomList();
			});
		}
	}
	function updateRoomRowUi(otherRoom) {
		if(otherRoom.loaded()) {
			var availability = getRoomAvailability(otherRoom);
			$roomsList.find('#' + otherRoom.id().replace(/(\.|%)/g, '\\$1'))
				.removeClass()
				.addClass(getStatusClassString(availability.minutesFreeIn, availability.minutesFreeFor))
				.find('span')
					.text(availability.minutesFreeIn <= 0 ? '' : availability.minutesFreeIn);
		}
	}
	function sortRoomList() {
		var now = DebugSettings.now() || new Date();
	
		var $rooms = $roomsList.children();
		var roomArray = $.makeArray($rooms.detach());
			roomArray.sort(function(a, b) {
				var aRoom = EventManager.getRoomById(a.id),
					bRoom = EventManager.getRoomById(b.id),
					aNextFree = aRoom.nextFreeTime(now),
					bNextFree = bRoom.nextFreeTime(now),
					aMinutesToFree = minutesBetween(now, aNextFree),
					bMinutesToFree = minutesBetween(now, bNextFree);
				
				//free at the same time
				if (aMinutesToFree == bMinutesToFree) {
					//how long for?
					var aBookedAt = aRoom.nextEventTime(aNextFree),
						bBookedAt = bRoom.nextEventTime(bNextFree),
						aFreeMinutes = aBookedAt ? minutesBetween(aNextFree, aBookedAt) : Infinity,
						bFreeMinutes = bBookedAt ? minutesBetween(bNextFree, bBookedAt) : Infinity;
				
					if (aFreeMinutes == bFreeMinutes || (aFreeMinutes > maxBookingMinutes && bFreeMinutes > maxBookingMinutes)) {
						return aRoom.name() < bRoom.name() ? -1 : 1;
					} else {
						return aFreeMinutes > bFreeMinutes ? -1 : 1;
					}
				} else {
					//one is free first
					return aMinutesToFree < bMinutesToFree ? -1 : 1;
				}
			});
        $(roomArray).appendTo($roomsList);
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
                    try {
                       func();
                    } catch (err) {
                        Logger.log("Error in repeated function.", err);
                    }
                }, msPerMin * n);
            } catch (err) {
                Logger.log("Error in repeated function.", err);
            }
		}, firstDelaySec * msPerSec);
	}

	bindToClicklike($timeRequired, timeRequiredClick);
	bindToClicklike($timeMore, timeMoreClick);
	bindToClicklike($timeLess, timeLessClick);
	bindToClicklike($body, bodyClick);
	bindToClicklike($close, closeClick);

    if (document.body.addEventListener) {
        document.body.addEventListener('touchend', bodyClick, true);
    } else {
        document.body.attachEvent('touchend', bodyClick);
    }

	thisRoom.load(function () {
        try {
            //run immediately, then
            updateStatusUiData();
            //load the other room data so we can display it right.
            loadInitialRoomList();

            //Update all the minute values on the next minute start, then each minute thereafter.
            //this is so the clock matches the system clock with no delay.
            runEveryNMinutesOnTheMthSecond(1, 1, function() {
                updateStatusUiData();
                for(var i = 0; i < EventManager.rooms.length; i++) {
                    var otherRoom = EventManager.rooms[i];
                    updateRoomRowUi(otherRoom);
                }
            });

            //update this room's event data and make the ui match every 2 minutes on the :40.
            runEveryNMinutesOnTheMthSecond(30, 40, function() {
                        thisRoom.reload(function() {
                            updateStatusUiData();
                            updateRoomRowUi(thisRoom);
                            sortRoomList();
                        })
                    });
            //update the other rooms over time - one every minute on the :20
            runEveryNMinutesOnTheMthSecond(15, 20, updateARoom);
        } catch (err) {
            Logger.log(err);
        }
	});
}


