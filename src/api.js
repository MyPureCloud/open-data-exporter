const platformClient = require('purecloud-platform-client-v2');
const Q = require('q');
const moment = require('moment');
const _ = require('lodash');
const Logger = require('lognext');

const config = require('./config');

const log = new Logger('api');



function Api() {
	this.client = platformClient.ApiClient.instance;
	this.client.setEnvironment(config.settings.pureCloud.environment || 'mypurecloud.com');

	// Instantiate APIs
	this.analyticsApi = new platformClient.AnalyticsApi();
	this.authorizationApi = new platformClient.AuthorizationApi();
	this.usersApi = new platformClient.UsersApi();
	this.conversationsApi = new platformClient.ConversationsApi();
	this.routingApi = new platformClient.RoutingApi();

	if (config.args.debugapi === true) {
		log.debug('debugging api');
		this.client.setDebugLog(console.log, 25);
	}
}

Api.prototype.login = function() {
	let deferred = Q.defer();

	if (!config.settings.pureCloud.clientId || config.settings.pureCloud.clientId === '') {
		deferred.reject(new Error('Authentication error: Client ID not set'));
		return deferred.promise;
	}
	if (!config.settings.pureCloud.clientSecret || config.settings.pureCloud.clientSecret === '') {
		deferred.reject(new Error('Authentication error: Client Secret not set'));
		return deferred.promise;
	}

	let startTime = new moment();
	this.client.loginClientCredentialsGrant(config.settings.pureCloud.clientId, config.settings.pureCloud.clientSecret)
		.then(function() {
			if (config.args.debugapi === true) 
				log.verbose('Request "login" completed in ' + moment().diff(startTime, new moment()) + ' ms');
			return deferred.resolve();
		})
		.catch(function(err) {
			let e = new Error('Authentication failed! Check your Client ID and Secret');
			log.error(err);
			return deferred.reject(e);
		});

	return deferred.promise;
};

