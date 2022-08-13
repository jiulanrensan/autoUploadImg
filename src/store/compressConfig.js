
const COMPRESS_IS_CLOSED = false
const COMPRESS_IS_OPENED = true
const COMPRESS_RATIO_ONE = '1'
const COMPRESS_RATIO_TWO = '2'

// 一倍图对应原尺寸的一半，二倍图对应原尺寸
const COMPRESS_RATIO_MAP = {
  [COMPRESS_RATIO_ONE]: 0.5,
  [COMPRESS_RATIO_TWO]: 1
}

class CompressConfig {
  constructor () {
    this.compressSwitch = COMPRESS_IS_OPENED
    this.compressRatio = COMPRESS_RATIO_MAP[COMPRESS_RATIO_TWO]
    this.compressQuality = 0
    this.compressing = false
  }
  /**
   * 
   * @param {boolean} bool 
   */
  changeCompressSwitch (bool) {
    this.compressSwitch = bool
    // console.log('this.compressSwitch', this.compressSwitch);
  }
  /**
   * 
   * @param {string} val '1' | '2'
   */
  changeCompressRatio (val) {
    if (![COMPRESS_RATIO_ONE, COMPRESS_RATIO_TWO].includes(val)) throw new Error('changeCompressRatio error: val 值不合法')
    this.compressRatio = COMPRESS_RATIO_MAP[val]
    // console.log('this.compressRatio', this.compressRatio);
  }

  /**
   * 
   * @param {number} val 0 | 1 | 2
   */
  changeCompressQuality (val) {
    if (![0, 1, 2].includes(val)) throw new Error('changeCompressQuality error: val 值不合法')
    this.compressQuality = val
    // console.log('this.compressQuality', this.compressQuality);
  }
  /**
   * 
   * @param {boolean} bool 
   */
  toggleCompressStatus (bool) {
    this.compressing = bool
  }
  /**
   * 
   * @returns { { compressSwitch: boolean, compressing: boolean, compressRatio: '1' | '2', compressQuality: 0 | 1 | 2 } }
   */
  getCompressConfigFromPopup () {
    const { compressSwitch, compressing, compressRatio, compressQuality } = this
    return { 
      compressSwitch, 
      compressing,
      compressRatio: ({ '0.5': '1', '1': '2' })[compressRatio],
      compressQuality: compressQuality
    }
  }

  /**
   * 
   * @returns { { compressQuality: 0 | 1 | 2, compressRatio: 0.5 | 1, compressSwitch: boolean, compressing: boolean } }
   */
  getCompressConfigFromBg () {
    const { compressRatio, compressQuality, compressSwitch, compressing } = this
    return { compressRatio, compressQuality, compressing, compressSwitch }
  }
}

const compressConfig = window.compressConfig = new CompressConfig()

export default compressConfig