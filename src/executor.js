var Q = require('q');
var refParser = require('json-schema-ref-parser');

var config = require('./config');
var expressionProcessor = require('./expressionProcessor');
var Logger = require('./logger');
var packageData = require('./package.json');
var api = require('./api');
var helpers = require('./helpers');



var log = new Logger('executor');



function Executor() {

}

Executor.prototype.initialize = function() {
	var deferred = Q.defer();

	api.login()
		.then(() => refParser.dereference(config.settings))
		.then(function(schema) {
			log.info('Configuration successfully dereferenced');
			deferred.resolve();
		})
		.catch(function(error) {
			log.error(error.stack);
		});

	return deferred.promise;
};

Executor.prototype.executeJob = function(job) {
	var deferred = Q.defer();

	getQueryData(job.configuration.query)
		.then(function(data) {
			//log.debug(data)
			var jobData = config.getJobData(data, job);
			//fs.writeFileSync('data.json',JSON.stringify(jobData));
			var output = helpers.executeTemplate(job.configuration.template.template, jobData);
			log.verbose(output, job.name + ':\n');

			return {};
		});

	return deferred.promise;
};



module.exports = new Executor();



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