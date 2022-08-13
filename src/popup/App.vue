<template>
  <section class="app">
    <el-tabs v-model="currentTabIdx" @tab-click="changeTab">
      <el-tab-pane label="上传图片" name="0">
        <UploadCom/>
      </el-tab-pane>
      <el-tab-pane label="参数设置" name="1">
        <SettingCom/>
      </el-tab-pane>
    </el-tabs>
  </section>
</template>
<script>
import UploadCom from './component/UploadCom.vue'
import SettingCom from './component/SettingCom.vue'
export default {
  components: {
    SettingCom,
    UploadCom
  },
  data () {
    return {
      currentTabIdx: '0'
    }
  },
  methods: {
    changeTab (tab, event) {
      // console.log(tab, event);
    }
  }
}
</script>
<style scoped>
.app{
  padding: 5px 20px 20px;
  transition: all 0.6s;
  width: 360px;
}
</style>