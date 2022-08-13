import { contentScriptPromisify } from '../utils/promisify'
import Vue from 'vue'
import App from './App.vue'
// import {
// 	Button,
// 	Icon
// } from 'element-ui'

contentScriptPromisify()
window.a = 1
console.log('__contentScripts__');

// Vue.use(Button);
// Vue.use(Icon)

// 手动挂载
const MyComponent = Vue.extend(App)
const component = new MyComponent().$mount()
document.body.appendChild(component.$el)

// 没有触发？
// document.addEventListener('DOMContentLoaded',function(){
// 	const body = document.getElementsByTagName('body')[0]
// 	body.appendChild(component.$el)
// })

const connectObj = chrome.runtime.connect();
connectObj.onDisconnect.addListener(() => {
	const uploadDom = document.getElementById('upload')
	console.log('__remove contentScripts__');
	document.body.removeChild(uploadDom)
});
