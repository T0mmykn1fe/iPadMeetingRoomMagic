(function() {
	var roomName = ParameterParser.parse().room;

	if (roomName) {
		EventManager.init(function() {
			var room = EventManager.getRoom(roomName);
			EventManager.THIS_ROOM = room;
			if (room) {
				room.load();
				initUi(room);
			} else {
				$('#count')
					.css('font-size','18px')
					.text('You entered an invalid room name.  The room could not be found.')
					.show();
			}
		});
	} else {
		var locationStr =
			window.location.protocol + '//' + window.location.host + window.location.pathname;
		$('#loading')
			.css('font-size','18px')
			.text('You must enter a room name in the url in the form "' + locationStr + '?room={room name}"')
			.show();
	}

	var oneDay = 1000 * 60 * 60 * 24;
	var midnight = new Date(new Date().getTime() + oneDay);
	midnight.setSeconds(0);
	midnight.setMinutes(0);
	midnight.setHours(0);
	if (midnight < new Date()) midnight = new Date(midnight.getTime() + oneDay);
	setTimeout(function() { window.location.reload();}, midnight - new Date());
	
})();