var helpers = require('./helpers');
var Logger = require('./logger');
var constants = require('./constants');
var moment = require('moment');
var colors = require('colors/safe');



var expressionProcessor = {};

expressionProcessor.evaluate = function(input, vars) {
	return evaluateImpl(input, vars);
};



module.exports = expressionProcessor;



var log = new Logger('expressionProcessor');



function evaluateImpl(input, vars) {
	if (helpers.isType(input, 'string')) {
		evaluateString(input, vars);
	} else if (helpers.isType(input, 'object')) {
		evaluateObject(input, vars);
	}
}

function evaluateObject(obj, vars) {
	for (var property in obj) {
		if (obj.hasOwnProperty(property)) {
			var propertyType = typeof(obj[property]);
			switch(propertyType){
				case 'object':
					evaluateObject(obj[property], vars);
					break;
				case 'string':
					obj[property] = evaluateString(obj[property], vars);
					break;
			}
		}
	}
}

function evaluateString(str, vars) {
	// These statements affect formatting outside of expressions. Bad.
	//str = str.replace('+',' + '); 
	//str = str.replace('-',' - '); 
	
	// These make the statements look pretty, no functional purpose. Useless?
	//str = str.replace(/\{\{/g, '{{ ');
	//str = str.replace(/\}\}/g, ' }}');
	//str = str.replace(spaceRegex, ' ');

	// Save to new variable. Manipulating str messes with looping regex.exec(str)
	var haystack = str;

	// Finds expressions, e.g. "{{ stuff + things }}"
	while ((myArray = constants.regex.expression.exec(haystack)) !== null) {
		// myArray[0] -> {{ stuff + things }}
		// myArray[1] -> stuff + things
		
		log.debug(colors.yellow('evaluateString [IN]  -> ' + str));
		// Ensure that spaces exist around operators so splitting on whitespace works
		var parts = myArray[1].replace('+',' + ').replace('-',' - ').split(/\s+/);

		// Initialize value
		var value = parts[0];
		
		// Do math
		// TODO: Determine data type of parts and do correct type of math (integer, date, function, etc.)
		// functions:
		// - dateformat($dateVar, HH:mm:ss)
		if (parts.length >= 3) {
			for (i = 1; i < parts.length - 1; i = i + 2) {
				value = dateMath(value, parts[i], parts[i + 1], vars);
			}
		} else {
			value = replaceVariable(value, vars);
		}

		if (helpers.isType(value, 'moment')) {
			value = value.format(constants.strings.isoDateFormat);
		}
		
		var subStart = str.indexOf(myArray[0]);
		var subLength = myArray[0].length;
		str = str.substr(0, subStart) + value + str.substr(subStart + subLength);

		log.debug('evaluateString [OUT] -> ' + str);

		console.log('');
	}

	return str;
}

function dateMath(input, operator, value, vars) {
	var parsedInput;
	var parsedValue;

	if (typeof(input) == 'string')
		parsedInput = getMoment(replaceVariable(input, vars));
	else
		parsedInput = getMoment(input);

	if (helpers.isType(value, 'String') && value.startsWith('$'))
		parsedValue = getMoment(replaceVariable(value, vars));
	else
		parsedValue = getMoment(value);

	switch(operator) {
		case '+': {
			return parsedInput.add(parsedValue);
		}
		case '-': {
			return parsedInput.subtract(parsedValue);
		}
	}
}

function getMoment(input) {
	if (helpers.isType(input, 'String')) {
		try {
			var result = constants.regex.isoDateTime.exec(input);
			if (result !== null) {
				return moment(input);
			}
		} catch(e) {
			log.info(('Not a moment: ' + input).error);
			log.info(e.stack.error);
		}
		try {
			var result = constants.regex.isoDuration.exec(input);
			if (result !== null) {
				return moment.duration(input);
			}
		} catch(e) {
			log.info(('Not a duration: ' + input).error);
			log.info(e.stack.error);
		}
	}
	else if (helpers.isType(input, 'Date')) {
		return moment(input);
	}
	else if (helpers.isType(input, 'Moment')) {
		return input;
	}

	log.warning('Unknown input: ' + input);
	return input;
}

function replaceVariable(input, vars) {
	if (input.startsWith('$'))
		input = input.substr(1);
	if (hasOwnProperty.call(vars, input)) {
		return vars[input];
	} else {
		return input;
	}
}