/*
 * Copyright (C) 2017 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 */
 /**
 * @exports GlobalDataPoint
 */
define([
	],
	function() {
		'use strict';
		/**
		 *Constructs an object containing the details of the country and its co-ordinates
		 *@alias GlobalDataPoint
		 *@constructor
		 *@classdec
		 * 
		 */
		var GlobalDataPoint = function(name, lat, lon) {
			this._name = name;
			this._latitude = lat;
			this._longitude = lon;
		}
		GlobalDataPoint.prototype = Object.create(Object.prototype);
		Object.defineProperties(Country.prototype, {
			name: {
				get: function() {
					return this._name;
				},
				set: function(name) {
					this._name = name;
				}
			},
			latitude: {
				get: function(){
					return this._latitude;
				},
				set: function(latitude) {
					this._latitude = latitude;
				}
			},
			longitude: {
				get: function() {
					return this._longitude;
				},
				set: function(longitude) {
					this._longitude = longitude;
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
		return GlobalDataPoint;
	}
)