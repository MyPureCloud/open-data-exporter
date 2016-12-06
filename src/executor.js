const Q = require('q');
const refParser = require('json-schema-ref-parser');
const dot = require('dot');
const _ = require('lodash');
const path = require('path');
const mkdirp = require('mkdirp');
const fs = require('fs');


var config = require('./config');
var Logger = require('./logger');
var packageData = require('./package.json');
var api = require('./api');
var helpers = require('./helpers');
var TemplateDefinitions = require('./templateDefinitions');



var log = new Logger('executor');



/**
 * A module to manage executing templates
 * @module  Executor
 * @property {TemplateDefinitions} [defs] - The TemplateDefinitions object
 */
function Executor() {
	// Don't strip whitespace from templates
	dot.templateSettings.strip = false;

	this.defs = new TemplateDefinitions();
}

/**
 * Initializes the instance of Executor
 * @module  Executor
 * @instance
 * @function initialize
 * @return {promise}
 */
Executor.prototype.initialize = function() {
	var deferred = Q.defer();

	api.login()
		// Execute templates in queries to prepare them for API requests
		.then(() => processQueries(config.settings, this.defs))
		.then(function() {
			log.verbose('Queries processed successfully');
			if (config.args.showconfig === true) 
				log.debug(JSON.stringify(config.settings,null,2));
		})
		// Dereference JSON references. This makes the config file easy to use
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

/**
 * Executes the specified job
 * @module  Executor
 * @instance
 * @function executeJob
 * @param {Object} job - The job
 * @return {promise}
 */
Executor.prototype.executeJob = function(job) {
	var deferred = Q.defer();

	try {
		log.debug('Executing job: ' + job.name);
		var _this = this;

		// Execute API analytics query
		getQueryData(job.configuration.query)
			.then(function(data) {
				// Compile all the custom attributes in the job to prepare for templating
				log.verbose('Setting job data...');
				_this.defs.setJobData(data, job);

				// Execute data transforms
				_.forEach(job.configuration.transform.expressions, function(value, key) {
					log.verbose('Executing transform: ' + value);
					executeTemplate(value, null, _this.defs);
				});

				// Compile and run the template 
				//TODO: determine if a new defs object should be used or if reuse is fine. Concern: functions added during template compilation may be added to defs
				log.verbose('Executing template....');
				var output = executeTemplate(job.configuration.template.template, null, _this.defs);

				if (config.args.showoutput === true) {
					log.info(output, job.name + ':\n');
				}

				// Export processing
				var exportFileName = executeTemplate(job.configuration.template.fileName, null, _this.defs);
				var exportPath = path.join(job.configuration.export.destination, exportFileName);
				log.verbose('Creating path ' + path.dirname(exportPath));
				mkdirp.sync(path.dirname(exportPath));
				log.verbose('Writing file ' + path.basename(exportPath));
				fs.writeFileSync(exportPath, output);

				// Done
				log.debug('Job completed: ' + job.name);
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


/**
 * Executes a template with the given data and definitions
 * @module  Executor
 * @function executeTemplate
 * @private
 * @param {string}              templateString - The template to execute
 * @param {Object}              data           - A data object
 * @param {TemplateDefinitions} defs           - The TemplateDefinitions object
 *
 * @return {string} The result of the template execution
 */
function executeTemplate(templateString, data, defs) {
	// Initialize defs object if not provided
	if (defs === undefined || defs === null) {
		log.warning('executeTemplate: defs was undefined, creating new object');
		defs = new TemplateDefinitions();
	}

	// Plug in data
	if (data)
		defs.data = data;
	
	// Set to empty object if nothing was set previously
	// This may be set already by using defs.setJobData(...)
	if (!defs.data)
		defs.data = {};

	// Compile template
	var template = dot.template(templateString, null, defs);

	// Execute template
	return template(defs);
}

/**
 * Executes API requests to get data
 * @private
 * @param {Object} query - The query configuration object
 *
 * @return {promise}
 */
function getQueryData(query) {
	//TODO: support a config parameter on a query to get X pages of data for the query
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

/**
 * Executes templates in all query objects and updates the query object with the template result
 * @private
 * @param {Object}              settings - The settings object
 * @param {TemplateDefinitions} defs     - The TemplateDefinitions object
 */
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

/**
 * Recursively processes a query object
 * @private
 * @param {Object}              obj  - The object to process
 * @param {TemplateDefinitions} defs - The TemplateDefinitions object
 */
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

