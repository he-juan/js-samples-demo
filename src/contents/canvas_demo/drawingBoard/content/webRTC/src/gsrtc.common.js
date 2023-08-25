/**
 * Browser detector.
 *
 * @return {object} result containing browser and version
 *     properties.
 */
GsRTC.prototype.getBrowserDetail = function () {
    function extractVersion (uastring, expr, pos) {
        let match = uastring.match(expr)
        return match && match.length >= pos && parseInt(match[pos], 10)
    }

    var navigator = window && window.navigator

    // Returned result object.
    var result = {}
    result.browser = null
    result.version = null
    result.UIVersion = null
    result.chromeVersion = null
    result.systemFriendlyName = null

    if(navigator.userAgent.match(/Windows/)){
        result.systemFriendlyName = 'windows'
    }else if(navigator.userAgent.match(/Mac/)){
        result.systemFriendlyName = 'mac'
    }else if(navigator.userAgent.match(/Linux/)){
        result.systemFriendlyName = 'linux'
    }

    // Fail early if it's not a browser
    if (typeof window === 'undefined' || !window.navigator) {
        result.browser = 'Not a browser.'
        return result
    }

    // Edge.
    if (navigator.mediaDevices && navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)) {
        result.browser = 'edge'
        result.version = extractVersion(navigator.userAgent, /Edge\/(\d+).(\d+)$/, 2)
        result.UIVersion = navigator.userAgent.match(/Edge\/([\d.]+)/)[1] // Edge/16.17017
    } else if (!navigator.mediaDevices && (!!window.ActiveXObject || 'ActiveXObject' in window || navigator.userAgent.match(/MSIE (\d+)/) || navigator.userAgent.match(/rv:(\d+)/))) {
        // IE
        result.browser = 'ie'
        if (navigator.userAgent.match(/MSIE (\d+)/)) {
            result.version = extractVersion(navigator.userAgent, /MSIE (\d+).(\d+)/, 1)
            result.UIVersion = navigator.userAgent.match(/MSIE ([\d.]+)/)[1] // MSIE 10.6
        } else if (navigator.userAgent.match(/rv:(\d+)/)) {
            /* For IE 11 */
            result.version = extractVersion(navigator.userAgent, /rv:(\d+).(\d+)/, 1)
            result.UIVersion = navigator.userAgent.match(/rv:([\d.]+)/)[1] // rv:11.0
        }

        // Firefox.
    } else if (navigator.mozGetUserMedia) {
        result.browser = 'firefox'
        result.version = extractVersion(navigator.userAgent, /Firefox\/(\d+)\./, 1)
        result.UIVersion = navigator.userAgent.match(/Firefox\/([\d.]+)/)[1] // Firefox/56.0

        // all webkit-based browsers
    } else if (navigator.webkitGetUserMedia && window.webkitRTCPeerConnection) {
        // Chrome, Chromium, Webview, Opera, Vivaldi all use the chrome shim for now
        var isOpera = !!navigator.userAgent.match(/(OPR|Opera).([\d.]+)/)
        // var isVivaldi = navigator.userAgent.match(/(Vivaldi).([\d.]+)/) ? true : false;
        if (isOpera) {
            result.browser = 'opera'
            result.version = extractVersion(navigator.userAgent, /O(PR|pera)\/(\d+)\./, 2)
            result.UIVersion = navigator.userAgent.match(/O(PR|pera)\/([\d.]+)/)[2] // OPR/48.0.2685.39
            if (navigator.userAgent.match(/Chrom(e|ium)\/([\d.]+)/)[2]) {
                result.chromeVersion = extractVersion(navigator.userAgent, /Chrom(e|ium)\/(\d+)\./, 2)
            }
        } else {
            result.browser = 'chrome'
            result.version = extractVersion(navigator.userAgent, /Chrom(e|ium)\/(\d+)\./, 2)
            result.UIVersion = navigator.userAgent.match(/Chrom(e|ium)\/([\d.]+)/)[2] // Chrome/61.0.3163.100
        }
    } else if ((!navigator.webkitGetUserMedia && navigator.userAgent.match(/AppleWebKit\/([0-9]+)\./)) || (navigator.webkitGetUserMedia && !navigator.webkitRTCPeerConnection)) {
        if (navigator.userAgent.match(/Version\/(\d+).(\d+)/)) {
            result.browser = 'safari'
            result.version = extractVersion(navigator.userAgent, /AppleWebKit\/(\d+)\./, 1)
            result.UIVersion = navigator.userAgent.match(/Version\/([\d.]+)/)[1] // Version/11.0.1
        } else { // unknown webkit-based browser.
            result.browser = 'Unsupported webkit-based browser ' + 'with GUM support but no WebRTC support.'
            return result
        }
        // Default fallthrough: not supported.
    } else {
        result.browser = 'Not a supported browser.'
        return result
    }

    return result
}

