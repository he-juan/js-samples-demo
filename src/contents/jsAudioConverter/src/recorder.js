/* eslint-disable default-case */

let AudioContext = window.AudioContext || window.webkitAudioContext
// Constructor
window.Recorder = function (config, data) {
  if (!Recorder.isRecordingSupported()) {
    console.error('AudioContext or WebAssembly is not supported')
    return
  }
  if (!config) {
    config = {}
  }

  this.config = Object.assign({
    // 通用配置
    bufferLength: 4096,                 // scriptProcessorNode 用于捕获音频的缓冲区的长度。默认为4096.
    mediaTrackConstraints: true,        // 指定媒体轨道约束的对象。默认为true.
    monitorGain: 0,                     // 设置监控输出的增益。增益是一个介于 0 和 1 之间的加权值。默认为 0
    numberOfChannels: 1,                // 要记录的通道数。 1 = 单声道，2 = 立体声。默认为 1。最多支持 2 个通道。
    recordingGain: 1,                   // 设置录音输入的增益。增益是一个介于 0 和 1 之间的加权值。默认为 1
    reuseWorker: false,
    workerPath: '',                     // worker 加载路径
    encoderType: '',                    // 转换类型：ogg / wav

    // 编码器的配置选项
    encoderApplication: 2049,
    encoderFrameSize: 20,                // 以毫秒为单位指定用于编码的帧大小。默认为 20
    desiredSampleRate: 8000,             // wav转换时期望的采样率。默认为8000. 支持的值为8000、12000、16000、24000、48000
    originalSampleRateOverride: 16000,   // Ogg转换时期望的采样率。默认为16000. 支持的值为8000、12000、16000、24000、48000
    maxFramesPerPage: 40,                // 在生成页面之前要收集的最大帧数。这可用于降低流式传输延迟。值越低，流产生的开销就越大。默认为 40。
    resampleQuality: 9,                  // 用于确定延迟和重采样处理。0速度最快，质量最低。10速度最慢，质量最高。默认为3

    // Wave的配置选项
    bitsPerSample: 16,                   // 采样位深。默认为16. 支持的值为8, 16, 24 and 32 bits
  }, config)
  console.log('Recorder config: ', JSON.stringify(this.config, null, '    '))

  this.state = 'inactive'
  this.recording = false
  this.fileName = null
  this.audioContext = null
  this.recoderOptions = data
  this.stream = null
  this.recordingDuration = data.recordingDuration || 30   // 指定录制时长，默认最大30秒
  this.fadeOutEnabled = data.audioFadeOut === undefined ? true : data.audioFadeOut
  this.fadeOutBeenSet = false            // 是否设置渐弱 已设置
  this.gainFadeOutTime = this.recordingDuration * 0.25            // 音频渐弱时间
  this.recorderStopHandler = null     // 停止record的回调处理函数
}


Recorder.ERROR_MESSAGE = {
  ERROR_CODE_1001: {
    responseCode: 'INVALID_PARAMETER', // 无效参数
    message: 'Invalid parameter'
  },
  ERROR_CODE_1002: {
    responseCode: 'AUDIOCONTEXT_NOT_SUPPORTED', // AudioContext 接口不支持
    message: 'AudioContext is not supported !'
  },
  ERROR_CODE_1003: {
    responseCode: 'WEBASSEMBLY_NOT_SUPPORTED', // WebAssembly 接口不支持
    message: 'WebAssembly not supported !'
  },
  ERROR_CODE_1004: {
    responseCode: 'FILE_OVERSIZE', // 上传文件超过限制
    message: 'File size requirement does not exceed 9M !'
  },
  ERROR_CODE_1005: {
    responseCode: 'MIN_TIME_NOT_SATISFIED', // 上传文件最短时长不满足要求：不低于3秒
    message: 'File playing time does not reach the required minimum (3 second)'
  },
  ERROR_CODE_1006: {
    responseCode: 'ONLY_AUDIO_SUPPORTED', // 格式错误：只支持上传音频文件
    message: 'Only audio is supported!'
  },
  ERROR_CODE_1007: {
    responseCode: 'BROWSER_CONVERSION_NOT_SUPPORTED', // 当前浏览器不支持音频转换：比如safari
    message: 'Audio conversion is not supported in current browser!'
  },
  ERROR_CODE_1008: {
    responseCode: 'FORMAT_CONVERSION_ERROR', // 音频格式转换失败， .mid和部分 .wma 文件等无法正常转码
    message: 'CONVERSION ERROR: unable to decode audio data!'
  },
  // 其他未知错误
  ERROR_CODE_1009: function (error) {
    return {
      responseCode: 'UNKNOWN_ERROR',
      message: 'CONVERSION ERROR: ' + error || 'unknown error'
    }
  }
}

