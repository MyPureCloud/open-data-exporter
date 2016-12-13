var moment = require('moment');



function Examples() {
	// Do stuff in constructor
}

/**
 * Counts the conversations from a conversation detail query
 * @module  TemplateDefinitions
 * @instance
 * @function countConversations
 * @param {Object} data - The data from a conversation detail query
 *
 * @return {int} The count of the conversations in the dataset
 */
Examples.prototype.countConversations = function(data) {
	return data.conversations.length;
};

/**
 * Counts the sessions and segments for each participant and adds the "sessionCount" property to the participant and the "segmentCount" property to each segment
 * @module  TemplateDefinitions
 * @instance
 * @function countSegments
 * @param {Object} data - The data from a conversation detail query
 */
Examples.prototype.countSegments = function(data) {
	_.forOwn(data.conversations, function(conversation) {
		_.forOwn(conversation.participants, function(participant, key) {
			participant.sessionCount = participant.sessions.length;
			_.forOwn(participant.sessions, function(session, key) {
				session.segmentCount = session.segments.length;
			});
		});
	});
};

/**
 * Assigns conversation.customerParticipant, conversation.customerParticipant.ani, and conversation.queue for each conversation
 * @module  TemplateDefinitions
 * @instance
 * @function setCustomerParticipants
 * @param {Object} data - The data from a conversation detail query
 */
Examples.prototype.setCustomerParticipants = function(data) {
	_.forOwn(data.conversations, function(conversation) {
		_.forOwn(conversation.participants, function(participant) {
			if (participant.purpose == 'customer') {
				conversation.customerParticipant = participant;
				_.forOwn(conversation.customerParticipant.sessions, function(session) {
					if (session.ani)
						conversation.customerParticipant.ani = session.ani;
				});
			} else if (participant.purpose == 'acd') {
				conversation.queue = participant;
			}
		});
	});
};

module.exports = new Examples();