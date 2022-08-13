<template>
  <section class="notification-list">
    <div class="clear-all-box">
      <div class="clear-all" @click="clearAll" v-if="imgList.length">全部清除</div>
    </div>
    <div class="imglist-box">
      <transition-group name="imgItem" tag="div">
        <div v-for="item in imgList" class="imglist-item" :key="item.key">
          <div class="imglist-item-info">
            <p>压缩前类型：{{item.beforeCompressed.type}}，压缩前大小：{{item.beforeCompressed.size}}kb</p>
            <p>压缩后类型：{{item.afterCompressed.type}}，压缩后大小：{{item.afterCompressed.size}}kb</p>
            <p>压缩时长：{{item.compressDuration}}ms</p>
          </div>
          <div class="imglist-item-img-box">
            <img :src="item.imgUrl" alt="" />
          </div>
          <div class="imglist-item-copy" @click="copyLink(item.imgUrl)">复制链接</div>
          <div class="del" @click="removeCurrent(item.key)">
            <!-- todo ttf加载时直接用蓝湖域名了 -->
            <!-- <i class="el-icon-close"></i> -->
            <!-- todo web_accessible_resources有声明，但获取本地图片还是报错 -->
            <!-- <img :src="closeImageUrl" alt=""> -->
            <img :src="closeBase64" alt="">
          </div>
        </div>
      </transition-group>
    </div>
  </section>
</template>
<script>
const closeBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAMAAAAM7l6QAAAAAXNSR0IArs4c6QAAAGZQTFRFAAAA////////////5ubm4+Pj5eXl5OTk4+Pj5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk4+Pj5OTk5eXl5ubm5+fn6Ojo7u7u7+/v9fX19vb29/f3+Pj4+fn5+vr6+/v7/Pz8////2bHJyQAAABF0Uk5TAAECCDxTdoWLjKi/2eLp8vMV5RiGAAAA7ElEQVQoz4WT1xaDIAyGcVdFa3Bv8v4vWVwR2nr4b/DkiyELxi65fpzyouBp7LvsW16YAykPPZMGGRjKAg06Efwocogm8EfJxSP4q+i8Fx603+9lTzjb8g+P76avyd41xxmqbpz1digvPmB/1u8yH8goq+0U4+3os5hCjrgqLqabQsxSwgqspZh3p1Mp43emCi0GBc4KMDgupWYoDFwuiLPQDG89eLXivBica6ltVJQrTkJLjQqr5Q6U00j4RW1RdNx/qyQOQG25mtqTUTm21FQaSUsh6/4eiW2glnWwLZNtFS2LbHsG1kf09AQ/r7kydbUeHWYAAAAASUVORK5CYII='
import { Message } from 'element-ui';
export default {
  data() {
    return {
      imgList: [],
      closeBase64
    };
  },
  props: {
    showNum: {
      type: Number,
      default: 3,
    },
    newImgInfo: {
      type: Object,
      default: {},
    },
  },
  computed: {
  },
  watch: {
    newImgInfo(newV) {
      this.addImage(newV);
    },
  },
  methods: {
    /**
     * @param {object} newImgInfo
     * @param {string} newImgInfo.imgUrl
     * @param {object} newImgInfo.beforeCompressed
     * @param {object} newImgInfo.afterCompressed
     * @param {number} newImgInfo.compressDuration
     * @param {number} newImgInfo.key
     */
    addImage(newImgInfo) {
      if (!Object.keys(newImgInfo).length) return;
      if (this.imgList.length === this.showNum) {
        const sliceList = this.imgList.slice(0, -1);
        sliceList.unshift(newImgInfo);
        this.imgList = sliceList;
      } else {
        this.imgList.unshift(newImgInfo);
      }
    },
    clearAll () {
      this.imgList = []
    },
    removeCurrent (key) {
      const idx = this.imgList.findIndex(el => el.key === key)
      this.imgList.splice(idx, 1)
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
  },
};
</script>
<style scoped>
.imglist-item {
  position: relative;
  padding: 30px 20px 10px;
  border-radius: 4px;
  margin-bottom: 10px;
  box-shadow: 0 0 4px 1px rgba(0, 0, 0, 0.1);
  background: #fff;
  transition: all 0.5s;
}
.imglist-item-copy {
  cursor: pointer;
  /* text-align: center; */
}
.imglist-item-img-box {
  margin: 10px 0;
}
.imglist-item-img-box img {
  width: 100px;
}
.imglist-item .del{
  position: absolute;
  right: 4px;
  top: 4px;
}
.imglist-item .del img{
  width: 20px;
}
.clear-all-box {
  display: flex;
  justify-content: flex-end;
}
.clear-all {
  width: 80px;
  margin-bottom: 10px;
  text-align: center;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 0 4px 1px rgb(0 0 0 / 10%);
}
.clear-all:hover {
  box-shadow: 0 0 4px 1px rgba(0, 0, 0, 0.1);
}
/* transition-group */
.imgItem-enter-active {
  transition: all 0.5s;
}
.imgItem-leave-active {
  transition: all 0.5s;
  position: absolute;
}
.imgItem-enter,
.imgItem-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>