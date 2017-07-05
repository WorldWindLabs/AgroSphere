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

requirejs({paths:{
    "jquery":"https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min",
    "jqueryui": "https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min",
    "jquery-csv": "https://cdnjs.cloudflare.com/ajax/libs/jquery-csv/0.8.3/jquery.csv",
}
},['../src/WorldWind',
        './LayerManager', '../src/formats/kml/KmlFile',
        '../src/formats/kml/controls/KmlTreeVisibility', './Pin', 'jquery', 'jqueryui', 'jquery-csv'],
    function (ww,
              LayerManager, KmlFile, KmlTreeVisibility) {
        "use strict";

        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        var wwd = new WorldWind.WorldWindow("canvasOne");

        var layers = [
            {layer: new WorldWind.BMNGLayer(), enabled: true},
            {layer: new WorldWind.BMNGLandsatLayer(), enabled: false},
            {layer: new WorldWind.BingAerialLayer(null), enabled: false},
            {layer: new WorldWind.BingAerialWithLabelsLayer(null), enabled: false},
            {layer: new WorldWind.BingRoadsLayer(null), enabled: false},
            {layer: new WorldWind.CompassLayer(), enabled: false},
            {layer: new WorldWind.CoordinatesDisplayLayer(wwd), enabled: true},
            {layer: new WorldWind.ViewControlsLayer(wwd), enabled: true}
        ];

        for (var l = 0; l < layers.length; l++) {
            layers[l].layer.enabled = layers[l].enabled;
            wwd.addLayer(layers[l].layer);
        }

        var cities = [
            {
                'name': "NASA Ames Research Center",
                'state': "California",
                'elevation': 0,
                'latitude': 37.4089,
                'longitude': -122.0644
            }
        ];

        var textAttributes = new WorldWind.TextAttributes(null),
            textLayer = new WorldWind.RenderableLayer("NASA Ames Geographic Text");

        // Set up the common text attributes.
        textAttributes.color = WorldWind.Color.WHITE;

        // Set the depth test property such that the terrain does not obscure the text.
        textAttributes.depthTest = false;

        // For each city, create a text shape.
        for (var i = 0; i < cities.length; i++) {
            var city = cities[i],
                cityPosition = new WorldWind.Position(city.latitude, city.longitude, city.elevation);

            var text = new WorldWind.GeographicText(cityPosition, city.name + ",\n" + city.state);

            // Set the text attributes for this shape.
            text.attributes = textAttributes;

            // Add the text to the layer.
            textLayer.addRenderable(text);
        }

        // Add the text layer to the World Window's layer list.
        //wwd.addLayer(textLayer);

        // Create a surface image using a static image.
        var surfaceImage1 = new WorldWind.SurfaceImage(new WorldWind.Sector(30, 50, -160, -130),
            "../images/ames.jpg");

        // Add the surface images to a layer and the layer to the World Window's layer list.
        var surfaceImageLayer = new WorldWind.RenderableLayer();
        surfaceImageLayer.displayName = "Surface Image - NASA Ames";
        surfaceImageLayer.addRenderable(surfaceImage1);

        //wwd.addLayer(surfaceImageLayer);


        var screenText,
            textAttributesTwo = new WorldWind.TextAttributes(null),
            textLayerTwo = new WorldWind.RenderableLayer("Screen Text");

        // Set up the common text attributes.
        textAttributesTwo.color = WorldWind.Color.WHITE;

        screenText = new WorldWind.ScreenText(
            new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 1), "Web World Wind - SUMMER 2017");
        textAttributesTwo = new WorldWind.TextAttributes(textAttributesTwo);

        textAttributesTwo.offset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 1);
        screenText.attributes = textAttributesTwo;
        textLayerTwo.addRenderable(screenText);

        //wwd.addLayer(textLayerTwo);

        var config = {
            service: "http://sedac.ciesin.columbia.edu/geoserver/wms",
            layerNames: 'usgrid:usgrid-summary-file1-2000_usa-pctasian-2000',
            sector: new WorldWind.Sector(-90, 90, -180, 180),
            levelZeroDelta: new WorldWind.Location(36, 36),
            numLevels: 1,
            format: "image/png",
            size: 256
        };

        // new instance of layer created
        var dataLayer = new WorldWind.WmsLayer(config, null);

        // data layer named
        dataLayer.displayName = "Data layer";

        //disable layer by default
        dataLayer.enabled = false;

        // layer added to globe
        wwd.addLayer(dataLayer);

        // Create a layer manager for controlling layer visibility.
        var layerManager = new LayerManager(wwd);

        // Web Map Service information from NASA's Near Earth Observations WMS
        //var serviceAddress = "http://sedac.ciesin.org/geoserver/ows?service=wms&version=1.3.0&request=GetCapabilities";
        // Named layer displaying Average Temperature data
        /*var layerName = ["povmap:povmap-global-subnational-infant-mortality-rates_2000", 'povmap:povmap-global-subnational-prevalence-child-malnutrition',
            'gpw-v4:gpw-v4-population-count_2000', 'gpw-v4:gpw-v4-population-count_2005', 'gpw-v4:gpw-v4-population-count_2010', 'gpw-v4:gpw-v4-population-count_2015',
            'gpw-v4:gpw-v4-population-count_2020'];*/
        //Load the WMTS layers
        loadWMTSLayers(wwd, layerManager);
        loadWMSLayers(wwd, layerManager);
        loadKMLLayers(wwd, layerManager);
        //Load the WMS layers
        
        //Load the data
        var csvData = loadCSVData();
        var csvData2 = loadCSVDataArray();
        var entireArrayData = [];
        //entireArrayData.push(convertArrayToDataSet(csvData2[0]));
        var agriData = convertArrayToDataSet(csvData2[0]);
        //console.log(csvData);        
        //Generate the layers
        generatePlacemarkLayer(wwd, csvData);


        
        //$.get(serviceAddress2).done(createLayer).fail(logError);
        //Automatically zoom into NASA Ames
        wwd.goTo(new WorldWind.Position(37.4089, -122.0644));

        var starFieldLayer = new WorldWind.StarFieldLayer();
        var atmosphereLayer = new WorldWind.AtmosphereLayer();


        //IMPORTANT: add the starFieldLayer before the atmosphereLayer
        wwd.addLayer(starFieldLayer);
        wwd.addLayer(atmosphereLayer);

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
        var highlightedItems = []
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
                            var details = $('#c');
                            var detailsHTML = '<p>Country Details</p>';
                            detailsHTML += 
                                    '<p>Country: ' + dataPoint.country + '</p>';
                            detailsHTML += 
                                    '<p>Country Code: ' + dataPoint.code3 + '</p>';
                            //We have the country code, we can do whatever we want
                            //like 
                            //Perhaps show everything? lol
                            detailsHTML +=  '<p>Agriculture Data</p><div id="graphPoint"></div>';
                            
                            details.html(detailsHTML); 
                            
                            //Load the data
                            getAgriData(agriData, dataPoint.code3);
                            
                            
                        }
                    }
                }
            }
        }
        
        wwd.addEventListener('mousemove', handlePick);
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
    if(typeof(wmsConfig.timeSequences) != 'undefined') {
        layerControlHTML += generateTimeControl(wwd, layerName, layerNumber);
    }
    
    //Place the HTML somewhere
    $('#b').append(layerControlHTML);

    //Add functionality to opacity slider
    giveOpacitySliderFunctionality(wwd, layerName, layerNumber);
    
    //Check time again to add functionality
    if(typeof(wmsConfig.timeSequences) != 'undefined') {
        giveTimeButtonFunctionality(wwd, layerName, layerNumber, wmsConfig);
    }
    console.log(wmsLayerCapabilities);    
}

