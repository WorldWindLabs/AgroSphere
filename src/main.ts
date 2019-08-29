import Vue from "vue";
import Vuetify from "vuetify";
import App from "./App.vue";
// import { router } from "./router";
// import store from "./store";
import 'vuetify/dist/vuetify.min.css'

// Create the Vue Instance
Vue.use(Vuetify);
new Vue({
    render: (h) => h(App)
}).$mount("#app");