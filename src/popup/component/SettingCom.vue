<template>
  <section class="popup">
    <div class="popup_switch">
      <p>开启压缩：</p>
      <el-switch v-model="compressSwitch" :disabled="configDisabled" @change="changeSwitch">
      </el-switch>
    </div>
    <div class="popup_ratio">
      <p>选择一倍图或二倍图（只用于拦截图片下载时设置）</p>
      <el-radio :disabled="compressIsClosed || configDisabled" v-model="compressRatio" label="1" @change="changeRatio">一倍图</el-radio>
      <el-radio :disabled="compressIsClosed || configDisabled" v-model="compressRatio" label="2" @change="changeRatio">二倍图</el-radio>
    </div>
    <div class="popup_quality">
      <p>图像质量</p>
      <el-slider :disabled="compressIsClosed || configDisabled" v-model="compressQuality" show-stops :max="2" :format-tooltip="formatTooltip" @change="changeQuality"></el-slider>
    </div>
  </section>
</template>
<script>
import { getCompressStatus, changeCompressSwitch, changeCompressRatio, changeCompressQuality } from '../message'
export default {
  name: 'SettingCom',
  data () {
    return {
      compressSwitch: true,
      compressRatio: '2',
      compressQuality: 0,
      configDisabled: false,
      compressIsClosed: false
    }
  },
  created () {
    const { compressing, compressRatio, compressQuality, compressSwitch } = getCompressStatus()
    this.configDisabled = compressing
    this.compressSwitch = compressSwitch
    this.compressRatio = compressRatio
    this.compressQuality = compressQuality
  },
  methods: {
    formatTooltip(val) {
      const qualityList = ['低', '中', '高']
      return qualityList[Number(val)]
    },
    changeSwitch (val) {
      console.log('compressSwitch', val);
      this.compressIsClosed = !val
      changeCompressSwitch(val)
      this.$EventBus.$emit('changeSwitch', val)
    },
    changeRatio (val) {
      console.log('changeRatio', val);
      changeCompressRatio(val)
    },
    changeQuality (val) {
      console.log('changeQuality', val);
      changeCompressQuality(Number(val))
    }
  },
}
</script>

<style scoped>
  section.popup{
    width: 360px;
    padding: 20px;
  }
  .popup_switch,
  .popup_ratio,
  .popup_quality{
    margin-bottom: 5px;
  }
</style>