//Finds the layer based on the name in the wwd
//Returns 0 otherwise
function getLayerFromName(wwd, layerName) {
    var i = 0;
    console.log(wwd);
    for(i = 0; i < wwd.layers.length; i++) {
        if(wwd.layers[i].displayName == layerName) {
            console.log(wwd.layers[i]);
            return wwd.layers[i];
        }
    }
    return 0;
}


//Given the layerName, layerNumber and wwd. Give a legend if possible
function generateLegend(wwd, wmsLayerCapabilities, layerName, layerNumber) {

    //Check if a legend exists for a given layer this
    //console.log(wmsLayerCapabilities.styles[0].legendUrls[0].url);
    var legendHTML = '<h2> Legend for ' + layerName + '</h2>';
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
    var opacityHTML = '<h2>Opacity for ' + layerName +'</h2>';

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
        console.log("Hello World");
    });
    console.log(slider);
    //Grab the layer and redraw
    slider.on("slidestop", function(event, ui) {
        //Grabbing the layer is based on its name in addition to the entire
        //wwd
        for(var i = 0; i  < wwd.layers.length; i++) {
            var target_layer = wwd.layers[i];
            console.log(wwd.layers);
            console.log(target_layer);
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
    var timeHTML = '<h2>Time for ' + layerName +'</h2>';

    //Create the output
    timeHTML += '<div id="time_date_' + layerNumber + '">INITIAL DATE</div>';

    //Create the three buttons
	timeHTML += '<button id="time_left_' + layerNumber + '">Left</button>';
	timeHTML += '<button id="time_middle_' + layerNumber + '">Play</button>';
	timeHTML += '<button id="time_right_' + layerNumber + '">Right</button>'; 

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
}, 5000);


/*
YUI().use(
    'aui-tabview',
    function(Y) {
        new Y.TabView(
            {
                children: [
                    {
                        content: '<div class="list-group" id="layerList"></div>',
                        label: 'Layers'
                    },
                    {
                        content: '<h5>Soon to be implemented</h5>',
                        label: 'Layer Controls'
                    },
                    {
                        content: '<div class="dropdown" id="projectionDropdown">' +
                        '</div><div class="input-group" id="searchBox"><input type="text"' +
                        'class="form-control" placeholder="GoTo" id="searchText"/><span ' +
                        'class="input-group-btn"><button id="searchButton" class="btn btn-primary"' +
                        'type="button"><span class="glyphicon glyphicon-search"></span></button></span>' +
                        '</div><div><label for="stars-simulation"><h4>Simulate Stars!</h4></label>' +
                        '<input id="stars-simulation" type="checkbox"/></div>',
                        label: 'View Options'
                    },
                    {
                        content: '<button class="btn btn-block togglebutton">WORLD FACTS</button>' +
                        '<div class="focustext"><h4>From Compassion.com</h4><p>The world population ' +
                        'reached 7.3 billion as of July 2015.</p><p>Even with the high death rates of' +
                        ' those living in poverty, the world population is still expanding at an incredible rate.</p>' +
                        '<p>The world’s population is growing by 1.18 percent per year, or approximately an' +
                        'additional 83 million people annually.</p>' +
                        '<p>The global population is expected to reach 8.5 billion in 2030, 9.7 billion in 2050' +
                        'and 11.2 billion in 2100.</p><p>50.4 percent of the world’s population is male' +
                        'and 49.6 percent is female.</p></div><button class="btn btn-block' +
                        'togglebutton2">MORE FACTS</button><div class="focustext2"><h4>Boom!</h4></div>',
                        label: 'Learn Events'
                    }
                ],
                srcNode: '#myTab',
                type: 'pills'
            }
        ).render();
    }
);

*/

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
    var dataTypes = ['countries'];
    
    //Common features
    var pinLibrary = WorldWind.configuration.baseUrl + "images/pushpins/",
        placemark,
        placemarkAttributes = new WorldWind.PlacemarkAttributes(null),
        highlightAttributes;
    placemarkAttributes.imageScale = 4;
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
        console.log(csvData);
        for(j = 0; j < csvData[i].length; j++) {
            // Create the placemark and its label.
            var placemark = new WorldWind.Placemark(new WorldWind.Position
                    (parseFloat(csvData[i][j].lat), 
                    parseFloat(csvData[i][j].lon), 1e2), true, null);
            var labelString = '';
            if(dataTypes[i] == 'countries') {
                labelString = csvData[i][j].country;
            }
            
            
            placemark.label = labelString + ' ' + i.toString() + "\n"
            + "Lat " + placemark.position.latitude.toPrecision(4).toString() 
            + "\n" + "Lon " 
            + placemark.position.longitude.toPrecision(5).toString();
            placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;

            // Create the placemark attributes for this placemark. Note that 
            //the attributes differ only by their image URL.
            placemarkAttributes = new 
                    WorldWind.PlacemarkAttributes(placemarkAttributes);
            placemarkAttributes.imageSource = pinLibrary + images[9 - 2*i];
            //Search if it is a country
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
            highlightAttributes.imageScale = 8;
            placemark.highlightAttributes = highlightAttributes;

            //Attach the type to it
            placemark.type = dataTypes[i];

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
    var csvList = ['countries.csv'];
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
                console.log(csvData);
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
                    //console.log(data);
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


//Given the conuntry code, find the data set
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
    var csvList = ['agri.csv'];
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
                console.log(csvData);
    		}
    	});	    
	}
	return csvData;    
}

