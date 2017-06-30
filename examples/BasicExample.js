/**
 * Created by mdtang on 6/6/17.
 */

/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @version $Id: BasicExample.js 3320 2015-07-15 20:53:05Z dcollins $
 */

 
 
requirejs(['../src/WorldWind',
        './LayerManager'],
    function (ww,
              LayerManager) {
        "use strict";

        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        var wwd = new WorldWind.WorldWindow("canvasOne");

        var layers = [
            {layer: new WorldWind.BMNGLayer(), enabled: true},
            {layer: new WorldWind.BMNGLandsatLayer(), enabled: true},
            {layer: new WorldWind.BingAerialLayer(null), enabled: false},
            {layer: new WorldWind.BingAerialWithLabelsLayer(null), enabled: false},
            {layer: new WorldWind.BingRoadsLayer(null), enabled: false},
            {layer: new WorldWind.CompassLayer(), enabled: true},
            {layer: new WorldWind.CoordinatesDisplayLayer(wwd), enabled: true},
            {layer: new WorldWind.ViewControlsLayer(wwd), enabled: true}
        ];
		
        for (var l = 0; l < layers.length; l++) {
            layers[l].layer.enabled = layers[l].enabled;
            wwd.addLayer(layers[l].layer);
        }

        var starFieldLayer = new WorldWind.StarFieldLayer();
        var atmosphereLayer = new WorldWind.AtmosphereLayer();


        //IMPORTANT: add the starFieldLayer before the atmosphereLayer
        wwd.addLayer(starFieldLayer);
        wwd.addLayer(atmosphereLayer);

        starFieldLayer.time = new Date();
        atmosphereLayer.lightLocation = WorldWind.SunPosition.getAsGeographicLocation(starFieldLayer.time);

        // Create a layer manager for controlling layer visibility.
        var layerManager = new LayerManager(wwd);
        wwd.redraw();

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
        var surfaceImage1 = new WorldWind.SurfaceImage(new WorldWind.Sector(37.5, 36.5, -121, -120),
            "../images/ames.jpg");

        // Add the surface images to a layer and the layer to the World Window's layer list.
        var surfaceImageLayer = new WorldWind.RenderableLayer();
        surfaceImageLayer.displayName = "Surface Image - NASA Ames";
        surfaceImageLayer.addRenderable(surfaceImage1);

        wwd.addLayer(surfaceImageLayer);


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

        // Define the images we'll use for the placemarks.
        var images = [
            "plain-black.png",
            "plain-blue.png",
            "plain-brown.png",
            "plain-gray.png",
            "plain-green.png",
            "plain-orange.png",
            "plain-purple.png",
            "plain-red.png",
            "plain-teal.png",
            "plain-white.png",
            "plain-yellow.png",
            "castshadow-black.png",
            "castshadow-blue.png",
            "castshadow-brown.png",
            "castshadow-gray.png",
            "castshadow-green.png",
            "castshadow-orange.png",
            "castshadow-purple.png",
            "castshadow-red.png",
            "castshadow-teal.png",
            "castshadow-white.png"
        ];

        var pinLibrary = WorldWind.configuration.baseUrl + "images/pushpins/", // location of the image files
            placemark,
            placemarkAttributes = new WorldWind.PlacemarkAttributes(null),
            highlightAttributes,
            placemarkLayer = new WorldWind.RenderableLayer("Placemarks"),
            latitude = 39.9042,
            longitude = 116.4074;

        // Set up the common placemark attributes.
        placemarkAttributes.imageScale = 1;
        placemarkAttributes.imageOffset = new WorldWind.Offset(
            WorldWind.OFFSET_FRACTION, 0.3,
            WorldWind.OFFSET_FRACTION, 0.0);
        placemarkAttributes.imageColor = WorldWind.Color.WHITE;
        placemarkAttributes.labelAttributes.offset = new WorldWind.Offset(
            WorldWind.OFFSET_FRACTION, 0.3,
            WorldWind.OFFSET_FRACTION, 0.0);
        placemarkAttributes.labelAttributes.color = WorldWind.Color.WHITE;
        placemarkAttributes.drawLeaderLine = true;
        placemarkAttributes.leaderLineAttributes.outlineColor = WorldWind.Color.RED;

        // For each placemark image, create a placemark with a label.
        for (var i = 0; i < images.length; i++) {
            // Create the placemark and its label.
            placemark = new WorldWind.Placemark(new WorldWind.Position(latitude, longitude + i * 10, 1e2), true, null);
            placemark.label = "Placemark " + i.toString() + "\n"
                + "Lat " + placemark.position.latitude.toPrecision(4).toString() + "\n"
                + "Lon " + placemark.position.longitude.toPrecision(5).toString();
            placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;

            // Create the placemark attributes for this placemark. Note that the attributes differ only by their
            // image URL.
            placemarkAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
            placemarkAttributes.imageSource = pinLibrary + images[i];
            placemark.attributes = placemarkAttributes;

            // Create the highlight attributes for this placemark. Note that the normal attributes are specified as
            // the default highlight attributes so that all properties are identical except the image scale. You could
            // instead vary the color, image, or other property to control the highlight representation.
            highlightAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
            highlightAttributes.imageScale = 1.2;
            placemark.highlightAttributes = highlightAttributes;

            // Add the placemark to the layer.
            placemarkLayer.addRenderable(placemark);
        }

        // Add the placemarks layer to the World Window's layer list.
        //wwd.addLayer(placemarkLayer);

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

        // Web Map Service information from NASA's Near Earth Observations WMS
        var serviceAddress = "http://sedac.ciesin.org/geoserver/ows?service=wms&version=1.3.0&request=GetCapabilities";
        
        // Named layer displaying Average Temperature data
        var layerName = ["povmap:povmap-global-subnational-infant-mortality-rates_2000", 'povmap:povmap-global-subnational-prevalence-child-malnutrition',
            'gpw-v4:gpw-v4-population-count_2000', 'gpw-v4:gpw-v4-population-count_2005', 'gpw-v4:gpw-v4-population-count_2010', 'gpw-v4:gpw-v4-population-count_2015',
            'gpw-v4:gpw-v4-population-count_2020'];
        //var serviceAddress = "http://hazards.fema.gov/gis/nfhl/services/public/NFHLWMS/MapServer/WMSServer?request=GetCapabilities&service=WMS";
        //var layerName = ["1"];
        // Called asynchronously to parse and create the WMS layer
        var createLayer = function (xmlDom) {
            // Create a WmsCapabilities object from the XML DOM
            var wms = new WorldWind.WmsCapabilities(xmlDom);
			

            // using for loop to add multiple layers to layer manager; SUCCESS!!!!
            for (i = 0; i < layerName.length; i++) {
                // Retrieve a WmsLayerCapabilities object by the desired layer name
                var wmsLayerCapabilities = wms.getNamedLayer(layerName[i]);

                // Form a configuration object from the WmsLayerCapability object
                var wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
                // Modify the configuration objects title property to a more user friendly title
                wmsConfig.title = "Data layer " + i;
                console.log(wmsConfig);
                // Create the WMS Layer from the configuration object
                var wmsLayer = new WorldWind.WmsLayer(wmsConfig);

                // diable layer by default
                wmsLayer.enabled = false;
				
                // Add the layers to World Wind and update the layer manager
                wwd.addLayer(wmsLayer);
                layerManager.synchronizeLayerList();
				
				//Generate the layer control, could do a bootleg version of just hiding it lol
				generateLayerControl(wwd, wmsLayerCapabilities, wmsLayer.displayName, i);
				
            }
        };

        // Called if an error occurs during WMS Capabilities document retrieval
        var logError = function (jqXhr, text, exception) {
            console.log("There was a failure retrieving the capabilities document: " + text + " exception: " + exception);
        };

        $.get(serviceAddress).done(createLayer).fail(logError);
    });


