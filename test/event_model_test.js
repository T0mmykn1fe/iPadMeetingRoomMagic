

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
var Event;

exports['Event'] = {
  setUp: function(done) {
    Event = require('../lib/models/event');
    // setup here
    done();
  },
  'toJSON': function(test) {
    test.expect(5);

    var e = new Event('title', 'organizer', new Date(2012, 1, 1), new Date(2012, 1, 7));
    var eJson = e.toJSON();

    test.ok(eJson);
    test.equal(eJson.title, 'title');
    test.equal(eJson.organizer, 'organizer');
    test.equal(eJson.start, new Date(2012, 1, 1).toISOString());
    test.equal(eJson.end, new Date(2012, 1, 7).toISOString());
    test.done();
  }
};
