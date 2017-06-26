/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * Illustrates how to display and pick Placemarks.
 *
 * @version $Id: PlacemarksAndPicking.js 3320 2015-07-15 20:53:05Z dcollins $
 */
var mode
requirejs({paths:{
    "jquery":"https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min",
    "jqueryui": "https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min",
    "jquery-csv": "https://cdnjs.cloudflare.com/ajax/libs/jquery-csv/0.8.3/jquery.csv"
}
},['../src/WorldWind',
        './LayerManager',  './Pin', 'jquery', 'jqueryui', 'jquery-csv', './Pin'],
    function (ww,
              LayerManager, Pin) {
        "use strict";

        // Tell World Wind to log only warnings.
        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        // Create the World Window.
        var wwd = new WorldWind.WorldWindow("canvasOne");

        /**
         * Added imagery layers.
         */
        var layers = [
            {layer: new WorldWind.BMNGLayer(), enabled: true},
            {layer: new WorldWind.BMNGLandsatLayer(), enabled: false},
            {layer: new WorldWind.BingAerialWithLabelsLayer(null), enabled: true},
            {layer: new WorldWind.CompassLayer(), enabled: true},
            {layer: new WorldWind.CoordinatesDisplayLayer(wwd), enabled: true},
            {layer: new WorldWind.ViewControlsLayer(wwd), enabled: true}
        ];

        for (var l = 0; l < layers.length; l++) {
            layers[l].layer.enabled = layers[l].enabled;
            wwd.addLayer(layers[l].layer);
        }



        //Load the data
        var csvData = loadCSVData();
        
        //Generate the layers
        generatePlacemarkLayer(wwd, csvData);
        // Create a layer manager for controlling layer visibility.
        var layerManger = new LayerManager(wwd);

        // Now set up to handle picking.

        var highlightedItems = [];

        // The common pick-handling function.
        var handlePick = function (o) {
            // The input argument is either an Event or a TapRecognizer. Both have the same properties for determining
            // the mouse or tap location.
            var x = o.clientX,
                y = o.clientY;

            var redrawRequired = highlightedItems.length > 0; // must redraw if we de-highlight previously picked items

            // De-highlight any previously highlighted placemarks.
            for (var h = 0; h < highlightedItems.length; h++) {
                highlightedItems[h].highlighted = false;
            }
            highlightedItems = [];

            // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
            // relative to the upper left corner of the canvas rather than the upper left corner of the page.
            
            //OK so the next point is determined by the mode
            var pickList;
            if(mode == 0) {
                pickList = wwd.pick(wwd.canvasCoordinates(x, y));

            } else if(mode == 1) {
                
                //Create the rectangle
                var rectRadius = 50,
                pickPoint = wwd.canvasCoordinates(x, y),
                pickRectangle = new WorldWind.Rectangle(pickPoint[0] - 
                        rectRadius, pickPoint[1] + rectRadius,
                        2 * rectRadius, 2 * rectRadius);
                pickList = wwd.pickShapesInRegion(pickRectangle);
                console.log(pickList);
            }
            if (pickList.objects.length > 0) {
                redrawRequired = true;
            }
            // Highlight the items picked by simply setting their highlight flag to true.
            if (pickList.objects.length > 0) {
                if(mode) {
                    console.log("Get Rekt");
                }
                for (var p = 0; p < pickList.objects.length; p++) {
                    pickList.objects[p].userObject.highlighted = true;

                    // Keep track of highlighted items in order to de-highlight them later.
                    highlightedItems.push(pickList.objects[p].userObject);

                    // Detect whether the placemark's label was picked. If so, the "labelPicked" property is true.
                    // If instead the user picked the placemark's image, the "labelPicked" property is false.
                    // Applications might use this information to determine whether the user wants to edit the label
                    // or is merely picking the placemark as a whole.
                    if (pickList.objects[p].labelPicked) {
                        console.log("Label picked");
                    }
                    //Check the name to indicate which data to go by
                    if(typeof(pickList.objects[p].userObject.type) != 'undefined'){
                        //It's most likely a placemark
                        //"most likely"
                        //Grab the co-ordaintes
                        var placeLat = 
                                pickList.objects[p].userObject.position.latitude;
                        var placeLon = 
                                pickList.objects[p].userObject.position.longitude;
                        if(pickList.objects[p].userObject.type == 'Tsunami') {
                            //Find the tsunami data
                            var dataPoint = findDataPoint(csvData[0], 
                                    placeLat, placeLon);
                            //Modify the details section
                            var details = $('#details');
                            var detailsHTML = '<p>Disaster Type: Tsunami</p>'; 
                            detailsHTML += '<p>Country:' + dataPoint.COUNTRY + 
                                    '</p>';
                            detailsHTML += '<p>Year:' + dataPoint.year;
                            details.html(detailsHTML);
                            
                        } else if(pickList.objects[p].userObject.type == 'Volcano') {
                            var dataPoint = 
                                    findDataPoint(csvData[1], placeLat, placeLon);
                            var details = $('#details');
                            var detailsHTML = '<p>Disaster Type: Volcano</p>';
                            detailsHTML += 
                                    '<p>Country: ' + dataPoint.Country + '</p>';
                            detailsHTML += 
                                    '<p>Location: ' + dataPoint.Location + '</p>';
                            detailsHTML += 
                                    '<p>Volcano Name:' + dataPoint.Name + '</p>';
                            detailsHTML += 
                                    '<p>Year: ' + dataPoint.year + '</p>';
                            details.html(detailsHTML);                        }
                    }
                }
            }

            // Update the window if we changed anything.
            if (redrawRequired) {
                wwd.redraw(); // redraw to make the highlighting changes take effect on the screen
            }
        };

        // Listen for mouse moves and highlight the placemarks that the cursor rolls over.
        wwd.addEventListener("mousemove", handlePick);

        // Listen for taps on mobile devices and highlight the placemarks that the user taps.
        var tapRecognizer = new WorldWind.TapRecognizer(wwd, handlePick);
        var sliderDiv = $("#slider");
        sliderDiv.slider(
		{
			value: 1000,
			min: 0,
			max: 2050,
			step: 50 
		});
		sliderDiv.on("slide",function(event,ui) {
		    //Modify the slider timeline
		    var sliderText = $("#slider_text");
		    var sliderTextHTML = '<p> Year:' + ui.value;
		    sliderText.html(sliderTextHTML);
		});
		sliderDiv.on("slidestop", function(event, ui) {
		    //Redraw the entire placemarks (oh no)
		    //Remove the layers,
		    var i = 0;
		    while(i < wwd.layers.length) {
		        if(wwd.layers[i].displayName.includes('Tsunami') 
		                || wwd.layers[i].displayName.includes('Volcano')) {
		            wwd.removeLayer(wwd.layers[i]);
		            i--;
		        }
		        i++;
		    }
		    
		    //We have to filter it based on year
		    var newData = filterCSVData(csvData, 0, ui.value);
		    
		    //Simply recreate the layer again
		    generatePlacemarkLayer(wwd, newData);
		})
    });
    
