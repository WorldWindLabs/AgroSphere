/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * Illustrates how to display and pick Placemarks.
 *
 * @version $Id: PlacemarksAndPicking.js 3320 2015-07-15 20:53:05Z dcollins $
 */
var mode = 0;
var drawMode = 0;
var initialCoOrds = [];
var finalPoints = [];
var stopPoints = [];
requirejs({paths:{
    "jquery":"https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min",
    "jqueryui": "https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min",
    "jquery-csv": "https://cdnjs.cloudflare.com/ajax/libs/jquery-csv/0.8.3/jquery.csv",
}
},['../src/WorldWind',
        './LayerManager',  './Pin', 'jquery', 'jqueryui', 'jquery-csv'],
    function (ww,
              LayerManager) {
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
        //Set up the polygon handler
        // Create a layer to hold the polygons.
        var polygonsLayer = new WorldWind.RenderableLayer();
        polygonsLayer.displayName = "Polygons";
        wwd.addLayer(polygonsLayer);
        var layerManger = new LayerManager(wwd);



        // Now set up to handle picking.

        var highlightedItems = [];

        // The common pick-handling function.
        var handlePick = function (o) {
            if(mode != 2) {
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
                var rectRadius = 50;
                var pickPoint = wwd.canvasCoordinates(x, y);
                var pickRectangle = new WorldWind.Rectangle(pickPoint[0] - 
                        rectRadius, pickPoint[1] + rectRadius,
                        2 * rectRadius, 2 * rectRadius);
                console.log(pickRectangle);        
                pickList = wwd.pickShapesInRegion(pickRectangle);
                console.log(pickList.objects);
            }
            if (pickList.objects.length > 0) {
                redrawRequired = true;
            }
            // Highlight the items picked by simply setting their highlight flag to true.
            if (pickList.objects.length > 0) {
                var dataLook = [];
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
                        //Grab the co-ordinates
                        var placeLat = 
                                pickList.objects[p].userObject.position.latitude;
                        var placeLon = 
                                pickList.objects[p].userObject.position.longitude;
                        console.log(pickList.objects[p].userObject);
                        if(pickList.objects[p].userObject.type == 'Tsunami') {
                            //Find the tsunami data
                            var dataPoint = findDataPoint(csvData[0], 
                                    placeLat, placeLon);
                            //Modify the details secon
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
                            details.html(detailsHTML);                        
                            
                            if(mode == 1) {
                                //Push the data
                                dataLook.push(dataPoint.year);
                            }
                        }
                    }
                    //Do some data analysis
                    if(mode ==1) {
                        var graph = {
                            x: dataLook,
                            type: 'histogram',
                            marker: {
                                color: 'rgba(100,250,100,0.7)',
	                        }
                        }
                        Plotly.newPlot('plotArea', [graph]);
                    }
                }
            }

            // Update the window if we changed anything.
            if (redrawRequired) {
                wwd.redraw(); // redraw to make the highlighting changes take effect on the screen
            }
            } else {
                if(drawMode == 1) {
                    //Drawing time
                    //Assuming we have initial-cords, draw the rectangle everytime
                    //we move

                    if(typeof(polygonsLayer.polygon != 'undefined')) {
                        polygonsLayer.removeRenderable(polygonsLayer.polygon);
                    }

                    var boundaries = [];
                    boundaries[0] = [];
                    finalPoints = [];
                    finalPoints.push(o.clientX);
                    finalPoints.push(o.clientY);
                    var finalPositions = convert2Dto3D(wwd, finalPoints[0],
                            finalPoints[1]);
                    var stepNumbers = 100;
                    if(finalPositions) {
                    var i = 0;
                    var stepSizeLonLon = 
                            (finalPositions[1] - initialCoOrds[1])/stepNumbers;
                    for(i = 1; i < stepNumbers; i++) {
                        //Go from one side to another
                        boundaries[0].push(new WorldWind.Position(
                                initialCoOrds[0], 
                                initialCoOrds[1] + stepSizeLonLon*i, 1e5));
                    }
                    var stepSizeLatLat = 
                            (finalPositions[0] - initialCoOrds[0])/stepNumbers;
                    for(i = 1; i < stepNumbers; i++) {
                        boundaries[0].push(new WorldWind.Position(
                                initialCoOrds[0] + stepSizeLatLat*i,
                                finalPositions[1], 1e5));
                    }
                    
                    for(i = 1; i < stepNumbers; i++) {
                        boundaries[0].push(new WorldWind.Position(
                                finalPositions[0], 
                                finalPositions[1] - stepSizeLonLon*i, 1e5))
                    }
                    console.log(boundaries);
                    var polygon = new WorldWind.Polygon(boundaries, null);
                    polygon.altitudeMode = WorldWind.ABSOLUTE;
                    polygon.extrude = true; // extrude the polygon edges to the ground
                    polygon.textureCoordinates = [
                    [new WorldWind.Vec2(0, 0), new WorldWind.Vec2(1, 0), new WorldWind.Vec2(1, 1), new WorldWind.Vec2(0, 1)]
                            ];
                    var polygonAttributes = new WorldWind.ShapeAttributes(null);
                    polygonAttributes.drawInterior = true;
                    polygonAttributes.drawOutline = true;
                    polygonAttributes.outlineColor = WorldWind.Color.BLUE;
                    polygonAttributes.interiorColor = new WorldWind.Color(0, 1, 1, 0.5);
                    polygonAttributes.drawVerticals = polygon.extrude;
                    polygonAttributes.applyLighting = true;
                    polygon.attributes = polygonAttributes;
            
                    // Create and assign the polygon's highlight attributes.
                    var highlightAttributes = new WorldWind.ShapeAttributes(polygonAttributes);
                    highlightAttributes.outlineColor = WorldWind.Color.RED;
                    highlightAttributes.interiorColor = new WorldWind.Color(1, 1, 1, 0.5);
                    polygon.highlightAttributes = highlightAttributes;
            
                    // Add the polygon to the layer and the layer to the World Window's layer list.
                    polygon.highlighted = true;
                    polygonsLayer.addRenderable(polygon);
                    
                    //Quick way to kill the previous polygon
                    polygonsLayer.polygon = polygon;
                    console.log(polygon);
                    }
                }
            }
        };

        // Listen for mouse moves and highlight the placemarks that the cursor rolls over.
        wwd.addEventListener("mousemove", handlePick);
        
        //Function handles a click draw event
        //What we need is the mode. This is the mode and the co-ordinates
        var mouseDraw = function (mode, x, y){
            if(mode == 1) {
                //We have a simple rectangle
            } else if(mode == 2) {
                //Store the co-ordintes
                if(drawMode == 0) {
                    //We are now in draw mode
                    initialCoOrds = convert2Dto3D(wwd, x, y);
                    drawMode = 1;
                } else {
                    stopPoints = [];
                    stopPoints.push(x);
                    stopPoints.push(y);
                }
            }
        }

        //Wrapper function
        var mouseDrawWrapper = function(o) {
            var x = o.clientX;
            var y = o.clientY;
            mouseDraw(mode, x, y);
        }
        
        wwd.addEventListener("mousedown", mouseDrawWrapper);
        //Handles the segment
        var handleReleaseWrapper = function (o) {
            var x = o.clientX;
            var y = o.clientY;
            
            handleRelease(mode, x, y);
        }
        
        var handleRelease = function (mode, x, y) {
            if((mode == 2) && (drawMode == 1)){
                //Check if the x and y are the same as the final
                console.log(x, stopPoints[0], y, stopPoints[1]);
                if((x == stopPoints[0]) && (y == stopPoints[1])) {
                    //It is done
                    drawMode = 0;
                    initialCoOrds = [];
                }
            }
        }
        wwd.addEventListener("mouseup", handleReleaseWrapper);
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
		                || wwd.layers[i].displayName.includes('Volcano') ||
		                wwd.layers[i].displayName.includes('Precip')) {
		            wwd.removeLayer(wwd.layers[i]);
		            i--;
		        }
		        i++;
		    }
		    
		    //We have to filter it based on year
		    var newData = filterCSVData(csvData, 0, ui.value);
		    
		    //Simply recreate the layer again
		    generatePlacemarkLayer(wwd, newData);
		});
		console.log(wwd);
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
    var csvList = ['tsevent.csv', 'volcano.csv', 'test2.csv'];
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
    var dataTypes = ['Tsunami', 'Volcano', 'Precip'];
    
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

//Converts 2d to 3d
function convert2Dto3D(wwd, x, y) {
     var pickList = wwd.pickTerrain(wwd.canvasCoordinates(x, y));
     
     var threeDetails = [];
     console.log(pickList.objects[0]);
     if(typeof(pickList.objects[0]) != 'undefined') {
         threeDetails.push(pickList.objects[0].position.latitude);
         threeDetails.push(pickList.objects[0].position.longitude);
         threeDetails.push(pickList.objects[0].position.altitude);
         return threeDetails;
     } else {
         return false;
     }
}