import Vue from "vue";
export const EventBus = new Vue();
export enum EventList {
    TOGGLE_LAYER = "TOGGLE_LAYER",
    ADD_WMS_LAYER = "ADD_WMS_LAYER"
}