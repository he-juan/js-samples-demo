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

            // 针对当前线路对端是共享者，告知其他线路关闭共享和窗口
            if(session.remoteShare){
                let otherSessions = This.webrtcSessions.filter((item)=>item.lineId !== data.lineId)
                if(otherSessions.length){
                    for(let session of otherSessions){
                       if(Number(session.conf) === 1){
                           /** 通过 background 后台 处理关闭共享窗口 问题 **/
                           gsRTC.trigger("closeAllShareLine", {lineId: session.lineId})
                       }
                    }
                }
            }

            /**更新会议室成员列表内容 (1.更新本地自己的会议室成员列表内容  2. 告知其他线路更新对应的成员列表内容) **/
            gsRTC.trigger("updateMemberList", {account: session.remoteAccount})
            session.updateMemberList({account: session.remoteAccount})


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

    /** 在清除共享线路时，针对存在共享线路，需要针对 浏览器中存在的bar 设置对应的lineId；以防止之前的lineId已经清除；  **/
    if(This.webrtcSessions.length){
        for(let session of This.webrtcSessions){
            if(session){
                This.setStreamInactiveEvent({lineId: session.lineId, stream: slideStream})
                break
            }
        }
    }

    /** 针对不存在共享session 关闭视频流 **/
    if(This.webrtcSessions.length === 0){
        if(slideStream){
            gsRTC.device.closeStream(slideStream)
        }
    }

}



/***
 * 解析消息体:Parse message body
 *@param message 消息体
 *@return
 */
GsRTC.prototype.parseMessageBody = function(message){
    log.info('GsRTC: parse message body')

    if(typeof message === 'string'){
        message = JSON.parse(message)
    }

    let action
    let data
    let getAttributeArray = Object.keys(message)   // ect: local_line、(createMediaSession、createMediaSessionRet)
    if(message.hasOwnProperty('createMediaSession') || message.hasOwnProperty('createMediaSessionRet') ||
        message.hasOwnProperty('updateMediaSession') ||  message.hasOwnProperty('updateMediaSessionRet') ||
        message.hasOwnProperty('destroyMediaSession') ||  message.hasOwnProperty('destroyMediaSessionRet')){
        for(let key in getAttributeArray){
            action = getAttributeArray[key]
            if(action.indexOf('MediaSession') > 0){
                data = message[action]
                break
            }
        }
    }
    return { type: action,  message: data }
}


/***********************************关于 dataChannel 接受的数据 进行处理**********************************************/

/**
 * 创建共享流程：主要是通过websocket 传递 createMediaSession 相关内容；
 * 关闭共享窗口流程：主要是通过websocket 传递 destroyMediaSession 相关内容；
 * @param data.lineId
 * @param data.msg
 * **/
GsRTC.prototype.createShareContentMessage = function (data){
    log.info('createShareContentMessage: ' + JSON.stringify(data, null, '    '))
    if(!data || !data.lineId){
        log.warn('createShareContentMessage: Invalid parameter ')
        return
    }

    let This = this
    let msg = This.parseMessageBody(data.msg)
    let content = msg.message
    let type = msg.type
    let session = WebRTCSession.prototype.getSession({key: 'lineId', value: data.lineId })
    if(!session){
        log.warn("createShareContentMessage: no session")
        return
    }

    let code = content.rspInfo && content.rspInfo.rspCode
    let sdp = content.sdp?.data

    switch(type) {
        case gsRTC.SIGNAL_EVENT_TYPE.INVITE.name:
            log.info("start handle createMediaSession content")
            session.action = content.action
            session.isRecvRequest = true
            session.shareType = content.shareType
            session.reqId = content.reqId
            session.handleServerRequestSdp(sdp)
            break;
        case gsRTC.SIGNAL_EVENT_TYPE.INVITE_RET.name:
            log.info("start handle createMediaSessionRet content")
            if (gsRTC.isNxx(2, code)) {
                log.info(session.action + ' success')
                session.handleServerResponseSdp(sdp)
            } else {
                log.warn(" createMediaSessionRet error ")
            }
            break;
        default:
            log.warn("current exist problem: " + type)
            break

    }
}



