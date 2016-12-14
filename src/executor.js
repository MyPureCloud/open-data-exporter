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
 * @property {TemplateDefinitions} defs - The TemplateDefinitions object
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

/**
 * Recursively executes the specified jobs and resolves when all are completed
 * @module  Executor
 * @instance
 * @function executeJobs
 * @param {array}   jobNames - An array of job names to be executed
 * @param {promise} deferred - A reference to the promise to resolve when done
 *
 * @return {promise}
 */
Executor.prototype.executeJobs = function(jobNames, deferred) {
	if (!deferred)
		deferred = Q.defer();

	if (!jobNames || jobNames.length === 0) {
		log.verbose('All jobs completed!');
		deferred.resolve();
		return deferred.promise;
	}

	// Pop job name and get job
	var jobName = jobNames.shift();
	var job = config.settings.jobs[jobName];

	// Job found?
	if (!job) {
		log.warning('Job does not exist: ' + jobName);
		this.executeJobs(jobNames, deferred);
		return deferred.promise;
	}

	// Execute job
	var _this = this;
	this.executeJob(job)
		.then(function() {
			_this.executeJobs(jobNames, deferred);
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
 *
 * @return {promise}
 */
Executor.prototype.executeJob = function(job) {
	var deferred = Q.defer();

	log.debug('Executing job: ' + job.name);
	var jobLog = new Logger('job:' + job.name);

	// Execute each configuration in the job
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



/**
 * Recursively executes the specified configurations and resolves when all are completed
 * @module  Executor
 * @function executeConfigurations
 * @private
 * @param {Object}   job                - The job object
 * @param {array}    configurationNames - An array of configuration object names to process
 * @param {Executor} _this              - A reference to the Executor instance
 * @param {Logger}   jobLog             - A reference to the Logger instance for the job
 * @param {promise}  deferred           - A reference to the promise to resolve when done
 *
 * @return {promise}
 */
function executeConfigurations(job, configurationNames, _this, jobLog, deferred) {
	if (!deferred)
		deferred = Q.defer();

	// More to process?
	if (!configurationNames || configurationNames.length === 0) {
		log.verbose('All configurations completed!');
		deferred.resolve();
		return deferred.promise;
	}

	// Get configuration object
	var configurationName = configurationNames.shift();
	var configuration = job.configurations[configurationName];

	// Configuration found?
	if (!configuration) {
		jobLog.warning('Configuration does not exist: ' + configurationName);
		executeConfigurations(job, configurationNames, _this, jobLog, deferred);
		return deferred.promise;
	}

	// Reset defs object for every configuration
	_this.defs = new TemplateDefinitions();
	_this.defs.initializeVars();
	_this.defs.setJobData({}, job, configuration);

	// Load external modules
	_.forOwn(configuration.externalModules, function(moduleVar, moduleName) {
		jobLog.debug('Loading module to def.' + moduleName + ' from ' + moduleVar);
		_this.defs[moduleName] = require(moduleVar);
	});

	// Process execution plan
	jobLog.verbose('Processing execution plan for ' + configuration.name);
	processExecutionPlan(configuration, _this, jobLog)
		.then (function() {
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
							helpers.exportToFile(path.join(ex.destination, exportFileName), output);
							break;
						}
						default: {
							jobLog.error('Unknown export type: ' + ex.type);
							break;
						}
					}
				});
			});
		})
		.then(function() {
			deferred.resolve();
		})
		.catch(function(error) {
			jobLog.error(error.stack);
			deferred.reject(error);
		});

	return deferred.promise;
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
	return template(data ? data : defs);
}

function processExecutionPlan(configuration, _this, jobLog, configurationKeys, deferred) {
	if (!deferred) {
		deferred = Q.defer();
		configurationKeys = _.keys(configuration.executionPlan);
	}

	if (configurationKeys.length === 0) {
		jobLog.debug('Execution plan complete');
		deferred.resolve();
		return;
	}
	
	try {
		var key = configurationKeys.shift();
		var task = configuration.executionPlan[key];

		// Assume task is a query if it's not a transform. Add more cases here if additional task types are supported.
		switch(task.type.toLowerCase()) {
			case 'transform': {
				// Execute transforms
				executeTransform(task, null, _this, jobLog);

				return processExecutionPlan(configuration, _this, jobLog, configurationKeys, deferred);
			}
	    	default: {
				processQuery(key, task, _this, jobLog)
					.then(function() {
						jobLog.debug('query done');
						processExecutionPlan(configuration, _this, jobLog, configurationKeys, deferred);
					});
				break;
			}
		}
	} catch(error) {
		jobLog.error(error.stack);
		deferred.reject(error);
	}

	return deferred.promise;
}

