<img src="https://worldwind.arc.nasa.gov/css/images/nasa-logo.svg" height="100"/>
<p>in partnership with the <a href="http://www.esa.int" target="_blank">European Space Agency</a></p>

# NASA AgClimate

### AgClimate is the largest three-dimensional web-based interactive browser of agriculture, weather, climate,
and other publicly available time-aware geospatial data, built upon NASA's revolutionary World Wind technology.

## Video Tutorial

<a href="https://www.youtube.com/watch?v=WMYI1UcgFr4">
<img src="http://i.imgur.com/GTxfgk7.png" />
</a>

## Introduction

The NASA WorldWind 2017 Intern team has designed an educational web application to visualize the effects of climate change
on different parts of the world using the open-source Web World Wind API. Spatial data for agriculture and atmosphere in
various formats are organized, analyzed and visualized on the globe. Users can hover the cursor over placemarks for
statistical data specific to that country’s history for atmosphere and agriculture throughout a specified time frame.
Users can also easily control each dataset on the globe by adjusting the opacity, time value, etc., while comparing
selected countries. This web application gives a customizable experience to teachers, science centers and home schoolers
who can learn about climate issues by manipulating the data according to their interests.

_Screenshot showing how the Earth looks like through AgClimate in its starting position. This image shows the Blue Marble
layer as a base; AgClimate also supports Bing Maps and a Digital Elevation Layer too._

<img src=" " />

_Image showing..._

<img src="http://i.imgur.com/2HnOm8V.jpg" />

_Screenshot showing AgClimate comparing agricultural data from around the world..._

<img src="http://i.imgur.com/nqK4kV0.png" />

## Features of AgClimate

* Load in any number of spatiotemporal geographically accurate data from multiple sources, using a variety of formats including WMTS, WMS, KML, TIFF, and CSV.
* Input data sources of different sizes and projections, then see that data in any preferred projection including 3D, Mercator, Equirectangular, Polar and more.
* Adjust the time and date of any layer and easily experience how the visualized data changes with respect to time and space.
* Adjust the opacity of each layer and thereby integrate layers to study groups of information together.
* Change the order for where layers are placed in the hierarchy.
* Visualize graphs of agricultural data with respect to time.
* Compare data for each country with color display.
* Read available information about each layer.
* Use the Destination tool to immediately visit any desired location.


## How to Run and Develop AgClimate Locally

Start by cloning the repository to your local system. You can do this through the terminal by using the ```git``` command, as outlined below.

```
git clone https://github.com/WorldWind-2017/AgClimate.git
```

The above code should clone the repository to a folder called AgClimate. To navigate to the examples folder specific to AgClimate, you can use the command outlined below.

```
cd AgClimate/examples
```

The main heart of the Javascript functions associated with World Weather are contained within the ```index.js``` file in the apps folder. One example of editing this file is through the program vim, which can be used through the following command.

```
vim index.js
```

If you modify the source of NASA World Wind during development, you will need to recompile the source to a minified Javascript file. To do this, navigate to the Developmet folder (one folder back from the apps folder), then run the command ```grunt```.

```
cd ..
grunt
```

The above command should run successfully and copy the compiled Javascript file to the apps folder automatically.



***

**Organization:** NASA Ames Research Center

**Manager:** <a href="https://www.linkedin.com/in/phogan">Patrick Hogan</a>

**Authors:**


