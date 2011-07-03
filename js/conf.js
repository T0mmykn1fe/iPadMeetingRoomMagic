var EventManagerConfig = {

	/*
		The gApps domain to use for calendaring.
	*/
	appDomain : "atlassian.com",
	
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
	roomsToShow :  /^Syd - /
	
	/*
		A regex that defines parts of the room name NOT to display, or falsy to display the full name.
		
		Examples:
			regex that would cause 'Syd - Coding Corner' to display as 'Coding Corner'
				/^Syd - /g
	*/
,	removeRegex : /^Syd - /g
};