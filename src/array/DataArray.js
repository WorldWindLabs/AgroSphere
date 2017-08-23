/*
 * Copyright (C) 2017 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 */
 /**
 * @exports DataArray
 */
define([
	],
	function() {
		'use strict';
		/**
		 *Constructs a special array that allows quick searches and functionality
		 *to constructing the plot and HTML. It should be noted that options 
		 *is an object  that may contain a number of parameters. In this project,
		 *the parameters used are as followed.
		 *
		 * - mode {integer}. Mainly used for filterBlanks function. 1 represents
		 * a total replacement to a desired value. 0 represents ignoring the 
		 * value outright.
		 * - HTML_ID {string}. A string with the desired id of the data set 
		 * when generating the HTML. For instance an ID of agri would most
		 * correspond to a data set involving agriculture.
		 * - HTML_Label {string}. A string which is used to display with regards
		 * to the HTML associated with.
		 * - Subdata {Array}. Essentially it is a set of data that would want 
		 * to be able to plot with. For instance, agricultural production and
		 * refugee data. Needs to be in a specific type (see main comment in 
		 * index)
		 *
		 *@alias DataArray
		 *@constructor
		 *@classdec
		 * 
		 */
		var DataArray = function(values, options) {
			this._values = values;
			this._options = options;
		}
		DataArray.prototype = Object.create(Object.prototype);
		Object.defineProperties(DataArray.prototype, {
			values: {
				get: function() {
					return this._values;
				},
				set: function(values) {
					this._values = values;
				}
			}, 	
			
			options: {
				get: function() {
					return this._options;
				},
				set: function(options) {
					this._options = options;
				}
			}
		});
		/**
		 *Returns the first object that matches the value for a given a parameter
		 @param {Value} value, the value you are looking for
		 @param {string} param_name, the parameter to search by
		 @return {Object} result, the object that matches the parameter. Else
			 return empty array
		 */
		DataArray.prototype.search = function(value, param_name) {
			var i = 0;
			var possibleValues = [];
			for(i = 0; i < this._values.length; i++) {
				if(this._values[i][param_name] == value) {
					possibleValues.push(this._values[i]);
				}
			}
			return possibleValues;
		}
		/**
		 *Returns a filtered version of the array. Does not modify it. Has two
		  options. One is replace the value with the new desired value (e.g.)
		  set all values of -1 to 0 or not to add at all.
		  *@param {Value} value, the value to search for
		  *@param {Object} options, an object containing at least one value which is the mode,
		  *may contain a value to replace it by under value.
		  *@returns {Array} the filtered array.
		  */
		DataArray.prototype.filterBlanks = function(value, options) {
			var tempArray = [];
			var i = 0;
			for(i = 0; i < this._values.length; i++) {
				if(this._values[i].value == value) {
					if(options.mode) {
						//Replace blanks with the new value
						var tempValue = this._values[i];
						tempValue.value = options.value;
						tempArray.push(tempValue);
					}
				} else {
					tempArray.push(this._values[i]);
				}
			}
			return tempArray;
		}
		return DataArray;
	}
)