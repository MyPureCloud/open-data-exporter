



function Helpers() {
	
}

Helpers.prototype.isType = function(obj, type) { 
	if (obj === null) return false;

	var funcNameRegex = /function (.{1,})\(/;
	var results = (funcNameRegex).exec((obj).constructor.toString());
	var objType = (results && results.length > 1) ? results[1] : "";
	var isEqual = objType.toLowerCase() == type.toLowerCase();
	return isEqual;
};



module.exports = new Helpers();