/**
 * Function that Determine whether it is nxx corresponding, such as: isResponseNxx(2, 200) ==> true
 * @param i
 * @param code Received status code, such 200
 * @returns {boolean}
 */
GsRTC.prototype.isNxx = function (i, code) {
    if(i > 9){
        return ((i * 10) <= code && code <= ((i * 10) + 9))
    }else {
        return ((i * 100) <= code && code <= ((i * 100) + 99))
    }
}

/***
 * Function that Generate a UUID as the unique identifier of the peer ID
 * @returns {string}
 */
GsRTC.prototype.generateUUID = function () {
    let d = new Date().getTime()
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = (d + Math.random() * 16) % 16 | 0
        d = Math.floor(d / 16)
        return (c === 'x' ? r : (r && 0x7 | 0x8)).toString(16)
    })
}

/**
 * Determine if the input string is empty or all spaces
 * @param str
 * @returns {boolean}
 */
GsRTC.prototype.tskStringIsNullOrEmpty = function (str) {
    if (typeof str === 'undefined' || str == null || str === '') {
        return true
    } else {
        return false
    }
}

/**
 * is string or not
 * @param str
 * @returns {boolean}
 */
GsRTC.prototype.tskStringIsString = function (str) {
    return (str instanceof String || typeof str === 'string')
}

GsRTC.prototype.tskStringIsJSON = function(str){
    try {
        let obj = JSON.parse(str)
        if(typeof obj == 'object' && obj ){
            return true
        }else{
            return false
        }
    } catch(e) {
        return false
    }
}

GsRTC.prototype.findStrPositions = function(str, martchStr){
    let positions = []
    let pos = str.indexOf(martchStr);
    while (pos > -1) {
        positions.push(pos);
        pos = str.indexOf(martchStr, pos + 1);
    }
    return positions
}

GsRTC.prototype.talkingMessageParser = function(str){
    /*
     * 私有协议格式：Magic Code + 版本 + 消息长度 + 消息
     * Magic Code: UCM
     * 版本: 1个字节，第一个版本为1
     * 消息长度: 2个字节， 网络字节序
     */
    str = str.slice(6)
    if(str){
        let obj = JSON.parse(str)
        if(typeof obj == 'object' && obj ){
            return obj
        }else{
            return null
        }
    }else {
        return null
    }
}

/**
 * get data type
 * @param data
 * @returns {*|string}
 */
GsRTC.prototype.getType = function (data) {
    let toString = Object.prototype.toString
    let type = {
        'undefined': 'undefined',
        'number': 'number',
        'boolean': 'boolean',
        'string': 'string',
        '[object Function]': 'function0f',
        '[object RegExp]': 'regexp',
        '[object Array] ': 'array',
        '[object Date]': 'date',
        '[object Error]': 'error'
    }
    return type[typeof data] || type[toString.call(data)] || (data ? 'object' : 'null')
}

/***
 * get file url
 * @param file
 * @returns {*}
 */