//Find a value given a name
//Returns 0 if it can't be found, else returns something
//This assumes we are working with convertArrayToDataSet
function findDataBasedName(inputArray, name) {
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
                (findDataBasedName(objectList,csvData[i][0]) == 0)) {
            
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
            tempObject = findDataBasedName(objectList, csvData[i][0]);
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
    console.log(objectList);
    return objectList;
}

function loadWMTSLayers(wwd, layerManager) {
    var serviceWMTSAddress = "https://neowms.sci.gsfc.nasa.gov/wms/wms";
    var layerName = ["MOD14A1_E_FIRE", "MODAL2_M_AER_OD"];
    // Called asynchronously to parse and create the WMS layer
    var createWMTSLayer = function (xmlDom) {
        // Create a WmsCapabilities object from the XML DOM
        var wms = new WorldWind.WmsCapabilities(xmlDom);
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
		console.log(kmlFile);
        wwd.addLayer(renderableLayer);
        layerManager.synchronizeLayerList();
    });
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
function filterOutBlanks(inputData) {
    var i = 0;
    var tempArray = [];
    console.log(inputData[i]);
    for(i = 0; i < inputData.length; i++) {
        //Check for empty string
        if(inputData[i].value != "") {
            
            tempArray.push(inputData[i]);
        }
    }
    return tempArray;
}

