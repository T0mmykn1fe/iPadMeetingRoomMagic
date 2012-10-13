//for playing around with the Google Calendar API and seeing what data is returned.

var gcal = require('../lib/gapps/gcal');
var tokenHandler = require('../lib/gapps/tokenHandler');

var clientId = '23835704985.apps.googleusercontent.com';
var clientSecret = 'Pj1DAnZGNn8mfHMllmyrcKex';

tokenHandler.getTokenData(clientId, clientSecret, function(err, tokenData) {
    var calApi = gcal(tokenData, require('winston'));
/*
    calApi.getRooms(function(err, res) {
        console.log(res);
    });*/

    var zoolander = 'atlassian.com_2d31363935383530352d343335@resource.calendar.google.com';
    calApi.getUpcomingEvents(zoolander,
        new Date(2012, 8, 26),
        function(err, res) {
        res.items.forEach(function(item) {
            console.dir(item);
        });
    });
});
