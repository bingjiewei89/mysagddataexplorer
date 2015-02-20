/*--------------------------------------------------------------------------------
 Author: Rodrigo Silva

 petroleum-explorer

 =============================================================================
 Filename: full-table.js
 =============================================================================
 Contains all the logic to create, display, update and format data in a table (handsontable).
 -------------------------------------------------------------------------------*/

(function () {
	var FullTable;
	var self;
	// Default initial values for the dialog position
	var left = null;
	var top = null;
	// Default initial values for width and height
	var width = 650;
	var height = 400;

	function populateColumnFilter(tableColumns, html) {
		for (var i = 0; i < tableColumns.length; i++) {
			html += '<option>' + i + tableColumns[i].sTitle + '</option>';
		}
		var $columnSelect = this.$columnFilter.find("#tableColumnFilter").append(html);
	}

	function addParameterOption(index, type) {
		var labelForFilter = '<label value="'+$(this)[0].value+'">'+$(this).find("option:selected").text()+'</label></br>';

		var removeFilterOption = '<div id="'+index+'" class="filterBtnParent"><button type="button" class="filterButton minusButton"><i class="icon-minus"></i></button></div>';

		var constraintSelectType;
		if(type == "String") {
			constraintSelectType = '<select id="'+index+'" class="filterConstraintField"><option value="matches">Matches</option><option value="contains">Contains</option></select></br>';
		}
		else if(type == "Number") {
			constraintSelectType = '<select id="'+index+'" class="filterConstraintField"><option value="gt">Is Greater Than</option><option value="lt">Is Less Than</option><option value="eq">Is Equal To</option></select></br>';
		}

		var inputField = '<input id="'+index+'" class="filterInputField"><hr>';

		$('<div id="'+index+'" class="filterParameter">'+removeFilterOption+labelForFilter+constraintSelectType+inputField+'</div>').appendTo($(this).parent());

		var $removeFilterButton = $("#" + index).find(".filterBtnParent");
		$removeFilterButton.on("click", function() {
			$removeFilterButton.parent().remove();
			$("body").trigger("filterParameterRemoved");
		});
	}

	/**
	 * @class FullTable
	 * @param SearchController with search results
	 * @param $tableContainer {*|jQuery} object for placeholder for table data
	 */
	FullTable = (function () {
		function FullTable(SearchController, MapCanvasController, $fullTableResultsContainer) {
			self = this;
			this.MapController = MapCanvasController;
			this.SearchController = SearchController;
			this.$tableContainer = $fullTableResultsContainer.find(".full-results-table");
			this.$contentContainer = $fullTableResultsContainer.find(".full-table-content");
			this.$columnFilter = this.$contentContainer.find(".filter-form");
			this.toggleButton = $fullTableResultsContainer.find(".toggle-table");
			this.$filterParameter = $fullTableResultsContainer.find("#tableColumnFilter");
			this.$addConstraint = $fullTableResultsContainer.find("#add-constraint");

			/* Making the full table toggle button visible after everything is loaded.
			 * This avoids viewing the button while the website is being loaded.
			 */
			this.toggleButton[0].style.display = "inline";

			this.initSearchResults = this.SearchController.resultSet;

			this.displayHandsOnTable();
			this.listenChanges();
			this.filterChanges();
			this.listenToggle();
			this.initColumnFilter();
			this.listenForInput(this.$columnFilter);
			this.listenParameterRemoved(this.$columnFilter);
			this.listenParameterChanged(this.$filterParameter, this.$addConstraint);
			this.findFilterQuery([]);
			closeDialog(this, false);
		}

		/*
		 * Function to open the content container dialog with or without fade in.
		 * A verification on the toggle button is done, in order to keep the consistency.
		 */
		function openDialog(_this, withFadeIn) {
			if (_this.toggleButton.hasClass("active") === false) {
				_this.toggleButton.toggleClass("active");
			}

			// Making sure that the dialog position will be the same as before!
			_this.$contentContainer.dialog("option", "height", height);
			_this.$contentContainer.dialog("option", "width", width);
			_this.$contentContainer.dialog("option", "position", [left,top]);

			if(withFadeIn == true) {
				return _this.$contentContainer.dialog("open", _this.$contentContainer.fadeIn());
			} else {
				return _this.$contentContainer.dialog("open");
			}
		}

		/*
		 * Function to close the content container dialog with or without fade out.
		 * A verification on the toggle button is done, in order to keep the consistency.
		 */
		function closeDialog(_this, withFadeOut) {
			if (_this.toggleButton.hasClass("active") === true) {
				_this.toggleButton.toggleClass("active");
			}

			if(withFadeOut == true) {
				return _this.$contentContainer.dialog("close", _this.$contentContainer.fadeOut());
			} else {
				return _this.$contentContainer.dialog("close");
			}
		}

		FullTable.prototype.closeFullTableDialog = function() {
			closeDialog(this, false);
		};

		/*
		 * Indicates which data belongs to each column, the type of it and some other properties.
		 * Returns all the columns for the handsontable API.
		 */
		function getColumns() {
			var columns =
				[
					{
						data: "Selected",
						type: "checkbox",
						readOnly: false
					},
					{
						data: "UWI"
						//simple text, no special options
					},
					{
						data: "WellName"
						//simple text, no special options
					},
					{
						data: "WellOperator"
						//simple text, no special options
					},
					{
						data: "WellProject"
						//simple text, no special options
					},
					{
						data: "WellStatus"
						//simple text, no special options
					},
					{
						data: "WellProvince"
						//simple text, no special options
					},
					{
						data: "WellClass"
						//simple text, no special options
					},
					{
						data: "WellDrillersTotalDepth",
						type: "numeric",
						format: "0.000"
					},
					{
						data: "WellType"
						//simple text, no special options
					},
					{
						data: "Pad"
						//simple text, no special options
					},
					{
						data: "BottomLongitude"
						//number, but precision is important in coordinates
					},
					{
						data: "BottomLatitude"
						//number, but precision is important in coordinates
					},
					{
						data: "TopLongitude"
						//number, but precision is important in coordinates
					},
					{
						data: "TopLatitude"
						//number, but precision is important in coordinates
					}
				];

			return columns;
		}

		/*
		 * Returns all the headers name on the table
		 */
		function getColumnHeaders() {
			var headers =
				[
					"",
					"UWI",
					"Well Name",
					"Well Operator",
					"Well Project",
					"Well Status",
					"Well Province",
					"Well Class",
					"Well Drillers Total Depth",
					"Well Type",
					"Pad",
					"Bottom Longitude",
					"Bottom Latitude",
					"Top Longitude",
					"Top Latitude"
				];

			return headers;
		}

		/*
		 * Returns a list with all the values that are significant to be displayed on the table
		 */
		function getSignificantAttributesData(searchResults) {
			var data = [];

			for(var i=0; i<searchResults.length ; i++){
				data.push(
					{
						Selected: false,
						UWI: searchResults[i]["w_uwi"],
						WellName: searchResults[i]["w_name"],
						WellOperator: searchResults[i]["w_operator"],
						WellProject:searchResults[i]["w_project"],
						WellStatus: searchResults[i]["w_current_status"],
						WellProvince: searchResults[i]["w_province"],
						WellClass: searchResults[i]["w_class"],
						WellDrillersTotalDepth: searchResults[i]["w_drillers_total_depth"],
						WellType: searchResults[i]["w_type"],
						Pad: searchResults[i]["w_pad"],
						BottomLongitude: searchResults[i]["w_bottom_lng"],
						BottomLatitude: searchResults[i]["w_bottom_lat"],
						TopLongitude: searchResults[i]["w_top_lng"],
						TopLatitude: searchResults[i]["w_top_lat"]
					}
				);
			}

			return data;
		}

		FullTable.prototype.listenForInput = function($columnFilter) {
			this.$columnFilter.on("keyup", (function (e) {
				return function () {
					getAndFilterQueries();
				}
			})(this));

			this.$columnFilter.children().on("change", function (e){
				if(e.target.getAttribute("name") != "tableColumnFilter") {
					$("body").trigger("filterParameterRemoved");
				}
			});
		};

		FullTable.prototype.listenParameterRemoved = function ($columnFilter) {
			return $("body").on("filterParameterRemoved", (function (_this) {
				return function () {
					getAndFilterQueries();
				};
			})(this));
		};

		FullTable.prototype.listenParameterChanged = function ($filterParameter, $addConstraint) {
			return $filterParameter.on("change", (function (_this) {
				return function () {
					if($filterParameter != undefined && $filterParameter != null && $filterParameter.length > 0) {
						var tempSelect = $filterParameter[0];
						if(tempSelect != undefined && tempSelect != null) {
							if($addConstraint != undefined && $addConstraint != null && $addConstraint.length > 0) {
								var tempAddButton = $addConstraint[0];
								if(tempAddButton != undefined && tempAddButton != null) {
									if(tempSelect.selectedIndex === 0) {
										tempAddButton.disabled = true;
									} else {
										tempAddButton.disabled = false;
									}
								}
							}
						}
					}
				};
			})(this));
		};

		/*
		 * Goes through all defined filters, generate the filter query and filter results.
		 */
		var filterQueryArray = [];
		function getAndFilterQueries() {
			var tempFilterQueryArray = [];
			var filterParameters = self.$columnFilter.find(".filterParameter");
			for(var i=0; i<filterParameters.length; i++) {

				var labelValue = filterParameters.find("label")[i].getAttribute("value");
				var constraintValue = filterParameters.find("select")[i].value;
				var inputValue = filterParameters.find("input")[i].value;

				tempFilterQueryArray.push([labelValue, constraintValue, inputValue]);
			}

			var areEqual = true;
			if(filterQueryArray.length === tempFilterQueryArray.length) {
				for(var i=0; i<filterQueryArray.length; i++) {
					for(var j=0; j<filterQueryArray[i].length; j++) {
						if(filterQueryArray[i][j] != tempFilterQueryArray[i][j]) {
							areEqual = false;
							break;
						}
					}

					if(areEqual === false) {
						break;
					}
				}
			} else {
				areEqual = false;
			}

			if(areEqual === false) {
				filterQueryArray = tempFilterQueryArray;
				self.findFilterQuery(filterQueryArray);
			}
		}

		FullTable.prototype.findFilterQuery = function(query) {
			var searchResultSet = this.SearchController.resultSet;
			var filterResultSet = [];

			for(var i=0; i<searchResultSet.length;i++) {
				var boolPush = true;

				for(var j = 0; j < query.length; j++) {
					if(query[j][2] != "") {

						switch(query[j][1]) {
							case "matches":
								if((searchResultSet[i][query[j][0]].toUpperCase()) != ((query[j][2]).toUpperCase())) {
									boolPush = false;
								}
								break;
							case "contains":
								if((searchResultSet[i][query[j][0]].toUpperCase()).search((query[j][2]).toUpperCase()) < 0) {
									boolPush = false;
								}
								break;
							case "gt":
								if(searchResultSet[i][query[j][0]] <= parseFloat(query[j][2])) {
									boolPush = false;
								}
								break;
							case "lt":
								if(searchResultSet[i][query[j][0]] >= parseFloat(query[j][2])) {
									boolPush = false;
								}
								break;
							case "eq":
								if(searchResultSet[i][query[j][0]] != parseFloat(query[j][2])) {
									boolPush = false;
								}
								break;
							default:
								break;
						}
					}
				}
				if(boolPush) {
					filterResultSet.push(searchResultSet[i]);
				}
			}

			this.initSearchResults = filterResultSet;
			this.MapController.plotResults(filterResultSet);
			$("body").trigger("FilterUpdated");
			// Update classification (if on)
			$("body").trigger("WellsUpdated");
		};

		FullTable.prototype.displayHandsOnTable = function() {
			var _this = this;
			// Removing the old container
			this.$tableContainer.remove();

			if(typeof(this.SearchController) != "undefined") {
				if (this.initSearchResults.length > 0) {
					var searchResults = this.initSearchResults;
					var self = this;
					var data = getSignificantAttributesData(searchResults);
					var columns = getColumns();
					var columnsHeaders = getColumnHeaders();

					// The checkbox was added inside the table div to allow customization of style and event
					this.$tableContainer = $(
						'<div id="full-results-table" class="handsontable">' +
							'<input type=\"checkbox\" id=\"checkAll\"/>' +
							'</div>').appendTo(this.$contentContainer);

					// Definition of the table itself
					this.$tableContainer.handsontable({
						data: data,
						colHeaders: columnsHeaders,
						columns: columns,
						width: function(){
							return ($(".full-table-content").width() - $(".filter-form").width() - 13);
						},
						height: function(){
							return ($(".full-table-content").height() - 13);
						},
						readOnly: true,
						columnSorting: true,
						currentRowClassName: 'currentRow',
						fixedColumnsLeft: 1
					});

					this.$tableContainer.handsontable('getInstance').addHook('afterChange', function() {
						updateSelectedRows(this, false, self);
					});

					this.$tableContainer.on('mouseup', '#checkAll', function (event) {
						var isChecked = !$(this).is(':checked');
						checkAll(isChecked, self.$tableContainer.handsontable('getInstance'));
					});

					this.$contentContainer.dialog({
						title: 'Detailed Results',
						id: 'full-table-dialog',
						draggable: true,
						resizable: true,
						modal : true,
						autoOpen: true,
						width: width,
						height: height,
						position: [left, top],
						dragStop: function( event, ui ) { setDialogSizeAndPosition(); },
						resizeStop: function(event, ui ) { setDialogSizeAndPosition(); }
					});

					// If the user selected some rows before, they need to be kept as selected after the table is updated.
					updateSelectedRows(this.$tableContainer.handsontable('getInstance'), true, self);
				}
			}
		};

		function setDialogSizeAndPosition() {

			// The height, width and the position of the dialog need to be the same as before
			var tempDialog = $(".ui-dialog");

			if(tempDialog != undefined && tempDialog != null && tempDialog.length > 0) {
				tempDialog = tempDialog[0];

				if(tempDialog != undefined && tempDialog != null) {
					// It is unlikely to have negative values, but just to ensure..
					if(tempDialog.offsetHeight >= 0) {
						height = tempDialog.offsetHeight;
					}
					if(tempDialog.offsetWidth - 2 >= 0) {
						width = tempDialog.offsetWidth - 2;
					}
					if(tempDialog.offsetLeft >= 0) {
						left = tempDialog.offsetLeft;
					}
					if(tempDialog.offsetTop >= 0) {
						top = tempDialog.offsetTop;
					}
				}
			}
		}

		/*
		 * Checks or unchecks all the rows in the table
		 */
		function checkAll(isChecked, instance) {
			var rows = instance.countRows();
			var changes = [];
			// Storing all changes in array to do a bulk change
			for(var row=0; row<rows; row++) {
				changes.push([row, 0, isChecked]);
			}
			instance.setDataAtCell(changes);
		}

		/*
		 * Function responsible to update the map with the selected rows
		 */
		function updateSelectedRows(instance, isTableUpdated, ref) {
			var allData = instance.getData();
			var currentlySelectedRows = [];

			for(var i=0; i<allData.length; i++) {
				// If the row was selected before, it must keep selected now.
				if(isTableUpdated && $.inArray(allData[i]["UWI"], ref.selectedRows) >= 0) {
					allData[i]["Selected"] = true;
				}

				if(allData[i]["Selected"] === true) {
					// The UWI should be enough to identify the selected wells
					// The string below must be the same as in the table (UWI, not the full name)
					currentlySelectedRows.push(allData[i]["UWI"]);
				}
			}

			ref.selectedRows = currentlySelectedRows;

			if(ref.MapController != undefined && ref.MapController != null) {
				ref.MapController.highlightWells(ref.selectedRows, false);
			}
		}

		/*
		 * Returns the values in the table
		 */
		FullTable.prototype.getCurrentTableData = function() {
			return this.$tableContainer.handsontable('getInstance').getData();
		};

		/*
		 * Toggles selection of the row that matches the UWI of the element
		 */
		FullTable.prototype.toggleRowsSelection = function(element) {
			var table = this.$tableContainer.handsontable('getInstance');
			// The wells are identified by the UWI
			var index = $.inArray(element, table.getDataAtProp("UWI"));
			if(index >= 0) {
				var isSelected = table.getDataAtRowProp(index, "Selected");
				table.setDataAtRowProp(index, "Selected", !isSelected);
			}
		};

		/*
		 * Returns the column headers as presented in the table
		 */
		FullTable.prototype.getCurrentTableHeaders = function() {
			return this.$tableContainer.handsontable('getInstance').getColHeader();
		};

		/**
		 * Toggle table update on 'ResultsUpdated' event
		 * @returns {*|jQuery}
		 */
		FullTable.prototype.listenChanges = function () {
			return $("body").on("ResultsUpdated", (function (_this) {
				return function () {
					_this.initSearchResults = _this.SearchController.resultSet;
					getAndFilterQueries();
					_this.displayHandsOnTable();

					closeDialog(_this, false);
				};
			})(this));
		};

		FullTable.prototype.filterChanges = function () {
			return $("body").on("FilterUpdated", (function (_this) {
				return function () {
					_this.displayHandsOnTable();
				};
			})(this));
		};


		/**
		 * Toggle full table data when clicking the button
		 * @returns {*}
		 */
		FullTable.prototype.listenToggle = function () {
			return this.toggleButton.on("click", (function (_this) {
				return function () {
					if ($(this).hasClass("active")) {
						$(this).toggleClass("active");
						$('#results-table').slideToggle();
						// The other search fields are disabled (still don't know what is causing that)
						document.getElementById("status").disabled = false;
						return closeDialog(_this, true);
					}
					else {
						$(this).toggleClass("active");
						$('#results-table').slideToggle();
						// The other search fields are disabled (still don't know what is causing that)
						document.getElementById("status").disabled = true;
						return openDialog(_this, true);
					}
				};
			})(this));
		};

		/**
		 * Add individual option elements for each column in full table
		 */
		FullTable.prototype.initColumnFilter = function () {

			var i = 0;

			if (this.$columnFilter.length > 0) {
				//populateColumnFilter.call(this, tableColumns, html);
				var $columnSelectFilter = this.$columnFilter.find("#tableColumnFilter");
				var $addConstraintButton = this.$columnFilter.find("#add-constraint");
				var $filterParameterRef = this.$filterParameter;

				// Check when the select element is changed, and NOT the default is selected, then add constraint filter
				$addConstraintButton.on("click", function() {
					switch($columnSelectFilter.val()) { // the current selected <option>
						case "0":
							break;
						// String Options
						case "w_uwi":
						case "w_name":
						case "w_operator":
						case "w_project":
						case "w_current_status":
						case "w_province":
						case "w_class":
						case "w_type":
						case "w_pad":
							i++;
							addParameterOption.call($columnSelectFilter, i, "String");
							break;
						default: // Numeric Options
							i++
							addParameterOption.call($columnSelectFilter, i, "Number");
							break;
					}

					// Resetting the selected value and triggering the proper event
					$columnSelectFilter.val(0);
					$filterParameterRef.change();
				});
			}
		}

		return FullTable;

	})();

	(typeof exports !== "undefined" && exports !== null ? exports : window).FullTable = FullTable;

}).call(this);