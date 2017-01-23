var _ = require('lodash');
var leftPad = require('left-pad');
var rightPad = require('right-pad');
var moment = require('moment-timezone');



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

Verint.prototype.leftPad = leftPad;

Verint.prototype.rightPad = rightPad;

Verint.prototype.getIntervalFormat = function(vars) {
	var start = vars.previousIntervalStart;
	var end = vars.previousIntervalStart.clone().add(moment.duration(vars.interval));
	return start.format('DD/MM/YYYY HH:mm') + '-' + end.format('HH:mm');
};

Verint.prototype.flattenQueueData = function(data) {
	data.queues = {};
	_.forEach(data.verint_get_queues_query.entities, function(queue) {
		data.queues[queue.id] = queue;
	});
};

Verint.prototype.aggregateMediaStatData = function(data, queues) {
	_.forEach(data.results, function(conversation) {
		// Set queue data
		if (queues[conversation.group.queueId]) {
			conversation.queue = queues[conversation.group.queueId];
		} else {
			// Handle unknown queue
			conversation.queue = {
				id: conversation.group.queueId,
				name: conversation.group.queueId
			};
		}

		// Initialize to default data to ensure values for missing metrics
		conversation.metrics = {
			"tHandle":{
              "metric": "tHandle",
              "stats": {
                "max": -1,
                "min": -1,
                "count": -1,
                "sum": -1
              }
            },
            "oServiceLevel":{
              "metric": "oServiceLevel",
              "stats": {
                "ratio": -1,
                "numerator": -1,
                "denominator": -1,
                "target": -1
              }
            },
            "tAbandon":{
              "metric": "tAbandon",
              "stats": {
                "max": -1,
                "min": -1,
                "count": -1,
                "sum": -1
              }
            },
            "nOffered":{
              "metric": "nOffered",
              "stats": {
                "count": -1
              }
            },
            "tWait":{
              "metric": "tWait",
              "stats": {
                "max": -1,
                "min": -1,
                "count": -1,
                "sum": -1
              }
            }
		};

		// Set metrics
		_.forEach(conversation.data[0].metrics, function(metric) {
			conversation.metrics[metric.metric] = metric;
		});

		// Set computed metrics
		conversation.metrics.tWait.stats.asa = (conversation.metrics.tWait.stats.sum / conversation.metrics.tWait.stats.count).toString().split('.')[0];
		conversation.metrics.tHandle.stats.aht = (conversation.metrics.tHandle.stats.sum / conversation.metrics.tHandle.stats.count).toString().split('.')[0];
		conversation.metrics.oServiceLevel.stats.percent = (conversation.metrics.oServiceLevel.stats.ratio * 100).toString().split('.')[0];
	});
};



module.exports = new Verint();
