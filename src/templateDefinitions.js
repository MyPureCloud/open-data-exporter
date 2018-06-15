var fs = require('fs');
var path = require('path');
var moment = require('moment-timezone');
var _ = require('lodash');
var Logger = require('lognext');

var config = require('./config');
var constants = require('./constants');



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
 * Public functions for use in node.js code
 */

TemplateDefinitions.prototype.initializeVars = function() {
	this.vars = {};
	this.vars.args = config.args;
	this.vars.date = this.now.clone();
	// Initialize to 30 minute interval as default
	this.vars.interval = 'PT30M';

	var _this = this;
	var rootPath = path.join(__dirname, 'extensions/standard');
	if (fs.existsSync(rootPath)) {
		_.forEach(fs.readdirSync(rootPath), function(file) {
			if (file.endsWith('.js')) {
				// Get just the name part
				var name = file.substring(0, file.length - 3);

				// Load the file
				log.debug('Loading standard module "' + name + '" from ' + file);
				var p = path.join(rootPath, file);
				_this[name] = require(p);
			}
		});
	}

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
	setCustomDataFromObjects(this.vars, configuration.executionPlan);
	setCustomDataFromObjects(this.vars, configuration.templates);
	setCustomDataFromObjects(this.vars, configuration.exports);

	// Regenerate derived vars
	generateDerivedVars(this);
};



module.exports = TemplateDefinitions;



function generateDerivedVars(defs) {
	if (defs.vars.timezoneOverride) {
		// Convert base date var to desired timezone
		defs.vars.date.tz(defs.vars.timezoneOverride);

		// Set as the default timezone to ensure future date calculations are done in the override timezone
		moment.tz.setDefault(defs.vars.timezoneOverride);
	}

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

