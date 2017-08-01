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
var geoMode = 0;


requirejs({paths:{
    "jquery":"https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min",
    "jqueryui": "https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min",
    "jquery-csv": "https://cdnjs.cloudflare.com/ajax/libs/jquery-csv/0.8.3/jquery.csv",
    "simple-stats": "https://unpkg.com/simple-statistics@4.1.0/dist/simple-statistics.min",
	"regression": "src/regression/regression",
	"math": "src/math/math.min",
	"resizejs" : "js/resizejs/src/ResizeSensor"
}
},['src/WorldWind',
        './LayerManager', 'src/formats/kml/KmlFile',
        'src/formats/kml/controls/KmlTreeVisibility', './Pin', 'jquery', 'jqueryui', 'jquery-csv',
        'simple-stats', 'regression', 'math', "resizejs"],
    function (ww,
              LayerManager, KmlFile, KmlTreeVisibility) {
        "use strict";

        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);
		WorldWind.configuration.baseUrl = '';
		var regression = require("regression");
		var derivative = require("math");
		var ResizeSensor = require("resizejs");
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

        // Web Map Service information from NASA's Near Earth Observations WMS
        // Named layer displaying Average Temperature data
        //Load the WMTS layers

        var geoJSONData = loadGEOJsonData();

        //Load the country data
        var csvData = loadCSVData();
        var csvMultiData = loadCSVDataArray();
        var agriData = convertArrayToDataSet(csvMultiData[0]);
		var atmoData = convertArrayToDataSet(csvMultiData[1]);
		var priceData = convertArrayToDataSet(csvMultiData[2]);
		var liveData = convertArrayToDataSet(csvMultiData[3]);
		var emissionAgriData = convertArrayToDataSet(csvMultiData[4]);
		var atmoDataMonthly = convertArrayToDataSet(csvMultiData[5]);
		var pestiData = convertArrayToDataSet(csvMultiData[6]);
		var fertiData = convertArrayToDataSet(csvMultiData[7]);
		var yieldData = convertArrayToDataSet(csvMultiData[8]);
		var agriDef = csvData[2];
        //Generate the placemark layers
        generatePlacemarkLayer(wwd, csvData);

        //Generate the remove button
        generateRemoveButton();

		//Generate the button for weather
		generateWeatherHTML(csvData[0]);
		giveWeatherButtonFunctionality();

		// Create a layer manager for controlling layer visibility.
        var layerManager = new LayerManager(wwd);
		layerManager.synchronizeLayerList();
        //Generate regression comparison and the provide functionality
        generateGeoComparisonButton(agriData);
        giveGeoComparisonFunctionality(agriData, geoJSONData, wwd, layerManager);


        //Automatically zoom into Helsinki, Finland
        wwd.goTo(new WorldWind.Position(60.1870, 24.8296, 16e5));

        var starFieldLayer = new WorldWind.StarFieldLayer();
        var atmosphereLayer = new WorldWind.AtmosphereLayer();

        //IMPORTANT: add the starFieldLayer before the atmosphereLayer
        wwd.addLayer(starFieldLayer);
        wwd.addLayer(atmosphereLayer);

        wwd.redrawCallbacks.push(runSunSimulation);

		//Generate WMS/WMTS Layers
		loadWMTSLayers(wwd, layerManager);
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
                        if(pickList.objects[i].userObject.type == 'Country') {
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


                            detailsHTML += '<button class="btn-info"><a href="http://www.fao.org/faostat/en/#data/" target="_blank">Download Raw Agriculture Data</a></button>';

                            //Generate the agri buttons


                            //Get the agriculture data
							detailsHTML += generateCountryButtons();
							detailsHTML += '<div id="buttonArea"></div>';
                            //detailsHTML += generateAgriCultureButtons(agriData, dataPoint.code3);
                            details.html(detailsHTML);

                            //Give functionality for the buttons generated
							giveCountryButtonsFunctionality(agriData, priceData, liveData, emissionAgriData, pestiData,
									fertiData, yieldData, agriDef, dataPoint.code3);
                            //giveAgriCultureButtonsFunctionality(detailsHTML, agriData, dataPoint.code3);

                            //fixed hover flags bug - now click instead of hover eventlistener
                            var otherTab = $("#layers");
                            var otherTab2 = $("#graphs");
                            var otherTab3 = $("#station");
                            var otherTab4 = $("#comp");
                            var otherTab5 = $("#wms");
                            var otherTab6 = $("#weather");
                            var otherTab7 = $("#view");
                            details.show();
                            otherTab.hide();
                            otherTab2.hide();
                            otherTab3.hide();
                            otherTab4.hide();
                            otherTab5.hide();
                            otherTab6.hide();
                            otherTab7.hide();

                            $('.glyphicon-globe').css('color','white');
                            $('.fa-map').css('color','white');
                            $('.glyphicon-cloud').css('color','white');
                            $('.fa-area-chart').css('color','white');
                            $('.glyphicon-briefcase').css('color','white');
                            $('.fa-sun-o').css('color','white');
                            $('.glyphicon-eye-open').css('color','white');
                            $('.glyphicon-flag').css('color','lightgreen');

							$('.resizable').show();

                        } else if(pickList.objects[i].userObject.type == 'Weather Station') {
							var atmoDataPoint =
								findDataPoint(csvData[1], placeLat, placeLon);

							var countryData = csvData[0];
							var ccode2 = atmoDataPoint.stationName.slice(0,2);
							var ccode3 = findDataPointCountry(countryData, ccode2, 2).code3;

							var agriDataPoint = findDataPointCountry(agriData, ccode3, 3);

							var details = $('#station');
							var detailsHTML = '<h4>Weather Station Detail</h4>';

							detailsHTML += '<p>Station Name: ' + atmoDataPoint.stationName + '</p>';
                            detailsHTML += '<button class="btn-info"><a href="https://fluxnet.fluxdata.org//data/download-data/" target="_blank">Download Raw Atmosphere Data (Fluxnet Account Required)</a></button>'
							//Generate the station buttons
							detailsHTML += generateAtmoButtons(atmoData, atmoDataMonthly, atmoDataPoint.stationName, agriDataPoint, ccode3);

							details.html(detailsHTML);

							//Generate the plots
							//Give functionality for buttons generated
							giveAtmoButtonsFunctionality(detailsHTML, atmoData,
									atmoDataMonthly, atmoDataPoint.stationName,
									agriDataPoint);

                            var otherTab = $("#layers");
                            var otherTab2 = $("#graphs");
                            var otherTab3 = $("#country");
                            var otherTab4 = $("#comp");
                            var otherTab5 = $("#wms");
                            var otherTab6 = $("#weather");
                            var otherTab7 = $("#view");
                            details.show();
							$('.resizable').show();
                            otherTab.hide();
                            otherTab2.hide();
                            otherTab3.hide();
                            otherTab4.hide();
                            otherTab5.hide();
                            otherTab6.hide();
                            otherTab7.hide();

                            $('.glyphicon-globe').css('color','white');
                            $('.fa-map').css('color','white');
                            $('.glyphicon-cloud').css('color','lightgreen');
                            $('.fa-area-chart').css('color','white');
                            $('.glyphicon-briefcase').css('color','white');
                            $('.fa-sun-o').css('color','white');
                            $('.glyphicon-eye-open').css('color','white');
                            $('.glyphicon-flag').css('color','white');
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
            // If only one thing is picked and it is the terrain, tell the world window to go to the picked location.
            if (pickList.objects.length == 1 && pickList.objects[0].isTerrain) {
                var position = pickList.objects[0].position;


				//Find the closest country and placemark
				findInformationUsingLocation(wwd, position.latitude, position.longitude, csvData[0], csvData[1]);
            }
        };

// Listen for mouse clicks.
var clickRecognizer = new WorldWind.ClickRecognizer(wwd, handleClick);

// Listen for taps on mobile devices.
var tapRecognizer = new WorldWind.TapRecognizer(wwd, handleClick);

//Given a layerName and its layernumber, generate a layer control block

//Key Notes: This function generates the HTML first then supplies
//functionality
function generateLayerControl(wwd, wmsConfig, wmsLayerCapabilities, layerName, layerNumber) {
    //Generate the div tags
    var layerControlHTML = '<div class="toggleLayers" id="funcLayer' + layerNumber + '">';

  layerControlHTML += '<span style="display:none">Layer Controls for ' + layerName + '</span>';
    //Spawn opacity controller
    layerControlHTML += generateOpacityControl(wwd, layerName, layerNumber);
    //Spawn the legend
    layerControlHTML += generateLegend(wwd,
        wmsLayerCapabilities, layerName, layerNumber);

    //Spawn the time if it has it
    if (typeof(wmsConfig.timeSequences) != 'undefined') {
        layerControlHTML += generateTimeControl(wwd, layerName, layerNumber, wmsConfig);
    }
	layerControlHTML += '</div>';
    //Place the HTML somewhere
    $("#wms").append(layerControlHTML);

    //Add functionality to opacity slider
    giveOpacitySliderFunctionality(wwd, layerName, layerNumber);

    //Check time again to add functionality
    if (typeof(wmsConfig.timeSequences) != 'undefined') {
        giveTimeButtonFunctionality(wwd, layerName, layerNumber, wmsConfig);
    }
}


//wwd is the world window
//layerName is the layer we are searching for
//Given the wwd and layername, return the
//the appropiate layer object
function getLayerFromName(wwd, layerName) {
    var i = 0;

    for(i = 0; i < wwd.layers.length; i++) {
        if(wwd.layers[i].displayName == layerName) {
            return wwd.layers[i];
        }
    }
    return 0;
}


//wwd is the worldwindow
//wmsLayerCapabilities is the object representing what the wms layer can do
//layerName is simply the name of the layer
//layerNumber represents where it should be generated among the other layers
//Given these variables, return a string that contains the html
//to set up a legend
function generateLegend(wwd, wmsLayerCapabilities, layerName, layerNumber) {

    //Check if a legend exists for a given layer this
    var legendHTML = '<br><h5><b>Legend</b></h5>';

	//Be thorough on checking the existence
	if((wmsLayerCapabilities.styles
		!= null) && (wmsLayerCapabilities.styles[0].legendUrls[0]) != null) {
		//Create the legend tag
		var legendURL = wmsLayerCapabilities.styles[0].legendUrls[0].url;
		legendHTML += '<div><img src="'+ legendURL +'"></div><br><br>';
	} else {
		//Say it does not exist
		legendHTML += '<div><p>A legend does not exist'  +
			'for this layer</p></div>';
	}
    return legendHTML;
}


//layerNumber is the identifier to place on the html
//simply generate the opacity html control
function generateOpacityControl(wwd, layerName, layerNumber) {
    //Create the general box
    var opacityHTML = '<br><h5><b>Opacity';

    //Create the slider
    opacityHTML += '<div id="opacity_slider_' + layerNumber + '"></div>';

    //Create the output
    opacityHTML += '<div id="opacity_amount_' + layerNumber + '">100%</div>';


    return opacityHTML;
}

//wwd is the world window
//layerName is the name of the layer we wish to give the opacity control to
//layerNumber gives us the id to use
//Given these 3 variables, give functionality to the slider created
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
                        document.wwd_duplicate.forEach(function (element,
								index, array) {
                            element.redraw();
                        });
                    }
                }
            }
        }
    });

}


