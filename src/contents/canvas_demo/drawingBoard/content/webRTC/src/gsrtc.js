/* Log Debug Start */
let log = {}
log.debug = window.debug('sipWebRTC:DEBUG')
log.log = window.debug('sipWebRTC:LOG')
log.info = window.debug('sipWebRTC:INFO')
log.warn = window.debug('sipWebRTC:WARN')
log.error = window.debug('sipWebRTC:ERROR')
/* Log Debug End */

/**
 * WebRTC API Instance
 * @constructor
 */
let GsRTC = function (options) {
    let This = this
    log.info('set options: ' + JSON.stringify(options, null, '    '))
    this.screenSharing = false            // 正在共享屏幕，默认是false
    this.sharingPermission = 0          // 共享命令：
                                        // 0：web关闭演示，
                                        // 1：web开启开启
                                        // 2：设备端请求关闭演示
                                        // 3: 设备端请求开启演示
                                        // 4: 设备端hangup挂断
    this.conf = options                   // Account configuration parameters
    this.lineIdCount = 0
    this.websocketIdIndex = 1
    this.gumFetchTimeoutTime = 10*1000   // 取流10s超时
    this.capabilitiesCodecExcludeList = []
    this.RTCRtpReceiverCapabilities = { // 实际的编解码列表
        AUDIO_CODECS: [],
        VIDEO_CODECS: []
    }
    this.basicRTCRtpReceiverCapabilities = { // 基本的编解码列表
        AUDIO_CODECS: [],
        VIDEO_CODECS: []
    }

    this.webrtcSessions = []
    this.socket = null
    this.device = new MediaDevice()
    this.deviceInit()
    log.info('set storage config')
    this.loadStorageConfiguration()
    this.setRTCRtpReceiverCapabilities()
}

/**
 * gsRTC init
 */
GsRTC.prototype.preInit = function () {
    log.info('preInit: create new GsRTC object')
    try {
        log.info('init gsRTC instance')
        window.gsRTC = new GsRTC({})
    } catch (e) {
        log.error(e.toString())
    }
}

/* 开发给使用者的注册事件 */
GsRTC.prototype.EVENTS = {
    screenShare: undefined,                    // 开演示的回调
    stopShareScreen: undefined,                // web关闭演示的回调
    shareStoppedByControlBar: undefined,       // 通过控制条关闭演示

    websocketConnectStatusChange: undefined,  // webSocket 连接状态
    iceConnectionStateChange: undefined,      // onIceConnectionState 状态
    iceReconnect: undefined,                  // ICE 重连

    streamChange: undefined,                   // 本地流或远端流发生改变时的通知事件
    hangup: undefined,                         // 连接被挂断
    error: undefined,                          // 发生错误时的通知事件

    holdStatus: undefined ,                   // hold线路状态
    errorTip: undefined
}

