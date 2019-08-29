<template>
  <v-app>
    <!-- Essentially draw over the draw bar -->
    <v-navigation-drawer
        fixed
        v-model="renderNavFunction"
        rightf
        clipped
        app>
        <WMSFunction v-if="currentFunction === FunctionType.WMS"></WMSFunction>
        <LayerManager v-if="currentFunction === FunctionType.LAYER_MANAGER" :globe="globe"></LayerManager>
        <v-btn @click="closeFunctionBar()">Close</v-btn>
    </v-navigation-drawer>    
    <v-toolbar
        fixed
        app
        clipped-right
    >
        <v-toolbar-side-icon @click="toggleNav()"></v-toolbar-side-icon>
        <v-toolbar-title>AgroSphere V2</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-toolbar-title></v-toolbar-title>
        <v-spacer></v-spacer>
    </v-toolbar>
    <v-navigation-drawer
        fixed
        v-model="popNav"
        app
    >
      <v-list>
        <v-list-group prepend-icon="stars" value="true">
            <template v-slot:activator>
                <v-list-tile>
                    <v-list-tile-title>Functions</v-list-tile-title>
                </v-list-tile>
            </template>
            <v-list-tile>
                <v-btn depressed small block color="primary" @click="openFunctionBar(FunctionType.WMS)">Apply sample WMS layers</v-btn>
            </v-list-tile>
            <v-list-tile>
                <v-btn depressed small block color="primary" @click="openFunctionBar(FunctionType.GEO_JSON)">Compare global data</v-btn>
            </v-list-tile>
            <v-list-tile>
                <v-btn depressed small block color="primary" @click="openFunctionBar(FunctionType.LAYER_MANAGER)">Configure Layers</v-btn>
            </v-list-tile>            
        </v-list-group>
      </v-list>
    </v-navigation-drawer>
    <v-content>
      <!-- Mainly the globe placed here -->
      <canvas id="globe" :style="{'background-color': 'black'}">
      </canvas>
    </v-content>
    <v-footer app>
        <span>Maintained by John Nguyen. Github: johnnguyen1997</span>
    </v-footer>   
  </v-app>
</template>
<script lang="ts">
/**
 * Library imports
 */ 
import { Vue, Component } from "vue-property-decorator";
// Not the nicest import but considering there are no types, this will do
let WorldWind = require('@nasaworldwind/worldwind');

/**
 * Components
 */
import WMSFunction from "./components/WMSFunction.vue";
import LayerManager from "./components/LayerManager.vue";
import { EventBus, EventList } from "./EventBus";
/**
 * Enums
 */
enum FunctionType {
  NONE = "NONE",
  WMS = "WMS",
  GEO_JSON = "GEO_JSON",
  LAYER_MANAGER = "LAYER_MANAGER"
}

@Component({
  components: {
    WMSFunction,
    LayerManager
  }
})
export default class App extends Vue {

  // Navigation state managements
  private popNav: boolean = false;
  private currentFunction: FunctionType = FunctionType.NONE;
  private renderNavFunction: boolean = false;
  // Unfortunately no typings for the globe, so we have to make due
  private globe: any = {};

  /**
   * Getters
   */

  get FunctionType() {
    return FunctionType;
  }

  /**
   * Functions
   */

  // Toggles the navigation bar
  private toggleNav() {
    this.popNav = !this.popNav
  }

  // Assigns a function to the application state
  private assignFunctionType(state: FunctionType)  {
    this.currentFunction = state;
  }

  // Opens the function navigation bar, if there is a state then also assign the function type
  private openFunctionBar(state?: FunctionType) {
    if (state) {
      this.assignFunctionType(state);
    }

    // Either case, render it and deny the other
    this.renderNavFunction = true;
    this.popNav = false;
  }

  // Closes the function navigation bar. If set none is true or not used
  // assign to none
  private closeFunctionBar(setNone: boolean = true) {
    if (setNone) {
      this.assignFunctionType(FunctionType.NONE);
    }

    // Either case, close function bar. Don't necessarily have to open the nav
    this.renderNavFunction = false;
  }

  // Toggling a layer is a matter of retrieving the index and calling the API function
  private handleToggleLayer(index: number) {
    this.globe.layers[index].enabled = !this.globe.layers[index].enabled;
  }

  // Nothing special with WMS yet, just add
  private handleAddWMS(layer: any) {
    this.globe.addLayer(layer);
  }

  // Main goals here is to configure the globe and event listeners
  private mounted() {
    // In terms of fetching WorldWind's own items, setting it to static makes it trivial
    // to retrieve with Vue
    WorldWind.configuration.baseUrl = '/';
    this.globe = new WorldWind.WorldWindow('globe');

    // Add the default layers
    this.globe.addLayer(new WorldWind.BMNGOneImageLayer());
    this.globe.addLayer(new WorldWind.CoordinatesDisplayLayer(this.globe));
    //this.globe.addLayer(new WorldWind.BMNGLandsatLayer(this.globe));
    this.globe.addLayer(new WorldWind.ViewControlsLayer(this.globe));
    this.globe.addLayer(new WorldWind.StarFieldLayer());
    this.globe.addLayer(new WorldWind.AtmosphereLayer());

    EventBus.$on(EventList.TOGGLE_LAYER, this.handleToggleLayer);
    EventBus.$on(EventList.ADD_WMS_LAYER, this.handleAddWMS);
  }
}
</script>
<style>
  #globe {
    width: 75%;
    height: 75%;
    border: 1px solid red;
  }
</style>
