var _ = require('lodash');



function CDR() {

}

CDR.prototype.addSegmentsToParticipant = function(data) {
	_.forEach(data.conversations, function(conversation) {
		_.forEach(conversation.participants, function(participant) {
			if (!participant.participantName)
				participant.participantName = 'No Name';

			participant.ani = participant.sessions[0].ani ? participant.sessions[0].ani : 'unknown';
			participant.dnis = participant.sessions[0].dnis ? participant.sessions[0].dnis : 'unknown';
			participant.direction = participant.sessions[0].direction ? participant.sessions[0].direction : 'unknown';
		});
	});
};

CDR.prototype.countArray = function(arr) {
	return arr.length;
};

CDR.prototype.coalesceConversationIds = function(data) {
	var conversationIds = [];
	_.forEach(data.conversations, function(conversation) {
		conversationIds.push(conversation.conversationId);
	});
	return conversationIds;
};

CDR.prototype.aggregateParticipantAttributes = function(data) {
	// Iterate conversations
	_.forEach(data.cdr_request.conversations, function(conversation) {
		// Get conversation w/participant data
		var c2 = data.cdr_conversation_details_request[conversation.conversationId];

		// Iterate participants
		_.forEach(conversation.participants, function(participant) {
			// Find participant and set data
			_.forEach(c2.participants, function(p2) {
				// Note: the analytics and conversation models have slight differences. 
				// One example is a participant's GUID being stored as "id" vs. "participantId"
				if (participant.participantId == p2.id) {
					participant.attributes = p2.attributes;

					// Stop this loop
					return false;
				}
			});
		});
	});
};

CDR.prototype.ensureAttributes = function(data) {
	_.forEach(data.conversations, function(conversation) {
		_.forEach(conversation.participants, function(participant) {
			if (!participant.attributes)
				participant.attributes = {};

			// Ensure certain attributes are initialized
			if (!participant.attributes.accountNumber)
				participant.attributes.accountNumber = '';
		});
	});
};



module.exports = new CDR();