GsRTC.prototype.CODE_TYPE = {
    // 业务错误码
    NOT_SUPPORT_SCREEN_SHARE:{ codeType: 131, message: 'The current browser version does not support share screen' },
    NOT_SUPPORT_SCREEN_AUDIO_SHARE:{ codeType: 132, message: 'The current browser version does not support share screen audio' },
    SHARE_SCREEN_TIMEOUT: { codeType: 133, message: 'open shareScreen timeout' },
    SHARE_AUDIO_IS_NOT_SELECTED: { codeType: 134, message: 'Shared audio is not selected' },   // 共享时未勾选共享音频

    // websocket
    WEBSOCKET_ADDRESS_INVALID: { codeType: 136, message: 'webSocket address is invalid' },
    WEBSOCKET_OPEN: { codeType: 137, message: 'the connection is open and ready to communicate'},
    WEBSOCKET_CLOSED: { codeType: 138, message: 'The connection is closed or could not be opened.'},
    WEBSOCKET_RECONNECTING: { codeType: 139, message: 'The connection is reconnecting'},
    WEBSOCKET_RECONNECTION_FAILED: { codeType: 140, message: 'The connection reconnection failed'},
    WEBSOCKET_CREATE_FAILED: { codeType: 141, message: 'the connection creation failed'},
    PEER_WEBSOCKET_CLOSED: { codeType: 480, message: 'The connection is closed or could not be opened.'},  // 对端ws未连接

    // ICE 重连
    ICE_CONNECTION_FAILED: { codeType: 151, message: 'ICE connection failed'},
    ICE_RECONNECTING: { codeType: 152, message: 'ICE re-connecting'},
    ICE_RECONNECTED_FAILED: { codeType: 153, message: 'ICE re-connecting failed'},

    // action success code
    ACTION_FAILED: { codeType: 119, message: 'action failed' },
    ACTION_SUCCESS: { codeType: 200, message: 'action success' },

    REFUSE_ACCEPT_SHARE: { codeType: 300, message: 'refuse accept share' },   // 拒绝接受桌面共享或文件共享
    NO_RESPONSE: { codeType: 486, message: 'no response' },

    // 麦克风取流错误码
    MIC_NOT_FOUND: { codeType: 932, message: 'NotFoundError' },
    MIC_NOT_READABLE: { codeType: 933, message: 'NotReadableError' },
    MIC_GUM_TIMEOUT: { codeType: 934, message: 'TimeOutError' },
    MIC_REQUEST_REFUSE: { codeType: 935, message: 'PermissionDeniedError' },
    MIC_REQUEST_FAIL: { codeType: 936, message: 'mic request fail' },
    MIC_TYPE_ERROR: { codeType: 937, message: 'TypeError' },

    // 摄像头取流错误码
    VIDEO_REQUEST_REFUSE: { codeType: 945, message: 'PermissionDeniedError' },
    VIDEO_REQUEST_OVER_CONSTRAINTS: { codeType: 946, message: 'OverconstrainedError' },
    VIDEO_NOT_READABLE_OR_TRACK_START_ERROR: { codeType: 947, message: 'NotReadableError' },
    VIDEO_NOT_FOUND: { codeType: 948, message: 'DevicesNotFoundError' },
    VIDEO_GUM_TIMEOUT: { codeType: 949, message: 'TimeOutError' },
    VIDEO_REQUEST_FAIL: { codeType: 950, message: 'video request fail' },
    VIDEO_TYPE_ERROR: { codeType: 951, message: 'TypeError' },

    // 共享桌面取流错误码
    SCREEN_NOT_READABLE: { codeType: 954, message: 'NotReadableError' },
    SCREEN_REQUEST_REFUSE: { codeType: 955, message: 'NotAllowedError' },
    SCREEN_NOT_FOUND: { codeType: 956, message: 'NotFoundError' },
    SCREEN_INVALID_STATE: { codeType: 957, message: 'InvalidStateError' },
    SCREEN_ABORT_ERROR: { codeType: 958, message: 'AbortError' },
    SCREEN_TYPE_ERROR: { codeType: 959, message: 'TypeError' },
    SCREEN_REQUEST_OVER_CONSTRAINTS: { codeType: 960, message: 'OverconstrainedError' },
    SCREEN_REQUEST_FAIL: { codeType: 961, message: 'Fetching failed, unknown error' },
}

