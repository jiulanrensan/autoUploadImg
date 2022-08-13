// https://gist.github.com/leommoore/f9e57ba2aa4bf197ebc5 Magic Numbers
/**
 * 我们现在需要获取的是照片的魔数(Magic Number)，就是要读取二进制数据
 * 所以需要用到FileReader API 的 readAsArrayBuffer 读取，获取到的是一个blob文件类型
 * ArrayBuffer 对象用来表示通用的、固定长度的原始二进制数据缓冲区
 * 你不能直接操作 ArrayBuffer 的内容，所以需要TypeArray
 * new Uint8Array获取二进制数组，截取前n位(不同类型不同)，判断文件类型
 * 
 * 可以优化的点：
 * 
 * 我们只需要获取前n位二进制数据，但是却读取了整个图片到内存中，
 * input 输入框获取的文件是File类型，已知File接口是继承了Blob接口的，所以可以slice具体范围
 * 读取我们需要的部分的二进制数据
 * 可以通过查看memory，检查buffer变量的大小，很明显第二版的小了很多
 */

var buffer = null
/**
 * @desc 第一个版本，将整个文件读取到内存，然后类型化数组后，读取前几位的16进制数据
 * @param {File} source 
 */
function fileType1 (source) {
  // console.log(source instanceof Blob); true
  const reader = new FileReader()
  reader.onload = () => {
    // console.log('event', reader.result);
    buffer = new Uint8Array(reader.result);
    // console.log('buffer', buffer);
    // console.log('hexStr', hexStr);
    const hexArr = []
    for (let i = 0; i < 4; i++) {
      hexArr.push(buffer[i].toString(16))
    }
    const hexStr = hexArr.join('')
    console.log(hexStr);
  }
  reader.readAsArrayBuffer(source)
}

/**
 * 第二个版本，读取部分Buffer来判断魔数
 * @param {File} source 
 */
function fileType2 (source) {
  const reader = new FileReader()
  reader.onload = () => {
    buffer = new Uint8Array(reader.result);
    // console.log('buffer', buffer);
    let hexStr = ''
    for (let i = 0; i < 8; i++) {
      hexStr += buffer[i].toString(16)
    }
    console.log(hexStr);
  }
  reader.readAsArrayBuffer(source.slice(0, 8))
}


// 综上，可以写出一个图片类型校验方法

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

class GetImageType {
  constructor() {
  }
  /**
   * @desc 读取指定范围的Blob
   * @param {Blob} blob 
   * @param {number} start 
   * @param {number} end 
   * @returns { Promise<ArrayBuffer> }
   */
  readRangeBlob(blob, start = 0, end = 0) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(blob.slice(start, end))
    })
  }
  _binToHexStr(bin) {
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
      const result = await this.readRangeBlob(fileSource, 0, sliceLen)
      const hexBufferStr = this._binToHexStr(result)
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
   * @returns { Promise<{ isMatched: boolean, type: string }> }
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