function processQuery(queryName, query, _this, jobLog) {
	var deferred = Q.defer();

	jobLog.debug(query.strategy,  queryName + ' strategy: ');
	try {
	    switch(query.type.toLowerCase()) {
	    	case 'conversationdetail': {
	    		if (helpers.isType(query.strategy, 'string') && query.strategy.toLowerCase() == 'query') {
	    			processQueriesObject(query, {}, _this, jobLog);
		    		api.postConversationsDetailsQuery(JSON.stringify(query.query))
		    			.then(function(data) {
		    				_this.defs.data[queryName] = data;
		    				deferred.resolve();
		    			});
	    		} else if (query.strategy.type && query.strategy.type.toLowerCase() == 'repeat') {
	    			throw new Error('getUsers (repeat) is not implemented!');
	    		} else {
	    			jobLog.warning(query.strategy + 'Unknown query strategy: ');
	    			deferred.reject('Unknown query strategy');
	    		}
	    		break;
	    	}
	    	case 'conversationaggregate': {
	    		processQueriesObject(query, {}, _this, jobLog);
	    		if (helpers.isType(query.strategy, 'string') && query.strategy.toLowerCase() == 'query') {
		    		api.postConversationsAggregatesQuery(JSON.stringify(query.query))
		    			.then(function(data) {
		    				_this.defs.data[queryName] = data;
		    				deferred.resolve();
		    			})
						.catch(function(error) {
							jobLog.error(error.stack);
							deferred.reject(error);
						});
	    		} else if (query.strategy.type && query.strategy.type.toLowerCase() == 'repeat') {
	    			throw new Error('getUsers (repeat) is not implemented!');
	    		} else {
	    			jobLog.warning(query.strategy + 'Unknown query strategy: ');
	    			deferred.reject('Unknown query strategy');
	    		}
	    		break;
	    	}
	    	case 'useraggregate': {
	    		processQueriesObject(query, {}, _this, jobLog);
	    		if (helpers.isType(query.strategy, 'string') && query.strategy.toLowerCase() == 'query') {
		    		api.postUsersAggregatesQuery(JSON.stringify(query.query))
		    			.then(function(data) {
		    				_this.defs.data[queryName] = data;
		    				deferred.resolve();
		    			});
	    		} else if (query.strategy.type && query.strategy.type.toLowerCase() == 'repeat') {
	    			repeatQuery('postUsersAggregatesQuery', query, _this, jobLog)
	    				.then(function() {
	    					jobLog.debug('repeatQuery done');
	    					deferred.resolve();
	    				});
	    		} else {
	    			jobLog.warning(query.strategy + 'Unknown query strategy: ');
	    			deferred.reject('Unknown query strategy');
	    		}
	    		break;
	    	}
	    	case 'getusers': {
	    		processQueriesObject(query, {}, _this, jobLog);

	    		// Get parameter values
	    		var pageSize, pageNumber, id, sortOrder, expand;
	    		if (query.parameters) {
		    		pageSize = query.parameters.pageSize;
		    		pageNumber = query.parameters.pageNumber;
		    		id = query.parameters.id;
		    		sortOrder = query.parameters.sortOrder;
		    		expand = query.parameters.expand;
		    	}
	    		if (helpers.isType(query.strategy, 'string') && query.strategy.toLowerCase() == 'query') {
		    		api.getUsers(pageSize, pageNumber, id, sortOrder, expand)
		    			.then(function(data) {
		    				_this.defs.data[queryName] = data;
		    				deferred.resolve();
		    			});
	    		} else if (query.strategy.type && query.strategy.type.toLowerCase() == 'repeat') {
	    			throw new Error('getUsers (repeat) is not implemented!');
	    		} else {
	    			jobLog.warning(query.strategy + 'Unknown query strategy: ');
	    			deferred.reject('Unknown query strategy');
	    		}
	    		break;
	    	}
	    	default: {
	    		var err = 'Unknown query type: ' + query.type;
	    		log.error(err);
		    	deferred.reject(new Error(err));
	    	}
		}
	} catch(e) {
		jobLog.error(e.stack);
		deferred.reject(e);
	}

	return deferred.promise;
}