//Given the world window, layerName, number and the wmslayer config object,
//Return the html to spawn a time control slider
function generateTimeControl(wwd, layerName, layerNumber, wmsConfig) {
    //Create the general box
    //Create the output
    var startDate;
    var endDate;

	//Basically modify the string based on whether it is monthly or daily
    if (layerName.indexOf("month") != -1){
		//Forcibly remove the month format (though)
        startDate =
				wmsConfig.timeSequences[0].startTime.toDateString().substring(4, 7) + " " +
				wmsConfig.timeSequences[0].startTime.toDateString().substring(11, 15);
        endDate = wmsConfig.timeSequences[wmsConfig.timeSequences.length - 1].endTime.toDateString().substring(4, 7) + " " +
            wmsConfig.timeSequences[wmsConfig.timeSequences.length - 1].endTime.toDateString().substring(11, 15);
    }
    else {
		//Simply output the date time stamp
        startDate = wmsConfig.timeSequences[0].startTime.toDateString();
        endDate = wmsConfig.timeSequences[wmsConfig.timeSequences.length - 1].endTime.toDateString();
    }

	//Generate the appropiate html with our dates
    var timeHTML = '<h5><b>Time Scale:</b> ' + startDate + ' - ' + endDate + '</h5>';
    timeHTML += '<div id="time_scale_' + layerNumber + '"></div>';
    timeHTML += '<div id="time_date_' + layerNumber + '"><br>Current Time: Use the Time Scale</div>';
    //Wrap up the HTML
    timeHTML += '</div>';
    timeHTML += '<br>';


    return timeHTML;
}

//Provides basic functionality for the time slider
function giveTimeButtonFunctionality(wwd, layerName, layerNumber, wmsConfig) {
	var leftButtonTemplate= "#time_left_";
	var leftButtonString = leftButtonTemplate.concat(layerNumber);
	var rightButtonTemplate = "#time_right_";
	var rightButtonString = rightButtonTemplate.concat(layerNumber);
	var leftButton = $(leftButtonString);
	var rightButton = $(rightButtonString);
	leftButton.button();
	var targetLayer = getLayerFromName(wwd, layerName);
	var slider = $('#time_scale_' + layerNumber).slider();
	var length;

	//As of now, the time is stored into sequences
	//We split the slider up into pieces which is based on the array length
	if(wmsConfig.timeSequences.length > 1) {
		length = wmsConfig.timeSequences.length;
	} else {
		length = 1;
	}

	//We vary our range based on these values
	slider.slider({
        value: Math.round(wmsConfig.timeSequences.length/2),
        min: 0,
        max: length - 0.01,
        step: 0.01
	});

	//Get the time using inbuilts of time sequences
	//(see worldwind documentation)
	slider.on('slide', function(event, ui) {
		var timeNumber = ui.value - Math.floor(ui.value);
		var segmentNumber = Math.floor(ui.value);
		$('#time_date_' + layerNumber).html('<br>Current time for this layer: ' +
            wmsConfig.timeSequences[segmentNumber].getTimeForScale(timeNumber).toDateString().substring(4));
	});

	slider.on('slidestop', function(event, ui) {
		var timeNumber = ui.value - Math.floor(ui.value);
		var segmentNumber = Math.floor(ui.value);
		targetLayer.time =
				wmsConfig.timeSequences[segmentNumber].getTimeForScale(timeNumber);
	});
}
//loading screen
setTimeout(function () {
    $("#loading_modal").fadeOut();
}, 4000);

$(document).ready(function () {
    $('#sidebarCollapse').on('click', function () {
        $('#sidebar').toggleClass('active');
        $(this).toggleClass('active');
    });
});

