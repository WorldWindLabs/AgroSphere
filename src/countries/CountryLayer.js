/*
 * Copyright (C) 2017 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 */
 /**
 * @exports DataLayer
 */
define([
		'../WorldWind'
	],
	function(ww) {
		'use strict';
		/**
		 *Constructs a layer with flags or any image on it
		 *@alias DataLayer
		 *@constructor
		 *@classdec
		 *Provides a layer with flags or any image on it, allowing it to manipulate
		 *data for each country
		 *@augments RenderableLayer
		 *@param {String} name, the name of the DataLayer
		 * 
		 */
		var DataLayer = function(name, type) {
			this._name = name;
			this._type = type;
			this._layer = new WorldWind.RenderableLayer(name);
		}
		DataLayer.prototype = Object.create(Object.prototype);
		Object.defineProperties(DataLayer.prototype, {
			countryList: {
				get: function() {
					return this._countryList;
				},
				set: function(countryList) {
					this._countryList = countryList;
				}
			},
			flagAddress: {
				get: function () {
					return this._flagAddress;
				},
				set: function(flagAddress) {
					this._flagAddress = flagAddress;
				}
			},
			layer: {
				get: function () {
					return this._layer;
				},
				set: function(layer) {
					this._layer = layer;
				}
			}
		});
		/**
		 * Using the given csv address and flag address. Create renderables
		 * to form the layer. Assumes all the images are of the same type
		 *@param {Array} countryArray, a CountryArray containing the desired countries
		 *@param {String} flagAddress, a string indicating the address of the flags avaliable
		 */
		DataLayer.prototype.loadFlags = function(countryArray, flagAddress, 
				flagImageType, placemarkDetails, highlightDetails) {
			var i = 0;
			for(i = 0; i < countryArray.length; i++) {
				var placemarkAttributes;
				if(placemarkDetails ==  null) {
					placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
					placemarkAttributes.imageScale = 1;
					placemarkAttributes.imageOffset = new WorldWind.Offset(
						WorldWind.OFFSET_FRACTION, 0.3,
						WorldWind.OFFSET_FRACTION, 0.0);
					placemarkAttributes.imageColor = WorldWind.Color.WHITE;
					placemarkAttributes.labelAttributes.offset = new WorldWind.Offset(
						WorldWind.OFFSET_FRACTION, 0.5,
						WorldWind.OFFSET_FRACTION, 1.0);
					placemarkAttributes.labelAttributes.color = WorldWind.Color.WHITE;
					placemarkAttributes.drawLeaderLine = true;
					placemarkAttributes.leaderLineAttributes.outlineColor =
						WorldWind.Color.RED;
				} else {
					placemarkAttributes = placemarkDetails;
				}
				var highlightAttributes;
				if(highlightDetails == null) {
					highlightAttributes = new
						WorldWind.PlacemarkAttributes(placemarkAttributes);
					highlightAttributes.imageScale = 3;
				} else {
					highlightAttributes = highlightDetails;
				}
				var placemark = new WorldWind.Placemark(new
                            WorldWind.Position(countryArray[i].latitude,
                            countryArray[i].longitude, 1e2), true, null);
                placemark.label = countryArray[i].name + ' - ' + 
					countryArray[i].options.code_3;
                placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;
                placemarkAttributes.imageSource = flagAddress + 
					countryArray[i].options.icon_code + '.png';

				placemark.highlightAttributes = highlightAttributes;

				//Attach the type to it
				placemark.type = this._type;
				//Make it so the labels are visible from 10e6
				placemark.eyeDistanceScalingLabelThreshold = 10e6;
				placemark.eyeDistanceScalingThreshold = 5e6;
				placemark.attributes = placemarkAttributes;
				// Add the placemark to the layer.
				this._layer.addRenderable(placemark);
			}
		};
		return DataLayer;
	}
)