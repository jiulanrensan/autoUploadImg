/**
 * 获取缩略图地址
 * @param url 带http(s)开头的url
 * @param [width] 缩略图宽度
 * @param [height] 缩略图高度
 * @returns {String} 可请求的缩略图拼接地址
 */
function minifyImg(url, width, height) {
  const urlCheck = new RegExp('^https?://')
  // 检查是否合法的http(s)开头的url
  if (!(url && urlCheck.test(url))) {
    return ''
  }
  if (!width || !height) {
    return url
  }
  const connect = url.indexOf('?') === -1 ? '?' : '&'
  const link = url + connect + 'imageView2/3/w/' + width + '/h/' + height
  const protocol = (link.match(urlCheck))[0]
  // 将协议拆分出来后,把多次重复的/替换成一个/
  return protocol + link.replace(protocol, '').replace(new RegExp('/+', 'g'), '/')
}

/**
 * 在computed里面执行的获取缩略图
 * @param url 带http(s)开头的url
 * @param [width] 缩略图宽度
 * @param [height] 缩略图高度
 * @returns { string } 缩略图地址
 */
function getMinifyImageUrl(url, width, height) {
  url = getImageUrl(url)

  return minifyImg(url, width, height)
}

/**
 * 根据url获取文件名 注意：不支持获取本地路径 仅支持网络路径
 * e.g http://192.168.1.1/img/timg.786ea0eb.gif?passkey=1/2. 输出 timg.786ea0eb.gif
 * https://i.vzan.cc/zt/image/HomeImage/jpeg/2017/12/20/
 * 19530418efddd9eba34b789d4942c7d8a98b8d.jpeg?x-oss-process=image/resize,limit_0,m_fill,w_200,h_200/quality,q_100
 * @param url 传入的url地址
 * @param noSuffix 是否无需要后缀
 */
function getFileName(url, noSuffix) {
  if (url === null || typeof url === 'undefined') {
    return ''
  }
  const fileName = ((decodeURI(`${url}`).split('?').shift() || '').split('/').pop() || '').split('#')[0]

  // 如果需要后缀
  if (!noSuffix) {
    return fileName
  }
  // 获取.+后缀
  const suffix = fileName.substring(fileName.lastIndexOf('.'))
  // 截取以.后缀结尾的
  const reg = new RegExp(suffix + '$')
  return fileName.replace(reg, '')
}

/**
 * 获取文件后缀（扩展名，返回的数据可能为png | jpeg?a=1 | mp3）
 * @param fileName 文件名
 */
function getFileSuffix(fileName = '') {
  if (!fileName || typeof fileName !== 'string') {
    console.error('filename must be a string')
    return ''
  }
  const strNoArgsFileName = fileName.split('?').shift() || ''
  return (
    strNoArgsFileName.substring(strNoArgsFileName.lastIndexOf('.') + 1, strNoArgsFileName.length) || strNoArgsFileName
  )
}

export { getMinifyImageUrl, minifyImg, getFileName, getFileSuffix }