//Generates the placemark layers
//The types are predetermined in order
//This assumes the CSV data is loaded in order too obviously
//Assumption is dataType 1 maps to csvData 1
function generatePlacemarkLayer(wwd, csvData){
    //Data type list
    var dataTypes = ['Country', 'Weather Station'];

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
    placemarkAttributes.labelAttributes.color = WorldWind.Color.WHITE;
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

			//How we handle the string is based on the type we determine
            if(dataTypes[i] == 'Country') {
                labelString = csvData[i][j].country + ' - ' + csvData[i][j].code3;
            } else if(dataTypes[i] == 'Weather Station') {
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
            if(dataTypes[i] == 'Country') {
                //Image would be a flag
                placemarkAttributes.imageSource = './flags/' +
                        csvData[i][j].iconCode + '.png';
				placemark.userObject = {code3: csvData[i][j].code3,
						country: csvData[i][j].country};
            } else if(dataTypes[i] == 'Weather Station') {
				placemarkAttributes.imageSource = 'images/pushpins/push-pin-yellow.png';
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
    var csvList = ['csvdata/countries.csv', 'csvdata/weatherstations.csv',
			'csvdata/cropAcros.csv'];
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
//Assumes its an object that contains a paramter type or value pair
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

//Find the definition of the crop based on the name
function findCropDefinition(dataSet, cropName) {
	var i = 0;
	for(i = 0; i < dataSet.length; i++) {
		if(dataSet[i].Item == cropName) {

			return dataSet[i].Description;
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
    var csvList = ['csvdata/FAOcrops.csv', 'csvdata/Atmo.csv', 'csvdata/prices2.csv',
			'csvdata/livestock.csv', 'csvdata/emissionAll.csv', 'csvdata/Monthly_AvgData1.csv',
			'csvdata/pesti.csv', 'csvdata/ferti.csv', 'csvdata/yield.csv'];
    //Find the file
    var csvString = "";

	var csvData = [];
	var i = 0;
	//Send out request and grab the csv file content
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


//Given a csv data array, convert the segment into objects
//Assumes the csv file is in the format of id, paramatertype, year1 value,
//year2 value..
//year end value. This will return an array of objects containing the ids
//and an array of year-value pairs
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

//Preloads the wmts layers, could expand it to generalize for various address
//and layer names
function loadWMTSLayers(wwd, layerManager) {
    var serviceWMTSAddress = "https://neowms.sci.gsfc.nasa.gov/wms/wms";
    var layerName = ["TRMM_3B43M", "MYD28M", "MOD11C1_D_LSTDA", "MOD11C1_D_LSTNI", "MOD_143D_RR"];
	var totalLayers = [];
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
            wmsLayer.time = wmsConfig.timeSequences[0].startTime;

            // disable layer by default
            wmsLayer.enabled = false;
			totalLayers.push(wmsLayer);
            // Add the layers to World Wind and update the layer manager
            wwd.addLayer(wmsLayer);
			//Generate the html
			var layerButtonsHTML =
					'<button class="btn-info wmsButton" id="layerToggle' + i
							+'">' + wmsLayerCapabilities.title + '</button>';
			//Append html somehwere
			$('#wms').append(layerButtonsHTML);
			$('#layerToggle' + i).button();

			//Basically turn the controls on and off
			$('#layerToggle' + i).click(function() {
				var k = 0;
				var buttonNumber = this.id.slice('layerToggle'.length);
				totalLayers[buttonNumber].enabled = !totalLayers[buttonNumber].enabled;
				var layerControlList = $('.toggleLayers');
				var layerNumber = -1;
				for(k = 0; k < layerControlList.length; k++) {
					if($(layerControlList[k]).text().includes($(this).text())) {
						layerNumber = k;
						break;
					}
				}
				if(layerNumber != -1) {
					//Find the button
					$(layerControlList[k]).toggle();
				}
			});

            generateLayerControl(wwd, wmsConfig, wmsLayerCapabilities, wmsConfig.title, i);
            // layerManager.synchronizeLayerList();

			//Readd layercontrols
			setLayerControls();
			layerManager.synchronizeLayerList();
        }
    };

    // Called if an error occurs during WMS Capabilities document retrieval
    var logError = function (jqXhr, text, exception) {
        console.log("There was a failure retrieving the capabilities document: " + text + " exception: " + exception);
    };

    $.get(serviceWMTSAddress).done(createWMTSLayer).fail(logError);
}

//Refreshes the control or the functionality of the layerManager buttons
//every time it is called for wmts layers
function setLayerControls() {
	//Give the layer buttons extra funcitonality
	var layerButtonList = $('#layerList button');
	var layerControlList = $('.toggleLayers');
	var j = 0;
	var k = 0;
	for(j = 0; j < layerControlList.length; j++) {
		$(layerControlList[j]).hide();
	}


	for(j = 0; j < layerButtonList.length; j++) {
		$(layerButtonList[j]).button();
		$(layerButtonList[j]).on('click', function(event) {
			var layerNumber = -1;
			for(k = 0; k < layerControlList.length; k++) {
				if($(layerControlList[k]).text().includes($(this).text())) {
					layerNumber = k;
					break;
				}
			}
			if(layerNumber != -1) {
				if($(this).hasClass('active')) {
					//Active class for button, find the appropiate layer
					$(layerControlList[k]).show();
				} else {
					//Hide the class
					$(layerControlList[k]).hide();
				}
			}
		});
	}
}

//Loads kml layers (not used)
function loadKMLLayers(wwd, layerManager) {
    var kmlFilePromise = new KmlFile('doc.kml', [new KmlTreeVisibility('kmltree', wwd)]);
    kmlFilePromise.then(function (kmlFile) {
        var renderableLayer = new WorldWind.RenderableLayer("Rice Yield Data");
        renderableLayer.addRenderable(kmlFile);

        wwd.addLayer(renderableLayer);
        layerManager.synchronizeLayerList();
    });
}

//The link is hardcoded. Loads the appropiated geojson data
//no arguments because only one link so far
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
//
// function loadWMSLayers(wwd, layerManager) {
//     var serviceWMSAddress = "http://sedac.ciesin.org/geoserver/ows?service=wms&version=1.3.0&request=GetCapabilities";
//     var layerName = ["povmap:povmap-global-subnational-infant-mortality-rates_2000", 'povmap:povmap-global-subnational-prevalence-child-malnutrition',
//             'gpw-v4:gpw-v4-population-count_2000', 'gpw-v4:gpw-v4-population-count_2005', 'gpw-v4:gpw-v4-population-count_2010', 'gpw-v4:gpw-v4-population-count_2015',
//             'gpw-v4:gpw-v4-population-count_2020'];
//     // Called asynchronously to parse and create the WMS layer
//     var createWMSLayer = function (xmlDom) {
//         // Create a WmsCapabilities object from the XML DOM
//         var wms = new WorldWind.WmsCapabilities(xmlDom);
//         // using for loop to add multiple layers to layer manager; SUCCESS!!!!
//         var i = 0;
//         for (i = 0; i < layerName.length; i++) {
//             // Retrieve a WmsLayerCapabilities object by the desired layer name
//             var wmsLayerCapabilities = wms.getNamedLayer(layerName[i]);
//
//             // Form a configuration object from the WmsLayerCapability object
//             var wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
//             // Modify the configuration objects title property to a more user friendly title
//             wmsConfig.title = wmsLayerCapabilities.title;
//
//             var wmsLayer;
//             wmsLayer = new WorldWind.WmsLayer(wmsConfig);
//
//             // disable layer by default
//             wmsLayer.enabled = false;
//
//             // Add the layers to World Wind and update the layer manager
//             wwd.addLayer(wmsLayer);
//             generateLayerControl(wwd, wmsConfig, wmsLayerCapabilities, wmsConfig.title, i);
//             layerManager.synchronizeLayerList();
//         }
//     };
//
//     // Called if an error occurs during WMS Capabilities document retrieval
//     var logError = function (jqXhr, text, exception) {
//         console.log("There was a failure retrieving the capabilities document: " + text + " exception: " + exception);
//     };
//
//     $.get(serviceWMSAddress).done(createWMSLayer).fail(logError);
// }

//Assuming the value is an empty string, gets rid of it
//Filters out blanks in an array. 0 mode means skip
//1 mode means set value to 0 in case of blank
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

//Applies functionality for the buttons for geo comparison
//agridata only so far
function giveGeoComparisonFunctionality(agriData, geoJSONData, wwd, layerManager) {
    //Generate the slider first
	geoMode = 0;
    var sliderHTML = $('#geoSlider');
    sliderHTML.slider({
        value: 2014,
        min: 1960,
        max: 2014,
        step:1
    });

    sliderHTML.on('slide', function(event, ui) {
        //Capture the year div
        var sliderValueDiv = $('#geoSlideValue');
        sliderValueDiv.html('Year Select: ' + ui.value);
    })

	sliderHTML.on('slidestop', function(event, ui) {
		var year = ui.value;
		document.getElementById('geoCompType' + geoMode).click();
	});

    //Search through the buttons
    var i = 0;
    for(i = 0; i < agriData.length; i++) {
        var buttonHTML = $('#geoCompType' + i);
        buttonHTML.button();
        buttonHTML.click(function(event) {
            //Find the year based on the slider value
            var sliderValue = $('#geoSlider').slider("value");
			geoMode = parseInt(this.id.slice('geoCompType'.length));
            var buttonName = $('#' + this.id).text().slice();

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

            var countryLayer = colourizeCountries(countryData, geoJSONData, buttonName);
			countryLayer.userObject.year = sliderValue;
            //Check if the country layer exist
			var flagLayer;
            var l = 0;
			var currentLayerName;
            for(l = 0; l < wwd.layers.length; l++) {
                if(wwd.layers[l].displayName == 'Geo Country Data') {

					currentLayerName = wwd.layers[l].userObject.dataType;
					var previousYear = wwd.layers[l].userObject.year;
                    wwd.removeLayer(wwd.layers[l]);
                } else if(wwd.layers[l].displayName == 'Country Placemarks') {
					flagLayer = wwd.layers[l];
				}
            }

			if((currentLayerName != buttonName) || (previousYear != sliderValue)){
				wwd.addLayer(countryLayer);
				layerManager.synchronizeLayerList();
				setLayerControls();
				var m = 0;
				//Go through the entire country flag placemarks and change the label
				for(l = 0; l < flagLayer.renderables.length; l++) {
					var code3 = flagLayer.renderables[l].userObject.code3;
					var flagName = flagLayer.renderables[l].userObject.country + '- ' +
							code3;
					//Find the agriData with the code3
					for(j = 0; j < agriData.length; j++) {
						if(agriData[j].code3 == code3) {
							//Go through the timeValue that matches the year
							for(k = 0; k < agriData[j].dataValues.length; k++) {
								if(agriData[j].dataValues[k].typeName == buttonName) {
									for(m = 0; m < agriData[j].dataValues[k].timeValues.length; m++) {
										if(agriData[j].dataValues[k].timeValues[m].year == sliderValue) {
											if(agriData[j].dataValues[k].timeValues[m].value != '') {
												flagName = flagLayer.renderables[l].userObject.country + '\n - ' + buttonName + '\n' +
														agriData[j].dataValues[k].timeValues[m].value;
											}
										}
									}
								}
							}
						}
					}
					flagLayer.renderables[l].label = flagName;
				}
			} else {
				//Just go through the flag layer and relabel it to default
				for(l = 0; l < flagLayer.renderables.length; l++) {
					flagLayer.renderables[l].label =
							flagLayer.renderables[l].userObject.country +
							'-' + flagLayer.renderables[l].userObject.code3;
				}
			}
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

    });
}

//Generates the html for geo location comparison
function generateGeoComparisonButton(agriData) {
     var count = 4;
    var i = 0;
	var j = 0;
    var comparisonHTML = '';
    //Also implement the slider
    comparisonHTML += '<p><div id="geoSlider"></div><div id="geoSlideValue">Year Select: 2014</div></p><br>';
	var buttonNames = [];
	//Create the buttons, grab all the names for every crop known
	for(i = 0; i < agriData.length; i++) {
		for(j = 0; j < agriData[i].dataValues.length; j++) {
			if(!buttonNames.includes(agriData[i].dataValues[j].typeName)) {
				buttonNames.push(agriData[i].dataValues[j].typeName);
			}
		}
	}

    var dropArea = $('#comp');

    dropArea.append('<input type="text" class="form-control" id="geoCompareSearch" placeholder="Search for datasets..." title="Search for datasets...">');
	comparisonHTML += '<div><b>Generate Geo-Comparison Data for...</b>';

	//Generic button template
    for(i = 0; i < buttonNames.length; i++) {
        var buttonTempName = buttonNames[i];
        comparisonHTML += '<div class="buttonDiv"><button class="btn-info geoCompButton" id="geoCompType' + i +
            '">'+ buttonTempName + '</button><br></div>';
    }


    var dropArea = $('#comp')
    dropArea.append(comparisonHTML);
}

//Gives the button functionality for weather station
function giveAtmoButtonsFunctionality(detailsHTML, inputData, inputData2,
		stationName, agriDataPoint) {
	var dataPoint = findDataPointStation(inputData, stationName);
	var dataPoint2 = findDataPointStation(inputData2, stationName);

	var offSetLength = dataPoint.dataValues.length;
	if(dataPoint != 0) {
		var i = 0;
		for(i = 0; i < (dataPoint.dataValues.length + dataPoint2.dataValues.length); i++) {
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

					if(buttonNumber < offSetLength) {
						plotScatter(dataPoint.dataValues[buttonNumber].typeName, '',
								dataPoint.dataValues[buttonNumber].timeValues,
								plotID, 0);
					} else {
						plotScatter(dataPoint2.dataValues[buttonNumber - offSetLength].typeName, '',
								dataPoint2.dataValues[buttonNumber - offSetLength].timeValues,
								plotID, 0);
					}
					selfHTML.button("option", "label", "Hide Graph");
                } else {
                    plotHTML.html('');
					selfHTML.button("option", "label", "Plot Graph");
                }
                $('#messagePoint' + buttonNumber).html('Plotted graph!');
                setTimeout(function(){ $('#messagePoint'+ buttonNumber).html('')}, 5000);
			});
			var combineButtonHTML = $('#combineButton' + i).button();
            combineButtonHTML.click(function(event) {
                var buttonID = this.id;
                var buttonNumber = buttonID.slice('combineButton'.length);
                //Add to the graph
				if(buttonNumber < offSetLength) {
					plotScatter(dataPoint.dataValues[buttonNumber].typeName, dataPoint.code3,
							dataPoint.dataValues[buttonNumber].timeValues,
							'multiGraph', 1);
				} else {
					plotScatter(dataPoint2.dataValues[buttonNumber - offSetLength].typeName, dataPoint.code3,
							dataPoint2.dataValues[buttonNumber - offSetLength].timeValues,
							'multiGraph', 1);
				}
                $('#messagePoint' + buttonNumber).html('Combined graph! Please go to Data Graphs Tab');
                setTimeout(function(){ $('#messagePoint'+ buttonNumber).html('')}, 5000);
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
                $('#messagePoint' + buttonNumber).html('Added graph! Please go to Data Graphs Tab');
                setTimeout(function(){ $('#messagePoint'+ buttonNumber).html('')}, 5000);
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
			plotStack(agriDataPoint, 'allGraphStation', amount);
			createSubPlot(dataPoint.dataValues, 'allGraphStation');
		});
	}
}


//Gives the data buttons funcitonality
function giveDataButtonsFunctionality(detailsHTML, inputData, agriDef, codeName, mode) {
    //Do a search for all the buttons based on the data
    var dataPoint = findDataPointCountry(inputData, codeName, 3);
	//Check for existing data point
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
				$('#messagePoint' + buttonNumber).html('Plotted graph!');
				//In short, create a temporary message indicating success
				setTimeout(function(){ $('#messagePoint'+ buttonNumber).html('')}, 5000);
            })
            var combineButtonHTML = $('#combineButton' + i).button();
            combineButtonHTML.click(function (event) {
                var buttonID = this.id;
                var buttonNumber = buttonID.slice('combineButton'.length);
                //Add to the graph
                plotScatter(dataPoint.dataValues[buttonNumber].typeName, dataPoint.code3,
                    dataPoint.dataValues[buttonNumber].timeValues,
                    'multiGraph', 1);
				$('#messagePoint' + buttonNumber).html('Combined graph! Please go to Data Graphs Tab');
				setTimeout(function(){ $('#messagePoint'+ buttonNumber).html('')}, 5000);
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
				$('#messagePoint' + buttonNumber).html('Added graph! Please go to Data Graphs Tab');
				setTimeout(function(){ $('#messagePoint'+ buttonNumber).html('')}, 5000);
            });

			if(mode == 0) {
				var definitionHTML = $('#definitionNumber' + i).button();
				definitionHTML.click(function (event) {
					//Grab id
					var buttonID = this.id;
					var buttonNumber = buttonID.slice('definitionNumber'.length);

					//Grab titleName
					var cropName = $(this).text().slice('Get Definition for '.length);

					//Do a CSV search
					var description = findCropDefinition(agriDef, cropName);

					$('#messagePoint' + buttonNumber).html(description);
					setTimeout(function(){ $('#messagePoint'+ buttonNumber).html('')}, 10000);

				});
			}
        }

		$('#sortByName').click(function() {
			//Go through the entire button list and sort them
			var divList = $('.layerTitle');
			var newList = [];
			divList.sort(function(a, b) {
				//Compare with the list element
				if(a.firstChild.innerText < b.firstChild.innerText) {
					return -1;
				} else if(a.firstChild.innerText > b.firstChild.innerText) {
					return 1;
				}
				return 0;
			});

			//Now that things are sorted, make a duplicate
			var i = 0;
			for(i = 0; i < divList.length; i++) {
				//$('#myUL').append($(divList[i]).html());
				newList.push($(divList[i]).clone());
			}
			$('#myUL > .layerTitle').remove();
			for(i = 0; i < newList.length; i++) {
				$('#myUL').append('<div class="layerTitle" id="'+$(newList[i]).attr('id')+'">' + $(newList[i]).html() + '</div>');
			}
			giveDataButtonsFunctionality(detailsHTML, inputData, agriDef, codeName, mode);
		});

		$('#sortByAverage').click(function() {
			var divList = $('.layerTitle');
			var newList = [];
			divList.sort(function(a, b) {
				//Get the buttons
				var buttonNumber1 = $(a).attr('id').slice('layerTitle'.length);
				var buttonNumber2 = $(b).attr('id').slice('layerTitle'.length);
				var data1 = dataPoint.dataValues[buttonNumber1].timeValues;
				data1 = filterOutBlanks(data1, 0);
				var data2 = dataPoint.dataValues[buttonNumber2].timeValues;
				data2 = filterOutBlanks(data2, 0);
				//Got the number
				var sum1 = 0;
				var i = 0;
				for(i = 0; i < data1.length; i++) {
					sum1 += data1[i].value;
				}
				var mean1 = sum1/i;
				var sum2 = 0;
				for(i = 0; i < data2.length; i++) {
					sum2+= data2[i].value;
				}
				var mean2 = sum2/i;

				if(mean1 < mean2) {
					return 1;
				} else if(mean1 > mean2) {
					return -1;
				}
				return 0;
			});

			//Now that things are sorted, make a duplicate
			var newList = [];
			for(i = 0; i < divList.length; i++) {
				newList.push($(divList[i]).clone());
			}
			$('#myUL > .layerTitle').remove();
			for(i = 0; i < newList.length; i++) {
				$('#myUL').append('<div class="layerTitle" id="'+$(newList[i]).attr('id')+'">' + $(newList[i]).html() + '</div>');
			}
			giveDataButtonsFunctionality(detailsHTML, inputData, agriDef, codeName, mode);
		});

        //Assign functionality to the search bar
        $('#searchinput').keyup(function (event) {
            //if (event.which == 13) {
                var input = $('#searchinput');
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

//Generates the html for the weather search
function generateWeatherHTML(countryData) {
	var weatherHTML = '<h5class="smallerfontsize">Weather Search</h5>';
	weatherHTML += '<p><input type="text" class="form-control" id="cityInput" placeholder="Search for city" title="Type in a layer"></p>';
	weatherHTML += '<select id="countryNames" class="form-control">'
	var i = 0;

	for(i = 0; i < countryData.length; i++) {
		weatherHTML += '<option>' + countryData[i].code2 + ' - ' + countryData[i].country + '</option>';
	}
	weatherHTML += '</select><br>';
	weatherHTML += '<p><button class="btn-info" id="searchWeather">Search Weather</button></p>';
  weatherHTML += '<div id="searchDetails"></div>'
	$('#weather').append(weatherHTML);
}


//Provides functionality for the weather button search
function giveWeatherButtonFunctionality() {
	var weatherButton = $('#searchWeather').button();
	weatherButton.on('click', function() {
		//Extract the two inputs
		var cityInput = $('#cityInput').val();
		var country = $('#countryNames :selected').val();
		var countryInput = country.slice(0,2);

		//Make an api request
		var apiURL = 'http://api.openweathermap.org/data/2.5/weather?q=' + cityInput + ','
				+ countryInput + '&appid=' + APIKEY;

		//Make an ajax request
		//Note that api attempst to return the closet result possible
		$.ajax({
			url: encodeURI(apiURL),
			method: 'get',
			dataType: 'json',
			success: function(data) {
				//Create some html
				var dropArea = $('#searchDetails');
				dropArea.html('');
				var tempHTML = '<h5 class="fontsize"><b>Weather Details for ' + data.name + '</b></h5>';
				tempHTML += '<p><b>Country:</b> ' + data.sys.country + '</p><br>';
				tempHTML += '<p><b>Current Outlook:</b> ' + data.weather[0].main + '</p><br>';
				tempHTML += '<p><b>Current Outlook Description:</b> ' + data.weather[0].description + '</p><br>';
				tempHTML += '<p><b>Current Temperature (Celsius):</b> ' + Math.round((data.main.temp - 272),2) + '</p><br>';
				tempHTML += '<p><b>Sunrise:</b> ' + timeConverter(data.sys.sunrise) + '</p><br>';
                tempHTML += '<p><b>Sunset:</b> ' + timeConverter(data.sys.sunset) + '</p><br>';
				tempHTML += '<p><b>Max Temperature Today (Celsius):</b> ' + Math.round((data.main.temp_max - 272),2) + '</p><br>';
				tempHTML += '<p><b>Min Temperature Today (Celsius):</b> ' + Math.round(data.main.temp_min  - 272, 2) + '</p><br>';
				tempHTML += '<p><b>Pressure (HPa):</b> ' + data.main.pressure + '</p><br>';
				tempHTML += '<p><b>Humidity (%):</b> ' + data.main.humidity + '</p><br>';
				tempHTML += '<p><b>Wind speed (m/s):</b>' + data.wind.speed + '</p><br><br>';
				dropArea.append(tempHTML);

			},
			fail: function() {

			}
		})
	});
}


//Converts unixt time into a date
function timeConverter(UNIX_timestamp){
	var unixTime = new Date(UNIX_timestamp * 1000);
	var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
	var year = unixTime.getFullYear();
	var month = months[unixTime.getMonth()];
	var date = unixTime.getDate();
	var hour = unixTime.getHours();
	var min = unixTime.getMinutes();
	var sec = unixTime.getSeconds();
	var currentTime = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec + " (In Your Timezone)";
	return currentTime;
}


//Based on z-score get a colour
//Green means above mean, red means below, alpha is 1 by default
//Returns the configuration that should be used
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
//based on their z scores
//Also needs the GEOJSON file to be accessed
function colourizeCountries(valueCountryPair, geoJSONData, dataName) {
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
				countryLayers.userObject = {dataType: dataName};
				//countryStringJSON.layer.displayName = valueCountryPair[i].code3;
				//countryLayers.addRenderable(countryStringJSON.layer);
            }
        }
    }

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
	//Basically find the values based on projected model
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

//Generate the button to remove the multigraphs and combine graphs
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
			$(almightyGraphDiv[i]).html('');
		}
    });
}


