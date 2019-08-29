import Vuex from 'vuex'
import Vue from 'vue'
import globe from './modules/globe'
Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    // Put modules here
    globe
  }
})
