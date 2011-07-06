/* Atlassian M.E.A.T.
 * Authors: Adam Ahmed, Martin Jopson, Stephen Russell, Robert Smart
 * (c) 2011 Atlassian Pty Ltd.
 * Atlassian M.E.A.T. may be freely distributed under the MIT license.
 */

function initUi(thisRoom) {	
	
	function coalesce(a,b) { return a == null ? b : a; }
	var bookingParams = EventManagerConfig.bookingParameters || {};
	var maxBookableMinutes = 			coalesce(bookingParams.maxBookableMinutes, 60),
		minBookableMinutes = 			coalesce(bookingParams.minBookableMinutes, 5),
		maxStatusSoonMinutes = 			coalesce(bookingParams.maxStatusSoonMinutes, 0),
		minFreeTimeAdequateMinutes = 	coalesce(bookingParams.minFreeTimeAdequateMinutes, 0),
		defaultTimeBlock = 				coalesce(bookingParams.defaultBookingMinutes, 30),
		timeInterval = 					coalesce(bookingParams.bookingIntervalMinutes, 15),
		idleTimeoutSec = 				coalesce(EventManagerConfig.idleTimeoutSeconds, 30);
	
	var ViewModels = (function() {

		function minutesBetween(a, b) {
			return Math.ceil((b.getTime() - a.getTime()) / 60000);
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
			
		return {
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
					getDisplayedBookingCount : function() {
						var availability = getRoomAvailability(room);
						var bookings = 0;
						availability.currentBooking && bookings++;
						availability.nextBooking && bookings++;
						return bookings;
					},
					sync : function() {}
				};
			})(),
			otherRooms : (function() {
				var rows = {};
				
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
				
				function rowCompareTo(otherRow) {
					var now = DebugSettings.now() || new Date(),
						aRoom = this.getRoom(),
						bRoom = otherRow.getRoom(),
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
					
				}
				
				return {
					createRoomRowViewModel : function(room) {
						if (rows.hasOwnProperty(room.id())) {
							throw new Error("A row has already been created for room " + room.simpleName() + " (ID: " + room.id() + ")");
						}
						
						return rows[room.id()] = {
								sync : function() {},
								getHtmlId : function() { return htmlEscape(room.id()); },
								getDisplayName : function() { return room.simpleName(); },
								getRoom : function() { return room; },
								getCssClass : function() {
									var availability = getRoomAvailability(room);
									return getStatusClassString(availability.minutesTilFree, availability.minutesFreeFor);
								},
								compareTo : rowCompareTo
							};
					},
					getRow : function(room) {
						return rows.hasOwnProperty(room.id()) ? rows[room.id()] : undefined;
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
							bookingDuration = Math.max(minBookableMinutes, Math.min(timeInterval, availability.minutesFreeFor));
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
					canBook : function() {
						return bookingDuration >= minBookableMinutes && bookingDuration <= Math.min(availability.minutesFreeFor, maxBookableMinutes);
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
					updateTimes : function() {
						availability = getRoomAvailability(bookingRoom);
						bookingDuration = Math.min(bookingDuration, Math.min(maxBookableMinutes, availability.minutesFreeFor));
					}
				}; 
			})(),
		};
	})();
		
	var Stages = (function() {
		var $body = $('body'),
			$close = $('#close').click(function (e) {
				revertToPreviousStage();
				e.stopPropagation();
			});
		
		var currStage,
			prevStages = [ ];
		
		function switchTo(newStage, asRevert) {
			if (newStage && currStage !== Switching && currStage !== newStage) {
				var prevStage = currStage;
				currStage = Switching;
				
				if (prevStage) {
					// If we're switching "backwards", don't push the current stage onto the stack
					asRevert || prevStages.push(prevStage);
					$body.queue(prevStage.exit);
				}
				
				$body.queue(newStage.enter).queue(function() {
					currStage = newStage;
					$body.dequeue();
				});
			}
		}
		function revertToPreviousStage() {
			if (currStage !== Switching) {
				var newStage = prevStages.pop();
				if (newStage) {
					switchTo(newStage, true);
				}
			}
		}
		function revertToInitial() {
			prevStages.length && (prevStages = [ prevStages[0] ]);
			revertToPreviousStage();
		}
	
		var Status = (function() {
				var self,
					model,
					idleTimeout,
					$container,
					$status,
					$statusMinutes,
					$events,
					$currentEvent,
					$nextEvent;
				return self = {
					name : 'status',
					enter : function() {
						$body.removeClass().addClass("show-status");	
						
						if (idleTimeout) {
							ActivityMonitor.clearIdleHandler(idleTimeout);
							idleTimeout = null;
						}
						
						self.update();
						$status.fadeIn('slow', function() {
							$status.css('display', '');
							$body.dequeue();
						});
					},
					exit : function() {
						$status.fadeOut('fast', function() {
							$body.removeClass();
							
							if (!idleTimeout) {
								idleTimeout = ActivityMonitor.setIdleHandler(idleTimeoutSec * 1000, revertToInitial);
							}
							
							$body.dequeue();
						});
					},
					init : function($theContainer, thisRoom) {
						model = ViewModels.thisRoom;
						model.setRoom(thisRoom);
						
						$container = $theContainer;
						$status = $('#status', $container).click(function(e) {
							if (!model.getCurrentBooking()) {
								Book.setRoom(model.getRoom());
								switchTo(Book);
							} else {
								switchTo(RoomList);
							}
							e.stopPropagation();
						});
						$statusMinutes = $('#minutes-free', $status);
						$events = $('.events', $status);
						$currentEvent = $('#current-event', $events);
						$nextEvent = $('#next-event', $events);
						
						GlobalEvents.bind('minuteChanged', self.update);
						GlobalEvents.bind('roomUpdatedByServer', function(event, room) {
							room === model.getRoom() && self.update();
						});
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
							
							updateEventDOM($currentEvent, model.getCurrentBooking());
							updateEventDOM($nextEvent, model.getNextBooking());
							
							$status.removeClass().addClass("events-upcoming-" + model.getDisplayedBookingCount());
						};
					})()
				};
			})(),
			RoomList = (function() {
				var self,
					model,
					$rooms,
					$roomsList;
				
				function sortRoomList() {
				
					var $rooms = $roomsList.children();
					var roomArray = $.makeArray($rooms.detach());
						roomArray.sort(function(a, b) {
							return $(a).data('model').compareTo($(b).data('model'));
						});
					$(roomArray).appendTo($roomsList);
				}
				
				return self = {
					name : 'rooms',
					enter : function() {
						$body.removeClass().addClass("show-rooms");				
						$rooms.fadeIn('slow',function(){
							$close.toggleClass('hidden', !thisRoom);
							$rooms.css('display', '');
							$body.dequeue();
						});
					},
					exit : function() {
						$rooms.fadeOut('fast',function() {
							$body.removeClass('show-rooms');
							$close.addClass('hidden');
							$body.dequeue();
						});
					},
					init : function($root) {
						model = ViewModels.otherRooms;
						$rooms = $root;
						$roomsList = $rooms.children('ul');
						GlobalEvents.bind('roomLoaded', function(event, room) {
							self.createRow(model.createRoomRowViewModel(room));
						});
						GlobalEvents.bind('roomUpdatedByServer', function(event, room) {
							self.updateRow(room);
							sortRoomList();
						});
						GlobalEvents.bind('minuteChanged', self.updateAllRows);
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
							Book.setRoom(rowModel.getRoom());
							switchTo(Book);
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
						sortRoomList();
					},
					reset : function() {
						$roomsList.children().remove();
					}
				};
			})(),
			Book = (function() {
				var self,
					model,
					$booking,
					$roomName,
					$freeIn,
					$timeAvailable,
					$timeRequired,
					$timeMore,
					$timeLess,
					$freeAt;
					
					function onTimeRequiredClicked(e) {
						if (!$timeRequired.hasClass('disabled')) {
							var bookingRoom = model.getBookingRoom(),
								onComplete = function() {
								};
							$timeRequired
								.text("Booked")
								.siblings()
									.addClass('hidden')
								.end()
								.queue(function() {
									var onComplete = function() {
										GlobalEvents.unbind('roomUpdatedByServer', onSuccess);
										GlobalEvents.unbind('bookingFailure', onFailure);
										
										switchTo(thisRoom ? Status : RoomList);
										$timeRequired.dequeue();
									}, onSuccess = function (event, room) {
										if (room === bookingRoom) {
											onComplete();
										}
									}, onFailure = function(event, room) {
										if (room === bookingRoom) {
											$timeRequired.text('ERROR');
											setTimeout(onComplete, 2000);
										}
									};
									GlobalEvents.bind('roomUpdatedByServer', onSuccess);
									GlobalEvents.bind('bookingFailure', onFailure);
									GlobalEvents.trigger('bookingAddedByUser', {
										room : bookingRoom,
										title : 'Impromptu Meeting',
										time : model.getBookingTime(),
										duration : model.getBookingDuration()
									});
								});
						}
						return false;
					}
					function onMoreTimeClicked(e) {
						if (!$timeMore.hasClass('disabled')) {
							$timeRequired.text(model.addTimeInterval());
							$timeMore.toggleClass('disabled', !model.canAddTime());
							$timeLess.toggleClass('disabled', !model.canSubtractTime());
						}
						
						return false;
					}
					function onLessTimeClicked(e) {
						if (!$timeLess.hasClass('disabled')) {
							$timeRequired.text(model.subtractTimeInterval());
							$timeMore.toggleClass('disabled', !model.canAddTime());
							$timeLess.toggleClass('disabled', !model.canSubtractTime());
						}
						
						return false;
					}
					
				return self = {
					name : 'book',
					enter : function() {
						self.reset();
						$body.removeClass().addClass("show-booking");
						$booking.fadeIn('slow',function(){
							$booking.css('display', '');
							$close.removeClass('hidden');
							$body.dequeue();
						});
					},
					exit : function() {
						$booking.fadeOut('fast',function(){
							$body.removeClass('show-booking');
							$close.addClass('hidden');
							$body.dequeue();
						});
					},
					init : function($root) {
						model = ViewModels.bookingData;
						
						GlobalEvents.bind('minuteChanged', function() {
							if (model.getBookingRoom()) {
								model.updateTimes();
								$timeAvailable.text(model.getTimeAvailableString());
								$timeRequired.text(model.getBookingDuration()).toggleClass('disabled', !model.canBook());
								$freeAt.text(model.getTimeFreeAtString());
							}
						});
						
						$booking = $root;
						
						$timeAvailable = $('#info .time-available', $root);
						$timeRequired = $("#time-required", $root).click(onTimeRequiredClicked);
						$timeMore = $("#time-more", $root).click(onMoreTimeClicked);
						$timeLess = $("#time-less", $root).click(onLessTimeClicked);
						$roomName = $('#room-name', $root);
						$freeAt = $('.free-at', $root);
					},
					setRoom : function(room) {
						model.setRoom(room);
					},
					reset : function() {
						$roomName.text(model.getBookingRoomName());
						$timeAvailable.text(model.getTimeAvailableString());
						$timeRequired.removeClass('disabled').text(model.getBookingDuration());
						$freeAt.text(model.getTimeFreeAtString());
						$timeMore.removeClass('hidden').toggleClass('disabled', !model.canAddTime());
						$timeLess.removeClass('hidden').toggleClass('disabled', !model.canSubtractTime());
					}
				};
			})(),
			Switching = {};
		
		return {
			init : function(thisRoom) {
				Book.init($('#booking'));
				RoomList.init($('#rooms'));
				if (thisRoom) {
					Status.init($('#container'), thisRoom);
					if (thisRoom.loaded()) {
						switchTo(Status);
					} else {
						GlobalEvents.bind('roomLoaded', function(event, room) {
							if (room === thisRoom) {
								switchTo(Status);
							}
						});
					}
				} else {
					switchTo(RoomList);
				}
			}
		};
	})();
	
	Stages.init(thisRoom);
}


