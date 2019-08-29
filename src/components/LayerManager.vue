<template>
    <v-content>
        <h1>Layer Manager</h1>
        <v-btn v-for="(layer, index) in layers" small block color="primary"
            :key="layer.displayName" @click="toggleLayer(index)">
            {{ layer.enabled ? `Disable ${layer.displayName}` : `Enable ${layer.displayName}`}}
        </v-btn>
    </v-content>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import { EventBus, EventList } from "../EventBus";
@Component({})
export default class LayerManager extends Vue {
    @Prop({ default: () => {} }) readonly globe: any;

    get layers() {
        return this.globe.layers || [];
    }


    // Emit a toggle event to the main application. The index should be enough
    private toggleLayer(index: number) {
        EventBus.$emit(EventList.TOGGLE_LAYER, index);
    }
}
</script>

<style lang="css">
</style>