/** 主要针对关闭共享、关闭共享窗口 进行处理
 * 更新共享内容： (1)主要是通过 dataChannel 传递 updateMediaSession 相关内容；
 * 更新共享内容： (2)主要是通过 dataChannel 传递destroyMediaSession 相关内容；
 * @param data.lineId  线路id
 * @param data.msg     携带相关内容
 * **/

GsRTC.prototype.updateShareContentMessage = function(data){
    log.info('updateShareContentMessage: ' + JSON.stringify(data, null, '    '))
    if(!data || !data.lineId){
        log.warn('updateShareContentMessage: Invalid parameter ')
        return
    }


    let This = this
    let msg = This.parseMessageBody(data.msg)
    let content = msg.message
    let type = msg.type
    let session = WebRTCSession.prototype.getSession({key: 'lineId', value: data.lineId })
    if(!session){
        log.warn("updateShareContentMessage: no session")
        return
    }

    /**当前pc建立成功的情况**/
    /**（1） 关闭共享流程不需要通过background后台进行处理**/
    /**（2） 开启共享流程需要通过background后台进行处理， 原因是：需要对端是否接受？**/
    if(content.action === 'shareScreen' &&(type === 'updateMediaSession' || type === 'updateMediaSessionRet')){
        if(!data.isFromBackground){
            gsRTC.trigger("updateScreen", data.msg, session.localShare)
            return
        }
    }

    let code = content.rspInfo && content.rspInfo.rspCode
    let sdp = content.sdp?.data

    switch(type){
        case This.SIGNAL_EVENT_TYPE.RE_INVITE.name:
            log.info("start handle updateMediaSession content")
            session.action = content.action
            session.shareType = content.shareType
            session.reqId = content.reqId

            session.actionCallback = function (event) {
                event.lineId = session.lineId
                log.warn('accept ' + session.action + ' callback data: ' + JSON.stringify(event, null, '    '))
                if (event.message.codeType === This.CODE_TYPE.ACTION_SUCCESS.codeType) {
                    log.info(session.action + " success")
                    This.trigger(session.action, true)
                } else {
                    log.info(session.action + " Failed")
                    This.trigger(session.action, false)
                }
                session.actionCallback = null
                session.action = null
            }

            if (!code) {
                log.info("current handle reply ")
                session.isRecvRequest = true
                if (session.action === 'stopShareScreen') {
                    session.remoteShare = false
                } else if (session.action === 'shareScreen') {
                    session.remoteShare = true
                }
                session.handleServerRequestSdp(sdp)
            } else {
                log.info("updateMediaSession: current get codeType : " + code + " cause: " + content.rspInfo.rspMsg)
                session.handleSendMessage({
                    type: This.SIGNAL_EVENT_TYPE.RE_INVITE_RET,
                    mediaSession: content.sdp.data,
                    action: content.action,
                    shareType: content.shareType,
                    line: content.line,
                    reqId: content.reqId,
                    rspInfo: {
                        rspCode: code,
                        rspMsg: content.rspInfo.rspMsg
                    }
                })
                log.info("current codeType:" + code)
            }
            break
        case This.SIGNAL_EVENT_TYPE.RE_INVITE_RET.name:
            log.info("start handle updateMediaSessionRet content")
            if (gsRTC.isNxx(2, code)) {
                if (session.action === 'stopShareScreen') {
                    session.localShare = false
                } else if (session.action === 'shareScreen') {
                    session.localShare = true
                }
                log.info(session.action + ' success')
                session.handleServerResponseSdp(sdp)
            } else {
                log.warn("updateMediaSessionRet error ")
            }
            break
        case This.SIGNAL_EVENT_TYPE.BYE.name:
            log.info("start handle destroyMediaSession content, Share the line to end the call")
            session.action = content.action
            session.isRecvRequest = true
            session.shareType = content.shareType
            session.reqId = content.reqId
            let param = {
                type: This.SIGNAL_EVENT_TYPE.BYE_RET,
                action: session.action,
                line: session.lineId,
                shareType: session.shareType,
                reqId: session.reqId
            }
            session.handleSendMessage(param)
            This.clearSession({lineId: session.lineId})
            This.trigger('closeScreenTab', {lineId: session.lineId, isCloseStream: true})
            break
        case This.SIGNAL_EVENT_TYPE.BYE_RET.name:
            if (This.isNxx(2, code)) {
                log.info("start handle destroyMediaSessionRet content,Share the line to end the call")
                session.action = content.action
                session.shareType = content.shareType
                session.reqId = content.reqId
                This.clearSession({lineId: session.lineId})
                This.trigger('closeScreenTab', {lineId: session.lineId, isCloseStream: true})
            }
            break
        default:
            log.warn("updateShareContentMessage: current exist problem: " + type)
            break
    }
}


