
/************************************** */

// 默认校验类型
const defualtTypeList = ['jpeg', 'jpg', 'jfif', 'png', 'gif']
// 默认校验的类型的魔数
const magicNumberMap = {
  'jpeg': ['ff', 'd8', 'ff'],
  'jpg': ['ff', 'd8', 'ff'],
  'jfif': ['ff', 'd8', 'ff'],
  'png': ['89', '50', '4e', '47'],
  'gif': ['47', '49', '46', '38']
}

/**
 * @desc 读取指定范围的Blob
 * @param {file} file 
 * @param {number} start 
 * @param {number} end 
 * @returns { Promise<ArrayBuffer> }
 */
function readRangeBlob(file, start = 0, end) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    const blob = file.slice.apply(file, [...arguments].slice(1))
    reader.readAsArrayBuffer(blob)
  })
}

class GetImageType {
  constructor() {
  }
  
  _blobToHexStr(bin) {
    // 二进制的数据 
    const binBuffer = new Uint8Array(bin);
    // 转成16进制的数据的字符串形式
    let hexBufferStr = ''
    for (let i = 0; i < binBuffer.length; i++) {
      hexBufferStr += binBuffer[i].toString(16)
    }
    return hexBufferStr
  }
  async _getHexStr({ fileSource, sliceLen }) {
    try {
      const result = await readRangeBlob(fileSource, 0, sliceLen)
      const hexBufferStr = this._blobToHexStr(result)
      return hexBufferStr
    } catch (error) {
      console.log('_getHexStr', error);
      return
    }
  }
  /**
   * 
   * @param {Blob} fileSource 
   * @param {Array<string>} matchTypeList 
   * @returns { { isMatched: boolean, type: string } }
   */
  async isMatchedType(fileSource, matchTypeList = defualtTypeList) {
    if (!Array.isArray(matchTypeList)) {
      console.error(`${matchTypeList} isn't Array`);
      return false
    }
    let sliceLen = 0
    matchTypeList.forEach(el => {
      const len = magicNumberMap[el.toLowerCase()].length
      if (len > sliceLen) sliceLen = len
    })
    const hexStr = await this._getHexStr({ fileSource, sliceLen })
    const matched = matchTypeList.find(matchType => magicNumberMap[matchType.toLowerCase()].join('').includes(hexStr))
    return {
      isMatched: !!matched,
      type: matched
    }
  }
  async isGIF(fileSource) {
    const gifHexMagicNum = magicNumberMap['gif']
    const sliceLen = gifHexMagicNum.length
    const hexStr = await this._getHexStr({ fileSource, sliceLen })
    if (!hexStr) return false
    return gifHexMagicNum.join('').includes(hexStr)
  }
  async isPNG(fileSource) {
    const pngHexMagicNum = magicNumberMap['png']
    const sliceLen = pngHexMagicNum.length
    const hexStr = await this._getHexStr({ fileSource, sliceLen })
    if (!hexStr) return false
    return pngHexMagicNum.join('').includes(hexStr)
  }
}

const getImageType = new GetImageType()
/**
 * 默认配置
 */
 const defaultOptions = {
  // 压缩质量
  compressQuality: 0.4,
  // 输出图片时的类型,默认是png
  outputMimeType: 'image/png'
}

