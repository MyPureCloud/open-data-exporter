var fs = require('fs');
var moment = require('moment');
var _ = require('lodash');

var config = require('./config');
var constants = require('./constants');
var Logger = require('./logger');



var log = new Logger('TemplateDefinitions');



function TemplateDefinitions() {
	this.now = new moment();
	this.initializeVars();
}

TemplateDefinitions.prototype.loadfile = function(loadPath) {
	return fs.readFileSync(loadPath);
};

TemplateDefinitions.prototype.jsonStringify = function(data) {
	return JSON.stringify(data,null,2);
};

TemplateDefinitions.prototype.formatDate = function(d, format){
	if (!format) 
		format = constants.strings.isoDateFormat;
	var m = new moment(d,'x');
	return m.clone().format(format);
};

TemplateDefinitions.prototype.addDuration = function(date, duration) {
	return date.clone().add(moment.duration(duration));
};

TemplateDefinitions.prototype.getMetric = function(data, metricName) {
	var m = null;
	data[0].metrics.forEach(function(metric) {
		if (m !== null) return;
		if (metric.metric.toLowerCase() == metricName.toLowerCase()) {
			m = metric;
		}
	});

	return m;
};

TemplateDefinitions.prototype.initializeVars = function() {
	this.vars = {};
	this.vars.args = config.args;
	this.vars.date = this.now.clone();
	this.vars.interval = 'PT30M';

	generateDerivedVars(this);
};

TemplateDefinitions.prototype.setVars = function(vars) {
	// vars is expected to be an object in the format: { "key":"value", "key":"value" }
	setCustomData(this.vars, vars);

	// Regenerate derived vars
	generateDerivedVars(this);
};

TemplateDefinitions.prototype.setJobData = function(data, job) {
	this.data = data;
	this.job = job;

	// Populate vars from config
	// Load order (left to right): global > job > configuration > query > transform > template, export
	setCustomData(this.vars, config.settings.customData);
	setCustomData(this.vars, job.customData);
	setCustomData(this.vars, job.configuration.customData);
	setCustomData(this.vars, job.configuration.query.customData);
	setCustomData(this.vars, job.configuration.transform.customData);
	setCustomData(this.vars, job.configuration.template.customData);
	setCustomData(this.vars, job.configuration.export.customData);

	// Regenerate derived vars
	generateDerivedVars(this);
};



module.exports = TemplateDefinitions;



function generateDerivedVars(defs) {
	// Parse interval to object for math operations (moment.js doesn't parse ISO-8601 durations passed to .add or .subtract)
	var interval = moment.duration(defs.vars.interval);
	var now = defs.vars.date;

	// Populate derived variables
	defs.vars.currentHour = now.clone().startOf('hour');
	defs.vars.previousHour = now.clone().startOf('hour').subtract(1, 'hour');
	defs.vars.previousMidnight = now.clone().startOf('day');

	//TODO: handle interval calculation starting from midnight for intervals >1h
	defs.vars.currentIntervalStart = defs.vars.currentHour.clone();
	defs.vars.previousIntervalStart = defs.vars.currentHour.clone().subtract(interval);
	for (i=1;i<60;i++) {
		var nextInterval = defs.vars.currentIntervalStart.clone().add(interval);
		if (nextInterval < now) {
			// Interval does not exceed current time, set it
			defs.vars.currentIntervalStart = nextInterval;
			defs.vars.previousIntervalStart = nextInterval.clone().subtract(interval);
		}
		else {
			break;
		}
	}

	defs.vars.currentInterval = defs.vars.currentIntervalStart.format(constants.strings.isoDateFormat) + '/' + defs.vars.currentIntervalStart.clone().add(interval).format(constants.strings.isoDateFormat);
	defs.vars.previousInterval = defs.vars.previousIntervalStart.format(constants.strings.isoDateFormat) + '/' + defs.vars.previousIntervalStart.clone().add(interval).format(constants.strings.isoDateFormat);

	// TODO: add more derived vars for computing larger intervals: 
	// - cur/prev day (midnight)
	// - last/previous<day of week> (lastMonday, previousMonday)
}

function setCustomData(obj, customData) {
	if (customData === null) return;

	_.forOwn(customData, function(value, key) {
		obj[key] = value;
	});
}

