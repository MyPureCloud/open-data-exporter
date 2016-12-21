# Open Data Exporter

The Open Data Exporter is a configurable node.js service that executes PureCloud API requests, performs data calculations and transformations, and exports the data into templates. 

# Documentation

Full documentation is [in the reopo's wiki](https://github.com/MyPureCloud/open-data-exporter/wiki).

# TLDR;

1. Create a [config file](https://github.com/MyPureCloud/open-data-exporter/wiki/Configuration-Files), or use one of the [example config files](https://github.com/MyPureCloud/open-data-exporter/tree/master/src/config/examples).
2. Execute jobs: `node index.js /config=config/examples/abandon_report.json /jobs=abandon_report`

# Planned features

* Scheduling with cron
