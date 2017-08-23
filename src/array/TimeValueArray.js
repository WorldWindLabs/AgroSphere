/*
 * Copyright (C) 2017 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 */
 /**
 * @exports TimeValueArray
 */
define([
	],
	function() {
		'use strict';
		/**
		 *Constructs a special array that allows quick searches
		 *@alias Values
		 *@constructor
		 *@classdec
		 * 
		 */
		var TimeValueArray = function(values) {
			this._values = values;
		}
		TimeValueArray.prototype = Object.create(Object.prototype);
		Object.defineProperties(TimeValueArray.prototype, {
			values: {
				get: function() {
					return this._values;
				},
				set: function(values) {
					this._values = values;
				}
			}
		});
		/**
		 *Returns the first object that matches the value for a given a parameter
		 @param {Value} value, the value you are looking for
		 @param {string} param_name, the parameter to search by
		 @return {Object} result, the object that matches the parameter. Else
			 return 0
		 */
		TimeValueArray.prototype.search = function(value, param_name) {
			var i = 0;
			for(i = 0; i < this._values.length; i++) {
				if(this._values[i][param_name] == value) {
					return this._values[i];
				}
			}
			return 0;
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
		TimeValueArray.prototype.filterBlanks = function(value, options) {
			var tempArray = [];
			var i = 0;
			for(i = 0; i < this._values.length; i++) {
				if(this._values[i] == value) {
					if(options.mode) {
						//Replace blanks with the new value
						tempArray.push(options.value);
					}
				} else {
					tempArray.push(this._values[i]);
				}
			}
		}
		return TimeValueArray;
	}
)