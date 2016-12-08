var fs = require('fs');
var _ = require('lodash');
var moment = require('moment');
var colors = require('colors/safe');

var constants = require('./constants');



function Config() {
	// Parse command line args
	this.args = getNodeArgs();

	// Load config file
	if (!this.args.config)
		this.args.config = './config.json';
	console.log(colors.dim('loading config from ' + this.args.config));
	this.settings = require(this.args.config);

	// Override client ID and secret with command line values
	if (this.args.clientid)
		this.settings.pureCloud.clientId = this.args.clientid;
	if (this.args.clientsecret)
		this.settings.pureCloud.clientSecret = this.args.clientsecret;
}



module.exports = new Config();



function setCustomData(obj, customData) {
	if (customData === null) return;

	_.forOwn(customData, function(value, key) {
		obj[key] = value;
	});
}

function getNodeArgs() {
	var args = {};

	// Parse into pretty object
	for (i = 2; i < process.argv.length; i++) {
		var arg = process.argv[i];
		var index = arg.indexOf('=');

		if (index > 0) {
			// format was key=value
			var key = arg.substr(0,index);
			var value = arg.substr(index + 1);

			// Remove leading slash and dash
			if (key.startsWith('/'))
				key = key.substr(1);
			if (key.startsWith('--'))
				key = key.substr(2);

			args[key.toLowerCase()] = value;
		} else {
			// No equals sign, set whole thing as key and value->true
			
			// Remove leading slash and dash
			if (arg.startsWith('/'))
				arg = arg.substr(1);
			if (arg.startsWith('--'))
				arg = arg.substr(2);

			args[arg.toLowerCase()] = true;
		}
	}
	return args;
}