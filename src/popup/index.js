import Vue from 'vue'
import App from './App.vue'
Vue.prototype.$EventBus = new Vue()
import { Switch, Radio, Slider, TabPane, Tabs, Upload, Button } from 'element-ui';
Vue.use(Switch);
Vue.use(Radio);
Vue.use(Slider);
Vue.use(TabPane)
Vue.use(Tabs)
Vue.use(Upload)
Vue.use(Button)

console.log('__popupScripts__');

Vue.config.productionTip = false

new Vue({
  render: h => h(App)
}).$mount('#app')