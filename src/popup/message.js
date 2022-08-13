// popup to background
// chrome.extension.getBackgroundPage()
// Returns the JavaScript 'window' object for the background page running inside the current extension

// background to popup 且popup必须是打开状态
// chrome.extension.getViews()

let configFn = null
function getCompressConfigFn () {
  if (configFn) return configFn
  configFn = chrome.extension.getBackgroundPage().compressConfig
  return configFn
}

/**
 * 
 * @returns { { compressSwitch: boolean, compressing: boolean, compressRatio: '1' | '2', compressQuality: 0 | 1 | 2 } }
 */
export function getCompressStatus () {
  return getCompressConfigFn().getCompressConfigFromPopup()
}

export function changeCompressSwitch (bool) {
  getCompressConfigFn().changeCompressSwitch(bool)
}
/**
 * 
 * @param {string} val '1' | '2'
 */
export function changeCompressRatio (val) {
  getCompressConfigFn().changeCompressRatio(val)
}
/**
 * 
 * @param {number} val 0 | 1 | 2
 */
export function changeCompressQuality (val) {
  getCompressConfigFn().changeCompressQuality(val)
}