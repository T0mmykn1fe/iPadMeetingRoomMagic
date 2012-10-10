function Event(title, organizer, start, end) {
	this._title = title;
	this._organizer = organizer;
	this._start = start;
	this._end = end;
}

Event.prototype.toJSON = function() {
	return {
		title : this._title,
		organizer : this._organizer,
		start : this._start,
		end : this._end
	};
};

module.exports = Event;