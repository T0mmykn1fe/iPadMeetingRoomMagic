/*** HACK HAAAAAAACK HACK HACK HAHACK HACK HACKKKKK HACCK ***/
//HACK: the most ghetto of storage options. Will fix if it ever matters.

var fs = require('fs');
var path = require('path');

var storage_dir = path.join(__dirname, 'data');

try { fs.mkdirSync(storage_dir); }
catch (e) { /* chuck it */ }

exports.put = function(key, value) {
    try {
        fs.writeFileSync(path.join(storage_dir, key + ""), JSON.stringify(value), 'utf8');
    }
    catch(e) { /* chuck it */ }
};

exports.get = function(key) {
    try {
        return JSON.parse(fs.readFileSync(path.join(storage_dir, key + "")), 'utf8');
    }
    catch(e) { /* chuck it */ }
};