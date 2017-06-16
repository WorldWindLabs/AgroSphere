// Register an event listener to be called when the page is loaded.
window.addEventListener("load", loadWindow(), false);

// Define the event listener to initialize Web World Wind.
function loadWindow() {

	config = {
	            service: "http://sedac.ciesin.columbia.edu/geoserver/wms",
	            layerNames: 'gpw-v4:gpw-v4-land-water-area_land',
	            sector: new WorldWind.Sector(-90, 90, -180, 180),
	            levelZeroDelta: new WorldWind.Location(36, 36),
	            numLevels: 1,
	            format: "image/png",
	            size: 256
        	};

	wwd.addLayer(new WorldWind.WmsLayer(config, null));

}