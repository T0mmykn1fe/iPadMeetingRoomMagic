var https = require('https');
var url = require('url');

function toQS(obj) {
    var arr = [];
    for(var key in obj) {
        arr.push(key + '=' + obj[key]);
    }
    return arr.join('&');
}
function makeRequest(token, method, uri, opt_data, cb) {
	if (typeof opt_data === 'function') {
		cb = opt_data;
		opt_data = undefined;
	}

	var options = url.parse(uri);
	options.headers = {
		'Authorization' : 'Bearer ' + token
	};
	options.method = method;

	var req = https.request(options, function(res) {
		var data = '';
		res.on('data', function(d) { data += d; });
		res.on('end', function() {
			try {
				cb(null, JSON.parse(data));
			} catch(e) {
				cb({
					message : e,
					url : uri,
					responseBody : data,
					requestBody : opt_data
				});
			}
		});
	});

	req.on('error', cb);
    req.setTimeout(20 * 1000, function() {
        req.abort();
        cb('Timed out.');
    });

	if (opt_data) {
		req.write(opt_data);
	}
	req.end();
}

function GCal(tokenData) {
	this._tokenData = tokenData;
}

GCal.prototype.book = function(calendarId, startDate, endDate, cb) {
	var self = this;
	this._tokenData.refresh(function() {
		makeRequest(self._tokenData.getToken(), 'POST',
			'https://www.googleapis.com/calendar/v3/calendars/' + calendarId + '/events', {
				summary : 'Improptu Meeting',
				description : 'This meeting was booked anonymously using the MEAT app.',
				start : {
					dateTime : startDate.toISOString()
				},
				end : {
					dateTime : endDate.toISOString()
				},
				attendees : [{
					email : calendarId,
				}]
			}, cb);
	});
};
GCal.prototype.getUpcomingEvents = function(calendarId, cb) {
	var self = this;
	this._tokenData.refresh(function() {
		makeRequest(self._tokenData.getToken(), 'GET',
			'https://www.googleapis.com/calendar/v3/calendars/' + calendarId + '/events?' + toQS({
				orderBy : 'startTime',
				singleEvents : true,
				timeMin : new Date().toISOString(),
				timeMax : new Date(new Date().getTime() + (24 * 60 * 60 * 1000)).toISOString()
			}), cb);
	});
};
GCal.prototype.getRooms = function(cb) {
	var self = this;
	this._tokenData.refresh(function() {
		makeRequest(self._tokenData.getToken(), 'GET',
			'https://www.googleapis.com/calendar/v3/users/me/calendarList', cb);
	});
};

module.exports = function(tokenData) {
	return new GCal(tokenData);
};