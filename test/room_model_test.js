

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/
var Room;

exports['Room'] = {
  setUp: function(done) {
    Room = require('../lib/models/room');
    done();
  },
  'toJSON': function(test) {
    test.expect(9);

    var r = new Room('key', 'name');
    var rJson = r.toJSON();

    test.ok(rJson);
    test.equal(rJson.key, 'key');
    test.equal(rJson.name, 'name');
    test.ok(!rJson.events);

    var mock1Json = {};
    var mock1 = { _start : new Date(), toJSON : function() { return mock1Json; } };
    r.setEvents([ mock1 ]);
    rJson = r.toJSON(true);
    test.strictEqual(rJson.events && rJson.events.length, 1);
    test.strictEqual(rJson.events[0], mock1Json);

    var mock2Json = {};
    var mock2 = { _start : new Date(mock1._start - 1), toJSON : function() { return mock2Json; } };
    r.addEvent(mock2);
    rJson = r.toJSON(true);
    test.strictEqual(rJson.events && rJson.events.length, 2);
    test.equal(rJson.events[0], mock2Json);
    test.equal(rJson.events[1], mock1Json);

    test.done();
  }
};