//Generates the atmospheric button html
function generateAtmoButtons(inputData, inputData2, stationName, agriData, ccode3) {
    var atmoHTML = '<h4>Atmosphere Data</h4>';
    var dataPoint = findDataPointStation(inputData, stationName);
	var dataPoint2 = findDataPointStation(inputData2, stationName);
	atmoHTML += '<div id="allGraphStation"></div>';
	atmoHTML += '<button class="btn-info" id="allButton">Graph Crops and Weather</button>';
    if (dataPoint != 0) {
        var i = 0;
		//Yearly data
        for (i = 0; i < dataPoint.dataValues.length; i++) {
            //Generate the remaining HTML
            atmoHTML += '<div class="layerTitle" id="layerTitle' + i + '">';
            atmoHTML += '<p>' + dataPoint.dataValues[i].typeName + '</p>';
            atmoHTML += '<div class="resizeGraph" id="graphWeatherPoint' + i + '"></div>';
			atmoHTML += '<div id="messagePoint' + i + '"></div>';
            atmoHTML += '<button'
                + ' class="btn-info"' + ' id="plotWeatherButton' + i + '">Plot Graph</button>';
			atmoHTML += '<button class="btn-info" id="combineButton' + i + '">Combine Graph </button>';
            atmoHTML += '<button class="btn-info" id="addButton' + i + '">Add Graph</button>';
            atmoHTML += '<br></div>';
        }
		//Monthly data
		for(i = 0; i < dataPoint2.dataValues.length; i++) {
			var offSetLength = dataPoint.dataValues.length + i;
            atmoHTML += '<div class="layerTitle" id="layerTitle' + offSetLength + '">';
            atmoHTML += '<p>' + dataPoint2.dataValues[i].typeName + '</p>';
            atmoHTML += '<div class="resizeGraph" id="graphWeatherPoint' + offSetLength + '"></div>';
			atmoHTML += '<div id="messagePoint' + offSetLength + '"></div>';
            atmoHTML += '<button'
                + ' class="btn-info"' + ' id="plotWeatherButton' + offSetLength + '">Plot Graph</button>';
			atmoHTML += '<button class="btn-info" id="combineButton' + offSetLength + '">Combine Graph </button>';
            atmoHTML += '<button class="btn-info" id="addButton' + offSetLength + '">Add Graph</button>';
            atmoHTML += '<br></div>';
		}
    }
    return atmoHTML;
}

