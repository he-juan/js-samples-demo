
/**
 * create WebRTCSession instance
 * @param lineId
 * @constructor
 */
let WebRTCSession = function (lineId) {
    this.shareType = ''
    // this.userName = 'webRTC_Client_' + Math.random().toString(36).substr(2)   // lighttpd 转发时或设备处理时需要标识
    this.userName = 0
    this.rspInfo = null
    this.reqId = null
    this.isRecvRequest = false             // 是否接受对端请求
    this.localShare = false                // 表示本端是否开启共享
    this.remoteShare = false               // 表示对端是否开启演示
    this.isInitiativeStopScreen = false    // 表示是否主动关闭演示
    this.isHandleDestroy = false           // 表示当前是否进行destroy流程

    this.isMute = false                     // 表示流处于的状态
    this.isLocalHold = false                // 表示本端是否hold
    this.isRemoteHold = false               // 表示远端是否hold

    this.lineId = lineId             // 当前线路ID
    this.remoteLineId = null         // 对端线路Id
    this.bundlePolicy = 'balanced'   // "balanced"（默认值）：ICE 代理为每种使用的媒体类型（视频、音频和数据）收集 ICE 选项。如果远程端点不支持捆绑，在单独的传输上仅协商一个音频和视频轨道。
                                     // "max-compat"：ICE 代理为每个轨道收集 ICE 选项。如果远程端点不支持捆绑，在单独的传输上协商所有的媒体轨道。
                                     // "max-bundle"：ICE 代理只收集一个轨道候选项。如果远程端点不支持捆绑，仅协商一个媒体轨道。
    this.peerAccount = ''            // 对端号码
    this.action = ''
    this.transaction = ''             // 当前请求的请求序列，类似与cseq，用于消息匹配
    this.trickleIceInfo = ''
    this.isReadySendIceInfo = false
    this.isIceInfoHasSent = false

    this.sendInviteQueue = []         // 自己发送的invite请求对列
    this.sendReInvite = false
    this.localSdpPending = false
    this.isInviteBeingProcessed = false  // 标识是否有待处理的 本端发起的re-invite请求

    this.actionCallback = null
    this.isExist183Process = false
    this.mixStreamContext = null
    this.isSuccessUseWebsocket = false   // 表示首次使用websocket开启共享是否成功，后期将使用dataChannel

    this.EVENTS = []
    this.deviceId = null
    this.pc = null

    this.RESOLUTION = {
        CLIENT_MAIN_DEFAULT_UP: { width: 640, height: 360 },      // 主流默认上行分辨率
        CLIENT_MAIN_CURRENT_UP: null,                             // 主流当前实际上行分辨率
        SERVER_MAIN_EXPECT_UP: null,                              // 服务器端支持的解码分辨率
    }

    this.mids = {
        audio: '',
        main: '',
        slides: ''
    }

    this.localStreams = {
        audio: null,
        main: null,
        slides: null,
    }

    this.remoteStreams = {
        audio: null,
        slides: null,
        main: null,
    }

    this.receiveBuffer = []                                         // 接收缓冲区
    this.receivedSize = 0                                           // 已收到的大小
    this.fileSize = 0                                               // 文件大小
    this.fileName = null                                            // 文件名字
}

/**
 * 通过添加流或者addTransceiver创建媒体行
 * @param shareType 当前呼叫类型
 * @param isOffer: true 为 offer， false 为 answer
 * @returns {Promise<void>}
 */
WebRTCSession.prototype.createMediaLine = async function (shareType, isOffer){
    log.info('createMediaLine type is ' + shareType +  ' and offer is : '+ isOffer )
    let This = this

    try {
        let presentStream = This.getStream('slides', true)
        // 先创建Transceiver
        switch (shareType){
            case 'audio':
                presentStream.getAudioTracks().forEach(track => This.pc.addTrack(track, presentStream))
                break
            case 'video':
                presentStream.getVideoTracks().forEach(track => This.pc.addTrack(track, presentStream))
                break
            case 'audioVideo':
            case 'shareScreen':
                await presentStream.getTracks().forEach(track => This.pc.addTrack(track, presentStream))
                break
            case 'shareFile':
                if(gsRTC.getBrowserDetail().browser === 'firefox'){
                    let slidesFakeStream = await WebRTCSession.prototype.getCaptureStreams()
                    await slidesFakeStream.getTracks().forEach(track => This.pc.addTrack(track, slidesFakeStream)) // slides
                }else {
                    await This.pc.addTransceiver('video')  // slides
                }
                break
            default:
                break
        }
        await This.setupDataChannel()
    }catch (error){
        log.warn('create media line error:', error)
        This.actionCallback && This.actionCallback({
            message: {
                codeType: gsRTC.CODE_TYPE.ACTION_FAILED.codeType,
                message: error.message
            }
        })
    }
}

