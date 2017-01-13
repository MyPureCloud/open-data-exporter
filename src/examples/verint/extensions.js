var _ = require('lodash');


function Verint() {

}

Verint.prototype.populateUserIdPredicates = function(data, request) {
	_.forEach(data, function(userData) {
		if (userData.group.userId) {
			request.body.filter.predicates.push({
				"type": "dimension",
				"dimension": "userId",
				"operator": "matches",
				"value": userData.group.userId
			});
		}
	});
};

Verint.prototype.aggregateVerintData = function(data) {
	// Organize routing status data by user id
	var routingData = {};
	_.forEach(data.verint_agent_scorecard_report_user_query.results, function(result) {
		routingData[result.group.userId] = result;

		var tAgentRoutingStatus_ALL = 0;
		var tAgentRoutingStatus_AUX_IN_TIME = 0;
		var tAgentRoutingStatus_COMMUNICATING = 0;

		// Iterate through metrics
		_.forEach(result.data[0].metrics, function(metric) {
			if (metric.metric == 'tAgentRoutingStatus') {
				tAgentRoutingStatus_ALL += metric.stats.sum;
				metric.metric = metric.metric + '_' + metric.qualifier;

				if (metric.qualifier != 'IDLE') {
					tAgentRoutingStatus_AUX_IN_TIME += metric.stats.sum;
				}

				if (metric.qualifier == 'COMMUNICATING') {
					tAgentRoutingStatus_COMMUNICATING += metric.stats.sum;
				}
			}

		});

		// Add custom metrics
		routingData[result.group.userId].data[0].metrics.push({
			"metric": "tAgentRoutingStatus_COMMUNICATING",
			"qualifier": "tAgentRoutingStatus_COMMUNICATING",
			"stats": {
				"sum": tAgentRoutingStatus_COMMUNICATING
			}
		});
		routingData[result.group.userId].data[0].metrics.push({
			"metric": "tAgentRoutingStatus_AUX_IN_TIME",
			"qualifier": "tAgentRoutingStatus_AUX_IN_TIME",
			"stats": {
				"sum": tAgentRoutingStatus_AUX_IN_TIME
			}
		});
		routingData[result.group.userId].data[0].metrics.push({
			"metric": "tAgentRoutingStatus_ALL",
			"qualifier": "ALL",
			"stats": {
				"sum": tAgentRoutingStatus_ALL
			}
		});
	});

	// Add routing data to conversation data
	_.forEach(data.verint_agent_scorecard_report_call_query.results, function(result) {
		_.forEach(routingData[result.group.userId].data[0].metrics, function(metric) {
			result.data[0].metrics.push(metric);
		});
	});
};

Verint.prototype.populateUserIds = function(data, request) {
	request.parameters.id = [];
	_.forEach(data.results, function(result) {
		request.parameters.id.push(result.group.userId);
	});
};

Verint.prototype.flattenUserData = function(data, def) {
	def.data.users = {};
	_.forEach(data.entities, function(user) {
		def.data.users[user.id] = user;
	});
};

Verint.prototype.getUserData = function(users, id){
	return users[id];
};

module.exports = new Verint();



















