Atlassian M.E.A.T.
Authors: Adam Ahmed, Martin Jopson, Stephen Russell, Robert Smart
(c) 2011 Atlassian Pty Ltd.
Atlassian M.E.A.T. may be freely distributed under the MIT Expat license.

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

You'll need the ./public directory files to be accessible from the web.

### Setup a webserver - any webserver will do.

Apache HTTPD works for me, but if you like node and don't already have a server
setup, you can do:

    npm install connect
    node runViaNode.js [port [/path/to/public]]

Where the default port is 80 and the default path is ./public

### Config (conf.js)

Next edit conf.js with any custom configuration.  You'll definitely want to
change {{appDomain}} to your Google Apps domain.  You can play wiht the other
settings too, but they'll generally work as-is.

### Displays
Room displays should hit:

    http://example.com/path/to/meat/?room={roomName}

Where {roomName} is the full case-sensitive name of the room they're in front of.

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