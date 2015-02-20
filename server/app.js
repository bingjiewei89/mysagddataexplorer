/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var clusterfck = require("clusterfck");
var methodOverride = require('method-override');

var pg = require('pg');
var conString = "postgres://postgres:admin123@localhost/dbpetroleum";

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
//app.set('views', path.join(__dirname, 'views'));
app.set('views', '../app');
app.engine('html', require('ejs').renderFile);
//app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/bower_components', express.static(__dirname + '/../app/bower_components'));
app.use('/styles', express.static(__dirname + '/../app/styles'));
app.use('/resources', express.static(__dirname + '/../app/resources'));
app.use('/scripts', express.static(__dirname + '/../app/scripts'));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(req, res) {
	res.render('index.html');
});

app.get('/getAllWells', function(req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	
	pg.connect(conString, function(err, client, done) {
		if(err) {
			return console.error('error fetching client from pool', err);
		}

		client.query("SELECT * FROM wells", function(err, result) {
			//call `done()` to release the client back to the pool
			done();

			if(err) {
				return console.error('error running query', err);
			}

			res.send(result.rows);
		});
	});
});

app.get('/getInfoFromWell/:uwi', function(req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	
	pg.connect(conString, function(err, client, done) {
		if(err) {
			return console.error('error fetching client from pool', err);
		}
		
		var dbuwi = req.params.uwi;
		
		client.query("SELECT * FROM wells WHERE w_uwi = '" + dbuwi + "'", function(err, result) {
			//call `done()` to release the client back to the pool
			done();

			if(err) {
				return console.error('error running query', err);
			}

			res.send(result.rows);
		});
	});
});

app.get('/getPairOfWell/:uwi', function(req, res) {
	res.header("Access-Control-Allow-Origin", "*");

	pg.connect(conString, function(err, client, done) {
		if(err) {
			return console.error('error fetching client from pool', err);
		}

		var dbuwi = req.params.uwi;
		var query = "SELECT wells.* FROM wells INNER JOIN (SELECT w_id, w_pad, w_number_in_pad, w_type FROM wells WHERE w_uwi = '" + dbuwi + "') AS base ON (wells.w_id <> base.w_id AND wells.w_pad = base.w_pad AND wells.w_number_in_pad = base.w_number_in_pad)";

		client.query(query, function(err, result) {
			//call `done()` to release the client back to the pool
			done();

			if(err) {
				return console.error('error running query', err);
			}

			res.send(result.rows);
		});
	});
});

app.get('/getStatusInfoFromWell/:uwi', function(req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	
	pg.connect(conString, function(err, client, done) {
		if(err) {
			return console.error('error fetching client from pool', err);
		}
		
		var dbuwi = req.params.uwi;
		var query = "SELECT s_status, s_date FROM STATUS WHERE status.w_id in (SELECT w_id FROM wells WHERE w_uwi = '" + dbuwi + "') order by s_date";
		client.query(query, function(err, result) {
			//call `done()` to release the client back to the pool
			done();

			if(err) {
				return console.error('error running query', err);
			}
			res.send(result.rows);
		});
	});
});

app.get('/getAllDistinctStatuses', function(req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	
	pg.connect(conString, function(err, client, done) {
		if(err) {
			return console.error('error fetching client from pool', err);
		}
		
		client.query("SELECT distinct(s_status) FROM STATUS order by s_status", function(err, result) {
			//call `done()` to release the client back to the pool
			done();

			if(err) {
				return console.error('error running query', err);
			}
			res.send(result.rows);
		});
	});
});

app.get('/getInjectionInfoFromWell/:uwi', function(req, res) {
	res.header("Access-Control-Allow-Origin", "*");

	pg.connect(conString, function(err, client, done) {
		if(err) {
			return console.error('error fetching client from pool', err);
		}

		var dbuwi = req.params.uwi;

		var query = "SELECT i_month, i_year, i_prod_type, i_value FROM injection WHERE injection.w_id IN (SELECT w_id FROM wells WHERE w_uwi = '" + dbuwi + "') ORDER BY i_year, i_month;";

		client.query(query, function(err, result) {
			//call `done()` to release the client back to the pool
			done();

			if(err) {
				return console.error('error running query', err);
			}
			res.send(result.rows);
		});
	});
});

app.get('/getProductionInfoFromWell/:uwi', function(req, res) {
	res.header("Access-Control-Allow-Origin", "*");

	pg.connect(conString, function(err, client, done) {
		if(err) {
			return console.error('error fetching client from pool', err);
		}

		var dbuwi = req.params.uwi;

		var query = "SELECT * FROM production WHERE production.w_id IN (SELECT w_id FROM wells WHERE w_uwi = '" + dbuwi + "') ORDER BY p_year, p_month;";

		client.query(query, function(err, result) {
			//call `done()` to release the client back to the pool
			done();

			if(err) {
				return console.error('error running query', err);
			}
			res.send(result.rows);
		});
	});
});

app.get('/getAllWellsWithAverageStatistics', function(req, res) {
	res.header("Access-Control-Allow-Origin", "*");

	pg.connect(conString, function(err, client, done) {
		if(err) {
			return console.error('error fetching client from pool', err);
		}

		var query = "SELECT wells.*, st_avg_injection_hour, st_avg_injection_steam, st_avg_production_oil, st_avg_sor FROM wells LEFT JOIN statistics ON (wells.w_id = statistics.st_injector_w_id OR wells.w_id = statistics.st_producer_w_id) order by w_id asc" ;

		client.query(query, function(err, result) {
			//call `done()` to release the client back to the pool
			done();

			if(err) {
				return console.error('error running query', err);
			}

			res.send(result.rows);
		});
	});
});

