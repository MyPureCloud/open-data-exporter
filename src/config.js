var fs = require('fs')

var config = {};

config.load = function() {
	// TODO: error handling
	var configFileData = fs.readFileSync('config.json', 'UTF-8');
	config.settings = JSON.parse(configFileData);
	//console.log(JSON.stringify(config.settings, null, 2));
}

module.exports = config;