//Creates a scatter plot based on the input data
//It is assumed that the input data is an array of timeValue pair
function plotScatter(titleName, inputData, htmlID) {
    //Filter the input data, we may get some blanks
    var filteredData = filterOutBlanks(inputData);
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
        x: xValues,
        y: yValues,
        mode: 'markers',
        type: 'scatter'
    };
    
    var layout = {
        title: titleName
    };
    Plotly.newPlot(htmlID, [graph], layout);
}

//Loads the agriculture data of a particular country
function getAgriData(entireData, desiredDataCode) {
    //Find the data we are looking for
    var dataPoint = findDataPointCountry(entireData, desiredDataCode,3);
    
    //Once we have the data we want plot the entirity of it???
    var i = 0;
    var agriHTML = '';
    if(dataPoint != 0) {
        //We have the agriculture data of the country
        //Generate a sample plot
        console.log(dataPoint);
        plotScatter(dataPoint.dataValues[0].typeName, dataPoint.dataValues[0].timeValues, 'graphPoint');
    }
    
}
var tabsFn = (function() {

    function init() {
        setHeight();
    }

    function setHeight() {
        var $tabPane = $('.tab-pane'),
            tabsHeight = $('.nav-tabs').height();

        $tabPane.css({
            height: tabsHeight
        });
    }

    $(init);
})();

 $( function() {
    $( "#draggable" ).draggable({containment: "window"});

} );

$(document).ready(function() {
    $( ".resizable" ).resizable({
        animate: true,
        maxHeight: 250,
        maxWidth: 1380,
        minHeight: 150,
        minWidth: 280
    });
} );
    
    
    //alert("HOWDY!! HAW HAW HAW");
    
    //sidebar toggle
        $(document).ready(function() {
            $(".toggle2").click(function () {
                $(".tab2").toggle();
                $(".tab1").hide();
                $(".tab3").hide();
                $(".tab4").hide();
                $(".tab5").hide();
                $(".tab6").hide();
                $(".tab7").hide();
                $(".tab8").hide();
            });
        });

        $(document).ready(function() {
            $(".toggle3").click(function () {
                $(".tab3").toggle();
                $(".tab2").hide();
                $(".tab1").hide();
                $(".tab4").hide();
                $(".tab5").hide();
                $(".tab6").hide();
                $(".tab7").hide();
                $(".tab8").hide();
            });
        });
        $(document).ready(function() {
            $(".toggle4").click(function () {
                $(".tab4").toggle();
                $(".tab2").hide();
                $(".tab1").hide();
                $(".tab3").hide();
                $(".tab5").hide();
                $(".tab6").hide();
                $(".tab7").hide();
                $(".tab8").hide();
            });
        });
        $(document).ready(function() {
            $(".toggle5").click(function () {
                $(".tab5").toggle();
                $(".tab2").hide();
                $(".tab1").hide();
                $(".tab3").hide();
                $(".tab4").hide();
                $(".tab6").hide();
                $(".tab7").hide();
                $(".tab8").hide();
            });
        });
        $(document).ready(function() {
            $(".toggle6").click(function () {
                $(".tab6").toggle();
                $(".tab2").hide();
                $(".tab1").hide();
                $(".tab3").hide();
                $(".tab4").hide();
                $(".tab5").hide();
                $(".tab7").hide();
                $(".tab8").hide();
            });
        });
        $(document).ready(function() {
            $(".toggle1").click(function () {
                $(".tab1").toggle();
                $(".tab2").hide();
                $(".tab3").hide();
                $(".tab4").hide();
                $(".tab5").hide();
                $(".tab6").hide();
                $(".tab7").hide();
                $(".tab8").hide();
            });
        });
        $(document).ready(function() {
            $(".toggle7").click(function () {
                $(".tab7").toggle();
                $(".tab1").hide();
                $(".tab2").hide();
                $(".tab3").hide();
                $(".tab4").hide();
                $(".tab5").hide();
                $(".tab6").hide();
                $(".tab8").hide();
            });
        });
        $(document).ready(function() {
            $(".toggle7").click(function () {
                $(".tab8").toggle();
                $(".tab1").hide();
                $(".tab2").hide();
                $(".tab3").hide();
                $(".tab4").hide();
                $(".tab5").hide();
                $(".tab6").hide();
                $(".tab7").hide();
            });
        });
});