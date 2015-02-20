/*--------------------------------------------------------------------------------
 Author: Rodrigo Silva

 petroleum-explorer

 =============================================================================
 Filename: map-canvas.js
 =============================================================================
 Contains all the logic to create, display and add wells' information on the map.
 -------------------------------------------------------------------------------*/

(function () {

	// Auxiliar reference variable
	var self;
	// Full dataSet - all wells
	var dataSet = initializeDataSet();
	// Wells that are being currently displayed - all wells in the beginning
	var currentWells = [];
	// Markers (pins) shown on the map
	var markers = [];
	var markersTop = [];
	// Path between top and bottom markers
	var deviations = [];
	// Info window that will be used to in the markers
	var infoWindow = new google.maps.InfoWindow({ maxwidth: 200 });
	// Auxiliar variable to store the highlighted markers
	var highlightedMarkers = [];
	// Auxiliar variable to store the last 'layer' checkboxes configuration
	var lastLayerCheckboxes = [true,true,true];
	// Array of classification colors
	var pinColors = ["yellow", "orange", "red", "pink", "purple", "blue", "light-blue", "turquoise", "light-green", "black"];
	// Auxiliar variable to control the pins colors
	var wellColors = [];
	// Auxiliar variable to know if the classification is used
	var usedClassification = false;

	// Create options for the map
	var mapOptions = {
		mapTypeControlOptions: {
			style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR
		}
	};

	// Define the map itself
	var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

	/*
	 * Variables to control the polygon selection
	 */
	var poly;
	var path = new google.maps.MVCArray;
	var polygonMarkers = [];

	// Linking the polygon with the map and the path among polygon markers
	poly = new google.maps.Polygon({
		strokeWeight: 2,
		fillColor: '#5555FF',
		draggable: true
	});
	poly.setMap(map);
	poly.setPaths(new google.maps.MVCArray([path]));

	// The table which links directly with the map
	var FullTableController;

	var MapCanvasController;
	MapCanvasController = function() {
		self = this;

		/* Creating the custom control on the top of the map to show statistics of total wells,
		 * the amount of them being shown and the number of highlighted markers.
		 */
		var wellsControlDiv = document.createElement('div');
		wellsControlDiv.id = "map-info-control";
		AddMapInfoControl(wellsControlDiv);
		map.controls[google.maps.ControlPosition.TOP_LEFT].push(wellsControlDiv);

		/*
		 * Creating the custom control on the top of the map to allow changing what appears on
		 * the map, bottom and top locations of wells and deviations between them.
		 * The name refers to layers, but it's only to give the right idea. The system does not
		 * uses different layers to show data.
		 */
		var layersControlDiv = document.createElement('div');
		layersControlDiv.id = "map-layers-control";
		AddMapLayerControl(layersControlDiv);
		map.controls[google.maps.ControlPosition.TOP_LEFT].push(layersControlDiv);
	};

	MapCanvasController.prototype.addClassificationLegend = function(legends, name, headers) {
		$("#classification-legend-control").remove();

		var classificationLegendDiv = document.createElement('div');
		classificationLegendDiv.id = "classification-legend-control";

		var controlUI = document.createElement('div');
		controlUI.id = "classification-legend-controlUI";
		classificationLegendDiv.appendChild(controlUI);

		var controlContent = document.createElement('div');
		controlContent.id = "classification-legend-content";
		controlUI.appendChild(controlContent);

		var append = "<button title=\"Collapse legend\" id=\"toggle-legend\" class=\"icon-arrow-down3\"></button>";

		append += "<div id=\"classification-legend\">";

		if(headers != undefined && headers != null) {
			for(var i=0; i<headers.length; i++) {
				append += "<label class=\"legend-header\">";
				if(i === 0) {
					append += "<b><i>"+headers[i]+"</i></b>";
				} else {
					append += "<i>"+headers[i]+"</i>";
				}
				append += "</label><br>";
			}
		}

		if(name != undefined && name != null && name.length > 0) {
			append += "<label class=\"legend-header\">"+name+"</label>";
		}

		append += "<table id =\"legend-table\">";

		for(var i=0; i < legends.length; i++){
			var category = legends[i]["category"][0] + legends[i]["category"].substr(1).toLowerCase();
			append += '<tr>';
			append += '<td id = \"pin-column\">';
			append += '<input type=\"image\" src=\"./resources/'+legends[i]["color"]+'-pin-smaller.png\" id=\"legend-pin-' + i + '\" class=\"legend-pin\">';
			append += '</td>';
			append += '<td>';

			// Cross out legend if category has no wells in this category
			category = legends[i]["indexesCount"] === 0 ? "<del>"+category+"</del>" : category;

			append += '<label class = \"legend\">'+category+'</label>';
			append += '</td>';
			append += '</tr>';
		}
		append += "</table></div>";

		controlContent.innerHTML = append;

		map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(classificationLegendDiv);

		$("#toggle-legend").on("click", function() {
			// Change the icon of the button
			$("#toggle-legend").toggleClass("icon-arrow-down3 icon-arrow-up2");

			if($("#toggle-legend")[0].className === "icon-arrow-up2") {
				$("#toggle-legend")[0].title = "Expand legend";
				// Hide the legends
				$("#classification-legend").slideUp("slow");
			} else {
				$("#toggle-legend")[0].title = "Collapse legend";
				// Show the legends
				$("#classification-legend").slideDown("slow");
			}
		});
	};
/*
	// Association rule begin @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

	MapCanvasController.prototype.addAssociationRules = function(rules) {
		self.removeAssociationRules();

		var associationRuleDiv = document.createElement('div');
		associationRuleDiv.id = "association-rule-box";
		var append = "<table id=\"association-rule-table\">";

		append += "<tr><th><label><b>Rule</b></label></th><th><label><b>Expression</b></label></th><th class=\"arm-table-last-column\"><label><b>Confidence</b></label></th></tr>";

		append += "<tr><td width=\"3.5em\"><button id=\"association-rule-1\" class=\"association-rule-button\"><i><b>Rule 1</b></i></button></td><td class=\"arm-table-middle-column\"><label><i><b>IF</b></i> high average injection hour with low standard deviation<br> low average injection steam with low standard deviation<br><i><b>THEN</b></i> good sor average with low sor standard deviation</label></td><td class=\"arm-table-last-column\"><label>90%<br>(18/20 pairs)</label></td></tr>";

		append += "<tr><td><button id=\"association-rule-2\" class=\"association-rule-button\"><i><b>Rule 2</b></i></button></td><td class=\"arm-table-middle-column\"><label><i><b>IF</b></i> low average injection hour with high standard deviation<br><i><b>THEN</b></i> low average oil production with low standard deviation</label></td><td class=\"arm-table-last-column\"><label>86%<br>(18/21 pairs)</label></td></tr>";

		append += "<tr><td><button id=\"association-rule-3\" class=\"association-rule-button\"><i><b>Rule 3</b></i></button></td><td class=\"arm-table-middle-column\"><label><i><b>IF</b></i> low average injection steam with low standard deviation <br><i><b>THEN</b></i> low average oil production with low standard deviation</label></td><td class=\"arm-table-last-column\"><label>85%<br>(47/55 pairs)</label></td></tr>";

		append += "<tr><td><button id=\"association-rule-4\" class=\"association-rule-button\"><i><b>Rule 4</b></i></button></td><td class=\"arm-table-middle-column\"><label><i><b>IF</b></i> medium average injection hour with medium standard deviation<br> high average injection steam with medium standard deviation<br><i><b>THEN</b></i> low average oil production with low standard deviation</label></td><td class=\"arm-table-last-column\"><label>83%<br>(19/23 pairs)</label></td></tr>";

		append += "<tr><td><button id=\"association-rule-5\" class=\"association-rule-button\"><i><b>Rule 5</b></i></button></td><td class=\"arm-table-middle-column\"><label><i><b>IF</b></i> low average and low standard deviation injection steam<br><i><b>THEN</b></i> good sor average with low sor standard deviation</label></td><td class=\"arm-table-last-column\"><label>80%<br>(24/30 pairs)</label></td></tr>";

		append += "</table>";

		append += "<table id=\"association-rule-legend\">";

		append += "<tr><td class=\"arm-legend-header\" colspan=\"3\"><label id=\"association-rule-legend-header\"><b>Rule X</b></label></td></tr>";

		var pinBothRules = '<input type=\"image\" src=\"./resources/blue-pin-smaller.png\" id=\"arm-legend-pin-1\" class=\"arm-legend-pin\">';
		var pinOneRule = '<input type=\"image\" src=\"./resources/light-blue-pin-smaller.png\" id=\"arm-legend-pin-2\" class=\"arm-legend-pin\">';
		var pinNoRule = '<input type=\"image\" src=\"./resources/black-pin-smaller.png\" id=\"arm-legend-pin-3\" class=\"arm-legend-pin\">';

		var labelBothRules = '<label class = \"arm-legend\"><b><i>IF & THEN</i></b></label>';
		var labelOneRule = '<label class = \"arm-legend\"><b><i>IF & NOT THEN</i></b></label>';
		var labelNoRule = '<label class = \"arm-legend\"><b><i>NONE</i></b></label>';

		append += "<tr> <td>" + pinBothRules + labelBothRules + "</td> <td>" + pinOneRule + labelOneRule + "</td> <td>" + pinNoRule + labelNoRule + "</td> </tr>";

		append += "</table>";

		associationRuleDiv.innerHTML = append;
		map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(associationRuleDiv);

		var targetId = -1;
		$(".association-rule-button").on("click", function(e) {
			if(e != undefined && e != null) {
				if(e.currentTarget != null && e.currentTarget.id != null) {
					targetId = e.currentTarget.id;
					targetId = targetId.charAt(targetId.length - 1);
					targetId = Number(targetId);

					// Changing the header of the legends table
					$("#association-rule-legend-header")[0].innerHTML = "<b>Rule " + targetId + "</b>";

					// Making the table appear
					$("#association-rule-legend")[0].style.display = "inline-table";

					// Changing the pins on the map
					var categories = [];
					categories.push({ category: 1, indexes: rules[targetId - 1]["ifthen"] });
					categories.push({ category: 2, indexes: rules[targetId - 1]["if"] });
					categories.push({ category: 3, indexes: rules[targetId - 1]["none"] });

					var overwriteColors = ["blue", "light-blue", "black"];
					self.createClassifiedMarkers(categories, overwriteColors);
				}
			}
		});

		$(".arm-legend-pin").on("click", function(event) {
			if(targetId != -1) {
				// Getting the index of the pin clicked
				var legendIndex = event["currentTarget"]["id"].charAt(event["currentTarget"]["id"].length - 1);
				legendIndex = Number(legendIndex);

				var wellsToEmphasize = [];
				switch(legendIndex) {
					case 1:
						wellsToEmphasize = rules[targetId - 1]["ifthen"];
						break;
					case 2:
						wellsToEmphasize = rules[targetId - 1]["if"];
						break;
					case 3:
						wellsToEmphasize = rules[targetId - 1]["none"];
						break;
					default:
						break;
				}

				self.emphasizeMarkers(wellsToEmphasize);
			}
		});
	};

	MapCanvasController.prototype.removeAssociationRules = function() {
		$("#association-rule-box").remove();
	};

	// Association rule end @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
*/
	MapCanvasController.prototype.getPinColors = function() {
		return pinColors;
	};

	MapCanvasController.prototype.getUsedClassification = function() {
		return usedClassification;
	};

	MapCanvasController.prototype.getMap = function() {
		return map;
	};

	function AddMapInfoControl(controlDiv) {
		// Set CSS for the control border
		var controlUI = document.createElement('div');
		controlUI.id = "map-info-controlUI";
		controlDiv.appendChild(controlUI);

		// Set CSS for the control interior
		var controlText = document.createElement('div');
		controlText.id = "map-info-control-text";
		controlUI.appendChild(controlText);

		$("body").on("mapInfoChanged", function() {
			var totalWells = dataSet.length;
			var maximumOffset = (totalWells+"").length;
			var auxCount = 0;

			var currentWellsOnTheMap = currentWells.length + "";
			auxCount = currentWellsOnTheMap.length;
			for(var i=0; i<(maximumOffset - auxCount); i++) {
				currentWellsOnTheMap = " &nbsp " + currentWellsOnTheMap;
			}

			var highlightedMarkersOnTheMap = highlightedMarkers.length + "";
			auxCount = highlightedMarkersOnTheMap.length;
			for(var i=0; i<(maximumOffset - auxCount); i++) {
				highlightedMarkersOnTheMap = " &nbsp " + highlightedMarkersOnTheMap;
			}

			// Which one is the best to show the information?!
			//var txt1 = "<b>" + currentWellsOnTheMap + "</b> / <b>" + totalWells + "</b> wells being shown";
			//var txt2 = "<b>" + highlightedMarkersOnTheMap + "</b> / <b>" +currentWellsOnTheMap + "</b> highlighted wells";

			var txt1 = "Total Wells: <b>" + currentWellsOnTheMap + "</b> / <b>" + totalWells + "</b>";
			var txt2 = "Highlighted: <b>" + highlightedMarkersOnTheMap + "</b> / <b>" +currentWellsOnTheMap + "</b>";
			controlText.innerHTML = txt1 + '<br>' + txt2;
		});
	}

	function AddMapLayerControl(controlDiv, map) {
		var controlUI = document.createElement('div');
		controlUI.id = "map-layers-controlUI";
		controlDiv.appendChild(controlUI);

		var controlContent = document.createElement('div');
		controlContent.id = "map-layers-control-content";
		controlUI.appendChild(controlContent);

		/*
		 * Creating all the elements for the 'layer' control
		 */
		// Creating all checkboxes
		var checkboxSurface = "<input id=\"layer-surface-checkbox\" class=\"layer-selection\" type=\"checkbox\" name=\"surface\" checked=\"true\">";
		var checkboxUnderground = "<input id=\"layer-underground-checkbox\" class=\"layer-selection\" type=\"checkbox\" name=\"underground\" checked=\"true\">";
		var checkboxDeviation = "<input id=\"layer-deviation-checkbox\" class=\"layer-selection\" type=\"checkbox\" name=\"deviation\" checked=\"true\">";
		// Creating all labels
		var surfaceLabel = "Surface";
		var undergroundLabel = "Underground";
		var deviationLabel = "Deviation";
		// Creating all images
		var surfaceSymbol = "<img src=\"./resources/top-red-marker.png\">";
		var undergroundSymbol = "<img src=\"./resources/red-pin-smaller.png\">";
		var deviationSymbol = "<img src=\"./resources/line.png\">";

		// Definition of variables to help the construction of a table
		var tableBegin = "<table id=\"layer-table\">";
		var tableEnd = "</table>";
		var trBegin = "<tr>";
		var trEnd = "</tr>";
		var tdBegin = "<td>";
		var tdEnd = "</td>";
		var tdBeginCustom = "<td id=\"column-left-align\">";

		// The table itself
		controlContent.innerHTML =
			tableBegin +
				trBegin +
					tdBegin +
						checkboxSurface +
					tdEnd +
					tdBegin +
						surfaceSymbol +
					tdEnd +
					tdBeginCustom +
						surfaceLabel +
					tdEnd +
				trEnd +
				trBegin +
					tdBegin +
						checkboxUnderground +
					tdEnd +
					tdBegin +
						undergroundSymbol +
					tdEnd +
					tdBeginCustom +
						undergroundLabel +
					tdEnd +
				trEnd +
				trBegin +
					tdBegin +
						checkboxDeviation +
					tdEnd +
					tdBegin +
						deviationSymbol +
					tdEnd +
					tdBeginCustom +
						deviationLabel +
					tdEnd +
				trEnd +
			tableEnd;

		google.maps.event.addDomListener(controlContent, 'click', function() {
			var checkboxes = $(this).find("input[class='layer-selection']");
			var modifiedCheckboxes = [];

			if(checkboxes[0].checked != lastLayerCheckboxes[0]) {
				modifiedCheckboxes.push(0);
			}
			if(checkboxes[1].checked != lastLayerCheckboxes[1]) {
				modifiedCheckboxes.push(1);
			}
			if(checkboxes[2].checked != lastLayerCheckboxes[2]) {
				modifiedCheckboxes.push(2);
			}

			if(modifiedCheckboxes.length > 0) {
				lastLayerCheckboxes = [checkboxes[0].checked, checkboxes[1].checked, checkboxes[2].checked];
				updateLayers(modifiedCheckboxes, lastLayerCheckboxes);
			}
		});
	}

	function updateLayers(modifiedCheckboxes, currentCheckboxesState) {

		for(var i=0; i<modifiedCheckboxes.length; i++) {
			var opacity = currentCheckboxesState[modifiedCheckboxes[i]] ? 1.0 : 0.0;

			switch(modifiedCheckboxes[i]) {
				// Surface
				case 0:
					for(var j=0; j<markersTop.length; j++) {
						markersTop[j].setOpacity(opacity);
					}
					break;

				// Underground
				case 1:
					for(var j=0; j<markers.length; j++) {
						markers[j].setOpacity(opacity);
					}
					break;

				// Deviation
				case 2:
					var options = { strokeOpacity: opacity };
					for(var j=0; j<deviations.length; j++) {
						deviations[j].setOptions(options);
					}
					break;
			}
		}
	}

	/*
	 * Store the full table to link the markers in the future
	 */
	MapCanvasController.prototype.setFullTable = function(tableController) {
		FullTableController = tableController;
	}

	/*
	 * Returns the current wells being displayed
	 */
	MapCanvasController.prototype.getCurrentWells = function() {
		return currentWells;
	}

	/*
	 * Plot the pins of the wells in parameter
	 */
	MapCanvasController.prototype.plotResults = function(wells){
		// The comparison with 'stringify' can only be used because the order of the elements does not change!!!
		// Be careful when using it around to compare JSONs...
		var clearAndInitializeMap = false;

		/*
		 * If wells is null, all the markers/pins should be shown - ONLY if they are not already being shown.
		 * Otherwise, update the map if the wells are different from the ones being shown.
		 */
		if(wells === null && JSON.stringify(this.dataSet) != JSON.stringify(currentWells)) {
			setCurrentWells(dataSet);
			clearAndInitializeMap = true;
		} else if(JSON.stringify(wells) != JSON.stringify(currentWells)) {
			setCurrentWells(wells);
			clearAndInitializeMap = true;
		}

		if(clearAndInitializeMap) {
			clearAllMarkers();
			initializeMap();
		}
	};

	/*
	 * Clear all the markers (pins) on the map
	 */
	function clearAllMarkers() {
		for (var i = 0; i < markers.length; i++) {
			markers[i].setMap(null);
			markersTop[i].setMap(null);
			deviations[i].setMap(null);
		}
		markers = [];
		markersTop = [];
		deviations = [];
	}

	/*
	 * Initialize the dataSet with the values in the JSON file
	 */
	function initializeDataSet() {
		// Get JSON file with all information about wells
		var temp;
		$.ajax({
			url: '/getAllWells',
			dataType:'json',
			async: false,
			success: function(data){
				temp = data;
			}
		});
		// Set as current wells
		setCurrentWells(temp);

		return temp;
	}

	/*
	 * Get the data retrieved from the database access.
	 */
	MapCanvasController.prototype.getDataSet = function() {
		return dataSet;
	}

	/*
	 * Define the current wells that are going to be shown on the map
	 */
	function setCurrentWells(wells) {
		currentWells = wells;
	}

	/*
	 * Initialize the map with the defined options
	 * Plot the wells' locations
	 * Center the map based on the markers present on the map
	 */
	var firstTimeLoading = true;
	function initializeMap() {
		/* The points should only be plotted if there's something to be plotted.
		 * This avoids the error of moving the map to a random position (probably the origin) and just makes
		 * the markers disappear, keeping the same location as before.
		 */
		if(currentWells != undefined && currentWells.length > 0) {
			// Don't know why, but setting this properties when creating the mapOptions does not work
			if(firstTimeLoading  === true) {
				map.setMapTypeId(google.maps.MapTypeId.TERRAIN);
				firstTimeLoading = false;
			}
			map.set('disableDoubleClickZoom', true);

			// Remove the highlighted markers that are not supposed to exist
			var markerExists = false;
			var tempHighlighted = [];
			for(var i=0; i<highlightedMarkers.length; i++) {
				markerExists = false;
				for(var j=0; j<currentWells.length; j++) {
					if(highlightedMarkers[i][0] === currentWells[j]["w_uwi"]) {
						markerExists = true;
						break;
					}
				}
				// If the highlighted marker does not exist in the current wells, remove it
				if(markerExists === true) {
					tempHighlighted.push(highlightedMarkers[i]);
				}
			}
			highlightedMarkers = tempHighlighted;

			// Plot the wells' locations
			plotPoints();
			// Center the map based on markers
			autoCenter();
		} else {
			$("body").trigger("mapInfoChanged");
			$("body").trigger("polygonChangedPosition");
		}

	}
	initializeMap();

	MapCanvasController.prototype.resetPins = function() {
		if(usedClassification === true) {
			usedClassification = false;

			clearAllMarkers();
			initializeMap();

			// Highlight all the pins that were highlighted before
			for(var i=0; i<highlightedMarkers.length; i++) {
				toggleMarkerSelection(true, highlightedMarkers[i][1], false);
			}
		}
	}

	/*
	 * Highlight specific pins on the map
	 */
	MapCanvasController.prototype.highlightWells = function(UWIsToHighlight, hasToUpdateTable) {
		var id;

		// Remove the highlighted wells that aren't in the UWIsToHighlight list anymore!
		for(var i=0; i<markers.length; i++) {
			if(markers[i].isHighlighted === true && $.inArray(markers[i].id, UWIsToHighlight) < 0) {
				this.deselectMarker(i, hasToUpdateTable, currentWells[i]["w_uwi"]);
			}
		}

		// Then, highlight the ones that are not highlighted!
		for(var i=0; i<currentWells.length; i++) {
			// If the well is in the UWIsToHighlight list, it must be highlighted
			if($.inArray(currentWells[i]["w_uwi"], UWIsToHighlight) >= 0 && markers[i].isHighlighted === false) {
				this.selectMarker(i, hasToUpdateTable, currentWells[i]["w_uwi"]);
			}
		}

		/*
		 * If there are others wells that don't match the conditions above, it means that they are correctly
		 * highlighted or correctly not highlighted.
		 */
	}

	/*
	 * Deselects a marker on the map
	 */
	MapCanvasController.prototype.deselectMarker = function(i, hasToUpdateTable, id) {
		if(usedClassification === false) {
			toggleMarkerSelection(false, i, hasToUpdateTable);
		}

		for(var i=0; i<highlightedMarkers.length; i++) {
			if(highlightedMarkers[i][0] === id) {
				highlightedMarkers.splice(i, 1);
				break;
			}
		}
	};

	/*
	 * Selects a marker on the map
	 */
	MapCanvasController.prototype.selectMarker = function(i, hasToUpdateTable, id) {
		if(usedClassification === false) {
			toggleMarkerSelection(true, i, hasToUpdateTable);
		}

		var tempIds = [];
		for(var j=0; j<highlightedMarkers.length; j++) {
			tempIds.push(highlightedMarkers[j][0]);
		}

		if($.inArray(id, tempIds) < 0) {
			highlightedMarkers.push([id, i]);
		}
	}

	/*
	 * General function to select or deselect a marker on the map
	 */
	function toggleMarkerSelection(isSelected, i, selectedByPolygon) {
		if(markers[i].isHighlighted != isSelected) {
			// Remove the older markers and line
			// Bottom
			markers[i].setMap(null);
			markers[i] = null;
			// Top
			markersTop[i].setMap(null);
			markersTop[i] = null;
			// Line (deviation)
			deviations[i].setMap(null);
			deviations[i] = null;

			createMarker(currentWells[i], i, isSelected, null);

			if(selectedByPolygon === true) {
				// Update the full table with the selection
				FullTableController.toggleRowsSelection(currentWells[i]["w_uwi"]);
			}
		}
	}

	/*
	 * Returns all the highlighted markers
	 */
	MapCanvasController.prototype.getHighlightedMarkers = function() {
		return highlightedMarkers;
	}

	/*
	 * Plot points on the map (adding markers/pins)
	 */
	function plotPoints() {
		// Go through all wells and create markers for them
		for (var i = 0; i < currentWells.length; i++) {
			createMarker(currentWells[i], i, false, null);
		}
	}

	MapCanvasController.prototype.createClassifiedMarkers = function(categories, overwriteColors) {
		usedClassification = true;

		for(var i = 0; i < currentWells.length; i++){
			for(var j=0; j < categories.length; j++){
				var found = false;
				for(var k = 0; k <categories[j]["indexes"].length; k++){
					if (i === categories[j]["indexes"][k]){
						var auxColor = categories[j]["category"] === "Invalid" ? "black" : pinColors[j];

						// In case we are dealing with association rule mining
						if(overwriteColors != undefined && overwriteColors != null && overwriteColors.length > 0) {
							auxColor = overwriteColors[j];
						}

						// Add new entry to wellColors in case a search/filter/selection is executed.
						wellColors[i] = { well: currentWells[i], color: auxColor, category: categories[j]["category"] };

						// We create the marker in color j
						// Remove the older markers and line
						// Bottom
						markers[i].setMap(null);
						markers[i] = null;
						// Top
						markersTop[i].setMap(null);
						markersTop[i] = null;
						// Line (deviation)
						deviations[i].setMap(null);
						deviations[i] = null;

						createMarker(currentWells[i], i, false, auxColor);

						found = true;
						break;
					} else if(i < categories[j]["indexes"][k]){
						break;
					}
				}
				if (found === true){
					break;
				}
			}
		}
	};

	/*
	 * Be careful with the 3 different situations that this function can be called:
	 *  - Creating a marker for the first time (isHighlighted must be null)
	 *  - Updating a marker
	 *    - Highlight it (isHighlighted must be true)
	 *    - ! Highlight it (isHighlighted must be false)
	 */
	function createMarker(well, i, isHighlighted, pinColor) {

		var iconUrl = 'resources/red-pin-small.png';
		var topIconUrl = 'resources/top-red-marker.png';
		var lineColor = '#000000';
		var lineWeight = 1.0;
		var animation = null;
		var zIndex = google.maps.Marker.MAX_ZINDEX - 1;
		if(isHighlighted != null && isHighlighted === true) {
			iconUrl = 'resources/blue-pin-small.png';
			topIconUrl = 'resources/top-blue-marker.png';
			lineColor = '#1C86EE';//'#0000FF';
			lineWeight = 3;
			zIndex++;
			//animation = google.maps.Animation.BOUNCE;
		}

		// Defining new properties to the marker to know if it's highlighted or not
		google.maps.Marker.prototype.isHighlighted = false;
		google.maps.Marker.prototype.id = "";

		/*
		 * If the pinColor is defined, we disconsider all highlight attributes and put the specified color
		 * to the top and underground markers.
		 */
		if (usedClassification === true && pinColor != undefined && pinColor != null){
			iconUrl = 'resources/' + pinColor + '-pin-small.png';
			topIconUrl = 'resources/top-' + pinColor + '-marker.png';
		}

		// Creating image variable to center the circle marker of the well top position
		var topMarkerImage = new google.maps.MarkerImage(topIconUrl,
			new google.maps.Size(12, 12),
			new google.maps.Point(0, 0),
			new google.maps.Point(6, 7));

		// Creating markers for surface location of well
		var markerTop = new google.maps.Marker({
			position: new google.maps.LatLng(well["w_top_lat"], well["w_top_lng"]),
			map: map,
			title: well["w_name"],
			draggable: false,
			animation: null,
			zIndex: zIndex,
			icon: topMarkerImage
		});
		// Defining opacity of marker based on the checkbox selected for different 'layers'
		markerTop.setOpacity(lastLayerCheckboxes[0] ? 1.0 : 0.0);

		// Creating markers for underground location of well
		var marker = new google.maps.Marker({
			position: new google.maps.LatLng(well["w_bottom_lat"], well["w_bottom_lng"]),
			map: map,
			title: well["w_name"],
			draggable: false,
			animation: animation,
			zIndex: zIndex,
			icon: iconUrl
		});
		// Defining opacity of marker based on the checkbox selected for different 'layers'
		marker.setOpacity(lastLayerCheckboxes[1] ? 1.0 : 0.0);

		marker.id = well["w_uwi"];
		markerTop.id = well["w_uwi"];

		// Create line representing the connection between top and bottom
		var deviation = new google.maps.Polyline({
			map: map,
			path: [ marker["position"], markerTop["position"] ],
			strokeColor: lineColor,
			strokeWeight: lineWeight,
			zIndex: zIndex
		});
		// Defining opacity of line based on the checkbox selected for different 'layers'
		deviation.setOptions({ strokeOpacity: lastLayerCheckboxes[2] ? 1.0 : 0.0 });

		/* Adding the new marker on the array of markers.
		 * If the marker is supposed to be highlighted, it is being replaced in the array of markers,
		 * so it must be inserted at the same location as before.
		 */
		if(isHighlighted === null) {
			markers.push(marker);
			markersTop.push(markerTop);
			deviations.push(deviation);
		} else {
			if(isHighlighted === true) {
				marker.isHighlighted = true;
				markerTop.isHighlighted = true;
			}
			markers[i] = marker;
			markersTop[i] = markerTop;
			deviations[i] = deviation;
		}

		// Define an event to execute every time a marker/pin is clicked
		// It will show the UWI, Company and Status of a well
		google.maps.event.addListener(marker, 'click', (function (marker, i) {
			return setInfoWindowContent(well, infoWindow, map, marker, i, false);
		})(marker, i));
		google.maps.event.addListener(markerTop, 'click', (function (markerTop, i) {
			return setInfoWindowContent(well, infoWindow, map, markerTop, i, true);
		})(markerTop, i));
		google.maps.event.addListener(deviation, 'click', (function (marker, i) {
			return setInfoWindowContent(well, infoWindow, map, marker, i, false);
		})(markers[i], i));

		/*
		 * Right click event listeners (markers and lines)
		 */
		if(usedClassification === false) {
			google.maps.event.addListener(marker, 'rightclick', (function (marker, i) {
				return highlightAction(infoWindow, map, marker, i, false);
			})(marker, i));
			google.maps.event.addListener(markerTop, 'rightclick', (function (marker, i) {
				return highlightAction(infoWindow, map, marker, i, true);
			})(markerTop, i));
			google.maps.event.addListener(deviation, 'rightclick', (function (marker, i) {
				return highlightAction(infoWindow, map, marker, i, false);
			})(markers[i], i));
		}

		// Used to change the opened property when the user closes the info window by pressing the top right x.
		google.maps.event.addListener(infoWindow,'closeclick',function(){
			infoWindow.opened = false;
		});

		setTimeout(function() { $("body").trigger("mapInfoChanged") }, 100);
		if(polygonMarkers.length > 0) {
			setTimeout(function() { $("body").trigger("polygonChangedPosition") }, 100);
		}
	}

	var lastIndexes = [];
	var control = true;
	MapCanvasController.prototype.emphasizeMarkers = function(indexes) {
		if(indexes != undefined && indexes != null && indexes.length > 0) {
			// lastLayerCheckboxes -> 0 - top, 1 - underground, 2 - deviation

			// Make everything back to normal
			var zIndex = google.maps.Marker.MAX_ZINDEX - 1;

			for(var i=0; i<markers.length; i++) {
				// Surface
				if(lastLayerCheckboxes[0] === true) {
					markersTop[i].setOpacity(1);
					markersTop[i].setZIndex(zIndex);
				}
				// Underground
				if(lastLayerCheckboxes[1] === true) {
					markers[i].setOpacity(1);
					markers[i].setZIndex(zIndex);
				}
				// Deviations
				if(lastLayerCheckboxes[2] === true) {
					deviations[i].setOptions({ strokeOpacity: 1 });
				}
			}

			// If the indexes array is different than the lastIndexes, we need to lower the opacity of elements in indexes
			if(lastIndexes.toString() != indexes.toString() || control) {
				lastIndexes = indexes;
				control = false;

				zIndex = google.maps.Marker.MAX_ZINDEX - 2;
				// First, lower the opacity of all markers not present in the indexes list
				var tempIndex = 0;
				for(var i=0; i<markers.length; i++) {
					if(i != indexes[tempIndex]) {
						// Surface
						if(lastLayerCheckboxes[0] === true) {
							markersTop[i].setOpacity(0.07);
							markersTop[i].setZIndex(zIndex);
						}
						// Underground
						if(lastLayerCheckboxes[1] === true) {
							markers[i].setOpacity(0.07);
							markers[i].setZIndex(zIndex);
						}
						// Deviations
						if(lastLayerCheckboxes[2] === true) {
							deviations[i].setOptions({ strokeOpacity: 0.07 });
						}
					} else {
						tempIndex++;
					}
				}
			} else {
				control = true;
			}
		}
	};

	function setInfoWindowContent(well, infoWindow, map, marker, i, isTop) {
		return function () {
			var tempButton = "<input type=\"button\" id=\"view-time-series-button\" value=\"View time series\"/>";

			var wellType = well["w_type"] === "N" ? "NOT DEFINED" : well["w_type"];

			var content = "<b>Unique Well Identifier</b><br>" + well["w_uwi"] + "<br><br>"
				+ "<b>Well Operator</b><br>" + well["w_operator"] + "<br><br>"
				+ "<b>Well Status</b><br>" + well["w_current_status"] + "<br><br>"
				+ "<b>Well Type</b><br>" + wellType + "<br>"
				+ tempButton + "<hr>";

			// Adding information about surface/underground location
			if(isTop === true) {
				content += "<b>Surface location - <i>heel</i></b>";
			} else {
				content += "<b>Underground location - <i>toe</i></b>";
			}

			// Set the content of the infoWindow
			infoWindow.setContent("<p>" + content + "</p>");

			// Defining new property to the info window to know when it's opened or closed
			google.maps.InfoWindow.prototype.opened = false;
			google.maps.Marker.prototype.id = well["w_uwi"];
			toggleInfoWindow(infoWindow, map, marker, isTop);

			// Creating listener to click event for the 'view time series' button
			google.maps.event.addListener(infoWindow, 'domready', function() {
				$('#view-time-series-button').on('click',function() {
					// Copying the uwi to the searchbox in the time series visualization
					$("#time-series-uwi")[0].value = well["w_uwi"];

					$("#openVisualization").trigger("click", false);
				});
			});
		}
	}

	function highlightAction(infoWindow, map, marker, i, isTop) {
		return function () {
			// Toggles the selection
			if(marker.isHighlighted) {
				self.deselectMarker(i, true, marker.id);
			} else {
				self.selectMarker(i, true, marker.id);
			}

			// Making sure to control the info window behaviour
			if(infoWindow.opened === true) {
				infoWindow.opened = false;
				infoWindow.close();
				toggleInfoWindow(infoWindow, map, marker, isTop);
			}
		}
	}

	/*
	 * Allow the infoWindow to be opened and closed by clicking on the pin
	 */
	// Last info window opened to control the toggle of opening and closing window. Array contains marker id and InfoWindow
	var lastInfoWindowOpened = [-1, null, false];
	function toggleInfoWindow(infoWindow, map, marker, isTop) {
		if(infoWindow.opened) {
			if(lastInfoWindowOpened[0] != -1 && marker.id != lastInfoWindowOpened[0]) {
				/*
				 * If the last info window opened id and the marker clicked have different ids:
				 * - Close the one that is opened (the last one)
				 * - Open the new one
				 * - Set it as the new last info window opened
				 */
				lastInfoWindowOpened[1].opened = false;
				lastInfoWindowOpened[1].close();
				infoWindow.opened = true;
				infoWindow.open(map, marker);
				lastInfoWindowOpened = [marker.id, infoWindow, isTop];
			} else {
				if(lastInfoWindowOpened[2] === isTop) {
					// If the last window opened is directly related to the open one..
					// Close the opened info window and set the last info window opened as none
					infoWindow.opened = false;
					infoWindow.close();
					lastInfoWindowOpened = [-1, null, false];
				} else {
					// If the last window opened is related to a different marker with same ID (top - bottom)
					// Open the same window on the other marker (top -> bottom, bottom -> top)
					infoWindow.opened = true;
					infoWindow.open(map, marker);
					lastInfoWindowOpened = [marker.id, infoWindow, isTop];
				}
			}
		}
		else {
			// Opening the info window clicked and setting it as the last info window opened
			infoWindow.opened = true;
			infoWindow.open(map, marker);
			lastInfoWindowOpened = [marker.id, infoWindow, isTop];
		}
	}

	/*
	 * Fit all markers/pins on the map (defining new center for the map)
	 */
	function autoCenter() {
		// Create a new viewpoint bound
		var bounds = new google.maps.LatLngBounds();

		// Expand the visualization bound considering each marker/pin
		if(markers != undefined && markers != null) {
			for(var i=0; i<markers.length; i++) {
				bounds.extend(markers[i]["position"]);
			}
		}

		if(markersTop != undefined && markersTop != null) {
			for(var i=0; i<markersTop.length; i++) {
				bounds.extend(markersTop[i]["position"]);
			}
		}

		// Expand the visualization bound considering each polygon marker
		if(polygonMarkers != undefined && polygonMarkers != null) {
			for(var i=0; i<polygonMarkers.length; i++) {
				bounds.extend(polygonMarkers[i]["position"]);
			}
		}

		// Fit these bounds to the map
		map.fitBounds(bounds);
	}

	/* Polygon */
	/*
	 * Add marker when double clicking
	 */
	google.maps.event.addListener(map, 'dblclick', function(event) { addPoint(event); });

	/*
	 * Forces the markers to follow the edges of the polygon
	 */
	google.maps.event.addListener(poly, 'drag', function() {
		var vertices = poly.getPath()["j"];
		var numberOfVertices = vertices.length;

		if(numberOfVertices != polygonMarkers.length) {
			return;
		}

		for(var i=0; i<numberOfVertices; i++) {
			polygonMarkers[i].setPosition(vertices[i]);
		}
		$("body").trigger("polygonChangedPosition");
	});

	/*
	 * Add one polygon marker on the map
	 */
	function addPoint(event) {
		if($("#myonoffswitch")[0].checked) {

			path.insertAt(path.length, event.latLng);

			var marker = new google.maps.Marker({
				position: event.latLng,
				map: map,
				draggable: true,
				icon: {
					path: google.maps.SymbolPath.CIRCLE,
					scale: 5
				}
			});

			marker.setTitle("#" + path.length);
			polygonMarkers.push(marker);

			/*
			 * Removes the marker when right clicked
			 */
			google.maps.event.addListener(marker, 'rightclick', function() {
				marker.setMap(null);
				for (var i = 0, I = markers.length; i < I && polygonMarkers[i] != marker; ++i);
				polygonMarkers.splice(i, 1);
				path.removeAt(i);
				$("body").trigger("polygonChangedPosition");
			});

			/*
			 * Forces the polygon to be adjusted when the markers move
			 */
			google.maps.event.addListener(marker, 'drag', function() {
				for (var i = 0, I = polygonMarkers.length; i < I && polygonMarkers[i] != marker; ++i);
				path.setAt(i, marker.getPosition());
				// Update text in the toolbar
				$("body").trigger("polygonChangedPosition");
			});

			$("body").trigger("polygonChangedPosition");
		}
	}

	/*
	 * Returns all the markers that are inside the defined polygon
	 */
	MapCanvasController.prototype.getMarkersIdInsidePolygon = function(selectionCriterion) {
		// Checking how many markers are inside the polygon
		var markersInside = [];
		var selectionGroup = [];

		if(selectionCriterion === "bottom") {
			selectionGroup = markers;
		} else if(selectionCriterion === "top") {
			selectionGroup = markersTop;
		}

		for(var i=0; i<markers.length; i++)
		{
			if (google.maps.geometry.poly.containsLocation(selectionGroup[i]["position"], poly)) {
				markersInside.push([selectionGroup[i]["id"], i]);
			}
		}
		return markersInside;
	};

	/*
	 * Removes the polygon created by adding circular markers
	 */
	MapCanvasController.prototype.removePolygon = function() {
		path = new google.maps.MVCArray;
		poly.setPaths(new google.maps.MVCArray([path]));

		for (var i = 0; i < polygonMarkers.length; i++) {
			polygonMarkers[i].setMap(null);
		}
		polygonMarkers = [];
	};

	(typeof exports !== "undefined" && exports !== null ? exports : window).MapCanvasController = MapCanvasController;
}).call(this);