
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var extend = require('node.extend');
var existsSync = fs.existsSync || path.existsSync;

// the conf isn't exactly JSON since we want regexs, so we eval it as JS.
function getJSONish(path) {
    /*jshint evil:true */
    try {
        return new Function('return ' + fs.readFileSync(path, 'utf8'))();   
    } catch(err) {
        throw new Error('Could not parse ' + path + '\n' + err);
    }
}

function extractToRoomFilter(roomFilterOption, filterProperty) {
    if (!roomFilterOption) {
        return function() { return true; };
    }

    filterProperty = filterProperty || 'name';

    var propFunc;
    switch(filterProperty) {
        case 'key':
            propFunc = 'getKey'; break;
        case 'name':
            propFunc = 'getName'; break;
        default:
            throw new Error('Invalid room filter property "' + filterProperty +
                '". Only "name" and "key" are allowed.');
    }

    if (roomFilterOption instanceof Array) {
        return function(room) {
            var roomProp = room[propFunc]();
            return roomFilterOption.some(function(includedRoomProp) {
                return roomProp === includedRoomProp;
            });
        };
    }

    if (typeof roomFilterOption.test === 'function') {
        return function(room) {
            var roomProp = room[propFunc]();
            roomFilterOption.lastIndex = 0;
            return roomFilterOption.test(roomProp);
        };
    }

    throw new Error('Invalid room filter value "' + roomFilterOption +
        '". Only Array or RegExp are allowed.');
}

exports.getConfiguration = function() {
    var home_dir = process.env.MEAT_HOME;
    if (!home_dir) {
        console.log(
            'It is required that you set a MEAT_HOME environment\n' +
            'variable containing a path to a directory for storing\n' +
            'data and configuration Use\n' +
            '   set MEAT_HOME=C:\\path\\to\\data (Windows)\n' +
            'or\n' +
            '   export MEAT_HOME=/path/to/data (*nix)\n' +
            'Exiting...');
        process.exit(1);
    }

    if (!existsSync(home_dir)) {
        console.log('Directory ' + home_dir + ' doesn\'t exist. Creating it.');
        mkdirp.sync(home_dir);
    }

    var data_dir = path.join(home_dir, 'data');
    var config_dir = path.join(home_dir, 'config');
    var logs_dir = path.join(home_dir, 'logs');
    var plugins_dir = path.join(home_dir, 'plugins');

    [ data_dir, config_dir, logs_dir, plugins_dir ].forEach(function(dir) {
        if (!existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    });

    var coreConfig = path.join(config_dir, 'core.js');
    var configTemplate = path.join(__dirname, 'configTemplate.js');
    if (!existsSync(coreConfig)) {
        console.log(
            'Required configuration file ' + coreConfig + ' does\n' +
            'not exist. Creating from template...');
        fs.writeFileSync(coreConfig, fs.readFileSync(configTemplate));
        console.log(
            'Created file. Please add your configuration to it. Exiting...');
        process.exit(1);
    }

    var options = extend(true, getJSONish(configTemplate), getJSONish(coreConfig));

    options.rooms.filter = extractToRoomFilter(options.rooms.filter, options.rooms.filterBy);

    if (options.datasource.substring(0, 7) === 'plugin:') {
        var pluginModule = path.join(plugins_dir, options.datasource.substring(7));
        if (require.resolve(pluginModule)){
            options.datasourceLoader = require(pluginModule);
        } else {
            throw new Error("Datasource plugin '" + pluginModule + "' not found.");
        }
    } else if (options.datasource in { 'gapps' : 1 }) {
        options.datasourceLoader = require('./' + options.datasource + '/datasource');
    } else {
        throw new Error('Datasource not found. Try using Google Apps (gapps)');
    }

    return {
        directories : {
            data : data_dir,
            configuration : config_dir,
            logs : logs_dir 
        },
        options : options
    };
};