function repeatQuery(apiFunctionName, query, _this, jobLog, collection, collectionStrings, deferred) {
	if (!deferred) 
		deferred = Q.defer();

	// This must be the first time around, initialize
	if (!collection) {
		collectionStrings = query.strategy.collection.split('.');
		collection = _this.defs;

		// Validate
		var first = collectionStrings.shift();
		if (first.toLowerCase() != 'def') {
			throw new Error('Collection definition must begin with the "def" object! Collection: ' + query.strategy.collection);
		}
	}

	// Pop off next property
	// TODO: This assumes no collections exist in the path. Have to update to iterate intermediate collections
	var nextProp = collectionStrings.shift();
	collection = collection[nextProp];

	if (collectionStrings.length > 0) {
		repeatQuery(apiFunctionName, query, _this, jobLog, collection, collectionStrings, deferred);
		return deferred.promise;
	}

	// Once execution gets here, collection should be fully resolved and ready for iteration
	iterateCollectionQuery(apiFunctionName, query, _this, jobLog, collection)
		.then(function() {
			deferred.resolve();
		});

	return deferred.promise;
}

function iterateCollectionQuery(apiFunctionName, query, _this, jobLog, collection, i, deferred) {
	if (!deferred) 
		deferred = Q.defer();
	if (!i)
		i=0;

	// Done?
	if (collection.length <= i) {
		log.verbose('iterateCollectionQuery complete');
		deferred.resolve();
		return;
	}

	// Get value
	var value = collection[i];

	// Resolve templates in query
	processQueriesObject(query, value, _this.defs, jobLog);

	// Execute API call
	api[apiFunctionName](query.query)
		.then(function(queryData) {
			// Initialize property as either this.defs or the contextual collection object
			var property = value;
			if (query.strategy.destination.toLowerCase().startsWith('def.')) {
				property = _this.defs;
				// Trim "defs." from the beginning
				query.strategy.destination = query.strategy.destination.substring(4);
			}

			// Resolve the string and set the property with the query data
			resolveAndSetProperty(query.strategy.destination, property, value, queryData, _this, jobLog);
			
			// Recursion!
			i++;
			iterateCollectionQuery(apiFunctionName, query, _this, jobLog, collection, i, deferred);
		})
		.catch(function(error) {
			jobLog.error(error.stack);
			deferred.reject(error);
		});

	return deferred.promise;
}

function resolveAndSetProperty(propertyStrings, property, templateData, propertyData, _this, jobLog) {
	// This must be the first time around, initialize
	if (!Array.isArray(propertyStrings)) {
		propertyStrings = executeTemplate(propertyStrings, templateData, _this.defs);
		propertyStrings = propertyStrings.split('.');
	}

	// If there's more than one left, recursively process
	if (propertyStrings.length > 1) {
		// Pop next property name
		var propertyName = propertyStrings.shift();

		// Make sure it's not null
		if (!property[propertyName]) {
			property[propertyName] = {};
		}

		// Set it
		property = property[propertyName];

		// Recursively execute
		return resolveAndSetProperty(propertyStrings, property, templateData, propertyData, _this, jobLog);
	}

	// Last property part, set the value!
	log.debug('setting ' + propertyStrings[0] + '=' + propertyData);
	property[propertyStrings[0]] = propertyData;
}

function executeTransform(transform, data, _this, jobLog) {
	_.forEach(transform.expressions, function(expression, key) {
		jobLog.verbose('Executing transform: ' + expression);
		executeTemplate(expression, data, _this.defs);
	});
}

function processQueriesObject(query, data, _this, jobLog) {
	// Process templates in query object
	recurseQueriesObject(query.query, null, _this.defs);
	recurseQueriesObject(query.parameters, null, _this.defs);

	// Execute transforms
	_.forOwn(query.transforms, function(transform) {
		_this.defs.vars.query = query;
		executeTransform(transform, null, _this, jobLog);
		_this.defs.vars.query = null;
	});
}

/**
 * Recursively processes a query object
 * @private
 * @param {Object}              obj  - The object to process
 * @param {TemplateDefinitions} defs - The TemplateDefinitions object
 */
function recurseQueriesObject(obj, data, defs) {
	_.forOwn(obj, function(value, property) {
		var propertyType = typeof(value);
		switch(propertyType){
			case 'object':
				// Recursively process objects
				recurseQueriesObject(value, data, defs);
				break;
			case 'string':
				// Execute doT template on strings
				obj[property] = executeTemplate(value, data, defs);
				break;
		}
	});
}

