
/*
 * alawmulaw: A-Law and mu-Law codecs in JavaScript.
 * https://github.com/rochars/alawmulaw
 *
 * Copyright (c) 2018-2019 Rafael da Silva Rocha.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

/**
 * @fileoverview mu-Law codec.
 * @see https://github.com/rochars/wavefile
 * @see https://github.com/rochars/alawmulaw
 */

let alawmulaw = {
    /**
     * @fileoverview mu-Law codec.
     */
    mulaw: {
        /**
         * @type {number}
         * @private
         */
        BIAS: 0x84,
        /**
         * @type {number}
         * @private
         */
        CLIP: 32635,
        /**
         * @type {Array<number>}
         * @private
         */
        encodeTable: [
            0,0,1,1,2,2,2,2,3,3,3,3,3,3,3,3,
            4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,
            5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
            5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
            6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
            6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
            6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
            6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
            7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
            7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
            7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
            7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
            7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
            7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
            7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
            7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        ],
        /**
         * @type {Array<number>}
         * @private
         */
        decodeTable: [0,132,396,924,1980,4092,8316,16764],

        /**
         * Encode a 16-bit linear PCM sample as 8-bit mu-Law.
         * @param {number} sample A 16-bit PCM sample
         * @return {number}
         */
        encodeSample: function (sample){
            /** @type {number} */
            let sign;
            /** @type {number} */
            let exponent;
            /** @type {number} */
            let mantissa;
            /** @type {number} */
            let muLawSample;
            /** get the sample into sign-magnitude **/
            sign = (sample >> 8) & 0x80;
            if (sign != 0) sample = -sample;
            /** convert from 16 bit linear to ulaw **/
            sample = sample + this.BIAS;
            if (sample > this.CLIP) sample = this.CLIP;
            exponent = this.encodeTable[(sample>>7) & 0xFF];
            mantissa = (sample >> (exponent+3)) & 0x0F;
            muLawSample = ~(sign | (exponent << 4) | mantissa);
            /** return the result **/
            return muLawSample;
        },

        /**
         * Decode a 8-bit mu-Law sample as 16-bit PCM.
         * @param {number} muLawSample The 8-bit mu-Law sample
         * @return {number}
         */
        decodeSample: function (muLawSample){
            /** @type {number} */
            let sign;
            /** @type {number} */
            let exponent;
            /** @type {number} */
            let mantissa;
            /** @type {number} */
            let sample;
            muLawSample = ~muLawSample;
            sign = (muLawSample & 0x80);
            exponent = (muLawSample >> 4) & 0x07;
            mantissa = muLawSample & 0x0F;
            sample = this.decodeTable[exponent] + (mantissa << (exponent+3));
            if (sign != 0) sample = -sample;
            return sample;
        },

        /**
         * Encode 16-bit linear PCM samples into 8-bit mu-Law samples.
         * @param {!Int16Array} samples A array of 16-bit PCM samples.
         * @return {!Uint8Array}
         */
        encode: function (samples){
            /** @type {!Uint8Array} */
            let muLawSamples = new Uint8Array(samples.length);
            for (let i = 0, len = samples.length; i < len; i++) {
                muLawSamples[i] = this.encodeSample(samples[i]);
            }
            return muLawSamples;
        },

        /**
         * Decode 8-bit mu-Law samples into 16-bit PCM samples.
         * @param {!Uint8Array} samples A array of 8-bit mu-Law samples.
         * @return {!Int16Array}
         */
        decode: function (samples){
            /** @type {!Int16Array} */
            let pcmSamples = new Int16Array(samples.length);
            for (let i = 0, len = samples.length; i < len; i++) {
                pcmSamples[i] = this.decodeSample(samples[i]);
            }
            return pcmSamples;
        }
    },

    /**
     * @fileoverview A-Law codec.
     */
    alaw: {
        /** @type {!Array<number>} */
        LOG_TABLE: [
            1,1,2,2,3,3,3,3,4,4,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
            6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
            7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
            7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        ],

        /**
         * Encode a 16-bit linear PCM sample as 8-bit A-Law.
         * @param {number} sample A 16-bit PCM sample
         * @return {number}
         */
        encodeSample: function (sample){
            /** @type {number} */
            let compandedValue;
            sample = (sample ==-32768) ? -32767 : sample;
            /** @type {number} */
            let sign = ((~sample) >> 8) & 0x80;
            if (!sign) {
                sample = sample * -1;
            }
            if (sample > 32635) {
                sample = 32635;
            }
            if (sample >= 256)  {
                /** @type {number} */
                let exponent = this.LOG_TABLE[(sample >> 8) & 0x7F];
                /** @type {number} */
                let mantissa = (sample >> (exponent + 3) ) & 0x0F;
                compandedValue = ((exponent << 4) | mantissa);
            } else {
                compandedValue = sample >> 4;
            }
            return compandedValue ^ (sign ^ 0x55);
        },

        /**
         * Decode a 8-bit A-Law sample as 16-bit PCM.
         * @param {number} aLawSample The 8-bit A-Law sample
         * @return {number}
         */
        decodeSample: function (aLawSample){
            /** @type {number} */
            let sign = 0;
            aLawSample ^= 0x55;
            if (aLawSample & 0x80) {
                aLawSample &= ~(1 << 7);
                sign = -1;
            }
            /** @type {number} */
            let position = ((aLawSample & 0xF0) >> 4) + 4;
            /** @type {number} */
            let decoded = 0;
            if (position != 4) {
                decoded = ((1 << position) |
                    ((aLawSample & 0x0F) << (position - 4)) |
                    (1 << (position - 5)));
            } else {
                decoded = (aLawSample << 1)|1;
            }
            decoded = (sign === 0) ? (decoded) : (-decoded);
            return (decoded * 8) * -1;
        },

        /**
         * Encode 16-bit linear PCM samples as 8-bit A-Law samples.
         * @param {!Int16Array} samples A array of 16-bit PCM samples.
         * @return {!Uint8Array}
         */
        encode: function (samples){
            /** @type {!Uint8Array} */
            let aLawSamples = new Uint8Array(samples.length);
            for (let i=0; i<samples.length; i++) {
                aLawSamples[i] = this.encodeSample(samples[i]);
            }
            return aLawSamples;
        },

        /**
         * Decode 8-bit A-Law samples into 16-bit linear PCM samples.
         * @param {!Uint8Array} samples A array of 8-bit A-Law samples.
         * @return {!Int16Array}
         */
        decode: function (samples){
            /** @type {!Int16Array} */
            let pcmSamples = new Int16Array(samples.length);
            for (let i=0; i<samples.length; i++) {
                pcmSamples[i] = this.decodeSample(samples[i]);
            }
            return pcmSamples;
        },
    }
}

