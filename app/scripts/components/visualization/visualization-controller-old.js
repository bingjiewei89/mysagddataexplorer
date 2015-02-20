/*--------------------------------------------------------------------------------
 Author: Shawn Eastwood


 petroleum-explorer

 =============================================================================
 Filename: visualization_controller.js
 =============================================================================
 Implementation of Oil_well_filter

 Oil_well_filter is provided upon construction with a data set (array) and a flag that indicates if the data is or isn't discrete.

 The method "get_visualization_method" will populate the internal fields of "Oil_well_filter" with the data necessary to construct an effective visual representation such as a histogram or a pie chart. The visualization method type which is "pie-chart" or "histogram" is the return value of "get_visualization_method".
 -------------------------------------------------------------------------------*/

(function () {
	var Oil_well_filter;

	Oil_well_filter = (function () {

		function Oil_well_filter(oil_data, discrete_flag) {
			this.oil_data = oil_data; //oil_data is an array that stores the data that needs to be visualized. The data set should never be empty.
			this.discrete_flag = discrete_flag; //discrete_flag is a boolean variable that is true if the data consists of discrete quantities and is false if otherwise.

			this.numofCategories = 0; //The number of categories in the histogram/pie-chart.
			this.categories = []; //An array that holds the categories of the histogram/pie-chart.
			this.category_counts = []; //An array that holds the number of occurrences of each category.

			this.visualization_method = ""; //visualization method is a string from {"histogram", "pie-chart"} that denotes the method of visualization that is to be used.
			this.start = 0; //For bar histograms, start will indicate the beginning point of the vertical axis. This will better emphasize absolute differences in quantity.
			this.end = 0; //For bar histograms, end will indicate the ending point of the vertical axis.

			this.startpoint = 0.0; //For continuous data, beginning denotes the value where the categories should begin.
			this.endpoint = 0.0; //For continuous data, end denotes the value where the categories should end.
			this.category_widths = 0.0; //For continuous data, category_widths denotes the width of each interval within which all quantities are given the same classification.

		}

		Oil_well_filter.prototype.get_visualization_method = function () {
			//Initialization:
			this.numofCategories = 0;
			this.categories = [];
			this.category_counts = [];

			var N = this.oil_data.length;

			if (N == 0) {
				return "Data set cannot be empty."; //Return an error if the data set is empty.
			}

			if (this.discrete_flag) {
				//If the data is discrete, determine the categories and frequencies.
				for (var i = 0;
					i < N;
					i++) {
					var element = this.oil_data[i];
					//Determine if element already exists in "categories".
					var category_index = -1;
					var j = 0; //Iterates through the already determined categories.
					while (category_index == -1 && j < this.numofCategories) {
						if (element == this.categories[j]) {
							category_index = j;
						}
						j++;
					}
					if (category_index != -1) {
						//If the category is found, increment the count.
						this.category_counts[category_index]++;
					}
					else {
						//Else add a new category.
						this.numofCategories++;
						this.categories.push(this.oil_data[i]);
						this.category_counts.push(1);
					}
				}
			}
			else {
				//If the data is continuous, we need to first find a useful category width:
				//We will find the minimum and maximum data points:
				var data_min = this.oil_data[0];
				var data_max = this.oil_data[0];
				for (var i = 1;
					i < N;
					i++) {
					if (this.oil_data[i] > data_max) {
						data_max = this.oil_data[i];
					}
					if (this.oil_data[i] < data_min) {
						data_min = this.oil_data[i];
					}
				}

				var data_interval = data_max - data_min;
				//The number of categories will be the square root of the number of data points (except when the interval is a single point):
				this.numofCategories = (data_interval > 0) ? Math.ceil(Math.sqrt(N)) : 1;
				this.category_widths = (this.numofCategories > 1) ? data_interval / (this.numofCategories - 1) : 0.01; //0.01 is the default width for a single category.
				//Now create the categories:
				this.startpoint = data_min - this.category_widths / 2; //The lowest category is centered on the lowest data point.
				this.endpoint = data_max + this.category_widths / 2; //The highest category is centered on the highest data point.
				//this.categories = new Array(this.numofCategories);
				for (var i = 0;
					i < this.numofCategories;
					i++) {
					var curr_lowerbound = this.startpoint + i * this.category_widths;
					var curr_upperbound = this.startpoint + (i + 1) * this.category_widths;
					this.categories[i] = "[" + curr_lowerbound + "," + curr_upperbound + ")";
					this.category_counts[i] = 0;
				}

				//We now classify the data.
				for (var i = 0;
					i < N;
					i++) {
					var element = this.oil_data[i];
					var category_index = Math.floor((element - this.startpoint) / this.category_widths);
					this.category_counts[category_index]++;
				}
			}

			//Find the maximum and minimum counts.
			max_count = this.category_counts[0];
			min_count = this.category_counts[0];
			for (var i = 1;
				i < this.category_counts.length;
				i++) {
				if (this.category_counts[i] > max_count) {
					max_count = this.category_counts[i];
				}
				if (this.category_counts[i] < min_count) {
					min_count = this.category_counts[i];
				}
			}

			var threshold = 1.0 //The the threshold of (max_count-min_count)/min_count above which the pie-chart will be used. Large values of (max_count-min_count)/min_count indicate great relative differences between the counts which makes the pie-chart a good choice.
			if (((max_count - min_count) / min_count >= threshold) || (min_count == 0)) {
				//Use the pie-chart
				this.visualization_method = "pie-chart";
			}
			else {
				//Use the histogram
				this.visualization_method = "histogram";
				//Find a useful starting point
				threshold = 0.5; //The threshold of (max_count-min_count)/min_count above which the starting point of vertical axis will be left at 0.
				if ((max_count - min_count) / min_count >= threshold) {
					//Relative differences can be seen without truncating the vertical axis from below.
					this.start = 0;
				}
				else {
					this.start = min_count - Math.floor((max_count - min_count) / threshold);
				}
				//Find a useful ending point
				this.end = max_count + 1;
			}

			return this.visualization_method;
		};

		Oil_well_filter.prototype.normalize_data = function(low_val, high_val) {
			// Return an error if the data is discrete.
			if (this.discrete_flag) {
				return "normalize_data: data cannot be discrete";
			}
			// Return an error if low_val exceeds high_val.
			if (low_val > high_val) {
				return "normalize_data: low_val cannot exceed high_val";
			}

			var N = this.oil_data.length;
			if (N == 0) {
				return []; //Return a new empty array if the data set is empty.
			}
			//Find the minimum and maximum values:
			var min = this.oil_data[0];
			var max = this.oil_data[0];
			for (var i = 1; i < N; i++) {
				if (this.oil_data[i] < min) {
					min = this.oil_data[i];
				}
				if (this.oil_data[i] > max) {
					max = this.oil_data[i];
				}
			}
			var data_out = [];
			//If min=max, then return an array with all values set to (low_val + high_val)/2
			if (min == max) {
				for (var i = 0; i < N; i++) {
					data_out[i] = (low_val + high_val) / 2;
				}
			}
			else { //If min != max, then the data can be scaled by the factor (high_val-low_val)/(max-min) without dividing by 0.
				for (var i = 0; i < N; i++) {
					data_out[i] = low_val + (high_val - low_val) * (this.oil_data[i] - min) / (max - min);
				}
			}
			return data_out;
		}

		return Oil_well_filter;

	})();

	// Export to the global scope.
	(typeof exports !== "undefined" && exports !== null ? exports : window).Oil_well_filter = Oil_well_filter;

}).call(this);