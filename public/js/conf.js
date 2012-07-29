/* Atlassian M.E.A.T.
 * Authors: Adam Ahmed, Martin Jopson, Stephen Russell, Robert Smart
 * (c) 2011 Atlassian Pty Ltd.
 * Atlassian M.E.A.T. may be freely distributed under the MIT Expat license.
 */

var EventManagerConfig = {
	
	/*
		How long to wait, in seconds, for user input before reverting to the initial screen.
	*/
	idleTimeoutSeconds : 30,
	
	bookingParameters : {
		// the maximum number of minutes that a user is allowed to book
		maxBookableMinutes : 60,
		// the minimum number of minutes that a user is allowed to book
		minBookableMinutes : 5,
		// your definition of "room is available soon" in minutes. 0 will disable.
		maxStatusSoonMinutes : 0,
		// your definition of "room has enough time available for a meeting" in minutes.  0 will disable.
		minFreeTimeAdequateMinutes : 0,
		// The default meeting duration in minutes
		defaultBookingMinutes : 30,
		// The number of minutes to add or subtract from the booking duration per button press
		bookingIntervalMinutes : 15
	},
	
	/*
		Either:
			- null/undefined/falsy to list ALL rooms,
			- an array of all room names to display, or
			- a regular expression to check against each room
		
		Examples:
			regular expression to match all rooms with names that start with "Syd - ":
				/^Syd - /
			array to match only two specific rooms: 
				['Syd - Coding Corner', 'Syd - Neo - Kent St']
	*/
	roomsToShow : null
	
	/*
		A regex that defines parts of the room name NOT to display, or falsy to display the full name.
		
		Examples:
			regex that would cause 'Syd - Coding Corner' to display as 'Coding Corner'
				/^Syd - /g
	*/
,	removeRegex : null

	/*
		Use this setting to "disable" MEAT during non-office hours. The MEAT will still work,
		but the display will be black when left idle for 30s or more. By default, MEAT will display at all times.

		"days" should be an array of 3-letter weekday abbreviations
		MEAT will be enabled between "start" and "end" times on those days.

		The format of these settings is very strict - only 3-letter weekday abbreviations and 4-digit 24-hour time
		are supported.
	*/
,	enabledPeriod : null/*{
		days : [ 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun' ],
		timeRange : {
			start : '07:00',
			end : '19:00'
		}
	}*/
};