GsRTC.prototype.getObjectURL = function (file) {
    let url = null
    if (window.createObjectURL !== undefined) { // basic
        url = window.createObjectURL(file)
    } else if (window.URL !== undefined) { // mozilla(firefox)
        url = window.URL.createObjectURL(file)
    } else if (window.webkitURL !== undefined) { // webkit or chrome
        url = window.webkitURL.createObjectURL(file)
    }
    return url
}

/***
 * Function that deep clone an object.
 * @param obj
 * @returns {*}
 */
GsRTC.prototype.objectDeepClone = function (obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj
    }

    let copy = function (data) {
        let copy = data.constructor()
        for (let attr in data) {
            if (data.hasOwnProperty(attr)) {
                copy[attr] = data[attr]
            }
        }
        return copy
    }

    if (typeof obj === 'object' && !Array.isArray(obj)) {
        try {
            return JSON.parse(JSON.stringify(obj))
        } catch (err) {
            return copy(obj)
        }
    }

    return copy(obj)
}

/***
 * Function that Depth comparison of two objects is completely equal
 * @param x
 * @param y
 * @returns {boolean}
 */
GsRTC.prototype.isObjectXExactlyEqualToY = function (x, y) {
    let i, l, leftChain, rightChain

    function compare2Objects (x, y) {
        let p

        // remember that NaN === NaN returns false
        // and isNaN(undefined) returns true
        if (isNaN(x) && isNaN(y) && typeof x === 'number' && typeof y === 'number') {
            return true
        }

        // Compare primitives and functions.
        // Check if both arguments link to the same object.
        // Especially useful on the step where we compare prototypes
        if (x === y) {
            return true
        }

        // Works in case when functions are created in constructor.
        // Comparing dates is a common scenario. Another built-ins?
        // We can even handle functions passed across iframes
        if ((typeof x === 'function' && typeof y === 'function') ||
            (x instanceof Date && y instanceof Date) ||
            (x instanceof RegExp && y instanceof RegExp) ||
            (x instanceof String && y instanceof String) ||
            (x instanceof Number && y instanceof Number)) {
            return x.toString() === y.toString()
        }

        // At last checking prototypes as good as we can
        if (!(x instanceof Object && y instanceof Object)) {
            return false
        }

        if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
            return false
        }

        if (x.constructor !== y.constructor) {
            return false
        }

        if (x.prototype !== y.prototype) {
            return false
        }

        // Check for infinitive linking loops
        if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
            return false
        }

        // Quick checking of one object being a subset of another.
        // todo: cache the structure of arguments[0] for performance
        for (p in y) {
            if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                return false
            } else if (typeof y[p] !== typeof x[p]) {
                return false
            }
        }

        for (p in x) {
            if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                return false
            } else if (typeof y[p] !== typeof x[p]) {
                return false
            }

            switch (typeof (x[p])) {
                case 'object':
                case 'function':

                    leftChain.push(x)
                    rightChain.push(y)

                    if (!compare2Objects(x[p], y[p])) {
                        return false
                    }

                    leftChain.pop()
                    rightChain.pop()
                    break

                default:
                    if (x[p] !== y[p]) {
                        return false
                    }
                    break
            }
        }

        return true
    }

    if (arguments.length < 1) {
        log.warn('Need two or more arguments to compare')
        return true
    }

    for (i = 1, l = arguments.length; i < l; i++) {
        leftChain = []
        rightChain = []

        if (!compare2Objects(arguments[0], arguments[i])) {
            return false
        }
    }

    return true
}

/**
 * Determine if the browser supports ReplaceTrack
 * @returns {boolean}
 */
GsRTC.prototype.isReplaceTrackSupport = function () {
    let browserDetails = this.getBrowserDetail()
    let result = false

    switch (browserDetails.browser) {
        case 'chrome':
            result = browserDetails.version >= 72
            break
        case 'opera':
            result = browserDetails.version >= 59
            break
        case 'firefox':
            result = browserDetails.version >= 59
            break
        case 'safari':
            result = browserDetails.UIVersion >= '12.1.1'
            break
        default:
            break
    }

    log.info(browserDetails.browser + ' ' + browserDetails.version + ' version support replaceTrack : ' + result)
    return result
}