//Generates the buttons used by the country
//Each button should spawn its own data set
function generateCountryButtons() {
	var countryHTML = '<h5><b>Available Datasets</b></h5>';
  var isanEmptyDataset =
	countryHTML += '<button class="btn-info" id="spawnAgri">Show Agriculture Data List</button>';
	countryHTML += '<button class="btn-info" id="spawnPrice">Show Price Data List</button>';
	countryHTML += '<button class="btn-info" id="spawnLive">Show Livestock Data List</button>';
	countryHTML += '<button class="btn-info" id="spawnEmissionAgri">Show Ag. Emission Data List</button>';
	countryHTML += '<button class="btn-info" id="spawnPest">Show Pesticide Data List</button>';
	countryHTML += '<button class="btn-info" id="spawnFerti">Show Fertilizer Data List</button>';
	countryHTML += '<button class="btn-info" id ="spawnYield">Show Yield Data List</button>';
	return countryHTML;
}

//Gives funcitonality to the country buttons
//Basically they spawn another set of buttons to plot
function giveCountryButtonsFunctionality(agriData, priceData, liveData,
		emissionAgriData, pestiData, fertiData,
		yieldData, agriDef, codeName) {
	var buttonAreaHTML = $('#buttonArea');
	var agriButtons = $('#spawnAgri').button();
	var priceButtons = $('#spawnPrice').button();
	var liveButtons = $('#spawnLive').button();
	var emissionAgriButtons = $('#spawnEmissionAgri').button();
	var pestiButtons = $('#spawnPest').button();
	var fertiButtons = $('#spawnFerti').button();
	var yieldButtons = $('#spawnYield').button();

	//Just generate the buttons for each type
	agriButtons.on('click', function(){
		//Generate agri culture buttons
		buttonAreaHTML.html('');
		buttonAreaHTML.html(generateDataButtons(agriData, codeName, 0));
		giveDataButtonsFunctionality(buttonAreaHTML, agriData, agriDef, codeName, 0);
	});
	priceButtons.on('click', function() {
		buttonAreaHTML.html('');
		buttonAreaHTML.html(generateDataButtons(priceData, codeName, 1));
		giveDataButtonsFunctionality(buttonAreaHTML, priceData, agriDef, codeName, 1);
	});
	liveButtons.on('click', function() {
		buttonAreaHTML.html('');
		buttonAreaHTML.html(generateDataButtons(liveData, codeName, 2));
		giveDataButtonsFunctionality(buttonAreaHTML, liveData, agriDef, codeName, 2);
	});
	emissionAgriButtons.on('click', function(){
		buttonAreaHTML.html('');
		buttonAreaHTML.html(generateDataButtons(emissionAgriData, codeName, 3));
		giveDataButtonsFunctionality(buttonAreaHTML, emissionAgriData, agriDef, codeName, 3);
	});
	pestiButtons.on('click', function() {
		buttonAreaHTML.html('');
		buttonAreaHTML.html(generateDataButtons(pestiData, codeName, 4));
		giveDataButtonsFunctionality(buttonAreaHTML, pestiData, agriDef, codeName, 4);
	});
	fertiButtons.on('click', function() {
		buttonAreaHTML.html('');
		buttonAreaHTML.html(generateDataButtons(fertiData, codeName, 5));
		giveDataButtonsFunctionality(buttonAreaHTML, fertiData, agriDef, codeName, 5);
	});
	yieldButtons.on('click', function() {
		buttonAreaHTML.html('');
		buttonAreaHTML.html(generateDataButtons(yieldData, codeName, 6));
		giveDataButtonsFunctionality(buttonAreaHTML, yieldData, agriDef, codeName, 6);
	});
}


