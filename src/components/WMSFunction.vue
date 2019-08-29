<template>
    <v-content>
        <h1>WMS Functions</h1>
        <v-btn @click="fetchWMSLayer()" :disabled="fetchedBool">{{ !fetchedBool ? "Fetch the layers" : "Already Fetched WMS Layers" }} </v-btn>
        <h2>Available Layers</h2>
        <v-btn v-for="layer in layers" small block :color="!isFetched(layer) ? 'primary' : 'secondary'"
            :key="layer" @click="addWMSToGlobe(layer)">
            {{ !isFetched(layer) ? `Load ${layer} layer` : `Already Loaded ${layer} layer` }}
        </v-btn>
    </v-content>
</template>

<script lang="ts">
/**
 * Library imports
 */ 
import { Vue, Component } from "vue-property-decorator";
import { EventBus, EventList } from "../EventBus";
// Not the nicest import but considering there are no types, this will do
let WorldWind = require('@nasaworldwind/worldwind');

@Component({})
export default class WMSFunction extends Vue {
    /**
     * Constants, we can make this part of the ENV if need be
     */
    private constWMSAddr: string = "https://neowms.sci.gsfc.nasa.gov/wms/wms";
    private sampleLayers: string[] = ["TRMM_3B43M", "MYD28M", "MOD11C1_D_LSTDA",
                "MOD11C1_D_LSTNI", "MOD_143D_RR"];

    /**
     * WMS and XML things
     */
    // The XML to configure the default WMS layers
    private loadedXML: string = "";
    private loadedWMSCapbilities: any = {};

    // Layers loaded in layer manager
    private fetchedLayers: string[] = [];
    // Determines whether or not the layers as a whole has been fetched
    private fetchedBool: boolean = false;

    get layers() {
        // For now, layers are the sample layers
        return this.sampleLayers;
    }

    // Quick helper function to compute if the layer has been fetched
    private isFetched(key: string): boolean {
        return !!this.fetchedLayers.find((fetched) => {
            return key === fetched;
        });
    }

    // Once we are done fetching store in localStorage for quick parsing
    private fetchWMSLayer() {
        fetch(this.constWMSAddr).then((resp) => {
            return resp.text();
        }).then((data) => {
            // Assign to local storage
            localStorage.setItem("WMS_XML", data);
            this.fetchedBool = true;
            this.loadWMSData();
        });
    }

    // Handles loading the XML data that can be parsed into the globe
    private loadWMSData() {
        if (this.loadedXML !== "") {
            // Have valid data somewhat. Note we fetch the XML with the header so we need to parse it
            // manually
            const tempParse = new DOMParser();
            this.loadedWMSCapbilities =
                new WorldWind.WmsCapabilities(tempParse.parseFromString(this.loadedXML, "text/xml"));
        }
    }

    // Based on the key given, send the WMS layer over
    private addWMSToGlobe(key: string) {
        if (!this.isFetched(key)) {
            const layer = this.loadedWMSCapbilities.getNamedLayer(key);
            const config = WorldWind.WmsLayer.formLayerConfiguration(layer);
            config.title = layer.title;
            const dimensionedLayer = new WorldWind.WmsTimeDimensionedLayer(config);
            // We can assume that there is at least a start time and the array has at least 1 element
            dimensionedLayer.time = config.timeSequences[0].startTime;
            EventBus.$emit(EventList.ADD_WMS_LAYER, dimensionedLayer);
            this.fetchedLayers.push(key);
        }
    }

    // Check for local storage to see if we already have the XML
    private mounted() {
        // Serving the content statically through the 
        WorldWind.configuration.baseUrl = '/';
        const storage = localStorage;
        const maybeXML = localStorage.getItem("WMS_XML");
        if (maybeXML) {
            this.loadedXML = maybeXML;
            this.fetchedBool = true;
            this.loadWMSData();
        }
    }
}
</script>

<style lang="css">
</style>