/**
 * Listen for stream change events
 * @param pc
 */
WebRTCSession.prototype.subscribeStreamEvents = function (pc) {
    let This = this
    pc.ontrack = function (evt) {
        let stream = evt.streams ? evt.streams[0] : null
        if (!stream && evt.track) {
            // Unified-plan is track-based, and a track may be associated with more than one stream, or no streams at all.
            log.info('`stream` is undefined on `ontrack` event in WebRTC, get track id: ' + evt.track.id)
            let stream = new MediaStream();
                stream.addTrack(evt.track);
            let mediaType = ''
            Object.keys(This.mids).forEach(function (type){
                if(This.mids[type].toString() === evt.transceiver.mid.toString()){
                    log.info('get '+ type + ' stream')
                    mediaType = type
                }
            })
            This.setStream(stream, mediaType, false, mediaType)
        }else {
            let msid = stream && stream.id
            log.info('__on_add_track: ' + msid)
            let mediaType = ''
            if(evt.transceiver && evt.transceiver.mid){
                Object.keys(This.mids).forEach(function (type){
                    if(This.mids[type].toString() === evt.transceiver.mid.toString()){
                        log.info('get '+ type + ' stream')
                        mediaType = type
                    }
                })
                // // 固定每个mid代码的媒体，通过mid区分是主流还是演示流
                console.info('stream transceiver mid:' + evt.transceiver.mid)
            }

            if(!mediaType){
                mediaType = msid
                log.warn('ontrack get mediaType ('+ mediaType + ')')
            }
            log.info('get ontrack msid: ' + msid)
            This.setStream(stream, mediaType, false, msid)

            if(stream){
                stream.onremovetrack = function (evt) {
                    log.info('__on_remove_track msid: ' + msid)
                    This.setStream(null, mediaType, false, msid)
                }
            }
        }
    }
}

/**
 * create webRTC multiStream Peer connection
 * @param conf.iceServers
 * @param conf.RTCpeerConnectionOptional
 * @param conf.iceTransportPolicy
 * @param conf.peerAccount
 */
WebRTCSession.prototype.createRTCSession = async function (type = null, conf = {}) {
    log.info('create webRTC multiStream Peer connection')
    let This = this
    if( !This.isSuccessUseWebsocket ){
        This.pc = This.createPeerConnection(conf)
    }

    try {
        if(!This.isSuccessUseWebsocket ){
            await This.createMediaLine(This.shareType, true)
        }else{
            let mainStream = This.getStream(type, true)
            await This.processAddStream(mainStream, This.pc, type)
        }
        await This.doOffer()
    } catch (error) {
        log.warn(error)
        This.actionCallback && This.actionCallback({
            message: {
                codeType: gsRTC.CODE_TYPE.ACTION_FAILED.codeType,
                message: error.message
            }
        })
    }
}

/**
 * create WebRTCSession
 * @param conf.iceServers
 * @param conf.RTCpeerConnectionOptional
 * @param conf.iceTransportPolicy
 * @param conf.peerAccount
 */