//Generates the HTML for each data type
function generateDataButtons(inputData, codeName, mode) {
    //Based on the input data, generate the buttons/html
	//Mode dictates what to call the title or search bar
	switch(mode) {
		case 0:
			var dataHTML = '<h4>Agriculture Data</h4>' + '<input type="text" class="form-control" id="searchinput" placeholder="Search for datasets.." title="Search for datasets..">';
			dataHTML += '<input type="text" class="form-control" id="amount" placeholder="How many of the biggest crops?" title="Search for datasets..">';
			break;
		case 1:
			var dataHTML = '<h4>Price Data</h4>' + '<input type="text" class="form-control" id="searchinput" placeholder="Search for datasets.." title="Search for datasets..">';
			dataHTML += '<input type="text" class="form-control" id="amount" placeholder="How many of top prices?" title="Search for datasets..">';
			break;
		case 2:
			var dataHTML = '<h4>Livestock Data</h4>' + '<input type="text" class="form-control" id="searchinput" placeholder="Search for datasets.." title="Search for datasets..">';
			dataHTML += '<input type="text" class="form-control" id="amount" placeholder="How many livestocks?" title="Search for datasets..">';
			break;
		case 3:
			var dataHTML = '<h4>Agriculture Emission Data</h4>' + '<input type="text" class="form-control" id="searchinput" placeholder="Search for datasets.." title="Search for datasets..">';
			dataHTML += '<input type="text" class="form-control" id="amount" placeholder="How many crops?" title="Search for datasets..">';
			break;
		case 4:
			var dataHTML = '<h4>Pesticide Data</h4>' + '<input type="text" class="form-control" id="searchinput" placeholder="Search for datasets.." title="Search for datasets..">';
			dataHTML += '<input type="text" class="form-control" id="amount" placeholder="How many pesticides?" title="Search for datasets..">';
			break;
		case 5:
			var dataHTML = '<h4>Fertiliser Data</h4>' + '<input type="text" class="form-control" id="searchinput" placeholder="Search for datasets.." title="Search for datasets..">';
			dataHTML += '<input type="text" class="form-control" id="amount" placeholder="How many fertilisers?" title="Search for datasets..">';
			break;
		case 6:
			var dataHTML = '<h4>Yield Data</h4>' + '<input type="text" class="form-control" id="searchinput" placeholder="Search for datasets.." title="Search for datasets..">';
			dataHTML += '<input type="text" class="form-control" id="amount" placeholder="How many crop yields?" title="Search for datasets..">';
			break;
	}
	//Find the appropiate data point to use for the buttons
    var dataPoint = findDataPointCountry(inputData, codeName,3);
    if(dataPoint != 0) {
        var i = 0;
        dataHTML += '<ul id="myUL">';
		switch(mode) {
            case 0:
                dataHTML += '<button class="btn-info" id="allButton">Graph Specified # of Crops</button>';
                break;
            case 1:
                dataHTML += '<button class="btn-info" id="allButton">Graph Specified # of Price Data</button>';
                break;
            case 2:
                dataHTML += '<button class="btn-info" id="allButton">Graph Specified # of Livestock Data</button>';
                break;
            case 3:
                dataHTML += '<button class="btn-info" id="allButton">Graph Specified # of Ag Emission Data</button>';
				break;
			case 4:
				dataHTML += '<button class="btn-info" id="allButton">Graph Specified # of Pesticide Data</button>';
				break;
			case 5:
				dataHTML += '<button class="btn-info" id="allButton">Graph Specified # of Fertilizer Data</button>';
				break;
			case 6:
				dataHTML += '<button class="btn-info" id="allButton">Graph Specified # of Yield</button>';
				break;
        }
        dataHTML += '<br><button class="btn-info" id="sortByName">Sort by Name</button>';
        dataHTML += '<br><button class="btn-info" id="sortByAverage">Sort by Amount</button>';
		dataHTML += '<div id="allGraph"></div>';

        for(i = 0; i < dataPoint.dataValues.length; i++) {
            //Generate the HTML to show for plots
            dataHTML += '<div class="layerTitle" id="layerTitle' + i + '"><li>' + dataPoint.dataValues[i].typeName + '</li>';
			if(mode == 0) {
				var tempTitleName = dataPoint.dataValues[i].typeName.slice(0, dataPoint.dataValues[i].typeName.length -
						' Production in tonnes'.length);
				dataHTML += '<button class="btn-info" id="definitionNumber' + i + '">Get Definition for '
						+ tempTitleName + '</button>';
			}

			dataHTML += '<div class="resizeGraph" id="graphPoint' + i + '"></div>';
            dataHTML += '<button'
                + ' class="btn-info"' + ' id="plotButton' + i + '">Plot Graph</button>';
			dataHTML += '<div id="messagePoint' + i + '"></div>';
            dataHTML += '<button class="btn-info" id="combineButton' + i + '">Combine Graph </button>';
            dataHTML += '<button class="btn-info" id="addButton' + i + '">Add Graph</button>';
            dataHTML += '<br></div>';
        }
		//dataHTML += '</div>';
        dataHTML += '</ul>';
    } else {
		dataHTML += '<p>No data avaliable!</p>';
	}
    return dataHTML;
}

