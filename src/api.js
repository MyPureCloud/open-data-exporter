var purecloud = require('purecloud_api_sdk_javascript');
var Q = require('q');
var moment = require('moment');
const _ = require('lodash');

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
	this.usersApi = new purecloud.UsersApi(this.pureCloudSession);

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

Api.prototype.postUsersAggregatesQuery = function(query, deferred, _this) {
	if (!deferred) 
		deferred = Q.defer();
	if (!_this)
		_this = this;

	var startTime = new moment();
	_this.analyticsApi.postUsersAggregatesQuery(query)
		.then(function(result){
			if (config.args.debugapi === true) 
				log.verbose('Request "postUsersAggregatesQuery" completed in ' + moment().diff(startTime, new moment()) + ' ms');
			deferred.resolve(result);
		})
		.catch(function(error){
			log.debug(error.status, 'status: ');
			try {
				if (retryOnError(error, 
					_this.postUsersAggregatesQuery.bind(query, deferred, _this)))
					return;

				log.error(error);
				deferred.reject(error);
			} catch(e) {
				log.error(e.stack);
				deferred.reject(e);
			}
		});

	return deferred.promise;
};

Api.prototype.getUsers = function(pageSize, pageNumber, id, sortOrder, expand, deferred, _this, results) {
	if (!deferred) 
		deferred = Q.defer();
	if (!_this)
		_this = this;

	/**** API LIMITATION/WORKAROUND ****
	 * API requests are limited to ~7000 characters for the request URI. When sending a large collection of 
	 * user IDs, this limit will be exceeded. 
	 * 
	 * [IGNORE THIS, SEE NEXT COMMENTS] To work around this issue, this code will only send 180 IDs at a time.
	 * A guid is 36 chars + comma, so 180 * 37 = 6660, keeping it safely under the limit.
	 *
	 * API-2149 exists to add additional resources that will allow a true bulk get of users.
	 * 
	 * There seems to be a bug because nothing over 50 works. 51 ids either returns a 502, 
	 * 504, or 400, but 50 ids always works. This has been reported as API-2150.
	 ***********************************/

	var idList = '';
	var idCount = 100;
	var remainingIds = [];
	if (Array.isArray(id)) {
		if (id.length < 100) {
			idCount = id.length;
		}
		idList = id.slice(0, idCount);
		remainingIds = id.slice(idCount);
	}

	var startTime = new moment();
	_this.usersApi.getUsers(pageSize, pageNumber, idList, sortOrder, expand)
		.then(function(result){
			if (config.args.debugapi === true) 
				log.verbose('Request "getUsers" completed in ' + moment().diff(startTime, new moment()) + ' ms');

			if (!results) {
				results = result;
			} else {
				results.entities = results.entities.concat(result.entities);
			}

			if (remainingIds.length > 0) {
				log.debug('Executing getUsers again, ' + remainingIds.length + ' more IDs to retrieve...');
				_this.getUsers(pageSize, pageNumber, remainingIds, sortOrder, expand, deferred, _this, results);
			} else {
				deferred.resolve(results);
			}
		})
		.catch(function(error){
			log.debug(error.status, 'status: ');
			try {
				if (retryOnError(error, 
					_this.getUsers.bind(pageSize, pageNumber, id, sortOrder, expand, deferred, _this)))
					return;

				log.error(error);
				deferred.reject(error);
			} catch(e) {
				log.error(e.stack);
				deferred.reject(e);
			}
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



function retryOnError(error, retryFunction) {
	// Default to wait a second before retrying
	var sleepMs = 1000;

	// Check for retryable status codes. 
	// Set sleepMs to whatever is appropriate for the code.
	// Anything falling to default will be considered unable to be retried
	switch(error.status) {
		case 429: {
			// Get remaining seconds, convert to milliseconds, and add 1 for good measure
			sleepMs = (error.response.header['inin-ratelimit-reset'] * 1000) + 1;
			log.warning('RATE LIMITED! Sleeping for ' + sleepMs + ' ms');
			break;
		}
		case 504: {
			// Set timeout to 10 seconds. 504s usually take a few seconds to clear up.
			sleepMs = 10 * 1000;
			log.warning('504 Gateway Timeout - Sleeping for ' + sleepMs + ' until retrying');
			break;
		}
		default: {
			return false;
		}
	}

	// Just do it, later
	setTimeout(retryFunction, sleepMs);

	// Let the caller know the API call will be retried
	return true;
}