WebRTCSession.prototype.createPeerConnection = function (conf = {}) {
    let This = this
    let pc
    let config = {
        iceTransportPolicy: 'all',
        bundlePolicy: This.bundlePolicy
    }
    let iceservers = conf.iceServers
    let RTCpeerConnectionOptional = conf && conf.RTCpeerConnectionOptional
    // chrome 72 版本默认unified-plan， 65版本开始unified-plan为实验性质标志，通过sdpSemantics: unified-plan 启用
    if (RTCpeerConnectionOptional === null || RTCpeerConnectionOptional === undefined) {
        RTCpeerConnectionOptional = {optional: [{'pcName': 'PC_' + Math.random().toString(36).substr(2)}, {'googDscp': true}, {'googIPv6': true}]}
    } else if (RTCpeerConnectionOptional && RTCpeerConnectionOptional.optional && RTCpeerConnectionOptional.optional.length > 0) {
        RTCpeerConnectionOptional.optional.push({'pcName': 'PC_' + Math.random().toString(36).substr(2)}, {'googDscp': true}, {'googIPv6': true})
    }

    if(conf.iceTransportPolicy){
        config.iceTransportPolicy = conf.iceTransportPolicy
    }else {
        config.iceTransportPolicy = 'all'
    }

    if (iceservers === null || iceservers === undefined || iceservers.length === 0) {
        log.warn('iceServers is null, lack of default ICE servers! ')
    } else {
        config.iceServers = conf.iceServers
        log.warn('iceServers length ' + conf.iceServers.length)
    }
    if (window.gsRTC.getBrowserDetail().browser !== 'firefox') {
        // firefox not support sdpSemantics config, no need set
        config.sdpSemantics = 'unified-plan'
    }

    This.peerAccount = conf && conf.peerAccount
    pc = new window.RTCPeerConnection(config, RTCpeerConnectionOptional)
    pc.pcName = 'PC_' + Math.random().toString(36).substr(2)
    pc.peerId = Math.random().toString(36).substr(2)
    pc.action = null
    pc.iceFailureNum = 0
    pc.isIceFailed = false
    This.localSdpPending = false
    This.subscribeStreamEvents(pc)

    pc.onicecandidate = function (event) { This.onIceCandidate(event) }
    pc.onsignalingstatechange = function () { This.onSignalingStateChange() }
    pc.onicegatheringstatechange = function () { This.onIceGatheringStateChange() }
    pc.oniceconnectionstatechange = function () { This.onIceConnectionStateChange() }
    pc.onconnectionstatechange = function () { This.onConnectionStateChange() }
    pc.ondatachannel = function(e){  This.onDataChannelMessage(e) }

    return pc
}


/**
 * 创建dataChannel
 *
 * **/
WebRTCSession.prototype.setupDataChannel = function(){
    log.info("start setup dataChannel")
    try{
        let This = this
        let pc = This.pc
        let optional = {reliable: true, ordered: true}
        pc.dataChannel = pc.createDataChannel('sendDataChannel', optional)
        pc.dataChannel.binaryType = 'arraybuffer';
        log.info("created dataChannel")
        pc.dataChannel.onopen = function(){
            log.info("data channel connect")
            if(sendText){
                gsRTC.sendFile(fileInfo)
                gsRTC.sendFile({lineId: fileInfo.lineId, content: sendText})
            }
        }
        pc.dataChannel.onmessage = function(e){
            log.info(`Got message`)
            // 处理DataChannel相关数据
            if(e.data.byteLength){
                This.handleDataChannelFile(e)
            }else{
                This.handleDataChannelMessage(e.data)
            }
        }
    }catch(e){
        log.warn('no data channel pc', e);
    }
}

/**
 *  dataChannel 判断当前状态发送数据
 *  @param message
 */

WebRTCSession.prototype.getCurrentDataChannelState = function(message) {
    let This = this
    let pc = This.pc
    if(!pc){
        log.warn("current pc no exists")
        return
    }

    let dataChannel = pc.dataChannel
    let sendQueue = []
    switch(dataChannel.readyState) {
        case "connecting":
            log.info(`Connection not open, queueing: ${message}`);
            sendQueue.push(message);
            break;
        case "open":
            log.info(`The current connection is successful, and data can be sent`);
            if(sendQueue.length){
                sendQueue.forEach((msg) => dataChannel.send(JSON.stringify(msg)) );
            }else{
                dataChannel.send(JSON.stringify(message))
            }
            break;
        case "closing":
            log.warn(`Attempted to send message while closing`);
            break;
        case "closed":
            log.warn("Error! Attempt to send while connection closed.");
            break;
    }
}

/**
 * create localDescription: create offer and setLocalDescription
 * @returns {Promise<void>}
 */
WebRTCSession.prototype.doOffer = async function () {
    let This = this
    let pc = This.pc
    // Added checks to ensure that connection object is defined first
    if (!pc) {
        log.warn('doOffer: Dropping of creating of offer as connection does not exists')
        return
    }
    log.info('Creating offer sdp( type: ' + (This.shareType) + ' )')
    pc.offerConstraints = {
        offerToReceiveAudio: false,
        offerToReceiveVideo: This.shareType.indexOf('shareScreen') >= 0,
        iceRestart: pc.action === 'iceRestart'
    }

    if(pc.offerConstraints.iceRestart){
        log.warn('clear trickleIceInfo msg before iceRestart, set ice info send false')
        This.trickleIceInfo = ''
        This.isIceInfoHasSent = false
    }

    async function onCreateOfferSuccess(desc) {
        log.info('start setLocalDescription')
        try {
            log.info(`Offer setLocalDescription sdp: ` + ` \n${desc.sdp}`)
            await pc.setLocalDescription(desc)
            This.setLocalDescriptionSuccess(pc)
        } catch (error) {
            This.onSetLocalDescriptionError(error)
        }
    }

    try {
        This.localSdpPending = true
        log.info('createOffer start, offerConstraints:\r\n ' + JSON.stringify(pc.offerConstraints, null, '   '))
        let offer = await pc.createOffer(pc.offerConstraints)
        await onCreateOfferSuccess(offer)
    } catch (error) {
        This.onCreateLocalDescriptionError(error)
    }
}

