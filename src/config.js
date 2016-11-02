var fs = require('fs');
var _ = require('lodash');
var moment = require('moment');

var constants = require('./constants');

function Config() {
	// TODO: error handling
	// TODO: replace with `config.settings = require('./config.json');` ???
	var configFileData = fs.readFileSync('config.json', 'UTF-8');
	this.settings = JSON.parse(configFileData);
	this.args = getNodeArgs();
}

Config.prototype.getJobData = function(data, jobName) {
	var now = new moment();

	var packagedData = {};

	// Set data object
	packagedData.data = data;

	// Populate default vars
	packagedData.args = this.args;
	packagedData.vars = {};
	packagedData.job = this.settings.jobs[jobName];
	packagedData.vars.date = now.clone();
	packagedData.vars.interval = 'PT30M';

	// Populate vars from config
	// Load order (left to right): global > job > configuration > query > transform > template, export
	setCustomData(packagedData.vars, this.settings.customData);
	setCustomData(packagedData.vars, packagedData.job.customData);
	setCustomData(packagedData.vars, packagedData.job.configuration.customData);
	setCustomData(packagedData.vars, packagedData.job.configuration.query.customData);
	setCustomData(packagedData.vars, packagedData.job.configuration.transform.customData);
	setCustomData(packagedData.vars, packagedData.job.configuration.template.customData);
	setCustomData(packagedData.vars, packagedData.job.configuration.export.customData);

	// Parse interval to object for math operations (moment.js doesn't parse ISO-8601 durations passed to .add or .subtract)
	var interval = moment.duration(packagedData.vars.interval);

	// Populate derived variables
	packagedData.vars.currentHour = now.clone().startOf('hour');
	packagedData.vars.previousHour = now.clone().startOf('hour').subtract(1, 'hour');

	packagedData.vars.currentIntervalStart = packagedData.vars.currentHour.clone();
	packagedData.vars.previousIntervalStart = packagedData.vars.currentHour.clone().subtract(interval);
	for (i=1;i<60;i++) {
		var nextInterval = packagedData.vars.currentIntervalStart.clone().add(interval);
		if (nextInterval < now) {
			// Interval does not exceed current time, set it
			packagedData.vars.currentIntervalStart = nextInterval;
			packagedData.vars.previousIntervalStart = nextInterval.clone().subtract(interval);
		}
		else {
			break;
		}
	}

	packagedData.vars.currentInterval = packagedData.vars.currentIntervalStart.format() + '/' + packagedData.vars.currentIntervalStart.clone().add(interval).format();
	packagedData.vars.previousInterval = packagedData.vars.previousIntervalStart.format() + '/' + packagedData.vars.previousIntervalStart.clone().add(interval).format();


	return packagedData;
}

module.exports = new Config();



function setCustomData(obj, customData) {
	if (customData == null) return;

	_.forOwn(customData, function(value, key) {
		obj[key] = value;
	});
}

function getNodeArgs() {
	var args = {}

	// Parse into pretty object
	for (i = 2; i < process.argv.length; i++) {
		var arg = process.argv[i];
		var index = arg.indexOf('=')

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