var Q = require('q');
var moment = require('moment');
var colors = require('colors/safe');
var refParser = require('json-schema-ref-parser');
var fs = require('fs');

var config = require('./config');
var Logger = require('./logger');
var packageData = require('./package.json');
var executor = require('./executor');



var log = new Logger('main');



log.writeBox('Open Data Explorer v' + packageData.version, null, 'cyan');

executor.initialize()
	.then(() => executor.executeJob(config.settings.jobs['verint_agent_detail_job']))
	.catch(function(error) {
		log.error(error.stack)
	});