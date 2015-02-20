/*--------------------------------------------------------------------------------
	Author: Rodrigo Silva

	petroleum-explorer

	=============================================================================
	Filename: visualization-view.js
	=============================================================================
	This file captures the user input, opens the visualization centre and calls
	the appropriate function from the visualization-controller.
-------------------------------------------------------------------------------*/

(function () {

	// Controlling the active item of the accordion
	var optionAccordion = 0;	// Variable for handling accordion option
	(function () {
		$(function () {
			var active;
			active = function () {
				return visualizationAccordion.on("click", function () {
					optionAccordion = $("#visualizationAccordion").accordion( "option", "active" );
				});
			};
			active();
		});
	}).call(this);

	var wellInfo = [];
	var statusInfo = [];
	var injectionInfo = [];
	var productionInfo = [];
	var validPairInfo = [];
	var pairInjectionInfo = [];
	var pairProductionInfo = [];

	var lastUwiTyped = "";
	var controlPanel = $("#control-panel");
	var visualizationAccordion = controlPanel.find("#visualizationAccordion");
	var $applyVisualizationButton = $('#applyVisualization');
	var $clearVisualizationButton = $('#clearVisualization');
	var $pieChartSelection = $('#pie-chart-attributes');
	var $barChartSelection = $('#bar-chart-attributes');
	var $timeSeriesSelection = $('#time-series-attributes');
	var $visualizationTitle = $("#visualization-title");
	var $visualizationSubtitle = $("#visualization-subtitle");
	var $openVisualizationButton = $("#openVisualization");
	var $timeSeriesUwi = $("#time-series-uwi");

	var barChartTitle = "<i>Bar Chart</i> - ";
	var pieChartTitle = "<i>Pie Chart</i> - ";
	var timeSeriesTitle = "<i>Time Series</i> - ";
	var self;

	var VisualizationView;
	VisualizationView = function (visualizationController, fullTable){
		this.visualizationController = visualizationController;
		this.fullTable = fullTable;
		self = this;
	};

	// The full table dialog must be closed in order to avoid jquery error of 'Maximum call stack size exceeded'
	// This error probably happens due to some incompatibility with the
	$openVisualizationButton.on("click", function(event, param) {
		self.fullTable.closeFullTableDialog();

		if(param === undefined || param === null || param != false) {
			// Every time the visualization centre is opened, the visualization being shown before is reloaded.
			// If there's none selected, nothing will be added.
			// The timeout is used as safety margin time for the window to totally load before rendering the graph again.
			setTimeout(function() {
				return $applyVisualizationButton.trigger("click");
			}, 300);
		} else {
			// Opens the time series accordion tab/panel
			optionAccordion = 2;
			$("#visualizationAccordion").accordion("option", "active", optionAccordion);

			$timeSeriesUwi.trigger("keyup");
		}
	});

	$timeSeriesUwi.on("propertychange change keyup paste input", function (e) {
		if($timeSeriesUwi[0].value != lastUwiTyped) {
			lastUwiTyped = $timeSeriesUwi[0].value;

			if($timeSeriesUwi[0].value != undefined && $timeSeriesUwi[0].value != null && $timeSeriesUwi[0].value.length === 19) {
				// Checking if the well exists
				wellInfo = self.visualizationController.getInfoFromWell($timeSeriesUwi[0].value);

				// Append information about result found
				if(appendInfo(wellInfo) === true) {
					statusInfo = self.visualizationController.getStatusInfoFromWell($timeSeriesUwi[0].value);
					injectionInfo = self.visualizationController.getInjectionInfoFromWell($timeSeriesUwi[0].value);
					productionInfo = self.visualizationController.getProductionInfoFromWell($timeSeriesUwi[0].value);

					/*
					 * If the well is a producer or injector and its status is Steam Assis Gravity Drain
					 * it has a valid pair. Therefore, for the SOR calculation, the pair must be used.
					 */
					if(wellInfo[0]["w_type"] != "N" && wellInfo[0]["w_current_status"] === "STEAM ASSIS GRAVITY DRAIN") {
						var pairsInfo = [];
						pairsInfo = self.visualizationController.getPairOfWell($timeSeriesUwi[0].value);

						var pairType = wellInfo[0]["w_type"] === "PRODUCER" ? "INJECTOR" : "PRODUCER";
						for(var i=0; i<pairsInfo.length; i++) {
							if(pairsInfo[i]["w_type"] === pairType) {
								validPairInfo = pairsInfo[i];
								break;
							}
						}

						if(pairType === "PRODUCER") {
							pairProductionInfo = self.visualizationController.getProductionInfoFromWell(validPairInfo["w_uwi"]);
							pairInjectionInfo = [];
						} else if(pairType === "INJECTOR") {
							pairInjectionInfo = self.visualizationController.getInjectionInfoFromWell(validPairInfo["w_uwi"]);
							pairProductionInfo = [];
						}

					} else {
						validPairInfo = [];
						pairInjectionInfo = [];
						pairProductionInfo = [];
					}
				}
			} else {
				$(".time-series-uwi-msg").remove();
			}
		}
	});

	$applyVisualizationButton.on("click", function() {
		switch(optionAccordion) {
			case 0:
				if($barChartSelection[0].value != "none") {
					generateTitle();
					var attribute = $barChartSelection[0].value;
					var attributeText = $barChartSelection[0][$barChartSelection[0].selectedIndex].label;
					var response = self.visualizationController.generateBarChart(attribute, attributeText);

					if(response === 1) {
						$visualizationTitle[0].innerHTML = "";

						var alertMessage =
							"<div id=\"canvas-svg\">" +
								"<label id=\"missing-data-message\">No data available</label>" +
							"</div>";

						$(alertMessage).appendTo($("#visualization-container"));
					}
				} else {
					self.clearVisualization(true);
				}
				break;
			case 1:
				if($pieChartSelection[0].value != "none") {
					generateTitle();
					self.visualizationController.generatePieChart($pieChartSelection[0].value);
				} else {
					self.clearVisualization(true);
				}
				break;
			case 2:
				if($timeSeriesSelection[0].value != "none") {
					if($timeSeriesSelection[0].value === "statuses") {
						if(statusInfo != undefined && statusInfo != null && statusInfo.length > 0) {
							generateTitle();
							self.visualizationController.generateTimelineChart(statusInfo, true);
						}
					} else if($timeSeriesSelection[0].value === "injection") {
						if(injectionInfo != undefined && injectionInfo != null && injectionInfo.length > 0) {
							generateTitle();
							// Generate the chart
							self.visualizationController.generateInjectionProductionChart(injectionInfo, productionInfo, $timeSeriesSelection[0].value);
						} else {
							// Show message of no data for injection
							self.clearVisualization(false);
							// Setting the option that the user selected
							$timeSeriesSelection[0].value = "injection";

							var alertMessage =
								"<div id=\"canvas-svg\">" +
									"<label id=\"no-data-message\">No injection data available for this well - <b>" + $timeSeriesUwi[0].value + "</b></label>" +
								"</div>";

							$(alertMessage).appendTo($("#visualization-container"));
						}
					} else if($timeSeriesSelection[0].value === "production") {
						if(productionInfo != undefined && productionInfo != null && productionInfo.length > 0) {
							generateTitle();
							// Generate the chart
							self.visualizationController.generateInjectionProductionChart(injectionInfo, productionInfo, $timeSeriesSelection[0].value);
						} else {
							// Show message of no data for production
							self.clearVisualization(false);
							// Setting the option that the user selected
							$timeSeriesSelection[0].value = "production";

							var alertMessage =
								"<div id=\"canvas-svg\">" +
									"<label id=\"no-data-message\">No production data available for this well - <b>" + $timeSeriesUwi[0].value + "</b></label>" +
									"</div>";

							$(alertMessage).appendTo($("#visualization-container"));
						}
					} else if($timeSeriesSelection[0].value === "sor") {

						var hasPair = validPairInfo != undefined && validPairInfo != null && validPairInfo.length > 0;
						var injectionValues = [];
						var productionValues = [];

						if(wellInfo[0]["w_type"] === "PRODUCER") {
							productionValues = productionInfo;
							injectionValues = pairInjectionInfo;
						} else if(wellInfo[0]["w_type"] === "INJECTOR") {
							productionValues = pairProductionInfo;
							injectionValues = injectionInfo;
						}

						var hasInjection = injectionValues != undefined && injectionValues != null && injectionValues.length > 0;
						var hasProduction = productionValues != undefined && productionValues != null && productionValues.length > 0;

						if(hasInjection && hasProduction) {
							generateTitle();
							self.visualizationController.generateInjectionProductionChart(injectionValues, productionValues, $timeSeriesSelection[0].value);
						} else {
							// Show message of no data for production
							self.clearVisualization(false);
							// Setting the option that the user selected
							$timeSeriesSelection[0].value = "sor";

							var alertMessage =
								"<div id=\"canvas-svg\">" +
									"<label id=\"no-data-message\">No SOR data available for this well - <b>" + $timeSeriesUwi[0].value + "</b></label>" +
									"</div>";

							$(alertMessage).appendTo($("#visualization-container"));
						}

					}
				} else {
					self.clearVisualization(false);
				}
				break;
			default:
				self.clearVisualization(true);
				break;
		}
	});

	function generateTitle() {
		switch(optionAccordion) {
			// Bar chart
			case 0:
				$visualizationTitle[0].innerHTML = barChartTitle + "<b>" + $barChartSelection[0][$barChartSelection[0].selectedIndex].label + "</b>";
				break;
			// Pie chart
			case 1:
				$visualizationTitle[0].innerHTML = pieChartTitle + "<b>" + $pieChartSelection[0][$pieChartSelection[0].selectedIndex].label + "</b>";
				break;
			// Time series
			case 2:
				var type = "";
				if(wellInfo[0]["w_type"] != "N") {
					type = " <i>(";
					type += wellInfo[0]["w_type"] === "PRODUCER" ? "Producer" : "Injector";
					type += ")</i>";
				}

				$visualizationTitle[0].innerHTML = timeSeriesTitle + "<b>" + $timeSeriesSelection[0][$timeSeriesSelection[0].selectedIndex].label + "</b>" + " - " + $timeSeriesUwi[0].value + type;

				$visualizationSubtitle[0].innerHTML = "";

				if($timeSeriesSelection[0].value === "sor") {
					var pairType = wellInfo[0]["w_type"] === "PRODUCER" ? "Injector" : "Producer";
					var pairUwi = validPairInfo["w_uwi"];

					$visualizationSubtitle[0].innerHTML = "<i>Pair " + pairType + " - " + pairUwi + "</i>";
				}
				break;
			default:
				console.log("No option selected!");
				break;
		}
	}

	$clearVisualizationButton.on("click", function() {
		self.clearVisualization(true);
	});

	VisualizationView.prototype.clearVisualization = function(removeAll) {
		$pieChartSelection[0].value = "none";
		$barChartSelection[0].value = "none";
		$timeSeriesSelection[0].value = "none";
		$visualizationTitle[0].innerHTML = "";
		$visualizationSubtitle[0].innerHTML = "";
		if(removeAll === true) {
			$timeSeriesUwi[0].value = "";
			$(".time-series-uwi-msg").remove();
		}
		self.visualizationController.removeCurrentChart();
	};

	function appendInfo(wellInfo) {
		var found = wellInfo != undefined && wellInfo != null && wellInfo.length > 0;

		$(".time-series-uwi-msg").remove();
		var divToAppend = '#time-series-uwi-selection';

		var message = found ? "Well found" : "Well not found";
		var id = found ? "uwi-found-msg" : "uwi-not-found-msg";

		var typeLabel = "";
		if(wellInfo != undefined && wellInfo != null && wellInfo[0] != null) {
			var typeValue = wellInfo[0]["w_type"] === "N" ? "Not defined" : wellInfo[0]["w_type"][0] + wellInfo[0]["w_type"].substr(1).toLowerCase();
			typeLabel = "<label id=\"well-type-msg\" class=\"time-series-uwi-msg\">" + typeValue + "</label>";
		}

		var label = "<label id=" + id + " class=\"time-series-uwi-msg\"><b>" + message + "</b></label>";
		$(label + typeLabel).appendTo(divToAppend);

		return found;
	}

	var openVisualization = function() {
		$(".open-visualization").magnificPopup({
			type:'inline',
			midClick: true, // Allow opening popup on middle mouse click. Always set it to true if you don't provide alternative source in href.
			removalDelay: 500,
			items: [
				{
					src: '#info-visualization',
					type: 'inline'
				}
			],
			callbacks: {
				beforeOpen: function() {
					this.st.mainClass = this.st.el.attr('data-effect');
				}
			},
			fixedContentPos: true
		});
	};
	openVisualization();

	/*
	 * Allows the accordion in the control panel to be collapsible.
	 */
	visualizationAccordion.accordion({
		collapsible: true,
		heightStyle: "content"
	});

	(typeof exports !== "undefined" && exports !== null ? exports : window).VisualizationView = VisualizationView;
}).call(this);