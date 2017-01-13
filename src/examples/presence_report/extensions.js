var _ = require('lodash');
var moment = require('moment-timezone');
var instadate = require('instadate');


function Extensions() {

}

Extensions.prototype.aggregateUserData = function(data) {
	var m = new moment();
	console.log('Aggregating ' + data.presence_detail_request.userDetails.length + ' user data elements.' + 
		(data.presence_detail_request.userDetails.length > 500 ? ' This could take a while.' : ''));

	// Make user data available by ID
	data.user_resolution_query.users = {};
	_.forOwn(data.user_resolution_query.entities, function(user){
		data.user_resolution_query.users[user.id] = user;
	});

	// Initialize
	data.userData = {};

	// Iterate users
	_.forEach(data.presence_detail_request.userDetails, function(user) {

		// Get existing object or make new one
		var newUser = data.userData[user.userId] ? data.userData[user.userId] : {
			id: user.userId,
			name: data.user_resolution_query.users[user.userId].name,
			events: []
		};

		// Add presence events
		if (user.primaryPresence)
			Array.prototype.push.apply(newUser.events, user.primaryPresence);

		// Add routing status events
		if (user.routingStatus)
			Array.prototype.push.apply(newUser.events, user.routingStatus);

		// Sort and derive duration
		processEvents(newUser.events);

		// Set user object
		data.userData[user.userId] = newUser;
	});

	// Flatten object to array
	data.users = [];
	_.forOwn(data.userData, function(user){
		data.users.push(user);
	});

	// Don't need this data anymore, keep the object smaller
	data.userData = null;
	data.user_resolution_query.entities = null;

	console.log('Aggregation done in ' + moment().diff(m, new moment()) + ' ms');
};

Extensions.prototype.populateUserIds = function(data, request) {
	request.parameters.id = [];
	_.forEach(data.userDetails, function(user) {
		if (request.parameters.id.indexOf(user.userId) === -1)
			request.parameters.id.push(user.userId);
	});
};



function processEvents(events) {
	var m = new moment();
	// Sort into chronological order by start time
	events.sort(function(a, b) {
		/*
		var startA = new moment(a.startTime);
		var startB = new moment(b.startTime);

		// A < B
		if (startA.isBefore(b)) return -1;

		// A < B
		if (startA.isAfter(b)) return 1;

		// ==
		return 0;
		*/
	
		/* The above code has been left here for anyone who wants to learn.
		 * It was taking ~20 seconds to sort 300 items!
		 * The code below takes ~1 millisecond to sort the same dataset.
		 * Moment.js is great for robust date operations, but it has a lot of overhead.
		 */

		var date1 = new Date(a.startTime);
		var date2 = new Date(b.startTime);

		return instadate.differenceInDates(date1, date2);
	});
	var d = moment().diff(m, new moment());

	// Calculate event duration
	_.forEach(events, function(event) {
		var start = new moment(event.startTime);
		var end = new moment(event.endTime);

		// Determine difference in milliseconds
		event.duration = end.diff(start);

		// Use Moment.js to come up with a friendly value
		event.durationString = moment.duration(event.duration).humanize();
	});
}



module.exports = new Extensions();