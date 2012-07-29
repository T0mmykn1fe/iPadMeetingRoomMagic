# MEATIER

#MEAT

##What It Is

MEAT is meant to be displayed outside your meeting rooms on any device with a 
modern web browser (we use iPads, but you can use netbooks, phones, or whatever).
If you're signed up with Google Apps, MEAT will display status for all your 
meeting rooms and allow you to book time on the spot.

##Quick Start

There are two parts to MEAT: the web server, and the display.  Generally all the
setup is on the server, and the displays just hit a url. So...

### Step 1: Clone this repository

### Step 2: Get NodeJS

### Step 3: 

    cd {path to MEATIER}
    npm install
    node lib/MEATIER.js [port]

Where the default port is 80

### Step 4: Config (conf.js)

Next edit conf.js with any custom configuration.  You'll definitely want to
change {{appDomain}} to your Google Apps domain.  You can play with the other
settings too, but they'll generally work as-is.

### Step 4: Displays
Room displays should hit:

    http://example.com/path/to/meat/?room={roomName}

Where {roomName} is the full, case-sensitive, URL-encoded name of the room 
they're in front of.

If you'd like to have a display show information for all rooms by default, 
then just hit:

    http://example.com/path/to/meat/

When you first visit that URL, you will be redirected to Google Apps to login and
provide access.  This is a one-time deal.  As long as you don't clear your
browser's cookies, you will remain logged in.  I'd recommend creating a user
specifically for MEAT.  This way you can modify access easily through GApps
without any side-effects.

## Security

Unless you consider the information in your conf.js file to be private, there's
no security issues with your web server being public.  Anyone using MEAT will have
to sign into Google Apps themselves, so your information is safe.

Your displays are another story - if someone gets a hold of one, they effectively
have all the access of that user to Google Apps.  So please don't use an admin
account for MEAT!

## Documentation
_(Coming soon)_

## Examples
_(Coming soon)_

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [grunt](https://github.com/cowboy/grunt).

## Release History
_(Nothing yet)_

## License
Copyright (c) 2012 Adam Ahmed  
Licensed under the MIT license.
