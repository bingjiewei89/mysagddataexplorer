
/*--------------------------------------------------------------------------------
 Author: Bingjie Wei

 petroleum-explorer

 =============================================================================
 Filename: classification-controller.js
 =============================================================================
 Controller class of the classification module.
 -------------------------------------------------------------------------------*/

(function () {
	var wellsWithStatistics = [];
	var categories = [];
	var ClassificationController;
	var self;

	// The "constructor" of ClassificationController. When this object is created, this code is executed.
	ClassificationController = function (MapController, allWellsWithStatistics){
		this.MapController = MapController;
		self = this;

		// Get the wells with average statistics
		wellsWithStatistics = allWellsWithStatistics;
	};

	// Classify the wells by category
	ClassificationController.prototype.classifyWellsByCategory = function(selectedValue, legendName){
		categories = [];
		var wells = self.MapController.getCurrentWells();

		for(var i = 0; i < wells.length; i++){
			var inserted = false;
			for(var j =0; j < categories.length; j++){
				if (categories[j]["category"] === wells[i][selectedValue]){
					categories[j]["indexes"].push(i);
					inserted = true;
					break;
				}
			}
			if (inserted === false){
				categories.push({category:wells[i][selectedValue],indexes:[i]});
			}
		}

		self.MapController.createClassifiedMarkers(categories);
		var headers = ["Categorical Classification"];
		self.MapController.addClassificationLegend(self.getClassificationLegend(categories), legendName, headers);
	};

	/*
	 * Classify the wells by numerical values (intervals)
	 * It can be done by using different methods:
	 *   - Equal (all the classes are divided in equal intervals)
	 *   - Quantile (each class contains the same number of wells)
	 */
	ClassificationController.prototype.classifyWellsByNumericalValues = function(selectedField, classNumber, legendName, method) {
		var currentWellsWithStatistics = [];
		var wells = self.MapController.getCurrentWells();

		for(var i=0; i<wells.length; i++) {
			currentWellsWithStatistics.push(wellsWithStatistics[wells[i]["w_id"] - 1]);
		}

		// Clear the categories
		categories = [];
		// Execute the selected classification method
		if(method === 'equal') {
			categories = classifyEqualInterval(selectedField, classNumber, currentWellsWithStatistics);
		} else if(method === 'quantile') {
			categories = classifyQuantile(selectedField, classNumber, currentWellsWithStatistics);
		}

		self.MapController.createClassifiedMarkers(categories);
		var headers = ["Numerical Classification", getNumericalClassificationMethod(method)];
		self.MapController.addClassificationLegend(self.getClassificationLegend(categories), legendName, headers);
	};

	// Gets the entire name of the method applied in the numerical classification
	function getNumericalClassificationMethod(method) {
		var result = "";
		if(method != undefined && method != null && method.length > 0) {
			if(method === 'equal') {
				result = "Equal Interval";
			} else if(method === 'quantile') {
				result = "Quantile";
			}
		}
		return result;
	}

	// Classify the wells by defining equal intervals
	function classifyEqualInterval(selectedField, classNumber, wells) {
		var result = [];
		var numericalValues = [];
		var hasNullValues = false;

		// Stores all the values of the selected field
		for(var i = 0; i < wells.length; i++) {
			if(wells[i][selectedField] != null ) {
				numericalValues.push(wells[i][selectedField]);
			} else {
				hasNullValues = true;
			}
		}

		// Get the minimum and maximum value
		var min = Math.min.apply(Math, numericalValues);
		var max = Math.max.apply(Math, numericalValues);
		var equalInterval = (max - min)/classNumber;

		// Create all the categories without adding the indexes
		for (var i = 0; i < classNumber; i++) {
			var intervalMin = min + i*equalInterval;
			var intervalMax = min + (i+1)*equalInterval;
			result.push(
				{
					intervalMinimum: intervalMin,
					intervalMaximum: intervalMax,
					category:intervalMin.toFixed(2)+" - "+intervalMax.toFixed(2),
					indexes:[]
				});
		}

		// Adds the wells that do not contain values for the specified field
		if(hasNullValues === true) {
			result.push(
				{
					intervalMinimum: null,
					intervalMaximum: null,
					category: "Invalid",
					indexes:[]
				});
		}

		// Finds the right category for each well and adds its index to the indexes list
		for (var i = 0; i < wells.length; i++) {
			for (var j=0; j < result.length; j++) {
				if(wells[i][selectedField] != null && result[j]["category"] != "Invalid") {
					if ((wells[i][selectedField] >= result[j]["intervalMinimum"] && wells[i][selectedField] < result[j]["intervalMaximum"])|| wells[i][selectedField] === result[j]["intervalMaximum"]){
						result[j]["indexes"].push(i);
						break;
					}
				} else if(wells[i][selectedField] === null && result[j]["category"] === "Invalid") {
					result[j]["indexes"].push(i);
					break;
				}
			}
		}

		return result;
	}

	// Classify the wells by grouping the same number of wells for each class
	function classifyQuantile(selectedField, classNumber, wells) {
		var result = [];
		var validWells = [];
		var invalidWells = [];

		// Separating the wells with and without valid values
		for(var i=0; i<wells.length; i++) {
			if(wells[i][selectedField] != null) {
				validWells.push({ well: wells[i], index: i });
			} else {
				invalidWells.push(i);
			}
		}

		var totalWells = validWells.length;
		var intervalSize = Math.ceil(totalWells / classNumber);
		var tempCategories = [];

		// Storing the selected field values and well index for all the valid wells
		var values = [];
		for(var i = 0; i<totalWells; i++) {
			values.push({ value: validWells[i]["well"][selectedField], index: validWells[i]["index"] });
		}
		// Sorting the wells based on the selected field values
		values.sort(function(a, b) { return a.value - b.value; });

		// Creating the right number of categories
		for(var i=0; i<classNumber; i++) {
			result.push(
				{
					intervalMinimum: -1,
					intervalMaximum: -1,
					category: '',
					indexes:[]
				});
			tempCategories.push([]);
		}

		// Filling the categories with an even number of wells
		for(var i = 0; i<totalWells; i++) {
			result[Math.floor(i/intervalSize)]["indexes"].push(values[i]["index"]);
			tempCategories[Math.floor(i/intervalSize)].push(wells[values[i]["index"]][selectedField]);
		}

		// Filling the rest of information for each category
		for(var i=0; i<classNumber; i++) {
			var min = Math.min.apply(Math, tempCategories[i]);
			result[i]["intervalMinimum"] = min;

			if(i > 0) {
				// Filling the max and category values of the previous category
				result[i-1]["intervalMaximum"] = min;
				result[i-1]["category"] = result[i-1]["intervalMinimum"].toFixed(2) + " - " + min.toFixed(2);
			}

			if(i === tempCategories.length - 1) {
				// The last category needs to consider its own max value
				var max = Math.max.apply(Math, tempCategories[i]);

				result[i]["intervalMaximum"] = max;
				result[i]["category"] = min.toFixed(2) + " - " + max.toFixed(2);
			}
		}

		// Sorting the indexes of each category
		for(var i=0; i<result.length; i++) {
			result[i]["indexes"].sort(function(a, b) { return a - b; });
		}

		// Adding the invalid wells
		if(invalidWells.length > 0) {
			result.push({
				intervalMinimum: null,
				intervalMaximum: null,
				category: "Invalid",
				indexes: invalidWells
			});
		}

		return result;
	}

	// Applies k-means to the selected attributes
	ClassificationController.prototype.clusterKMeans = function(attributesValues, clusterNumber) {
		var wells = self.MapController.getCurrentWells();

		// Creating a string with all the UWIs separated by commas
		var uwis = '';
		for(var i=0; i<wells.length; i++) {
			uwis += (i === wells.length - 1) ? (wells[i]["w_uwi"]) : (wells[i]["w_uwi"]) + ",";
		}

		// Creating a list with all the attributes values
		var attributes = [];
		for(var i=0; i<attributesValues.length; i++) {
			attributes.push(attributesValues[i].value);
		}
		attributes = attributes.join();

		// Encoding both parameters separated by '&' (to replace some invalid characters that cannot be used in URLs)
		var encodedParams = encodeURIComponent(attributes + "&" + clusterNumber + "&" + uwis);

		// Send parameters to the server for the application of k-means and waits until the server sends an answer
		var result = [];
		$.ajax({
			url: '/applyKmeansToWells/' + encodedParams,
			dataType:'json',
			async: false,
			success: function(data) {
				result = data;
			}
		});

		// Clearing the previous categories
		categories = [];

		// Creating all the different categories (clusters)
		for(var i=0; i<result.length; i++) {
			categories.push( {
				intervalMinimum: -1,
				intervalMaximum: -1,
				category: 'Cluster ' + (i+1),
				indexes:[]
			});
			for(var j=0; j<result[i].length; j++) {
				categories[i]["indexes"].push(result[i][j]["index"]);
			}
		}

		// Sorting the indexes of each category
		for(var i=0; i<categories.length; i++) {
			categories[i]["indexes"].sort(function(a, b) { return a - b; });
		}

		self.MapController.createClassifiedMarkers(categories);

		var headers = ["K-means Clustering"];
		var tempName = [];
		for(var i=0; i<attributesValues.length; i++) {
			tempName.push(attributesValues[i].name);
		}
		headers.push(tempName.join(", "));
		self.MapController.addClassificationLegend(self.getClassificationLegend(categories), null, headers);
	};

	// Lower the opacity of the wells which do not match the clicked category
	ClassificationController.prototype.emphasizeMarkersOfCategory = function(legendIndex) {
		// Getting all the indexes of the category clicked
		var markersIndexes = categories[legendIndex]["indexes"];
		// Point out markers in the map
		self.MapController.emphasizeMarkers(markersIndexes);
	};

	// Gets the classification legends values
	ClassificationController.prototype.getClassificationLegend = function(classificationList) {
		var legendColors = self.MapController.getPinColors();
		var legends = [];

		for (var i=0; i < classificationList.length; i++){
			var auxColor = classificationList[i]["category"] === "Invalid" ? "black": legendColors[i];
			var auxCategory = classificationList[i]["category"] === "N" ? "Not defined" : classificationList[i]["category"];
			legends.push({
				category: auxCategory,
				indexesCount:classificationList[i]["indexes"].length,
				color: auxColor
			});
		}
		return legends;
	};

	// Reset the pins on the map
	ClassificationController.prototype.resetPins = function() {
		self.MapController.resetPins();
	};

	/*
	 * Adds hardcoded rules of ARM
	 */
	ClassificationController.prototype.addAssociationRules = function(){
		var rule1 = {
			ifthen: [47,49,67,69,73,75,144,145,154,155,156,157,158,159,160,161,164,165,166,167,168,169,170,171,172,173,174,175,252,253,254,255,258,259,262,263],
			if: [178,179,181,182],
			none: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,48,53,56,59,62,65,68,71,74,80,114,119,122,125,128,131,134,137,140,151,153,180,189,212,213,50,51,52,54,55,57,58,60,61,63,64,66,70,72,76,77,78,79,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,115,116,117,118,120,121,123,124,126,127,129,130,132,133,135,136,138,139,141,142,143,146,147,148,149,150,300,152,301,162,163,176,177,183,184,185,186,187,188,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,256,257,260,261,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292,293,294,295,296,297,298,299]
		};

		var rule2 = {
			ifthen: [76,77,78,79,81,82,91,92,99,100,103,104,105,106,111,112,139,141,146,147,150,300,210,211,226,227,228,229,230,231,234,235,280,281,282,283],
			if: [136,138,152,301,256,257],
			none: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,48,53,56,59,62,65,68,71,74,80,114,119,122,125,128,131,134,137,140,151,153,180,189,212,213,47,49,50,51,52,54,55,57,58,60,61,63,64,66,67,69,70,72,73,75,83,84,85,86,87,88,89,90,93,94,95,96,97,98,101,102,107,108,109,110,113,115,116,117,118,120,121,123,124,126,127,129,130,132,133,135,142,143,144,145,148,149,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,181,182,183,184,185,186,187,188,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,214,215,216,217,218,219,220,221,222,223,224,225,232,233,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,284,285,286,287,288,289,290,291,292,293,294,295,296,297,298,299]
		};

		var rule3 = {
			ifthen: [76,77,78,79,81,82,83,84,85,86,89,90,91,92,93,94,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,139,141,146,147,148,149,176,177,185,186,187,188,202,203,214,215,216,217,220,221,222,223,224,225,226,227,230,231,232,233,234,235,236,237,238,239,240,241,250,251,266,267,268,269,270,271,272,273,274,275,278,279,280,281,292,293,294,295,296,297,298,299],
			if: [183,184,196,197,198,199,200,201,204,205,218,219,242,243,288,289],
			none: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,48,53,56,59,62,65,68,71,74,80,114,119,122,125,128,131,134,137,140,151,153,180,189,212,213,47,49,50,51,52,54,55,57,58,60,61,63,64,66,67,69,70,72,73,75,87,88,95,96,113,115,116,117,118,120,121,123,124,126,127,129,130,132,133,135,136,138,142,143,144,145,150,300,152,301,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,178,179,181,182,190,191,192,193,194,195,206,207,208,209,210,211,228,229,244,245,246,247,248,249,252,253,254,255,256,257,258,259,260,261,262,263,264,265,276,277,282,283,284,285,286,287,290,291]
		};

		var rule4 = {
			ifthen: [83,84,85,86,93,94,97,98,101,102,107,108,109,110,185,186,202,203,214,215,216,217,220,221,222,223,224,225,266,267,268,269,270,271,292,293,298,299],
			if: [198,199,200,201,218,219,242,243],
			none: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,48,53,56,59,62,65,68,71,74,80,114,119,122,125,128,131,134,137,140,151,153,180,189,212,213,47,49,50,51,52,54,55,57,58,60,61,63,64,66,67,69,70,72,73,75,76,77,78,79,81,82,87,88,89,90,91,92,95,96,99,100,103,104,105,106,111,112,113,115,116,117,118,120,121,123,124,126,127,129,130,132,133,135,136,138,139,141,142,143,144,145,146,147,148,149,150,300,152,301,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,181,182,183,184,187,188,190,191,192,193,194,195,196,197,204,205,206,207,208,209,210,211,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,272,273,274,275,276,277,278,279,280,281,282,283,284,285,286,287,288,289,290,291,294,295,296,297]
		};

		var rule5 = {
			ifthen: [47,49,50,51,52,54,67,69,70,72,73,75,124,126,127,129,144,145,154,155,156,157,158,159,160,161,164,165,166,167,168,169,170,171,172,173,174,175,208,209,252,253,254,255,258,259,262,263],
			if: [118,120,133,135,178,179,181,182,192,193,290,291],
			none: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,48,53,56,59,62,65,68,71,74,80,114,119,122,125,128,131,134,137,140,151,153,180,189,212,213,55,57,58,60,61,63,64,66,76,77,78,79,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,115,116,117,121,123,130,132,136,138,139,141,142,143,146,147,148,149,150,300,152,301,162,163,176,177,183,184,185,186,187,188,190,191,194,195,196,197,198,199,200,201,202,203,204,205,206,207,210,211,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,256,257,260,261,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,280,281,282,283,284,285,286,287,288,289,292,293,294,295,296,297,298,299]
		};

		var rules = [rule1, rule2, rule3, rule4, rule5];

		for(var i=0; i<rules.length; i++) {
			var ruleCategories = ["ifthen", "if", "none"];
			for(var j=0; j<ruleCategories.length; j++) {
				for(var k=0; k<rules[i][ruleCategories[j]].length; k++) {
					rules[i][ruleCategories[j]][k]--;
				}
				rules[i][ruleCategories[j]].sort(function(a,b) {
					return a-b;
				});
			}
		}

		self.MapController.addAssociationRules(rules);
	};

	// Removes the ARM rules
	ClassificationController.prototype.removeAssociationRules = function() {
		self.MapController.removeAssociationRules();
	};

	(typeof exports !== "undefined" && exports !== null ? exports : window).ClassificationController = ClassificationController;
}).call(this);