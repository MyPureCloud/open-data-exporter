const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');



function Helpers() {
	
}

Helpers.prototype.isType = function(obj, type) { 
	if (!obj) return false;

	let funcNameRegex = /function (.{1,})\(/;
	let results = (funcNameRegex).exec((obj).constructor.toString());
	let objType = (results && results.length > 1) ? results[1] : '';
	let isEqual = objType.toLowerCase() == type.toLowerCase();
	return isEqual;
};

/**
 * Writes the content to a file
 * @param {string} exportPath - The path, including filename, where the data should be written
 * @param {string} content    - The content to write
 */
Helpers.prototype.exportToFile = function(exportPath, content) {
	mkdirp.sync(path.dirname(exportPath));
	fs.writeFileSync(exportPath, content);
};


module.exports = new Helpers();