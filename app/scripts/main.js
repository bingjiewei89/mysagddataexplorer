/*--------------------------------------------------------------------------------
 Author: robinbesson

 petroleum-explorer

 =============================================================================
 Filename: Main.js
 =============================================================================
 Creates all the used classes (controllers and views).
 -------------------------------------------------------------------------------*/

function getAllWellsWithAverageStatistics() {
	var result = [];
	$.ajax({
		url: '/getAllWellsWithAverageStatistics',
		dataType:'json',
		async: false,
		success: function(data) {
			result = data;
		}
	});

	return result;
}

jQuery(document).ready(function ($) {
	// Load the wells with average statistics
	var wellsWithStatistics = getAllWellsWithAverageStatistics();

	/*
	 * The data set is retrieved from the database from the map-canvas script.
	 * It can be used in the other parts of the system, avoiding having to reload everything.
	 */
	var myMapCanvasController = new MapCanvasController();
	var dataSet = myMapCanvasController.getDataSet();

	var mySearchController = new SearchController(dataSet, []);
	var mySearchView = new SearchView(mySearchController, myMapCanvasController);

	var $searchQueryForm = $(".search-form form"),
		$searchQueryInput = $($searchQueryForm.find("input[type='search']"));
	mySearchView.listenKeyboard($searchQueryInput, $searchQueryForm);

	var $fullTableContainer = $(".search-results-table");
	var myTableController = new FullTable(mySearchController, myMapCanvasController, $fullTableContainer);
	myMapCanvasController.setFullTable(myTableController);

	var myExportController = new ExportController(myTableController);
	var myExportView = new ExportView(myExportController);

	var myVisualizationController = new VisualizationController(myMapCanvasController, wellsWithStatistics);
	var myVisualizationView = new VisualizationView(myVisualizationController, myTableController);

	var myPolygonSelection = new PolygonSelection(myMapCanvasController, mySearchController);

	var myClassificationController = new ClassificationController(myMapCanvasController, wellsWithStatistics);
	var myClassificationView = new ClassificationView(myClassificationController);

	// Hovering effect on logo
	var groupLogoLink = $("#group-logo-link");
	var groupLogo = $("#group-logo");
	groupLogo.hover(
		function() {
			// Mouse enter
			groupLogo[0].style.opacity = 1.0;
		},
		function() {
			// Mouse leave
			groupLogo[0].style.opacity = 0.5;
		}
	);
});