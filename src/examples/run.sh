#!/usr/local/Cellar/bash/4.4.5/bin/bash

if [ "$1" == "all" ]; then
	node ../index.js /clientId=$CLIENT_ID /clientSecret=$CLIENT_SECRET /config=./examples/abandon_report/config.json /jobs=abandons_job /RunNow
	node ../index.js /clientId=$CLIENT_ID /clientSecret=$CLIENT_SECRET /config=./examples/call_detail_report/config.json /jobs=cdr_job /RunNow
	node ../index.js /clientId=$CLIENT_ID /clientSecret=$CLIENT_SECRET /config=./examples/presence_report/config.json /jobs=presence_detail_job /RunNow
	node ../index.js /clientId=$CLIENT_ID /clientSecret=$CLIENT_SECRET /config=./examples/verint/config.json /jobs=verint_all /RunNow
elif [ "$1" == "abandon" ]; then
	node ../index.js /clientId=$CLIENT_ID /clientSecret=$CLIENT_SECRET /config=./examples/abandon_report/config.json /jobs=abandons_job /RunNow
elif [ "$1" == "cdr" ]; then
	node ../index.js /clientId=$CLIENT_ID /clientSecret=$CLIENT_SECRET /config=./examples/call_detail_report/config.json /jobs=cdr_job /RunNow
elif [ "$1" == "presencedetails" ]; then
	node ../index.js /clientId=$CLIENT_ID /clientSecret=$CLIENT_SECRET /config=./examples/presence_report/config.json /jobs=presence_detail_job /RunNow
elif [ "$1" == "verint" ]; then
	node ../index.js /clientId=$CLIENT_ID /clientSecret=$CLIENT_SECRET /config=./examples/verint/config.json /jobs=verint_all /RunNow
else
	echo "OPTIONS"
	echo "======="
	echo "all"
	echo "abandon"
	echo "cdr"
	echo "presencedetails"
	echo "verint"
fi