GsRTC.prototype.SIGNAL_EVENT_TYPE = {
    // (Web发送到GsPhone的信令类型)
    INVITE: { id: 1, name: 'createMediaSession' },                       // 建立会话
    RE_INVITE: { id: 2, name: 'updateMediaSession' },                    // 更新会话信息

    // (GsPhone发送到Web端的信令类型)
    INVITE_RET: { id: 3, name: 'createMediaSessionRet' },                // 建立会话的回复
    RE_INVITE_RET: { id:4, name: 'updateMediaSessionRet' },              // 更新会话信息的回复

    // (Web->GsPhone 和 GsPhone->Web 共有信令类型)
    PRESENT: { id: 5, name: 'ctrlPresentation' },                         // 请求开启演示
    PRESENT_RET: { id: 6, name: 'ctrlPresentationRet' },                  // 收到请求开启演示的回复信令
    MESSAGE: { id: 7, name: 'sendMessageToUser' },                        // 发送消息
    MESSAGE_RET: { id: 8, name: 'sendMessageToUserRet' },                 // 收到消息后的回复信令
    UPDATE_USER_INFO: { id: 9, name: 'updateUserInfo' },                  // 更新用户信息
    UPDATE_USER_INFO_RET: { id: 10, name: 'updateUserListRet' },          // 收到更新用户信息后的回复信令
    UPDATE_USER_LIST: { id: 11, name: 'updateUserList' },                 // 更新用户列表
    UPDATE_USER_LIST_RET: { id: 12, name: 'updateUserListRet' },          // 收到更新用户列表后的回复信令
    UPDATE_CANDIDATE_INFO: { id: 13, name: 'updateCandidate' },           // trickle-ice 时用来发送candidate
    UPDATE_CANDIDATE_INFO_RET: { id: 14, name: 'updateCandidateRet' },    // trickle-ice 时收到candidate时的回复信令
    BYE: { id: 15, name: 'destroyMediaSession' },                         // 结束会话
    BYE_RET: { id: 16, name: 'destroyMediaSessionRet' },                  // 结束会话的回复
    CANCEL: { id: 17, name: 'cancelRequest'},                             // 取消会话
    CANCEL_RET: { id: 18, name: 'cancelRequestRet'}                       // 取消会话的回复
}

/**
 * save the capabilities of the system for receiving media
 */
GsRTC.prototype.setRTCRtpReceiverCapabilities = function(){
    log.info('save the capabilities of the system for receiving media')
    let This = this
    let basicAudioCodec = ['opus', 'G722', 'PCMU', 'PCMA']
    let basicVideoCodec = ['VP8', 'VP9', 'H264']
    let setCapabilities = function(capabilities){
        if(capabilities){
            This.RTCRtpReceiverCapabilities = {
                AUDIO_CODECS: This.objectDeepClone(capabilities.audioCodecs),
                VIDEO_CODECS: This.objectDeepClone(capabilities.videoCodecs)
            }
            This.basicRTCRtpReceiverCapabilities = {
                AUDIO_CODECS: capabilities.audioCodecs,
                VIDEO_CODECS: capabilities.videoCodecs
            }

            basicAudioCodec.forEach(function(codec){
                if(!This.basicRTCRtpReceiverCapabilities.AUDIO_CODECS.includes(codec)){
                    log.info('add audio code: ' + codec)
                    This.basicRTCRtpReceiverCapabilities.AUDIO_CODECS.push(codec)
                }
            });
            basicVideoCodec.forEach(function(codec){
                if(!This.basicRTCRtpReceiverCapabilities.VIDEO_CODECS.includes(codec)){
                    log.info('add video code: ' + codec)
                    This.basicRTCRtpReceiverCapabilities.VIDEO_CODECS.push(codec)
                }
            });

            log.info('save RTCRtp Receiver Capabilities: ' + JSON.stringify(This.RTCRtpReceiverCapabilities, null, '    '))
        }else {
            log.warn('no Capabilities get')
        }
    }

    if(RTCRtpReceiver.getCapabilities){
        log.info('get capabilities form RTCRtpReceiver.getCapabilities')
        let capabilities = GsRTC.prototype.getRTCRtpCapabilities(This.capabilitiesCodecExcludeList)
        setCapabilities(capabilities)
    } else {
        log.info('get capabilities form sdp')
        let pc = new RTCPeerConnection()
        pc.createOffer({offerToReceiveAudio: true, offerToReceiveVideo: true}).then(function(offer){
            let capabilities = SDPTools.getRTCRtpCapabilities(offer.sdp, This.capabilitiesCodecExcludeList)
            setCapabilities(capabilities)
            pc.close()
        }).catch(function(error){
            log.warn('set RTCRtpReceiver capabilities error: ' + error.name)
        })
    }
}

