const path = require('path')
// vue-loder 编译vue文件
const VueLoaderPlugin = require('vue-loader/lib/plugin')
// 构建html文件
// const HtmlWebpackPlugin = require('html-webpack-plugin')
// 清理构建目录下的文件
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
// 复制plugin
const CopyWebpackPlugin = require('copy-webpack-plugin');

// webpack-cli命令：
// --progress 打印出编译进度的百分比值 
// https://webpack.docschina.org/api/cli
// --watch, -w 监听文件系统的变化


module.exports = {
	mode: 'production', // 默认为 production
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
	devtool: '', // 默认为evel，用eval的方式，chrome认为不安全
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
			{ from: path.resolve(__dirname, './static/'), to: './static/' },
			// 复制wasm到dist目录
			{ from: path.resolve(__dirname, './src/lib/imagequant.wasm'), to: '' },
			{ from: path.resolve(__dirname, './src/lib/squoosh_oxipng_bg.wasm'), to: '' },
			{ from: path.resolve(__dirname, './src/lib/squoosh_resize_bg.wasm'), to: '' },
		], { copyUnmodified: true })
	]
}