// Static Methods
Recorder.isRecordingSupported = function () {
  return AudioContext && window.WebAssembly
}

// Instance Methods
Recorder.prototype.clearStream = function () {
  if (this.stream) {
    if (this.stream.getTracks) {
      this.stream.getTracks().forEach(function (track) {
        track.stop()
      })
    } else {
      this.stream.stop()
    }

    delete this.stream
  }

  if (this.audioContext && this.closeAudioContext) {
    this.audioContext.close()
    delete this.audioContext
  }
}

/**
 * 设置或更新目标录制时长
 * @param duration
 */
Recorder.prototype.setRecordingDuration = function (duration){
  if(!duration){
    return
  }

  this.recordingDuration = duration
  this.gainFadeOutTime = this.recordingDuration * 0.25
  console.log('set recording duration, ' + duration)
}

Recorder.prototype.setRecordingGain = function (gain) {
  this.config.recordingGain = gain

  if (this.recordingGainNode && this.audioContext) {
    this.recordingGainNode.gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.01)
  }
}

Recorder.prototype.setMonitorGain = function (gain) {
  this.config.monitorGain = gain

  if (this.monitorGainNode && this.audioContext) {
    this.monitorGainNode.gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.01)
  }
}

/**
 * 声音渐弱处理
 */
Recorder.prototype.setRecordingGainFadeOut = function (timeLeft){
  console.log('set recording gain fade out, time left ' + timeLeft)
  if (this.recordingGainNode && this.audioContext) {
    this.recordingGainNode.gain.setValueAtTime(1, this.audioContext.currentTime)

    // 1.值的逐渐指数变化。更改从为上一个事件指定的时间开始，然后按照指数上升到 value 参数中给定的新值，并在 endTime 参数中给定的时间达到新值。
    // this.recordingGainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + timeLeft)

    // 2.值的逐渐线性变化。更改从为上一个事件指定的时间开始，然后线性增加到 value 参数中给定的新值，并在 endTime 参数中给定的时间达到新值。
    this.recordingGainNode.gain.linearRampToValueAtTime(0.01, this.audioContext.currentTime + timeLeft)
  }
}

/**
 * 记录onaudioprocess获取到的buffer数据
 * @param inputBuffer
 */
Recorder.prototype.encodeBuffers = function (inputBuffer){
  if (this.state === 'recording') {
    let buffers = []
    for (let i = 0; i < inputBuffer.numberOfChannels; i++) {
      buffers.push(inputBuffer.getChannelData(i))
    }

    this.worker.postMessage({
      command: 'encode',
      buffers: buffers
    })
  }
}

Recorder.prototype.initAudioContext = function (sourceNode){
  if (sourceNode && sourceNode.context){
    this.audioContext = sourceNode.context
    this.closeAudioContext = false
  }else {
    this.audioContext = new AudioContext()
    this.closeAudioContext = true
  }
  return this.audioContext
}