/**
 * set storage settings
 */
GsRTC.prototype.loadStorageConfiguration = function () {
    log.info('local storage configuration')
    /* 这里设置'red+ulpfec'的开关控制阀 */
    if ((this.getBrowserDetail().browser === 'chrome' && this.getBrowserDetail().version >= 69) || this.getBrowserDetail().browser === 'safari') {
        log.info('set redulpfecEnabled false')
        localStorage.setItem('redulpfecEnabled', 'false')
    } else {
        if (localStorage.getItem('redulpfecEnabled') === null) {
            log.info('set redulpfecEnabled true')
            localStorage.setItem('redulpfecEnabled', 'true')
        }
    }

    log.info('set usedtx enabled true')
    localStorage.setItem('usedtxEnabled', 'false')

    /* set trickle_ice */
    log.warn('Open trickle ice!')
    localStorage.setItem('trickle_ice', 'false')
}

/**
 * available device scan and capability scan
 */
GsRTC.prototype.deviceInit = function () {
    log.info('device init')
    let This = this
    if (window.MediaDevice) {
        if (!This.device) {
            This.device = new MediaDevice()
        }

        This.device.availableDev = {}
        This.device.currentDev = {}
        This.device.enumDevices(deviceInfo => {
            This.device.availableDev.videoInputList = deviceInfo.cameras
            This.device.availableDev.audioOutputList = deviceInfo.speakers
            This.device.availableDev.audioInputList = deviceInfo.microphones
            This.device.checkAvailableDev()

            // setTimeout(function () {
            //   // 扫描设备能力
            //   This.device.setDeviceCapability()
            // }, 1000)
        }, function (error) {
            log.error('enum device error: ' + error)
        })
    } else {
        log.info('MediaDevice is not exist!')
    }
}

/**
 * Function that subscribes a listener to an event.
 * @method on
 * @param {String} eventName The event.
 * @param {Function} callback The listener.
 */
GsRTC.prototype.on = function (eventName, callback) {
    if (typeof callback === 'function') {
        this.EVENTS[eventName] = []
        this.EVENTS[eventName].push(callback)
    } else {
        throw new Error('Provided parameter is not a function')
    }
}

/**
 * Function that unsubscribes listeners from an event.
 * @method off
 * @param {String} [eventName] The event.
 * - When not provided, all listeners to all events will be unsubscribed.
 * @param {Function} [callback] The listener to unsubscribe.
 * - When not provided, all listeners associated to the event will be unsubscribed.
 */
GsRTC.prototype.off = function (eventName, callback) {
    if (!(eventName && typeof eventName === 'string')) {
        this.EVENTS = {}
    } else {
        if (callback === undefined) {
            this.EVENTS[eventName] = []
            return
        }
        let arr = this.EVENTS[eventName] || []

        // unsubscribe events that is triggered always
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] === callback) {
                arr.splice(i, 1)
                break
            }
        }
    }
}

/**
 * Function that triggers an event.
 * The rest of the parameters after the <code>eventName</code> parameter is considered as the event parameter payloads.
 * @method trigger
 */
GsRTC.prototype.trigger = function (eventName) {
    // convert the arguments into an array
    let args = Array.prototype.slice.call(arguments)
    let arr = this.EVENTS[eventName]
    args.shift() // Omit the first argument since it's the event name
    if (arr) {
        // for events subscribed forever
        for (let i = 0; i < arr.length; i++) {
            try {
                if (arr[i].apply(this, args) === false) {
                    break
                }
                // 监听事件调用后不删除
                // this.EVENTS[eventName].shift()
            } catch (error) {
                throw error
            }
        }
    }
}




