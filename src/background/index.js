/**
 * 消息通信：
 * 给content scripts发送消息只能用tabs.sendMessage: https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage
 */
/**
 * 拦截网页请求：
 * 
 * 只能在background调用 chrome.webRequest 相关的api
 * onBeforeRequest.addListener(listener: function) 可以在请求发生时调用
 * example: https://github1s.com/GoogleChrome/chrome-extensions-samples/blob/HEAD/mv2-archive/extensions/catblock/background.js
 * 
 * onBeforeRequest 的回调函数的返回值决定了拦截的请求的处理方式
 * 参考 https://developer.chrome.com/docs/extensions/reference/webRequest/#type-BlockingResponse
 */

import { backgroundPromisify } from '../utils/promisify'
import { downloadImg, uploadImg } from '../utils/handleImage'
import compressConfig from '../store/compressConfig'
import imageCompress from '../utils/imageCompress'
import { sendSuccInfo, sendFailInfo, sendProcessInfo } from '../utils/messageWrapper'


// 默认以5kb为分界线，小于等于5kb则直接下载
let minSizeToUpload = 5000

const blockingDomainList = [
  'https://lanhuapp.com',
  'https://codesign.qq.com'
]

backgroundPromisify()

const injectScripts = ['contentScripts.js']

/**
 * 即时更新content-script
 * 有三种情况
 * 1. 在扩展加载、重载时将 content-script 编程式注入
 * 2. 打开一个新的tab页时加载
 * 3. 刷新当前页面时加载
 */

// 加载扩展，直接注入
chrome.tabs.query({}, (tabList) => {
  if (!Array.isArray(tabList)) return
  // 筛选当前打开的蓝湖网页
  const openingPages = tabList.filter(tab => isBlockingDomain(tab.url))
  openingPages.forEach(page => injectFile(page))
});

/**
 * onCommitted 会在dom加载完成之后触发，这样content-scirpt往body里添加节点不会报错
 * 所以可以在新增网页，刷新网页时注入
 */
chrome.webNavigation.onCommitted.addListener((page) => {
  // 只监听蓝湖的域名
  if (!isBlockingDomain(page.url)) return
  injectFile(page)
});

/**
 * @desc 通过tabId给页面注入content-script,page.id => tabId
 * @param {Object} page
 */
function injectFile (page) {
  injectScripts.forEach(script => {
    chrome.tabs.executeScript(page.id, {
      file: `${script}`,
      runAt: 'document_idle'
    }, () => {
      console.log('injectFile', chrome.runtime.lastError);
    })
  })
}

function isBlockingDomain (url) {
  return blockingDomainList.some(domain => url.includes(domain))
}

/**
 * 如果把扩展关闭、卸载、刷新，已经注入的content-script也需要销毁
 * 另辟蹊径：利用connect状态判断
 * 添加此行只是为了防止报错
 */
 chrome.runtime.onConnect.addListener(() => {});

/**
 * onBeforeRequest会把全局的匹配到的url进行拦截
 * 包括页面发出的和extension里面发出的
 * 所以需要控制是否应该block
 * 
 * 第一次由页面请求图片，拦截并记录，然后axios请求图片，不拦截
 */
const blockMap = {}


// 拦截蓝湖网站页面的下载图片请求
chrome.webRequest.onBeforeRequest.addListener(
  onBeforeRequestCallback,
  { 
    // 下载图片的请求url格式
    urls: [
      "https://alipic.lanhuapp.com/*?noCache=true",
      // ui一般都是切png的图，所以codesign只拦截png，因为这个形式的图片url很多地方都用了，全拦截会导致页面展示异常
      "https://cdn3.codesign.qq.com/dcloud/attachments/*?imageMogr2/thumbnail/*/format/png"
    ] 
  },
  ["blocking"]
);

function onBeforeRequestCallback (details) {
  const { compressing, compressSwitch } = compressConfig.getCompressConfigFromBg()
  // 压缩关闭
  if (!compressSwitch) return { cancel: false }
  // 正在压缩
  if (compressing) return { cancel: false }
  // url: 拦截的url
  // initiator: 来源网站域名
  const { url, initiator } = details
  // console.log('onBeforeRequestCallback', details);
  // 这里的拦截会针对所有请求，包括网页，包括background，也包括直接把链接复制到搜索框访问
  // 1. 网页请求，拦击信息会有url, initiator 这里的initiator: https://lanhuapp.com
  // 2. background请求，也会有url, initiator 这里的initiator: chrome-extension://...
  // 3. 第三种情况有url无initiator

  // 第三种直接不拦截
  if (!initiator) return { cancel: false }
  const cancelVariable = shouldBeCancelled(url)
  // 在下一个任务循环中执行
  setTimeout(() => {
    getImageFromBlocking(details)
  })
  // 只有在cancel为true时，才会把请求block掉
  return { cancel: cancelVariable };
}

/**
 * @desc 第一次页面请求，blockMap没有记录，应该拦截；第二次是extension 的 axios请求，有记录，不应该拦截
 * @param {String} url 
 * @returns {Boolean}
 */
function shouldBeCancelled (url) {
  const hasOwn = blockMap.hasOwnProperty(url)
  // console.log('hasOwn', hasOwn, 'blockMap', JSON.stringify(blockMap));
  let cancelVariable = true
  if (hasOwn) {
    delete blockMap[url]
    cancelVariable = false
  } else {
    cancelVariable = blockMap[url] = true
  }
  return cancelVariable
}

async function getImageFromBlocking (details) {
  // 在block回调里调用，会造成死循环，需要根据blockMap控制
  const { tabId, url } = details || {}
  if (!tabId || !url) return
  if (!blockMap[url]) return
  // console.log('getImageFromBlocking', tabId, url, details);
  
  const imgBlob = await downloadImg(url)
  
  // 判断大小
  if (imgBlob.size < minSizeToUpload) {
    // 小于则不压缩不上传，直接传给content-script
    // blob数据不能直接传递
    // 通过fileReader接口转成base64
    const base64Str = await fileToDataURLAsync(imgBlob)

    sendSuccInfo({
      tabId,
      source: base64Str
    })
    return
  }

  try {
    sendProcessInfo({
      tabId,
      message: '压缩中...'
    })
    compressConfig.toggleCompressStatus(true)
    const result = await imageCompress.compress(imgBlob)
    compressConfig.toggleCompressStatus(false)
    if (!result) {
      sendFailInfo({
        tabId,
        message: '压缩过程发生了错误'
      })
      return
    }
    sendProcessInfo({
      tabId,
      message: '上传中...'
    })
    const { source, beforeCompressed, afterCompressed, compressDuration } = result
    const { succ, desc, imgUrl } = await uploadImg({ source, imgUrl: url })
  
    // sendSuccInfo({
    //   tabId,
    //   source: '',
    //   beforeCompressed: {type: 'png', size: 112},
    //   afterCompressed: {type: 'png', size: 45}
    // })
    succ ? sendSuccInfo({
      tabId,
      source: imgUrl,
      beforeCompressed,
      afterCompressed,
      compressDuration
    }) : sendFailInfo({
      tabId,
      message: `上传过程发生了错误: ${desc}`
    })
  } catch (error) {
    console.log('error', error);
    compressConfig.toggleCompressStatus(false)
    sendFailInfo({
      tabId,
      message: '压缩或上传过程发生了错误'
    })
  }
}

async function fileToDataURLAsync (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

