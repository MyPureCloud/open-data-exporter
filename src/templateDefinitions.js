var fs = require('fs');
var moment = require('moment');
var _ = require('lodash');

var config = require('./config');
var constants = require('./constants');
var Logger = require('./logger');



var log = new Logger('TemplateDefinitions');



/**
 * A module to provide template definitions
 * @module  TemplateDefinitions
 * @property {Moment} now  - A date time object (Moment) indicating the timestamp when the instance was created
 * @property {Object} vars - An object containing variables for use in templates
 * @property {Object} data - The data resulting from an API query
 * @property {Object} job  - The job config object
 */
function TemplateDefinitions() {
	this.now = new moment();
	this.initializeVars();
}



/**
 * Built-in functions for templates
 */

/**
 * Loads a file into the template
 * @module  TemplateDefinitions
 * @instance
 * @function loadfile
 * @param {string} loadPath - The path to the file
 *
 * @return {string} The contents of the file
 */
TemplateDefinitions.prototype.loadfile = function(loadPath) {
	return fs.readFileSync(loadPath);
};

/**
 * Turns a JSON object into a string
 * @module  TemplateDefinitions
 * @instance
 * @function jsonStringify
 * @param {Object} data - The JSON object
 *
 * @return {string} The stringified JSON
 */
TemplateDefinitions.prototype.jsonStringify = function(data) {
	return JSON.stringify(data, null, 2);
};

/**
 * Formats a date according to the given format. Defaults to the ISO-8601 standard format
 * @module  TemplateDefinitions
 * @instance
 * @function formatDate
 * @param {long}   d      - The unix timestamp (milliseconds)
 * @param {string} format - The format to apply. See http://momentjs.com/docs/#/displaying/format/
 *
 * @return {string} The formatted string
 */
TemplateDefinitions.prototype.formatDate = function(d, format) {
	// Default to ISO-8601 format
	if (!format) 
		format = constants.strings.isoDateFormat;

	// Parse the date to a moment object
	// The date/moment object will be passed in as a string in the unix millisecond format (e.g. 1410715640579)
	var m = new moment(d,'x');

	// Return the formatted object
	return m.format(format);
};

/**
 * Adds a duration to a date
 * @module  TemplateDefinitions
 * @instance
 * @function addDuration
 * @param {Moment} date     - The Moment object to use as a source (immutable)
 * @param {string} duration - 8601 formatted duration to add to the date
 */
TemplateDefinitions.prototype.addDuration = function(date, duration) {
	return date.clone().add(moment.duration(duration));
};

/**
 * Gets a metric object with the give metric name
 * @module  TemplateDefinitions
 * @instance
 * @function getMetric
 * @param {Object} data       - The API result data object containing the metrics
 * @param {string} metricName - The name of the metric to retrieve
 *
 * @return {Object} The metric object
 */
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

/**
 * Counts the conversations from a conversation detail query
 * @module  TemplateDefinitions
 * @instance
 * @function countConversations
 * @param {Object} data - The data from a conversation detail query
 *
 * @return {int} The count of the conversations in the dataset
 */
TemplateDefinitions.prototype.countConversations = function(data) {
	return data.conversations.length;
};

/**
 * Counts the sessions and segments for each participant and adds the "sessionCount" property to the participant and the "segmentCount" property to each segment
 * @module  TemplateDefinitions
 * @instance
 * @function countSegments
 * @param {Object} data - The data from a conversation detail query
 */
TemplateDefinitions.prototype.countSegments = function(data) {
	_.forEach(data.conversations, function(conversation) {
		_.forEach(conversation.participants, function(participant, key) {
			participant.sessionCount = participant.sessions.length;
			_.forEach(participant.sessions, function(session, key) {
				session.segmentCount = session.segments.length;
			});
		});
	});
};



/**
 * Public functions for use in node.js code
 */

TemplateDefinitions.prototype.initializeVars = function() {
	this.vars = {};
	this.vars.args = config.args;
	this.vars.date = this.now.clone();
	// Initialize to 30 minute interval as default
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
	setCustomDataFromObjects(this.vars, job.configuration.queries);
	setCustomDataFromObjects(this.vars, job.configuration.transforms);
	setCustomDataFromObjects(this.vars, job.configuration.templates);
	setCustomDataFromObjects(this.vars, job.configuration.exports);

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

function setCustomDataFromObjects(vars, obj) {
	_.forOwn(obj, (value) => setCustomData(vars, value.customData));
}

function setCustomData(vars, customData) {
	if (customData === null) return;

	_.forOwn(customData, function(value, key) {
		vars[key] = value;
	});
}

