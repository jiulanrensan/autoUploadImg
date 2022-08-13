# 这是一款拦截蓝湖切图并上传的chrome插件
> [github地址](https://github.com/jiulanrensan/autoUploadImg) 
>
> 技术栈: webpack+vue2.x

> 注： 上传图片的接口用的是公司的接口，所以不会放到这里，可以自己完善

## 使用方法
1. `npm run build`打包代码
2. 在Chrome浏览器点击更多工具=>扩展程序=>加载已解压的扩展程序=>选择打包好的dist文件，这样扩展就添加完成了。
3. 然后打开蓝湖，下载切图，就会自动拦截上传并展示图片链接。

![使用.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c68fa741549540d28be91412e6a9305d~tplv-k3u1fbpfcp-watermark.image)

# 前言
由于小程序项目中切图比较多，而小程序主包有2M的大小限制，所以不能一直把图片塞到项目文件里面，而公司有专门用来存放图片的资源服务器，我们就可以把切图上传到服务器，然后在小程序中通过图片的http链接进行访问。这样做的好处在于，一方面可以减少主包或分包体积，另一方面，图片加载过一次后，后面都会走http缓存

# 预备知识
## 1. Chrome Extension相关知识点
### `manifest.json`
配置文件，必须放在根目录下，完整配置[查看](https://developer.chrome.com/docs/extensions/mv3/manifest/)
```json
{
	// 清单文件的版本，这个必须写，而且必须是2
	"manifest_version": 2,
	// 插件的名称
	"name": "autoUploadImg",
	// 插件的版本
	"version": "1.0.0",
	// 图标，一般偷懒全部用一个尺寸的也没问题
	"icons": {
    "16": "static/images/upload.png",
    "48": "static/images/upload.png",
    "128": "static/images/upload.png"
  },
	// 会一直常驻的后台JS或后台页面
	"background":
	{
		// 2种指定方式，如果指定JS，那么会自动生成一个背景页
		"page": "background.html"
		//"scripts": ["js/background.js"]
	},
	// 浏览器右上角图标设置
	"browser_action": 
	{
		"default_icon": "static/images/upload.png",
		// 图标悬停时的标题，可选
		"default_title": "autoUploadImg"
	},
	// 需要直接注入页面的JS
	"content_scripts": 
	[
		{
			//"matches": ["http://*/*", "https://*/*"],
			// "<all_urls>" 表示匹配所有地址
			"matches": ["<all_urls>"],
			// 多个JS按顺序注入
			"js": ["contentScripts.js"],
			// JS的注入可以随便一点，但是CSS的注意就要千万小心了，因为一不小心就可能影响全局样式
			"css": ["css/custom.css"],
			// 代码注入的时间，可选值： "document_start", "document_end", or "document_idle"，最后一个表示页面空闲时，默认document_idle
			"run_at": "document_start"
		}
	],
	// 权限申请
	"permissions":
	[
		"contextMenus", // 右键菜单
		"tabs", // 标签
		"notifications", // 通知
		"webRequest", // web请求
		"webRequestBlocking",
		"storage", // 插件本地存储
		"http://*/*", // 可以通过executeScript或者insertCSS访问的网站
		"https://*/*" // 可以通过executeScript或者insertCSS访问的网站
	],
	// 普通页面能够直接访问的插件资源列表，如果不设置是无法直接访问的
	"web_accessible_resources": ["js/inject.js"],
	// 插件主页，这个很重要，不要浪费了这个免费广告位
	"homepage_url": "https://www.baidu.com",
	// 覆盖浏览器默认页面
	"chrome_url_overrides":
	{
		// 覆盖浏览器默认的新标签页
		"newtab": "newtab.html"
	},
	// Chrome40以前的插件配置页写法
	"options_page": "options.html",
	// Chrome40以后的插件配置页写法，如果2个都写，新版Chrome只认后面这一个
	"options_ui":
	{
		"page": "options.html",
		// 添加一些默认的样式，推荐使用
		"chrome_style": true
	}
}
```

### `content-scripts`
chrome插件向页面注入的脚本。不可以跨域
**content-scripts和原始页面共享DOM，但是不共享JS**，如要访问页面JS（例如某个JS变量），只能通过injected js来实现。content-scripts不能访问绝大部分chrome.xxx.api。但可以访问下面四种
```js
chrome.extension(getURL , inIncognitoContext , lastError , onRequest , sendRequest)

chrome.i18n

chrome.runtime(connect , getManifest , getURL , id , onConnect , onMessage , sendMessage)

chrome.storage
```

### `injected-script`
[Inject scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/#functionality)
通过官方文档可知，content-script可以分为`declared statically`(静态式声明)和`programmatically injected`(编程式注入)两种类型。上面所说的在`mainfest.json`声明的content-script就是静态式声明，在这里为了区分，把编程式注入称为injected-script

content-script有一个很大的“缺陷”，也就是无法访问页面中的JS，虽然它可以操作DOM，但是DOM却不能调用它，也就是无法在DOM中通过绑定事件的方式调用content-script中的代码（包括直接写onclick和addEventListener2种方式都不行）

在content-script中通过DOM方式向页面注入inject-script代码示例：
```js
// 向页面注入JS
function injectCustomJs(jsPath)
{
	jsPath = jsPath || 'js/inject.js';
	var temp = document.createElement('script');
	temp.setAttribute('type', 'text/javascript');
	// 获得的地址类似：chrome-extension://ihcokhadfjfchaeagdoclpnjdiokfakg/js/inject.js
	temp.src = chrome.extension.getURL(jsPath);
	temp.onload = function()
	{
		// 放在页面不好看，执行完后移除掉
		this.parentNode.removeChild(this);
	};
	document.head.appendChild(temp);
}
```
然后配置文件中增加声明
```json
{
	// 普通页面能够直接访问的插件资源列表，如果不设置是无法直接访问的
	"web_accessible_resources": ["js/inject.js"],
}
```

### `background`
是一个常驻的页面，它的生命周期是插件中所有类型页面中最长的，它随着浏览器的打开而打开，随着浏览器的关闭而关闭，所以通常把需要一直运行的、启动就运行的、全局的代码放在background里面。可以跨域。每个插件都有独立的background，互不影响。

### `popup`
这是点击浏览器插件图标弹出的一个小窗口网页。
popup可以包含任意你想要的HTML内容，并且会自适应大小。
可以通过default_popup字段来指定popup页面。
可以跨域
```json
{
	"browser_action":
	{
		"default_icon": "img/icon.png",
		// 图标悬停时的标题，可选
		"default_title": "这是一个示例Chrome插件",
		"default_popup": "popup.html"
	}
}
```
popup中可以直接通过chrome.extension.getBackgroundPage()获取background的window对象


### 消息通信
[官方文档](https://developer.chrome.com/extensions/messaging)
即插件中的各种js之间的通信

-- | content-script | popup-js | background-js
-- | -- | -- | -- |
content-script | -- | chrome.runtime.sendMessage chrome.runtime.connect | chrome.runtime.sendMessage chrome.runtime.connect
popup-js | chrome.tabs.sendMessage chrome.tabs.connect | -- | chrome.extension. getBackgroundPage()
background-js | chrome.tabs.sendMessage chrome.tabs.connect | chrome.extension.getViews | --

### 长连接和短连接
Chrome插件中有2种通信方式，一个是短连接（`chrome.tabs.sendMessage`和`chrome.runtime.sendMessage`），一个是长连接（`chrome.tabs.connect`和`chrome.runtime.connect`）

长连接类似WebSocket会一直建立连接，双方可以随时互发消息

## 2. 魔数(Magic Numbers)
用特定的16进制数据表示文件类型，魔数都会在开头几位，不同的文件类型有不同的魔数。

vscode有一款插件`hexDump`，可以用来查看图片的Magic Numbers。我们平时区分图片类型，用的都是尾缀名，这其实是不准确的，因为尾缀名可以随时更改，且不影响打开查看。`<input>`控件虽然有设定接受文件类型，但只能根据尾缀名限定。之前有过一次在微信小程序真机上图片不展示的问题，后来排查的原因是，虽然拿到的图片尾缀名是png，但查看魔数，却是webp类型，而ios上对webp会有兼容问题，就是不展示。

![微信截图_20210816165527.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/cbd9fc6455c943f596ec6929d62d1b01~tplv-k3u1fbpfcp-watermark.image)

## 3. Blob和ArrayBuffer
关于Blob和ArrayBuffer，这篇文章讲得他们之间的关系讲得很清楚

> [聊聊JS的二进制家族：Blob、ArrayBuffer和Buffer](https://zhuanlan.zhihu.com/p/97768916)

![blob-arrayBuffer.jpg](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fe941e425e414b37bb47e592f8fc40b5~tplv-k3u1fbpfcp-watermark.image)

## 4. 获取图片类型
我们现在需要通过获取照片的魔数(Magic Number)，就是要读取二进制数据来判断图片类型
所以需要用到FileReader API 的 readAsArrayBuffer 读取
ArrayBuffer 对象用来表示通用的、固定长度的原始二进制数据缓冲区（个人理解就是放在内存中的数据）
你不能直接操作 ArrayBuffer 的内容，所以需要TypeArray
```js
var buffer = null
/**
 * @desc 将文件读取到内存，然后类型化数组后，读取前几位的16进制数据
 * @param {File} source 
 */
function fileType (source) {
  // 传入的sourcr是File类型，File类型继承于Blob
  // console.log(source instanceof Blob); true
  const reader = new FileReader()
  reader.onload = () => {
    // 这个时候result是二进制数据的数组
    // console.log('event', reader.result);
    // 用TypeArray对二进制数据进行读取
    buffer = new Uint8Array(reader.result);
    const hexArr = []
    // 只取前4个bit
    for (let i = 0; i < 4; i++) {
      // 二进制转成16进制
      hexArr.push(buffer[i].toString(16))
    }
    const hexStr = hexArr.join('')
    console.log(hexStr);
  }
  // 读取到内存中
  reader.readAsArrayBuffer(source)
}
```

## 5. 图片压缩
前端的图片压缩主要是依据canvas的两个api

[HTMLCanvasElement.toBlob()](https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLCanvasElement/toBlob)

[HTMLCanvasElement.toDataURL()](https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLCanvasElement/toDataURL)

各种类型的转换关系
![canvasAPI.jpg](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9278f8fbc8044d8c83ac4ef1091b9399~tplv-k3u1fbpfcp-watermark.image)


由文档可知，有一个 encoderOptions 参数，当请求图片格式为image/jpeg或者image/webp时用来指定图片展示质量。
就是通过这个参数进行了图片的压缩。
对于jpg图片，我们对比压缩前后的图片像素，其实是没有变化的，可以理解为照片没有发生裁剪，浏览器底层用压缩算法对图片进行了处理

如果要求转换后的图片是png格式，那这个参数就不一定生效，
实际通过试验证明确实如此，有时候导出的png图片还可能变大。
然后发现，蓝湖上的png原图和通过蓝湖压缩过的png图对比，后者长宽像素是前者的一半，
所以我认为蓝湖是通过裁剪png图片达到压缩的效果
由前文可知我们只会输入三种图片类型：jpeg,png,gif。 因此我们区分图片类型：
1. gif图不走压缩流程
2. 转成png => 通过裁剪压缩
3. 转成jpeg => 通过encoderOptions参数压缩


压缩流程: File/Blob => dataURL => Image Object => 利用canvas绘制 => canvas.toBlob/canvas.toDataURL
```js
// 主要代码
/**
 * 默认配置
 */
 const defaultOptions = {
  // 压缩质量
  quality: 0.5,
  // 输出图片时的类型
  mimeType: 'image/jpeg',
  // 默认不是png
  isPNG: false
}

class ImageCompress {
  /**
   * 
   * @param {File|Blob} source 需要压缩的源对象
   */
   constructor () {
    this.source = null
    this.options = defaultOptions
    this.canvas = null
    this.blob = null
    this.isPNG = this.options.isPNG
  }
  async compress (source, options = {}) {
    this.source = source
    // 合并选项
    Object.assign(this.options, options)
    // 压缩前信息
    console.log(`压缩前大小： ${this.source.size/1000}`,`压缩前类型： ${this.source.type}`);
    this._inspectParams()
    // 输出框传入的是File类型
    try {
      // 将所以回调类型的方法都转成 await 形式
      const dataURL = await this._fileToDataURLAsync(this.source)
      const image = await this._dataURLToImageASync(dataURL)
      const canvas = await this._imageToCanvasAsync(image)
      const blob = await this._canvasToBlobAsync(canvas)
      console.log(`压缩后大小： ${blob.size/1000}`, `压缩后类型： ${blob.type}`);
      // 有可能压缩后比原来还大了，所以需要判断下前后大小
      console.log('blob.size', blob.size, 'this.source.size', this.source.size);
      return blob.size > this.source.size ? this.source : blob
    } catch (error) {
      console.log('compress error:', error);
      return false
    }
  }
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
    if (this.isPNG) {
      // 用quality作为长宽裁剪系数
      clipRatio = this.options.quality
    }
    // 设定画布宽高
    canvas.width = naturalWidth*clipRatio
    canvas.height = naturalHeight*clipRatio
    
    // png转jpeg时，画布背景默认为黑色
    // 画布背景直接填充为白色
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    // 画到画布上
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas
  }
  _canvasToBlobAsync (canvas) {
    const { mimeType, quality } = this.options
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => resolve(blob), mimeType, quality)
    })
    
  }
  // ...
}
```


# 思路
首先打开蓝湖，随便找一张切图，打开开发者工具的network，点击下载切图按钮

![screenshot1.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4f1c375d35d246428e20e96f4224da5b~tplv-k3u1fbpfcp-watermark.image)

可以看到访问了一个链接，preview显示的就是我们刚刚下载的图，我们把这个链接复制到浏览器上访问，直接下载了一个文件


![screenshot2.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f56c7d334f5b4611aac649160b574929~tplv-k3u1fbpfcp-watermark.image)
这里对比一下两个文件属性图，左图是直接点击下载按钮下载的图片，是一个png格式。右图没有后缀名，我们用vscode的hexdump插件查看一下文件的16进制数据


![screenshot3.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bc6e31dc4f3541f3beb895e77e58a109~tplv-k3u1fbpfcp-watermark.image)

原来还是png文件，我们给他添加一下后缀名，就能正常打开了。

还有一个细节，左图的大小是比右图小的，说明是蓝湖在下载图片之后，才进行了压缩，而不是直接下载压缩后的图片。

所以我们需要做的是拦截这个图片请求，我们翻找一下chrome extension的文档，看到有个相关的api: [chrome.webRequest](https://developer.chrome.com/docs/extensions/reference/webRequest/)

> Use the chrome.webRequest API to observe and analyze traffic and to intercept, block, or modify requests in-flight.

我们要做的就是通过`chrome.webRequest`提供的api去拦截图片请求，然后将获得的图片数据用canvas进行压缩，这里可以做一个判断，如果压缩后的图片小于10kb，那还是直接下载到本地，大于10kb就上传到资源服务器(这里的10kb可以自己根据项目定义)，上传成功会在页面右侧出现弹窗，提供预览图和http链接

还要考虑一种情况，如果ui直接丢了一张大图过来说要换，那插件就需要再提供一个上传图片的功能

# 开干

## 项目构造
我们知道chrome插件大体分为三个部分:
* content-scripts 不可跨域
* popup 可跨域
* background 可跨域

还有就是一份配置文件和静态资源文件。所以需要有三个出口文件，相当于输出一个多页面应用，我们结合vue2.x技术栈，利用webpack做定制。

大致目录如下：
```shell
├── package-lock.json
├── package.json
├── readme.md
├── src
|  ├── background
|  ├── contentScripts
|  ├── manifest.json
|  ├── popup
|  └── utils
├── static
|  └── images
└── webpack.config.js
```
## webpack.config.js
我们需要把src里面三个部分的代码编译到一个文件里面去，所以会有三个入口
```js
const path = require('path')
// vue-loder 编译vue文件
const VueLoaderPlugin = require('vue-loader/lib/plugin')
// 清理构建目录下的文件
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
// 复制plugin
const CopyWebpackPlugin = require('copy-webpack-plugin');

// webpack-cli命令：
// --progress 打印出编译进度的百分比值 
// https://webpack.docschina.org/api/cli
// --watch, -w 监听文件系统的变化


module.exports = {
    mode: 'development', // 默认为 production
    entry: {
            'background': path.resolve(__dirname, `./src/background/index.js`),
            'popup': path.resolve(__dirname, `./src/popup/index.js`),
            'contentScripts': path.resolve(__dirname, `./src/contentScripts/index.js`)
    },
    output: {
            filename: '[name].js', //文件名
            path: path.resolve(__dirname, `./dist/`), //路径
            // https://webpack.docschina.org/configuration/output/#outputpublicpath
            publicPath: './' //script 引入路径
    },
    resolve: {
            //引入路径时不用写对应的后缀名
            extensions: ['.js', '.vue'],
            alias: {
                    //用@直接指引到src目录下
                    '@': path.resolve(__dirname, './src'),
            }
    },
    // https://webpack.docschina.org/configuration/watch/
    // 监听文件变化，当它们修改后会重新编译
    // 这样不用每次都npm run build
    watchOptions: {
            aggregateTimeout: 800,
            poll: 1000,
            ignored: [
                    '**/node_modules',
                    '**/docs'
            ]
    },
    // https://stackoverflow.com/questions/48047150/chrome-extension-compiled-by-webpack-throws-unsafe-eval-error
    // 默认为evel，用eval的方式，chrome认为不安全，会导致引入扩展失败
    // 也不想要map文件，所以直接置空
    devtool: '', 
    module: {
            rules: [
                    {
                            test: /\.vue$/,
                            //vue-loader 编译vue模块
                            use: 'vue-loader'
                    },
                    {
                            test: /\.js$/,
                            exclude: /node_modules/,
                            use: {
                                    loader: 'babel-loader'
                            }
                    },
                    {
                            test: /\.css$/,
                            // 顺序是从右往左
                            use: [
                                    'style-loader',
                                    'css-loader',
                            ]
                    },
                    {
                            test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
                            loader: "url-loader",
                            options: {
                                    limit: 10000
                            }
                    }
            ]
    },
    plugins: [
            new CleanWebpackPlugin(),
            new VueLoaderPlugin(),  //vue-loader插件开启
            // 把一些文件直接复制到固定位置
            new CopyWebpackPlugin([
                    { from: path.resolve(__dirname, './src/popup/popup.html'), to: '' },
                    { from: path.resolve(__dirname, './src/manifest.json'), to: '' },
                    { from: path.resolve(__dirname, './static/'), to: './static/' }
            ], { copyUnmodified: true })
    ]
}

```
## package.json
```json
"scripts": {
    "watch": "webpack --progress --w --mode=development",
    "build": "webpack --progress"
},
```
## background 部分
- [x] 通过API拦截请求，给 background 发送拦截的请求(webRequest API只能在background访问)
- [x] 根据请求api获取图片资源
- [ ] 获取文件类型，进行压缩
- [ ] 上传/下载

通过[onBeforeRequest](https://developer.chrome.com/docs/extensions/reference/webRequest/#examples)拦截网页发出的所有请求，只有命中匹配规则的url才会被捕获到，`onBeforeRequestCallback`回调函数需要返回一个值，只有在`return {cancel: true}`时这个请求才会被禁止掉
```js
// 拦截蓝湖网站页面的下载图片请求
chrome.webRequest.onBeforeRequest.addListener(
  onBeforeRequestCallback,
  { 
    // 匹配规则
    urls: ["https://alipic.lanhuapp.com/*?noCache=true"] 
  },
  ["blocking"]
);
```
```js
function onBeforeRequestCallback (details) {
  // url就是图片下载的链接
  // tabId表示网页标识
  const { url, tabId } = details
  // ...
  return { cancel: cancelVariable };
}
```
然后用axios下载图片，这里略过异常和loading的处理，设置返回格式为blob，Blob对象有一个属性size，根据我们设定的最小上传大小(例如10kb)，我们可以直接判断当前图片是应该直接下载还是上传。
```js
// 获取图片...
await axios({
  url,
  method: 'get',
  responseType: 'blob' // 返回blob类型
})
```
1. 图片大于预设的大小，走压缩上传
压缩图片的流程前文有说。压缩之后，利用公司提供的接口，直接上传
```js
// 压缩之后返回的也是一个Blob类型对象
async uploadImg (imageBlob) {
    // 把二进制数据添加到FormData对象
    const formData = new FormData()
    formData.append('file', imageBlob)
    try {
      const { data } = await axios({
        method: 'post',
        url: this.uploadImgApi,
        headers: {
          "Content-Type": "multipart/form-data"
        },
        data: formData
      })
      const { groupName, filePath } = data.data
      return `${this.picUrl}/${groupName}/${filePath}`
    } catch (error) {
      console.log('error', error);
      return false
    }
  }
```
拿到图片链接，background由`chrome.tabs.sendMessage`向content-script发送数据

2. 然后是图片小于预设大小
blob类型不能直接用`chrome.tabs.sendMessage`传递，需要转成字符串形式(base64)
```js
// 示例代码
async function fileToDataURLAsync (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
if (imgBlob.size < minSizeToUpload) {
  // 小于则不压缩不上传，直接传给content-script
  // blob数据不能直接传递
  // 通过fileReader接口转成base64
  const base64Str = await fileToDataURLAsync(imgBlob)
  sendMessage(tabId, {
    status: 'success',
    body: base64Str,
    bodyType: 'base64',
    message: ''
  })
  return
}
```


## content-scripts 部分
- [x] 右侧弹窗展示预览图与访问链接，有删除按钮

### 下载图片
前面说到会传递一个base64字符串过来，我们需要在网页里直接下载。
```js
downloadWithLink (str) {
  console.log('str', str);
  const link = document.createElement("a");
  link.href = str
  link.download = 'download.png';
  link.click();
  link.remove();
}
```

### 手动挂载
content-script部分我们可以把他当成是一个H5，因为是插入页面中且与页面共享DOM。
平时vue项目开发，一般有一个预设好的id等于app的节点，然后vue指定这个id进行挂载，这里因为是插入到页面中，所以我们选择手动挂载
```js
// src/contentScript.js
import Vue from 'vue'
import App from './App.vue'
// 手动挂载
const MyComponent = Vue.extend(App)
const component = new MyComponent().$mount()
window.onload = () => {
  const body = document.getElementsByTagName('body')[0]
  body.appendChild(component.$el)
}
```

然后就是普通的页面开发，具体见项目仓库

## popup 部分 todo
- [ ] 属性设置页：是否拦截，是否压缩，图片超过多少大小才上传，展示个数等
- [ ] 图片上传页

## 优化
### 1. 获取图片类型
上文获取图片类型时用`reader.readAsArrayBuffer`读取文件，这个操作是没问题的，但是如果图片过大，api直接读取所有数据到内存中，就有可能直接浏览器崩溃(当然很少会上传这么大的图片)。这个和node的`fs.readFile`很像，一下子读取过多的数据就会内存泄漏，所以node提供了Stream进行流读取。既然浏览器提供了操作内存数据的api，那就有必要关注下内存。

读取到的source是File类型，File类型继承于Blob类型，Blob有一个slice方法来读取数据，和数组上的slice方法一样，并不是对原始数据进行操作，而是复制一部分出来。那么我们只需要在`readAsArrayBuffer`前，先截取数据。
```js
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
```

### 2. content-script即时更新
> 这部分代码放在v1分支
开发content-script部分时，很麻烦的一件事就是更新了代码之后，网页要刷新一遍，因为我们在`manifest.json`定义了content-script的注入时机，就是在document加载完成之后注入，只有当document重新加载时才会注入新的代码。我们希望在更新扩展的时候，以及打开、刷新网页时更新content-script。声明式的content-script满足不了这个要求，我们前文说过content-script还包含了一种`programmatically injected`(编程式注入)，就是inject-script，需要用`chrome.tabs.executeScript`这个api注入inject-script，这样就加载就可控了。


第一步，加载或更新扩展，background.js会重新加载
```js
// background.js
// 该API会获取当前打开所有网页的信息
chrome.tabs.query({}, (tabList) => {
  if (!Array.isArray(tabList)) return
  // 筛选当前打开的蓝湖网页
  const openingPages = tabList.filter(tab => tab.url.includes(blockingDomain))
  openingPages.forEach(page => injectFile(page))
});

// 提前声明好要注入的文件
const injectScripts = ['contentScripts.js']

function injectFile (page) {
  injectScripts.forEach(script => {
    chrome.tabs.executeScript(page.id, {
      file: `${script}`,
      runAt: 'document_idle' // 表示在dom加载之后的空闲时
    }, () => {
      console.log('injectFile', chrome.runtime.lastError);
    })
  })
}
```
第二步，网页刷新或打开时注入inject-script

[参考这个回答: how to inject script immediately after page reload?](https://stackoverflow.com/questions/42151342/google-chrome-extension-how-to-inject-script-immediately-after-page-reload/42151795#42151795)

background 可以利用这个[chrome.webNavigation.onCommitted](https://developer.chrome.com/docs/extensions/reference/webNavigation/#event-onCommitted)api，在dom已经存在的时候，触发回调
```js
chrome.webNavigation.onCommitted.addListener((page) => {
  // 只监听蓝湖的域名
  if (!page.url.includes(blockingDomain)) return
  injectFile(page)
});
```
第三步，我们即时向网页注入了脚本，但注入前网页可能还保留着之前脚本生成的dom，那我们肯定也还要把之前的dom销毁掉
```js
// 找到生成的dom节点，remove
const uploadDom = document.getElementById('upload')
document.body.removeChild(uploadDom)
```
但是我们怎么知道什么时候应该销毁dom呢，网页刷新或加载，这种情况是不需要考虑的，只需要考虑第一步的扩展重载。

通过搜索，这篇[文章](https://segmentfault.com/a/1190000023673558)提供了一个非常酷的方法。background与content-script可以建立长连接`connect`，只有在扩展卸载或者重载的时候才会中断长连接，这个时候可以会触发`onDisconnect`回调，在回调里销毁dom即可
```js
const connectObj = chrome.runtime.connect();
connectObj.onDisconnect.addListener(() => {
	const uploadDom = document.getElementById('upload')
	console.log('__remove contentScripts__');
	document.body.removeChild(uploadDom)
});
```

### 3. png图片压缩，待优化
透明背景png经过canvas压缩会变黑


## 踩坑
1. https://stackoverflow.com/questions/53236412/chrome-extension-with-webpack-style-loader-couldnt-find-a-style-target
2. https://stackoverflow.com/questions/48047150/chrome-extension-compiled-by-webpack-throws-unsafe-eval-error
3. https://stackoverflow.com/questions/33650262/chrome-webrequest-onbeforerequest-addlistener-cannot-read-property-onbeforerequ
4. 资源文件路径不正确


# 参考
- [1] [Chrome插件开发全攻略](https://github.com/sxei/chrome-plugin-demo) 

- [2] [chrome extension官方文档](https://developer.chrome.com/docs/extensions/)

- [3] [Chrome 扩展 | 如何即时更新内容脚本](https://segmentfault.com/a/1190000023673558)