let waveWorker
self.onmessage = function (e) {
    switch (e.data.command) {
        case 'init':
            waveWorker.init(e.data)
            break
        case 'encode':
            // 记录数据
            waveWorker.record(e.data.buffers)
            break
        case 'done':
            waveWorker.exportWAV()
            break
        case 'getBuffer':
            waveWorker.getBuffer()
            break
        case 'close':
            waveWorker.clear()
            break
        default:
            break
    }
}

function WaveWorker(){
    this.recorderBufferLength = 0
    this.recorderBuffers = []
    this.originalSampleRate = undefined
    this.desiredSampleRate = undefined     // 目标采样率
    this.numberOfChannels = undefined      // 采样通道。 1 = 单声道，2 = 立体声。默认为 1。最多支持 2 个通道。
    this.bitsPerSample = null
    this.singleProcessSize = 0
    this.fadeOutTime = false   // true 标识达到渐弱时间
    this.fadeOutRatio = 0.25   // 渐弱比例
    this.maxBinFileSize = 196608 // 196608 Byte(192KB)
    this.binHeaderSize = 512  // bin 头文件固定字节
    this.fileSizeLimit = false // 是否限制文件大小
    this.alawmulaw = alawmulaw
}

WaveWorker.prototype.init = function (config){
    console.info('worker init config:', JSON.stringify(config, null, '    '))
    this.originalSampleRate = config.originalSampleRate || 48000
    this.desiredSampleRate = config.desiredSampleRate || 8000
    this.numberOfChannels = config.numberOfChannels || 1
    this.bitsPerSample = config.bitsPerSample || 16
    this.fileSizeLimit = config.fileSizeLimit || false
    this.encoderType = config.encoderType

    this.initBuffers()
}

/**
 * 初始化recorder buffer 数据
 */
WaveWorker.prototype.initBuffers = function (){
    for (let channel = 0; channel < this.numberOfChannels; channel++) {
        this.recorderBuffers[channel] = []
    }
}

/**
 * 停止录制时清除录制数据
 */
WaveWorker.prototype.clear = function (){
    this.recorderBufferLength = 0
    this.recorderBuffers = []
    this.initBuffers()
}