Recorder.prototype.initAudioGraph = function (){
  let This = this
  // First buffer can contain old data. Don't encode it.
  this.encodeBuffers = function () {
    delete this.encodeBuffers
  }
  <!--创建声音的缓存节点，createScriptProcessor方法的第二个和第三个参数指的是输入和输出都是声道数，第一个参数缓存大小，一般数值为1024,2048,4096，这里选用4096-->
  this.scriptProcessorNode = this.audioContext.createScriptProcessor(this.config.bufferLength, this.config.numberOfChannels, this.config.numberOfChannels)
  this.scriptProcessorNode.connect(this.audioContext.destination)
  // 此方法音频缓存，这里通过encodeBuffers方法进行缓存
  let audioprocessCount = 0
  let audioprocessDuration = 0
  let audioprocessTotalDuration = 0

  this.scriptProcessorNode.onaudioprocess = function (e) {
    if (!This.recording){
      console.warn('onaudioprocess recording false!!')
      return
    }
    if(!audioprocessDuration){
      audioprocessDuration = e.inputBuffer.duration
      console.log('get onaudioprocess trigger duration: ' + audioprocessDuration)
    }
    audioprocessCount++
    This.encodeBuffers(e.inputBuffer)

    audioprocessTotalDuration = audioprocessCount * audioprocessDuration
    let timeLeft = This.recordingDuration - audioprocessTotalDuration
    if (timeLeft > 0) {
      if(This.recorderStopHandler){
        This.recorderStopHandler({ state: 'running', totalDuration: audioprocessTotalDuration })
      }

      if (This.fadeOutEnabled && !This.fadeOutBeenSet && (timeLeft <= This.gainFadeOutTime || This.fadeOutTime)) {
        console.warn('set audio fade out')
        if(This.fadeOutTime){
          // onaudioprocess 每次触发时的时长间隔 * 剩余触发时间
          timeLeft = audioprocessDuration * This.remainingTimes
          console.log('audioprocessTotalDuration:', audioprocessTotalDuration)
          console.log('This.remainingTimes:', This.remainingTimes)
          console.log('timeLeft:', timeLeft)
        }

        This.setRecordingGainFadeOut(timeLeft)
        This.fadeOutBeenSet = true
      }
    } else {
      console.log('process count: ', audioprocessCount)
      console.log('audio process total duration: ', audioprocessTotalDuration)
      if(This.recorderStopHandler){
        This.recorderStopHandler({ state: 'stop' })
      }
    }
  }

  this.monitorGainNode = this.audioContext.createGain()
  this.setMonitorGain(this.config.monitorGain)
  this.monitorGainNode.connect(this.audioContext.destination)

  this.recordingGainNode = this.audioContext.createGain()
  this.setRecordingGain(this.config.recordingGain)
  this.recordingGainNode.connect(this.scriptProcessorNode)
}

Recorder.prototype.initSourceNode = function (sourceNode){
  if (sourceNode && sourceNode.context) {
    return window.Promise.resolve(sourceNode)
  }
  return null
}

Recorder.prototype.loadWorker = function () {
  if (!this.worker) {
    this.worker = new Worker(this.config.workerPath)
  }
}

Recorder.prototype.initWorker = function (){
  let This = this
  this.recordedPages = []
  this.totalLength = 0
  this.loadWorker()

  return new Promise((resolve, reject) => {
    let callback = (e) => {
      switch (e.data.message){
        case 'ready':
          console.log('worker ready!')
          resolve({message: e.data.message})
          break
        case 'wasmFetchError':
          console.error('Wasm file Fetch error, reason: ', e.data.reason)
          reject(e.data.reason)
          break
        case 'page':
          this.storePage(e['data']['page'])
          break
        case 'done':
          this.worker.removeEventListener('message', callback)
          This.finish(e.data.data)
          break
        case 'fadeOutTime':
          This.fadeOutTime = true
          This.remainingTimes = e.data.remainingTimes
          break
        case 'fileExceedsLimit':
          if(This.recorderStopHandler){
            This.recorderStopHandler({ state: 'stop', fileExceedsLimit: true})
          }
          break
        default:
          console.warn('worker e.data.command:', e.data.message)
          break
      }
    }

    this.worker.addEventListener('message', callback)
    this.worker.postMessage(Object.assign({
      command: 'init',
      originalSampleRate: this.audioContext.sampleRate,
      wavSampleRate: this.audioContext.sampleRate,
      fileSizeLimit: true   // 是否限制转换后的文件大小
    }, this.config))
  })
}

