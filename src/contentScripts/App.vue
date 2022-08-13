<template>
  <div id="upload" class="upload-box">
    <notificationList :newImgInfo="imgInfo" :showNum="showNum"></notificationList>
  </div>
</template>
<script>
import notificationList from './pages/notificationList'
import { onMessageFn } from '../utils/messageWrapper'
import { Message } from 'element-ui';
export default {
  name: 'upload',
  data () {
    return {
      showNum: 3,
      imgInfo: {},
      messageReceiverPromise: null
    }
  },
  components: {
    notificationList
  },
  mounted() {
    onMessageFn({ 
      succReceiver: this.succReceiver, 
      failReceiver: this.failReceiver, 
      processReceiver: this.processReceiver
    })
  },
  methods: {
    succReceiver ({ desc, source, beforeCompressed, afterCompressed, compressDuration }) {
      Message.closeAll()
      // 返回两种：base64编码、http url
      const isHttpUrl = source.includes('http')
      if (!isHttpUrl) {
        // base64
        this.downloadWithLink(source)
        return
      }
      // http url
      this.imgInfo = {
        imgUrl: source,
        beforeCompressed,
        afterCompressed,
        compressDuration,
        key: new Date().getTime()
      }
    },
    failReceiver ({ desc }) {
      Message.closeAll()
      Message({
        type: 'error',
        showClose: true,
        duration: 0,
        message: `${desc}`
      })
    },
    processReceiver ({ desc }) {
      Message.closeAll()
      Message({
        type: 'info',
        showClose: true,
        duration: 0,
        message: `${desc}`
      })
    },
    downloadWithLink (str) {
      console.log('str', str);
      const link = document.createElement("a");
      link.href = str
      link.download = 'download.png';
      link.click();
      link.remove();
    }
    
  },
}
</script>
<style scoped>
  .upload-box{
    position: fixed;
    right: 0;
    top: 0;
    z-index: 1000;
  }
</style>