/**
 * 处理onaudioprocess返回的buffer数据
 * @param inputBuffer
 */
WaveWorker.prototype.record = function (inputBuffer){
    for (let channel = 0; channel < this.numberOfChannels; channel++) {
        this.recorderBuffers[channel].push(inputBuffer[channel])
    }
    this.recorderBufferLength += inputBuffer[0].length

    // 计算已转换数据大小
    this.convertedSizeCalculate()
}

/**
 * 动态计算已转换的文件数据是否超出限制
 * GXP16XX上ring.bin尺寸要求不超过 196608 Byte(192KB)
 */
WaveWorker.prototype.convertedSizeCalculate = function (){
    let downSampledBuffer = this.getDownSampledBuffer()
    // 计算转换文件大小
    let totalFileLength = this.binHeaderSize + downSampledBuffer.length
    let remainingSize = this.maxBinFileSize - totalFileLength  // 剩余转换尺寸

    if(!this.singleProcessSize){  // onaudioprocess每次触发时的buffer大小
        this.singleProcessSize = downSampledBuffer.length
    }

    if(totalFileLength >= this.maxBinFileSize){
        console.warn('File exceeds limit, stop converting!')
        self.postMessage({
            message: 'fileExceedsLimit'
        })
    }else if(remainingSize <= this.maxBinFileSize * this.fadeOutRatio){  //设置音频渐弱
        if(!this.fadeOutTime){
            console.warn('File conversion remaining 25 percent~')
            this.fadeOutTime = true
            self.postMessage({
                message: 'fadeOutTime',
                remainingTimes: remainingSize / this.singleProcessSize,  // record剩余触发次数
            })
        }
    }
}

WaveWorker.prototype.getBuffer = function (){
    let This = this
    let buffers = []
    for (let channel = 0; channel < This.numberOfChannels; channel++) {
        buffers.push(This.mergeBuffers(This.recorderBuffers[channel], This.recorderBufferLength))
    }

    self.postMessage({
        message: 'getBuffer',
        data: buffers
    })
}

/**
 * mergeBuffers将recBuffers数组扁平化
 * @param buffers
 * @param bufferLength
 * @returns {Float32Array}
 */
WaveWorker.prototype.mergeBuffers = function (buffers, bufferLength){
    let result = new Float32Array(bufferLength)
    let offset = 0
    for (let i = 0; i < buffers.length; i++) {
        result.set(buffers[i], offset)
        offset += buffers[i].length
    }
    return result
}

/**
 * interleave将各声道信息数组扁平化
 * @param inputL
 * @param inputR
 * @returns {Float32Array}
 */
WaveWorker.prototype.interleave = function (inputL, inputR) {
    let length = inputL.length + inputR.length
    let result = new Float32Array(length)
    let index = 0
    let inputIndex = 0

    while (index < length) {
        result[index++] = inputL[inputIndex]
        result[index++] = inputR[inputIndex]
        inputIndex++
    }
    return result
}

/**
 * floatTo16bitPCM将音频设备采集的元素范围在[0,1]之间的Float32Array，转换成一个元素是16位有符号整数的Float32Array中
 * 也就是将Float32Array转换成16bit PCM
 * @param output
 * @param offset
 * @param input
 */
