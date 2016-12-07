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
			if (config.args.showconfig === true) 
				log.debug(JSON.stringify(config.settings,null,2));
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

Executor.prototype.executeJobs = function(jobs, deferred) {
	if (!deferred)
		deferred = Q.defer();

	if (!jobs || jobs.length === 0) {
		log.verbose('All jobs completed!');
		deferred.resolve();
		return deferred.promise;
	}

	var jobName = jobs.shift();
	var job = config.settings.jobs[jobName];
	var _this = this;
	if (job) {
		this.executeJob(job)
			.then(function() {
				return _this.executeJobs(jobs, deferred);
			})
			.catch(function(error) {
				log.error(error.stack);
				deferred.reject(error);
			});
	} else {
		log.warning('Job does not exist: ' + jobName);
		_this.executeJobs(jobs, deferred);
	}
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

	log.debug('Executing job: ' + job.name);
	var jobLog = new Logger('job:' + job.name);

	executeConfigurations(job, _.keys(job.configurations), this, jobLog)
		.then(function() {
			log.debug('Job completed: ' + job.name);
			deferred.resolve();
		})
		.catch(function(error) {
			log.error(error.stack);
			deferred.reject(error);
		});

	return deferred.promise;
};



module.exports = new Executor();



function executeConfigurations(job, configurationNames, _this, jobLog, deferred) {
	if (!deferred)
		deferred = Q.defer();

	if (!configurationNames || configurationNames.length === 0) {
		log.verbose('All configurations completed!');
		deferred.resolve();
		return deferred.promise;
	}

	var configurationName = configurationNames.shift();
	var configuration = job.configurations[configurationName];

	if (!configuration) {
		executeConfigurations(job, configurationNames, _this, jobLog, deferred);
		return deferred.promise;
	}

	jobLog.debug('Processing configuration: ' + configuration.name);

	getQueryData(configuration, _this)
		.then(function(data) {
			// Compile all the custom attributes in the job to prepare for templating
			jobLog.verbose('Setting job data...');
			_this.defs.setJobData(data, job, configuration);

			// Execute data transforms
			_.forOwn(configuration.transforms, function(transform, key) {
				_.forEach(transform.expressions, function(expression, key) {
					jobLog.verbose('Executing transform: ' + expression);
					executeTemplate(expression, null, _this.defs);
				});
			});

			// Compile and run the template 
			//TODO: determine if a new defs object should be used or if reuse is fine. Concern: functions added during template compilation may be added to defs
			jobLog.verbose('Executing templates...');
			_.forOwn(configuration.templates, function(template, key) {
				jobLog.verbose('Executing template: ' + template.name);
				var output = executeTemplate(template.template, null, _this.defs);

				if (config.args.showoutput === true) {
					jobLog.info(output, template.name + ':\n');
				}

				// Export processing
				var exportFileName = executeTemplate(template.fileName, null, _this.defs);
				jobLog.verbose('Executing exports...');
				_.forOwn(configuration.exports, function(ex, key) {
					switch(ex.type.toLowerCase()) {
						case 'file': {
							exportToFile(path.join(ex.destination, exportFileName), output);
							break;
						}
						default: {
							jobLog.error('Unknown export type: ' + ex.type);
							break;
						}
					}
				});
			});

			// Done
			executeConfigurations(job, configurationNames, _this, jobLog, deferred);
		})
		.catch(function(error) {
			jobLog.error(error.stack);
			deferred.reject(error);
		});

	return deferred.promise;
}

function exportToFile(exportPath, content) {
	mkdirp.sync(path.dirname(exportPath));
	log.verbose('Writing output to ' + exportPath);
	fs.writeFileSync(exportPath, content);
}

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
function getQueryData(configuration, _this) {
	var deferred = Q.defer();

	//TODO: support a config parameter on a query to get X pages of data for the query
	var queryData = {};
	var keyCount = _.keys(configuration.queries).length;
	_.forOwn(configuration.queries, function(query, key) {
	    switch(query.type.toLowerCase()) {
	    	case 'conversationdetail': {
	    		api.postConversationsDetailsQuery(JSON.stringify(query.query))
	    			.then(function(data) {
	    				queryData[key] = data;
	    				if (_.keys(queryData).length == keyCount) {
	    					deferred.resolve(queryData);
	    				}
	    			});
	    		break;
	    	}
	    	case 'conversationaggregate': {
	    		api.postConversationsAggregatesQuery(JSON.stringify(query.query))
	    			.then(function(data) {
	    				queryData[key] = data;
	    				if (_.keys(queryData).length == keyCount) {
	    					deferred.resolve(queryData);
	    				}
	    			});
	    		break;
	    	}
	    	default: {
	    		var err = 'Unknown query type: ' + query.type;
	    		log.error(err);
	    		throw err;
	    	}
	    }
	});

	return deferred.promise;
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