/**
 * 判断共享桌面时是否支持共享音频
 * */
GsRTC.prototype.isSystemAudioShareSupport = function () {
    let result = false
    let browserDetail = this.getBrowserDetail()
    if ((browserDetail.browser === 'chrome' && navigator.userAgent.indexOf('Edg') > 0 && browserDetail.version >= 79) || // chrome 内核Edge
        (browserDetail.browser === 'chrome' && navigator.userAgent.indexOf('Edg') < 0 && browserDetail.version >= 74) ||
        (browserDetail.browser === 'opera' && browserDetail.version >= 74)) {
        result = true
    }
    return result
}

/**
 * 判断时候支持使用setParameters接口控制码率
 * @returns {boolean}
 */
GsRTC.prototype.isSetEncodingSupport = function () {
    var result = false
    let browserDetails = GsRTC.prototype.getBrowserDetail()
    if((browserDetails.browser === "chrome" && navigator.userAgent.indexOf('Edg') > 0 && browserDetails.version >= 79)
        || (browserDetails.browser === "chrome" && navigator.userAgent.indexOf('Edg') < 0 && browserDetails.version >= 72)
        || (browserDetails.browser === "opera" && browserDetails.chromeVersion >= 72)
        || (browserDetails.browser === "firefox" && browserDetails.version >= 64)
        || (browserDetails.browser === "safari" && browserDetails.UIVersion >= "12.1.1") && browserDetails.UIVersion !== "13.0.1"){
        // safari 13.0.1版本不支持setParameters设置
        log.info('encoding is support')
        result = true
    }else {
        log.warn('encoding is not support')
    }
    return result
}

/**
 * get Cookies
 * @param key
 * @returns {*}
 */
GsRTC.prototype.getConfFromCookies = function (key) {
    if (!key || key === '') {
        log.warn('INVALID PARAMETER!')
        return
    }

    var result
    if (document.cookie.length > 0) {
        key = key + '='
        var startIndex = document.cookie.indexOf(key)
        if (startIndex >= 0) {
            result = document.cookie.substring(startIndex + key.length).split(';')[0]
        }
    }
    return result
}

GsRTC.prototype.getConfFromLocalStorage = function (key) {
    if (!key) {
        log.info('get conf from localStorage: invalid argument')
        return
    }

    return localStorage.getItem(key)
}

/**
 * 获取主流的端口
 * @param sdp
 * @returns {string|*}
 */
GsRTC.prototype.getMlinesDirection = function (sdp, type){
    let parsedSdp = SDPTools.parseSDP(sdp)
    if(parsedSdp.media.length && parsedSdp.media.length > 1){
        for (let i = 0; i < parsedSdp.media.length; i++) {
            let media = parsedSdp.media[i]
            if ((media.content && media.content === type) || media.type === type){
                log.info('get ' + type + ' stream direction ' + media.direction)
                return media.direction
            }
        }
    }

    log.warn(type + ' direction is not found!')
    return null
}

/**
 * get the capabilities of the system for receiving media form RTCRtpReceiver.getCapabilities
 * @param excludeList: code not include
 * @returns {{audioCodecs: [], videoCodecs: []}}
 */
GsRTC.prototype.getRTCRtpCapabilities = function(excludeList){
    let capabilities = { audioCodecs: [], videoCodecs: [] }
    if(!RTCRtpReceiver.getCapabilities){
        log.info('RTCRtpReceiver.getCapabilities is not support')
    }else {
        let audioCodecs = RTCRtpReceiver.getCapabilities('audio').codecs
        if(audioCodecs && audioCodecs.length){
            audioCodecs.forEach(function(codec){
                if(codec.mimeType){
                    let decoder = codec.mimeType.split('/')[1]
                    if(!excludeList.includes(decoder) && !capabilities.audioCodecs.includes(decoder)){
                        capabilities.audioCodecs.push(decoder)
                    }
                }
            })
        }

        let videoCodecs = RTCRtpReceiver.getCapabilities('video').codecs
        if(videoCodecs && videoCodecs.length){
            videoCodecs.forEach(function(codec){
                if(codec.mimeType){
                    let decoder = codec.mimeType.split('/')[1]
                    if(!excludeList.includes(decoder) && !capabilities.videoCodecs.includes(decoder)){
                        capabilities.videoCodecs.push(decoder)
                    }
                }
            })
        }
    }

    return capabilities
}

