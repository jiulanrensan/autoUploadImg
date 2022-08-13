// 默认校验类型
export const defualtTypeList = ['jpeg', 'jpg', 'jfif', 'png', 'gif']
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
      const result = await this.readRangeBlob(fileSource, 0, sliceLen)
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
   * @returns { Promise<{ isMatched: boolean, type: string }> }
   */
  async isMatchedType(fileSource, matchTypeList = defualtTypeList) {
    if (!Array.isArray(matchTypeList)) {
      console.error(`${matchTypeList} isn't Array`);
      return false
    }
    let sliceLen = matchTypeList.reduce((acc, cur) => {
      const curLen = magicNumberMap[cur.toLocaleLowerCase()].length
      return acc > curLen ? acc : curLen
    }, 0)
    const hexStr = await this._getHexStr({ fileSource, sliceLen })
    if (!hexStr) return 
    const matched = matchTypeList.find(matchType => hexStr.includes(magicNumberMap[matchType.toLowerCase()].join('')))
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

export default new GetImageType()