Recorder.prototype.init = function (sourceNode, recorderStopHandler, callback){
  let This = this
  if (this.state === 'inactive') {
    this.recording = true
    this.state = 'recording'
    this.recorderStopHandler = recorderStopHandler
    this.initAudioContext(sourceNode)

    return Promise.all([this.initSourceNode(sourceNode), this.initWorker()]).then((results) => {
      if (!results[0]) {
        This.recoderOptions && This.recoderOptions.errorCallBack(Recorder.ERROR_MESSAGE.ERROR_CODE_1008)
        return
      }
      callback && callback()
      this.sourceNode = results[0]

      // TODO: readAsArrayBuffer onload 后再start获取据，否则音频一两秒可能存在空白
      // this.initAudioGraph()
      // this.onstart()
      // this.worker.postMessage({ command: 'getHeaderPages' })
      // this.sourceNode.connect(this.monitorGainNode)
      // this.sourceNode.connect(this.recordingGainNode)
    }).catch(function (error){
      if (This.recoderOptions && This.recoderOptions.errorCallBack) {
        This.recoderOptions.errorCallBack(Recorder.ERROR_MESSAGE.ERROR_CODE_1009(error))
      }
    })
  }
}

Recorder.prototype.start = function (){
  let This = this
  try {
    this.initAudioGraph()
    this.onstart()
    this.worker.postMessage({ command: 'getHeaderPages' })
    this.sourceNode.connect(this.monitorGainNode)
    this.sourceNode.connect(this.recordingGainNode)
  }catch (error){
    if (This.recoderOptions && This.recoderOptions.errorCallBack) {
      This.recoderOptions.errorCallBack(Recorder.ERROR_MESSAGE.ERROR_CODE_1009(error))
    }
  }
}

Recorder.prototype.stop = function (){
  let This = this
  if (this.state !== 'inactive') {
    this.state = 'inactive'
    this.recording = false
    this.monitorGainNode && this.monitorGainNode.disconnect()
    this.scriptProcessorNode && this.scriptProcessorNode.disconnect()
    this.recordingGainNode && this.recordingGainNode.disconnect()
    this.sourceNode && this.sourceNode.disconnect()
    this.clearStream()

    let worker = this.worker
    if (worker) {
      return new Promise((resolve) => {
        let callback = (e) => {
          if (e['data']['message'] === 'done') {
            worker.removeEventListener('message', callback)
            resolve()
          }
        }
        worker.addEventListener('message', callback)
        worker.postMessage({ command: 'done' })
        if (!this.config.reuseWorker) {
          worker.postMessage({ command: 'close' })
        }
      })
    } else {
      if (This.recoderOptions && This.recoderOptions.errorCallBack) {
        This.recoderOptions.errorCallBack(Recorder.ERROR_MESSAGE.ERROR_CODE_1009())
      }
    }
  }
  return Promise.resolve()
}

Recorder.prototype.storePage = function (page) {
  this.recordedPages.push(page)
  this.totalLength += page.length
}

Recorder.prototype.finish = function (outputData) {
  // ogg
  if(!outputData && this.recordedPages && this.recordedPages.length){
    outputData = new Uint8Array(this.totalLength)
    this.recordedPages.reduce(function (offset, page) {
      outputData.set(page, offset)
      return offset + page.length
    }, 0)
  }

  this.ondataavailable(outputData)

  this.onstop()
  if (!this.config.reuseWorker) {
    delete this.encoder
  }
}

// Callback Handlers
Recorder.prototype.ondataavailable = function () {}
Recorder.prototype.onpause = function () {}
Recorder.prototype.onresume = function () {}
Recorder.prototype.onstart = function () {}
Recorder.prototype.onstop = function () {}

