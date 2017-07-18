/**
 * Created by mdtang on 6/6/17.
 */

/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @version $Id: index.js 3320 2015-07-15 20:53:05Z dcollins $
 */

var APIKEY = '26fb68df7323284ea4430d8e4d3c60b1';
var searchMode = 0;
 
 
requirejs({paths:{
    "jquery":"https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min",
    "jqueryui": "https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min",
    "jquery-csv": "https://cdnjs.cloudflare.com/ajax/libs/jquery-csv/0.8.3/jquery.csv",
    "simple-stats": "https://unpkg.com/simple-statistics@4.1.0/dist/simple-statistics.min",
	"regression": "../src/regression/regression",
	"math": "../src/math/math.min"
}
},['../src/WorldWind',
        './LayerManager', '../src/formats/kml/KmlFile',
        '../src/formats/kml/controls/KmlTreeVisibility', './Pin', 'jquery', 'jqueryui', 'jquery-csv',
        'simple-stats', 'regression', 'math'],
    function (ww,
              LayerManager, KmlFile, KmlTreeVisibility) {
        "use strict";
        
        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);
		var regression = require("regression");
		var derivative = require("math");
		console.log(derivative.derivative('sinh(x)','x'));
        var wwd = new WorldWind.WorldWindow("canvasOne");

        var layers = [
            {layer: new WorldWind.BMNGLayer(), enabled: false},
            {layer: new WorldWind.BMNGLandsatLayer(), enabled: false},
            {layer: new WorldWind.BingAerialLayer(null), enabled: false},
            {layer: new WorldWind.BingAerialWithLabelsLayer(null), enabled: true},
            {layer: new WorldWind.BingRoadsLayer(null), enabled: false},
            {layer: new WorldWind.CompassLayer(), enabled: false},
            {layer: new WorldWind.CoordinatesDisplayLayer(wwd), enabled: true},
            {layer: new WorldWind.ViewControlsLayer(wwd), enabled: true}
        ];

        for (var l = 0; l < layers.length; l++) {
            layers[l].layer.enabled = layers[l].enabled;
            wwd.addLayer(layers[l].layer);
        }



        var config = {
            service: "http://sedac.ciesin.columbia.edu/geoserver/wms",
            layerNames: 'usgrid:usgrid-summary-file1-2000_usa-pctasian-2000',
            sector: new WorldWind.Sector(-90, 90, -180, 180),
            levelZeroDelta: new WorldWind.Location(36, 36),
            numLevels: 1,
            format: "image/png",
            size: 256
        };
					// Data
			var data2 = [
				[1, 10],
				[2, 30],
				[3, 68],
				[4, 130],
				[5, 222],
				[6, 350],
				[7, 520],
				[8, 738],
				[9, 1010],
				[10, 1342]
			];
        console.log(regression('exponential',data2));
        // new instance of layer created
        var dataLayer = new WorldWind.WmsLayer(config, null);

        // data layer named
        dataLayer.displayName = "Data layer";

        //disable layer by default
        dataLayer.enabled = false;

        // layer added to globe
        wwd.addLayer(dataLayer);




        // Web Map Service information from NASA's Near Earth Observations WMS
        //var serviceAddress = "http://sedac.ciesin.org/geoserver/ows?service=wms&version=1.3.0&request=GetCapabilities";
        // Named layer displaying Average Temperature data
        /*var layerName = ["povmap:povmap-global-subnational-infant-mortality-rates_2000", 'povmap:povmap-global-subnational-prevalence-child-malnutrition',
            'gpw-v4:gpw-v4-population-count_2000', 'gpw-v4:gpw-v4-population-count_2005', 'gpw-v4:gpw-v4-population-count_2010', 'gpw-v4:gpw-v4-population-count_2015',
            'gpw-v4:gpw-v4-population-count_2020'];*/
        //Load the WMTS layers
        console.time('First');
        var geoJSONData = loadGEOJsonData();
        var sampleGradCount =
                '[{"gradient": 0.5, "code3": "AFG"}, {"gradient": 7, "code3": "AUS"},' +
                '{"gradient": -2, "code3": "JPN"}, {"gradient": -1, "code3": "USA"},' +
                '{"gradient": -3, "code3": "JOR"}, {"gradient": 1, "code3": "NZL"},' +
                '{"gradient": 0, "code3": "ESP"}]';
        //var tempData = JSON.parse(sampleGradCount);
        //var countryLayers = colourizeCountries(tempData, geoJSONData);
        //wwd.addLayer(countryLayers);


        //Load the country data
        var csvData = loadCSVData();
        var csvMultiData = loadCSVDataArray();
        var agriData = convertArrayToDataSet(csvMultiData[0]);
		var atmoData = convertArrayToDataSet(csvMultiData[1]);

        //Generate the placemark layers
        generatePlacemarkLayer(wwd, csvData);

        //Generate the remove button
        generateRemoveButton();

		//Generate the button for weather
		generateWeatherHTML(csvData[0]);
		giveWeatherButtonFunctionality();
		//createSearchButton();
		//giveSearchButtonFunctionality();
        //Generate regression comparison and the provide functionality
        generateGeoComparisonButton(agriData);
        giveGeoComparisonFunctionality(agriData, geoJSONData, wwd, layerManager);

        //Automatically zoom into NASA Ames
        wwd.goTo(new WorldWind.Position(60.1870, 24.8296, 10e5));





        var starFieldLayer = new WorldWind.StarFieldLayer();
        var atmosphereLayer = new WorldWind.AtmosphereLayer();


        //IMPORTANT: add the starFieldLayer before the atmosphereLayer
        wwd.addLayer(starFieldLayer);
        wwd.addLayer(atmosphereLayer);

        // Create a layer manager for controlling layer visibility.
        var layerManager = new LayerManager(wwd);
        wwd.redrawCallbacks.push(runSunSimulation);

        var sunSimulationCheckBox = document.getElementById('stars-simulation');
        var doRunSimulation = false;
        var timeStamp = Date.now();
        var factor = 1;

        sunSimulationCheckBox.addEventListener('change', onSunCheckBoxClick, false);

        function onSunCheckBoxClick() {
            doRunSimulation = this.checked;
            if (!doRunSimulation) {
                starFieldLayer.time = new Date();
                atmosphereLayer.lightLocation = WorldWind.SunPosition.getAsGeographicLocation(starFieldLayer.time);
            }
            wwd.redraw();
        }

        function runSunSimulation(wwd, stage) {
            if (stage === WorldWind.AFTER_REDRAW && doRunSimulation) {
                timeStamp += (factor * 60 * 1000);
                starFieldLayer.time = new Date(timeStamp);
                atmosphereLayer.lightLocation = WorldWind.SunPosition.getAsGeographicLocation(starFieldLayer.time);
                wwd.redraw();
            }
        }

        //Handle a pick (only placemarks shall be)
        var highlightedItems = [];
        var handlePick = function(o) {
            var x = o.clientX;
            var y = o.clientY;

            var redrawRequired = highlightedItems.length > 0; // must redraw if we de-highlight previously picked items

            // De-highlight any previously highlighted placemarks.
            for (var h = 0; h < highlightedItems.length; h++) {
                highlightedItems[h].highlighted = false;
            }
            highlightedItems = [];
            
            var pickList;
            pickList = wwd.pick(wwd.canvasCoordinates(x, y));
            if(pickList.objects.length > 0) {
                var i = 0;
                for(i = 0; i < pickList.objects.length; i++) {
                    pickList.objects[i].userObject.highlighted = true;
                    // Keep track of highlighted items in order to de-highlight them later.
                    highlightedItems.push(pickList.objects[i].userObject);
                    if(typeof(pickList.objects[i].userObject.type) != 'undefined'){
                        //It's most likely a placemark
                        //"most likely"
                        //Grab the co-ordinates
                        var placeLat = 
                                pickList.objects[i].userObject.position.latitude;
                        var placeLon = 
                                pickList.objects[i].userObject.position.longitude;
                        
                        //Find the country
                        if(pickList.objects[i].userObject.type == 'countries') {
                            var dataPoint = 
                                    findDataPoint(csvData[0], placeLat, placeLon);
                            var details = $("#country");
                            var detailsHTML = '<h4>Country Details</h4>';
                            detailsHTML += 
                                    '<p>Country: ' + dataPoint.country + '</p>';
                            detailsHTML += 
                                    '<p>Country Code: ' + dataPoint.code3 + '</p>';
                            //We have the country code, we can do whatever we want
                            //like 
                            //Perhaps show everything? lol
                            //What we need to do is generate a button which plots the graph
                            
                            //Generate the agri buttons
                            
                            
                            //Get the agriculture data
                            detailsHTML += generateAgriCultureButtons(agriData, dataPoint.code3);
                            details.html(detailsHTML);

                            //Give functionality for the buttons generated
                            giveAgriCultureButtonsFunctionality(detailsHTML, agriData, dataPoint.code3);

                            //fixed hover flags bug - now click instead of hover eventlistener
                            var otherTab = $("#layers");
                            var otherTab2 = $("#graphs");
                            var otherTab3 = $("#station");
                            var otherTab4 = $("#comp");
                            var otherTab5 = $("#weather");
                            var otherTab6 = $("#view");
                            details.show('fast','swing');
                            otherTab.hide();
                            otherTab2.hide();
                            otherTab3.hide();
                            otherTab4.hide();
                            otherTab5.hide();
                            otherTab6.hide();

                        } else if(pickList.objects[i].userObject.type == 'station') {
							var atmoDataPoint =
								findDataPoint(csvData[1], placeLat, placeLon);

							console.log(atmoDataPoint);
							var countryData = csvData[0];
							var ccode2 = atmoDataPoint.stationName.slice(0,2);
							var ccode3 = findDataPointCountry(countryData, ccode2, 2).code3;
							console.log(ccode3);
							
							var agriDataPoint = findDataPointCountry(agriData, ccode3, 3);
							
							var details = $('#station');
							var detailsHTML = '<h4>Weather Station Detail</h4>';

							detailsHTML += '<p>Station Name: ' + atmoDataPoint.stationName + '</p>';
							console.log(agriDataPoint);
							//Generate the station buttons

							detailsHTML += generateAtmoButtons(atmoData, atmoDataPoint.stationName, agriDataPoint, ccode3);
							details.html(detailsHTML);
							
							//Generate the plots
							//getWeatherAndAgri(agriData, atmoData, csvData[0], dataPoint.stationName);
							//Give functionality for buttons generated
							giveAtmoButtonsFunctionality(detailsHTML, atmoData, 
									atmoDataPoint.stationName, agriDataPoint);

                            var otherTab = $("#layers");
                            var otherTab2 = $("#graphs");
                            var otherTab3 = $("#country");
                            var otherTab4 = $("#comp");
                            var otherTab5 = $("#weather");
                            var otherTab6 = $("#view");
                            details.show('fast','swing');
                            otherTab.hide();
                            otherTab2.hide();
                            otherTab3.hide();
                            otherTab4.hide();
                            otherTab5.hide();
                            otherTab6.hide();
						}
                    }
                }
            }
        };
        
        wwd.addEventListener('click', handlePick);
        // Set up to handle clicks and taps.

        // The common gesture-handling function.
        var handleClick = function (recognizer) {
            // Obtain the event location.
            var x = recognizer.clientX,
                y = recognizer.clientY;

            // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
            // relative to the upper left corner of the canvas rather than the upper left corner of the page.
            var pickList = wwd.pick(wwd.canvasCoordinates(x, y));

            // If only one thing is picked and it is the terrain, tell the world window to go to the picked location.
            if (pickList.objects.length == 1 && pickList.objects[0].isTerrain) {
                var position = pickList.objects[0].position;
                wwd.goTo(new WorldWind.Location(position.latitude, position.longitude));
            }
        };

        // Listen for mouse clicks.
        var clickRecognizer = new WorldWind.ClickRecognizer(wwd, handleClick);

        // Listen for taps on mobile devices.
        var tapRecognizer = new WorldWind.TapRecognizer(wwd, handleClick);


        // The common gesture-handling function.
        var handleClick = function (recognizer) {
            // Obtain the event location.
            var x = recognizer.clientX,
                y = recognizer.clientY;

            // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
            // relative to the upper left corner of the canvas rather than the upper left corner of the page.
            var pickList = wwd.pick(wwd.canvasCoordinates(x, y));
			console.log(pickList.objects);
            // If only one thing is picked and it is the terrain, tell the world window to go to the picked location.
            if (pickList.objects.length == 1 && pickList.objects[0].isTerrain) {
                var position = pickList.objects[0].position;
                
				
				//Find the closest country and placemark
				findInformationUsingLocation(wwd, position.latitude, position.longitude, csvData[0], csvData[1]);
				//wwd.goTo(new WorldWind.Location(position.latitude, position.longitude));
            }
        };

// Listen for mouse clicks.
var clickRecognizer = new WorldWind.ClickRecognizer(wwd, handleClick);

// Listen for taps on mobile devices.
var tapRecognizer = new WorldWind.TapRecognizer(wwd, handleClick);

console.timeEnd('First');

//Given a layerName and its layernumber, generate a layer control block

//Key Notes: This function generates the HTML first then supplies
//functionality
function generateLayerControl(wwd, wmsConfig, wmsLayerCapabilities, layerName, layerNumber) {
    //Generate the div tags
    var layerControlHTML = '<div id="' + layerNumber + '">';

    //Spawn opacity controller
    layerControlHTML += generateOpacityControl(wwd, layerName, layerNumber);
    //Wrap it up

    layerControlHTML += '</div>';

    //Spawn the legend
    layerControlHTML += generateLegend(wwd,
        wmsLayerCapabilities, layerName, layerNumber);

    //Spawn the time if it has it
    if (typeof(wmsConfig.timeSequences) != 'undefined') {
        layerControlHTML += generateTimeControl(wwd, layerName, layerNumber);
    }

    //Place the HTML somewhere
    $("#graphs").append(layerControlHTML);

    //Add functionality to opacity slider
    giveOpacitySliderFunctionality(wwd, layerName, layerNumber);

    //Check time again to add functionality
    if (typeof(wmsConfig.timeSequences) != 'undefined') {
        giveTimeButtonFunctionality(wwd, layerName, layerNumber, wmsConfig);
    }
}
//Finds the layer based on the name in the wwd
//Returns 0 otherwise
function getLayerFromName(wwd, layerName) {
    var i = 0;

    for(i = 0; i < wwd.layers.length; i++) {
        if(wwd.layers[i].displayName == layerName) {
            return wwd.layers[i];
        }
    }
    return 0;
}


//Given the layerName, layerNumber and wwd. Give a legend if possible
function generateLegend(wwd, wmsLayerCapabilities, layerName, layerNumber) {

    //Check if a legend exists for a given layer this
    var legendHTML = '<br><h5>Legend for ' + layerName + '</h5>';
    if(typeof(wmsLayerCapabilities.styles[0].legendUrls[0].url)
        != 'undefined') {
        //Create the legend tag
        var legendURL = wmsLayerCapabilities.styles[0].legendUrls[0].url;
        legendHTML += '<div><img src="'+ legendURL +'"></div>';
    } else {
        //Say it does not exist
        legendHTML += '<div><p>A legend does not exist'  +
            'for this layer</p></div>';
    }
    return legendHTML;
}


//Given the HTML of the layerControl, generate the appropiate layer
function generateOpacityControl(wwd, layerName, layerNumber) {
    //Create the general box
    var opacityHTML = '<br><h5>Opacity for ' + layerName +'</h5>';

    //Create the slider
    opacityHTML += '<div id="opacity_slider_' + layerNumber + '"></div>';

    //Create the output
    opacityHTML += '<div id="opacity_amount_' + layerNumber + '">100%</div>';


    //Wrap up the HTML
    opacityHTML += '</div>';


    return opacityHTML;
}

function giveOpacitySliderFunctionality(wwd, layerName, layerNumber) {
    //Add functionality to the slider
    var sliderStringTemplate= "#opacity_slider_";
    var sliderString = sliderStringTemplate.concat(layerNumber);

    var slider = $(sliderString);
    //Slider details

    slider.slider(
        {
            value: 1,
            min: 0,
            max: 1,
            step: 0.1
        }
    );

    var opacity_amount = $("#opacity_amount_" + layerNumber);
    //Update values upon slide
    slider.on("slide", function (event, ui) {
        opacity_amount.html(ui.value * 100 + "%");
    });

    //Grab the layer and redraw
    slider.on("slidestop", function(event, ui) {
        //Grabbing the layer is based on its name in addition to the entire
        //wwd
        for(var i = 0; i  < wwd.layers.length; i++) {
            var target_layer = wwd.layers[i];
            if(target_layer.displayName == layerName) {
                //Match, set the opacity

                target_layer.opacity = ui.value;
                if (document.wwd_duplicate) {
                    if (!(document.wwd_duplicate instanceof Array))
                        document.wwd_duplicate.redraw();
                    else {
                        document.wwd_duplicate.forEach(function (element, index, array) {
                            element.redraw();
                        });
                    }
                }
            }
        }
    });

    //Automatically zoom into NASA Ames
    //wwd.goTo(new WorldWind.Position(37.4089, -122.0644));
}


function generateTimeControl(wwd, layerName, layerNumber) {
    //Create the general box
    var timeHTML = '<br><h5>Time for ' + layerName +'</h5>';

    //Create the output
    timeHTML += '<div id="time_date_' + layerNumber + '">INITIAL DATE</div>';

    //Create the three buttons
	timeHTML += '<button class="btn-info" id="time_left_' + layerNumber + '">Left</button>';
	timeHTML += '<button class="btn-info" id="time_middle_' + layerNumber + '">Play</button>';
	timeHTML += '<button class="btn-info" id="time_right_' + layerNumber + '">Right</button>';

    //Wrap up the HTML
    timeHTML += '</div>';


    return timeHTML;
}
function giveTimeButtonFunctionality(wwd, layerName, layerNumber, wmsConfig) {
	var leftButtonTemplate= "#time_left_";
	var leftButtonString = leftButtonTemplate.concat(layerNumber);
	var rightButtonTemplate = "#time_right_";
	var rightButtonString = rightButtonTemplate.concat(layerNumber);
	var leftButton = $(leftButtonString);
	var rightButton = $(rightButtonString);
	leftButton.button();
	var targetLayer = getLayerFromName(wwd, layerName);
	var timeSlot = 0;
	leftButton.on("click", function(event, ui){
	    if((timeSlot - 1 > 0)) {
	     	targetLayer.time = wmsConfig.timeSequences[timeSlot - 1].endTime;
		    wwd.redraw();
		    timeSlot--;
	    }
	});
	rightButton.button();
	rightButton.on("click", function(event, ui){
		//Move the time to the left
		if((timeSlot + 1) < wmsConfig.timeSequences.length)
		    targetLayer.time = wmsConfig.timeSequences[timeSlot + 1].endTime;
		    wwd.redraw();
		    timeSlot++;
	});
}

$(document).ready(function(){
    $(".focustext").hide();
});

$(document).ready(function(){
    $(".togglebutton").click(function(){
        $(".focustext").slideToggle();
    });
});

$(document).ready(function(){
    $(".focustext2").hide();
});


$(document).ready(function(){
    $(".togglebutton2").click(function(){
        $(".focustext2").slideToggle();
    });
});


//loading screen
setTimeout(function () {
    $("#loading_modal").fadeOut();
}, 6000);

$(document).ready(function () {
    $('#sidebarCollapse').on('click', function () {
        $('#sidebar').toggleClass('active');
        $(this).toggleClass('active');
    });
});

//Generates the placemark layers
//The types are predetermined in order
//This assumes the CSV data is loaded in order too obviously
function generatePlacemarkLayer(wwd, csvData){
    //Data type list
    var dataTypes = ['countries', 'station'];

    //Common features
    var pinLibrary = WorldWind.configuration.baseUrl + "images/pushpins/",
        placemark,
        placemarkAttributes = new WorldWind.PlacemarkAttributes(null),
        highlightAttributes;
    placemarkAttributes.imageScale = 1;
    placemarkAttributes.imageOffset = new WorldWind.Offset(
        WorldWind.OFFSET_FRACTION, 0.3,
        WorldWind.OFFSET_FRACTION, 0.0);
    placemarkAttributes.imageColor = WorldWind.Color.WHITE;
    placemarkAttributes.labelAttributes.offset = new WorldWind.Offset(
        WorldWind.OFFSET_FRACTION, 0.5,
        WorldWind.OFFSET_FRACTION, 1.0);
    placemarkAttributes.labelAttributes.color = WorldWind.Color.YELLOW;
    placemarkAttributes.drawLeaderLine = true;
    placemarkAttributes.leaderLineAttributes.outlineColor = WorldWind.Color.RED;

    // Define the images we'll use for the placemarks.
    var images = [
        "plain-black.png", "plain-blue.png", "plain-brown.png",
        "plain-gray.png", "plain-green.png", "plain-orange.png",
        "plain-purple.png", "plain-red.png", "plain-teal.png",
        "plain-white.png", "plain-yellow.png", "castshadow-black.png",
        "castshadow-blue.png", "castshadow-brown.png", "castshadow-gray.png",
        "castshadow-green.png", "castshadow-orange.png",
        "castshadow-purple.png", "castshadow-red.png", "castshadow-teal.png",
        "castshadow-white.png"
    ];
    var i = 0;
    for(i = 0; i < dataTypes.length; i++) {
        var placemarkLayer = new WorldWind.RenderableLayer(dataTypes[i] +
                " Placemarks");
        //Create the pins
        var j = 0;
        for(j = 0; j < csvData[i].length; j++) {
            // Create the placemark and its label.
            var placemark = new WorldWind.Placemark(new WorldWind.Position
                    (parseFloat(csvData[i][j].lat),
                    parseFloat(csvData[i][j].lon), 1e2), true, null);
            var labelString = '';
            if(dataTypes[i] == 'countries') {
                labelString = csvData[i][j].country;
            } else if(dataTypes[i] == 'stations') {
				labelString = csvData[i][j].code3;
			}

            placemark.label = labelString;
            placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;

            // Create the placemark attributes for this placemark. Note that
            //the attributes differ only by their image URL.
            placemarkAttributes = new
                    WorldWind.PlacemarkAttributes(placemarkAttributes);
            placemarkAttributes.imageSource = pinLibrary + images[9 - 2*i];
            //Use flag if it is a country
            if(dataTypes[i] == 'countries') {
                //Image would be a flag
                placemarkAttributes.imageSource = './flags/' +
                        csvData[i][j].iconCode + '.png';
            }

            placemark.attributes = placemarkAttributes;

            // Create the highlight attributes for this placemark.
            //Note that the normal attributes are specified as
            // the default highlight attributes so that all properties are
            //identical except the image scale. You could
            // instead vary the color, image, or other property to control
            //the highlight representation.
            highlightAttributes = new
                    WorldWind.PlacemarkAttributes(placemarkAttributes);
            highlightAttributes.imageScale = 3;
            placemark.highlightAttributes = highlightAttributes;

            //Attach the type to it
            placemark.type = dataTypes[i];

            //Make it so the labels are visible from 10e6
            placemark.eyeDistanceScalingLabelThreshold = 10e6;
            placemark.eyeDistanceScalingThreshold = 5e6;

            // Add the placemark to the layer.
            placemarkLayer.addRenderable(placemark);
        }
        //Before adding to the layer, attach a type to it
        placemarkLayer.type = dataTypes[i];

        // Add the placemarks layer to the World Window's layer list.
        wwd.addLayer(placemarkLayer);
    }

}

//Loads all the data
//Essentially all the data is loaded before hand if it is part of the CSV lit
function loadCSVData(){
    var csvList = ['countries.csv', 'station.csv'];
    //Find the file
    var csvString = "";

	var csvData = [];
	var i = 0;
	for(i = 0; i < csvList.length; i++) {
        var csvRequest = $.ajax({
    		async: false,
    		url: csvList[i],
    		success: function(file_content) {
    			csvString = file_content;
                csvData.push($.csv.toObjects(csvString));
    		}
    	});
	}
	return csvData;
}

//Filters the data based on a particular parameter
function filterCSVData(csvData, parameterType, thresholdValue) {
    //Since we already have the data, just go through it and pop each one
    //that we don't need

    //Duplicate it
    var tempData = csvData.slice(0);

    var i = 0;
    var returnData = [];
    for(i = 0; i < tempData.length; i++) {
        //A paramterType of 0 corresponds to year
        //And its a less than
        if(parameterType == 0) {
            //Filter by year
            returnData.push(tempData[i].filter(
                function(data) {
                    return data.year < thresholdValue;
                }));
        }

    }

    return returnData;
}

//Given the lon and lat, find the data
function findDataPoint(dataSet, lat, lon) {
    var i = 0;
    for(i = 0; i < dataSet.length; i++){
        if((dataSet[i].lon == lon) && (dataSet[i].lat == lat)) {
            return dataSet[i];
        }
    }
}

//Given the stationName, find the respective dataSet
function findDataPointStation(dataSet, stationName) {
	var i = 0;
	for(i = 0; i < dataSet.length; i++) {
		if(dataSet[i].code3 == stationName) {
			return dataSet[i];
		}
	}
	return 0;
}

//Given the conuntry code, find the data set involving countries
function findDataPointCountry(dataSet, countryCode, codeNumber) {
    var i = 0;
    if(codeNumber == 2) {
        for(i = 0; i < dataSet.length; i++) {
            if((dataSet[i].code2 == countryCode)) {
                return dataSet[i];
            }
        }
    } else if(codeNumber == 3) {
        for(i = 0; i < dataSet.length; i++) {
            if(dataSet[i].code3 == countryCode) {
                return dataSet[i];
            }
        }
    }
    return 0;
}




//Load the csvFile differently
function loadCSVDataArray() {
    var csvList = ['agri2.csv', 'Atmo.csv'];
    //Find the file
    var csvString = "";

	var csvData = [];
	var i = 0;
	for(i = 0; i < csvList.length; i++) {
        var csvRequest = $.ajax({
    		async: false,
    		url: csvList[i],
    		success: function(file_content) {
    			csvString = file_content;
                csvData.push($.csv.toArrays(csvString));
    		}
    	});
	}
	return csvData;
}

//Find a value given a name
//Returns 0 if it can't be found, else returns something
//This assumes we are working with convertArrayToDataSet
function findDataBaseName(inputArray, name) {
    var i = 0;
    for(i = 0; i < inputArray.length; i++) {
        //Find if the name exists
        if(inputArray[i].code3 == name) {
            return inputArray[i];
        }
    }
    return 0;
}


//Given a single array
function convertArrayToDataSet(csvData) {
    //Create the temporary object
    var objectList = [];
    var i = 0;
    for(i = 1; i < csvData.length; i++) {
        //Create the object
        var tempObject = {};
        var needPushToObj;
        //First instance or can't find it
        if((objectList.length == 0) ||
                (findDataBaseName(objectList,csvData[i][0]) == 0)) {

            //Give it a name assuming it is the first things
            tempObject.code3 = csvData[i][0]

            //Give it a start time
            tempObject.startTime = csvData[0][2];
            tempObject.endTime = csvData[0][csvData[i].length - 1];

            //Give it a data array
            tempObject.dataValues = [];

            needPushToObj = true;
        } else {
            //We found it
            tempObject = findDataBaseName(objectList, csvData[i][0]);
            needPushToObj = false;
        }
        var j = 0;
        //Data values contain a type and its year
        var dataValueObject = {};
        dataValueObject.timeValues = [];
        for(j = 1; j < csvData[i].length; j++) {
            //Attach things to the tempObject dataValues
            if(j == 1) {
                //Its the type name
                dataValueObject.typeName  = csvData[i][1];
            } else {
                //Append the item to the value
                var timeValue = {};
                timeValue.year = csvData[0][j];

                //Check if the data exist
                var value = csvData[i][j];
                if(value != "") {
                    //Parse it
                    timeValue.value = parseFloat(value);
                } else {
                    timeValue.value = "";
                }

                dataValueObject.timeValues.push(timeValue);
            }
        }
        tempObject.dataValues.push(dataValueObject);
        //Check to push to obj list
        if(needPushToObj) {
            objectList.push(tempObject);
        }

    }
    return objectList;
}

function loadWMTSLayers(wwd, layerManager) {
    var serviceWMTSAddress = "https://neowms.sci.gsfc.nasa.gov/wms/wms";
    var layerName = ["MOD14A1_E_FIRE", "MODAL2_M_AER_OD"];
    // Called asynchronously to parse and create the WMS layer
    var createWMTSLayer = function (xmlDom) {
        // Create a WmsCapabilities object from the XML DOM
        var wms = new WorldWind.WmsCapabilities(xmlDom);
        var i = 0;
        // using for loop to add multiple layers to layer manager; SUCCESS!!!!
        for (i = 0; i < layerName.length; i++) {
            // Retrieve a WmsLayerCapabilities object by the desired layer name
            var wmsLayerCapabilities = wms.getNamedLayer(layerName[i]);

            // Form a configuration object from the WmsLayerCapability object
            var wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
            // Modify the configuration objects title property to a more user friendly title
            wmsConfig.title = wmsLayerCapabilities.title;

            var wmsLayer;
            wmsLayer = new WorldWind.WmsTimeDimensionedLayer(wmsConfig);
            wmsLayer.time = wmsConfig.timeSequences[0].endTime;

            // disable layer by default
            wmsLayer.enabled = false;

            // Add the layers to World Wind and update the layer manager
            wwd.addLayer(wmsLayer);
            generateLayerControl(wwd, wmsConfig, wmsLayerCapabilities, wmsConfig.title, i);
            layerManager.synchronizeLayerList();
        }
    };

    // Called if an error occurs during WMS Capabilities document retrieval
    var logError = function (jqXhr, text, exception) {
        console.log("There was a failure retrieving the capabilities document: " + text + " exception: " + exception);
    };

    $.get(serviceWMTSAddress).done(createWMTSLayer).fail(logError);
}

function loadKMLLayers(wwd, layerManager) {
    var kmlFilePromise = new KmlFile('doc.kml', [new KmlTreeVisibility('kmltree', wwd)]);
    kmlFilePromise.then(function (kmlFile) {
        var renderableLayer = new WorldWind.RenderableLayer("Rice Yield Data");
        renderableLayer.addRenderable(kmlFile);

        wwd.addLayer(renderableLayer);
        layerManager.synchronizeLayerList();
    });
}

//The link is hardcoded
function loadGEOJsonData() {
    //Load GEOJSON
    var data;
    $.ajax({
        dataType: 'json',
        async: false,
        url: './geo/data/countries.geojson',
        success: function(file_content) {
            data = file_content;
        },
        fail: function() {
            console.log('fail');
        }
    });

    //Change the ISO name to code3
    var i = 0;
    for(i = 0; i < data.features.length; i++) {
        data.features[i].properties.code3 =
                data.features[i].properties.ISO_A3;
        delete data.features[i].properties.ISO_A3;
        data.features[i].properties.name =
                data.features[i].properties.ADMIN;
        delete data.features[i].properties.ADMIN;
    }
    return data;
}

function loadWMSLayers(wwd, layerManager) {
    var serviceWMSAddress = "http://sedac.ciesin.org/geoserver/ows?service=wms&version=1.3.0&request=GetCapabilities";
    var layerName = ["povmap:povmap-global-subnational-infant-mortality-rates_2000", 'povmap:povmap-global-subnational-prevalence-child-malnutrition',
            'gpw-v4:gpw-v4-population-count_2000', 'gpw-v4:gpw-v4-population-count_2005', 'gpw-v4:gpw-v4-population-count_2010', 'gpw-v4:gpw-v4-population-count_2015',
            'gpw-v4:gpw-v4-population-count_2020'];
    // Called asynchronously to parse and create the WMS layer
    var createWMSLayer = function (xmlDom) {
        // Create a WmsCapabilities object from the XML DOM
        var wms = new WorldWind.WmsCapabilities(xmlDom);
        // using for loop to add multiple layers to layer manager; SUCCESS!!!!
        var i = 0;
        for (i = 0; i < layerName.length; i++) {
            // Retrieve a WmsLayerCapabilities object by the desired layer name
            var wmsLayerCapabilities = wms.getNamedLayer(layerName[i]);

            // Form a configuration object from the WmsLayerCapability object
            var wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
            // Modify the configuration objects title property to a more user friendly title
            wmsConfig.title = wmsLayerCapabilities.title;

            var wmsLayer;
            wmsLayer = new WorldWind.WmsLayer(wmsConfig);

            // disable layer by default
            wmsLayer.enabled = false;

            // Add the layers to World Wind and update the layer manager
            wwd.addLayer(wmsLayer);
            generateLayerControl(wwd, wmsConfig, wmsLayerCapabilities, wmsConfig.title, i);
            layerManager.synchronizeLayerList();
        }
    };

    // Called if an error occurs during WMS Capabilities document retrieval
    var logError = function (jqXhr, text, exception) {
        console.log("There was a failure retrieving the capabilities document: " + text + " exception: " + exception);
    };

    $.get(serviceWMSAddress).done(createWMSLayer).fail(logError);
}

//Assuming the value is an empty string, gets rid of it
function filterOutBlanks(inputData, mode) {
    var i = 0;
    var tempArray = [];
    for(i = 0; i < inputData.length; i++) {
        //Check for empty string
		if((inputData[i].value != "") && (mode == 0)){

			tempArray.push(inputData[i]);
		} else if(mode == 1) {
			if(inputData[i].value == "") {
				inputData[i].value = 0;
				tempArray.push(inputData[i]);
			} else {
				tempArray.push(inputData[i]);
			}
		}
    }
    return tempArray;
}

//Applies functionality for the buttons
function giveGeoComparisonFunctionality(agriData, geoJSONData, wwd, layerManager) {
    //Generate the slider first
    var sliderHTML = $('#geoSlider');
    sliderHTML.slider({
        value: 1980,
        min: 1960,
        max: 2010,
        step:1
    });

    sliderHTML.on('slide', function(event, ui) {
        //Capture the year div
        var sliderValueDiv = $('#geoSlideValue');
        sliderValueDiv.html('Year Select: ' + ui.value);
    })

    //Search through the buttons
    var i = 0;
    for(i = 0; i < agriData.length; i++) {
        var buttonHTML = $('#geoCompType' + i);
        buttonHTML.button();
        buttonHTML.click(function(event) {
            //Find the year based on the slider value
            var sliderValue = $('#geoSlider').slider("value");

            var buttonName = $('#' + this.id).text().slice('Generate Geo Comparison for '.length);
			console.log(buttonName);
            //Do some data stuff, go through the agridata based on the button
            //number for every country
            var countryData = [];
            var j = 0;
            var k = 0;
			var l = 0;
            for(j = 0; j < agriData.length; j++) {
				for(k = 0; k < agriData[j].dataValues.length; k++) {
					if(agriData[j].dataValues[k].typeName == buttonName) {
						for(l = 0; l < agriData[j].dataValues[k].timeValues.length; l++) {
							if(agriData[j].dataValues[k].timeValues[l].year == sliderValue) {
								var tempObject = {value: agriData[j].dataValues[k].timeValues[l].value,
										code3:agriData[j].code3};
								countryData.push(tempObject);
							}
						}
					}
				}
            }

            //Got all the data, colour it
            countryData = filterOutBlanks(countryData, 0);
            var countryLayer = colourizeCountries(countryData, geoJSONData);
            //Check if the country layer exist
            var l = 0;
            for(l = 0; l < wwd.layers.length; l++) {
                if(wwd.layers[l].displayName == 'Geo Country Data') {
                    wwd.removeLayer(wwd.layers[l]);
                }
            }

            wwd.addLayer(countryLayer);
            layerManager.synchronizeLayerList();
        });
    }

    $('#geoCompareSearch').keyup(function (event) {
        //if (event.which == 13) {
        var input = $('#geoCompareSearch');
        var textValue = input.val().toUpperCase();

        //Iterate through the entire list and hide if it doesn't contain the
        //thing
        var i = 0;
        var layerTitles = $('.buttonDiv');
        var layerTitleList = $('.buttonDiv > button');
        for (i = 0; i < layerTitleList.length; i++) {
            if (!$(layerTitleList[i]).html().toUpperCase().includes(textValue)) {
                $(layerTitles[i]).hide();
            } else if (textValue == '') {
                $(layerTitles[i]).show();
            } else if ($(layerTitleList[i]).html().toUpperCase().includes(textValue)) {
                $(layerTitles[i]).show();
            }
        }
        // }

    });
}

//Generates the html for geo location comparison
//Assumes the agriData is from agri.csv
function generateGeoComparisonButton(agriData) {
     var count = 4;
    var i = 0;
	var j = 0;
    var comparisonHTML = '';
    //Also implement the slider
    comparisonHTML += '<p><div id="geoSlider"></div><div id="geoSlideValue">Year Select: 1980</div></p>';
	var buttonNames = [];
	for(i = 0; i < agriData.length; i++) {
		for(j = 0; j < agriData[i].dataValues.length; j++) {
			if(!buttonNames.includes(agriData[i].dataValues[j].typeName)) {
				buttonNames.push(agriData[i].dataValues[j].typeName);
			}
		}
	}

    var dropArea = $('#comp');

    dropArea.append('<input type="text" class="form-control" id="geoCompareSearch" placeholder="Search for datasets..." title="Search for datasets...">');
	comparisonHTML += '<div>';
    for(i = 0; i < buttonNames.length; i++) {
        var buttonTempName = buttonNames[i];
        comparisonHTML += '<div class="buttonDiv"><button class="btn-info" id="geoCompType' + i +
            '">Generate Geo Comparison for ' + buttonTempName + '</button><br></div>';
    }


    var dropArea = $('#comp')
    dropArea.append(comparisonHTML);
}

//Searches for both the weather and station data given the station name
function getWeatherAndAgri(agriData, stationData, countryData, stationName) {
	//Deduce the 2-letter country from the stationName
	var ccode2 = stationName.slice(0,2);
	
	//From the two-letter code, get the 3-letter code
	var ccode3 = (findDataPointCountry(countryData, ccode2, 2)).code3;
	
	//Now with the 3-letter code, find the agriculture data
	var agriPoint = findDataPointCountry(agriData, ccode3, 3);
	
	//Find the station data
	var stationPoint = findDataPointStation(stationData, stationName);
	//console.log(agriPoint);
	//console.log(stationPoint);
	
	//Plot
	
}

//Gives the button functionality
function giveAtmoButtonsFunctionality(detailsHTML, inputData, stationName, agriDataPoint) {
	var dataPoint = findDataPointStation(inputData, stationName);
	if(dataPoint != 0) {
		var i = 0;
		for(i = 0; i < dataPoint.dataValues.length; i++) {
            var buttonHTML = $('#plotWeatherButton' + i).button();
            buttonHTML.click(function(event) {
                //Generate the plot based on things
                var buttonID = this.id;
                var buttonNumber = buttonID.slice('plotWeatherButton'.length);
				var selfHTML = $('#' + buttonID);
                var plotID = 'graphWeatherPoint' + buttonNumber;

                //Do we already have a plot?
                var plotHTML = $('#' + plotID);
                if(plotHTML.html() == '') {
                    plotScatter(dataPoint.dataValues[buttonNumber].typeName, '',
                            dataPoint.dataValues[buttonNumber].timeValues,
                            plotID, 0);
					/*getRegressionFunctionPlot(
							dataPoint.dataValues[buttonNumber].timeValues, plotID,
							dataPoint.code3, dataPoint.dataValues[buttonNumber].typeName);*/
					selfHTML.button("option", "label", "Hide Graph");
                } else {
                    plotHTML.html('');
					selfHTML.button("option", "label", "Plot Graph");
                }
			});
			var combineButtonHTML = $('#combineButton' + i).button();
            combineButtonHTML.click(function(event) {
                var buttonID = this.id;
                var buttonNumber = buttonID.slice('combineButton'.length);
                //Add to the graph
                plotScatter(dataPoint.dataValues[buttonNumber].typeName, dataPoint.code3, 
                        dataPoint.dataValues[buttonNumber].timeValues,
                        'multiGraph', 1);
            });
			
			var addButtonHTML = $('#addButton' + i).button();
			addButtonHTML.click( function(event) {
				//Grab id
				var buttonID = this.id;
				var buttonNumber = buttonID.slice('addButton'.length);
				
				//Check how many divs there are 
				var manyGraphDivChildren = $('#manyGraph > div');
				
				var graphNumber = manyGraphDivChildren.length;
				
				//Generate the html
				var graphDiv = '<div id="subGraph' + graphNumber + '"></div>';
				
				$('#manyGraph').append(graphDiv);
				
				//Graph it
				plotScatter(dataPoint.dataValues[buttonNumber].typeName, dataPoint.code3, 
                            dataPoint.dataValues[buttonNumber].timeValues, 
                            'subGraph' + graphNumber, 0);
			});
		}

		//Assign functionality to the allButton
		var allButtonHTML = $('#allButton').button();
		allButtonHTML.on('click', function() {
			//Plots a stacked bar
			var topX = $('#amount').val();
			var amount = 5;
			if(!Number.isNaN(parseInt(topX))) {
				amount = parseInt(topX);
			}
			plotStack(agriDataPoint, 'allGraph', amount);
		});
	}
}


//Gives the buttons funcitonality
function giveAgriCultureButtonsFunctionality(detailsHTML, inputData, codeName) {
    //Do a search for all the buttons based on the data
    var dataPoint = findDataPointCountry(inputData, codeName, 3);
    if(dataPoint != 0) {
        var i = 0;
        for (i = 0; i < dataPoint.dataValues.length; i++) {
            var buttonHTML = $('#plotButton' + i).button();
            buttonHTML.click(function (event) {
                //Generate the plot based on things
                var buttonID = this.id;
                var buttonNumber = buttonID.slice('plotButton'.length);
                var selfHTML = $('#' + buttonID);
                var plotID = 'graphPoint' + buttonNumber;

                //Do we already have a plot?
                var plotHTML = $('#' + plotID);
                if (plotHTML.html() == '') {
                    plotScatter(dataPoint.dataValues[buttonNumber].typeName, dataPoint.code3,
                        dataPoint.dataValues[buttonNumber].timeValues,
                        plotID, 0);
                    /*getRegressionFunctionPlot(
                        dataPoint.dataValues[buttonNumber].timeValues, plotID,
                        dataPoint.code3, dataPoint.dataValues[buttonNumber].typeName);*/
                    selfHTML.button("option", "label", "Hide Graph");
                } else {
                    plotHTML.html('');
                    selfHTML.button("option", "label", "Plot Graph");
                }
            })
            var combineButtonHTML = $('#combineButton' + i).button();
            combineButtonHTML.click(function (event) {
                var buttonID = this.id;
                var buttonNumber = buttonID.slice('combineButton'.length);
                //Add to the graph
                plotScatter(dataPoint.dataValues[buttonNumber].typeName, dataPoint.code3,
                    dataPoint.dataValues[buttonNumber].timeValues,
                    'multiGraph', 1);
            });

            var addButtonHTML = $('#addButton' + i).button();
            addButtonHTML.click(function (event) {
                //Grab id
                var buttonID = this.id;
                var buttonNumber = buttonID.slice('addButton'.length);

                //Check how many divs there are
                var manyGraphDivChildren = $('#manyGraph > div');

                var graphNumber = manyGraphDivChildren.length;

                //Generate the html
                var graphDiv = '<div id="subGraph' + graphNumber + '"></div>';

                $('#manyGraph').append(graphDiv);

                //Graph it
                plotScatter(dataPoint.dataValues[buttonNumber].typeName, dataPoint.code3,
                    dataPoint.dataValues[buttonNumber].timeValues,
                    'subGraph' + graphNumber, 0);
            });
        }

        //Assign functionality to the search bar
        $('#myInput').keyup(function (event) {
            //if (event.which == 13) {
                var input = $('#myInput');
                var textValue = input.val().toUpperCase();

                //Iterate through the entire list and hide if it doesn't contain the
                //thing
                var i = 0;
                var layerTitles = $('div .layerTitle');
                var layerTitleList = $('div .layerTitle > li');
                for (i = 0; i < layerTitleList.length; i++) {
                    if (!$(layerTitleList[i]).html().toUpperCase().includes(textValue)) {
                        $(layerTitles[i]).hide();
                    } else if (textValue == '') {
                        $(layerTitles[i]).show();
                    } else if ($(layerTitleList[i]).html().toUpperCase().includes(textValue)) {
                        $(layerTitles[i]).show();
                    }
                }
           // }

        });
		
		//Assign functionality to the allButton
		var allButtonHTML = $('#allButton').button();
		allButtonHTML.on('click', function() {
			//Plots a stacked bar
			var topX = $('#amount').val();
			var amount = 5;
			if(!Number.isNaN(parseInt(topX))) {
				amount = parseInt(topX);
			}
			plotStack(dataPoint, 'allGraph', amount);
		});
    }
}

//Generates a button which searches a city and code
function generateWeatherHTML(countryData) {
	var weatherHTML = '<p>Weather Search</p>';
	weatherHTML += '<p><input type="text" class="form-control" id="cityInput" placeholder="Search for city" title="Type in a layer"></p>';
	weatherHTML += '<select id="countryNames" class="form-control">'
	var i = 0;
	console.log(countryData);
	for(i = 0; i < countryData.length; i++) {
		weatherHTML += '<option>' + countryData[i].code2 + ' - ' + countryData[i].country + '</option>';
	}
	weatherHTML += '</select>';
	weatherHTML += '<p><button class="btn-info" id="searchWeather">Search Weather</button></p>';
	$('#weather').append(weatherHTML);
}

function giveWeatherButtonFunctionality() {
	var weatherButton = $('#searchWeather').button();
	weatherButton.on('click', function() {
		//Extract the two inputs
		var cityInput = $('#cityInput').val();
		var country = $('#countryNames :selected').val();
		var countryInput = country.slice(0,2);
		console.log(countryInput);
		//Make an api request
		var apiURL = 'http://api.openweathermap.org/data/2.5/weather?q=' + cityInput + ',' 
				+ countryInput + '&appid=' + APIKEY;
		console.log(apiURL);
		//Make an ajax request
		$.ajax({
			url: encodeURI(apiURL),
			method: 'get',
			dataType: 'json',
			success: function(data) {
				//Create some html
				var dropArea = $('#searchDetails');
				dropArea.html('');
				var tempHTML = '<h5>Weather Details for ' + data.name + '</h5>';
				tempHTML += '<p>Current Outlook: ' + data.weather[0].main + '</p>';
				tempHTML += '<p>Current Outlook Description: ' + data.weather[0].description + '</p>';
				tempHTML += '<p>Current Temperature (Celsius): ' + Math.round((data.main.temp - 272),2) + '</p>';
				tempHTML += '<p>Max Temperature Today (Celsius): ' + Math.round((data.main.temp_max - 272),2) + '</p>'; 
				tempHTML += '<p>Min Temperature Today (Celsius): ' + Math.round(data.main.temp_min  - 272, 2) + '</p>';
				tempHTML += '<p>Pressure (HPa): ' + data.main.pressure + '</p>';
				tempHTML += '<p>Humidity (%): ' + data.main.humidity + '</p>';
				tempHTML += '<p>Wind speed (m/s)' + data.wind.speed + '</p>';
				dropArea.append(tempHTML);
				console.log('success');
			},
			fail: function() {
				console.log('fail');
			}
		})
	});
}

//Based on z-score get a colour
//Green means above mean, red means below, alpha is 1 by default
function getColour(zScore) {
    var configuration = {};
    configuration.attributes = new WorldWind.ShapeAttributes(null);

    //Could use exponential decay function or something
    var red = 0;
    var green = 0;


    if (zScore < 0) {
        red = 1;
        green = Math.exp(zScore);
    } else if (zScore == 0) {
        red = 1;
        green = 1;
    } else if (zScore > 0) {
        green = 1;
        red = Math.exp(-1 * zScore);
    }
    configuration.attributes.interiorColor =
        new WorldWind.Color(red, green, 0, 1);
    configuration.attributes.outlineColor =
        new WorldWind.Color(0.5 * red, 0.5 * green, 0, 1);
	configuration.name = 'Hello World';
    return configuration;
}

//Given a set of gradients and country pairs, colourize the countries
//Also needs the GEOJSON file to be accessed
function colourizeCountries(valueCountryPair, geoJSONData) {
    //Isolate the gradients
    var i = 0;
    var values = [];
    for (i = 0; i < valueCountryPair.length; i++) {
        values.push(valueCountryPair[i].value);
    }
    //Find mean, and sd
    var mean = ss.mean(values);
    var sd = ss.standardDeviation(values);

	//Generate the legend for the thing
	var legendAmounts = 7;
	var legendOffset = -3;
	
	//Empty the legend segment
	$('#colour-legend').html('');
	
	var legendHTML = '';
	for(i = 0; i < legendAmounts; i++) {
		//Search the div and generate the appropiate canvas next to it
		var segmentHTML = '<h4>Geo Comparison Legend</h4>';
		segmentHTML += '<p>Standard deviation of ' + (i + legendOffset) + 
				' or a value of ' + (mean + (sd * (i + legendOffset))) + '</p>';
		segmentHTML += '<canvas id="canvas'+ i + '" width="200" height="100"></canvas>';
		
		segmentHTML += '<br>';
		legendHTML += segmentHTML;
	}
	$('#colour-legend').html(legendHTML);
	
	for(i = 0; i < legendAmounts; i++) {
		//Colour the canvas
		var tempCanvas = document.getElementById("canvas" + i);
		var tempCanvaCtx = tempCanvas.getContext("2d");
		
	    //Could use exponential decay function or something
		var red = 0;
		var green = 0;

		var zValue = i + legendOffset;

		if (zValue < 0) {
			red = 255;
			green = Math.round(Math.exp(zValue) * 255);
		} else if (zValue == 0) {
			red = 255;
			green = 255;
		} else if (zValue > 0) {
			green = 255;
			red = Math.round(Math.exp(-1 * zValue) * 255);
		}		
		console.log(red,green);
		tempCanvaCtx.fillStyle = 'rgb('+ red +', ' + green + ', 0)';
		tempCanvaCtx.fillRect(0,0,200,100);
	}
	
    //Loop through and determine the colour based on zscore
    var countryLayers = new WorldWind.RenderableLayer('Geo Country Data');
    var zScore;
    for (i = 0; i < valueCountryPair.length; i++) {
        zScore = ss.zScore(valueCountryPair[i].value, mean, sd);
        //Get the colour
        var countryConfiguration;
        countryConfiguration = getColour(zScore);
		countryConfiguration.name = 'haha';
        //Fire up the rendering
        var j = 0;
        for (j = 0; j < geoJSONData.features.length; j++) {
            if (geoJSONData.features[j].properties.code3 == valueCountryPair[i].code3) {
                var countryString = JSON.stringify(geoJSONData.features[j]);
                var tempCallBack = function () {
                    return countryConfiguration;
                }
                var countryStringJSON = new WorldWind.GeoJSONParser(countryString);
                countryStringJSON.load(null, tempCallBack, null);
				var innerLayer = countryStringJSON.layer;
				var k = 0;
				for(k = 0; k < innerLayer.renderables.length; k++) {
					innerLayer.renderables[k].userProperties.country = valueCountryPair[i].code3;
				}
				countryLayers.addRenderable(innerLayer);
				//countryStringJSON.layer.displayName = valueCountryPair[i].code3;
				//countryLayers.addRenderable(countryStringJSON.layer);
            }
        }
    }
	console.log(countryLayers);
    //Returns a renderable layer
    return countryLayers;
}


//Helps out with the regression function, given an array of time-values pairs,
//convert them to x-y pairs
function getXYPairs(incomingData) {
    var xyPairs = [];
    var i = 0;
    for (i = 0; i < incomingData.length; i++) {
        xyPairs.push([parseFloat(incomingData[i].year),
            parseFloat(incomingData[i].value)]);
    }

    return xyPairs;
}

//Given a set of data, finds the regression function
function getRegressionFunctionPlot(incomingData, htmlID, countryCode,
                                   titleName) {
    var regressionFunction;
	console.log('Hello1');
    //Filter out the data
    var tempDataArray = filterOutBlanks(incomingData, 0);
    incomingData = tempDataArray;

    //Get the xy pairs
    var xyPairs = getXYPairs(incomingData);

    //Perform a linear regression
    var regressionFunction = regression('linear', xyPairs);
	var regressionFunction2 = regression('exponential', xyPairs);
    //Retrieve the new y-values
    //var regressionFunctionLine = ss.linearRegressionLine(regressionFunction);

    var i = 0;
    var newYValues = [];
	var newYValues2 = [];
	var startYear = 1960;
	var endYear = 2050;
    for (i = 0; i < endYear - startYear; i++) {
        newYValues.push((regressionFunction.equation[0]*(i + startYear)) + regressionFunction.equation[1]);
		newYValues2.push((regressionFunction2.equation[0]*Math.exp(regressionFunction2.equation[1]*(i + startYear))));
    }

    //Format it it can be used by plotScatter function
    var inputData = [];
	var inputData2 = [];
    var tempData;
	var tempData2;
    for (i = 0; i < endYear - startYear; i++) {
        tempData = {};
        tempData.year = i + startYear;
        tempData.value = newYValues[i];
        inputData.push(tempData);
		tempData2 = {};
		tempData2.year = i + startYear;
		tempData2.value = newYValues2[i];
		inputData2.push(tempData2);
    }

    //Assuming the previous title was made, simply add regression to the add

    //Plot it
	//Assuming the previous title was made, simply add regression to the add
	var titleName1 = titleName;
	var titleName2 = titleName;
	
    titleName1 += 'linear regression ' + regressionFunction.r2.toPrecision(5);
	titleName2 += 'exponential regression ' + regressionFunction2.r2.toPrecision(5);
    plotScatter(titleName1, countryCode, inputData, htmlID, 1);
	plotScatter(titleName2, countryCode, inputData2, htmlID, 1);
}

//Generate the button to remove the multigraphs
function generateRemoveButton() {
    //Generate the remove button for the graphs
    var removeHTML = '<p><button class="btn-info" id="removeButton">Remove All Graphs</button></p>';
    $("#graphs").append(removeHTML);
    var removeButton = $('#removeButton');
    removeButton.button();
    removeButton.on('click', function () {
        //Just purge all the children of the almighty graph
		var almightyGraphDiv = $('#almightyGraph > div');
		var i = 0;
		for(i = 0; i < almightyGraphDiv.length; i++) {
			if(almightyGraphDiv[i].childNodes.length == 1) {
				Plotly.purge(almightyGraphDiv[i].id);
			} else {
				var j = 0;
				for(j = 0; j < almightyGraphDiv[i].childNodes.length; j++) {
				    Plotly.purge(almightyGraphDiv[i].childNodes[j].id);
				}
			}
		}
    });
}

function generateAtmoButtons(inputData, stationName, agriData, ccode3) {
    var atmoHTML = '<h4>Atmosphere Data</h4>';
    var dataPoint = findDataPointStation(inputData, stationName);
	atmoHTML += '<div id="allGraph"></div>';
	atmoHTML += '<button class="btn-info" id="allButton">Graph All Crops</button>';
    if (dataPoint != 0) {
        var i = 0;
        for (i = 0; i < dataPoint.dataValues.length; i++) {

            //Generate the remaining HTML
            atmoHTML += '<div class="layerTitle" id="layerTitle' + i + '">';
            atmoHTML += '<p>' + dataPoint.dataValues[i].typeName + '</p>';
            atmoHTML += '<div class="resizeGraph" id="graphWeatherPoint' + i + '"></div>';
            atmoHTML += '<button'
                + ' class="btn-info"' + ' id="plotWeatherButton' + i + '">Plot Graph</button>';
			atmoHTML += '<button class="btn-info" id="combineButton' + i + '">Combine Graph </button>';
            atmoHTML += '<button class="btn-info" id="addButton' + i + '">Add Graph</button>';
            atmoHTML += '<br></div>';
        }
    }
    return atmoHTML;
}

function generateAgriCultureButtons(inputData, codeName) {
    //Based on the input data, generate the buttons/html
    var agriHTML = '<h4>Agriculture Data</h4>' + '<input type="text" class="form-control" id="myInput" placeholder="Search for datasets.." title="Type in a layer">';
	agriHTML += '<input type="text" class="form-control" id="amount" placeholder="How many of the biggest crops?" title="Type in a layer">';
    var dataPoint = findDataPointCountry(inputData, codeName,3);
    if(dataPoint != 0) {
        var i = 0;
        agriHTML += '<ul id="myUL">';
		agriHTML += '<button class="btn-info" id="allButton">Graph Specified # of Crops</button>';
		agriHTML += '<div id="allGraph"></div>';
        for(i = 0; i < dataPoint.dataValues.length; i++) {
            //Generate the HTML
            agriHTML += '<div class="layerTitle" id="layerTitle' + i + '"><li>' + dataPoint.dataValues[i].typeName + '</li>';
			agriHTML += '<div class="resizeGraph" id="graphPoint' + i + '"></div>';
            agriHTML += '<button'
                + ' class="btn-info"' + ' id="plotButton' + i + '">Plot Graph</button>';
            agriHTML += '<button class="btn-info" id="combineButton' + i + '">Combine Graph </button>';
            agriHTML += '<button class="btn-info" id="addButton' + i + '">Add Graph</button>';
            agriHTML += '<br></div>';
        }
		
        agriHTML += '</ul>';
    }
    return agriHTML;
}

//Finds the closest country (centre based)
function findInformationUsingLocation(wwd, lat, lon, countryData, stationData) {
	//Go through every country 
	var i = 0;
	var smallestCountryDistance = 10e10;
	var countryCode;
	//var locationChecker = new WorldWind.Location()
	for(i = 0; i < countryData.length; i++) {
		//Determine the distance
		var location1 = new WorldWind.Location(countryData[i].lat, countryData[i].lon);
		var location2 = new WorldWind.Location(lat, lon);
		var distance = WorldWind.Location.greatCircleDistance(location1, location2) * wwd.globe.equatorialRadius;
		//console.log(distance, countryData[i].code3);
		if(distance < smallestCountryDistance) {
			smallestCountryDistance = distance;
			countryCode = countryData[i].code3;
		}
	}	
	
	var smallestStationDistance = 10e10;
	var stationName;
	for(i = 0; i < stationData.length; i++) {
		//Determine the distance
		var location1 = new WorldWind.Location(stationData[i].lat, stationData[i].lon);
		var location2 = new WorldWind.Location(lat, lon);
		var distance = WorldWind.Location.greatCircleDistance(location1, location2) * wwd.globe.equatorialRadius;
		//console.log(distance, countryData[i].code3);
		if(distance < smallestStationDistance) {
			smallestStationDistance = distance;
			stationName = stationData[i].stationName;
		}
	}	
	console.log(countryCode, smallestCountryDistance);
	console.log(stationName, smallestStationDistance);
}

//Enables draw mode 
function createSearchButton() {
	//Drop at the weather point
	var searchHTML = '<h4>Compare weather and agriculture data</h4>';
	searchHTML+= '<button id="searchWeather">Enable Draw</button>';
	searchHTML += '<div id="searchResults"></div>';
	$("#comp").append(searchHTML);
	
	var searchButton = $('#searchWeather').button();
	searchButton.on('click', function() {
		//Set the searchMode to 1
		searchMode = 1;
	});
}

//Plots a stacked bar given all the set of data
function plotStack(inputData, htmlID, amount) {
	var i = 0;
	var filteredDataSet = [];
	for(i = 0; i < inputData.dataValues.length; i++) {
		filteredDataSet.push(filterOutBlanks(inputData.dataValues[i].timeValues, 1));
	}
	var xValuesSet = [];
	var yValuesSet = [];
	var j = 0;
	for(i = 0; i < filteredDataSet.length; i++) {
		var xValues = [];
		var yValues = [];
		for(j = 0; j < filteredDataSet[i].length; j++) {
			xValues.push(parseFloat(filteredDataSet[i][j].year));
			yValues.push(parseFloat(filteredDataSet[i][j].value));
		}
		xValuesSet.push(xValues);
		yValuesSet.push(yValues);
	}
	//console.log(xValuesSet, yValuesSet, inputData);
	
	//We need to check by years
	var yearAmount = (2014 - 1961);
	
	//Find the top so and so yValues
	var totalAmounts = [];
	var topPercentages = [];
	var numRanks = 5;
	var k = 0;
	
	//Array of top values
	var showDataValues = [];
	for(i = 0; i < inputData.dataValues[0].timeValues.length; i++) {
		//OK for each year, get all the yValues
		var tempAmounts = [];
		var tempValue = 0;
		for(j = 0; j < filteredDataSet.length; j++) {
			tempAmounts.push(parseFloat(filteredDataSet[j][i].value));
			tempValue += parseFloat(filteredDataSet[j][i].value);
		}
		totalAmounts.push(tempValue);
		
		//We got all the values
		//Filter by a raw amount
		tempAmounts.sort(function(a, b){return a-b});
		
		//Grab the 5th highest value
		var threshold = tempAmounts[tempAmounts.length - amount - 1];
		var top5 = 0;
		//Now find every data set that has a value that is the 5th or higher (not 0)
		for(j = 0; j < filteredDataSet.length; j++) {
			var value = parseFloat(filteredDataSet[j][i].value);
			if((value > threshold) && (value != 0)) {
				//Check if item is already in the array
				var isIn = false;
				for(k = 0; k < showDataValues.length; k++) {
					if(showDataValues[k].typeName == inputData.dataValues[j].typeName) {
						isIn = true;
						break;
					}
				}
				
				if(isIn == false) {
					//Not in, create a new object
					var tempObj = {};
					tempObj.typeName = inputData.dataValues[j].typeName;
					tempObj.xValues = [];
					tempObj.yValues = [];
					tempObj.yValues.push(value);
					tempObj.xValues.push(parseFloat(filteredDataSet[j][i].year));
					showDataValues.push(tempObj);
				} else {
					showDataValues[k].yValues.push(value);
					showDataValues[k].xValues.push(parseFloat(filteredDataSet[j][i].year));
				}
				//Find the percentage
				top5 += value;
			} 
		}
		
		//Find the percentage
		topPercentages.push((top5/tempValue) * 100);
	}
	console.log(showDataValues);
	
	//Create the traces
	var traces = [];
	for(i = 0; i < showDataValues.length; i++) {
		var trace = {
			x: showDataValues[i].xValues,
			y: showDataValues[i].yValues,
			name: showDataValues[i].typeName,
			type: 'bar'
		}
		traces.push(trace);
	}
	
	//Final percentages push
	var tempTrace = {
		x: xValuesSet[0],
		y: topPercentages,
		type: 'scatter',
		yaxis:'y2',
		name: 'Top ' + amount
	}
	traces.push(tempTrace);
	//Create the graph
	var xAxis = {
		title: 'Year'
	};
	
	var yAxis = {
		title: 'Production (tonnes)'
	}
	
	var yAxis2 = {
		title: 'Percentage of top ' + amount,
		overlaying: 'y',
		side: 'right'
	}
	
	var layout = {
		barmode: 'stack',
		xaxis: xAxis,
		yaxis: yAxis,
		yaxis2: yAxis2
	}
	Plotly.newPlot(htmlID, traces, layout);
}

//Creates a scatter plot based on the input data
//It is assumed that the input data is an array of timeValue pair
function plotScatter(titleName, secondName, inputData, htmlID, mode) {
    //Filter the input data, we may get some blanks
    var filteredData = filterOutBlanks(inputData, 0);
    //Blank years gone, create the x-y axis
    var xValues = [];
    var yValues = [];
    var i = 0;
    for(i = 0; i < filteredData.length; i++) {
        xValues.push(parseFloat(filteredData[i].year));
        yValues.push(parseFloat(filteredData[i].value));
    }
    
    //Create the plotly graph
    var graph = {
        name: titleName + ' ' + secondName,
        x: xValues,
        y: yValues,
        mode: 'markers',
        type: 'scatter'
    };
    
    var xAxis = {
        title: 'Year'
    }
    
	if(mode == 0) {
		var yAxis = {
			title: titleName
		}; 
	}
	else {
		var yAxis = {
			title: 'Unitless'
		};
	}
	
	var titleString = '';
	if(mode == 0) {
		titleString = titleName + ' vs Year';
	} else {
		titleString = 'Legend vs Year';
	}
	
    var layout = {
        xaxis: xAxis,
        yaxis: yAxis,
        title: titleString
    };
    
    //Check if the htmlID is empty
    var plotHTML = $('#'+ htmlID);
	console.log(mode);
    if((mode == 0) || ((mode == 1) && plotHTML.html() == '')){
        //Indicates new plot
        Plotly.newPlot(htmlID, [graph], layout);
    } else if(mode == 1) {
        Plotly.addTraces(htmlID, [graph]);
        var dimensions = {
            width: '100%'
        }
        var multiGraphUpdate = {
            title: 'Multiple Graphs'
        }
		console.log('Hi');
        Plotly.update(htmlID, multiGraphUpdate);
        Plotly.relayout(htmlID, dimensions);
    }
}

// sidebar functions
var tabsFn = (function() {

    function init() {
        setHeight();
    }

    function setHeight() {
        var $tabPane = $('.tab-pane'),
            tabsHeight = $('.resizable').height();

        $tabPane.css({
            height: tabsHeight
        });
    }

    $(init);

    $( ".resizable" ).resizable({
        stop:setHeight,
        // animation removed - stops resizing from working
        maxHeight: 800,
        maxWidth: 1200,
        minHeight: 250,
        minWidth: 280
    });
})();

$(function () {
    $(".draggable").draggable({
        handle: ".nav-tabs"
    });
});


//sidebar toggle
$(document).ready(function () {
    $(".toggle1").click(function () {
        $("#layers").toggle('fast', 'swing');
        $("#graphs").hide('fast', 'swing');
        $("#country").hide('fast', 'swing');
        $("#station").hide('fast', 'swing');
        $("#comp").hide('fast', 'swing');
        $("#weather").hide('fast', 'swing');
        $("#view").hide('fast', 'swing');

    });
    $(".toggle2").click(function () {
        $("#country").toggle('fast', 'swing');
        $("#layers").hide('fast', 'swing');
        $("#graphs").hide('fast', 'swing');
        $("#station").hide('fast', 'swing');
        $("#comp").hide('fast', 'swing');
        $("#weather").hide('fast', 'swing');
        $("#view").hide('fast', 'swing');
    });
    $(".toggle3").click(function () {
        $("#station").toggle('fast', 'swing');
        $("#layers").hide('fast', 'swing');
        $("#graphs").hide('fast', 'swing');
        $("#country").hide('fast', 'swing');
        $("#comp").hide('fast', 'swing');
        $("#weather").hide('fast', 'swing');
        $("#view").hide('fast', 'swing');
    });
    $(".toggle4").click(function () {
        $("#graphs").toggle('fast', 'swing');
        $("#layers").hide('fast', 'swing');
        $("#station").hide('fast', 'swing');
        $("#country").hide('fast', 'swing');
        $("#comp").hide('fast', 'swing');
        $("#weather").hide('fast', 'swing');
        $("#view").hide('fast', 'swing');
    });
    $(".toggle5").click(function () {
        $("#comp").toggle('fast', 'swing');
        $("#layers").hide('fast', 'swing');
        $("#graphs").hide('fast', 'swing');
        $("#country").hide('fast', 'swing');
        $("#station").hide('fast', 'swing');
        $("#weather").hide('fast', 'swing');
        $("#view").hide('fast', 'swing');
    });
    $(".toggle6").click(function () {
        $("#weather").toggle('fast', 'swing');
        $("#layers").hide('fast', 'swing');
        $("#graphs").hide('fast', 'swing');
        $("#country").hide('fast', 'swing');
        $("#station").hide('fast', 'swing');
        $("#comp").hide('fast', 'swing');
        $("#view").hide('fast', 'swing');
    });
    $(".toggle7").click(function () {
        $("#view").toggle('fast', 'swing');
        $("#layers").hide('fast', 'swing');
        $("#graphs").hide('fast', 'swing');
        $("#country").hide('fast', 'swing');
        $("#station").hide('fast', 'swing');
        $("#comp").hide('fast', 'swing');
        $("#weather").hide('fast', 'swing');
    });

});
});
