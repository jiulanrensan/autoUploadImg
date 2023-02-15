// canvas压缩图片
// 二进制数据 => image

import axios from 'axios'
// import privateUpload from './privateUpload'
import privateUpload from './privateCosUpload'

/**
 * 
 * @param {String} url 
 * @returns {Blob}
 */
export async function downloadImg (url) {
  try {
    // download需要做异常处理
    const res = await axios({
      url,
      method: 'get',
      responseType: 'blob' // 返回blob类型
    })
    // console.log('res', res);
    // return this.uploadImg(res.data)
    return res.data

  } catch (error) {
    console.log('error',error);
  }
}

/**
 * @param {object} param0
 * @param {Blob} param0.source
 * @param {string} param0.imgName 
 * @returns { { succ: boolean, desc: string | undefined, imgUrl: string } }
 */
export async function uploadImg ({ source, imgName, isUpload }) {
  const res = await privateUpload.uploadImg({ source, imgName, isUpload })
  if (res && res.isUpload) {
    // 提示消息
    return {
      succ: res.isUpload && res.fileUrl,
      desc: res.fileUrl,
      filename: imgName,
      source: source,
      fileUrl: res.fileUrl,
      isUpload: true,
      imgUrl: res.fileUrl
    }
  }
  return {
    succ: false,
    filename: imgName,
    source: source,
    fileUrl: res.fileUrl,
    isUpload: false,
    imgUrl: URL.createObjectURL(source)
  }
}