/**
 * Determine whether to support remote decoding capabilities
 * @param sdp
 * @returns {boolean}
 */
GsRTC.prototype.isDecodeCapabilitiesSupport = function(sdp){
    let This = this
    let isSupport = true
    let remoteCapabilities = SDPTools.getRTCRtpCapabilities(sdp, This.capabilitiesCodecExcludeList)
    log.info(`get remote capabilities: ${JSON.stringify(remoteCapabilities)}`)


    if(remoteCapabilities){
        if(remoteCapabilities.haveAudio){
            if(remoteCapabilities.audioCodecs && remoteCapabilities.audioCodecs.length){
                let audioIntersection = gsRTC.basicRTCRtpReceiverCapabilities.AUDIO_CODECS.filter(v => remoteCapabilities.audioCodecs.includes(v))
                if(!audioIntersection || !audioIntersection.length){
                    log.info('audio codec does not support')
                    isSupport = false
                }
            }else {
                log.info('audio codec does not support')
                isSupport = false
            }
        }

        if(remoteCapabilities.haveVideo){
            if(remoteCapabilities.videoCodecs && remoteCapabilities.videoCodecs.length){
                let videoIntersection = gsRTC.basicRTCRtpReceiverCapabilities.VIDEO_CODECS.filter(v => remoteCapabilities.videoCodecs.includes(v))
                if(!videoIntersection || !videoIntersection.length){
                    log.info('video codec does not support')
                    isSupport = false
                }
            }else {
                log.info('video codec does not support')
                isSupport = false
            }
        }
    }

    return isSupport
}

/**
 * 清除某一路通话
 * @param data.lineId： 线路id
 */
GsRTC.prototype.cleanSession = async function (data) {
    log.info('clear session: ' + JSON.stringify(data, null, '    '))
    if(!data || !data.lineId){
        log.warn('clear session: Invalid parameter: ' + JSON.stringify(data, null, '    '))
        return
    }
    log.info('clear session (' + data.lineId + ')')
    let This = this
    let lineId = data.lineId

    for (let i = 0; i < This.webrtcSessions.length; i++) {
        let session = This.webrtcSessions[i]
        if (lineId === session.lineId) {
            Object.keys(session.localStreams).forEach(function (key) {
                let stream = session.localStreams[key]
                if (stream) {
                    session.closeStream(stream)
                }
            })

            log.info('close pc of line (' + lineId + ')')
            session.pc && session.pc.close()
            log.info('remote session (' + session.lineId + ')')

            if(session.mixStreamContext){
                session.mixStreamContext.close()
                session.mixStreamContext = null
            }
            This.webrtcSessions.splice(i, 1)
            break
        }
    }
}

/**
 * 音频混音
 */
GsRTC.prototype.mixingStream = function (stream1, stream2) {
    log.info('mixing audio stream')
    // 混音参数
    let context
    window.AudioContext = (window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext)
    if (window.AudioContext) {
        context = new window.AudioContext()
    } else {
        log.error('not support web audio api')
    }

    // 混音
    let destinationParticipant1 = context.createMediaStreamDestination()
    if (stream1) {
        let source1 = context.createMediaStreamSource(stream1)
        source1.connect(destinationParticipant1)
    }
    if (stream2) {
        let source2 = context.createMediaStreamSource(stream2)
        source2.connect(destinationParticipant1)
    }

    return destinationParticipant1.stream
}

/**
 * 清除某一路通话
 * @param data.lineId： 线路id
 * @param data.serverHangup：true =>Receive Server BYE; default false
 * @param data.endByWebhid：true =>Receive webHID BYE; default false
 */