/**
 * 判断浏览器类型和版本信息
 */
Recorder.getBrowserDetails = function () {
  let navigator = window && window.navigator
  let result = {}
  result.browser = null
  result.version = null
  result.chromeVersion = null

  /**
   * 获取浏览器版本
   * @param uastring
   * @param expr
   * @param pos
   * @returns {RegExpMatchArray | Promise<Response | undefined> | boolean | number}
   */
  let getBrowserVersion = function (uastring, expr, pos) {
    var match = uastring.match(expr)
    return match && match.length >= pos && parseInt(match[pos], 10)
  }

  /**
   * 获取浏览器类型
   * @returns {string}
   */
  let getBrowserType = function () {
    let browser

    if (navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)) {
      console.log('Edge')
      browser = 'edge'
    } else if (navigator.userAgent.indexOf('Firefox') > -1) {
      console.log('Firefox')
      browser = 'firefox'
    } else if (navigator.userAgent.indexOf('Opera') > -1 || navigator.userAgent.indexOf('OPR') > -1) {
      console.log('opera')
      browser = 'Opera'
    } else if (navigator.userAgent.indexOf('Chrome') > -1 && navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Edge') === -1 && navigator.userAgent.indexOf('OPR') === -1) {
      console.log('Chrome')
      browser = 'chrome'
    } else if (navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') === -1 && navigator.userAgent.indexOf('Edge') === -1 && navigator.userAgent.indexOf('OPR') === -1) {
      console.log('Safari')
      browser = 'safari'
    } else if (navigator.userAgent.match(/AppleWebKit\/([0-9]+)\./) && navigator.userAgent.match(/Version\/(\d+).(\d+)/)) {
      // Safari UA substrings of interest for reference:
      // - webkit version:           AppleWebKit/602.1.25 (also used in Op,Cr)
      // - safari UI version:        Version/9.0.3 (unique to Safari)
      // - safari UI webkit version: Safari/601.4.4 (also used in Op,Cr)
      console.log('Safari')
      result.browser = 'safari'
    } else if ((navigator.userAgent.indexOf('compatible') > -1 && navigator.userAgent.indexOf('MSIE') > -1) || (navigator.userAgent.indexOf('Trident') > -1 && navigator.userAgent.indexOf('rv:11.0') > -1)) {
      console.log('IE')
      browser = 'ie'
    } else {
      console.log('navigator.userAgent: ', navigator.userAgent)
    }

    return browser
  }

  result.browser = getBrowserType()
  switch (result.browser) {
    case 'chrome':
      result.version = getBrowserVersion(navigator.userAgent, /Chrom(e|ium)\/(\d+)\./, 2)
      break
    case 'opera':
      result.version = getBrowserVersion(navigator.userAgent, /O(PR|pera)\/(\d+)\./, 2)
      if (navigator.userAgent.match(/Chrom(e|ium)\/([\d.]+)/)[2]) {
        result.chromeVersion = getBrowserVersion(navigator.userAgent, /Chrom(e|ium)\/(\d+)\./, 2)
      }
      break
    case 'firefox':
      result.version = getBrowserVersion(navigator.userAgent, /Firefox\/(\d+)\./, 1)
      break
    case 'edge':
      result.version = getBrowserVersion(navigator.userAgent, /Edge\/(\d+).(\d+)$/, 2)
      break
    case 'safari':
      result.version = getBrowserVersion(navigator.userAgent, /AppleWebKit\/(\d+)\./, 1)
      break
    case 'ie':
      if (navigator.userAgent.match(/MSIE (\d+)/)) {
        result.version = getBrowserVersion(navigator.userAgent, /MSIE (\d+).(\d+)/, 1)
      } else if (navigator.userAgent.match(/rv:(\d+)/)) {
        result.version = getBrowserVersion(navigator.userAgent, /rv:(\d+).(\d+)/, 1)
      }
      break
    default:
      break
  }

  console.log('getBrowserDetails', result)
  return result
}
