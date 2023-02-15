<template>
  <section>
    <div class="upload-container">
      <!-- 单个上传 -->
      <el-upload
        drag
        ref="upload"
        :http-request="customUploadFunc"
        action=""
        :show-file-list="false"
      >
        <i class="el-icon-upload"></i>
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
        <div class="el-upload__tip" slot="tip">{{ uploadTipText }}</div>
        <div class="el-upload__tip" slot="tip">注：png类型图片通过pngquant压缩；其余使用canvas压缩</div>
      </el-upload>
      <div class="mask" v-if="processing"></div>
    </div>
    <div class="history-container" v-if="historyList.length">
      <div class="history-title">
        <p>上传记录</p>
        <el-button type="text" @click="clearAllHistory">清空</el-button>
      </div>
      <div class="history-list">
        <div v-for="item in historyList" :key="item.imgUrl" class="history-item">
          <img :src="item.imgUrl" alt="" >
          <div class="history-item-info">
            <div>压缩前: {{item.beforeCompressed.size}}kb / {{item.beforeCompressed.type}}</div>
            <div>压缩后: {{item.afterCompressed.size}}kb / {{item.afterCompressed.type}}</div>
            <div>压缩时长: {{item.compressDuration}}ms</div>
            <el-button type="text" @click="copyLink(item.imgUrl)">复制链接</el-button>
            <div>
              <el-button size="mini" type="warning" @click="previewOrigin(item)">原图</el-button>
              <el-button size="mini" type="success" @click="preview(item)">上传前预览</el-button>
              <el-button size="mini" type="danger" @click="handleClickUpload(item)">{{ item.isUpload ? '重新上传' : '上传' }}</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
<script>
import { defualtTypeList } from '../../utils/getImageType'
import imageCompress from '../../utils/imageCompress'
import { uploadImg } from '../../utils/handleImage'
import { getCompressStatus } from '../message'
import uploadImgStore from '../../store/uploadImgStore'
import { genFileMd5 } from '../../utils/getFileMd5'
import { Message } from 'element-ui'
import { getFileSuffix } from '../../utils/file'