GsRTC.prototype.clearSession = async function (data) {
    log.info('clear session: ' + JSON.stringify(data, null, '    '))
    if(!data || !data.lineId){
        log.warn('clear session: Invalid parameter: ' + JSON.stringify(data, null, '    '))
        return
    }
    log.info('clear session (' + data.lineId + ')')
    let This = this
    let lineId = data.lineId

    for (let i = 0; i < This.webrtcSessions.length; i++) {
        let session = This.webrtcSessions[i]
        if (lineId === session.lineId) {
            Object.keys(session.localStreams).forEach(function (key) {
                let stream = session.localStreams[key]
                if (stream) {
                    session.closeStream(stream)
                }
            })
            Object.keys(session.remoteStreams).forEach(function (key) {
                let stream = session.remoteStreams[key]
                if (stream) {
                    session.closeStream(stream)
                }
            })


            log.info('close pc of line (' + lineId + ')')
            session.pc && session.pc.close()
            session.pc && session.pc.dataChannel && session.pc.dataChannel.close()

            log.info('remote session (' + session.lineId + ')')
            if(session.rtpTimer){
                log.info('clear session rtpTimer')
                clearInterval(session.rtpTimer)
                session.rtpTimer = null
            }
            if(session.mixStreamContext){
                session.mixStreamContext.close()
                session.mixStreamContext = null
            }

            This.webrtcSessions.splice(i, 1)
            break
        }
    }

    if(This.webrtcSessions.length){
        if(This.webrtcSessions.length === 1){
            // This.setActiveLine(This.webrtcSessions[0].lineId)  激活另外一条线路
        }
    }
}

/**
 * 点击共享按钮条
 * */

GsRTC.prototype.clickShareBar = function(data){
    log.info('click shareBar: ' + JSON.stringify(data, null, '    '))
    if(!data || !data.lineId || !data.stream){
        log.info('clickShareBar: invalid parameters!')
        return
    }
    let This = this
    let stream = data.stream
    let stopCallback = function(){
        log.info("click bar: stopShareScreen")
        gsRTC.trigger("stopShareScreen")
    }
    let streamOnInactive = function (){
        log.warn('user clicks the bottom share bar to stop sharing')
        log.warn('stream inactive, stop screen share.')
        This.stopScreenShare({ lineId: data.lineId, isInitiativeStopScreen: true, callback: stopCallback})
    }
    if (This.getBrowserDetail().browser === 'firefox') {
        let tracks = stream.getVideoTracks();
        tracks[0].onended = streamOnInactive
    }else {
        stream.oninactive = streamOnInactive
    }
}

/** jsep 回滚状态
 * */
GsRTC.prototype.jsepRollback = function(session){
    session.pc.setLocalDescription({type: 'rollback'})
        .then(function(){
            log.warn("JSEP: Rollback status success")
        })
        .catch(function(error){
            log.warn("JSEP: Rollback status failed: " + error)
        })
    let type = 'slides'
    let stream = session.getStream(type,true)
    if (stream) {
        log.warn('clear slides stream.')
        session.closeStream(stream)
        session.setStream(null, type, true)
    }
    session.localShare = false
}

/**
 * 销毁窗口以及添加提示内容
 * */

GsRTC.prototype.closeShareWindow = function(data){
    log.info('closeShareWindow: ' + JSON.stringify(data, null, '    '))
    if(!data || !data.lineId ||!data.action){
        log.info('closeShareWindow: invalid parameters!')
        return
    }

    let session = WebRTCSession.prototype.getSession({key: 'lineId', value: data.lineId })
    if(!session){
        log.warn("current closeShareWindow: no session")
        return
    }
    if(data.action === 'stopShareScreen'){
        let param = {
            type: gsRTC.SIGNAL_EVENT_TYPE.BYE,
            action: session.action,
            line: session.lineId,
            shareType: session.shareType,
            reqId: parseInt(Math.round(Math.random() * 100)),
            isLocalDestroy: true
        }
        session.handleSendMessage(param)
    }
}
