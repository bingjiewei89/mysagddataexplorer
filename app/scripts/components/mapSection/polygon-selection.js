/*--------------------------------------------------------------------------------
	Author: Rodrigo Silva

	petroleum-explorer

	=============================================================================
	Filename: polygon-selection.js
	=============================================================================
	Contains all the functions to add markers on the map, creating polygons and
	executing operations such as highlighting, selecting and removing markers
	inside the polygon area.
-------------------------------------------------------------------------------*/

(function () {

	var lastResultSet = null;
	var $myOnOffSwitch = $('#myonoffswitch');
	var $polygonHighlightMarkersButton = $('#polygon-highlight-markers-button');
	var $polygonClearHighlightedMarkersButton = $("#polygon-clear-highlighted-markers-button");
	var $polygonSelectMarkersButton = $('#polygon-select-markers-button');
	var $polygonRemoveMarkersButton = $('#polygon-remove-markers-button');
	var $polygonResetMarkersButton = $('#polygon-reset-markers-button');
	var $polygonRadioButtons = $($("#selectionTable").find("input[type='radio']"));

	var PolygonSelection;
	var self;

	// The "constructor" of PolygonSelection. When this object is created, this code is executed.
	PolygonSelection = function (MapCanvasController, SearchController){
		this.MapCanvasController = MapCanvasController;
		this.SearchController = SearchController;

		self = this;
		createRadioButtonsChangeEventListeners();
	};

	// Auxiliar function to disable/enable all the fields related to polygon selection
	function setDisableButtons(isDisabled) {
		var isClassified = self.MapCanvasController.getUsedClassification();

		$polygonHighlightMarkersButton[0].disabled = isDisabled || isClassified;
		$polygonClearHighlightedMarkersButton[0].disabled = isDisabled || isClassified;

		$polygonSelectMarkersButton[0].disabled = isDisabled;
		$polygonRemoveMarkersButton[0].disabled = isDisabled;
	}

	// Disables/enables the radio buttons
	function setDisableRadioButtons(isDisabled) {
		for(var i=0; i<$polygonRadioButtons.length; i++) {
			$polygonRadioButtons[i].disabled = isDisabled;
		}
	}

	// Controlling the on/off button to activate and deactivate the polygon selection
	$myOnOffSwitch.on("change", function() {
		var isChecked = $myOnOffSwitch[0].checked;
		if(isChecked === false) {
			self.MapCanvasController.removePolygon();
			$(".info-msg").remove();
			setDisableButtons(true);
		}
		setDisableRadioButtons(!isChecked);
	});

	// Creates event for all the polygons buttons to update information when changed
	function createRadioButtonsChangeEventListeners() {
		for(var i=0; i<$polygonRadioButtons.length; i++) {
			$polygonRadioButtons[i].onclick = function() { $("body").trigger("polygonChangedPosition"); };
		}
	}

	// Gets the ids of wells that are inside the polygon
	function getMarkersIdInsidePolygon() {
		var selectionCriterion = "";
		if($polygonRadioButtons[0].checked) {
			selectionCriterion = "bottom";
		} else if($polygonRadioButtons[1].checked) {
			selectionCriterion = "top";
		}

		return self.MapCanvasController.getMarkersIdInsidePolygon(selectionCriterion);
	}

	// Highlights the wells that are inside the polygon
	$polygonHighlightMarkersButton.on("click", function() {
		// markersId contains the ids of the markers as well as their indices
		var markersId = getMarkersIdInsidePolygon();
		var highlightedMarkers = self.MapCanvasController.getHighlightedMarkers().slice();

		if(markersId != undefined && markersId != null && markersId.length > 0) {
			// Saving the markers that were selected to be highlighted
			for(var i=0; i<markersId.length; i++) {
				if($.inArray(markersId[i], highlightedMarkers) < 0) {
					highlightedMarkers.push(markersId[i]);
				}
			}

			// Getting only the id of the markers to call the highlight function
			var temp = [];
			for(var i=0; i<highlightedMarkers.length; i++) {
				temp.push(highlightedMarkers[i][0]);
			}

			self.MapCanvasController.highlightWells(temp, true);
		}
	});

	// Clears the highlight state of wells that are inside the polygon
	$polygonClearHighlightedMarkersButton.on("click", function() {
		// markersId contains the ids of the markers as well as their indices
		var markersId = getMarkersIdInsidePolygon();

		for(var i=0; i<markersId.length; i++) {
			self.MapCanvasController.deselectMarker(markersId[i][1], true, markersId[i][0]);
		}
	});

	// Selects the wells that are inside the polygon (removes the ones that are outside the polygon)
	$polygonSelectMarkersButton.on("click", function() {
		saveLastResultSet();

		// markersId contains the ids of the markers as well as their indices
		var markersId = getMarkersIdInsidePolygon();
		if(markersId != undefined && markersId != null && markersId.length > 0) {
			var temp = [];
			for(var i=0; i<markersId.length; i++) {
				temp.push(markersId[i][0]);
			}

			// Update result set, map, full table, and the classification
			self.SearchController.setResultSetByIds(temp);
			self.MapCanvasController.plotResults(self.SearchController.getResultSet());
			$("body").trigger("ResultsUpdated");
			$("body").trigger("WellsUpdated");
		}
	});

	// Removes the wells that are inside the polygon (same idea as selecting the ones that are outside the polygon)
	$polygonRemoveMarkersButton.on("click", function() {
		saveLastResultSet();

		// Copying current wells array into another
		var currentWells = self.MapCanvasController.getCurrentWells().concat();

		// markersId contains the ids of the markers as well as their indices
		var markersId = getMarkersIdInsidePolygon();
		if(markersId != undefined && markersId != null && markersId.length > 0) {
			var temp = [];
			for(var i=0; i<markersId.length; i++) {
				temp.push(markersId[i][0]);
			}

			// Update result set, map and full table
			self.SearchController.setResultSetByIdsInverse(currentWells, temp);
			self.MapCanvasController.plotResults(self.SearchController.getResultSet());
			$("body").trigger("ResultsUpdated");
			$("body").trigger("WellsUpdated");
		}
	});

	// Resets the markers on the map
	$polygonResetMarkersButton.on("click", function() {
		// Which one is the best? To always reset the result set or to make it the same as it was before?
		// Inconsistency can happen in both cases..
		self.SearchController.resetResultSet();
		//self.SearchController.setResultSet(lastResultSet);

		self.MapCanvasController.plotResults(self.SearchController.getResultSet());
		$("body").trigger("ResultsUpdated");
		$("body").trigger("WellsUpdated");

		$polygonResetMarkersButton[0].disabled = true;
	});

	// Event to update controls and information when the polygon is moved
	$("body").on("polygonChangedPosition", (function () {
		var markers = getMarkersIdInsidePolygon();
		appendInfo(markers.length);

		if(markers === undefined || markers === null || markers.length === 0) {
			setDisableButtons(true);
		} else {
			setDisableButtons(false);
		}
	}));

	// Appends information about the number of intersected wells
	function appendInfo(currentMarkers) {
		$(".info-msg").remove();
		var message = currentMarkers + (currentMarkers === 1 ? " well intersected" : " wells intersected");
		var divToAppend = '.selection-form';
		$('<label class = "info-msg"><b>' + message + '</b></br></label>').appendTo(divToAppend);
	}

	// Saves the last result set used when selected/removed wells by using the polygon selection
	function saveLastResultSet() {
		if(lastResultSet === undefined || lastResultSet === null) {
			lastResultSet = self.SearchController.getResultSet();
		}
	}

	// When the search is executed, the options must be updated accordingly
	$("body").on("resultSetChanged", function() {
		$polygonResetMarkersButton[0].disabled = !self.SearchController.isResultNotSetBySearch();

		if(self.SearchController.isResultNotSetBySearch() === false) {
			lastResultSet = null;
		}
	});

	(typeof exports !== "undefined" && exports !== null ? exports : window).PolygonSelection = PolygonSelection;
}).call(this);