class ImageCompress {
  /**
   * 
   * @param {File|Blob|HTMLImageElement} source 需要压缩的源对象
   */
   constructor () {
    this.source = null
    this.options = defaultOptions
    this.canvas = null
    this.blob = null
    // this.exportType = ''
    // // 压缩后导出类型
    // this.exportTypes = ['blob', 'dataurl']
    // 传入的类型
    this.importTypes = ['File', 'Blob', 'HTMLImageElement']
  }
  /**
   * 
   * @param {Blob} source 
   * @param {object} options 
   * @returns { { source: Blob, beforeCompressed: { size: number, type: string }, afterCompressed: { size: number, type: string } } }
   */
  async compress (source, options = {}) {
    this.source = source
    let beforeCompressedInfo = {}
    let afterCompressedInfo = {}
    // 合并选项
    Object.assign(this.options, options)
    // 压缩前信息
    console.log(`压缩前大小： ${this.source.size/1000}`,`压缩前类型： ${this.source.type}`);
    beforeCompressedInfo = {
      size: this.source.size/1000,
      type: this.source.type
    }
    this._inspectParams()
    // 输出框传入的是File类型
    const isPNG = await this._isPNG(this.source)
    if (isPNG) {
      const compressQuality = this.options.compressQuality*100
      const compressOptions = {
        quality: `${compressQuality}-${compressQuality}`,
        speed: '5'
      }
      const blob = await readRangeBlob(this.source)
      const unit8 = new Uint8Array(blob);
      const result = pngquant(unit8, compressOptions, (info) => console.log('pngquantInfo', info))
      const compressedBlob = new Blob([result.data])
      afterCompressedInfo = {
        size: compressedBlob.size/1000,
        type: 'png'
      }
      return {
        source: compressedBlob,
        beforeCompressed: beforeCompressedInfo,
        afterCompressed: afterCompressedInfo
      }
    }
    try {
      const dataURL = await this._fileToDataURLAsync(this.source)
      const image = await this._dataURLToImageASync(dataURL)
      const canvas = await this._imageToCanvasAsync(image)
      const blob = await this._canvasToBlobAsync(canvas)
      // 有可能压缩后比原来还大了，所以需要判断下前后大小
      console.log('blob.size', blob.size, 'this.source.size', this.source.size);
      let returnBlob = null
      if (blob.size > this.source.size) {
        returnBlob = this.source
      }
      console.log(`压缩后大小： ${returnBlob.size/1000}`, `压缩后类型： ${returnBlob.type}`);
      afterCompressedInfo = {
        size: returnBlob.size/1000,
        type: returnBlob.type
      }
      return {
        source: returnBlob,
        beforeCompressed: beforeCompressedInfo,
        afterCompressed: afterCompressedInfo
      }
    } catch (error) {
      console.log('compress error:', error);
      return
    }
  }

  async _isPNG (fileSource) {
    const imageTypeInfo = await getImageType.isMatchedType(fileSource)
    if (!imageTypeInfo) return false
    const { isMatched, type } = imageTypeInfo
    return isMatched
  }

  _compressPng () {}
  /**
   * @desc 获取dataURL
   * @param {File} file 
   * @returns {Promise}
   */
  _fileToDataURLAsync (file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }
  _dataURLToImageASync (dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.src = dataUrl
      image.onload = () => resolve(image)
      image.onerror = reject
    })
  }
  _imageToCanvasAsync (image) {
    // 这里绘制canvas时，canvas画布宽度取原图原始宽高
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    // naturalWidth,naturalHeight是图片自带的属性，不能修改
    const { naturalWidth, naturalHeight } = image
    // png进行裁剪压缩，jpeg进行quality压缩
    let clipRatio = 1
    // if (this.isPNG) {
    //   // 用quality作为长宽裁剪系数
    //   clipRatio = this.options.compressQuality
    // }
    // 设定画布宽高
    canvas.width = naturalWidth*clipRatio
    canvas.height = naturalHeight*clipRatio
    
    // png转jpeg时，画布背景默认为黑色
    // 画布背景直接填充为白色
    // ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    // 画到画布上
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas
  }
  _canvasToBlobAsync (canvas) {
    const { outputMimeType, compressQuality } = this.options
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => resolve(blob), outputMimeType, compressQuality)
    })
    
  }
  /**
   * 检查传参
   */
  _inspectParams () {
    const { compressQuality, outputMimeType } = this.options
    if (this._toStringType(compressQuality) !== 'Number') {
      this._warn(`compressQuality should be a number`)
      Object.assign(this.options, { compressQuality: 0.5 })
    } else {
      if (compressQuality <= 0 || compressQuality > 1) {
        this._warn(`compressQuality should be between less than 1 and greater than 0`)
        Object.assign(this.options, { compressQuality: 0.5 })
      }
    }
    if (this._toStringType(outputMimeType) !== 'String') {
      this._throwError(`outputMimeType should be a string`)
    } else {
      if (!this._isImage(outputMimeType)) {
        this._throwError(`outputMimeType should be a string like 'image/jpeg'`)
      }
    }
  }
  /**
   * 判断类型：[Object Blob]
   * @param {Any} v 
   * @returns 
   */
  _toStringType (v) {
    let type = Object.prototype.toString.call(v)
    return type.slice(8, -1)
  }
  _throwError (err) {
    throw new Error(err)
  }
  _warn (warning) {
    console.warn(warning);
  }
  _isImage (string) {
    return /^image\/.+/.test(string)
  }
}
const imageCompress = new ImageCompress()
// export default new ImageCompress()