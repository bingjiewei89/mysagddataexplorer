
/*--------------------------------------------------------------------------------
	Author: Bingjie Wei

	petroleum-explorer

	=============================================================================
	Filename: classification-view.js
	=============================================================================
	View class of the classification module.
-------------------------------------------------------------------------------*/
(function () {

	// Controlling the active item of the accordion
	var optionAccordion = 0;	// Variable for handling accordion option
	(function () {
		$(function () {
			var active;
			active = function () {
				return classificationAccordion.on("click", function () {
					optionAccordion = $("#classificationAccordion").accordion( "option", "active" );
				});
			};
			active();
		});
	}).call(this);

	var content = $("#classificationContent");
	var classificationAccordion = content.find("#classificationAccordion");
	var myClassificationOnOffSwitch = $('#myclassificationonoffswitch');
	var categoricalSelection = $('#classification-categorical-fields');
	var numericalSelection = $('#classification-numerical-fields');
	var classificationMethods = $("input[name=classification-method]:radio");
	var classesNumberSelection = $("#classes-number");
	var clustersNumberSelection = $("#clusters-number");
	var clusterCheckboxesGrid = $(".checkbox-grid");
	var clusterCheckboxes = clusterCheckboxesGrid.find("input[type=\"checkbox\"]");
	var associationRuleButton = $("#association-rule-button");

	var ClassificationView;
	var self;

	// The "constructor" of ClassificationView. When this object is created, this code is executed.
	ClassificationView = function(classificationController) {
		this.classificationController = classificationController;
		self = this;
	};

	// Controlling the on/off button to activate and deactivate the classification
	myClassificationOnOffSwitch.on("change", function() {
		var isChecked = myClassificationOnOffSwitch[0].checked;
		setDisableFields(!isChecked);
		if(isChecked === false) {
			clearAllOptions();
		}
	});

	// Auxiliar function to disable/enable all the fields related to classification
	function setDisableFields(isDisabled) {
		categoricalSelection[0].disabled = isDisabled;
		numericalSelection[0].disabled = isDisabled;
		classesNumberSelection[0].disabled = isDisabled;
		clustersNumberSelection[0].disabled = isDisabled;
		associationRuleButton[0].disabled = isDisabled;

		for(var i=0; i<classificationMethods.length; i++) {
			classificationMethods[i].checked = false;
			classificationMethods[i].disabled = isDisabled;
		}

		for(var i=0; i<clusterCheckboxes.length; i++) {
			clusterCheckboxes[i].checked = false;
			clusterCheckboxes[i].disabled = isDisabled;
		}
	}

	// Clears all the options (fields and map) related to classification
	function clearAllOptions() {
		$("#classification-legend-control").remove();

		clearCategoricalClassification();
		clearNumericalClassification();
		clearKMeans();

		// Reset the pins on the map
		self.classificationController.resetPins();
		// Remove the created rules
		self.classificationController.removeAssociationRules();
	}

	/*
	 * Function to classify the wells. The method will depend on the option selected by the user.
	 * The accordion options are:
	 * 0 - categorical classification; 1 - numerical classification; 2 - k-means; 3 - association rule mining
	 */
	function classifyWells() {
		switch(optionAccordion) {
			case 0:
				if(categoricalSelection[0].value != 'none') {
					var attrSelection = categoricalSelection[0].value;
					var attrName = categoricalSelection[0]["selectedOptions"][0]["innerText"];
					self.classificationController.classifyWellsByCategory(attrSelection, attrName);

					createCategoricalLegendEvent();
					clearOtherFields();
				} else {
					clearAllOptions();
				}
				break;
			case 1:
				/*
				 * We check if the inputs are different than 'none' before calling this function.
				 * Therefore, there's no need to check them again.
				 */
				var attrSelection = numericalSelection[0].value;
				var classesNumber = classesNumberSelection[0].value;
				var attrName = numericalSelection[0]["selectedOptions"][0]["innerText"];

				var method = '';
				for(var i=0; i<classificationMethods.length; i++) {
					if(classificationMethods[i].checked === true) {
						method = classificationMethods[i].value;
						break;
					}
				}
				self.classificationController.classifyWellsByNumericalValues(attrSelection, classesNumber, attrName, method);

				createCategoricalLegendEvent();
				clearOtherFields();
				break;
			case 2:
				/*
				 * We check if the inputs are different than 'none' before calling this function.
				 * Therefore, there's no need to check them again.
				 */
				var checkedAttributes = [];
				for(var i=0; i<clusterCheckboxes.length; i++) {
					if(clusterCheckboxes[i].checked === true) {
						checkedAttributes.push({
							value: clusterCheckboxes[i].value,
							name: clusterCheckboxes[i].name
						});
					}
				}

				self.classificationController.clusterKMeans(checkedAttributes, clustersNumberSelection[0].value);

				createCategoricalLegendEvent();
				clearOtherFields();
				break;
			case 3:
				clearAllOptions();
				self.classificationController.addAssociationRules();
				break;
			default:
				console.log("No option selected!");
				clearAllOptions();
				break;
		}
	}

	/*
	 * Clears the fields of the other methods
	 * e.g. if the numerical classification is selected, all the other fields (categorical, k-means, and ARM) will be cleared.
	 */
	function clearOtherFields() {
		switch(optionAccordion) {
			// Categorical classification
			case 0:
				clearNumericalClassification();
				clearKMeans();
				clearAssociationRuleMining();
				break;
			// Numerical classification
			case 1:
				clearCategoricalClassification();
				clearKMeans();
				clearAssociationRuleMining();
				break;
			// K-means
			case 2:
				clearCategoricalClassification();
				clearNumericalClassification();
				clearAssociationRuleMining();
				break;
			// Association Rule Mining
			case 3:
				clearCategoricalClassification();
				clearNumericalClassification();
				clearKMeans();
				break;
			default:
				console.log("No option selected!");
				clearAllOptions();
				break;
		}
	}

	// Clears the categorical classification fields
	function clearCategoricalClassification() {
		categoricalSelection[0].value = 'none';
	}

	// Clears the numerical classification fields
	function clearNumericalClassification() {
		classesNumberSelection[0].value = 'none';
		numericalSelection[0].value = 'none';
		for(var i=0; i<classificationMethods.length; i++) {
			if(classificationMethods[i].checked === true) {
				classificationMethods[i].checked = false;
				break;
			}
		}
	}

	// Clears the k-means fields
	function clearKMeans() {
		for(var i=0; i<clusterCheckboxes.length; i++) {
			clusterCheckboxes[i].checked = false;
		}
		clustersNumberSelection[0].value = 'none';
	}

	// Clears the association rule mining fields
	function clearAssociationRuleMining() {
		$("#association-rule-box").remove();
	}

	// Event that will be triggered when the categorical selection changes
	categoricalSelection.on("change", function() {
		classifyWells();
	});

	// Event that will be triggered when the numerical selection changes
	numericalSelection.on("change", function() {
		if(numericalSelection[0].value === 'none') {
			clearAllOptions();
		} else {
			checkNumericalClassificationInputs();
		}
	});

	// Event that will be triggered when the number of classes related to the numerical selection changes
	classesNumberSelection.on("change", function() {
		if(classesNumberSelection[0].value === 'none') {
			clearAllOptions();
		} else {
			checkNumericalClassificationInputs();
		}
	});

	// Event that will be triggered when the classification method selection changes
	classificationMethods.on("change", function() {
		checkNumericalClassificationInputs();
	});

	// Check the numerical classification fields and classify wells if the inputs are ok
	function checkNumericalClassificationInputs() {
		var radioButtonChecked = false;
		for(var i=0; i<classificationMethods.length; i++) {
			if(classificationMethods[i].checked === true) {
				radioButtonChecked = true;
				break;
			}
		}

		if (numericalSelection[0].value != 'none' && radioButtonChecked && classesNumberSelection[0].value != 'none'){
			classifyWells();
		}
	}

	// Event that will be triggered when the cluster checkboxes change
	clusterCheckboxes.on("change", function() {
		// Clear the number of clusters to avoid waste of processing when selecting all attributes
		clustersNumberSelection[0].value = 'none';

		var isChecked = false;
		for(var i=0; i<clusterCheckboxes.length; i++) {
			if(clusterCheckboxes[i].checked === true) {
				isChecked = true;
				break;
			}
		}

		if(isChecked === false) {
			clearAllOptions();
		}
	})

	// Event that will be triggered when the number of cluster selection changes
	clustersNumberSelection.on("change", function() {
		checkClusterizationInputs();
	});

	// Check the clusterization (k-means) fields and classify wells if the inputs are ok
	function checkClusterizationInputs() {
		var isChecked = false;
		for(var i=0; i<clusterCheckboxes.length; i++) {
			if(clusterCheckboxes[i].checked === true) {
				isChecked = true;
				break;
			}
		}

		if(isChecked && clustersNumberSelection[0].value != 'none') {
			classifyWells();
		}
	}

	// Global event that should be triggered every time the wells on the map changes
	$("body").on("WellsUpdated", function() {
		if(myClassificationOnOffSwitch[0].checked === true) {
			classifyWells();
		}
	});

	// Creates the click event for the pins of the created legends
	function createCategoricalLegendEvent() {
		$(".legend-pin").on("click", function(event) {
			// Getting the index of the pin clicked
			var legendIndex = event["currentTarget"]["id"].substr(11);

			self.classificationController.emphasizeMarkersOfCategory(legendIndex);
		});
	}

	// Event that will be triggered when the ARM button is clicked
	$('#association-rule-button').on("click",function() {
		classifyWells();
	});

	/*
	 * Allows the accordion in the control panel to be collapsible.
	 */
	classificationAccordion.accordion({
		collapsible: true,
		heightStyle: "content"
	});

	(typeof exports !== "undefined" && exports !== null ? exports : window).ClassificationView = ClassificationView;
}).call(this);