WaveWorker.prototype.floatTo16BitPCM = function (output, offset, input){
    for (let i = 0; i < input.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}

/**
 *  mu-Law 编码
 *  流程：
 *      1.将createScriptProcessor获取到的Float32Array数据转换成线性16bit PCM
 *      2.将线性16-bit PCM数据编码为8-bit mu-Law
 *      3.数据写入output
 * @param output DataView
 * @param offset body体开始写入的偏移位置
 * @param input Float32Array
 */
WaveWorker.prototype.float32To8BitMuLaw = function (output, offset, input){
    console.warn('float32To8BitMuLaw!!')
    /** (1)将Float32Array转换成16bit PCM!!!  */
    let l6linearPCM = new Int16Array(input.length)
    for (let i = 0; i < input.length; i++) {
        let s = Math.max(-1, Math.min(1, input[i]))
        l6linearPCM[i] =  s < 0 ? s * 0x8000 : s * 0x7FFF
    }

    /** (2)encode 16-bit values as 8-bit mu-Law with encode() */
    let muLawSamples = this.alawmulaw.mulaw.encode(l6linearPCM)

    /**(3)以uint8格式写入output*/
    for (let i = 0; i < muLawSamples.length; i++, offset += 1) {
        output.setUint8(offset, muLawSamples[i])
    }
}

/**
 * 下采样 缓冲区
 * 重采样的原理上，程序根据重采样和原始采用率的比值，间隔采样音频原数据，丢弃掉其他采样点数据，从而模拟采样率的等比例下降。
 * 注：间隔丢弃原数据在重采样率是原采样率的整数倍分之一时（即1、1/2、1/3…）才不会损失用户音色。
 *      另外，重采样率比原采样率高时，需要在采样点中间额外插值，这里未实现。
 * @param buffer 获取的buffer数据
 * @param desiredSampleRate 采样比例
 * @returns {Float32Array|*}
 */
WaveWorker.prototype.downSampleBuffer = function (buffer, desiredSampleRate){
    if (desiredSampleRate === this.originalSampleRate) {
        return buffer
    }
    if (desiredSampleRate > this.originalSampleRate) {
        throw "down sampling rate show be smaller than original sample rate"
    }
    let sampleRateRatio = this.originalSampleRate / desiredSampleRate
    let newLength = Math.round(buffer.length / sampleRateRatio)
    let result = new Float32Array(newLength);
    let offsetResult = 0
    let offsetBuffer = 0
    while (offsetResult < result.length) {
        let nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio)
        let accum = 0, count = 0
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i]
            count++
        }
        result[offsetResult] = accum / count
        offsetResult++
        offsetBuffer = nextOffsetBuffer
    }

    return result
}

/**
 * buffer 处理
 * @returns {*}
 */
WaveWorker.prototype.getDownSampledBuffer = function (){
    let This = this
    let buffers = []
    // 1.将recBuffers数组扁平化
    for (let channel = 0; channel < This.numberOfChannels; channel++) {
        buffers.push(This.mergeBuffers(This.recorderBuffers[channel], This.recorderBufferLength))
    }
    let interleaved
    let downSampledBuffer
    // 2.下采样
    if (This.numberOfChannels === 2) {
        interleaved = This.interleave(buffers[0], buffers[1])
        downSampledBuffer = This.downSampleBuffer(interleaved, This.desiredSampleRate)
    } else {
        interleaved = buffers[0]
        downSampledBuffer = This.downSampleBuffer(interleaved, This.desiredSampleRate)
    }
    return downSampledBuffer
}

WaveWorker.prototype.writeString = function (view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
    }
}

/**
 * 为即将生成的音频文件写入音频头
 * 一般情况下，wav数据实际上就是裸数据pcm外面包了一层文件头。除了其前部增加44个字节的wav头，其他的就是pcm数据
 * @param samples
 * @returns {DataView}
 */
WaveWorker.prototype.encodeWAV = function (samples){
    console.warn('encode wave')
    let fileHeaderLength = 44   // 头文件长度
    // body体部分是以Int16写入，所以buffer长度需要*2
    let buffer = new ArrayBuffer(fileHeaderLength + samples.length * 2)
    let view = new DataView(buffer)

    // WAV音频文件头信息
    /* RIFF identifier */
    this.writeString(view, 0, 'RIFF')
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length * 2, true)
    /* RIFF type */
    this.writeString(view, 8, 'WAVE')
    /* format chunk identifier */
    this.writeString(view, 12, 'fmt ')
    /* format chunk length */
    view.setUint32(16, 16, true)
    /**
     * sample format (raw)
     * AudioFormat=1 文件采用PCM编码(线性量化)。
     * AudioFormat=2 Microsoft ADPCM
     * AudioFormat=6 ITU G.711 a-law
     * AudioFormat=7 ITU G.711 Âµ-law
     */
    view.setUint16(20, 1, true)
    /* channel count */
    view.setUint16(22, this.numberOfChannels, true)
    /* sample rate */
    view.setUint32(24, this.desiredSampleRate, true)
    /* byte rate (sample rate * block align) */
    view.setUint32(28, this.desiredSampleRate * 4, true)
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, this.numberOfChannels * 2, true)
    /* bits per sample */
    view.setUint16(34, this.bitsPerSample, true)
    /* data chunk identifier */
    this.writeString(view, 36, 'data')
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true)
    /* 到这里文件头信息填写完成，通常情况下共44个字节*/

    /* 给wav头增加pcm体 */
    this.floatTo16BitPCM(view, fileHeaderLength, samples)

    return view
}

/**
 * GRP .bin 格式文件
 * @param samples
 * @returns {DataView}
 */