/**
 * 接收到对端事件处理请求，对此进行处理
 * @param data.lineId
 * @param data.msg
 * **/
GsRTC.prototype.handleEventContent = function(data){
    log.info('handleEventContent: ' + JSON.stringify(data, null, '    '))
    if(!data || !data.lineId){
        log.warn('handleEventContent: Invalid parameter ')
        return
    }

    let session = WebRTCSession.prototype.getSession({ key: 'lineId', value: data.lineId })
    if(!session){
        log.info( data.lineId + ': no session is found')
        return
    }
    let message = data.msg
    let stream = session.getStream("slides", true)

    switch(message.type){
        case 'localHoldLine':
            session.isRemoteHold = true
            if(!session.isMute && !session.isLocalHold){
                session.streamMuteSwitch({type: 'slides', stream: stream, mute: true})
                gsRTC.trigger("holdStatus", {type: message.type , localHold: session.isLocalHold, remoteHold: session.isRemoteHold})
                // 针对暂停画面 页面不能绘制做处理
                gsRTC.isPausePainting({lineId: session.lineId})
            }
            break
        case 'localUnHoldLine':
            session.isRemoteHold= false
            if(session.isMute && !session.isLocalHold){
                session.streamMuteSwitch({type: 'slides', stream: stream, mute: false})
                // 针对暂停画面 页面不能绘制做处理
                gsRTC.isPausePainting({lineId: session.lineId})
            }
            break
        case 'remoteHoldLine':
            session.isRemoteHold = true
            gsRTC.trigger("holdStatus", {type: message.type})
            break;
        case 'remoteUnHoldLine':
            session.isRemoteHold = false
            break;
        case 'remoteAccount':
            let remoteAccount = getAccountContent(message)
            session.remoteAccount = remoteAccount
            break
        case 'confMember':
            gsRTC.trigger("updateConfMember",message)
            break
        case 'fileInfo':
            session.handleFileContent(message)
            break
        case 'mouseDown':
        case 'mouseMove':
        case 'mouseUp':
        case 'mouseLeave':
        case 'remotePosition':
        case 'areaDelete':
        case 'allDelete':
        case 'pausePainting':
        case 'textFlag':
        case 'noteFlag':
        case 'revoke':
        case 'restore':
            gsRTC.trigger("onRemoteMousePosition", message)
            break
        case 'streamChange':
            gsRTC.trigger("onRemoteStreamChange", message)
            break;
        case 'socketStatus':
            if(message.state === 'close'){
                // 对端ws连接异常，关闭共享页面
                gsRTC.trigger('errorTip', gsRTC.CODE_TYPE.PEER_WEBSOCKET_CLOSED.codeType, message.lineId)
            }
            break
        case 'updateMemberList':
            gsRTC.trigger('updateMemberList', message)
        default:
            log.info("get current type: " + message.type)
            break;
    }
}