/***
 * create localDescription: create answer and setLocalDescription
 * @returns {Promise<void>}
 */
WebRTCSession.prototype.doAnswer = async function () {
    let This = this
    let pc = This.pc
    log.info('prepare do answer')
    // Added checks to ensure that connection object is defined first
    if (!pc || (pc && pc.signalingState === 'closed')) {
        log.info('doAnswer: RTCPeerConnection is not available')
        return
    }

    async function onCreateAnswerSuccess(desc) {
        log.info(pc.type + ' createAnswerSuccess, setLocalDescription start')
        try {
            if (pc.signalingState !== 'have-remote-offer') {
                log.warn('doAnswer: Called in wrong state ' + pc.signalingState)
                return
            }
            log.info(`answer setLocalDescription sdp:` + ` \n${desc.sdp}`)
            await pc.setLocalDescription(desc)
            This.setLocalDescriptionSuccess(pc)
        } catch (error) {
            This.onSetLocalDescriptionError(error)
        }
    }

    log.info('createAnswer start')
    try {
        This.localSdpPending = true
        const answer = await pc.createAnswer()
        await onCreateAnswerSuccess(answer)
    } catch (e) {
        This.onCreateLocalDescriptionError(e)
    }
}

/**
 * set remote desc success
 * @param pc
 */
WebRTCSession.prototype.setRemoteDescriptionSuccess = function (pc) {
    let This = this
    log.info('setRemoteDescription success (' + This.action + ')')
    if(!pc.action || (pc.action && pc.action !== 'iceRestart')){
        if(!This.action && !This.actionCallback){
            if(This.sendInviteQueue.length){
                This.action = This.sendInviteQueue[0].action
                This.actionCallback = This.sendInviteQueue[0].callback
            }
        }

        if(This.action && This.actionCallback && ( (This.action  === 'stopShareScreen' && This.isInitiativeStopScreen) || (This.action === 'shareScreen' && This.localShare) )){
            // 1.针对主动关闭演示内容的，处理回调； 2.被动关闭演示的，此处不处理。
            This.actionCallback({message: gsRTC.CODE_TYPE.ACTION_SUCCESS})
        }else if(This.sendInviteQueue.length){
            log.info('Automatically clear invite action')
            This.removeInviteAction({action: This.sendInviteQueue[0].action})
        }
    }
}

/**
 * fired when WebRTCSession set localDescription success
 * @returns {boolean}
 */
WebRTCSession.prototype.setLocalDescriptionSuccess = function (pc) {
    log.info('setLocalDescription success ( ' + pc.type + ')')
    // this.setEncodingParameters('main')
    //
    if (pc.iceGatheringState === 'complete' || GsRTC.prototype.getConfFromLocalStorage('trickle_ice') === 'true') {
        log.info('onSetLocalDescriptionSuccess send invite( PC: ' + pc.type + ' )')
        this.onIceGatheringCompleted()
    }
}

/**
 * fired when WebRTCSession set localDescription failed
 * @param error
 */
WebRTCSession.prototype.onSetLocalDescriptionError = function (error) {
    log.warn(`Failed to set local description: ${error}`)
    this.actionCallback && this.actionCallback({
        message: {
            codeType: gsRTC.CODE_TYPE.ACTION_FAILED.codeType,
            message: error.message
        }
    })
}

/**
 * fired when WebRTCSession createOffer or createAnswer failed
 * @param error
 */
WebRTCSession.prototype.onCreateLocalDescriptionError = function (error) {
    log.warn(`Failed to create session description: ${error}`)
    this.actionCallback && this.actionCallback({
        message: {
            codeType: gsRTC.CODE_TYPE.ACTION_FAILED.codeType,
            message: error.message
        }
    })
}

/**
 * set remote desc error
 * @param error
 */
WebRTCSession.prototype.onSetRemoteDescriptionError = function (error) {
    log.warn(`Failed to set remote description: ${error}`)
    this.actionCallback && this.actionCallback({
        message: {
            codeType: gsRTC.CODE_TYPE.ACTION_FAILED.codeType,
            message: error.message
        }
    })
}
