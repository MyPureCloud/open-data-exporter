const _ = require('lodash');
const colors = require('colors/safe');



function Config() {
	// Parse command line args
	this.args = getNodeArgs();

	// Load config file
	if (!this.args.config)
		this.args.config = './config.json';
	console.log(colors.dim('loading config from ' + this.args.config));
	this.settings = require(this.args.config);

	// Override client ID and secret with command line values
	if (this.args.clientid)
		this.settings.pureCloud.clientId = this.args.clientid;
	if (this.args.clientsecret)
		this.settings.pureCloud.clientSecret = this.args.clientsecret;
}



module.exports = new Config();



function setCustomData(obj, customData) {
	if (customData === null) return;

	_.forOwn(customData, function(value, key) {
		obj[key] = value;
	});
}

function getNodeArgs() {
	let args = {};

	// Parse into pretty object
	for (let i = 2; i < process.argv.length; i++) {
		let arg = process.argv[i];
		let index = arg.indexOf('=');

		if (index > 0) {
			// format was key=value
			let key = arg.substr(0,index);
			let value = arg.substr(index + 1);

			// Remove leading slash and dash
			if (key.startsWith('/'))
				key = key.substr(1);
			if (key.startsWith('--'))
				key = key.substr(2);

			// Use boolean type or literal string value
			if (value.toLowerCase() == 'true') {
				args[key.toLowerCase()] = true;
			} else if (value.toLowerCase() == 'false') {
				args[key.toLowerCase()] = false;
			} else {
				args[key.toLowerCase()] = value;
			}
		} else {
			// No equals sign, set whole thing as key and value->true
			
			// Remove leading slash and dash
			if (arg.startsWith('/'))
				arg = arg.substr(1);
			if (arg.startsWith('--'))
				arg = arg.substr(2);

			args[arg.toLowerCase()] = true;
		}
	}
	return args;
}