/*
 * Copyright (C) 2017 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 */
 /**
 * @exports LayerPoint
 */
define([
	],
	function() {
		'use strict';
		/**
		 *Constructs a layer point. Contains the address and name to search
		 *@alias LayerPoint
		 *@constructor
		 *@classdec
		 * 
		 */
		var LayerPoint = function(address, name) {
			this._address = address;
			this._name = name;
		}
		LayerPoint.prototype = Object.create(Object.prototype);
		Object.defineProperties(LayerPoint.prototype, {
			address: {
				get: function() {
					return this._address;
				},
				set: function(address) {
					this._values = address;
				}
			},
			name: {
				get: function() {
					return this._name;
				},
				set: function(name) {
					this._values = name; 
				}
			}
		});
		return LayerPoint;
	}
)