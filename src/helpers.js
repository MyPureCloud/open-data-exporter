var Handlebars = require('handlebars');
var fs = require('fs');
var moment = require('moment');

// Investigate doT.js for templating: http://olado.github.io/doT/index.html

function Helpers() {
	// Usage: {{#metric data.0.metrics name=\"tAnswered\"}}tAnswered:{{stats.max}}{{/metric}}
	Handlebars.registerHelper('metric', function(context, options) {
		var metricName = options.hash['name'];
		var m = null;
		context.forEach(function(metric) {
			if (m != null) return;
			if (metric.metric.toLowerCase() == metricName.toLowerCase()) {
				// options.fn(...) applies the passed in data object to the template
				m = options.fn(metric);
			}
		})
		return m;
	});

	// Usage: {{#formatDate vars.currentIntervalStart format=\"YYYY-MM-DDTHH:mm:ss.SSSZZ\"}}{{.}}{{/formatDate}}
	Handlebars.registerHelper('formatDate', function(context, options) {
		var formatString = options.hash['format'];
		var m = new moment(context);
		return options.fn(m.format(formatString));
	});
}

Helpers.prototype.isType = function(obj, type) { 
	if (obj == null) return false;

	var funcNameRegex = /function (.{1,})\(/;
	var results = (funcNameRegex).exec((obj).constructor.toString());
	var objType = (results && results.length > 1) ? results[1] : "";
	var isEqual = objType.toLowerCase() == type.toLowerCase();
	return isEqual;
};

Helpers.prototype.executeTemplate = function(templateString, data) {
	var template = Handlebars.compile(templateString);
	return template(data);
};


module.exports = new Helpers();