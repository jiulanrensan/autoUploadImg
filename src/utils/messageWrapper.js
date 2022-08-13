/**
 * 对 chrome.tabs.sendMessage, chrome.runtime.onMessage做一层封装，格式化入参返参
 * 
 * 信息体格式
 * {
 *    // 状态
 *    status: 'COMPLETE' | 'FAIL' | 'PROCESS', 
 *    // 描述
 *    message: string   
 *    // 内容       
 *    data: {
 *      beforeCompressed: {},
 *      afterCompressed: {},
 *      // base64 or http url
 *      source: string
 *    }                 
 * }
 */

const COMPLETE = 'COMPLETE'
const FAIL = 'FAIL'
const PROCESS = 'PROCESS'

export function sendSuccInfo({ tabId, source, beforeCompressed = {}, afterCompressed = {}, message = '', compressDuration }) {
  const resObj = {
    data: {
      source,
      beforeCompressed,
      afterCompressed,
      compressDuration
    },
    desc: message,
    status: COMPLETE
  }
  sendMessageFn({ tabId, data: resObj })
}

export function sendFailInfo({ tabId, message }) {
  const resObj = {
    desc: message,
    status: FAIL
  }
  sendMessageFn({ tabId, data: resObj })
}

export function sendProcessInfo({ tabId, message }) {
  const resObj = {
    desc: message,
    status: PROCESS
  }
  sendMessageFn({ tabId, data: resObj })
}


async function sendMessageFn({ tabId, data }) {
  try {
    const res = await chrome.tabs.sendMessageAsync(tabId, data)
    // console.log('sendMessageAsync succ', res);
  } catch (error) {
    console.log('sendMessageAsync error', error);
  }
}


export function onMessageFn({ succReceiver, failReceiver, processReceiver }) {
  /**
   * @desc 传递的消息放在message字段
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { status, desc, data } = message
    if (status === PROCESS) {
      processReceiver && processReceiver({ desc })
      return false
    }
    if (status === FAIL) {
      failReceiver && failReceiver({ desc })
      return false
    }
    if (status === COMPLETE) {
      const { source, beforeCompressed, afterCompressed, compressDuration } = data
      succReceiver && succReceiver({ desc, source, beforeCompressed, afterCompressed, compressDuration })
      return false
    }
  })

}