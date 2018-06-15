// Force working directory to be where this script resides
// The purpose of this is for relative paths loaded in configs to be relative to the script, not where it was invoked from
process.chdir(__dirname);

const CronJob = require('cron').CronJob;
const _ = require('lodash');
const Logger = require('lognext');

const config = require('./config');
const packageData = require('./package.json');
const executor = require('./executor');



var log = new Logger('main');



log.writeBox('Open Data Exporter v' + packageData.version, null, 'cyan');



executor.initialize()
	.then(function() {
		// Use jobs from command line args or all jobs in config file
		var jobs = config.args.jobs ? config.args.jobs.split(',') : Object.keys(config.settings.jobs);

		// Manually execute jobs?
		if (config.args.runnow === true) {
			log.info('/runnow flag was used, commencing single execution of jobs...');
			return executor.executeJobs(config.args.jobs.split(','));
		}

		// Set up cron jobs
		_.forEach(jobs, function(job) {
			try {
				var jobObject = config.settings.jobs[job];

				log.verbose('Running "' + jobObject.name + '" at interval "' + jobObject.cron + '"');
				new CronJob(jobObject.cron, function() {
					executor.executeJob(JSON.parse(JSON.stringify(jobObject)));
				}, null, true);
			} catch(ex) {
				console.log('cron pattern not valid');
			}
		});
	})
	.catch(function(error) {
		log.error(error.stack);
	});