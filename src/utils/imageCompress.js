
/**
 * png图片在用canvas绘制时，透明背景会变成黑色。所以使用webAssembly
 * 参考 https://github.com/GoogleChromeLabs/squoosh
 */
import compressConfig from '../store/compressConfig'
import getImageType from './getImageType'
import initResizeWasm, { resize as wasmResize } from '../lib/squoosh_resize.js';
import imagequant from '../lib/imagequant.js';
import { init as oixPngInit, optimise as oxiPngOptimise } from '../lib/squoosh_oxipng.js';

// 这里对应 quantize 方法的 maxNumberColors 数值
const COMPRESS_PNG_QUALITY_LIST = [64,128,256]
// canvas压缩系数
const COMPRESS_CANVAS_QUALITY_LIST = [0.3, 0.6, 0.9]

let wasmModule = null
let resizeWasmModuleIsInit = false
async function initWasm () {
  if (wasmModule) return wasmModule
  const [ imagequantWasmModule, oxiPngWasmModule ] = await Promise.all([
    imagequant({ noInitialRun: true }),
    oixPngInit()
  ])
  return {
    imagequantWasmModule,
    oxiPngWasmModule
  }
};

/**
 * @desc 目前压缩是同类型输入输出
 */
class ImageCompress {
  /**
   * 
   * @param {File|Blob|HTMLImageElement} source 需要压缩的源对象
   */
   constructor () {
    this.source = null
    this.options = {
      compressQuality: 0,
      compressRatio: 1,
      outputMimeType: 'png'
    }
    this.canvas = null
    this.blob = null
  }
  /**
   * @desc 读取指定范围的Blob
   * @param {file} file 
   * @param {number} start 
   * @param {number} end 
   * @returns { Promise<ArrayBuffer> }
   */
  readRangeBlob(file, start = 0, end) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error)
      const blob = file.slice.apply(file, [...arguments].slice(1))
      reader.readAsArrayBuffer(blob)
    })
  }

  /**
   * 
   * @param {Blob} blob 
   * @returns { Promise<ImageData> }
   */
  async getImageDataFromBlob (blob) {
    const src = URL.createObjectURL(blob)
    const img = document.createElement('img');
    img.src = src;
    await new Promise((resolve) => (img.onload = (ev) => {
      resolve()
    }));
    const canvas = document.createElement('canvas');
    [canvas.width, canvas.height] = [img.width, img.height];
    // Draw image onto canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height);
  }

  /**
   * 
   * @param {object} param0 
   * @param {ImageData} param0.imageData
   * @param {number} param0.maxNumberColors
   * @param {number} param.dithering 
   * @returns { ImageData }
   */
  quantizeCompress ({ imageData, maxNumberColors = 128, dithering = 1 }) {
    console.time('imagequant');
    
    const rawImage = wasmModule.imagequantWasmModule.quantize(
      imageData.data,
      imageData.width,
      imageData.height,
      maxNumberColors,
      dithering,
    );
    console.timeEnd('imagequant')
    console.log('imagequant done');

    const compressedImageData = new ImageData(
      new Uint8ClampedArray(rawImage.buffer),
      imageData.width,
      imageData.height,
    );
    return compressedImageData
  }
  
  /**
   * 
   * @param {object} param0
   * @param {ImageData} param0.imageData
   * @param {string} param0.type
   * @param {number} param0.quality 
   * @returns {Promise<Blob>}
   */
  async canvasEncodeToBlob({ imageData, type, quality }) {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw Error('Canvas not initialized');
    ctx.putImageData(imageData, 0, 0);

    let blob = await new Promise((r) =>
        canvas.toBlob(r, type, quality),
      )

    if (!blob) throw Error('Encoding failed');
    return blob;
  }

  /**
   * 
   * @param {object} param0 
   * @param {ArrayBuffer} param0.arrayBuffer
   * @param {number} param0.level
   * @param {boolean} param0.interlace
   * @returns { Promise<ArrayBuffer> }
   */
  async oxiPngCompress ({ arrayBuffer, level = 3, interlace = false }) {
    console.time('squoosh_oxipng');
    const compressedArrayBuffer = await oxiPngOptimise(new Uint8Array(arrayBuffer), level, interlace).buffer
    console.timeEnd('squoosh_oxipng');
    console.log('squoosh_oxipng done');
    return compressedArrayBuffer
  }

  /**
   * 
   * @param {Blob} source 
   * @returns { { source: Blob, beforeCompressed: { size: number, type: string }, afterCompressed: { size: number, type: string } } }
   */
  async compress (source) {
    this.source = source
    let beforeCompressedInfo = {}
    let afterCompressedInfo = {}
    const { compressRatio, compressQuality } = compressConfig.getCompressConfigFromBg()

    // 获取图片类型
    const imageTypeInfo = await getImageType.isMatchedType(this.source)
    if (!imageTypeInfo) {
      throw new Error('图片上传类型不符合')
    }
    const { isMatched, type: imageType } = imageTypeInfo

    Object.assign(this.options, {
      compressQuality,
      compressRatio,
      outputMimeType: imageType
    })

    // 压缩前信息
    console.log(`压缩前大小： ${this.source.size/1000}`,`压缩前类型： ${imageType}`);
    beforeCompressedInfo = {
      size: this.source.size/1000,
      type: imageType
    }

    let returnBlob = null
    let compressBegin = new Date().getTime()
    // png压缩
    if (imageType === 'png') {
      const compressedBlob = await this._compressPng()
      if (!compressedBlob) throw new Error('compress compressedBlob不能为空')
      console.log('compressedBlob', compressedBlob);
      returnBlob = compressedBlob
      afterCompressedInfo = {
        size: compressedBlob.size/1000,
        type: 'png'
      }
    } else {
      // 通过canvas压缩
      const compressedBlob = await this._compressByCanvas()
      if (!compressedBlob) throw new Error('compress compressedBlob不能为空')
      returnBlob = compressedBlob
      afterCompressedInfo = {
        size: compressedBlob.size/1000,
        type: compressedBlob.type
      }
    }
    let compressDuration = (new Date().getTime() - compressBegin)
    return {
      source: returnBlob,
      beforeCompressed: beforeCompressedInfo,
      afterCompressed: afterCompressedInfo,
      compressDuration
    }
  }

  async _compressPng () {
    try {
      wasmModule = await initWasm();
      let image = await this.getImageDataFromBlob(this.source)
      
      // 一倍图需要压缩
      const { compressRatio, compressQuality } = this.options
      if (compressRatio === 0.5) {
        image = await this.resizePng({ imageData: image, compressRatio })
      } 

      const maxNumberColors = COMPRESS_PNG_QUALITY_LIST[compressQuality]
      const imageData = this.quantizeCompress({ imageData: image, maxNumberColors })
      const pngBlob = await this.canvasEncodeToBlob( { imageData, type: 'image/png' })
      const pngBuffer = await pngBlob.arrayBuffer()
      const compressedArrayBuffer = await this.oxiPngCompress({ arrayBuffer: pngBuffer })
      const compressedBlob = new Blob([compressedArrayBuffer], { type: 'image/png' })

      console.log(`压缩后大小： ${compressedBlob.size/1000}`, `压缩后类型： png`);
      return compressedBlob
    } catch (error) {
      console.log('_compressPng error', error);
      return 
    }
  }

  /**
   * @desc 默认下载的就是二倍图，如果选择了一倍图，就要改变尺寸。此时再加载wasm
   * @param {object} param0 
   * @param {ImageData} param0.imageData
   * @param {number} param0.compressRatio
   * @returns { ImageData }
   */
  async resizePng ({ imageData, compressRatio }) {
    console.time('wasmResize');
    if (!resizeWasmModuleIsInit) {
      await initResizeWasm()
      resizeWasmModuleIsInit = true
    }
    // 参数参考 squoosh: codes/resize/pkg/squoosh_resize.js
    const compressW = imageData.width*compressRatio
    const compressH = imageData.height*compressRatio
    const result = wasmResize(
      new Uint8Array(imageData.data.buffer),
      imageData.width,
      imageData.height,
      compressW,
      compressH,
      3,
      true,
      true,
    );
    console.timeEnd('wasmResize')
    console.log('wasmResize done');
    return new ImageData(
      new Uint8ClampedArray(result.buffer),
      compressW,
      compressH,
    );
  }

  async _compressByCanvas () {
    try {
      const dataURL = await this._fileToDataURLAsync(this.source)
      const image = await this._dataURLToImageASync(dataURL)
      const canvas = await this._imageToCanvasAsync(image)
      const blob = await this._canvasToBlobAsync(canvas)
      // 有可能压缩后比原来还大了，所以需要判断下前后大小
      // console.log('blob.size', blob.size, 'this.source.size', this.source.size);
      let returnBlob = null
      if (blob.size > this.source.size) {
        returnBlob = this.source
        console.log(`压缩后大小： ${returnBlob.size/1000}`, `压缩后类型： ${returnBlob.type}`);
        return returnBlob
      }
      console.log(`压缩后大小： ${blob.size/1000}`, `压缩后类型： ${blob.type}`);
      return blob
    } catch (error) {
      console.log('_compressByCanvas error:', error);
      return
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
    const { compressRatio } = this.options
    // 设定画布宽高
    canvas.width = naturalWidth*compressRatio
    canvas.height = naturalHeight*compressRatio
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    // 画到画布上
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas
  }
  _canvasToBlobAsync (canvas) {
    const { outputMimeType, compressQuality } = this.options
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => resolve(blob), `image/${outputMimeType}`, COMPRESS_CANVAS_QUALITY_LIST[compressQuality])
    })
    
  }
  /**
   * 判断类型：[Object Blob]
   * @param {Any} v 
   * @returns 
   */
  _toStringType (v) {
    let type = Object.prototype.toString.call(v)
    return type.slice(8, -1)
  }
  _throwError (err) {
    throw new Error(err)
  }
  _warn (warning) {
    console.warn(warning);
  }
  _isImage (string) {
    return /^image\/.+/.test(string)
  }
}

export default new ImageCompress()