app.get('/applyKmeansToWells/:params', function(req, res) {
	res.header("Access-Control-Allow-Origin", "*");

	var params = req.params.params;

	var tempParams = params.split("&");
	var fields = tempParams[0].split(",");
	var clusterNumber = tempParams[1];
	var uwis = tempParams[2];
	uwis = uwis.split(",");

	// The UWIs are in the same order as the client (we must save the index to increase client performance)
	var cleanUWIs = [];
	for(var i=0; i<uwis.length; i++) {
		cleanUWIs.push({ index: i, uwi:uwis[i] });
	}

	cleanUWIs.sort(function(a, b) {
		return sortAlphabetically(a["uwi"], b["uwi"]);
	});

	uwis.sort(function(a, b) {
		return sortAlphabetically(a, b);
	});

	for(var i=0; i<uwis.length; i++) {
		uwis[i] = "'" + uwis[i] + "'";
	}
	uwis = uwis.join();

	pg.connect(conString, function(err, client, done) {
		if(err) {
			return console.error('error fetching client from pool', err);
		}

		var wellQueryAttr = [];
		var statisticsQueryAttr = [];
		var otherQueryAttr = [];
		for(var i=0; i<fields.length; i++) {
			if(fields[i] === "w_location") {
				wellQueryAttr.push("w_bottom_lng");
				wellQueryAttr.push("w_bottom_lat");
				wellQueryAttr.push("w_top_lng");
				wellQueryAttr.push("w_top_lat");
			} else {
				// Fields from the 'wells' table
				if(fields[i][0] === 'w') {
					wellQueryAttr.push(fields[i]);
				} else if(fields[i].substr(0,2) === 'st') {
					// Fields from statistics table
					statisticsQueryAttr.push(fields[i]);
				} else {
					// Fields from other table (not being used for now)
					otherQueryAttr.push(fields[i]);
				}
			}
		}
		var wellQueryAttrString = wellQueryAttr.join();
		var statisticsQueryAttrString = statisticsQueryAttr.join();
		var otherQueryAttrString = otherQueryAttr.join();

		var separator = wellQueryAttrString.length > 0 && statisticsQueryAttrString.length > 0 ? "," : "";
		//console.log(statisticsQueryAttrString);

		var query = "SELECT w_uwi," + wellQueryAttrString + separator + statisticsQueryAttrString + " FROM wells LEFT JOIN statistics ON (wells.w_id = statistics.st_injector_w_id OR wells.w_id = statistics.st_producer_w_id) WHERE w_uwi in (" + uwis + ") order by w_uwi" ;
		//var query = "SELECT w_uwi," + wellQueryAttrString + " FROM wells WHERE w_uwi in (" + uwis + ") order by w_uwi";

		//console.log(query);

		client.query(query, function(err, result) {
			//call `done()` to release the client back to the pool
			done();

			if(err) {
				return console.error('error running query', err);
			}

			var rows = result.rows;
			var formattedRows = [];
			for(var i=0; i<rows.length; i++) {
				var temp = [];

				for(var j=0; j<wellQueryAttr.length; j++) {
					temp.push(rows[i][wellQueryAttr[j]]);
				}

				for(var j=0; j<statisticsQueryAttr.length; j++) {
					var aux = rows[i][statisticsQueryAttr[j]] === null ? getRandomArbitrary(-9999, -999) : rows[i][statisticsQueryAttr[j]];
					temp.push(aux);
				}

				//for(var j=0; j<otherQueryAttr.length; j++) {
//					temp.push(rows[i][otherQueryAttr[j]]);
//				}

				formattedRows.push(temp);
				formattedRows[i].uwi = rows[i]["w_uwi"];
				if(formattedRows[i].uwi === cleanUWIs[i]["uwi"]) {
					formattedRows[i].index = cleanUWIs[i]["index"];
				}
			}

			// Execute the k-means clustering
			var clusters = clusterfck.kmeans(formattedRows, clusterNumber);

			// Safety net for the clustering result
			while(checkClusters(clusters, clusterNumber) === false) {
				clusters = clusterfck.kmeans(formattedRows, clusterNumber);
			}

			// Setting the index to the result array
			var resultValues = [];

			for(var i=0; i<clusters.length; i++) {
				var tempCluster = [];

				for(var j=0; j<clusters[i].length; j++) {
					tempCluster.push({ index: clusters[i][j].index, value: clusters[i][j] })
				}
				resultValues.push(tempCluster);
			}

			res.send(resultValues);
		});
	});
});

function sortAlphabetically(a, b) {
	if(a === b) {
		return 0;
	} else if(a < b) {
		return -1;
	} else {
		return 1;
	}
}

function getRandomArbitrary(min, max) {
	return Math.random() * (max - min) + min;
}

function checkClusters(clusters, clusterNumber) {
	var valid = true;

	if(clusters === undefined || clusters === null || clusters.length === 0 || clusters.length != clusterNumber) {
		valid = false;
	} else {
		for(var i=0; i<clusters.length; i++) {
			if(clusters[i] === undefined || clusters[i] === null || clusters[i].length === 0) {
				valid = false;
				break;
			}
		}
	}

	return valid;
}

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});