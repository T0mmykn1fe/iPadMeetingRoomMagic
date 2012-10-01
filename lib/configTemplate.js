{
	"rooms" : {
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
		"filter" : null
		/*
			Which property to run the above filter on ('name' or 'key')
		*/
	,	"filterBy" : "name"
		
		/*
			A regex that defines parts of the room name NOT to display, or falsy to display the full name.
			
			Examples:
				regex that would cause 'Syd - Coding Corner' to display as 'Coding Corner'
					/^Syd - /g
		*/
	,	"noDisplayRegex" : null
	}
,	"booking" : {
		// the maximum number of minutes that a user is allowed to book
		"maxBookableMinutes" : 60,
		// the minimum number of minutes that a user is allowed to book
		"minBookableMinutes" : 5,
		// your definition of "room is available soon" in minutes. 0 will disable.
		"maxStatusSoonMinutes" : 0,
		// your definition of "room has enough time available for a meeting" in minutes.  0 will disable.
		"minFreeTimeAdequateMinutes" : 0,
		// The default meeting duration in minutes
		"defaultBookingMinutes" : 30,
		// The number of minutes to add or subtract from the booking duration per button press
		"bookingIntervalMinutes" : 15
	}
	/* data comes from google apps. no other options available at this time */
,	"datasource" : "gapps"

	/* Configuration specific to a gapps datasource. */
,	"gapps" : {
		/* A clientId and clientSecret from Google Apps API Console when registering for
		   "Installed apps" API access. This default is a universal MEAT id/secret pair
		   which is only allowed 10k requests per day, so will probably run out fast... */
		"clientId" : "23835704985.apps.googleusercontent.com"
	,	"clientSecret" : "Pj1DAnZGNn8mfHMllmyrcKex"

		/*
			Whether to include only calendars that are labeled as resources. Resources will have ids
			like {resource}@resource.calendar.google.com
		*/
	,	"resourcesOnly" : true
	}

	/* A secret used to identify legitimate users. This is not secure, it is only obscuring.
	   A more robust solution is required. It is recommended you only run MEATier on secured networks.

       If specified, any device wanting to read or write to the datasource will need to
	   include a secret="{deviceSecret}" query string variable.
	 */
,	"deviceSecret" : null
,	"server" : {
		/* The port on which to run MEAT. Defaults to the value of $C9_PORT or 80 */
		"port" : null
	}
,	"client" : {	
		/*
			How long to wait, in seconds, for user input before reverting to the initial screen.
		*/
		"idleTimeoutSeconds" : 30
		
		/*
			A regex that defines parts of the room name NOT to display, or falsy to display the full name.
			
			Examples:
				regex that would cause 'Syd - Coding Corner' to display as 'Coding Corner'
					/^Syd - /g
		*/
	,	"removeRegex" : null

		/*
			Use this setting to "disable" MEAT iPads during non-office hours. The MEAT will still work,
			but the display will be black when left idle for 30s or more. By default, MEAT will display at all times.

			"days" should be an array of 3-letter weekday abbreviations
			MEAT will be enabled between "start" and "end" times on those days.

			The format of these settings is very strict - only 3-letter weekday abbreviations and 4-digit 24-hour time
			are supported.
		*/
	,	"enabledPeriod" : null/*{
			days : [ "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" ],
			timeRange : {
				start : "07:00",
				end : "19:00"
			}
		}*/
	}
}