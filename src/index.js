var config = require('./config');
var Q = require('q');
var Mustache = require('mustache');
var moment = require('moment');
var colors = require('colors');

colors.setTheme({
	error: [ 'bgBlack', 'red' ],
	warning: [ 'bgYellow', 'black' ]
})

var isoDateTimeRegex = /\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?/;
var isoDurationRegex = /(-)?P(?:(-?[0-9,.]*)Y)?(?:(-?[0-9,.]*)M)?(?:(-?[0-9,.]*)W)?(?:(-?[0-9,.]*)D)?(?:T(?:(-?[0-9,.]*)H)?(?:(-?[0-9,.]*)M)?(?:(-?[0-9,.]*)S)?)?$/;
var varRegex = /\{\{\s*(.+?)\s*\}\}/g;
var vars = {
	'$now': '2016-10-27T14:37:12-0600',
	'$interval': 'PT15M',
	'$currentIntervalStart': '2016-10-27T14:30:00-0600',
	'$previousIntervalStart': new Date('2016-10-27T14:15:00-0600')
}


console.log('================================================='.bgBlack.cyan)

config.load();

var purecloud = require('purecloud_api_sdk_javascript');
var pureCloudSession = purecloud.PureCloudSession({
  strategy: 'client-credentials',
  clientId: config.settings.clientId,
  clientSecret: config.settings.clientSecret,
  timeout: 10000
});
//pureCloudSession.debugLog = console.log;
pureCloudSession.login().then(function() {
	var api = new purecloud.AuthorizationApi(pureCloudSession);

	api.getPermissions()
		.then(function(result){
			console.log('Congratulations, ' + result.total + ' permissions are available');
			//console.log(config.settings.queries[0].query);
			return doConversationsDetailsQuery(JSON.stringify(config.settings.queries['basic_query'].query));
		})
		.then(function(data) {
			console.log('Got data!');
			var packagedData = packageData(data);
			//console.log(packagedData);
			var output = Mustache.render(config.settings.templates['basic_template'].template, packagedData);
			console.log(output);

			console.log('Final: ' + testDateParser('The current time is {{$now}} and will be {{ $now + PT30M }} in 30 minutes.').blue);
			console.log('Final: ' + testDateParser('previous $previousIntervalStart->{{$previousIntervalStart - $interval}}').blue);
			console.log('Final: ' + testDateParser('$previousIntervalStart->{{$previousIntervalStart}}').blue);
			console.log('Final: ' + testDateParser('$currentIntervalStart->{{$currentIntervalStart}}').blue);
			console.log('Final: ' + testDateParser('Next interval->{{$currentIntervalStart + $interval}}').blue);
			console.log('Final: ' + testDateParser('complex->{{$currentIntervalStart + $interval + PT5M30S - PT2H42S + P1W}}').blue);
			
			processExpressions(config.settings.queries.expression_query);
			console.log('Query: \n' + JSON.stringify(config.settings.queries.expression_query, null, 2));

			console.log('done');
		})
		.catch(function(error) {
			console.log(error.stack.error)
		});
});

function processExpressions(object) {
	for (var property in object) {
		if (object.hasOwnProperty(property)) {
			var propertyType = typeof(object[property]);
			//console.log('typeof(object[property])->'+propertyType);
			switch(propertyType){
				case 'object':
					processExpressions(object[property]);
					break;
				case 'string':
					object[property] = testDateParser(object[property]);
					break;
			}
		}
	}
}

function testDateParser(string) {
	var haystack = string.replace('+',' + '); 

	// Finds expressions, e.g. "{{ stuff + things }}"
	while ((myArray = varRegex.exec(haystack)) !== null) {
		console.log(('haystack->'+haystack).yellow)
		// myArray[0] -> {{ stuff + things }}
		// myArray[1] -> stuff + things
		var msg = '\nFound "' + myArray[0] + '" with matches: "' + myArray[1] + '". \n';
		msg = msg.cyan;
		var parts = myArray[1].split(/\s+/);
		parts.forEach(function(part, index) {
			msg += '  ['+index+'] ' + part + '\n';
		})
		//console.log(msg);
		console.log(JSON.stringify(parts,null,2));
		var value = parts[0];
		
		if (parts.length >= 3) {
			for (i = 1; i < parts.length - 1; i = i + 2) {
				value = dateMath(value, parts[i], parts[i + 1]);
			}
			value = value.format();
		} else {
			value = replaceVariable(value);
		}

		haystack = haystack.replace(myArray[0], value);
		console.log(('haystack->'+haystack).cyan)
		console.log('')
	}

	return haystack;
}

function dateMath(input, operator, value) {
	//console.log(('dateMath('+input+', '+operator+', '+value+')').green)
	var parsedInput;
	var parsedValue;

	//console.log('input->'+input+'; type->'+typeof(input));
	if (typeof(input) == 'string')
		parsedInput = getMoment(replaceVariable(input));
	else
		parsedInput = getMoment(input)

	//console.log('value->'+value+'; type->'+typeof(value));
	if (isType(value, 'String') && value.startsWith('$'))
		parsedValue = getMoment(replaceVariable(value));
	else
		parsedValue = getMoment(value)

	switch(operator) {
		case '+': {
			//console.log('Parsed date -> ' + parsedInput.format())
			//console.log('Adding ' + parsedValue)
			return parsedInput.add(parsedValue);
			break;
		}
		case '-': {
			//console.log('Subtracting ' + parsedValue)
			//console.log('Parsed date -> ' + parsedInput.format())
			return parsedInput.subtract(parsedValue);
			break;
		}
	}
}

function getMoment(input) {
	//console.log(('input->'+input+'\n'+
	//	'  isType String->'+isType(input, 'String')+'\n'+
	//	'  isType Date->'+isType(input, 'Date')+'\n'+
	//	'  isType Moment->'+isType(input, 'Moment')+'\n').dim);
	if (isType(input, 'String')) {
		try {
			var result = isoDateTimeRegex.exec(input);
			if (result != null) {
				return moment(input);
			}
		} catch(e) {
			console.log(('Not a moment: ' + input).error)
			console.log(e.stack.error)
		}
		try {
			var result = isoDurationRegex.exec(input);
			if (result != null) {
				return moment.duration(input);
			}
		} catch(e) {
			console.log(('Not a duration: ' + input).error)
			console.log(e.stack.error)
		}
	}
	else if (isType(input, 'Date')) {
		return moment(input);
	}
	else if (isType(input, 'Moment')) {
		return input;
	}

	console.log(('Unknown input: ' + input).warning);
	return input;
}

function replaceVariable(input) {
	if (hasOwnProperty.call(vars, input)) {
		return vars[input];
	} else {
		return input;
	}
}

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

function isType(obj, type) { 
   var funcNameRegex = /function (.{1,})\(/;
   var results = (funcNameRegex).exec((obj).constructor.toString());
   var objType = (results && results.length > 1) ? results[1] : "";
   return objType == type;
};