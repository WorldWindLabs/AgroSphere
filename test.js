/*
 * Copyright (C) 2017 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 */
var geoMode = 0;
requirejs.config({
	waitSeconds: 180,
	paths:{
    "jquery":"https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min",
    "jqueryui": "https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/" +
        "jquery-ui.min",
    "jquery-csv": "https://cdnjs.cloudflare.com/ajax/libs/jquery-csv/0.8.3/" +
        "jquery.csv",
    "simple-stats": "https://unpkg.com/simple-statistics@4.1.0/dist/" +
        "simple-statistics.min",
	"regression": "src/regression/regression",
	"resizejs" : "js/resizejs/src/ResizeSensor"
	}
});
requirejs(['./src/WorldWind',
        './LayerManager', 'src/countries/DataLayer',
		'src/countries/GlobalDataPoint',
		'src/array/DataArray',
		'src/customlayer/LayerPoint',
		'jquery',
        'jqueryui', 'jquery-csv', 'simple-stats', 'regression', 'resizejs'],
    function (ww,
              LayerManager, DataLayer, GlobalDataPoint, DataArray, LayerPoint,
			  ResizeSensor) {
        "use strict";
		var ResizeSensor = require("resizejs");
		//Basic configuration
        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);
		WorldWind.configuration.baseUrl = '';
        var wwd = new WorldWind.WorldWindow("canvasOne");

		//Loading the files (raw data)
		var countryData =
			new DataArray(loadCSVData('csvdata/countries.csv'), {});
		var stationData =
			new DataArray(loadCSVData('csvdata/weatherstations.csv') , {});
		var agriDef = new DataArray(loadCSVData('csvdata/cropAcros.csv'));

		var csvMultiData = loadCSVDataArray();
		var agriData = new DataArray(convertArrayToDataSet(csvMultiData[0]),
			{HTML_ID: 'agri', HTML_Label: 'Ag. Production Data List',
			 definitions: agriDef, searchName: 'crop production',
			 units: ' Production in tonnes'});
        var atmoData = new DataArray(convertArrayToDataSet(csvMultiData[1]),
			{HTML_ID: 'atmo', HTML_Label: ' Crops'});
        var priceData = new DataArray(convertArrayToDataSet(csvMultiData[2]),
			{HTML_ID: 'price', HTML_Label: 'Price Data List',
				searchName: 'prices'});
        var liveData = new DataArray(convertArrayToDataSet(csvMultiData[3]),
			{HTML_ID: 'live', HTML_Label: 'Livestock Data List',
				searchName: 'livestock'});
        var emissionAgriData = new DataArray(
			convertArrayToDataSet(csvMultiData[4]),
			{HTML_ID: 'emission', HTML_Label: 'Emission Data List',
				searchName: 'emission output type'});
        var atmoDataMonthly = new DataArray(convertArrayToDataSet(csvMultiData[5]),
			{HTML_ID: 'atmoMonth', HTML_Label: 'Monthly Atmo List'});
        var pestiData = new DataArray(convertArrayToDataSet(csvMultiData[6]),
			{HTML_ID: 'pesti', HTML_Label: 'Pesticide Data List',
				searchName: 'crop production'});
        var fertiData = new DataArray(convertArrayToDataSet(csvMultiData[7]),
			{HTML_ID: 'ferti', HTML_Label: 'Fertilizer Data List',
				 searchName: 'fertiliser use'});
        var yieldData = new DataArray(convertArrayToDataSet(csvMultiData[8]),
			{HTML_ID: 'yield', HTML_Label: 'Yield Data List',
				 searchName: 'yield output'});
		var refugeeData = new DataArray(convertArrayToDataSet(csvMultiData[9]));
		agriData.options.subData = [refugeeData.values];
		atmoData.options.subData = [agriData.values];
		var countryButtonDataArray = [agriData, priceData, liveData, emissionAgriData,
			pestiData, fertiData, yieldData];
		var stationButtonArray = [atmoData, atmoDataMonthly];
		var geoJSONData = loadGEOJsonData('./geo/data/countries.geojson');

        var layers = [
            {layer: new WorldWind.BMNGLayer(), enabled: false},
            {layer: new WorldWind.BMNGLandsatLayer(), enabled: false},
            {layer: new WorldWind.BingAerialLayer(null), enabled: false},
            {layer: new WorldWind.BingAerialWithLabelsLayer(null), enabled: true},
            {layer: new WorldWind.BingRoadsLayer(null), enabled: false},
            {layer: new WorldWind.CompassLayer(), enabled: false},
            {layer: new WorldWind.CoordinatesDisplayLayer(wwd), enabled: true},
            {layer: new WorldWind.ViewControlsLayer(wwd), enabled: true},
        ];

        for (var l = 0; l < layers.length; l++) {
            layers[l].layer.enabled = layers[l].enabled;
            wwd.addLayer(layers[l].layer);

        }

        // Create a layer manager for controlling layer visibility.
        var layerManager = new LayerManager(wwd);

		////////////////////////////////////////////////////////////////////////
		//Layer Loading
		////////////////////////////////////////////////////////////////////////
		loadCountryLayer(wwd, countryData);
		loadWeatherLayer(wwd, stationData);

		var rainfallLayer =
			new LayerPoint("https://neowms.sci.gsfc.nasa.gov/wms/wms",
			"TRMM_3B43M" );
		var seaSurfaceLayer =
			new LayerPoint("https://neowms.sci.gsfc.nasa.gov/wms/wms",
			"MYD28M");
		var landSurfaceDay =
			new LayerPoint("https://neowms.sci.gsfc.nasa.gov/wms/wms",
			"MOD11C1_D_LSTDA");
		var landSurfaceNight =
			new LayerPoint("https://neowms.sci.gsfc.nasa.gov/wms/wms",
			"MOD11C1_D_LSTNI");
		var trueColour =
			new LayerPoint("https://neowms.sci.gsfc.nasa.gov/wms/wms",
			"MOD_143D_RR");
		var WMSTLayerArray = [];
		WMSTLayerArray.push(rainfallLayer);
		WMSTLayerArray.push(seaSurfaceLayer);
		WMSTLayerArray.push(landSurfaceDay);
		WMSTLayerArray.push(landSurfaceNight);
		WMSTLayerArray.push(trueColour);
		var i = 0;
		var WMSTLayers = [];
		for(i = 0; i < WMSTLayerArray.length; i++) {
			WMSTLayers.push(
				loadWMSTLayers(wwd, layerManager, WMSTLayerArray[i], i));
		}
		layerManager.synchronizeLayerList();

		var starFieldLayer = new WorldWind.StarFieldLayer();
        var atmosphereLayer = new WorldWind.AtmosphereLayer();

        //IMPORTANT: add the starFieldLayer before the atmosphereLayer
        wwd.addLayer(starFieldLayer);
        wwd.addLayer(atmosphereLayer);
		var sunSimulationCheckBox = document.getElementById(
            'stars-simulation');
        var doRunSimulation = false;
        var timeStamp = Date.now();
        var factor = 1;

        sunSimulationCheckBox.addEventListener('change', onSunCheckBoxClick,
            false);

        function onSunCheckBoxClick() {
            doRunSimulation = this.checked;
            if (!doRunSimulation) {
                starFieldLayer.time = new Date();
                atmosphereLayer.lightLocation =
                    WorldWind.SunPosition.getAsGeographicLocation(starFieldLayer.time);
            }
            wwd.redraw();
        }

        function runSunSimulation(wwd, stage) {
            if (stage === WorldWind.AFTER_REDRAW && doRunSimulation) {
                timeStamp += (factor * 60 * 1000);
                starFieldLayer.time = new Date(timeStamp);
                atmosphereLayer.lightLocation =
                    WorldWind.SunPosition.getAsGeographicLocation(starFieldLayer.time);
                wwd.redraw();
            }
        }

		////////////////////////////////////////////////////////////////////////
		//Event Listening
		////////////////////////////////////////////////////////////////////////
		var highlightedItems = [];
        var handlePick = function (x, y) {
			//Handle a pick (only placemarks shall be)
            // De-highlight any previously highlighted placemarks.
            for (var h = 0; h < highlightedItems.length; h++) {
                highlightedItems[h].highlighted = false;
            }
            highlightedItems = [];

            var pickList;
            pickList = wwd.pick(wwd.canvasCoordinates(x, y));
			if (pickList.objects.length > 0) {
                var i = 0;
                for (i = 0; i < pickList.objects.length; i++) {
                    pickList.objects[i].userObject.highlighted = true;
                    // Keep track of highlighted items in order to
                    // de-highlight them later.
                    highlightedItems.push(pickList.objects[i].userObject);
                    if (typeof(pickList.objects[i].userObject.type) !=
                        'undefined') {
                        //It's most likely a placemark
                        //"most likely"
                        //Grab the co-ordinates
                        var placeLat =
                            pickList.objects[i].userObject.position.latitude;
                        var placeLon =
                            pickList.objects[i].userObject.position.longitude;

                        //Find the country
                        if (pickList.objects[i].userObject.type == 'Countries') {
							generateCountryTab(countryButtonDataArray,
									countryData, placeLat, placeLon);
                        } else if (pickList.objects[i].userObject.type ==
                            'Weather Station') {
							generateStationTab(stationButtonArray, stationData,
								placeLat, placeLon, countryData);
                        }
                    }
                }
			}
        };
        // Set up to handle clicks and taps.
        var handleClick = function (recognizer) {
            // Obtain the event location.
            var x = recognizer.clientX,
                y = recognizer.clientY;

            // Perform the pick. Must first convert from window coordinates
            // to canvas coordinates, which are
            // relative to the upper left corner of the canvas rather than
            // the upper left corner of the page.
            var pickList = wwd.pick(wwd.canvasCoordinates(x, y));
            // If only one thing is picked and it is the terrain, tell the
            // world window to go to the picked location.
			var i = 0;
			for(i = 0; i < pickList.objects.length; i++) {
				if(pickList.objects[i].isTerrain) {

					var position = pickList.objects[i].position;
					wwd.goTo(new WorldWind.Location(position.latitude,
                        position.longitude));
				}
			}
			handlePick(x,y);
        };
        // Listen for mouse clicks.
        var clickRecognizer = new WorldWind.ClickRecognizer(wwd, handleClick);

        // Listen for taps on mobile devices.
        var tapRecognizer = new WorldWind.TapRecognizer(wwd, handleClick);


		////////////////////////////////////////////////////////////////////////
		//Tab Generations
		////////////////////////////////////////////////////////////////////////
		generateWeatherHTML(countryData);
		giveWeatherButtonFunctionality();
		//Generate regression comparison and the provide functionality
		//In theory we could use any data we want
        generateGeoComparisonButton(agriData);
        giveGeoComparisonFunctionality(agriData, geoJSONData, wwd,
            layerManager);

		generateRemoveButton();

		//Initiate with a hardcoded link
		generateCountryTab(countryButtonDataArray, countryData, 64,26);

		////////////////////////////////////////////////////////////////////////
		// Helper Functions
		////////////////////////////////////////////////////////////////////////
        /**
         * Loads all CSV Files
		 * @param {String} csvAddress contains the address of the csvFile
         * @returns {Array<Object>} The object fields are based on the
		 * headings in the csv file.
         */
		function loadCSVData(csvAddress){
			//Find the file
			var csvString = "";

			var csvData = [];
			var i = 0;
			var csvRequest = $.ajax({
				async: false,
				url: csvAddress,
				success: function(file_content) {
					csvString = file_content;
					csvData = $.csv.toObjects(csvString);
				}
			});
			return csvData;
		}

		/**
		 * Loads weather stations CSV Data Array into Array of Weather Stations
		 * @param {DataArray} csvData contains the weather station location and
		 * details.
		 * @returns {Array<GlobalDataPoint>} A datastructure that maps a value
		 * to a location.
		 */

		function loadWeatherStation(csvData) {
			var i = 0;
			var temp = [];
			for(i = 0; i < csvData.values.length; i++) {
				temp.push(new GlobalDataPoint(csvData.values[i].stationName,
					csvData.values[i].lat, csvData.values[i].lon, {icon_code:
					'',
					type: 'Weather Station'}));
			}
			return temp;
		}

		/**
		 * Loads the weather station layer
		 * @param {WorldWindow} wwd is the  world window of the globe
		 * @param {Array<DataLayer>} weatherDataArray is
		 * an array containing the WMS Layers that needs to be loaded
		 */

		function loadWeatherLayer(wwd, weatherDataArray) {
			var weatherLayer = new DataLayer('Weather Station');
			var weatherData = loadWeatherStation(weatherDataArray);
			weatherLayer.loadFlags(weatherData, 'images/sun', '.png',
				null, null);
			console.log(weatherLayer);
			wwd.addLayer(weatherLayer.layer);
		}

		/**
         * Loads country CSV Data Array into Array of Countries
		 * @param {DataArray} countryDataArray DataArray that contains data of
		 * where the countries are located (centre-based).
         * @returns {Array} temp is an array containing all
		 * countries
         */

		function loadCountries(countryDataArray) {
			var i = 0;
			var temp = [];
			for(i = 0; i < countryDataArray.values.length; i++) {
				temp.push(new GlobalDataPoint(countryDataArray.values[i].country,
					countryDataArray.values[i].lat,
					countryDataArray.values[i].lon, {code_2:
						countryDataArray.values[i].code2,
						code_3: countryDataArray.values[i].code3,
						icon_code: countryDataArray.values[i].iconCode,
						name: countryDataArray.values[i].country,
						type: 'Country'}));
			}
			return temp;
		}
		/**
		 * Loads the country layer
		 * @param {WorldWindow} wwd is the window to draw the things on.
		 * @param {DataArray} countryDataArray is
		 * the data array containing where the flags need to be placed
		 * @returns {DataLayer} an object containing the layer and other details
		 * such as configuration of the layer
		 */
		function loadCountryLayer(wwd, countryDataArray) {
			var countryLayer = new DataLayer('Countries');
			var countryData = loadCountries(countryDataArray);
			countryLayer.loadFlags(countryData, './flags/', '.png', null, null);
			wwd.addLayer(countryLayer.layer);
			return countryLayer;
		}
        /**
         * hardcoded link: loads appropriate geoJSON data
		 * @param {string} geoJSONAddress address where the geoJSON file is at.
         * @returns {Object} contains details of the country borders in object
		 * format.
         */
        function loadGEOJsonData(geoJSONAddress) {
            //Load GEOJSON
            var data;
            $.ajax({
                dataType: 'json',
                async: false,
                url: geoJSONAddress,
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


        /**
         * Generates the html for the weather search
         * @param {DataArray} countryDataArray of data containing the country
		 * codes to be loaded onto the HTML
         */
        function generateWeatherHTML(countryDataArray) {
			var countryData = loadCountries(countryDataArray);
            var weatherHTML = '<h5 class="smallerfontsize">Weather Search</h5>';
            weatherHTML += '<p><input type="text" class="form-control" ' +
                'id="cityInput" placeholder="Search for city" title=' +
                '"Type in a layer"></p>';
            weatherHTML += '<select id="countryNames" class="form-control">'
            var i = 0;

            for(i = 0; i < countryData.length; i++) {
				//console.log(countryData);
                weatherHTML += '<option>' + countryData[i].options.code_2 + ' - ' +
                    countryData[i].name + '</option>';
            }
            weatherHTML += '</select><br>';
            weatherHTML += '<p><button class="btn-info" id="searchWeather">' +
                'Search Weather</button></p>';
			weatherHTML += '<div id="searchDetails"></div>'
            $('#weather').append(weatherHTML);
        }

        /**
         * Provides functionality to the weather button. (Hardcoded API Key)
         */
        function giveWeatherButtonFunctionality() {
			var APIKEY = '26fb68df7323284ea4430d8e4d3c60b1';
            var weatherButton = $('#searchWeather').button();
            weatherButton.on('click', function() {
                //Extract the two inputs
                var cityInput = $('#cityInput').val();
                var country = $('#countryNames :selected').val();
                var countryInput = country.slice(0,2);

                //Make an api request
                var apiURL = 'https://api.openweathermap.org/' +
                    'data/2.5/weather?q=' + cityInput + ','
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
                        var tempHTML = '<h5 class="fontsize"><b>Weather' +
                            ' Details for ' + data.name + '</b></h5>';
                        tempHTML += '<p><b>Country:</b> ' + data.sys.country
                            + '</p><br>';
                        tempHTML += '<p><b>Current Outlook:</b> ' +
                            data.weather[0].main + '</p><br>';
                        tempHTML += '<p><b>Current Outlook Description:</b> '
                            + data.weather[0].description + '</p><br>';
                        tempHTML += '<p><b>Current Temperature (Celsius):</b> '
                            + Math.round((data.main.temp - 272),2) +'</p><br>';
                        tempHTML += '<p><b>Sunrise:</b> ' + timeConverter(
                            data.sys.sunrise) + '</p><br>';
                        tempHTML += '<p><b>Sunset:</b> ' + timeConverter(
                            data.sys.sunset) + '</p><br>';
                        tempHTML += '<p><b>Max Temperature Today (Celsius)' +
                            ':</b> ' + Math.round((data.main.temp_max - 272),2)
                            + '</p><br>';
                        tempHTML += '<p><b>Min Temperature Today (Celsius):' +
                            '</b> ' + Math.round(data.main.temp_min  - 272, 2)
                            + '</p><br>';
                        tempHTML += '<p><b>Pressure (HPa):</b> ' +
                            data.main.pressure + '</p><br>';
                        tempHTML += '<p><b>Humidity (%):</b> ' +
                            data.main.humidity + '</p><br>';
                        tempHTML += '<p><b>Wind speed (m/s):</b>' +
                            data.wind.speed + '</p><br><br>';
                        dropArea.append(tempHTML);
                    },
                    fail: function() {}
                })
            });
        }

		/**
		 * Checks if the tab should be displayed. Also adds sensors to create
		 * readjusting graphs.
		 */
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

        $(function () {
            $(".draggable").draggable({
              containment:"window"
            });
        });

		/**
		 * Lets the resizable tab to resizable
		 */
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
				/* animation removed - stops resizing from working
				 * minHeight and minWidth are set so the UI will not glitch out
				 */
				maxHeight: 800,
				maxWidth: 1400,
				minHeight: 250,
				minWidth: 280
			});
		})();

		/**
		 * Gives functionality to the WMST buttons associated with the layers
		 * the part which lets the controls to be visible and turning on the
		 * the layer on and off
		 * @param {number} layerNumber shows which layer is associated
		 * @param {Layer} layer The layer that will be toggled on and off
		 */
		function giveWMSTLayersFunctionality(layerNumber, layer) {
			$('#layerToggle' + layerNumber).click(function() {
				var buttonNumber = this.id.slice('layerToggle'.length);
				layer.enabled =
					!layer.enabled;
				var layerControlList = $('.toggleLayers');
				var layerNumber = -1;
				var k = 0;
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
		}

		/**
         * preloads WMST layers
         *
         * @param {WorldWind} wwd - worldwindow
         * @param {LayerManager} layerManager - layerManager from layerManager.js
		 * @param {LayerPoint} layerPoint -
		 * The layer itself with other details to display
		 * @param {number} layerNumber - the number of the layer
		 * inserted for control purposes
		 * @returns {WmtsLayer} The WMST Layer that has just been loaded
         */
        function loadWMSTLayers(wwd, layerManager, layerPoint, layerNumber) {
            // Called asynchronously to parse and create the WMS layer
            var createWMTSLayer = function (xmlDom) {
                // Create a WmsCapabilities object from the XML DOM
                var wms = new WorldWind.WmsCapabilities(xmlDom);
                var i = 0;
                // using for loop to add multiple layers to layer manager
				// Retrieve a WmsLayerCapabilities object by
				// the desired layer name
				var wmsLayerCapabilities = wms.getNamedLayer(layerPoint.name);

				// Form a configuration object from the
				// WmsLayerCapability object
				var wmsConfig =
					WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
				// Modify the configuration objects title property to a
				// more user friendly title
				wmsConfig.title = wmsLayerCapabilities.title;

				var wmsLayer;
				wmsLayer =new WorldWind.WmsTimeDimensionedLayer(wmsConfig);
				wmsLayer.time = wmsConfig.timeSequences[0].startTime;

				// disable layer by default
				wmsLayer.enabled = false;
				// Add layers to World Wind and update the layer manager
				wwd.addLayer(wmsLayer);
				//Generate the html
				var layerButtonsHTML =
						'<button class="btn-info wmsButton" ' +
						'id="layerToggle' + layerNumber +'">' +
						wmsLayerCapabilities.title + '</button>';
				//Append html somehwere
				$('#wms').append(layerButtonsHTML);
				$('#layerToggle' + layerNumber).button();

				generateLayerControl(wwd, wmsConfig, wmsLayerCapabilities,
					wmsConfig.title, layerNumber);

				//Readd layercontrols
				setLayerControls();
				layerManager.synchronizeLayerList();
				giveWMSTLayersFunctionality(layerNumber, wmsLayer);
                return wmsLayer;
            };
            // Called if an error occurs during WMS Capabilities
            // document retrieval
            var logError = function (jqXhr, text, exception) {
                console.log("There was a failure retrieving the capabilities" +
                    " document: " + text + " exception: " + exception);
            };
            $.get(layerPoint.address).done(createWMTSLayer).fail(logError);
        }
        /**
         * This function generates the HTML first then supplies functionality
         * Given a layerName and its layernumber, generate a layer control block
         *
         * @param {WorldWindow} wwd - world window
         * @param {Object} wmsConfig - object containing how layer should look
         * @param {WmsLayerCapabilities} wmsLayerCapabilities -
		 * object representing what the wmslayer can do
         * @param {String} layerName - name of layer
         * @param {Number} layerNumber - number of layer in list
         */
        function generateLayerControl(wwd, wmsConfig, wmsLayerCapabilities,
                                      layerName, layerNumber) {
            //Generate the div tags
            var layerControlHTML = '<div class="toggleLayers" id="funcLayer' +
                layerNumber + '">';

            layerControlHTML += '<span style="display:none">Layer Controls for '+
              layerName + '</span>';

            //Spawn opacity controller
            layerControlHTML += generateOpacityControl(layerNumber);

            //Spawn the legend
            layerControlHTML += generateLegend(wmsLayerCapabilities);

            //Spawn the time if it has it
            if (typeof(wmsConfig.timeSequences) != 'undefined') {
                layerControlHTML += generateTimeControl(layerName,
                    layerNumber, wmsConfig);
            }
            layerControlHTML += '</div>';
            //Place the HTML somewhere
            $("#wms").append(layerControlHTML);

            //Add functionality to opacity slider
            giveOpacitySliderFunctionality(wwd, layerName, layerNumber);

            //Check time again to add functionality
            if (typeof(wmsConfig.timeSequences) != 'undefined') {
                giveTimeButtonFunctionality(wwd, layerName, layerNumber,
                    wmsConfig);
            }
        }

        /**
         * Creates a legend for a layer given its name and number
         *
         * @param {Object} wmsLayerCapabilities - object representing what the wms layer
		 * can do
         * @returns {String} contains the HTML to generate
         */
        function generateLegend(wmsLayerCapabilities) {

            //Check if a legend exists for a given layer this
            var legendHTML = '<br><h5><b>Legend</b></h5>';

            //Be thorough on checking the existence
            if((wmsLayerCapabilities.styles
                != null) && (wmsLayerCapabilities.styles[0].legendUrls[0])
                != null) {
                //Create the legend tag
                var legendURL=wmsLayerCapabilities.styles[0].legendUrls[0].url;
                legendHTML += '<div><img src="'+ legendURL +'"></div><br><br>';
            } else {
                //Say it does not exist
                legendHTML += '<div><p>A legend does not exist '  +
                    'for this layer</p></div>';
            }
            return legendHTML;
        }

        /**
         * Generates opacity control for a layer in HTML
         *
         * @param {Number} layerNumber - identifier to place layer
         * @returns {String} contains the HTML for opacity control
         */
        function generateOpacityControl(layerNumber) {
            //Create the general box
            var opacityHTML = '<br><h5><b>Opacity';

            //Create the slider
            opacityHTML += '<div id="opacity_slider_' + layerNumber + '"></div>';

            //Create the output
            opacityHTML += '<div id="opacity_amount_' +
                layerNumber + '">100%</div>';

            return opacityHTML;
        }

        /**
         * Gives layer opacity control given its name
         *
         * @param {WorldWindow} wwd - world window
         * @param {String} layerName - name of layer to give opacity control
         * @param {Number} layerNumber - id of layer
         */
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
                //Grabbing the layer is based on its name in addition to
                // the entire wwd
                for(var i = 0; i  < wwd.layers.length; i++) {
                    var target_layer = wwd.layers[i];
                    if(target_layer.displayName == layerName) {
                        //Match, set the opacity

                        target_layer.opacity = ui.value;
                        if (document.wwd_duplicate) {
                            if (!(document.wwd_duplicate instanceof Array))
                                document.wwd_duplicate.redraw();
                            else {
                                document.wwd_duplicate.forEach(
                                    function(element) {
                                        element.redraw();
                                });
                            }
                        }
                    }
                }
            });

        }

		/**
         * Generates remove button for graphs
         */
        function generateRemoveButton() {
            //Generate the remove button for the graphs
            var removeHTML = '<p><button class="btn-info" ' +
                'id="removeButton">Remove All Graphs</button></p>';
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

        /**
         * Generates time HTML control for specified layer
         *
         * @param {String} layerName - name of layer to give time control
         * @param {Number} layerNumber - number id for layer
         * @param {Object} wmsConfig - WMS configuration for layer control
         * @returns {String} contains the HTML of the time control
         */
        function generateTimeControl(layerName, layerNumber, wmsConfig) {
            //Create the general box
            //Create the output
            var startDate;
            var endDate;

            //modify the string based on whether it is monthly or daily
            if (layerName.indexOf("month") != -1) {
                //Forcibly remove the month format
                startDate =
                        wmsConfig.timeSequences[0].startTime.toDateString().substring(4, 7) + " " +
                        wmsConfig.timeSequences[0].startTime.toDateString().substring(11, 15);
                endDate = wmsConfig.timeSequences[wmsConfig.timeSequences.length
                    - 1].endTime.toDateString().substring(4, 7) + " " +
                    wmsConfig.timeSequences[wmsConfig.timeSequences.length
                    - 1].endTime.toDateString().substring(11, 15);
            }
            else {
                //Simply output the date time stamp
                startDate =wmsConfig.timeSequences[0].startTime.toDateString();
                endDate = wmsConfig.timeSequences[wmsConfig.timeSequences.length
                    - 1].endTime.toDateString();
            }

            //Generate the appropiate html with our dates
            var timeHTML = '<h5><b>Time Scale:</b> ' + startDate + ' - '
                + endDate + '</h5>';
            timeHTML += '<div id="time_scale_' + layerNumber + '"></div>';
            timeHTML += '<div id="time_date_' + layerNumber + '"><br>' +
                'Current Time: Use the Time Scale</div>';

            //Wrap up the HTML
            timeHTML += '</div>';
            timeHTML += '<br>';
            return timeHTML;
        }
		/**
		 * Simply provides functionality to the time control button.
		 * @param {WorldWindow} wwd - the world window for the globe.
		 * @param {String} layerName - the name of the layer ro search for
		 * @param {Number} layerNumber - the div to refer to
		 * @param {Object} wmsConfig configuration of the layer
		 */
        //Provides basic functionality for the time slider
        function giveTimeButtonFunctionality(wwd, layerName, layerNumber,
                                             wmsConfig) {
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
            //We split the slider up into pieces based on the array length
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

        /**
         * Searches for a layer given name and returns the layer object
         *
         * @param {WorldWindow} wwd - world window of the globe
         * @param {String} layerName - name of layer to search for
         * @returns {Layer} the correct layer object, 0 otherwise
         */
        function getLayerFromName(wwd, layerName) {
            var i = 0;
            for(i = 0; i < wwd.layers.length; i++) {
                if(wwd.layers[i].displayName == layerName) {
                    return wwd.layers[i];
                }
            }
            return 0;
        }

		/**
         * Refreshes the control or the functionality of the layerManager
         * buttons every time it is called for wmts layers
         */
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
                            //Active class for button, find appropriate layer
                            $(layerControlList[k]).show();
                        } else {
                            //Hide the class
                            $(layerControlList[k]).hide();
                        }
                    }
                });
            }
        }

		/**
		 * @param {Array<DataArray>}. Contains an array of DataArray to be
		 * used to generated the HTML of the country tab.
		 * @return {String} Returns the HTML to be displayed
		 */
		function generateCountryButtons(buttonDataArray) {
            var countryHTML = '<h5><b>Available Datasets</b></h5>';
			var i = 0;
			for(i = 0; i < buttonDataArray.length; i++) {
				countryHTML += '<button class="btn-info" id="spawn' +
				buttonDataArray[i].options.HTML_ID + '" >' +
				'Show ' + buttonDataArray[i].options.HTML_Label  +
				'</button>';
			}
            return countryHTML;
		}

		/**
		 * @param {Array<DataArray>} Contains the details of what needs to
		 * shown for the HTML.
		 * @param {string} The 3-letter code of the country that is being viewed
		 */
		function giveCountryButtonsFunctionality(buttonDataArray, countryCode) {
            var buttonAreaHTML = $('#buttonArea');
			var buttonNames = [];
			var i = 0;
			for(i = 0; i < buttonDataArray.length; i++) {
				var tempButton = $('#spawn' +
					buttonDataArray[i].options.HTML_ID).button();
				buttonNames.push('spawn' + buttonDataArray[i].options.HTML_ID);
				tempButton.on('click', function() {
					buttonAreaHTML.html('');
					var idNumber = buttonNames.indexOf(this.id);
					buttonAreaHTML.html(
						generateDataButtons(buttonDataArray[idNumber],
						countryCode, idNumber));
					giveDataButtonsFunctionality(buttonAreaHTML,
						buttonDataArray[idNumber],
						countryCode, idNumber);
				});
			}
        }

		/**
		 * @param {string} The name of the title for the graph.
		 * @param {secondName} The other part of the title.
		 * @param {DataArray} The data to be plotted.
		 * @param {string} The ID to place the graph
		 * @param {integer} Determine whether to accomodate for a subplot or not
		 */

        function plotScatter(titleName, secondName, inputData, htmlID, mode) {
            //Filter the input data, we may get some blanks
            var filteredData = (new DataArray(inputData)).filterBlanks('', {mode: 0});
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

            if(!(htmlID.includes('sub') || htmlID.includes('multi'))){
                new ResizeSensor(plotHTML, function() {
                    Plotly.Plots.resize(gd);
                });
            }
        }

		/**
		 * @param {DataArray} inputData contains the data to provide the HTML for
		 * @param {string} countryCode the ISO code of the country for search
		 * @param {number} mode is to determine what to display
		 * @returns {String} the html for data buttons
		 */
        function generateDataButtons(inputData,
			countryCode, mode) {
            //Based on the input data, generate the buttons/html
            //Mode dictates what to call the title or search bar
			var dataHTML = '';
			dataHTML += '<h4>' + inputData.options.HTML_Label + '</h4>' +
						'<input type="text" class="form-control" id="' +
						'searchinput" placeholder="Search for datasets.."' +
						' title="Search for datasets..">';
			dataHTML += '<input type="text" class="form-control"' +
				' id="amount" placeholder="How many of the biggest ' +
				inputData.options.searchName
				+ '" title="Search for datasets..">';
            //Find the appropiate data point to use for the buttons
            var dataPoint = (inputData.search(countryCode, 'code3'))[0];
			console.log(dataPoint);

            if (dataPoint != 0) {
				dataHTML += '<ul id="myUL">';
				dataHTML += '<button class="btn-info"id="allButton">' +
								'Graph Specified # top of ' +
								inputData.options.HTML_Label + '</button>';
                var i = 0;
                dataHTML += '<br><button class="btn-info" style="display:none" id="toggleLegend"' +
                    '>Toggle Graph Legend</button><br>';
                dataHTML += '<div id="allGraph"></div>';
				dataHTML += '<br><button class="btn-info" id="sortByName">' +
                    'Sort by Name</button>';
                dataHTML += '<br><button class="btn-info" id="sortByAverage">' +
                    'Sort by Amount</button>';
				console.log(dataPoint.dataValues, dataPoint);
                for (i = 0; i < dataPoint.dataValues.length; i++) {
                    //Generate the HTML to show for plots
                    dataHTML += '<div class="layerTitle" id="layerTitle'
                        + i + '"><li>' + dataPoint.dataValues[i].typeName
                        + '</li>';
                    if (inputData.options.definitions) {
                        var tempTitleName =
                            dataPoint.dataValues[i].typeName.slice(0,
                                dataPoint.dataValues[i].typeName.length -
                                inputData.options.units.length);
                        dataHTML += '<button class="btn-info" ' +
                            'id="definitionNumber' + i + '">Get Definition for' +
                            ' ' + tempTitleName + '</button>';
                    }

                    dataHTML += '<div class="resizeGraph" id="graphPoint'
                        + i + '"></div>';
                    dataHTML += '<button'
                        + ' class="btn-info"' + ' id="plotButton' + i
                        + '">Plot Graph</button>';
                    dataHTML += '<div id="messagePoint' + i + '"></div>';
                    dataHTML += '<button class="btn-info" id="combineButton'
                        + i + '">Combine Graph </button>';
                    dataHTML += '<button class="btn-info" id="addButton'
                        + i + '">Add Graph</button>';
                    dataHTML += '<br></div>';
                }
                dataHTML += '</ul>';
            } else {
                dataHTML += '<p>No data avaliable!</p>';
            }
            return dataHTML;
        }

		/**
		 * @param {string} detailsHTML is the HTML that contains the buttons
		 * @param {DataArray} inputData is the data to use for plotting
		 * @param {string} countryCode is the 3-letter code to identify the data
		 * @param {integer} mode the number finding out what HTML element to modify
		 */
		function giveDataButtonsFunctionality(detailsHTML, inputData,
			countryCode, mode) {
			var dataPoint = (inputData.search(countryCode, 'code3'))[0];
			if(dataPoint) {
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
                            selfHTML.button("option", "label", "Hide Graph");
                        } else {
                            plotHTML.html('');
                            selfHTML.button("option", "label", "Plot Graph");
                        }
                        $('#messagePoint' + buttonNumber).html('' +
                            'Plotted graph!');
                        //Create a temporary message indicating success
                        setTimeout(function(){ $('#messagePoint'+
                            buttonNumber).html('')}, 5000);
                    })
                    var combineButtonHTML = $('#combineButton' + i).button();
                    combineButtonHTML.click(function (event) {
                        var buttonID = this.id;
                        var buttonNumber = buttonID.slice(
                            'combineButton'.length);
                        //Add to the graph
                        plotScatter(dataPoint.dataValues[buttonNumber].typeName, dataPoint.code3,
                            dataPoint.dataValues[buttonNumber].timeValues,
                            'multiGraph', 1);
                        $('#messagePoint' + buttonNumber).html('Combined' +
                            ' graph! Please go to Data Graphs Tab');
                        setTimeout(function(){ $('#messagePoint'+
                            buttonNumber).html('')}, 5000);
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
                        var graphDiv = '<div id="subGraph' + graphNumber
                            + '"></div>';

                        $('#manyGraph').append(graphDiv);

                        //Graph it
                        plotScatter(dataPoint.dataValues[buttonNumber].typeName, dataPoint.code3,
                            dataPoint.dataValues[buttonNumber].timeValues,
                            'subGraph' + graphNumber, 0);
                        $('#messagePoint' + buttonNumber).html('Added graph!' +
                            ' Please go to Data Graphs Tab');
                        setTimeout(function(){ $('#messagePoint'+
                            buttonNumber).html('')}, 5000);
                    });

                    if(inputData.options.definitions) {
                        var definitionHTML = $('#definitionNumber'
                            + i).button();
                        definitionHTML.click(function (event) {
                            //Grab id
                            var buttonID = this.id;
                            var buttonNumber = buttonID.slice('' +
                                'definitionNumber'.length);

							//Grab titleName
                            var cropName = $(this).text().slice(('Get' +
                                ' Definition for ').length);
							console.log(cropName);
                            //Do a CSV search
                            var description =
								(inputData.options.definitions.search(cropName,'Item'))[0].Description;

                            $('#messagePoint' +buttonNumber).html(description);
                            setTimeout(function(){ $('#messagePoint'+
                                buttonNumber).html('')}, 10000);

                        });
                    }
				}
                $('#sortByName').off();
                $('#sortByName').click(function() {
                    //Go through the entire button list and sort them
                    var divList = $('.layerTitle');
                    var newList = [];
                    divList.sort(function(a, b) {
                        //Compare with the list element
                        if(a.firstChild.innerText < b.firstChild.innerText) {
                            return -1;
                        } else if(a.firstChild.innerText >
                            b.firstChild.innerText) {
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
                        $('#myUL').append('<div class="layerTitle" id="'
                            +$(newList[i]).attr('id')+'">' +
                            $(newList[i]).html() + '</div>');
                    }
                    giveDataButtonsFunctionality(detailsHTML, inputData,
						countryCode, mode);
                });
                $('#sortByAverage').off();
                $('#sortByAverage').click(function() {
                    var divList = $('.layerTitle');
                    var newList = [];
                    divList.sort(function(a, b) {
                        //Get the buttons
                        var buttonNumber1 = $(a).attr('id').slice(
                            'layerTitle'.length);
                        var buttonNumber2 = $(b).attr('id').slice(
                            'layerTitle'.length);
                        var data1 =
                            dataPoint.dataValues[buttonNumber1].timeValues;
                        data1 = (new DataArray(data1)).filterBlanks('', {mode : 0});
                        var data2 =
                            dataPoint.dataValues[buttonNumber2].timeValues;
                        data2 = (new DataArray(data1)).filterBlanks('', {mode : 0});
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
                        $('#myUL').append('<div class="layerTitle"' +
                            ' id="'+$(newList[i]).attr('id')+'">' +
                            $(newList[i]).html() + '</div>');
                    }
                    giveDataButtonsFunctionality(detailsHTML, inputData,
						countryCode, mode);
                });

                //Assign functionality to the search bar
                $('#searchinput').off();
                $('#searchinput').keyup(function (event) {
                    //if (event.which == 13) {
                    var input = $('#searchinput');
                    var textValue = input.val().toUpperCase();
                    //Iterate through the entire list and hide if
                    //value is not contained
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
                });

                //Assign functionality to the allButton
                var allButtonHTML = $('#allButton').button();
                //Remember in the case of regiving functionality, gotta remove
                //the listener
                allButtonHTML.off();
                allButtonHTML.on('click', function() {
                    //Plots a stacked bar
                    var topX = $('#amount').val();
                    var amount = 5;
                    if(!Number.isNaN(parseInt(topX))) {
                        amount = parseInt(topX);
                    }
                    if($(this).hasClass('plotted')) {
                        $(this).removeClass('plotted');
                        $('#allGraph').html('');
                    } else {
                        $(this).addClass('plotted');
                        plotStack(dataPoint, 'allGraph', amount);
						if(inputData.options.subData) {
							var j = 0;
							var subDataPointArray = [];
							for(j = 0; j < inputData.options.subData.length; j++) {
								subDataPointArray.push(
								(new DataArray(inputData.options.subData[j]).search(countryCode, 'code3'))[0]);
							}

							createSubPlot(subDataPointArray, 'allGraph');
						}

                    }
					$('#toggleLegend').toggle();
                });
                var legendButtonHTML = $('#toggleLegend').button();
                legendButtonHTML.off();
                legendButtonHTML.on('click', function() {
                    //Check if the plot exist
                    if($('#allGraph').html() != '') {
                        var layout = {};
                        if($(this).hasClass('legendoff')) {

                            layout.showlegend = true;
                            $(this).removeClass('legendoff');
                        } else {
                            layout.showlegend = false;
                            $(this).addClass('legendoff');
                        }
                        Plotly.relayout($('#allGraph').children()[0], layout);
                    }
                });
			}
		}

		/**
		 * Generates the buttons for the station.
		 * @param {DataArray} yearlyData data containing yearly precip/temp
		 * @param {String} stationCode is the name of the station used for search
		 * @returns {String} the html for the buttons
		 */
		function generateStationButtons(yearlyData, stationCode) {
            //Based on the input data, generate the buttons/html
            //Mode dictates what to call the title or search bar
			var dataHTML = '';
            //Find the appropiate data point to use for the buttons
            var dataPoint = (yearlyData.search(stationCode, 'code3'))[0];
            if (dataPoint != 0) {
				dataHTML += '<ul id="myUL">';
				dataHTML += '<button class="btn-info"id="allButtonStation">' +
								'Graph Specified # top of ' +
								yearlyData.options.HTML_Label + '</button>';
				dataHTML += '<div id="allGraphStation"></div>';
                var i = 0;
                dataHTML += '<br><button class="btn-info" style="display:none" id="toggleLegendStation"' +
                    '>Toggle Graph Legend</button><br>';
                for (i = 0; i < dataPoint.dataValues.length; i++) {
                    //Generate the HTML to show for plots
                    dataHTML += '<div class="layerTitle" id="layerTitle'
                        + i + '"><li>' + dataPoint.dataValues[i].typeName
                        + '</li>';

                    dataHTML += '<div class="resizeGraph" id="graphPointStation'
                        + i + '"></div>';
                    dataHTML += '<button'
                        + ' class="btn-info"' + ' id="plotButtonStation' + i
                        + '">Plot Graph</button>';
                    dataHTML += '<div id="messagePointStation' + i + '"></div>';
                    dataHTML += '<button class="btn-info" id="combineButtonStation'
                        + i + '">Combine Graph </button>';
                    dataHTML += '<button class="btn-info" id="addButtonStation'
                        + i + '">Add Graph</button>';
                    dataHTML += '<br></div>';
                }
                dataHTML += '</ul>';
            } else {
                dataHTML += '<p>No data avaliable!</p>';
            }
            return dataHTML;
		}
		/**
		 * @param {Array<DataArray>} buttonDataArray contains an array of data
		 * to generate the buttons and their functionality.
		 * @param {DataArray} stationData contains the data of the weather
		 * station locations
		 * @param {Number} placeLat the latitude of the station clicked.
		 * @param {Number} placeLon the longitude of the station clicked.
		 * @param {DataArray} countryData contains the code of all the countries
		 */
		function generateStationTab(buttonDataArray, stationData, placeLat,
				placeLon, countryData) {
			//Slow but usable
			var inLat = stationData.search(placeLat, 'lat');
			var inLon = stationData.search(placeLon, 'lon');
			console.log(inLat, inLon);
			var i = 0;
			var j = 0;
			var dataPoint;
			for(i = 0; i < inLat.length; i++) {
				for(j = 0; j < inLon.length; j++) {
					if(inLat[i] == inLon[j]) {
						dataPoint = inLat[i];
						break;
					}
				}
			}
			var details = $('#station');
			var detailsHTML = '<h4>Weather Station Detail</h4>';

			detailsHTML += '<p>Station Name: ' +
				dataPoint.stationName + '</p>';
			detailsHTML += '<button class="btn-info">' +
				'<a href="https://fluxnet.fluxdata.org//' +
				'data/download-data/" ' +
				'target="_blank">Download Raw Atmosphere' +
				' Data (Fluxnet Account Required)</a></button>';
			detailsHTML += generateStationButtons(buttonDataArray[0], dataPoint.stationName);
			details.html(detailsHTML);

			//2 letter code
			var ccode2 = dataPoint.stationName.slice(0,2);
			var ccode3 = (countryData.search(ccode2, 'code2'))[0].code3

			giveStationButtonsFunctionality(buttonDataArray[0], dataPoint.stationName, ccode3);
			displayTab('station');
		}

		/**
		 * Gives the recently generated station buttons functionality.
		 * @param {DataArray} atmoData contains the atmospheric data of all
		 * stations.
		 * @param {String} stationName is the name of the selected station
		 * @param {String} countryCode is the country that the station is
		 * associated with
		 */
		function giveStationButtonsFunctionality(atmoData, stationName,
			countryCode) {
			var atmoDataPoint = (atmoData.search(stationName, 'code3'))[0];
			console.log(atmoDataPoint);
			if(atmoDataPoint) {
				var i = 0;
                for(i = 0; i < atmoDataPoint.dataValues.length; i++) {
                    var buttonHTML = $('#plotButtonStation' + i).button();
                    buttonHTML.click(function(event) {
                        //Generate the plot based on things
                        var buttonID = this.id;
                        var buttonNumber = buttonID.slice(
                            'plotButtonStation'.length);
                        var selfHTML = $('#' + buttonID);
                        var plotID = 'graphPointStation' + buttonNumber;
                        //Do we already have a plot?
                        var plotHTML = $('#' + plotID);
                        if(plotHTML.html() == '') {
                            plotScatter(atmoDataPoint.dataValues[buttonNumber].typeName, '',
								atmoDataPoint.dataValues[buttonNumber].timeValues,
                                plotID, 0);
                            selfHTML.button("option", "label", "Hide Graph");
                        } else {
                            plotHTML.html('');
                            selfHTML.button("option", "label", "Plot Graph");
                        }
                        $('#messagePointStation' + buttonNumber).html('' +
                            'Plotted graph!');
                        setTimeout(function(){ $('#messagePointStation'+
                            buttonNumber).html('')}, 5000);
                    });
                    var combineButtonHTML = $('#combineButtonStation' + i).button();
                    combineButtonHTML.click(function(event) {
                        var buttonID = this.id;
                        var buttonNumber = buttonID.slice(
                            'combineButtonStation'.length);
                        //Add to the graph
                        plotScatter(atmoDataPoint.dataValues[buttonNumber].typeName,
									atmoDataPoint.code3,
                                    atmoDataPoint.dataValues[buttonNumber].timeValues,
                                    'multiGraph', 1);
                        $('#messagePointStation' + buttonNumber).html('Combined ' +
                            'graph! Please go to Data Graphs Tab');
                        setTimeout(function(){ $('#messagePointStation'+
                            buttonNumber).html('')}, 5000);
                    });

                    var addButtonHTML = $('#addButtonStation' + i).button();
                    addButtonHTML.click( function(event) {
                        //Grab id
                        var buttonID = this.id;
                        var buttonNumber = buttonID.slice('addButtonStation'.length);

                        //Check how many divs there are
                        var manyGraphDivChildren = $('#manyGraph > div');

                        var graphNumber = manyGraphDivChildren.length;

                        //Generate the html
                        var graphDiv = '<div id="subGraph' + graphNumber
                            + '"></div>';

                        $('#manyGraph').append(graphDiv);

                        //Graph it
							plotScatter(atmoDataPoint.dataValues[buttonNumber].typeName,
                                        atmoDataPoint.code3,
										atmoDataPoint.dataValues[buttonNumber].timeValues,
										'subGraph' + graphNumber, 0);
                        $('#messagePointStation' + buttonNumber).html('Added graph!' +
                            ' Please go to Data Graphs Tab');
                        setTimeout(function(){ $('#messagePointStation'+
                            buttonNumber).html('')}, 5000);
                    });
                }

                //Assign functionality to the allButton
                var allButtonHTML = $('#allButtonStation').button();
                allButtonHTML.on('click', function() {
                    //Plots a stacked bar
                    var topX = $('#amount').val();
                    var amount = 5;
                    if(!Number.isNaN(parseInt(topX))) {
                        amount = parseInt(topX);
                    }
                    if($('#allGraphStation').html() == '') {
						//Note we want to plot agri in this case (exception)
						var agriData = new DataArray(atmoData.options.subData[0]);
						var inputData = (agriData.search(countryCode, 'code3'))[0];
						plotStack(inputData, 'allGraphStation', amount);
						createSubPlot([atmoDataPoint], 'allGraphStation');
                    } else {
                        $('#allGraphStation').html('');
                    }
					$('#toggleLegendStation').toggle();
                });
                var legendButtonHTML = $('#toggleLegendStation').button();
                legendButtonHTML.off();
                legendButtonHTML.on('click', function() {
                    //Check if the plot exist
                    if($('#allGraphStation').html() != '' ) {
                        var layout = {};
                        if($(this).hasClass('legendoff')) {

                            layout.showlegend = true;
                            $(this).removeClass('legendoff');
                        } else {
                            layout.showlegend = false;
                            $(this).addClass('legendoff');
                        }
                        Plotly.relayout($('#allGraphStation').children()[0],
                            layout);
                    }
                });
			}
		}

		/**
		 * @param {Array<DataArray>} buttonDataArray
		 * is an array of data to be used for tab generation
		 * @param {DataArray} countryData contains the country location to
		 * determine what has been clicked
		 * @param {Number} placeLat The latitude of the click
		 * @param {Number} placeLon  longitide of the click
		 */

		function generateCountryTab(buttonDataArray, countryData, placeLat, placeLon) {
			//Slow but usable
			console.log(countryData);
			var inLat = countryData.search(placeLat, 'lat');
			var inLon = countryData.search(placeLon, 'lon');
			console.log(inLat, inLon);
			var i = 0;
			var j = 0;
			var dataPoint;
			for(i = 0; i < inLat.length; i++) {
				for(j = 0; j < inLon.length; j++) {
					if(inLat[i] == inLon[j]) {
						dataPoint = inLat[i];
						break;
					}
				}
			}

			var details = $("#country");
			var detailsHTML = '<h4>Country Details</h4>';

			detailsHTML +=
				'<p>Country: ' + dataPoint.country + '</p>';
			detailsHTML +=
				'<p>Country Code: ' + dataPoint.code3 +
				'</p>';
			detailsHTML += '<button class="btn-info"><a ' +
				'href="http://www.fao.org/faostat/en/#data/" ' +
				'target="_blank">Download Raw Agriculture ' +
				'Data</a></button>';
			//Get the agriculture data
			detailsHTML += generateCountryButtons(buttonDataArray);
			detailsHTML += '<div id="buttonArea"></div>';
			details.html(detailsHTML);
			giveCountryButtonsFunctionality(buttonDataArray, dataPoint.code3);
			displayTab('country');
		}
		/**
		 * Gives funcitonality to the geoComparison tab
		 * @param {DataArray} agriData the data to be placed on the geo comparison
		 * @param {Array<Object>} geoJSONData the array containing the
		 * geoJSONData of borderStyle
		 * @param {WorldWindow} wwd, The WorldWind interface
		 * @param {LayerManager} layerManager, the layer manager to modify
		 * after creating borders
		 */
		function giveGeoComparisonFunctionality(agriData, geoJSONData, wwd,
                                                layerManager) {
            //Generate the slider first
            geoMode = 0;
            var sliderHTML = $('#geoSlider');
            sliderHTML.slider({
                value: 2014,
                min: 1960,
                max: 2014,
                step:1
            });
			var fileButton = $('#fileButton').button();
			var fileInput = $('#fileInput');
			fileButton.on('click', function() {
				fileInput.click();
			})
			fileInput.on('change', function() {
				var dataName = this.files[0];
				var rawData = loadFile(window.URL.createObjectURL(this.files[0]));
				var newData = new DataArray(convertArrayToDataSet(rawData), {});
				//console.log(newData);
				$('#comp').html('');
				generateGeoComparisonButton(newData);
				giveGeoComparisonFunctionality(newData, geoJSONData, wwd,
						layerManager);
			})
            sliderHTML.on('slide', function(event, ui) {
                //Capture the year div
                var sliderValueDiv = $('#geoSlideValue');
                sliderValueDiv.html('Year Select: ' + ui.value);
            })

            sliderHTML.on('slidestop', function(event, ui) {
                var year = ui.value;
                document.getElementById('geoCompType' + geoMode).click();
            });
			console.log(agriData);
            //Search through the buttons
            var i = 0;
            for(i = 0; i < agriData.values.length; i++) {
                var buttonHTML = $('#geoCompType' + i);
                buttonHTML.button();
                buttonHTML.click(function(event) {
                    //Find the year based on the slider value
                    var sliderValue = $('#geoSlider').slider("value");
                    geoMode = parseInt(this.id.slice('geoCompType'.length));
                    var buttonName = $('#' + this.id).text().slice();

                    //Go through the agridata based on the button
                    //number for every country
                    var countryData = [];
                    var j = 0;
                    var k = 0;
                    var l = 0;
                    for(j = 0; j < agriData.values.length; j++) {
                        for(k = 0; k < agriData.values[j].dataValues.length; k++) {
                            if(agriData.values[j].dataValues[k].typeName ==
                                buttonName) {
                                for(l = 0; l < agriData.values[j].dataValues[k].timeValues.length; l++) {
                                    if(agriData.values[j].dataValues[k].timeValues[l].year == sliderValue) {
                                        var tempObject = {value: agriData.values[j].dataValues[k].timeValues[l].value,
                                                code3:agriData.values[j].code3};
                                        countryData.push(tempObject);
                                    }
                                }
                            }
                        }
                    }

                    //Got all the data, it
					var tempDataArray = new DataArray(countryData, {});
                    countryData = tempDataArray.filterBlanks('', {mode: 0});
					console.log(countryData, tempDataArray);
                    var countryLayer = colourizeCountries(countryData,
                        geoJSONData, buttonName);
                    countryLayer.userObject.year = sliderValue;
                    //Check if the country layer exist
                    var flagLayer;
                    var l = 0;
                    var currentLayerName;
                    for(l = 0; l < wwd.layers.length; l++) {
                        if(wwd.layers[l].displayName == 'Geo Country Data') {
                            currentLayerName =
                                wwd.layers[l].userObject.dataType;
                            var previousYear = wwd.layers[l].userObject.year;
                            wwd.removeLayer(wwd.layers[l]);
							l--;
                        } else if(wwd.layers[l].displayName ==
                            'Countries') {
                            flagLayer = wwd.layers[l];
                        } else if(wwd.layers[l].displayName == 'Col') {
							wwd.removeLayer(wwd.layers[l]);
							l--;
						}
                    }

					var allValues = [];
                    if((currentLayerName != buttonName) || (previousYear
                        != sliderValue)){
                        wwd.addLayer(countryLayer);
                        layerManager.synchronizeLayerList();
                        setLayerControls();
                        var m = 0;
                        //Go through the entire country flag placemarks
                        // and change the label
						//Also push the values to compare later
                        for(l = 0; l < flagLayer.renderables.length; l++) {
                            var code3 = flagLayer.renderables[l].userObject.code_3;
                            var flagName = flagLayer.renderables[l].userObject.name + '- ' + code3;
                            //Find the agriData with the code3
                            for(j = 0; j < agriData.values.length; j++) {
                                if(agriData.values[j].code3 == code3) {
                                    //Go through the timeValue that matches
                                    //the year
                                    for(k = 0; k < agriData.values[j].dataValues.length; k++) {
                                        if(agriData.values[j].dataValues[k].typeName == buttonName) {
                                            for(m = 0; m < agriData.values[j].dataValues[k].timeValues.length; m++) {
                                                if(agriData.values[j].dataValues[k].timeValues[m].year == sliderValue) {
                                                    if(agriData.values[j].dataValues[k].timeValues[m].value != '') {
                                                        flagName = flagLayer.renderables[l].userObject.name + '\n - ' + buttonName + '\n' +
                                                                agriData.values[j].dataValues[k].timeValues[m].value;
														allValues.push({code3: agriData.values[j].code3,
														value: agriData.values[j].dataValues[k].timeValues[m].value,
														lat: flagLayer.renderables[l].position.latitude,
														lon: flagLayer.renderables[l].position.longitude});
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            flagLayer.renderables[l].label = flagName;
                        }
						//We have the values

						allValues.sort(function(a,b) {
							return b.value - a.value;
						});

						wwd.addLayer(createColumns(allValues));
						layerManager.synchronizeLayerList();
						//get the top 10
						var travelCountries = allValues.slice(0, 10);
						console.log(travelCountries);

						//Create the button that travels
						var travelButtonHTML = '<button class="btn-info"' +
						'id="travelButton">' +
						'Travel to Top 10 countries</button>';

						$('#travelArea').html(travelButtonHTML);
						$('#travelButton').button();
						$('#travelButton').off();
						$('#travelButton').click(function() {
							//Travel to the top 10 countries
							var m = 0;
							var defaultAlt = 16e5;
							var travelTo = function(travelCountries, index) {
								if(index < travelCountries.length) {
									$('#travelButton').button('disable');
									setTimeout(function() {
										wwd.goTo(new WorldWind.Position(
											travelCountries[index].lat,
											travelCountries[index].lon),
											function() {
												travelTo(travelCountries,
												index + 1)
											});
									}, 3000);
								} else {
									$('#travelButton').button('enable');
								}
							}
							travelTo(travelCountries, 0);
						});
                    } else {
                        //Just go through the flag layer and relabel it
                        // to default
                        for(l = 0; l < flagLayer.renderables.length; l++) {
                            flagLayer.renderables[l].label =
                                    flagLayer.renderables[l].userObject.name +
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
		/**
		 * @param {DataArray} subData The array which acts a subgraph for the current
		 * plot.
		 * @param {String} htmlID The string containing the ID of the
		 * graph placement
		 */
        function createSubPlot(subData, htmlID) {
            //Create subplots
            var i = 0;
            var traces = [];
            var newLayout = {};
			var totalLength = 0;
			for(i = 0; i < subData.length; i++) {
				if(subData[i].dataValues.length > 3) {
					totalLength += 3;
				} else {
					totalLength += subData[i].dataValues.length;
				}
			}

            var incAmounts = (0.5/(totalLength + 1)).toFixed(2);
            newLayout['yaxis'] = {domain: [0, 0.5], title: ''};
            newLayout['yaxis2'] = {domain: [0, 0.5], side: 'right', title:
                'Percent (%)'};
			//We have a data set and its fields within
			var totalCount = 2;
            for(i = 0; i < subData.length; i++) {
				var j = 0;
				for(j = 0; (j < subData[i].dataValues.length) && (j < 3) ; j++) {
					totalCount++;
					var dataPoint = (new DataArray(subData[i].dataValues[j].timeValues)).filterBlanks('', {mode :0});
					var k = 0;
					var xValues = [];
					var yValues = [];
					if(dataPoint.length != 0) {
						for(k = 0; k < dataPoint.length; k++) {
							xValues.push(parseInt(dataPoint[k].year));
							yValues.push(parseFloat(dataPoint[k].value));
						}
						var tempTrace = {
							x: xValues,
							y: yValues,
							name: subData[i].dataValues[j].typeName,
							xaxis: 'x',
							yaxis: 'y' + (totalCount),
							graph: 'scatter'
						}
						traces.push(tempTrace);
						var lowDomain = (0.5 + ((totalCount - 2) * incAmounts)).toFixed(2);
						var highDomain = (0.5 + ((totalCount - 1) * incAmounts)).toFixed(2);
						if(highDomain > 1) {
							highDomain = 1;
						}
						var yTitle = '';
						var plotSide;
						if(totalCount % 2) {
							plotSide = 'left';
						} else {
							plotSide = 'right';
						}

						newLayout['yaxis' + (totalCount)] = {domain: [lowDomain, highDomain
							- 0.01], title: yTitle, side: plotSide};
						}
					}
            }
            var d3 = Plotly.d3;
            var gd3 = d3.select('#' + htmlID + '> div');
            var gd = gd3.node();
            Plotly.addTraces(gd, traces);
            Plotly.relayout(gd, newLayout);
            Plotly.relayout(gd, {
                'xaxis.autorange': true,
                'yaxis.autorange': true
            });

            new ResizeSensor($('#' + htmlID), function() {
                var d3 = Plotly.d3;
                var gd3 = d3.select('#' + htmlID + '> div');
                var gd = gd3.node();
                Plotly.Plots.resize(gd);
            });
        }

		/**
		 * The stack is the top X produced.
		 * @param {DataArray} inputData the data to be used
		 * @param {String} htmlID the ID of the graph to be placed
		 * @param {Number} amount the amount of the top that is being looked at
		 */
        function plotStack(inputData, htmlID, amount) {
            var i = 0;
            var filteredDataSet = [];
            for(i = 0; i < inputData.dataValues.length; i++) {
				var tempData = ((new DataArray(inputData.dataValues[i].timeValues)).filterBlanks('', {mode: 1, value: 0}));

                filteredDataSet.push(tempData);
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
                //Now find every data set that has a value that is the 5th or
                // higher (not 0)
                for(j = 0; j < filteredDataSet.length; j++) {
                    var value = parseFloat(filteredDataSet[j][i].value);
                    if((value > threshold) && (value != 0)) {
                        //Check if item is already in the array
                        var isIn = false;
                        for(k = 0; k < showDataValues.length; k++) {
                            if(showDataValues[k].typeName ==
                                inputData.dataValues[j].typeName) {
                                isIn = true;
                                break;
                            }
                        }

                        if(isIn == false) {
                            //Not in, create a new object
                            var tempObj = {};
                            tempObj.typeName =inputData.dataValues[j].typeName;
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
				//console.log(topPercentages, top5, tempValue);
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
                name: '% Share of total for Top ' + amount
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
                anchor: 'y'
            }

            var layout = {
                title: 'Top ' + amount + ' amounts for ' +
                inputData.code3 + ' vs Year',
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

        /**
         * Generates the html for geo location comparison
         *
         * @param {DataArray} data contains titles to show what data can
		 * be displayed
         */
        function generateGeoComparisonButton(data) {
            var count = 4;
            var i = 0;
            var j = 0;
            var comparisonHTML = '';
			comparisonHTML += '<button class="btn-info" id="fileButton">Open File</button>';
			comparisonHTML += '<input id="fileInput" type="file" name="name" style="display: none;" />';
            //Also implement the slider
            comparisonHTML += '<p><div id="geoSlider"></div><div ' +
                'id="geoSlideValue">Year Select: 2014</div></p><br>';
            var buttonNames = [];
            //Create the buttons, grab all the names for every crop known
            for(i = 0; i < data.values.length; i++) {
                for(j = 0; j < data.values[i].dataValues.length; j++) {
                    if(!buttonNames.includes(data.values[i].dataValues[j].typeName)) {
                        buttonNames.push(data.values[i].dataValues[j].typeName);
                    }
                }
            }

            var dropArea = $('#comp');

            dropArea.append('<input type="text" class="form-control" ' +
                'id="geoCompareSearch" placeholder="Search for datasets..."' +
                ' title="Search for datasets...">');
            comparisonHTML +='<div><b>Generate Geo-Comparison Data for...</b>';

            //Generic button template
            for(i = 0; i < buttonNames.length; i++) {
                var buttonTempName = buttonNames[i];
                comparisonHTML += '<div class="buttonDiv"><button ' +
                    'class="btn-info geoCompButton" id="geoCompType' + i +
                    '">'+ buttonTempName + '</button><br></div>';
            }

            var dropArea = $('#comp')
            dropArea.append(comparisonHTML);
        }
        /**
         * Converts unixt time into a date
         *
         * @param {UNIX_timestamp} The timestamp to be converted
         * @returns {String} String of the date
         */
        function timeConverter(UNIX_timestamp){
            var unixTime = new Date(UNIX_timestamp * 1000);
            var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul',
                'Aug','Sep','Oct','Nov','Dec'];
            var year = unixTime.getFullYear();
            var month = months[unixTime.getMonth()];
            var date = unixTime.getDate();
            var hour = unixTime.getHours();
            var min = unixTime.getMinutes();
            var sec = unixTime.getSeconds();
            var currentTime = date + ' ' + month + ' ' + year + ' '
                + hour + ':' + min + ':' + sec + " (In Your Timezone)";
            return currentTime;
        }
		/**
         * Loads CSV file in a different format (for FAO data)
         * @returns {Array<Objects>} Object parameters determined by CSV headers
         */
        function loadCSVDataArray() {
            var csvList = ['csvdata/FAOcrops.csv', 'csvdata/Atmo.csv',
                'csvdata/prices2.csv', 'csvdata/livestock.csv',
                'csvdata/emissionAll.csv', 'csvdata/Monthly_AvgData1.csv',
                'csvdata/pesti.csv', 'csvdata/ferti.csv',
                'csvdata/yield.csv', 'csvdata/refugeeout.csv'];

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

		/**
		 * loads the file for geoJson
		 * @param {string} fileName the location of the file
		 * @returns {Array<Object>} loads the data. header based on format
		 */
		function loadFile(fileName) {
			var output;
			var request = $.ajax({
				async: false,
				url: fileName,
				success: function(file_content) {
					output = $.csv.toArrays(file_content);
				}
			})
			return output;
		}

        //
		/**
		 * Find a value given a name
         * Returns 0 if it can't be found, else returns something
         * This assumes we are working with convertArrayToDataSet
		 * @param {Array<Object>} inputArray array to find the code in
		 * @param {String} name code that is being checked
		 * @returns {Object} the object that matches the name
		 */
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

        /**
         * Given a csv data array, convert the segment into objects
         *
         * @param {Array<Object>} csvData - in the format of id, paramatertype,
		 * year1 value,
         * year2 value...
         * @returns {Array<Object>}
         */
        function convertArrayToDataSet(csvData) {
			/*This is a very tricky object that was created. Basically it is
			an array of what I like to call a dataset. A dataset is an array
			containing the country name associated and other details.
			It also contains an array of what I like to call dataValues.
			DataValues contains the name of the data (e.g. apple production),
			and another array containing something known as timeValues.
			Time values simply contain a value and the time associated with it.

			Visualised example of a one-sample array of the return value.
			[{code3: 'FIN', startTime: 1941, endTime: 2014,
				dataValue: [{typeName: 'apple production',
					timeValue: [{year: 1941, value: 1000},
						{year: 1942, value: 1001}]},
					typeName: 'banana production',
						timeValue: [{year: 1944, value: 2020},
						{year: 1946, value: 1997}]]}]
			*/


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

		/**
		 * Creates columns for a geoJSON load
		 * @param {Array<DataValues>} allValues contains the details of each data point
		 * plotted for a particular geoJSON load
		 * @returns {RenderableLayer} the coloumn layer generated
		 */
		function createColumns(allValues) {
			var i = 0;
			var polyLayer = new WorldWind.RenderableLayer();
			polyLayer.displayName = 'Col';

			var tempValues = [];
			for(i = 0; i < allValues.length; i++) {
				tempValues.push(allValues[i].value);
			}
			tempValues = tempValues.sort(function(a,b) {
				if(a < b) {
					return -1;
				}
				if(a > b) {
					return 1;
				}
				if(a == b) {
					return 0;
				}
			});

			var mean = ss.mean(tempValues);
			var sd = ss.standardDeviation(tempValues);

			for(i = 0; i < allValues.length; i++) {
				//Get the co-ordinates
				var boundaries = [];
				var rank = ((tempValues.indexOf(allValues[i].value) + 1) /
						allValues.length) * 1.5;

				var zScore = ss.zScore(allValues[i].value, mean, sd);
				boundaries.push(new WorldWind.Position(
						parseFloat(allValues[i].lat) + 1, parseFloat(allValues[i].lon), Math.pow(10,
						rank + 4.5)));
				boundaries.push(new WorldWind.Position(
						parseFloat(allValues[i].lat) + 1,  parseFloat(allValues[i].lon) + 0.5, Math.pow(10,
						rank + 4.5)));
				boundaries.push(new WorldWind.Position(
						parseFloat(allValues[i].lat) + 1.5,  parseFloat(allValues[i].lon) + 0.5, Math.pow(10,
						rank + 4.5)));
				boundaries.push(new WorldWind.Position(
						parseFloat(allValues[i].lat) + 1.5, parseFloat(allValues[i].lon), Math.pow(10,
						rank + 4.5)));
				console.log(boundaries);
				//Create a temporary polygon
				var polygon = new WorldWind.Polygon(boundaries, null);
				var polygonAttributes = new WorldWind.ShapeAttributes(null);
				polygon.altitudeMode = WorldWind.ABSOLUTE;
				polygon.extrude = true;
				polygonAttributes.drawInterior = true;
				polygonAttributes.drawOutline = true;
				polygonAttributes.outlineColor = WorldWind.Color.LIGHT_GRAY;
				polygonAttributes.interiorColor = WorldWind.Color.LIGHT_GRAY;
				polygonAttributes.drawVerticals = polygon.extrude;
				polygonAttributes.applyLighting = true;
				polygon.attributes = polygonAttributes;
				var highlightAttributes = new WorldWind.ShapeAttributes(polygonAttributes);
				highlightAttributes.outlineColor = WorldWind.Color.RED;
				polygon.highlightAttributes = highlightAttributes;

				polyLayer.addRenderable(polygon);

				//Add the geo text
				var geoText = new WorldWind.GeographicText(boundaries[0],
						'' + allValues[i].value);
				var geoTextAttr = new WorldWind.TextAttributes(null);
				geoTextAttr.color = WorldWind.Color.CYAN;
				geoTextAttr.depthTest = false;
				geoText.attributes = geoTextAttr;
				polyLayer.addRenderable(geoText);
			}
			return polyLayer;
		}
		/**
		 * Displays the desired tab and hides the rest
		 *@param {string} tabName, the name of the tab to show
		 */

		function displayTab(tabName) {
			var otherTab = $("#layers");
			var otherTab2 = $("#graphs");
			var otherTab3 = $("#station");
			var otherTab4 = $("#comp");
			var otherTab5 = $("#wms");
			var otherTab6 = $("#weather");
			var otherTab7 = $("#view");
			var allTabs = [$("#layers"), $("#graphs"), $("#station"),
				$("#comp"), $("#wms"), $("#weather"), $("#view"),
				$('#country')];
			var i = 0;
			for(i = 0; i < allTabs.length; i++) {
				allTabs[i].hide();
			}
			$('#' + tabName).show();

			$('.glyphicon-globe').css('color', 'white');
			$('.fa-map').css('color', 'white');
			$('.glyphicon-cloud').css('color', 'white');
			$('.fa-area-chart').css('color', 'white');
			$('.glyphicon-briefcase').css('color', 'white');
			$('.fa-sun-o').css('color', 'white');
			$('.glyphicon-eye-open').css('color', 'white');
			$('.glyphicon-flag').css('color', 'lightgreen');

			$('.resizable').show();
		}

        /**
         * Based on z-score get a colour
         * Green means above mean, red means below, alpha is 1 by default
         *
         * @param {Number} zScore - country's z score to determine colour
		 * @param {Number} mode - determines whether to return as color or
		 * config file
         * @returns {}
         */
        function getColour(zScore, mode) {
            var configuration = {};
            configuration.attributes = new WorldWind.ShapeAttributes(null);

            //Could use exponential decay function or something
            var red = 0;
            var green = 0;
            if (zScore < 0) {
                red = 1;
                green = Math.exp(1.5*zScore);
            } else if (zScore == 0) {
                red = 1;
                green = 1;
            } else if (zScore > 0) {
                green = 1;
                red = Math.exp(-1.5 * zScore);
            } else if(isNaN(zScore)) {
                red = 0;
                green = 0;
            }
            configuration.attributes.interiorColor =
                new WorldWind.Color(red, green, 0, 1);
            configuration.attributes.outlineColor =
                new WorldWind.Color(0.5 * red, 0.5 * green, 0, 1);
            configuration.name = 'Hello World';
			if(mode) {
				return configuration;
			} else {
				return new WorldWind.Color(red, green, 0, 1);
			}
        }

        /**
         * Given a set of gradients and country pairs, colorize the countries
         *
         * @param {Array} valueCountryPair - country and value together
         * @param {Array<Object>} geoJSONData - country borders
         * @param {string} dataName - name of data type
         * @returns {RenderableLayer} Colourized border shapes
         */
        function colourizeCountries(valueCountryPair, geoJSONData, dataName) {
            //Isolate the gradients
            var i = 0;
            var values = [];
            for (i = 0; i < valueCountryPair.length; i++) {
                values.push(valueCountryPair[i].value);
            }
			if(values.length != 0) {
				//Find mean, and sd
				var mean = ss.mean(values);
				var sd = ss.standardDeviation(values);

				//Generate the legend for the thing
				var legendAmounts = 7;
				var legendOffset = -3;

				//Empty the legend segment

				//Loop through and determine the colour based on zscore
				var countryLayers = new WorldWind.RenderableLayer('' +
					'Geo Country Data');
				var zScore;
				for (i = 0; i < valueCountryPair.length; i++) {
					zScore = ss.zScore(valueCountryPair[i].value, mean, sd);
					//Get the colour
					var countryConfiguration;
					countryConfiguration = getColour(zScore, 1);
					countryConfiguration.name = 'haha';
					//Fire up the rendering
					var j = 0;
					for (j = 0; j < geoJSONData.features.length; j++) {
						if (geoJSONData.features[j].properties.code3 ==
							valueCountryPair[i].code3) {
							var countryString = JSON.stringify(
								geoJSONData.features[j]);
							var tempCallBack = function () {
								return countryConfiguration;
							}
							var countryStringJSON = new WorldWind.GeoJSONParser(
								countryString);
							countryStringJSON.load(null, tempCallBack, null);
							var innerLayer = countryStringJSON.layer;
							var k = 0;
							for(k = 0; k < innerLayer.renderables.length; k++) {
								innerLayer.renderables[k].userProperties.country =
									valueCountryPair[i].code3;
							}
							countryLayers.addRenderable(innerLayer);
							countryLayers.userObject = {dataType: dataName};
						}
					}
				}
				//Returns a renderable layer
				return countryLayers;
			}
        }
		////////////////////////////////////////////////////////////////////////
		// Document ready functions
		////////////////////////////////////////////////////////////////////////
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
                $('#legend').hide();
                $('#legendtext').hide();
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
                $('#legend').hide();
                $('#legendtext').hide();
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
                $('#legend').hide();
                $('#legendtext').hide();
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
                $('#legend').hide();
                $('#legendtext').hide();
                var i = 0;
                var j = 0;
                var manyGraphs = $('#manyGraph > div');
                for(i = 0; i < manyGraphs.length; i++) {
                    //Assume 2 child nodes if resize exists
                    if(manyGraphs[i].childNodes.length == 1) {
                        //Add the resize
                        new ResizeSensor($('#' + $(manyGraphs[i]).attr('id')),
								function() {
									for(j = 0; j < manyGraphs.length; j++) {
										var gd =$(manyGraphs[j]).children()[0];
										Plotly.Plots.resize(gd);
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
                $('#legend').toggle();
                $('#legendtext').toggle();
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
                $('#legend').hide();
                $('#legendtext').hide();
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
                $('#legend').hide();
                $('#legendtext').hide();
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
                $("#view").hide();$('#legend').hide();
                $('#legendtext').hide();
            setTimeout(function() {checkTabs()}, 50);
            });

            checkTabs();

          /* Highlighting correct button using CSS for geocomparison and wms layers */
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

            /* Toggling green border CSS when Simulate Stars
				checkbox is clicked and unclicked */
	        $('input:checkbox').click(function() {
	            $(this).toggleClass('active');
	        });
			//Automatically zoom into Helsinki, Finland
			wwd.goTo(new WorldWind.Position(60.1870, 24.8296, 16e5));
		});
    });
