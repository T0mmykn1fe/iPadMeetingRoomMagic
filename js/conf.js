var EventManagerConfig = {

	/*
		The gApps domain to 
	*/
	appDomain : "atlassian.com",
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