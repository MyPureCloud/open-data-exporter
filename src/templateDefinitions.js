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
TemplateDefinitions.prototype.getMetric = function(metrics, metricName) {
	var m = null;
	_.forEach(metrics, function(metric) {
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
	_.forOwn(data.conversations, function(conversation) {
		_.forOwn(conversation.participants, function(participant, key) {
			participant.sessionCount = participant.sessions.length;
			_.forOwn(participant.sessions, function(session, key) {
				session.segmentCount = session.segments.length;
			});
		});
	});
};

/**
 * Assigns conversation.customerParticipant, conversation.customerParticipant.ani, and conversation.queue for each conversation
 * @module  TemplateDefinitions
 * @instance
 * @function setCustomerParticipants
 * @param {Object} data - The data from a conversation detail query
 */
TemplateDefinitions.prototype.setCustomerParticipants = function(data) {
	_.forOwn(data.conversations, function(conversation) {
		_.forOwn(conversation.participants, function(participant) {
			if (participant.purpose == 'customer') {
				conversation.customerParticipant = participant;
				_.forOwn(conversation.customerParticipant.sessions, function(session) {
					if (session.ani)
						conversation.customerParticipant.ani = session.ani;
				});
			} else if (participant.purpose == 'acd') {
				conversation.queue = participant;
			}
		});
	});
};

TemplateDefinitions.prototype.dataArrayToProperty = function(response) {
	_.forOwn(response.results, function(result) {
		result.data = result.data[0];
	});

	log.debug(response);
};

TemplateDefinitions.prototype.flattenAggregateData = function(response, ensureStatNames) {
	if (!ensureStatNames)
		ensureStatNames = '';
	var statNames = ensureStatNames.split('|');
	_.forOwn(response.results, function(result) {
		result.flatData = {};
		_.forEach(result.data, function(data, i) {
			key = 'c' + i;
			result.flatData[key] = data;

			// Set metric objects
			result.flatData[key].flatMetrics = {};
			_.forEach(result.flatData[key].metrics, function(metric) {
				result.flatData[key].flatMetrics[metric.metric] = metric;
			});

			// Ensure metric objects exist
			_.forEach(statNames, function(statName) {
				if (!result.flatData[key].flatMetrics[statName])
					result.flatData[key].flatMetrics[statName] = {
						"metric": statName,
						"stats": {
							"max": 0,
							"count": 0,
							"sum": 0
						}
					};
			});
		});
	});
};

TemplateDefinitions.prototype.getIntervalStart = function(interval) {
	var intervals = interval.split('/');
	var intervalStart = new moment(intervals[0]);
	log.debug(intervalStart.format(constants.strings.isoDateFormat), 'intervalStart: ');
	return intervalStart;
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

TemplateDefinitions.prototype.setJobData = function(data, job, configuration) {
	this.data = data;
	this.job = job;
	this.configuration = configuration;

	// Populate vars from config
	setCustomData(this.vars, config.settings.customData);
	setCustomData(this.vars, job.customData);
	setCustomData(this.vars, configuration.customData);
	setCustomDataFromObjects(this.vars, configuration.queries);
	setCustomDataFromObjects(this.vars, configuration.transforms);
	setCustomDataFromObjects(this.vars, configuration.templates);
	setCustomDataFromObjects(this.vars, configuration.exports);

	// Regenerate derived vars
	generateDerivedVars(this);
};



module.exports = TemplateDefinitions;



function generateDerivedVars(defs) {
	// Parse interval to object for math operations (moment.js doesn't parse ISO-8601 durations passed to .add or .subtract)
	var interval = moment.duration(defs.vars.interval);
	var now = defs.vars.date;

	// Populate vars derived directly from now
	defs.vars.startOfHour = now.clone().startOf('hour');
	defs.vars.previousStartOfHour = defs.vars.startOfHour.clone().subtract(1, 'hour');

	defs.vars.startOfDay = now.clone().startOf('day');
	defs.vars.previousStartOfDay = defs.vars.startOfDay.clone().subtract(1, 'day');

	defs.vars.startOfWeek = now.clone().startOf('week');
	defs.vars.previousStartOfWeek = defs.vars.startOfWeek.clone().subtract(1, 'week');

	defs.vars.startOfMonth = now.clone().startOf('month');
	defs.vars.previousStartOfMonth = defs.vars.startOfMonth.clone().subtract(1, 'month');

	defs.vars.startOfQuarter = now.clone().startOf('quarter');
	defs.vars.previousStartOfQuarter = defs.vars.startOfQuarter.clone().subtract(1, 'quarter');

	defs.vars.startOfYear = now.clone().startOf('year');
	defs.vars.previousStartOfYear = defs.vars.startOfYear.clone().subtract(1, 'year');

	// Initialize current interval start to midnight "this morning"
	defs.vars.currentIntervalStart = defs.vars.startOfDay;

	// Iterate intervals till we find the current one
	// Max=1440 for a potential minimum resolution of 1 minute.
	for (i=1;i<1440;i++) {
		if (defs.vars.currentIntervalStart.clone().add(interval).isAfter(now)) {
			// +1 interval > now, so the current value is the current interval. Our work here is done.
			break;
		} else {
			// Add interval and continue
			defs.vars.currentIntervalStart.add(interval);
		}
	}

	// Populate vars derived from current interval start
	defs.vars.previousIntervalStart = defs.vars.currentIntervalStart.clone().subtract(interval);
	defs.vars.currentInterval = defs.vars.currentIntervalStart.format(constants.strings.isoDateFormat) + '/' + defs.vars.currentIntervalStart.clone().add(interval).format(constants.strings.isoDateFormat);
	defs.vars.previousInterval = defs.vars.previousIntervalStart.format(constants.strings.isoDateFormat) + '/' + defs.vars.previousIntervalStart.clone().add(interval).format(constants.strings.isoDateFormat);
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