//Finds the closest country (centre based) and station based on click
//location
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

		if(distance < smallestStationDistance) {
			smallestStationDistance = distance;
			stationName = stationData[i].stationName;
		}
	}
}

//Helper function for plotting the stack.
//In short, plots the crop, percentage and atmo data on the same graph
function createSubPlot(inputData, htmlID) {
	//In essence create subplots
	var i = 0;
	var traces = [];
	var newLayout = {};
	var incAmounts = (0.5/(inputData.length)).toFixed(2);
	newLayout['yaxis'] = {domain: [0, 0.5], title: 'Production in tonnes'};
	newLayout['yaxis2'] = {domain: [0, 0.5], side: 'right', title: 'Percent'};
	for(i = 0; i < inputData.length; i++) {
		var dataPoint = filterOutBlanks(inputData[i].timeValues, 0);
		var j = 0;
		var xValues = [];
		var yValues = [];
		for(j = 0; j < dataPoint.length; j++) {
			xValues.push(parseInt(dataPoint[j].year));
			yValues.push(parseFloat(dataPoint[j].value));
		}

		var tempTrace = {
			x: xValues,
			y: yValues,
			name: inputData[i].typeName,
			xaxis: 'x',
			yaxis: 'y' + (i + 3),
			graph: 'scatter'
		}
		traces.push(tempTrace);
		var lowDomain = (0.5 + (i * incAmounts)).toFixed(2);
		var highDomain = (0.5 + ((i + 1) * incAmounts)).toFixed(2);
		if(highDomain > 1) {
			highDomain = 1;
		}
		var yTitle;
		var plotSide;
		switch(i) {
			case 0:
				yTitle = 'Celsius';
				plotSide = 'right';
			break;
			case 1:
				yTitle = 'mm';
				plotSide = 'left';
			break;
		}
		newLayout['yaxis' + (i + 3)] = {domain: [lowDomain, highDomain - 0.01],
				title: yTitle, side: plotSide};
	}
	Plotly.addTraces(htmlID, traces);
	Plotly.relayout(htmlID, newLayout);
	Plotly.relayout( htmlID, {
		'xaxis.autorange': true,
		'yaxis.autorange': true
	});

	new ResizeSensor($('#' + htmlID), function() {
		var d3 = Plotly.d3;
		var gd3 = d3.select('#' + htmlID + '> div');
		gd = gd3.node();
		Plotly.Plots.resize(gd);
	});
}

//Plots a stacked bar given all the set of data
//Amount is how many of the top we want
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
		title: 'Amount (see legend)'
	}

	var yAxis2 = {
		title: 'Percentage of top ' + amount,
		overlaying: 'y',
		side: 'right',
		anchor: 'y',
		//position: 0.85
	}

	var layout = {
		title: 'Top ' + amount + ' amounts for ' + inputData.code3 + ' vs Year',
		barmode: 'stack',
		xaxis: xAxis,
		yaxis: yAxis,
		yaxis2: yAxis2,
		legend: {
			x: 1.15
		},
		autosize: true
	}
	var d3 = Plotly.d3;
	var size = 100;
  var ysize = 70;
	var gd3 = d3.select('#' + htmlID).append('div').style({
		width: size + '%', 'margin-left': ((100 - size)/2) + '%',
		height: ysize + 'vh', 'margin-top': ((100 - size)/2) + 'vh'
	});
	var gd = gd3.node();
	Plotly.plot(gd, traces, layout);
	new ResizeSensor($('#' + htmlID), function() {
		Plotly.Plots.resize(gd);
	});
}

