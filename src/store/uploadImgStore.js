/**
 * @desc 将图片缓存在本地，最多只存十张，超过十张按照fifo顺序淘汰
 */

const MAX_LENGTH = 10
const STORE_KEY = 'IMG_LIST'

class UploadImgStore {
  constructor(maxLength = MAX_LENGTH) {
    this.maxLength = maxLength
    this.storeKey = STORE_KEY
  }
  /**
   * @desc 获取列表
   * @returns { Array<string> }
   */
  getImgList () {
    return JSON.parse(localStorage.getItem(this.storeKey) || '[]')
  }
  storeImg (imgInfo) {
    // 队头在右边，队尾在左边
    const list = this.getImgList()
    const fileName = imgInfo.fileName
    const fileIndex = (list || []).findIndex(item => item.fileName === fileName)
    if (fileIndex > -1) {
      list.splice(fileIndex, 1)
    } else if (list.length === 10) {
      list.pop()
    }
    list.unshift(imgInfo)
    localStorage.setItem(this.storeKey, JSON.stringify(list))
  }
  clearAll() {
    localStorage.clear(this.storeKey)
  }
}
const uploadImgStore = new UploadImgStore()
export default uploadImgStore