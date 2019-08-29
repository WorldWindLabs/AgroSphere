export default {
  state: {
    globe: {}
  },

  actions: {
    setGlobe: function ({ commit }, globe) {
      commit('SET_GLOBE', globe)
    },

    addLayer: function ({ commit }, layer) {
      this.state.globe.globe.addLayer(layer)
    }
  },
  mutations: {
    SET_GLOBE: function (state, globe) {
      state.globe = globe
    }
  },
  getters: {
    globe: state => {
      return state.globe
    }
  }
}
