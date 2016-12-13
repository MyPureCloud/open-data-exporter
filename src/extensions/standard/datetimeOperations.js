var moment = require('moment-timezone');
var _ = require('lodash');


function DateTimeFunctions() { }

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
DateTimeFunctions.prototype.formatDate = function(d, format) {
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
DateTimeFunctions.prototype.addDuration = function(date, duration) {
	return date.clone().add(moment.duration(duration));
};

DateTimeFunctions.prototype.parseInterval = function(interval) {
	var intervals = interval.split('/');
	return {
		'start': new moment(intervals[0]),
		'end': new moment(intervals[1])
	};
};



module.exports = new DateTimeFunctions();