var Q = require('q');
//var Mustache = require('mustache');
var moment = require('moment');
var colors = require('colors/safe');
var refParser = require('json-schema-ref-parser');
var fs = require('fs');

var config = require('./config');
var expressionProcessor = require('./expressionProcessor');
var Logger = require('./logger');
var packageData = require('./package.json');
var api = require('./api');
var helpers = require('./helpers');



var log = new Logger('main');



log.writeBox('Open Data Explorer v' + packageData.version, null, 'cyan');

api.login()
	.then(() => refParser.dereference(config.settings))
	.then(function(schema) {
		//log.debug(schema, 'Dereferenced schema: ');
		log.info('Configuration successfully dereferenced');
		//return api.getPermissions();
		return api.postConversationsAggregatesQuery(JSON.stringify(config.settings.queries['verint_agent_detail_query'].query));
	})/*
	.then(function(result){
		// TODO: verify permissions?
		log.info('Congratulations, ' + result.total + ' permissions are available');
		
		// Prepare queries
		var jobData = config.getJobData({}, 'basic_job');
		expressionProcessor.evaluate(config.settings.queries, jobData.vars);

		return api.postConversationsDetailsQuery(JSON.stringify(config.settings.queries['currentInterval'].query));
	})
	.then(function(data) {
		var jobData = config.getJobData(data, 'basic_job', 'basic_configuration');
		var output = helpers.executeTemplate(config.settings.templates['basic_template'].template, jobData);
		log.verbose(output, 'currentInterval transformation:\n');
		
		return api.postConversationsDetailsQuery(JSON.stringify(config.settings.queries['previousInterval'].query));
	})
	.then(function(data) {
		var jobData = config.getJobData(data, 'basic_job', 'basic_configuration');
		var output = helpers.executeTemplate(config.settings.templates['basic_template'].template, jobData);
		log.verbose(output, 'previousInterval transformation:\n');
		
		return api.postConversationsAggregatesQuery(JSON.stringify(config.settings.queries['verint_agent_detail_query'].query));
	})*/
	.then(function(data) {
		//log.debug(data)
		var jobData = config.getJobData(data, 'verint_agent_detail_job');
		//fs.writeFileSync('data.json',JSON.stringify(jobData));
		var output = helpers.executeTemplate(config.settings.templates['verint_agent_detail_template'].template, jobData);
		log.verbose(output, 'verint_agent_detail_job:\n');

		return {};
	})
	.catch(function(error) {
		log.error(error.stack)
	});