WaveWorker.prototype.encodeGRPBin = function (samples){
    console.warn('encode grp bin, samples length ')
    // u-law编码转换时以Uint8写入，buffer不需要扩大
    let buffer
    if(samples.length % 2 === 0){
        buffer = new ArrayBuffer(this.binHeaderSize + samples.length)
    }else {
        // TODO: padding 补充: buffer.length 为奇数时，设置check_sum getInt16 时会超出限制, error Offset is outside the bounds of the DataView
        buffer = new ArrayBuffer(this.binHeaderSize + samples.length + 1)
        console.log('padding supplement.')
    }
    let view = new DataView(buffer)

    /**
     *    .bin文件里都是用的大端模式
     *    filesize 从 0 开始，占4字节； （uint32类型的值：对应的值=文件属性->大小->字节/2）
     *    check_sum 从 4 开始，占2字节； （unit 16类型的值，每两个字节按照unit16相加）
     *    version 从 6 开始，占 4 字节； （默认设置为1）
     *    ring.bin 从 16 开始，占8个字节
     */
    // (1) filesize 从 0 开始，占4字节； （uint32类型的值)
    let file_size = (view.byteLength) / 2   // filesize = byteLength / 2
    // littleEndian 参数：指示 32 位 int 是以小端格式还是大端格式存储。如果为 false 或未定义，则写入大端值。
    view.setUint32(0, file_size, false)

    // (2) check_sum 从 4 开始，占2字节； （unit 16类型的值）默认先写入0
    let check_sum = 0
    view.setUint16(4, check_sum, false)

    // (3) version 从 6 开始，占 4 字节； （版本默认设置为1）
    let version = 1
    view.setUint8(6, version)

    // (4) 年、月、日、时、分 从 10 开始，占 6 字节
    let myDate = new Date()
    view.setUint16(10, myDate.getFullYear(), false)      // 年, 从10开始，占 2 字节
    view.setUint8(12, myDate.getMonth(), false)      // 月, 占 1 字节  （getMonth() 获取当前月份(0-11,0代表1月)）
    view.setUint8(13, myDate.getDate(), false)       // 日, 占 1 字节
    view.setUint8(14, myDate.getHours(), false)      // 时, 占 1 字节
    view.setUint8(15, myDate.getMinutes(), false)    // 分, 占 1 字节

    // (5) ring.bin 从 16 开始，占8个字节 (Uint8类型值)
    this.writeString(view, 16, 'ring.bin')

    /**
     * (6) 编码器处理
     * encoding 从 34 开始，占两个字节， uint 16 方式写入
     * u-law 值为 0
     */
    // let ulawEncoding = 0
    // view.setUint16(34, ulawEncoding, false)
    // 添加自定义文件头信息结束

    /* 给wav头增加pcm体 */
    this.float32To8BitMuLaw(view, this.binHeaderSize, samples)

    /**
     * （7）rewrite check_sum value
     * 0x010000 转换为十进制 为 65536
     * 累加值 = view 所有 字节按照 uint16 读取并累加
     * check_sum = 65536 - 累加值
     * */
    for(let offset = 0; offset<view.byteLength; offset+=2){
        check_sum = check_sum + view.getInt16(offset)
    }
    check_sum = 65536 - check_sum
    view.setUint16(4, check_sum, false)

    /**
     * (8) padding 部分JS不需要处理：
     *  一个字节为8 bit，每个没有值的bit位需要补齐为0。
     *  DataView 的 length 为 512 + samples.length * 2（双字节）。
     */
    return view
}

/**
 * 生成导出数据
 */
WaveWorker.prototype.exportWAV = function (){
    // 1.获取下采样数据
    let downSampledBuffer = this.getDownSampledBuffer()
    // 2.计算文件尺寸是否超出限制
    let totalFileLength = this.binHeaderSize + downSampledBuffer.length
    let maxFileLength = this.maxBinFileSize - this.binHeaderSize // 除去头文件长度，文件内容不超过 196096 bytes
    if(totalFileLength > maxFileLength){
        downSampledBuffer = downSampledBuffer.slice(0, maxFileLength)
        console.warn('The size of ring.bin should not exceed 196608 Byte (192KB)')
    }

    // 3.添加文件头
    let dataView = this.encodeGRPBin(downSampledBuffer)
    // let dataView = this.encodeWAV(downSampledBuffer)

    self.postMessage({
        message: 'done',
        data: dataView
    })
}

waveWorker = new WaveWorker()
self.postMessage({message: 'ready'})
