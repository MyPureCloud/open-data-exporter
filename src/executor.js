var Q = require('q');
var refParser = require('json-schema-ref-parser');
var dot = require('dot');
var _ = require('lodash');

var config = require('./config');
var Logger = require('./logger');
var packageData = require('./package.json');
var api = require('./api');
var helpers = require('./helpers');
var TemplateDefinitions = require('./templateDefinitions');



var log = new Logger('executor');



function Executor() {
	// Don't strip whitespace from templates
	dot.templateSettings.strip = false;

	this.defs = new TemplateDefinitions();
}

Executor.prototype.initialize = function() {
	var deferred = Q.defer();

	api.login()
		.then(() => processQueries(config.settings, this.defs))
		.then(function() {
			log.verbose('Queries processed successfully');
			if (config.args.showconfig === true) 
				log.debug(JSON.stringify(config.settings,null,2));
		})
		.then(() => refParser.dereference(config.settings))
		.then(function(schema) {
			log.verbose('Configuration successfully dereferenced');
		})
		.then(function() {
			log.verbose('Executor initialized');
			deferred.resolve();
		})
		.catch(function(error) {
			log.error(error.stack);
			deferred.reject(error);
		});

	return deferred.promise;
};

Executor.prototype.executeJob = function(job) {
	var deferred = Q.defer();

	try {
		log.verbose('Executing job ' + job.name);
		var executor = this;
		getQueryData(job.configuration.query)
			.then(function(data) {
				//TODO: flesh out this process to execute templates for all strings in all parts of the config before executing the template

				var jobData = executor.defs.setJobData(data, job);
				//TODO: determine if a new defs object should be used or if reuse is fine. Concern: functions added during template compilation may be added to defs
				var output = executeTemplate(job.configuration.template.template, jobData, executor.defs);
				log.verbose(output, job.name + ':\n');

				deferred.resolve();
			})
			.catch(function(error) {
				log.error(error.stack);
				deferred.reject(error);
			});
	} catch(error) {
		log.error(error);
		deferred.reject(error);
	}

	return deferred.promise;
};



module.exports = new Executor();



function executeTemplate(templateString, data, defs) {
	// Initialize defs object if not provided
	if (defs === undefined || defs === null) {
		log.warning('executeTemplate: defs was undefined, creating new object');
		defs = new TemplateDefinitions();
	}

	// Plug in data
	if (data)
		defs.data = data;

	// Prevent undefined errors
	if (!defs.data)
		defs.data = {};

	// Compile template
	var template = dot.template(templateString, null, defs);

	// Execute template
	return template(defs);
}

function getQueryData(query) {
    switch(query.type.toLowerCase()) {
    	case 'conversationdetail': {
    		return api.postConversationsDetailsQuery(JSON.stringify(query.query));
    	}
    	case 'conversationaggregate': {
    		return api.postConversationsAggregatesQuery(JSON.stringify(query.query));
    	}
    	default: {
    		var err = 'Unknown query type: ' + query.type;
    		log.error(err);
    		throw err;
    	}
    }
}

function processQueries(settings, defs) {
	log.verbose('Processing queries...');
	_.forOwn(settings.queries, function(query, queryName) {
		// Reset the vars for the definition
		defs.initializeVars();
		
		// Set custom data from the query
		defs.setVars(query.customData);

		// Process query
		processQueriesObject(query, defs);
	});
}

function processQueriesObject(obj, defs) {
	_.forOwn(obj, function(value, property) {
		var propertyType = typeof(value);
		switch(propertyType){
			case 'object':
				// Recursively process objects
				processQueriesObject(value, defs);
				break;
			case 'string':
				// Execute doT template on strings
				obj[property] = executeTemplate(value, {}, defs);
				break;
		}
	});
}