//Given a layerName and its layernumber, generate a layer control block

//Key Notes: This function generates the HTML first then supplies 
//functionality
function generateLayerControl(wwd, wmsLayerCapabilities, layerName, layerNumber) {
    
    console.log(wmsLayerCapabilities);
	//Generate the div tags
	var layerControlHTML = '<div id="' + layerNumber + '">';
	
	//Spawn opacity controller
	layerControlHTML += generateOpacityControl(wwd, layerName, layerNumber);	
	//Wrap it up
	
	layerControlHTML += '</div>';

	//Spawn the legend
	layerControlHTML += generateLegend(wwd, 
	        wmsLayerCapabilities, layerName, layerNumber);
	
	//Spawn the time control
	
	//Check if the time can be made
	
	/*layerControlHTML += generateTimeControl(wwd, wmsLayerCapabilities, 
	        layerName, layerNumber);*/
	
	//Place the HTML somewhere
	$('#layerControl').append(layerControlHTML);
	

	//Add functionality to opacity slider
	giveOpacitySliderFunctionality(wwd, layerName, layerNumber);
	
	
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
			target_layer = wwd.layers[i];
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
    wwd.goTo(new WorldWind.Position(37.4089, -122.0644));
}


function generateTimeControl(wwd, layerName, layerNumber) {
	//Create the general box
	var timeHTML = '<h2>Time for ' + layerName +'</h2>';
	
	//Create the slider
	//timeHTML += '<div id="time_slider_' + layerNumber + '"></div>';
	timeHTML += '<button id="time_left_' + layerNumber + '">Left</button>';
	timeHTML += '<button id="time_right_' + layerNumber + '">Right</button>';
	//Create the output
	timeHTML += '<div id="time_date_' + layerNumber + '">INITIAL DATE</div>';
	
	
	//Wrap up the HTML
	timeHTML += '</div>';
	

	return timeHTML;
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
}, 3500);




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

$(document).ready(function() {
    $("nav-tabs").draggable();
});


$(document).ready(function() {
    $( ".resizable" ).resizable({
        animate: true
    });
} );
