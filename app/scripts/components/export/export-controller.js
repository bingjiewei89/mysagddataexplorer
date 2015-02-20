/*--------------------------------------------------------------------------------
	Author: Rodrigo Silva

	petroleum-explorer

	=============================================================================
	Filename: export-controller.js
	=============================================================================
	This process and execute the commands from the view. It exports the file with
	the wells data.
-------------------------------------------------------------------------------*/

(function() {
	var ExportController;

	ExportController = (function() {
		/*
		 * Constructor for the export controller
		 */
		function ExportController(FullTable) {
			this.FullTable = FullTable;
		}

		/*
		 * Removing invalid characters in the file name
		 */
		ExportController.prototype.removeInvalidCharacters = function(fileName) {
			// The user cannot define a file name starting with space in the beginning...
			fileName = fileName.trimLeft();
			// ... or with invalid characters!
			fileName = fileName.replace(/[\\/:"*?<>|]+/g, '');

			return fileName;
		};

		/*
		 * Generates the default file name to export
		 * @returns {string}
		 */
		ExportController.prototype.generateDefaultFileName = function() {
			// Getting date to form the file name
			var date = new Date();

			// Getting current day, month and year
			var day = date.getDate();
			if((day+"").length == 1) {
				day = "0" + day;
			}

			// The getMonth function returns values from 0 to 11
			var month = date.getMonth() + 1;
			if((month+"").length == 1) {
				month = "0" + month;
			}
			var year = date.getFullYear();

			// yyyy-mm-dd (ISO 8601)
			var dateISO = year + "-" + month + "-" + day;

			return 'Petroleum-Explorer Wells ' + dateISO + '.csv';
		};

		/*
		 * Validates the file name given by the user
		 */
		ExportController.prototype.validateFileName = function(actualFileName) {
			if(actualFileName === undefined || actualFileName === null || actualFileName.trim().length === 0) {
				actualFileName = this.generateDefaultFileName();
			} else {
				// Checking if the file name provided has the right extension
				var extension = actualFileName.substring(actualFileName.length - 4);
				// If not, we put the right one
				if(extension.toLowerCase() != ".csv") {
					actualFileName += ".csv";
				}
			}

			return actualFileName;
		};

		/**
		 * Generates a string containing all the values of the current wells in a specific format to generate a csv file.
		 * @returns {string}
		 */
		ExportController.prototype.getDataToExport = function() {
			var allDataString = "";
			var lineBreak = "%0D%0A";
			var space = "%20";
			var formattedHeaders = [];
			var currentTableHeaders = this.FullTable.getCurrentTableHeaders();
			var currentTableData = this.FullTable.getCurrentTableData();

			// Removing the first header (related to the checkbox)
			currentTableHeaders.splice(0,1);

			// Removing the spaces among the headers
			for(var i=0; i<currentTableHeaders.length; i++) {
				formattedHeaders.push(currentTableHeaders[i].replace(/ /g,""));
			}

			// The first part is to store the headers..
			allDataString += currentTableHeaders.join() + "\n";

			// Then, the values of the wells for each header..
			for(var i=0; i<currentTableData.length; i++) {
				var tempString = "";
				for(var j=0; j<formattedHeaders.length; j++) {
					tempString += currentTableData[i][formattedHeaders[j]];

					if(j < formattedHeaders.length - 1) {
						tempString += ",";
					} else {
						tempString += "\n";
					}
				}
				allDataString += tempString;
			}

			// Now, we have to encode some special characters, as only a limited subset is allowed in URLs!
			allDataString = allDataString.replace(/ /g, space);
			allDataString = allDataString.replace(/\n/g, lineBreak);

			// Done!
			return allDataString;
		};

		/*
		 * Export all the data to a CSV file
		 */
		ExportController.prototype.exportData = function(fileName, data) {
			// Creating a temporary HTML link element (they support setting file names)
			var temp = document.createElement('a');
			// Creating the header of the csv file
			var data_type = 'data:application/vnd.ms-excel';
			// Setting the content of the file
			temp.href = data_type + ', ' + data;
			// Setting the file name
			temp.download = fileName;
			// Triggering the function
			temp.click();
		};

		return ExportController;
	})();

	(typeof exports !== "undefined" && exports !== null ? exports : window).ExportController = ExportController;

}).call(this);