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



module.exports = new CDR();