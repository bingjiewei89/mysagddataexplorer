
/*------------------------------------------------------------------------------
	Author: Rodrigo Silva

	petroleum-explorer

	=============================================================================
	Filename: export-view.js
	=============================================================================
	This file captures the user input and calls the appropriate function from the
	export-controller to generate the string representing the csv.
-------------------------------------------------------------------------------*/

(function () {

	var $fileNameTextBox = $('#fileName');
	var $exportButton = $('#exportButton');
	var self;

	var ExportView;
	ExportView = function (exportController){
		this.exportController = exportController;
		self = this;
		$fileNameTextBox[0].placeholder = this.exportController.generateDefaultFileName();
	};

	$fileNameTextBox.on("keyup", function (e) {
		// Removing all invalid characters for the file name
		this.value = self.exportController.removeInvalidCharacters(this.value);
	});

	$exportButton.on("click", function(e) {
		// Checking if the given file name is valid
		var actualFileName = self.exportController.validateFileName($fileNameTextBox[0].value);

		// Since the file name is now well defined, the values to be exported can be collected.
		var data = self.exportController.getDataToExport();

		// Export everything
		self.exportController.exportData(actualFileName, data);

		// Just in case, prevent default behaviour
		e.preventDefault();

		// And finally, clean the file name text field
		$fileNameTextBox[0].value = "";
	});

	(typeof exports !== "undefined" && exports !== null ? exports : window).ExportView = ExportView;
}).call(this);