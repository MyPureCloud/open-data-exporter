var colors = require('colors/safe');
var stripAnsi = require('strip-ansi');
var _ = require('lodash');
var helpers = require('./helpers');

colors.setTheme({
	verbose: [ 'dim' ],
	info: [ 'reset' ],
	debug: [ 'cyan' ],
	warning: [ 'bgYellow', 'black' ],
	error: [ 'bgBlack', 'red' ]
})

function Logger(topic) {
	this.topic = topic;
	this.defaultWidth = process.stdout.columns ? process.stdout.columns : 80;
}

Logger.prototype.setTheme = function(obj) {
	colors.setTheme(obj);
}

Logger.prototype.verbose = function(msg) {
	logMessage(msg, this.topic, 'verbose');
}

Logger.prototype.info = function(msg) {
	logMessage(msg, this.topic, 'info');
}

Logger.prototype.debug = function(obj, msg='') {
	var message = obj;
	if (helpers.isType(obj, 'object') || helpers.isType(obj, 'array')) {
		message = '\n' + JSON.stringify(obj, null, 2)
	}
	if (msg != '') {
		message = msg + message;
	}
	logMessage(message, this.topic, 'debug');
}

Logger.prototype.warning = function(msg) {
	logMessage(msg, this.topic, 'warning');
}

Logger.prototype.error = function(msg) {
	logMessage(msg, this.topic, 'error');
}

Logger.prototype.custom = function(msg, style) {
	logMessage(msg, this.topic, style);
}

Logger.prototype.writeBoxedLine = function(string, width, padchar, style) {
	if (!width) width = this.defaultWidth;
	if (!padchar) padchar = ' ';
	var cWidth = width - 4;
	var words = string.split(' ');
	var rows = [];
	var c = 0;
	_.forEach(words, function(word, index) {
		var wordClean = stripAnsi(word);
		if (!rows[c]) rows[c] = '';
		if (stripAnsi(rows[c]).length + wordClean.length + 1 > cWidth) {
			c++;
			rows[c] = '';
		}
		rows[c] += word + ' ';
	});
	_.forEach(rows, function(row, index) {
		logMessageClear('║ ' + pad(row.trimRight(), cWidth, padchar) + ' ║', style);
	});
}

Logger.prototype.writeBoxTop = function(width, style) {
	if (!width) width = this.defaultWidth;
	logMessageClear('╔' + pad('', width - 2, '═') + '╗', style);
}

Logger.prototype.writeBoxSeparator = function(width, style) {
	if (!width) width = this.defaultWidth;
	logMessageClear('╟' + pad('', width - 2, '─') + '╢', style);
}

Logger.prototype.writeBoxBottom = function(width, style) {
	if (!width) width = this.defaultWidth;
	logMessageClear('╚' + pad('', width - 2, '═') + '╝', style);
}

Logger.prototype.writeBox = function(string, width, style) {
	if (!width)
		width = stripAnsi(string).length > this.defaultWidth ? this.defaultWidth : stripAnsi(string).length + 5;
	this.writeBoxTop(width, style);
	this.writeBoxedLine(string, width, null, style);
	this.writeBoxBottom(width, style);
}



module.exports = Logger;



function logMessage(msg, topic, style='reset') {
	//console.log(msg)
	logMessageClear('[' + topic + '][' + style.toUpperCase() + '] ' + msg, style);
}

function logMessageClear(msg, style='reset') {
	//console.log('style->'+style)
	console.log(colors[style](msg));
}

function pad(value, length, padchar) {
    return (stripAnsi(value.toString()).length < length) ? pad(value+padchar, length, padchar):value;
}