export default {
  name: "UploadCom",
  data () {
    return {
      uploadTipText: '',
      compressSwitch: true,
      // 是否开启自动上传
      autoUploadSwitch: false,
      processing: false, // 处理中：压缩+上传
      historyList: [],
      // 文件名对应的source
      sourceMap: []
    }
  },
  created () {
    this.setCompressConfig()
    this.genUploadTipText()
    this.refreshHistoryList()
  },
  methods: {
    clearAllHistory () {
      uploadImgStore.clearAll()
      this.refreshHistoryList()
    },
    refreshHistoryList (imgInfo) {
      if (imgInfo) uploadImgStore.storeImg(imgInfo)
      this.historyList = uploadImgStore.getImgList()
    },
    setCompressConfig () {
      const { compressSwitch } = getCompressStatus()
      this.compressSwitch = compressSwitch
      this.$EventBus.$on('changeSwitch', (bool) => {
        this.compressSwitch = bool
      })
      this.$EventBus.$on('autoUploadChangeSwitch', (bool) => {
        this.autoUploadSwitch = bool
      })
    },
    fileToArrayBufferAsync (file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsArrayBuffer(file)
      })
    },
    genUploadTipText () {
      this.uploadTipText = `只能上传 ${defualtTypeList.join('/')}类型文件~`
    },
    async compressFunc (file) {
      // console.log('file', file);
      const arrayBuffer = await this.fileToArrayBufferAsync(file)
      // 生成图片md5值
      const md5 = genFileMd5(arrayBuffer)
      // arrayBuffer => blob
      const blob = new Blob([new Uint8Array(arrayBuffer)])
      // console.log('compressSwitch', this.compressSwitch);
      if (!this.compressSwitch) {
        // 不压缩
        return {
          source: blob,
          imgHash: md5
        }
      }
      try {
        this.infoMessage('图片压缩中')
        const result = await imageCompress.compress(blob)
        return {
          ...result,
          imgHash: md5
        }
      } catch (error) {
        this.failMessage(error.toString())
        return {}
      }
    },
    async customUploadFunc (event) {
      // console.log('event', event);
      this.processing = true
      let {
        source, beforeCompressed = {}, afterCompressed = {}, compressDuration = 0, imgHash = ''
      } = await this.compressFunc(event.file)
      imgHash += '.' + getFileSuffix(event.file.name)
      console.log('imgHash', imgHash)
      if (!source) return
      // 读取配置 是否上传
      const isUpload = this.autoUploadSwitch
      isUpload && this.infoMessage('图片上传中')
      const { succ, desc, imgUrl, filename } = await uploadImg({ source, imgName: imgHash, isUpload })
      this.sourceMap.push({
        filename,
        source,
        beforeCompressed,
        afterCompressed,
        compressDuration,
        imgHash,
        sourceFile: URL.createObjectURL(event.file)
      })
      // 如果没有开启自动上传
      if (!isUpload) {
        this.refreshHistoryList({ beforeCompressed, afterCompressed, compressDuration, imgUrl, isUpload, filename })
      } else {
        // this.refreshHistoryList({ beforeCompressed, afterCompressed, compressDuration, imgUrl: '' })
        if (succ) {
          this.infoMessage('上传成功')
          this.refreshHistoryList({ beforeCompressed, afterCompressed, compressDuration, imgUrl, isUpload })
        } else {
          this.failMessage(`上传失败：${desc}`)
        }
      }
      this.processing = false
    },
    failMessage (errorInfo) {
      Message.closeAll()
      Message({
        type: 'error',
        showClose: true,
        duration: 0,
        message: errorInfo
      })
    },
    infoMessage (info) {
      Message.closeAll()
      Message({
        type: 'info',
        showClose: true,
        duration: 0,
        message: info
      })
    },
    async copyLink(imgUrl) {
      try {
        await navigator.clipboard.writeText(imgUrl);
        Message.closeAll()
        Message({
          type: 'success',
          message: `复制成功！`
        })
      } catch (error) {
        console.log("Fail to copy: ", error);
      }
    },
    /**
     * 点击手动上传
     * @param {Object} item 
     */
    async handleClickUpload(item) {
      const fileName = item.filename
      const objSource = this.sourceMap.find(map => map.filename === fileName)
      if (objSource && objSource.source) {
        this.infoMessage('图片上传中')
        const { succ, desc, imgUrl } = await uploadImg({ source: objSource.source, imgName: fileName, isUpload: true })
        if (succ) {
          this.infoMessage('上传成功')
          this.refreshHistoryList({ ...objSource, imgUrl, isUpload: true })
        } else {
          this.failMessage(`上传失败：${desc}`)
        }
      } else {
        this.infoMessage('图片已失效')
      }
    },
    /**
     * 压缩后图片预览按钮
     * @param {Object} item 
     */
    preview(item) {
      window.open(item.imgUrl, "_blank")
    },
    /**
     * 预览原图
     * @param {Object} item 
     */
    previewOrigin(item) {
      const fileName = item.filename;
      const objSource = this.sourceMap.find(map => map.filename === fileName);
      if (!objSource || !objSource.sourceFile) {
        this.infoMessage('图片已失效')
        return
      }
      window.open( objSource.sourceFile, "_blank")
    }
  }
};
</script>
<style scoped>
.upload-container{
  position: relative;
}
.compress-info{
  padding: 10px 0;
  font-size: 16px;
}
.image-copy{
  cursor: pointer;
}
.mask{
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 10;
}
.history-container{
  padding-top: 10px;
  font-size: 16px;
}
.history-title{
  display: flex;
  justify-content: space-between;
}
.history-list{
  padding: 10px 0;
}
.history-item{
  display: flex;
  align-items: center;
  padding: 5px 0;
}
.history-item-info{
  font-size: 12px;
  margin-left: 10px;
}
.history-item img{
  width: 100px;
  height: 100px;
  object-fit: contain;
}
</style>