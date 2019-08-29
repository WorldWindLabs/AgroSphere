import Vue from 'vue'
import Router from 'vue-router'
import Main from '@/components/Main'
import WMS from '@/components/WMS'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/WMS',
      name: 'WMS',
      component: WMS
    }
  ]
})
