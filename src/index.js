// Force working directory to be where this script resides
// The purpose of this is for relative paths loaded in configs to be relative to the script, not where it was invoked from
process.chdir(__dirname);

var Q = require('q');
var moment = require('moment');
var colors = require('colors/safe');
var refParser = require('json-schema-ref-parser');
var fs = require('fs');
var _ = require('lodash');

var config = require('./config');
var Logger = require('./logger');
var packageData = require('./package.json');
var executor = require('./executor');



var log = new Logger('main');



log.writeBox('Open Data Exporter v' + packageData.version, null, 'cyan');

executor.initialize()
	.then(function() {
		if (!config.args.jobs) return;

		// Manually execute jobs
		return executor.executeJobs(config.args.jobs.split(','));
	})
	.catch(function(error) {
		log.error(error.stack);
	});