# Open Data Exporter

The Open Data Exporter is a configurable node.js service that executes PureCloud API requests, performs data calculations and transformations, and exports the data into templates. 

# Documentation

Full documentation is [in the reopo's wiki](https://github.com/MyPureCloud/open-data-exporter/wiki).

# TLDR;

1. Create a [config file](https://github.com/MyPureCloud/open-data-exporter/wiki/Configuration-Files), or use one of the [example config files](https://github.com/MyPureCloud/open-data-exporter/tree/master/src/examples).
2. Be sure to set the client ID, client secret, and environment in the config file, or use the [command line parameters](https://github.com/MyPureCloud/open-data-exporter/wiki/Running-the-application) to pass the ID and secret in at runtime.
3. Execute jobs: `node index.js /clientId=$PURECLOUD_CLIENT_ID /clientSecret=$PURECLOUD_CLIENT_SECRET /config=./examples/abandon_report/config.json /jobs=abandons_job /runnow`

# Features

* Robust templating support powered by [doT](http://olado.github.io/doT/)
* Make PureCloud Platform API requests without writing any code
* All post-processing data calculations are fully configurable and programmable
* Ability to execute multiple queries and multiple transformations and use the resulting data in one or more templates
* Write output to dynamically determined locations and files

## Included Configurations

Configuration files can be found in [src/examples](https://github.com/MyPureCloud/open-data-exporter/tree/master/src/examples).

* abandon_report
  * Abandon Report - Produces a flat text file with a list of calls abandoned in queue
* call_detail_report
  * Call Detail Report - Produces a HTML file with a list of ACD calls occurring within the interval
* presence_report
  * Presence Report - Produces a HTML file with presence and routing status events per user for all users in the org
* verint
  * Verint Agent Scorecard Report - Produces a flat text file with agent scorecard data in the standard Verint format
