var dot = require('dot');
var fs = require('fs');
var moment = require('moment');

// Investigate doT.js for templating: http://olado.github.io/doT/index.html

var defs = {};
defs.loadfile = function(loadPath) {
	return fs.readFileSync(loadPath);
};

defs.jsonStringify = function(data) {
	console.log(data);
	return JSON.stringify(data,null,2);
	//return "string data";
};

defs.formatDate = function(d, format){
	if (!format) format='YYYY-MM-DDTHH:mm:ss.SSSZZ';
	var m = new moment(d,'x');
	return m.clone().format(format);
};

defs.getMetric = function(data, metricName) {
	var m = null;
	data[0].metrics.forEach(function(metric) {
		if (m !== null) return;
		if (metric.metric.toLowerCase() == metricName.toLowerCase()) {
			m = metric;
		}
	});

	return m;
};

function Helpers() {
	// Don't strip whitespace
	dot.templateSettings.strip = false;
}

Helpers.prototype.isType = function(obj, type) { 
	if (obj === null) return false;

	var funcNameRegex = /function (.{1,})\(/;
	var results = (funcNameRegex).exec((obj).constructor.toString());
	var objType = (results && results.length > 1) ? results[1] : "";
	var isEqual = objType.toLowerCase() == type.toLowerCase();
	return isEqual;
};

Helpers.prototype.executeTemplate = function(templateString, data) {
	// Plug in data
	defs.data = data;

	// Generate template with def data
	var template = dot.template(templateString, null, defs);

	// Execute template with def data
	return template(defs);
};


module.exports = new Helpers();