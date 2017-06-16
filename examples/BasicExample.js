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

        var cities = [
            {
                'name': "Ann Arbor",
                'state': "Michigan",
                'elevation': 267,
                'latitude': 42.279594,
                'longitude': -83.732124
            }
        ];

        var textAttributes = new WorldWind.TextAttributes(null),
            textLayer = new WorldWind.RenderableLayer("Ann Arbor Geographic Text");

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
        wwd.addLayer(textLayer);

        // Create a surface image using a static image.
        var surfaceImage1 = new WorldWind.SurfaceImage(new WorldWind.Sector(30, 50, -160, -130),
            "../images/goblue.jpg");

        // Add the surface images to a layer and the layer to the World Window's layer list.
        var surfaceImageLayer = new WorldWind.RenderableLayer();
        surfaceImageLayer.displayName = "Surface Image - Go Blue";
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

        wwd.addLayer(textLayerTwo);

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
        wwd.addLayer(placemarkLayer);

        var config = {
            service: "http://sedac.ciesin.columbia.edu/geoserver/wms",
            layerNames: 'usgrid:usgrid-summary-file1-2000_usa-pctasian-2000',
            sector: new WorldWind.Sector(-90, 90, -180, 180),
            levelZeroDelta: new WorldWind.Location(36, 36),
            numLevels: 1,
            format: "image/png",
            size: 256
        };

        wwd.addLayer(new WorldWind.WmsLayer(config, null));

        // Create a layer manager for controlling layer visibility.
        var layerManager = new LayerManager(wwd);

        // Web Map Service information from NASA's Near Earth Observations WMS
        var serviceAddress = "http://sedac.ciesin.org/geoserver/ows?service=wms&version=1.3.0&request=GetCapabilities";
        // Named layer displaying Average Temperature data
        var layerName = "popdynamics:popdynamics-global-est-net-migration-grids-1970-2000_1970-1980";

        // Called asynchronously to parse and create the WMS layer
        var createLayer = function (xmlDom) {
            // Create a WmsCapabilities object from the XML DOM
            var wms = new WorldWind.WmsCapabilities(xmlDom);
            // Retrieve a WmsLayerCapabilities object by the desired layer name
            var wmsLayerCapabilities = wms.getNamedLayer(layerName);
            // Form a configuration object from the WmsLayerCapability object
            var wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
            // Modify the configuration objects title property to a more user friendly title
            wmsConfig.title = "BOOOOOO";
            // Create the WMS Layer from the configuration object
            var wmsLayer = new WorldWind.WmsLayer(wmsConfig);

            // Add the layers to World Wind and update the layer manager
            wwd.addLayer(wmsLayer);
            layerManager.synchronizeLayerList();
        };
    });

$(document).ready(function(){
    $(".focustext").hide();
});

$(document).ready(function(){
    $(".togglebutton").click(function(){
        $(".focustext").slideToggle();
    });
});