var config = require('./config');
var Q = require('q');
var Mustache = require('mustache');

config.load();

var purecloud = require('purecloud_api_sdk_javascript');
var pureCloudSession = purecloud.PureCloudSession({
  strategy: 'client-credentials',
  clientId: config.settings.clientId,
  clientSecret: config.settings.clientSecret
});
//pureCloudSession.debugLog = console.log;
pureCloudSession.login().then(function() {
	var api = new purecloud.AuthorizationApi(pureCloudSession);

	api.getPermissions()
	  .then(function(result){
	    console.log('Congratulations, ' + result.total + ' permissions are available');
	    console.log(config.settings.queries[0].query);
	    doConversationsDetailsQuery(JSON.stringify(config.settings.queries[0].query))
	    	.then(function(data) {
	    		console.log('Got data!');
	    		var packagedData = packageData(data);
	    		console.log(packagedData);
	    		var output = Mustache.render(config.settings.templates[0].template, packagedData);
	    		console.log(output);

	    		console.log('done')
	    	})
	  })
	  .catch(function(error){
	    console.log(error);
	  });
});

function doConversationsDetailsQuery(query) {
	var deferred = Q.defer();
	var api = new purecloud.AnalyticsApi(pureCloudSession);
	var body = {};

	api.postConversationsDetailsQuery(query)
		.then(function(result){
			deferred.resolve(result);
		})
		.catch(function(error){
			deferred.reject(error);
		});

	return deferred.promise;
}

function packageData(data) {
	return {
		"date": new Date(),
		"data": data
	}
}