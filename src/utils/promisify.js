/**
 * 每个chrome extension都是一个独立的沙箱，比如
 * 在backrgound控制台，随便找个扩展，打开背景页，输入chrome.runtime.a = 1
 * 再打开另外一个扩展的背景页，chrome.runtime.a => undefined
 * popup，content-scripts同理
 */

/**
 * methods(sendMessage)是callback回调
 * events的.addListener(listener: function)也是回调形式
 * 回调形式不方便，所以包装成promise的形式
 * 当然不是所有api都能包装成这个样子，这里只包装常用的onMessage,sendMessage
 * 但是每个部分都会有访问不到的api，所以分开设置 
 */

/**
 * 
 * @param {Object} target 挂载的对象
 * @param {String[]} methodList 方法名
 */
function methodPromisify (target, methodList) {
  if (!Array.isArray(methodList)) return;
  methodList.forEach(ev => {
    if (!target.hasOwnProperty(ev)) {
      console.error(`${ev} is not the property of ${target}.`);
      return;
    }
    target[`${ev}Async`] = (id, message) => {
      return new Promise((resolve, reject) => {
        try {
          target[ev](id, message, (result) => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
            resolve(result)
          })
        } catch (error) {
          reject(error)
        }
      })
    }
  })
}

/**
 * @desc 需要promise的api
 * methods: chrome.tabs.sendMessage, api调用如：chrome.runtime.sendMessage(tabId, message, () => {})
 * events: chrome.runtime.onMessage
 */
function backgroundPromisify () {
  methodPromisify(chrome.tabs, ['sendMessage'])
  // eventPromisify(chrome.runtime, ['onMessage'])
}

/**
 * @desc 需要promise的api
 * methods: chrome.tabs.sendMessage 
 * events: chrome.runtime.onMessage
 */
function popupPromisify () {
  methodPromisify(chrome.tabs, ['sendMessage'])
  // eventPromisify(chrome.runtime, ['onMessage'])
}

/**
 * @desc 需要promise的api
 * methods: chrome.runtime.sendMessage: chrome.runtime.sendMessage(extensionId, message, () => {})
 * events: chrome.runtime.onMessage
 */
function contentScriptPromisify () {
  methodPromisify(chrome.runtime, ['sendMessage'])
  // eventPromisify(chrome.runtime, ['onMessage'])
}

// 需要在各部分的头部调用一次
export {
  backgroundPromisify,
  popupPromisify,
  contentScriptPromisify
}



// // chrome.runtime.onMessage
// chrome.runtime[`onMessageAsync`] = () => {
//   return new Promise((resolve, reject) => {
//     try {
//       chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//         if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
//         resolve({
//           message,
//           sender,
//           sendResponse
//         })
//         return true
//       })
//     } catch (error) {
//       reject(error)
//     }
//   })
// };

// // chrome.runtime.sendMessage
// chrome.runtime[`sendMessageAsync`] = (extensionId, message) => {
//   return new Promise((resolve, reject) => {
//     try {
//       chrome.runtime.sendMessage(extensionId, message, (result) => {
//         if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
//         resolve(result)
//       })
//     } catch (error) {
//       reject(error)
//     }
//   })
// }

// // chrome.tabs.sendMessage
// chrome.tabs[`sendMessageAsync`] = (tabId, message) => {
//   return new Promise((resolve, reject) => {
//     try {
//       chrome.tabs.sendMessage(tabId, message, (result) => {
//         if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
//         resolve(result)
//       })
//     } catch (error) {
//       reject(error)
//     }
//   })
// }
/**
 * 
 * @param {Object} target 挂载的对象
 * @param {String[]} eventList 事件名
 */
//  function eventPromisify (target, eventList) {
//   if (!Array.isArray(eventList)) return;
//   eventList.forEach(ev => {
//     if (!target.hasOwnProperty(ev)) {
//       console.error(`${ev} is not the property of ${target}.`);
//       return;
//     }
//     target[`${ev}Async`] = () => {
//       return new Promise((resolve, reject) => {
//         try {
//           target[ev].addListener((message, sender, sendResponse) => {
//             if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
//             resolve({
//               message,
//               sender
//             })
//             return false
//           })
//         } catch (error) {
//           reject(error)
//         }
//       })
//     }
//     target[ev].addListener((message, sender, sendResponse) => {
//       target[`${ev}PromiseFn`] = new Promise((resolve, reject) => {
//         try {
//           if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
//           resolve({
//             message,
//             sender
//           })
//           return false
//         } catch (error) {
//           console.log(`${target[ev]}PromiseFn`, error);
//           reject(error)
//         }
//       })
//     })
    
//   })
// }