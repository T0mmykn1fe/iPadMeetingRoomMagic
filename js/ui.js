// ui js 

var displayFreeTime = false;

//this only happens once we have data ready.
function initUi(thisRoom) {
	var $body = $('body'),
            $close = $('#close'),
            $container = $("#container"),
				$booking = $('#booking'),
				$rooms = $('#rooms'),
					$roomsList = $('#rooms-list');
	
	var msPerSec = 1000,
		msPerMin = 1000 * 60,
		msPerHour = 1000 * 60 * 60,
		msPerDay = 1000 * 60 * 60 * 24,
		minPerDay = 60 * 24;
	
	var maxBookableMinutes = 60,
		minBookableMinutes = 5,
		maxStatusSoonMinutes = 0,
		minFreeTimeAdequateMinutes = 30,
		idleTimeoutSec = 30;
		
    var defaultTimeBlock = 30,
		timeInterval = 15;
	
	var ViewModels = {
		thisRoom : (function() {
			var room;
			return {
				getRoom : function() { return room; },
				getRoomStatusClassString : function() {
					var availability = getRoomAvailability(room);
					return getStatusClassString(availability.minutesTilFree, availability.minutesFreeFor);
				},
				getCurrentBooking : function() {
					var currentBooking = getRoomAvailability(room).currentBooking;
					if (currentBooking) {
						currentBooking.when = "for " + currentBooking.minutesTilEnd + " more mins";
					}
					return currentBooking;
				},
				getNextBooking : function() {
					var nextBooking = getRoomAvailability(room).nextBooking;
					if (nextBooking && nextBooking.minutesTilStart) {
						nextBooking.when = "in " + nextBooking.minutesTilStart + " mins";
					}
					return nextBooking;
				},
				setRoom : function(theRoom) {
					room = theRoom;
				},
				sync : function() {}
			};
		})(),
		otherRooms : (function() {
			var onLoad = [],
				rows = [];
			
			function htmlEscape(str) {
				return str ? str.replace(/'"`<>/g, function(c) {
					switch(c) {
						case "'": return "&apos;";
						case '"': return "&quot;";
						case "`": return "&apos;";
						case "<": return "&lt;";
						case ">": return "&gt;";
						default: return "&#" + c.charCodeAt(0) + ";";
					}
				}) : str;
			}
			
			var self;
			return self = {
				subscribeToNewRooms : function(func) {
					onLoad.push(func);
				},
				createRoomRowViewModel : function(room) {
					var model = {
							sync : function() {},
							getHtmlId : function() { return htmlEscape(room.id()); },
							getDisplayName : function() { return room.simpleName(); },
							getRoom : function() { return room; },
							getCssClass : function() {
								var availability = getRoomAvailability(room);
								return getStatusClassString(availability.minutesTilFree, availability.minutesFreeFor);
							},
						};
					rows.push(model);
					return model;
				},
				getRow : function(room) {
					var row;
					$.each(rows, function() {
						if (this.getRoom() === room) {
							row = this;
							return false;
						}
					});
					return row;
				},
				load : function(rooms) {
					function loadRoom(room) {
						room[room.loaded() ? "reload" : "load"](function() {
							for (var i = 0; i < onLoad.length; i++) {
								onLoad[i](self.createRoomRowViewModel(room));
							}
						});
					}
					
					for(var i = 0; i < rooms.length; i++) {		
						loadRoom(rooms[i]);
					}
				}
			};
		})(),
		bookingData : (function() {
			var bookingRoom,
				availability,
				bookingDuration;
			return {
				getBookingRoom : function() { return bookingRoom; },
				getBookingRoomName : function() { return bookingRoom.simpleName(); },
				getTimeFreeAtString : function() {
					return timeBetweenString(DebugSettings.now() || new Date(), availability.freeAt, "in ");
				},
				getTimeAvailableString : function() {
					return availability.minutesFreeFor >= maxBookableMinutes ? maxBookableMinutes + '+' : availability.minutesFreeFor;
				},
				addTimeInterval : function() {
					bookingDuration += timeInterval;
					if (bookingDuration > maxBookableMinutes || bookingDuration > availability.minutesFreeFor)
						bookingDuration = Math.min(maxBookableMinutes, availability.minutesFreeFor);
					return bookingDuration;
				},
				subtractTimeInterval : function() {
					if (bookingDuration % timeInterval == 0 ) {
						bookingDuration -= timeInterval;
					} else {
						bookingDuration -= bookingDuration % timeInterval;
					}
					if (bookingDuration < 0)
						bookingDuration = Math.min(timeInterval, availability.minutesFreeFor);
					return bookingDuration;
				},
				canAddTime : function() {
					return bookingDuration < Math.min(availability.minutesFreeFor, maxBookableMinutes);
				},
				canSubtractTime : function() {
					return bookingDuration > timeInterval;
				},
				getBookingDuration : function () {
					return bookingDuration;
				},
				getBookingTime : function () {
					var date = availability.freeAt || DebugSettings.now() || new Date();
					date.setSeconds(0, 0);
					return date;
				},
				setRoom : function(room) {
					bookingRoom = room;
					availability = getRoomAvailability(bookingRoom);
					bookingDuration = availability.minutesFreeFor < defaultTimeBlock ?
						(availability.minutesFreeFor < timeInterval ?
							availability.minutesFreeFor :
							Math.floor(availability.minutesFreeFor/timeInterval) * timeInterval
						) :
						defaultTimeBlock;
				},
				sync : function() {}
			}; 
		})(),
	};
		
	var Stages = (function() {
	
		var currStage,
			prevStages = [ ];
		
		function switchTo(newStage) {
			if (currStage != Stages.Switching && currStage != newStage) {
				prevStages.push(currStage);
				currStage && $body.queue(currStage.exit).queue(newStage.enter);
			}
		}
		function revertToPreviousStage() {
			var newStage = prevStages.pop();
			currStage && newStage && $body.queue(currStage.exit).queue(newStage.enter);
		}
		function revertToStatus() {
			while(prevStages.length && prevStages[prevStages.length - 1] != Stages.Status) {
				prevStages.pop();
			}
			revertToPreviousStage();
		}
		
		$close.click(function (e) {
			revertToPreviousStage();
			e.stopPropagation();
		});
	
		var stages = {
			Status : (function() {
				var self,
					model,
					idleTimeout,
					$container,
					$status,
					$statusMinutes,
					$events,
					$currentEvent,
					$nextEvent;
				return {
					name : 'status',
					enter : function() {
						$body.removeClass().addClass("show-status");	
						
						if (idleTimeout) {
							ActivityMonitor.clearIdleHandler(idleTimeout);
							idleTimeout = null;
						}
						
						self.update();
						$status.fadeIn('slow', function() {
							currStage = self;
							$status.css('display', '');
							$body.dequeue();
						});
					},
					exit : function() {
						currStage = Stages.Switching;
						$status.fadeOut('fast', function() {
							$body.removeClass();
							
							if (!idleTimeout) {
								idleTimeout = ActivityMonitor.setIdleHandler(idleTimeoutSec * msPerSec, revertToStatus);
							}
							
							$body.dequeue();
						});
					},
					init : function($theContainer) {
						self = this;
						model = ViewModels.thisRoom;
						$container = $theContainer;
						$status = $('#status', $container).click(function(e) {
							if (!model.getCurrentBooking()) {
								ViewModels.bookingData.setRoom(model.getRoom());
								switchTo(Stages.Book);
							} else {
								switchTo(Stages.RoomList);
							}
							e.stopPropagation();
						});
						$statusMinutes = $('#minutes-free', $status);
						$events = $('.events', $status);
						$currentEvent = $('#current-event', $events);
						$nextEvent = $('#next-event', $events);
					},
					update : (function() {
						function updateEventDOM($eventDOM, event) {
							if (event) {
								$eventDOM.removeClass('hidden');
								
								var title = event.title || '',
									organizer = event.organizer || '',
									when = event.when;
								$eventDOM.children('.title').text(title);
								$eventDOM.children('.organizer').text(organizer);
								$eventDOM.children('.when').text(when);
								$eventDOM.appendTo($events);
							} else {
								$eventDOM.detach();
							}
						}
						return function() {
							$container
								.removeClass()
								.addClass(model.getRoomStatusClassString());
							
							//order matters - using append
							updateEventDOM($currentEvent, model.getCurrentBooking());
							updateEventDOM($nextEvent, model.getNextBooking());
							$status.toggleClass("no-events", !$events.children(':visible').length);
						};
					})()
				};
			})(),
			RoomList : (function() {
				var self,
					model,
					$rooms,
					$roomsList;
				return {
					name : 'rooms',
					enter : function() {
						$body.removeClass().addClass("show-rooms");				
						$rooms.fadeIn('slow',function(){
							$close.removeClass('hidden');
							$rooms.css('display', '');
							currStage = Stages.RoomList;
							$body.dequeue();
						});
					},
					exit : function() {
						currStage = Stages.Switching;
						$rooms.fadeOut('fast',function() {
							$body.removeClass('show-rooms');
							$close.addClass('hidden');
							$body.dequeue();
						});
					},
					init : function($root) {
						self = this;
						model = ViewModels.otherRooms;
						$rooms = $root;
						$roomsList = $rooms.children('ul');
						model.subscribeToNewRooms(this.createRow);
						self.reset();
					},
					createRow : function(rowModel) {
						var $row = $('<li><strong></strong></li>');
						$row
							.attr('id', rowModel.getHtmlId())
							.data('model', rowModel)
							.find('strong')
								.text(rowModel.getDisplayName());
						$row.click(function(e) {
							ViewModels.bookingData.setRoom(rowModel.getRoom());
							switchTo(Stages.Book);
							e.stopPropagation();
						});
						$roomsList.append($row);
						self.updateRow(rowModel);
						sortRoomList();
					},
					updateRow : function(roomOrRow) {
						var row = roomOrRow.getCssClass && roomOrRow.getHtmlId ?
								roomOrRow :
								model.getRow(roomOrRow);
						$(document.getElementById(row.getHtmlId()))
							.removeClass()
							.addClass(row.getCssClass());
					},
					updateAllRows : function() {
						$roomsList.children().each(function() {
							self.updateRow($(this).data('model'));
						});
					},
					reset : function() {
						$roomsList.children().remove();
					}
				};
			})(),
			Book : (function() {
				var self,
					model,
					$roomName,
					$freeIn,
					$timeAvailable,
					$timeRequired,
					$timeMore,
					$timeLess,
					$freeAt;
				return {
					name : 'book',
					enter : function() {
						self.reset();
						$body.removeClass().addClass("show-booking");
						$booking.fadeIn('slow',function(){
							$booking.css('display', '');
							$close.removeClass('hidden');
							currStage = self;
							$body.dequeue();
						});
					},
					exit : function() {
						currStage = Stages.Switching;
						
						$booking.fadeOut('fast',function(){
							$body.removeClass('show-booking');
							$close.addClass('hidden');
							$body.dequeue();
						});
					},
					init : function($root) {
						self = this;
						model = ViewModels.bookingData;
						
						$timeAvailable = $('#info .time-available', $root);
						$timeRequired = $("#time-required", $root).click(this.onTimeRequiredClicked);
						$timeMore = $("#time-more", $root).click(this.onMoreTimeClicked);
						$timeLess = $("#time-less", $root).click(this.onLessTimeClicked);
						$roomName = $('#room-name', $root);
						$freeAt = $('.free-at', $root);
					},
					reset : function() {
						$roomName.text(model.getBookingRoomName());
						$timeAvailable.text(model.getTimeAvailableString());
						$timeRequired.removeClass('disabled').text(model.getBookingDuration());
						$freeAt.text(model.getTimeFreeAtString());
						$timeMore.removeClass('hidden').toggleClass('disabled', !model.canAddTime());
						$timeLess.removeClass('hidden').toggleClass('disabled', !model.canSubtractTime());
					},
					onTimeRequiredClicked : function(e) {
						if (!$timeRequired.hasClass('disabled')) {
							var bookingRoom = model.getBookingRoom();
							EventManager.bookRoom(bookingRoom, 'Impromptu Meeting', model.getBookingTime(), model.getBookingDuration(),
								function(a) {
									bookingRoom.reload(function() {
										Stages.Status.update();
										Stages.RoomList.updateRow(ViewModels.otherRooms.getRow(bookingRoom));
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
						return false;
					},
					onMoreTimeClicked : function (e) {
						if (!$timeMore.hasClass('disabled')) {
							$timeRequired.text(model.addTimeInterval());
							$timeMore.toggleClass('disabled', !model.canAddTime());
							$timeLess.toggleClass('disabled', !model.canSubtractTime());
						}
						
						return false;
					},
					onLessTimeClicked : function (e) {
						if (!$timeLess.hasClass('disabled')) {
							$timeRequired.text(model.subtractTimeInterval());
							$timeMore.toggleClass('disabled', !model.canAddTime());
							$timeLess.toggleClass('disabled', !model.canSubtractTime());
						}
						
						return false;
					}
				};
			})(),
			Switching : null
		};
		
		currStage = stages.Status;
		return stages;
	})();
	
	function minutesBetween(a, b) {
		return Math.ceil((b.getTime() - a.getTime()) / msPerMin);
	}
    function timeBetweenString(a, b, prefix) {
		if (!a || !b) {
			return "";
		}
		
        var minutes = minutesBetween(a, b);
        
        if (minutes < 1) {
			return "";
		} else if (minutes < 60) {
            return prefix + minutes + " minutes";
        } else {
            var hours = Math.floor(minutes / 60);
            if (hours < 24) {
                return prefix + hours + " hours";
            } else {
                return prefix + "a long time";
            }
        }
    }
	
	function getRoomAvailability(room) {
		var now = DebugSettings.now() || new Date(),
			bookings = room.upcomingBookings(now),
			availability = {
				currentBooking : null,
				nextBooking : null,
				minutesTilFree : 0,
				freeAt : now,
				minutesFreeFor : Infinity
			};
			
		if (bookings.length) {
			var bIndex = 0;
			var next = bookings[bIndex];
			if (next.start < now) {
				availability.currentBooking = {
					title : next.event().title(),
					organizer : next.event().organizer(),
					minutesTilStart : 0,
					minutesTilEnd : minutesBetween(now, next.end)
				};
				bIndex++;
			}
			next = bookings[bIndex];
			if (next) {
				availability.nextBooking = {
					title : next.event().title(),
					organizer : next.event().organizer(),
					minutesTilStart : minutesBetween(now, next.start),
					minutesTilEnd : minutesBetween(now, next.end)
				};
			}
			
			var freeTime = now, freeMinutes;
			next = bookings.shift();
			while(next && minutesBetween(freeTime, next.start) < minBookableMinutes) {
				freeTime = next.end;
				next = bookings.shift();
			}
			availability.freeAt = freeTime;
			availability.minutesTilFree = minutesBetween(now, freeTime);
			if (next) {
				availability.minutesFreeFor = minutesBetween(freeTime, next.start);
			}
		}
		
		return availability;
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
				minutesFreeFor <= maxBookableMinutes ?
					'freetime-adequate' :
					'freetime-long'
			);
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
				Stages.RoomList.updateRow(ViewModels.otherRooms.getRow(otherRoom));
				sortRoomList();
			});
		}
	}
	function updateRoomRowUi(otherRoom) {
		if(otherRoom.loaded()) {
			var availability = getRoomAvailability(otherRoom);
			$roomsList.find('#' + otherRoom.id().replace(/(\.|%)/g, '\\$1'))
				.removeClass()
				.addClass(getStatusClassString(availability.minutesTilFree, availability.minutesFreeFor))
				.find('span')
					.text(availability.minutesFreeIn <= 0 ? '' : availability.minutesTilFree);
		}
	}
	function sortRoomList() {
		var now = DebugSettings.now() || new Date();
	
		var $rooms = $roomsList.children();
		var roomArray = $.makeArray($rooms.detach());
			roomArray.sort(function(a, b) {
				var aRoom = $(a).data('model').getRoom(),
					bRoom = $(b).data('model').getRoom(),
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
				
					if (aFreeMinutes == bFreeMinutes || (aFreeMinutes > maxBookableMinutes && bFreeMinutes > maxBookableMinutes)) {
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
	
	thisRoom.load(function () {
        try {
			Stages.Status.init($('#container'));
			Stages.Book.init($('#booking'));
			Stages.RoomList.init($('#rooms'));
			
            //run immediately, then
            ViewModels.thisRoom.setRoom(thisRoom);
			Stages.Status.enter();
            //load the other room data so we can display it right.
			ViewModels.otherRooms.load(EventManager.rooms);

            //Update all the minute values on the next minute start, then each minute thereafter.
            //this is so the clock matches the system clock with no delay.
            runEveryNMinutesOnTheMthSecond(1, 1, function() {
                Stages.Status.update();
                Stages.RoomList.updateAllRows();
            });

            //update this room's event data and make the ui match every 2 minutes on the :40.
            runEveryNMinutesOnTheMthSecond(30, 40, function() {
                        thisRoom.reload(function() {
							Stages.Status.update();
                            Stages.RoomList.updateRow(ViewModels.otherRooms.getRow(thisRoom));
                            sortRoomList();
                        });
                    });
            //update the other rooms over time - one every minute on the :20
            runEveryNMinutesOnTheMthSecond(15, 20, updateARoom);
        } catch (err) {
            Logger.log(null, err);
        }
	});
}


