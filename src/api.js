var purecloud = require('purecloud_api_sdk_javascript');
var Q = require('q');
var moment = require('moment');

var config = require('./config');
var Logger = require('./logger');



var log = new Logger('api');


function Api() {
	this.pureCloudSession = purecloud.PureCloudSession({
		strategy: 'client-credentials',
		clientId: config.settings.pureCloud.clientId,
		clientSecret: config.settings.pureCloud.clientSecret,
		timeout: config.settings.pureCloud.timeout
	});

	// Instantiate APIs
	this.analyticsApi = new purecloud.AnalyticsApi(this.pureCloudSession);
	this.authorizationApi = new purecloud.AuthorizationApi(this.pureCloudSession);

	if (config.args.debugapi === true) {
		log.debug('debugging api');
		this.pureCloudSession.debugLog = console.log;
	}
}

Api.prototype.login = function() {
	var deferred = Q.defer();

	var startTime = new moment();
	this.pureCloudSession.login()
		.then(function() {
			if (config.args.debugapi === true) 
				log.verbose('Request "login" completed in ' + moment().diff(startTime, new moment()) + ' ms');
			return deferred.resolve();
		})
		.catch(function(error) {
			return deferred.reject(error);
		});

	return deferred.promise;
};

Api.prototype.postConversationsDetailsQuery = function(query) {
	var deferred = Q.defer();
	var body = {};

	var startTime = new moment();
	this.analyticsApi.postConversationsDetailsQuery(query)
		.then(function(result){
			if (config.args.debugapi === true) 
				log.verbose('Request "postConversationsDetailsQuery" completed in ' + moment().diff(startTime, new moment()) + ' ms');
			deferred.resolve(result);
		})
		.catch(function(error){
			deferred.reject(error);
		});

	return deferred.promise;
};

Api.prototype.postConversationsAggregatesQuery = function(query) {
	var deferred = Q.defer();
	var body = {};

	var startTime = new moment();
	this.analyticsApi.postConversationsAggregatesQuery(query)
		.then(function(result){
			if (config.args.debugapi === true) 
				log.verbose('Request "postConversationsAggregatesQuery" completed in ' + moment().diff(startTime, new moment()) + ' ms');
			deferred.resolve(result);
		})
		.catch(function(error){
			deferred.reject(error);
		});

	return deferred.promise;
};

Api.prototype.getPermissions = function() {
	var deferred = Q.defer();
	var body = {};

	var startTime = new moment();
	this.authorizationApi.getPermissions()
		.then(function(result){
			if (config.args.debugapi === true) 
				log.verbose('Request "getPermissions" completed in ' + moment().diff(startTime, new moment()) + ' ms');
			deferred.resolve(result);
		})
		.catch(function(error){
			deferred.reject(error);
		});

	return deferred.promise;
};

module.exports = new Api();