//Given the lon and lat, find the data
function findDataPoint(dataSet, lat, lon) {
    var i = 0;
    for(i = 0; i < dataSet.length; i++){
        if((dataSet[i].lon == lon) && (dataSet[i].lat == lat)) {
            return dataSet[i];
        }
    }
}

//Loads all the data
//Essentially all the data is loaded before hand if it is part of the CSV lit
function loadCSVData(){
    var csvList = ['tsevent.csv', 'volcano.csv'];
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
                    //console.log(data);
                    return data.year < thresholdValue;
                }));
        }
        
    }
    
    return returnData;
}


//Generates the placemark layers
//The types are predetermined in order
//This assumes the CSV data is loaded in order too obviously
function generatePlacemarkLayer(wwd, csvData){
    //Data type list
    var dataTypes = ['Tsunami', 'Volcano'];
    
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
            
            placemark.label = dataTypes[i] + ' ' + i.toString() + "\n"
            + "Lat " + placemark.position.latitude.toPrecision(4).toString() 
            + "\n" + "Lon " 
            + placemark.position.longitude.toPrecision(5).toString();
            placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;

            // Create the placemark attributes for this placemark. Note that 
            //the attributes differ only by their image URL.
            placemarkAttributes = new 
                    WorldWind.PlacemarkAttributes(placemarkAttributes);
            placemarkAttributes.imageSource = pinLibrary + images[9 - 2*i];
            placemark.attributes = placemarkAttributes;

            // Create the highlight attributes for this placemark. 
            //Note that the normal attributes are specified as
            // the default highlight attributes so that all properties are 
            //identical except the image scale. You could
            // instead vary the color, image, or other property to control 
            //the highlight representation.
            highlightAttributes = new 
                    WorldWind.PlacemarkAttributes(placemarkAttributes);
            highlightAttributes.imageScale = 1.2;
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


//Sets the mode of the global variable
function setMode(modeNumber) {
    mode = modeNumber;
}

//Handles a point pick
function pointPick(wwd, x, y) {
    
}