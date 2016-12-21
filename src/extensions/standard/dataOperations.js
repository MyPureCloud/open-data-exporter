var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var _ = require('lodash');



function DataOperations() { }

/**
 * Loads a file into the template
 * @module  TemplateDefinitions
 * @instance
 * @function loadfile
 * @param {string} loadPath - The path to the file
 *
 * @return {string} The contents of the file
 */
DataOperations.prototype.loadfile = function(loadPath) {
	return fs.readFileSync(loadPath);
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
DataOperations.prototype.getMetric = function(metrics, metricName) {
	var m = null;
	_.forEach(metrics, function(metric) {
		if (m !== null) return;
		if (metric.metric.toLowerCase() == metricName.toLowerCase()) {
			m = metric;
		}
	});

	return m;
};

DataOperations.prototype.flattenAggregateData = function(response, ensureStatNames) {
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

				// Convert ms to seconds
				if (result.flatData[key].flatMetrics[metric.metric].stats.max) {
					result.flatData[key].flatMetrics[metric.metric].stats.max = (result.flatData[key].flatMetrics[metric.metric].stats.max / 1000).toFixed(0);
				}
				if (result.flatData[key].flatMetrics[metric.metric].stats.sum) {
					result.flatData[key].flatMetrics[metric.metric].stats.sum = (result.flatData[key].flatMetrics[metric.metric].stats.sum / 1000).toFixed(0);
				}
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

/**
 * Turns a JSON object into a string
 * @module  TemplateDefinitions
 * @instance
 * @function jsonStringify
 * @param {Object} data - The JSON object
 *
 * @return {string} The stringified JSON
 */
DataOperations.prototype.jsonStringify = function(data) {
	return JSON.stringify(data, null, 2);
};

DataOperations.prototype.writeData = function(data, destination) {
	mkdirp.sync(path.dirname(destination));
	fs.writeFileSync(destination, JSON.stringify(data,null,2));
};



module.exports = new DataOperations();