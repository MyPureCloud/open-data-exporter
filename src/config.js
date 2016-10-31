var fs = require('fs');
var _ = require('lodash');
var moment = require('moment');

var Logger = require('./logger');

var log = new Logger('config');
var config = {};

config.load = function() {
	// TODO: error handling
	var configFileData = fs.readFileSync('config.json', 'UTF-8');
	config.settings = JSON.parse(configFileData);
	//console.log(JSON.stringify(config.settings, null, 2));
	
	// TODO: replace with `config.settings = require('./config.json');` ???
}

config.getJobData = function(data, jobName, configurationName) {
	var now = new moment();
	var packagedData = {};

	// Set data object
	packagedData.data = data;

	// Populate default vars
	packagedData.vars = {};
	packagedData.job = config.settings.jobs[jobName];
	packagedData.configuration = config.settings.configurations[configurationName];
	packagedData.vars.date = now.clone();
	packagedData.vars.interval = 'PT30M';

	// Populate vars from config
	// Load order (left to right): global > job > configuration > query > transform > template, export
	setCustomData(packagedData.vars, config.settings.customData);
	setCustomData(packagedData.vars, packagedData.job.customData);
	setCustomData(packagedData.vars, packagedData.configuration.customData);
	setCustomData(packagedData.vars, config.settings.queries[packagedData.configuration.query].customData);
	setCustomData(packagedData.vars, config.settings.transforms[packagedData.configuration.transform].customData);
	setCustomData(packagedData.vars, config.settings.templates[packagedData.configuration.template].customData);
	setCustomData(packagedData.vars, config.settings.exports[packagedData.configuration.export].customData);

	// Parse interval to object for math operations (moment.js doesn't parse ISO-8601 durations passed to .add or .subtract)
	var interval = moment.duration(packagedData.vars.interval)

	// Populate derived variables
	packagedData.vars.currentHour = now.clone().startOf('hour');
	packagedData.vars.previousHour = now.clone().startOf('hour').subtract(1, 'hour');

	//log.debug(packagedData.vars.currentHour.format(), 'currentHour')
	//log.debug(packagedData.vars.previousHour.format(), 'previousHour')

	packagedData.vars.currentIntervalStart = packagedData.vars.currentHour.clone();
	packagedData.vars.previousIntervalStart = packagedData.vars.currentHour.clone().subtract(interval);
	for (i=1;i<60;i++) {
		var nextInterval = packagedData.vars.currentIntervalStart.clone().add(interval);
		if (nextInterval < now) {
			// Interval does not exceed current time, set it
			packagedData.vars.currentIntervalStart = nextInterval;
			packagedData.vars.previousIntervalStart = nextInterval.clone().subtract(interval);
			//log.debug(packagedData.vars.currentIntervalStart.format(), 'currentIntervalStart')
			//log.debug(packagedData.vars.previousIntervalStart.format(), 'previousIntervalStart')
		}
		else {
			break;
		}
	}

	//log.debug(packagedData.vars.currentIntervalStart.format(), 'final currentIntervalStart')
	//log.debug(packagedData.vars.previousIntervalStart.format(), 'final previousIntervalStart')

	packagedData.vars.currentInterval = packagedData.vars.currentIntervalStart.format() + '/' + packagedData.vars.currentIntervalStart.clone().add(interval).format();
	packagedData.vars.previousInterval = packagedData.vars.previousIntervalStart.format() + '/' + packagedData.vars.previousIntervalStart.clone().add(interval).format();


	return packagedData;
}



module.exports = config;



function setCustomData(obj, customData) {
	if (customData == null) return;

	_.forOwn(customData, function(value, key) {
		obj[key] = value;
	});
}