//Creates a scatter plot based on the input data
//It is assumed that the input data is an array of timeValue pair
//Mode 0 assumes its an individual plot, 1 is otherwise
function plotScatter(titleName, secondName, inputData, htmlID, mode) {
    //Filter the input data, we may get some blanks
    var filteredData = filterOutBlanks(inputData, 0);
    //Blank years gone, create the x-y axis
    var xValues = [];
    var yValues = [];
    var i = 0;
    for(i = 0; i < filteredData.length; i++) {
		if(!isNaN(parseFloat(filteredData[i].year))) {
			xValues.push(parseFloat(filteredData[i].year));
		} else {
			xValues.push(filteredData[i].year);
		}
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
        title: titleString,
		showlegend: true
    };

    //Check if the htmlID is empty
    var plotHTML = $('#'+ htmlID);
	var d3 = Plotly.d3;
	var size = 100;
	var plotID = '#' + htmlID;
    if((mode == 0) || ((mode == 1) && plotHTML.html() == '')){
        //Indicates new plot
		var gd3 = d3.select(plotID).append('div').style({
			width: size + '%', 'margin-left': ((100 - size)/2) + '%',
			height: size + '%', 'margin-top': ((100 - size)/2) + '%'
		});
		var gd = gd3.node();
		$(gd).css('min-width','300px');
		$(gd).css('min-height', '300px');
		console.log(gd);
        Plotly.plot(gd, [graph], layout);
    } else if(mode == 1) {
		var gd3 = d3.select(plotID + '> div');
		var gd = gd3[0][0];
        Plotly.addTraces(gd, [graph]);
        var dimensions = {
            width: '100%'
        }
        var multiGraphUpdate = {
            title: 'Multiple Graphs'
        }

        Plotly.update(gd, multiGraphUpdate);
        Plotly.relayout(gd, dimensions);
    }
	console.log(plotHTML);
	if(!(htmlID.includes('sub') || htmlID.includes('multi'))){
		new ResizeSensor(plotHTML, function() {
			Plotly.Plots.resize(gd);
		});
	}
	/*plotHTML.resize(function() {
		console.log('Hello');
		Plotly.Plots.resize(gd);
	});*/
}

//Checks if there is anything visible
function checkTabs() {
	var allTabs = $('.tab-content > .tab-pane');

	var i = 0;
	var isDisplay = false;

	for(i = 0; i < allTabs.length; i++) {
		if($(allTabs[i]).css('display') != 'none') {
			isDisplay = true;

		}
	}
	var resizable = $('.resizable');

	if(isDisplay) {
		resizable.show();
	} else {
		resizable.hide();
	}
    if($('#wms').css('display') == 'none') {
        $('.glyphicon-globe').css('color','white');
    } else {
        $('.glyphicon-globe').css('color','lightgreen');
    }
    if($('#layers').css('display') == 'none') {
        $('.fa-map').css('color','white');
    } else {
        $('.fa-map').css('color','lightgreen');
    }
    if($('#country').css('display') == 'none') {
        $('.glyphicon-flag').css('color','white');
    } else {
        $('.glyphicon-flag').css('color','lightgreen');
    }
    if($('#station').css('display') == 'none') {
        $('.glyphicon-cloud').css('color','white');
    } else {
        $('.glyphicon-cloud').css('color','lightgreen');
    }
    if($('#graphs').css('display') == 'none') {
        $('.fa-area-chart').css('color','white');
    } else {
        $('.fa-area-chart').css('color','lightgreen');
    }
    if($('#comp').css('display') == 'none') {
        $('.glyphicon-briefcase').css('color','white');
    } else {
        $('.glyphicon-briefcase').css('color','lightgreen');
    }
    if($('#weather').css('display') == 'none') {
        $('.fa-sun-o').css('color','white');
    } else {
        $('.fa-sun-o').css('color','lightgreen');
    }
    if($('#view').css('display') == 'none') {
        $('.glyphicon-eye-open').css('color','white');
    } else {
        $('.glyphicon-eye-open').css('color','lightgreen');
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
        maxWidth: 1400,
        minHeight: 250,
        minWidth: 280
    });
})();

$(function () {
    $(".draggable").draggable({
      containment:"window"
    });
});
//sidebar toggle
$(document).ready(function () {
	checkTabs();
    $(".togglelayers").click(function () {
        $("#layers").toggle();
        $("#wms").hide();
        $("#graphs").hide();
        $("#country").hide();
        $("#station").hide();
        $("#comp").hide();
        $("#weather").hide();
        $("#view").hide();
		setTimeout(function() {checkTabs()}, 50);
    });
    $(".togglecountry").click(function () {
        $("#country").toggle();
        $("#layers").hide();
        $("#wms").hide();
        $("#graphs").hide();
        $("#station").hide();
        $("#comp").hide();
        $("#weather").hide();
        $("#view").hide();
		setTimeout(function() {checkTabs()}, 50);
    });
    $(".togglestation").click(function () {
        $("#station").toggle();
        $("#layers").hide();
        $("#wms").hide();
        $("#graphs").hide();
        $("#country").hide();
        $("#comp").hide();
        $("#weather").hide();
        $("#view").hide();
		setTimeout(function() {checkTabs()}, 50);
    });
    $(".togglegraphs").click(function () {
        $("#graphs").toggle();
        $("#layers").hide();
        $("#wms").hide();
        $("#station").hide();
        $("#country").hide();
        $("#comp").hide();
        $("#weather").hide();
        $("#view").hide();
		//This is amazing but apparently you can't use the resize sensor
		//unless the thing is present, go figure
		var i = 0;
		var j = 0;
		var manyGraphs = $('#manyGraph > div');
		for(i = 0; i < manyGraphs.length; i++) {
			//Assume 2 child nodes if resize exists
			if(manyGraphs[i].childNodes.length == 1) {
				//Add the resize
				console.log($(manyGraphs[i]).attr('id'));
				new ResizeSensor($('#' + $(manyGraphs[i]).attr('id')), function(){
					for(j = 0; j < manyGraphs.length; j++) {
						var gd = $(manyGraphs[j]).children()[0];
						Plotly.Plots.resize(gd);
						console.log('melo');
					}
				});
				var gd = $(manyGraphs[i]).children()[0];
				Plotly.Plots.resize(gd);
			}
		}
		var multiGraph = $('#multiGraph');
		if(multiGraph[0].childNodes.length == 1) {
			new ResizeSensor($(multiGraph), function() {
				var gd = $(multiGraph).children()[0];
				Plotly.Plots.resize(gd);
			});
			var gd = $(multiGraph).children()[0];
			Plotly.Plots.resize(gd);
		}

		setTimeout(function() {checkTabs()}, 50);
    });
    $(".togglecomp").click(function () {
        $("#comp").toggle();
        $("#layers").hide();
        $("#wms").hide();
        $("#graphs").hide();
        $("#country").hide();
        $("#station").hide();
        $("#weather").hide();
        $("#view").hide();
		setTimeout(function() {checkTabs()}, 50);
    });
    $(".toggleweather").click(function () {
        $("#weather").toggle();
        $("#layers").hide();
        $("#wms").hide();
        $("#graphs").hide();
        $("#country").hide();
        $("#station").hide();
        $("#comp").hide();
        $("#view").hide();
		setTimeout(function() {checkTabs()}, 50);
    });
    $(".toggleview").click(function () {
        $("#view").toggle();
        $("#layers").hide();
        $("#wms").hide();
        $("#graphs").hide();
        $("#country").hide();
        $("#station").hide();
        $("#comp").hide();
        $("#weather").hide();
		setTimeout(function() {checkTabs()}, 50);
    });
    $(".togglewms").click(function () {
        $("#wms").toggle();
        $("#layers").hide();
        $("#graphs").hide();
        $("#country").hide();
        $("#station").hide();
        $("#comp").hide();
        $("#weather").hide();
        $("#view").hide();
        setTimeout(function() {checkTabs()}, 50);
    });
	checkTabs();

  $('.legendButton').click(function() {
    $('.legend').toggle();
  });
  /* highlighting correct button for geocomparison and wms layers */
  $('.geoCompButton').click(function() {
      if ($('.geoCompButton').hasClass('active')) {
          var clickedButtonIsActive = $(this).hasClass('active');

          $('.geoCompButton.active').removeClass('active');

          if (!clickedButtonIsActive) {
              $(this).addClass('active');
          }
  }
      else {
          $(this).addClass('active');
      }
  });
  $('.wmsButton').click(function() {
      if ($('.wmsButton').hasClass('active')) {
          var clickedButtonIsActive = $(this).hasClass('active');

          $('.wmsButton.active').removeClass('active');

          if (!clickedButtonIsActive) {
              $(this).addClass('active');
          }
  }
      else {
          $(this).addClass('active');
      }
  });
  $('input:checkbox').click(function() {
      $(this).toggleClass('active');
  });
});
});