Api.prototype.postConversationsDetailsQuery = function(request, _this, deferred, results) {
	if (!deferred) 
		deferred = Q.defer();
	if (!_this)
		_this = this;

	if (!request.body.paging) request.body.paging = {'pageSize':100,'pageNumber':1};
	if (!request.body.paging.pageSize || request.body.paging.pageSize > 100) request.body.paging.pageSize = 100;
	if (!request.body.paging.pageNumber) request.body.paging.pageNumber = 1;

	let startTime = new moment();
	_this.analyticsApi.postAnalyticsConversationsDetailsQuery(JSON.stringify(request.body))
		.then(function(result){
			if (config.args.debugapi === true) 
				log.verbose('Request "postConversationsDetailsQuery" completed in ' + moment().diff(startTime, new moment()) + ' ms');

			if (!results) {
				results = result;
			} else {
				if (result.conversations)
					results.conversations = results.conversations.concat(result.conversations);
			}

			if (request.getAllPages === true && result.conversations) {
				request.body.paging.pageNumber++;
				log.verbose('Getting more data from postConversationsDetailsQuery page ' + request.body.paging.pageNumber + ' (current conversation count: ' + results.conversations.length + ')');
				_this.postConversationsDetailsQuery(request, _this, deferred, results);
			} else {
				deferred.resolve(results);
			}
		})
		.catch(function(error){
			log.debug(error.status, 'status: ');
			try {
				if (retryOnError(error, 
					function(){_this.postConversationsDetailsQuery(request, _this, deferred, results);}))
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

Api.prototype.postConversationsAggregatesQuery = function(request) {
	let deferred = Q.defer();

	let startTime = new moment();
	this.analyticsApi.postAnalyticsConversationsAggregatesQuery(JSON.stringify(request.body))
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

Api.prototype.postUsersAggregatesQuery = function(request, deferred, _this) {
	if (!deferred) 
		deferred = Q.defer();
	if (!_this)
		_this = this;

	let startTime = new moment();
	_this.analyticsApi.postAnalyticsUsersAggregatesQuery(JSON.stringify(request.body))
		.then(function(result){
			if (config.args.debugapi === true) 
				log.verbose('Request "postUsersAggregatesQuery" completed in ' + moment().diff(startTime, new moment()) + ' ms');
			deferred.resolve(result);
		})
		.catch(function(error){
			log.debug(error.status, 'status: ');
			try {
				if (retryOnError(error, 
					function(){_this.postUsersAggregatesQuery(request, deferred, _this);}))
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

Api.prototype.postUsersDetailsQuery = function(request, _this, deferred, results) {
	if (!deferred) 
		deferred = Q.defer();
	if (!_this)
		_this = this;

	if (!request.body.paging) request.body.paging = {'pageSize':100,'pageNumber':1};
	if (!request.body.paging.pageSize || request.body.paging.pageSize > 100) request.body.paging.pageSize = 100;
	if (!request.body.paging.pageNumber) request.body.paging.pageNumber = 1;

	let startTime = new moment();
	_this.analyticsApi.postAnalyticsUsersDetailsQuery(JSON.stringify(request.body))
		.then(function(result){
			if (config.args.debugapi === true) 
				log.verbose('Request "postUsersDetailsQuery" completed in ' + moment().diff(startTime, new moment()) + ' ms');

			if (!results) {
				results = result;
			} else {
				if (result.userDetails)
					results.userDetails = results.userDetails.concat(result.userDetails);
			}

			if (request.getAllPages === true && result.userDetails) {
				request.body.paging.pageNumber++;
				log.verbose('Getting more data from postUsersDetailsQuery page ' + request.body.paging.pageNumber);
				_this.postUsersDetailsQuery(request, _this, deferred, results);
			} else {
				deferred.resolve(results);
			}
		})
		.catch(function(error){
			log.debug(error.status, 'status: ');
			try {
				if (retryOnError(error, 
					function(){_this.postUsersDetailsQuery(request, _this, deferred, results);}))
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

	// This resource only accepts 100 user IDs at a time
	let idList = '';
	let idCount = 100;
	let remainingIds = [];
	if (Array.isArray(id)) {
		if (id.length < idCount) {
			idCount = id.length;
		}
		idList = id.slice(0, idCount);
		remainingIds = id.slice(idCount);
	}

	let startTime = new moment();
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
				log.verbose('Executing getUsers again, ' + remainingIds.length + ' more IDs to retrieve...');
				_this.getUsers(pageSize, pageNumber, remainingIds, sortOrder, expand, deferred, _this, results);
			} else {
				deferred.resolve(results);
			}
		})
		.catch(function(error){
			try {
				if (retryOnError(error, 
					function(){_this.getUsers(pageSize, pageNumber, id, sortOrder, expand, deferred, _this, results);}))
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

Api.prototype.getQueues = function(pageSize, pageNumber, sortBy, name, active, getAllPages, deferred, _this, results) {
	if (!deferred) 
		deferred = Q.defer();
	if (!_this)
		_this = this;

	let startTime = new moment();
	_this.routingApi.getRoutingQueues(pageSize, pageNumber, sortBy, name, active)
		.then(function(result){
			if (config.args.debugapi === true) 
				log.verbose('Request "getQueues" completed in ' + moment().diff(startTime, new moment()) + ' ms');

			if (!results) {
				results = result;
			} else {
				results.entities = results.entities.concat(result.entities);
			}

			if (getAllPages === true && pageNumber < result.pageCount) {
				pageNumber++;
				log.verbose('Getting more data from page ' + pageNumber);
				_this.getQueues(pageSize, pageNumber, sortBy, name, active, getAllPages, deferred, _this, results);
			} else {
				deferred.resolve(results);
			}
		})
		.catch(function(error){
			try {
				if (retryOnError(error, 
					function(){_this.getQueues(pageSize, pageNumber, sortBy, name, active, getAllPages, deferred, _this, results);}))
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

Api.prototype.getConversation = function(conversationId, deferred, _this) {
	if (!deferred) 
		deferred = Q.defer();
	if (!_this)
		_this = this;

	let startTime = new moment();
	_this.conversationsApi.getConversation(conversationId)
		.then(function(result) {
			if (config.args.debugapi === true) 
				log.verbose('Request "getConversation" completed in ' + moment().diff(startTime, new moment()) + ' ms');

			deferred.resolve(result);
		})
		.catch(function(error){
			try {
				if (retryOnError(error, 
					function(){_this.getConversation(conversationId, deferred, _this);}))
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
	let deferred = Q.defer();

	let startTime = new moment();
	this.authorizationApi.getAuthorizationPermissions({ pageSize: 100 })
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
	let sleepMs = 1000;

	// Check for retryable status codes. 
	// Set sleepMs to whatever is appropriate for the code.
	// Anything falling to default will be considered unable to be retried
	switch(error.status) {
		case 429: {
			// Get remaining seconds, convert to milliseconds, and add 1 second for good measure
			sleepMs = (error.response.header['inin-ratelimit-reset'] * 1000) + 1000;
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