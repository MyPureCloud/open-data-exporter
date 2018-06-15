// var colors = require('colors/safe');
// var stripAnsi = require('strip-ansi');
// var _ = require('lodash');

// var helpers = require('./helpers');
// var config = require('./config');
// var constants = require('./constants');



// // Set default themes
// colors.setTheme({
// 	error: [ 'bgBlack', 'red' ],
// 	warning: [ 'bgYellow', 'black' ],
// 	info: [ 'reset' ],
// 	debug: [ 'cyan' ],
// 	verbose: [ 'dim' ]
// });



// function Logger(topic) {
// 	this.topic = topic;
// 	this.defaultWidth = process.stdout.columns ? process.stdout.columns : 80;
// 	this.logLevel = getLogLevel(this.topic);
// }

// Logger.prototype.setTheme = function(obj) {
// 	colors.setTheme(obj);
// };

// Logger.prototype.error = function(obj, msg) {
// 	if (!this.checkLogLevel(constants.logging.error)) return;
// 	logMessage(obj, msg, this.topic, 'error');
// };

// Logger.prototype.warning = function(obj, msg) {
// 	if (!this.checkLogLevel(constants.logging.warning)) return;
// 	logMessage(obj, msg, this.topic, 'warning');
// };

// Logger.prototype.info = function(obj, msg) {
// 	if (!this.checkLogLevel(constants.logging.info)) return;
// 	logMessage(obj, msg, this.topic, 'info');
// };

// Logger.prototype.debug = function(obj, msg) {
// 	if (!this.checkLogLevel(constants.logging.debug)) return;
// 	logMessage(obj, msg, this.topic, 'debug');
// };

// Logger.prototype.verbose = function(obj, msg) {
// 	if (!this.checkLogLevel(constants.logging.verbose)) return;
// 	logMessage(obj, msg, this.topic, 'verbose');
// };

// Logger.prototype.custom = function(obj, msg, style) {
// 	logMessage(obj, msg, this.topic, style);
// };

// Logger.prototype.writeBoxedLine = function(string, width, padchar, style) {
// 	if (!width) width = this.defaultWidth;
// 	if (!padchar) padchar = ' ';
// 	var cWidth = width - 4;
// 	var words = string.split(' ');
// 	var rows = [];
// 	var c = 0;
// 	_.forEach(words, function(word, index) {
// 		var wordClean = stripAnsi(word);
// 		if (!rows[c]) rows[c] = '';
// 		if (stripAnsi(rows[c]).length + wordClean.length + 1 > cWidth) {
// 			c++;
// 			rows[c] = '';
// 		}
// 		rows[c] += word + ' ';
// 	});
// 	_.forEach(rows, function(row, index) {
// 		logMessageClear('║ ' + pad(row.trimRight(), cWidth, padchar) + ' ║', style);
// 	});
// };

// Logger.prototype.writeBoxTop = function(width, style) {
// 	if (!width) width = this.defaultWidth;
// 	logMessageClear('╔' + pad('', width - 2, '═') + '╗', style);
// };

// Logger.prototype.writeBoxSeparator = function(width, style) {
// 	if (!width) width = this.defaultWidth;
// 	logMessageClear('╟' + pad('', width - 2, '─') + '╢', style);
// };

// Logger.prototype.writeBoxBottom = function(width, style) {
// 	if (!width) width = this.defaultWidth;
// 	logMessageClear('╚' + pad('', width - 2, '═') + '╝', style);
// };

// Logger.prototype.writeBox = function(string, width, style) {
// 	if (!width)
// 		width = stripAnsi(string).length > this.defaultWidth ? this.defaultWidth : stripAnsi(string).length + 5;
// 	this.writeBoxTop(width, style);
// 	this.writeBoxedLine(string, width, null, style);
// 	this.writeBoxBottom(width, style);
// };

// Logger.prototype.checkLogLevel = function(level) {
// 	return level <= this.logLevel;
// };



// module.exports = Logger;



// function logMessage(obj, msg, topic, style) {
// 	var message = obj;
// 	if (helpers.isType(obj, 'object') || helpers.isType(obj, 'array')) {
// 		message = '\n' + JSON.stringify(obj, null, 2);
// 	}
// 	if (msg !== undefined && msg !== null && msg !== '') {
// 		message = msg + message;
// 	}
// 	logMessageClear('[' + topic + '][' + style.toUpperCase() + '] ' + message, style);
// }

// function logMessageClear(msg, style='reset') {
// 	console.log(colors[style](msg));
// }

// function pad(value, length, padchar) {
//     return (stripAnsi(value.toString()).length < length) ? pad(value+padchar, length, padchar):value;
// }

// function getLogLevel(topic) {
// 	if (!config.args) {
// 		logMessage('Defaulting to ALL for topic "' + topic + '"', null, topic, 'warning');
// 		return constants.logging.all;
// 	}

// 	var logLevelInt = parseInt(config.args.loglevel);
// 	if (!isNaN(logLevelInt)) 
// 		return logLevelInt;

// 	switch (config.args.loglevel) {
// 		case 'error': return constants.logging.error;
// 		case 'warning': return constants.logging.warning;
// 		case 'info': return constants.logging.info;
// 		case 'debug': return constants.logging.debug;
// 		case 'verbose': return constants.logging.verbose;
// 		default: return constants.logging.all;
// 	}
// }